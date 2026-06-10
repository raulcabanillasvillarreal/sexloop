// ============================================================
//  whatsapp/media.js
//  Descarga archivos (imagen/audio/documento/video) que llegan por
//  WhatsApp y los sube a Supabase Storage para servirlos en el CRM.
//
//  Meta entrega la media en 2 pasos:
//    1. GET /{media-id}            → devuelve una URL temporal firmada
//    2. GET {esa url} (con Bearer) → descarga el binario
//  Luego subimos el binario al bucket 'whatsapp-media' de Supabase.
// ============================================================

import { GRAPH_BASE, config, authHeaders } from './config.js';
import { db } from './db.js';

const BUCKET = process.env.WHATSAPP_MEDIA_BUCKET || 'whatsapp-media';

let _bucketReady = false;
async function ensureBucket() {
  if (_bucketReady) return;
  const supabase = db();
  try {
    const { data } = await supabase.storage.getBucket(BUCKET);
    if (!data) {
      await supabase.storage.createBucket(BUCKET, { public: true });
    }
  } catch {
    // createBucket falla si ya existe → lo ignoramos
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  }
  _bucketReady = true;
}

const extFromMime = (mime = '') => {
  const map = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/amr': 'amr',
    'video/mp4': 'mp4', 'application/pdf': 'pdf',
  };
  return map[mime] || (mime.split('/')[1] || 'bin').split(';')[0];
};

/**
 * Descarga la media de Meta por su id y la sube a Supabase Storage.
 * Devuelve la URL pública para mostrarla en el CRM.
 */
export async function downloadMediaToUrl(mediaId, mime) {
  // Paso 1: obtener la URL temporal de descarga
  const metaRes = await fetch(`${GRAPH_BASE}/${mediaId}`, { headers: authHeaders() });
  if (!metaRes.ok) throw new Error(`No se pudo obtener media ${mediaId}`);
  const metaData = await metaRes.json();
  const fileUrl = metaData.url;
  const fileMime = mime || metaData.mime_type;

  // Paso 2: descargar el binario (requiere Authorization)
  const binRes = await fetch(fileUrl, { headers: { Authorization: `Bearer ${config.token}` } });
  if (!binRes.ok) throw new Error(`No se pudo descargar binario de media ${mediaId}`);
  const arrayBuffer = await binRes.arrayBuffer();

  // Paso 3: subir a Supabase Storage
  await ensureBucket();
  const supabase = db();
  const path = `${new Date().getFullYear()}/${mediaId}.${extFromMime(fileMime)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(arrayBuffer), { contentType: fileMime, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export default downloadMediaToUrl;
