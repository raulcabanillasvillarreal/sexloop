// ============================================================
//  whatsapp/sender.js
//  Envío de mensajes desde el CRM hacia WhatsApp Cloud API.
//   - sendMessage(phone, message)            → texto
//   - sendTemplate(phone, name, params, lang) → plantillas aprobadas
//   - sendMedia(phone, mediaUrl, type, opts)  → imagen/audio/documento/video
//  Incluye reintentos automáticos y log en Supabase (tabla messages).
// ============================================================

import { messagesUrl, authHeaders, normalizePhone } from './config.js';
import { findOrCreateLead, insertMessage, updateMessageStatus } from './db.js';

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 800;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * POST al Graph API con reintentos exponenciales.
 * Reintenta en errores de red o 429/5xx; no reintenta en 4xx (salvo 429).
 */
async function graphPost(payload, { retries = MAX_RETRIES } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(messagesUrl(), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) return { ok: true, data };

      const retryable = res.status === 429 || res.status >= 500;
      lastErr = new Error(data?.error?.message || `HTTP ${res.status}`);
      lastErr.meta = data?.error;
      if (!retryable || attempt === retries) return { ok: false, error: lastErr, data };
    } catch (err) {
      lastErr = err; // error de red → reintentar
      if (attempt === retries) return { ok: false, error: lastErr };
    }
    await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
  }
  return { ok: false, error: lastErr };
}

/**
 * Registra el mensaje saliente en la BD del CRM (log de envío).
 * source='crm' indica que salió desde el panel, no desde el celular.
 */
async function logOutgoing({ phone, text, type = 'text', media_url = null, media_mime = null, waMessageId, status, leadId }) {
  let lead_id = leadId;
  if (!lead_id) {
    const lead = await findOrCreateLead({ phone, name: null });
    lead_id = lead.id;
  }
  await insertMessage({
    lead_id,
    sender: 'agent',
    source: 'crm',
    text,
    type,
    media_url,
    media_mime,
    status: status || (waMessageId ? 'sent' : 'failed'),
    wa_message_id: waMessageId || null,
    created_at: new Date().toISOString(),
  });
  return lead_id;
}

// ------------------------------------------------------------
// 1. TEXTO
// ------------------------------------------------------------
export async function sendMessage(phone, message, { leadId } = {}) {
  const to = normalizePhone(phone);
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: true, body: message },
  };

  const { ok, data, error } = await graphPost(payload);
  const waMessageId = data?.messages?.[0]?.id || null;

  await logOutgoing({ phone: to, text: message, waMessageId, status: ok ? 'sent' : 'failed', leadId });

  if (!ok) return { ok: false, error: error?.message, details: error?.meta };
  return { ok: true, waMessageId };
}

// ------------------------------------------------------------
// 2. PLANTILLAS APROBADAS POR META
//    params: array de strings que reemplazan {{1}}, {{2}}, ...
// ------------------------------------------------------------
export async function sendTemplate(phone, templateName, params = [], language = 'es') {
  const to = normalizePhone(phone);
  const components = params.length
    ? [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p) })) }]
    : [];

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name: templateName, language: { code: language }, components },
  };

  const { ok, data, error } = await graphPost(payload);
  const waMessageId = data?.messages?.[0]?.id || null;

  await logOutgoing({
    phone: to,
    text: `[Plantilla: ${templateName}] ${params.join(' · ')}`.trim(),
    type: 'text',
    waMessageId,
    status: ok ? 'sent' : 'failed',
  });

  if (!ok) return { ok: false, error: error?.message, details: error?.meta };
  return { ok: true, waMessageId };
}

// ------------------------------------------------------------
// 3. MEDIA (imagen, audio, documento, video)
//    Se envía por LINK público (mediaUrl). Meta lo descarga.
// ------------------------------------------------------------
const VALID_MEDIA = new Set(['image', 'audio', 'document', 'video']);

export async function sendMedia(phone, mediaUrl, type = 'image', { caption, filename, leadId } = {}) {
  const to = normalizePhone(phone);
  if (!VALID_MEDIA.has(type)) {
    return { ok: false, error: `Tipo de media inválido: ${type}` };
  }

  const mediaObj = { link: mediaUrl };
  if (caption && (type === 'image' || type === 'video' || type === 'document')) mediaObj.caption = caption;
  if (filename && type === 'document') mediaObj.filename = filename;

  const payload = { messaging_product: 'whatsapp', to, type, [type]: mediaObj };

  const { ok, data, error } = await graphPost(payload);
  const waMessageId = data?.messages?.[0]?.id || null;

  await logOutgoing({
    phone: to,
    text: caption || `[${type}]`,
    type,
    media_url: mediaUrl,
    waMessageId,
    status: ok ? 'sent' : 'failed',
    leadId,
  });

  if (!ok) return { ok: false, error: error?.message, details: error?.meta };
  return { ok: true, waMessageId };
}

// ------------------------------------------------------------
// 4. MARCAR COMO LEÍDO  (sync de lectura: CRM → celular)
//    Cuando el agente abre el chat en el CRM, marcamos el último
//    mensaje del cliente como leído también en WhatsApp.
// ------------------------------------------------------------
export async function markAsRead(waMessageId) {
  if (!waMessageId) return { ok: false, error: 'wa_message_id requerido' };
  const payload = { messaging_product: 'whatsapp', status: 'read', message_id: waMessageId };
  const { ok, error } = await graphPost(payload, { retries: 1 });
  if (ok) await updateMessageStatus(waMessageId, 'read');
  return ok ? { ok: true } : { ok: false, error: error?.message };
}

// ------------------------------------------------------------
// 5. INDICADOR "ESCRIBIENDO..."  (typing on)
//    Disponible enviando una acción de lectura con typing.
// ------------------------------------------------------------
export async function sendTyping(waMessageId) {
  if (!waMessageId) return { ok: false };
  const payload = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: waMessageId,
    typing_indicator: { type: 'text' },
  };
  const { ok } = await graphPost(payload, { retries: 0 });
  return { ok };
}

export default { sendMessage, sendTemplate, sendMedia, markAsRead, sendTyping };
