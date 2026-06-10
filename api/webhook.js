// ============================================================
//  api/webhook.js  ·  Función serverless de Vercel para el webhook
//  de WhatsApp (alternativa a ejecutar whatsapp/server.js en un host
//  Node propio). Meta llamará a:  https://TU-DOMINIO/api/webhook
//
//  Reutiliza la misma lógica que el servidor Express.
//  Requiere las variables de entorno definidas en el proyecto Vercel
//  (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WEBHOOK_VERIFY_TOKEN,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, META_APP_SECRET, ...).
// ============================================================

import { config } from '../whatsapp/config.js';
import { processWebhookPayload } from '../whatsapp/webhook.js';

export default async function handler(req, res) {
  // Verificación (handshake de Meta)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === config.verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // Recepción de eventos
  if (req.method === 'POST') {
    // En serverless procesamos ANTES de responder (el código tras res
    // no se garantiza). El dedupe por wa_message_id evita problemas si
    // Meta reintenta por un 200 tardío.
    try {
      await processWebhookPayload(req.body || {});
    } catch (err) {
      console.error('Error en webhook serverless:', err);
    }
    return res.status(200).json({ received: true });
  }

  res.status(405).send('Method Not Allowed');
}
