// POST /api/send-template → enviar plantilla aprobada por Meta
import { sendTemplate } from '../whatsapp/sender.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const { phone, templateName, params, language } = req.body || {};
  if (!phone || !templateName) return res.status(400).json({ ok: false, error: 'phone y templateName requeridos' });
  const result = await sendTemplate(phone, templateName, params || [], language || 'es');
  res.status(result.ok ? 200 : 502).json(result);
}
