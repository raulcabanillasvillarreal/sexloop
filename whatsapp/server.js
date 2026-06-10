// ============================================================
//  whatsapp/server.js
//  Servidor backend de la integración WhatsApp Cloud API.
//  Expone:
//    GET  /webhook            → verificación de Meta
//    POST /webhook            → recepción de mensajes/ecos/estados
//    POST /api/send           → enviar texto desde el CRM
//    POST /api/send-template  → enviar plantilla aprobada
//    POST /api/send-media     → enviar imagen/documento/etc.
//    POST /api/read           → marcar leído (sync CRM→celular)
//    POST /api/typing         → indicador "escribiendo..."
//    POST /api/import         → iniciar importación de 30 días
//    GET  /api/import/status  → progreso de la importación
//    GET  /api/health         → estado de la configuración
//
//  Ejecutar:  npm run whatsapp
// ============================================================

import express from 'express';
import cors from 'cors';
import { config, validateConfig, GRAPH_BASE } from './config.js';
import { verifyWebhook, receiveWebhook } from './webhook.js';
import { sendMessage, sendTemplate, sendMedia, markAsRead, sendTyping } from './sender.js';
import { runInitialImport, getImportProgress } from './importer.js';
import { markLeadRead } from './db.js';

const app = express();

app.use(cors());
// Guardamos el body crudo para validar la firma X-Hub-Signature-256.
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString(); },
}));

// --- Webhook -------------------------------------------------
app.get('/webhook', verifyWebhook);
app.post('/webhook', receiveWebhook);

// --- Salud / configuración ----------------------------------
app.get('/api/health', (_req, res) => {
  const { ok, missing } = validateConfig();
  res.json({
    ok,
    missing,
    coexistence: config.coexistence,
    phoneNumberId: config.phoneNumberId ? '✓ configurado' : '✗ falta',
    version: 'v19.0',
  });
});

// --- Envío de texto -----------------------------------------
app.post('/api/send', async (req, res) => {
  const { phone, message, leadId } = req.body || {};
  if (!phone || !message) return res.status(400).json({ ok: false, error: 'phone y message requeridos' });
  const result = await sendMessage(phone, message, { leadId });
  res.status(result.ok ? 200 : 502).json(result);
});

// --- Envío de plantilla -------------------------------------
app.post('/api/send-template', async (req, res) => {
  const { phone, templateName, params, language } = req.body || {};
  if (!phone || !templateName) return res.status(400).json({ ok: false, error: 'phone y templateName requeridos' });
  const result = await sendTemplate(phone, templateName, params || [], language || 'es');
  res.status(result.ok ? 200 : 502).json(result);
});

// --- Envío de media -----------------------------------------
app.post('/api/send-media', async (req, res) => {
  const { phone, mediaUrl, type, caption, filename, leadId } = req.body || {};
  if (!phone || !mediaUrl) return res.status(400).json({ ok: false, error: 'phone y mediaUrl requeridos' });
  const result = await sendMedia(phone, mediaUrl, type || 'image', { caption, filename, leadId });
  res.status(result.ok ? 200 : 502).json(result);
});

// --- Marcar como leído (sync de lectura CRM → celular) ------
app.post('/api/read', async (req, res) => {
  const { waMessageId, leadId } = req.body || {};
  if (waMessageId) await markAsRead(waMessageId);
  if (leadId) await markLeadRead(leadId);
  res.json({ ok: true });
});

// --- Indicador "escribiendo..." -----------------------------
app.post('/api/typing', async (req, res) => {
  const { waMessageId } = req.body || {};
  const result = await sendTyping(waMessageId);
  res.json(result);
});

// --- Embedded Signup (Coexistence): intercambio de code por token ---
app.post('/api/embedded-signup', async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: 'code requerido' });
  if (!config.appId || !config.appSecret) {
    return res.status(500).json({ ok: false, error: 'Falta META_APP_ID o META_APP_SECRET.' });
  }
  try {
    const url = `${GRAPH_BASE}/oauth/access_token`
      + `?client_id=${encodeURIComponent(config.appId)}`
      + `&client_secret=${encodeURIComponent(config.appSecret)}`
      + `&code=${encodeURIComponent(code)}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ ok: false, error: data?.error?.message || 'Error en intercambio', details: data });
    res.json({ ok: true, access_token: data.access_token, token_type: data.token_type, expires_in: data.expires_in });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Importación inicial (30 días) --------------------------
app.post('/api/import', async (_req, res) => {
  try {
    const result = await runInitialImport();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/import/status', async (_req, res) => {
  try {
    const progress = await getImportProgress();
    res.json(progress);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Arranque ------------------------------------------------
const { ok, missing } = validateConfig();
if (!ok) {
  console.warn('\n⚠️  Faltan variables de entorno:', missing.join(', '));
  console.warn('   El servidor arrancará igual, pero el envío/recepción fallará hasta completarlas.\n');
}

app.listen(config.port, () => {
  console.log('\n🚀 Servidor WhatsApp Cloud API (Coexistence) escuchando');
  console.log(`   → http://localhost:${config.port}`);
  console.log(`   → Webhook:  http://localhost:${config.port}/webhook`);
  console.log(`   → Coexistence: ${config.coexistence ? 'ACTIVADO' : 'desactivado'}`);
  if (config.publicUrl) console.log(`   → URL pública (Meta): ${config.publicUrl}/webhook`);
  console.log('');
});

export default app;
