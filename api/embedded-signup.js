// POST /api/embedded-signup → intercambia el "code" del Embedded Signup
// (flujo Coexistence) por un token de acceso, usando el App Secret en el servidor.
import { config, GRAPH_BASE } from '../whatsapp/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: 'code requerido' });
  if (!config.appId || !config.appSecret) {
    return res.status(500).json({ ok: false, error: 'Falta META_APP_ID o META_APP_SECRET en el servidor.' });
  }

  try {
    const url = `${GRAPH_BASE}/oauth/access_token`
      + `?client_id=${encodeURIComponent(config.appId)}`
      + `&client_secret=${encodeURIComponent(config.appSecret)}`
      + `&code=${encodeURIComponent(code)}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ ok: false, error: data?.error?.message || 'Error en intercambio', details: data });
    res.status(200).json({
      ok: true,
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
