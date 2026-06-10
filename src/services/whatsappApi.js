// ============================================================
//  src/services/whatsappApi.js
//  Cliente del frontend para hablar con el backend de WhatsApp
//  (whatsapp/server.js). Envía mensajes, plantillas, media,
//  marca leídos, dispara la importación y consulta su progreso.
// ============================================================

// En local apunta al backend Express (http://localhost:3001 vía .env).
// En Vercel queda vacío ('') → llama al MISMO dominio: /api/...
const API_URL = import.meta.env.VITE_WHATSAPP_API_URL ?? '';

async function post(path, body) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message, offline: true };
  }
}

async function get(path) {
  try {
    const res = await fetch(`${API_URL}${path}`);
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message, offline: true };
  }
}

export const whatsappApi = {
  url: API_URL,

  /** ¿El backend está disponible y configurado? */
  health: () => get('/api/health'),

  /** Estado del número y la WABA en Meta (verificación, calidad, bloqueos). */
  waStatus: () => get('/api/wa-status'),

  /** Enviar texto a un número. */
  sendMessage: (phone, message, leadId) => post('/api/send', { phone, message, leadId }),

  /** Enviar plantilla aprobada por Meta. */
  sendTemplate: (phone, templateName, params = [], language = 'es') =>
    post('/api/send-template', { phone, templateName, params, language }),

  /** Enviar imagen/documento/audio/video por URL. */
  sendMedia: (phone, mediaUrl, type = 'image', opts = {}) =>
    post('/api/send-media', { phone, mediaUrl, type, ...opts }),

  /** Marcar como leído (sync CRM → celular). */
  markRead: (waMessageId, leadId) => post('/api/read', { waMessageId, leadId }),

  /** Indicador "escribiendo...". */
  typing: (waMessageId) => post('/api/typing', { waMessageId }),

  /** Iniciar importación de los últimos 30 días. */
  startImport: () => post('/api/import', {}),

  /** Progreso de la importación (para la barra). */
  importStatus: () => get('/api/import/status'),

  /** Intercambia el "code" del Embedded Signup (Coexistence) por un token. */
  embeddedSignup: (code, redirectUri) => post('/api/embedded-signup', { code, redirectUri }),
};

export default whatsappApi;
