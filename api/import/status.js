// GET /api/import/status → progreso de la importación (para la barra)
import { getImportProgress } from '../../whatsapp/importer.js';

export default async function handler(_req, res) {
  try {
    const progress = await getImportProgress();
    res.status(200).json(progress);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
