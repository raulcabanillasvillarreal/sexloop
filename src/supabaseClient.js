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
