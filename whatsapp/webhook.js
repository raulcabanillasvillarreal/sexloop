// ============================================================
//  whatsapp/webhook.js
//  Webhook de WhatsApp Cloud API (Meta) con soporte COEXISTENCE.
//
//   GET  /webhook  → verificación del token (handshake de Meta)
//   POST /webhook  → eventos: mensajes entrantes, estados,
//                    "ecos" de mensajes enviados desde el celular
//                    (coexistence) e historial de los últimos días.
//
//  Cada mensaje se guarda en Supabase, crea/actualiza la ficha del
//  cliente y, gracias a Supabase Realtime, aparece al instante en el CRM.
// ============================================================

import crypto from 'crypto';
import { config } from './config.js';
import {
  findOrCreateLead,
  insertMessage,
  updateMessageStatus,
  bumpUnread,
  markLeadRead,
} from './db.js';
import { downloadMediaToUrl } from './media.js';

// ------------------------------------------------------------
// Verificación GET (handshake)
// ------------------------------------------------------------
export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.verifyToken) {
    console.log('✅ Webhook verificado por Meta.');
    return res.status(200).send(challenge);
  }
  console.warn('⛔ Verificación de webhook fallida (token incorrecto).');
  return res.sendStatus(403);
}

// ------------------------------------------------------------
// Validación de firma X-Hub-Signature-256 (seguridad)
// ------------------------------------------------------------
export function verifySignature(req) {
  if (!config.appSecret) return true; // si no hay secret configurado, no se exige
  const signature = req.get('x-hub-signature-256');
  if (!signature) return false;
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', config.appSecret)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
// Mapea el tipo de mensaje de WhatsApp y extrae texto + media
// ------------------------------------------------------------
async function extractContent(message) {
  const type = message.type;
  const out = { type, text: '', mediaId: null, mediaMime: null, mediaUrl: null };

  switch (type) {
    case 'text':
      out.text = message.text?.body || '';
      break;
    case 'image':
      out.text = message.image?.caption || '[Imagen]';
      out.mediaId = message.image?.id;
      out.mediaMime = message.image?.mime_type;
      break;
    case 'audio':
      out.text = '[Audio]';
      out.mediaId = message.audio?.id;
      out.mediaMime = message.audio?.mime_type;
      break;
    case 'video':
      out.text = message.video?.caption || '[Video]';
      out.mediaId = message.video?.id;
      out.mediaMime = message.video?.mime_type;
      break;
    case 'document':
      out.text = message.document?.filename || '[Documento]';
      out.mediaId = message.document?.id;
      out.mediaMime = message.document?.mime_type;
      break;
    case 'sticker':
      out.type = 'image';
      out.text = '[Sticker]';
      out.mediaId = message.sticker?.id;
      out.mediaMime = message.sticker?.mime_type;
      break;
    case 'location':
      out.text = `📍 Ubicación: ${message.location?.latitude}, ${message.location?.longitude}`;
      break;
    case 'contacts':
      out.text = '[Contacto compartido]';
      break;
    case 'button':
      out.text = message.button?.text || '[Botón]';
      break;
    case 'interactive':
      out.text =
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        '[Respuesta interactiva]';
      break;
    default:
      out.text = `[${type || 'mensaje'} no soportado]`;
  }

  // Descargar media (imagen/audio/doc/video) y obtener URL pública/almacenada.
  if (out.mediaId) {
    try {
      out.mediaUrl = await downloadMediaToUrl(out.mediaId, out.mediaMime);
    } catch (e) {
      console.error('No se pudo descargar media:', e.message);
    }
  }
  return out;
}

const tsToISO = (ts) => (ts ? new Date(Number(ts) * 1000).toISOString() : new Date().toISOString());

// ------------------------------------------------------------
// Procesa UN mensaje entrante (de un cliente)
// ------------------------------------------------------------
async function handleIncomingMessage(message, contacts) {
  const phone = message.from;
  const contact = contacts?.find?.(() => true);
  const name = contact?.profile?.name || null;
  const waId = contact?.wa_id || phone;

  const lead = await findOrCreateLead({ phone, name, waId, origin: 'WhatsApp' });
  const content = await extractContent(message);

  const { inserted } = await insertMessage({
    lead_id: lead.id,
    sender: 'client',
    source: 'client',
    status: 'received',
    text: content.text,
    type: content.type,
    media_url: content.mediaUrl,
    media_mime: content.mediaMime,
    wa_message_id: message.id,
    wa_timestamp: tsToISO(message.timestamp),
    created_at: tsToISO(message.timestamp),
  });

  if (inserted) await bumpUnread(lead.id);
  console.log(`📥 [cliente] ${name || phone}: ${content.text}`);
}

// ------------------------------------------------------------
// COEXISTENCE: "eco" de un mensaje enviado DESDE EL CELULAR
//  Meta lo manda en el campo smb_message_echoes / message_echoes.
//  Lo registramos como 'agent' con source='phone'.
// ------------------------------------------------------------
async function handleEcho(message) {
  const phone = message.to || message.recipient_id || message.from;
  const lead = await findOrCreateLead({ phone, name: null, origin: 'WhatsApp' });
  const content = await extractContent(message);

  await insertMessage({
    lead_id: lead.id,
    sender: 'agent',
    source: 'phone', // ← enviado desde el celular del agente
    status: 'sent',
    text: content.text,
    type: content.type,
    media_url: content.mediaUrl,
    media_mime: content.mediaMime,
    wa_message_id: message.id,
    wa_timestamp: tsToISO(message.timestamp),
    created_at: tsToISO(message.timestamp),
  });
  console.log(`📱 [celular→CRM] ${phone}: ${content.text}`);
}

// ------------------------------------------------------------
// COEXISTENCE: importación de HISTORIAL (campo "history")
//  Meta envía hilos completos con sus mensajes al conectar.
// ------------------------------------------------------------
async function handleHistory(value) {
  const threads = value.history || [];
  let count = 0;
  for (const thread of threads) {
    const meta = thread.metadata || {};
    const phone = meta.phone_number || thread.phone_number;
    if (!phone) continue;
    const lead = await findOrCreateLead({ phone, name: meta.contact_name || null, origin: 'WhatsApp' });

    for (const message of thread.messages || []) {
      const fromMe = message.from === config.phoneNumberId || message.history_context?.from_me;
      const content = await extractContent(message);
      const { inserted } = await insertMessage({
        lead_id: lead.id,
        sender: fromMe ? 'agent' : 'client',
        source: fromMe ? 'phone' : 'client',
        status: fromMe ? 'sent' : 'received',
        text: content.text,
        type: content.type,
        media_url: content.mediaUrl,
        media_mime: content.mediaMime,
        wa_message_id: message.id,
        wa_timestamp: tsToISO(message.timestamp),
        created_at: tsToISO(message.timestamp),
      });
      if (inserted) count++;
    }
  }
  console.log(`🗂️  Historial coexistence importado: ${count} mensajes.`);
}

// ------------------------------------------------------------
// Estados de entrega: sent / delivered / read / failed
//  Incluye sync de lectura celular→CRM.
// ------------------------------------------------------------
async function handleStatuses(statuses) {
  for (const st of statuses) {
    await updateMessageStatus(st.id, st.status);
    if (st.status === 'read') {
      // El cliente leyó nuestro mensaje. (Sync de lectura)
      // No tocamos unread del lead aquí; eso es lectura del agente.
    }
  }
}

// ------------------------------------------------------------
// Router principal del payload (reutilizable en Express y serverless)
// ------------------------------------------------------------
export async function processWebhookPayload(body) {
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const field = change.field;
      const value = change.value || {};

      // 1) Estados de entrega/lectura
      if (value.statuses?.length) {
        await handleStatuses(value.statuses);
      }

      // 2) Mensajes entrantes normales
      if (field === 'messages' && value.messages?.length) {
        for (const message of value.messages) {
          await handleIncomingMessage(message, value.contacts);
        }
      }

      // 3) COEXISTENCE: ecos de mensajes enviados desde el celular
      if ((field === 'smb_message_echoes' || field === 'message_echoes') && config.coexistence) {
        const echoes = value.message_echoes || value.messages || [];
        for (const message of echoes) await handleEcho(message);
      }

      // 4) COEXISTENCE: historial inicial
      if (field === 'history' && config.coexistence) {
        await handleHistory(value);
      }
    }
  }
}

// ------------------------------------------------------------
// Handler POST para Express
// ------------------------------------------------------------
export async function receiveWebhook(req, res) {
  // Responder 200 rápido para que Meta no reintente; procesar luego.
  res.sendStatus(200);

  if (!verifySignature(req)) {
    console.warn('⛔ Firma X-Hub-Signature inválida. Evento ignorado.');
    return;
  }
  try {
    await processWebhookPayload(req.body);
  } catch (err) {
    console.error('Error procesando webhook:', err);
  }
}

export { handleIncomingMessage, handleEcho, handleHistory, markLeadRead };
