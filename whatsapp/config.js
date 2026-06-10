// ============================================================
//  whatsapp/config.js
//  Configuración central de la integración con
//  WhatsApp Business Cloud API (Meta) — modo COEXISTENCE.
//
//  Coexistence permite que el MISMO número funcione a la vez
//  en la app WhatsApp Business del celular Y en este CRM vía
//  Cloud API. Meta sincroniza el historial y "ecos" de los
//  mensajes enviados desde el teléfono hacia el webhook.
// ============================================================

import 'dotenv/config';

// Versión del Graph API. Coexistence requiere v19.0 o superior.
export const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v19.0';

export const config = {
  // --- Credenciales de WhatsApp Cloud API ---
  token:            process.env.WHATSAPP_TOKEN || '',
  phoneNumberId:    process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  wabaId:           process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '', // WABA ID (para etiquetas/plantillas)
  verifyToken:      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',

  // --- App de Meta ---
  appId:            process.env.META_APP_ID || '',
  appSecret:        process.env.META_APP_SECRET || '',

  // --- Coexistence ---
  // Activa el procesamiento de "message echoes" e "history" que
  // Meta envía cuando el número está en modo Coexistence.
  coexistence:      (process.env.WHATSAPP_COEXISTENCE || 'true') === 'true',
  // Días de historial a importar en la primera conexión (Meta soporta hasta 6 meses).
  historyDays:      parseInt(process.env.WHATSAPP_HISTORY_DAYS || '30', 10),

  // --- Supabase (backend, service role) ---
  supabaseUrl:      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // --- Servidor del webhook ---
  port:             parseInt(process.env.WHATSAPP_PORT || '3001', 10),

  // URL pública del webhook (la que registras en Meta). Solo informativa.
  publicUrl:        process.env.WHATSAPP_PUBLIC_URL || '',
};

// URLs base del Graph API ----------------------------------------------------
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/** Endpoint para enviar mensajes desde nuestro número. */
export const messagesUrl = () => `${GRAPH_BASE}/${config.phoneNumberId}/messages`;

/** Endpoint para subir/gestionar media. */
export const mediaUrl = (mediaId = '') =>
  mediaId ? `${GRAPH_BASE}/${mediaId}` : `${GRAPH_BASE}/${config.phoneNumberId}/media`;

/** Headers de autenticación estándar para el Graph API. */
export const authHeaders = () => ({
  Authorization: `Bearer ${config.token}`,
  'Content-Type': 'application/json',
});

/**
 * Valida que la configuración mínima esté presente.
 * Devuelve { ok, missing[] } para mostrar mensajes claros.
 */
export function validateConfig({ requireSupabase = true } = {}) {
  const missing = [];
  if (!config.token)           missing.push('WHATSAPP_TOKEN');
  if (!config.phoneNumberId)   missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!config.verifyToken)     missing.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
  if (requireSupabase) {
    if (!config.supabaseUrl)        missing.push('SUPABASE_URL');
    if (!config.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  return { ok: missing.length === 0, missing };
}

/** Normaliza un teléfono a formato E.164 sin signos (ej: 51916718455). */
export function normalizePhone(phone = '') {
  return String(phone).replace(/[^\d]/g, '');
}

export default config;
