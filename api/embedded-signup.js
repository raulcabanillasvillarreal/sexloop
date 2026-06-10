// POST /api/embedded-signup → intercambia el "code" del Embedded Signup
// (flujo Coexistence) por un token de acceso, usando el App Secret en el servidor.
//
// El SDK de JavaScript de Facebook puede haber generado el code con distintos
// redirect_uri según el flujo. Para evitar el error "Error validating verification
// code... redirect_uri", probamos varios candidatos hasta que uno funcione.
import { config, GRAPH_BASE } from '../whatsapp/config.js';

async function exchange(code, redirectUri) {
  let url = `${GRAPH_BASE}/oauth/access_token`
    + `?client_id=${encodeURIComponent(config.appId)}`
    + `&client_secret=${encodeURIComponent(config.appSecret)}`
    + `&code=${encodeURIComponent(code)}`;
  // redirectUri === null  → no enviar el parámetro (flujo override)
  // redirectUri === ''     → enviar redirect_uri vacío (JS SDK)
  if (redirectUri !== null && redirectUri !== undefined) {
    url += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }
  const r = await fetch(url);
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok && !!data.access_token, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const { code, redirectUri } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: 'code requerido' });
  if (!config.appId || !config.appSecret) {
    return res.status(500).json({ ok: false, error: 'Falta META_APP_ID o META_APP_SECRET en el servidor.' });
  }

  // Candidatos de redirect_uri, en orden de probabilidad.
  const withSlash = redirectUri ? redirectUri.replace(/\/?$/, '/') : null;
  const candidates = [null, '', redirectUri, withSlash]
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe conservando orden

  let lastErr = null;
  for (const ru of candidates) {
    if (ru === undefined) continue;
    try {
      const { ok, data } = await exchange(code, ru);
      if (ok) {
        return res.status(200).json({
          ok: true,
          access_token: data.access_token,
          token_type: data.token_type,
          expires_in: data.expires_in,
        });
      }
      lastErr = data?.error?.message || 'Error desconocido';
    } catch (err) {
      lastErr = err.message;
    }
  }
  return res.status(502).json({ ok: false, error: lastErr || 'No se pudo intercambiar el código' });
}
