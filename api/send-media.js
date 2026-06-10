// POST /api/send-media → enviar imagen/documento/audio/video por URL
import { sendMedia } from '../whatsapp/sender.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const { phone, mediaUrl, type, caption, filename, leadId } = req.body || {};
  if (!phone || !mediaUrl) return res.status(400).json({ ok: false, error: 'phone y mediaUrl requeridos' });
  const result = await sendMedia(phone, mediaUrl, type || 'image', { caption, filename, leadId });
  res.status(result.ok ? 200 : 502).json(result);
}
