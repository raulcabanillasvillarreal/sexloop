// POST /api/read → marcar leído (sync de lectura CRM → celular)
import { markAsRead } from '../whatsapp/sender.js';
import { markLeadRead } from '../whatsapp/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const { waMessageId, leadId } = req.body || {};
  if (waMessageId) await markAsRead(waMessageId);
  if (leadId) await markLeadRead(leadId);
  res.status(200).json({ ok: true });
}
