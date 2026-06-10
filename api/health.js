// GET /api/health → estado de la configuración del backend en Vercel
import { config, validateConfig } from '../whatsapp/config.js';

export default function handler(_req, res) {
  const { ok, missing } = validateConfig();
  res.status(200).json({
    ok,
    missing,
    coexistence: config.coexistence,
    phoneNumberId: config.phoneNumberId ? '✓ configurado' : '✗ falta',
    version: 'v19.0',
  });
}
