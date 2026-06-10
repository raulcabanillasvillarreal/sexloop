// POST /api/send → enviar texto desde el CRM
import { sendMessage } from '../whatsapp/sender.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const { phone, message, leadId } = req.body || {};
  if (!phone || !message) return res.status(400).json({ ok: false, error: 'phone y message requeridos' });
  const result = await sendMessage(phone, message, { leadId });
  res.status(result.ok ? 200 : 502).json(result);
}
