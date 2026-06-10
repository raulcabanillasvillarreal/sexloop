// POST /api/import → iniciar importación de los últimos 30 días
import { runInitialImport } from '../../whatsapp/importer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  try {
    const result = await runInitialImport();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
