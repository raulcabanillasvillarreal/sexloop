// GET /api/wa-status → estado del número y la WABA en Meta (sin exponer secretos)
// Por defecto consulta el número configurado (WHATSAPP_PHONE_NUMBER_ID).
// Acepta ?phone_number_id=...&waba_id=... para consultar otro (ej. el número real
// en Coexistence mientras el configurado sigue siendo el de prueba).
import { config, GRAPH_BASE, authHeaders } from '../whatsapp/config.js';

async function graphGet(path, fields) {
  const url = `${GRAPH_BASE}/${path}?fields=${fields}`;
  const r = await fetch(url, { headers: authHeaders() });
  const data = await r.json();
  if (data.error) return { ok: false, error: data.error.message, code: data.error.code };
  return { ok: true, ...data };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  if (!config.token) return res.status(500).json({ ok: false, error: 'WHATSAPP_TOKEN no configurado' });

  const phoneNumberId = req.query.phone_number_id || config.phoneNumberId;
  const wabaId = req.query.waba_id || config.wabaId;

  const [number, waba] = await Promise.all([
    phoneNumberId
      ? graphGet(
          phoneNumberId,
          'display_phone_number,verified_name,status,code_verification_status,platform_type,quality_rating,name_status'
        )
      : { ok: false, error: 'sin phone_number_id' },
    wabaId
      ? graphGet(wabaId, 'name,account_review_status,health_status')
      : { ok: false, error: 'sin waba_id' },
  ]);

  res.status(200).json({ ok: number.ok || waba.ok, number, waba });
}
