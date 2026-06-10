import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verificar si tenemos credenciales válidas y no son los valores por defecto
const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  supabaseUrl.startsWith('https://');

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

console.log(
  isSupabaseConfigured 
    ? '✅ Conectado a Supabase: ' + supabaseUrl 
    : '⚠️ Supabase no configurado. Iniciando en Modo Local (LocalStorage + Datos Simulados).'
);

// Helper para guardar en localStorage cuando no hay Supabase
export const getLocalData = (key, defaultVal) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultVal;
};

export const setLocalData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Sube un archivo al bucket público 'whatsapp-media' y devuelve su URL pública.
// Se usa para adjuntar imágenes/documentos antes de enviarlos por la API de WhatsApp.
const WA_BUCKET = 'whatsapp-media';
export const uploadMediaFile = async (file) => {
  if (!supabase) return null;
  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase();
  const path = `crm/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(WA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) {
    console.error('Error subiendo media a Supabase Storage:', error.message);
    return null;
  }
  const { data } = supabase.storage.from(WA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

// Determina el tipo de media de WhatsApp a partir del MIME del archivo.
export const waMediaType = (file) => {
  const t = file.type || '';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('audio/')) return 'audio';
  if (t.startsWith('video/')) return 'video';
  return 'document';
};
