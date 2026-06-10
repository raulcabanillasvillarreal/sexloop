// POST /api/typing → indicador "escribiendo..."
import { sendTyping } from '../whatsapp/sender.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const { waMessageId } = req.body || {};
  const result = await sendTyping(waMessageId);
  res.status(200).json(result);
}
