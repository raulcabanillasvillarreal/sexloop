// ============================================================
//  whatsapp/db.js
//  Capa de acceso a Supabase para el backend de WhatsApp.
//  Usa la SERVICE ROLE KEY (omite RLS) — SOLO en el servidor.
//  Reutiliza la MISMA base de datos del CRM (tablas leads/messages).
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { config, normalizePhone } from './config.js';

let _supabase = null;

/** Cliente Supabase singleton con service role. */
export function db() {
  if (_supabase) return _supabase;
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('Supabase no configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  _supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false },
  });
  return _supabase;
}

/**
 * Busca un lead por teléfono o lo crea (ficha automática).
 * Devuelve el registro del lead. Evita duplicados por índice único en `phone`.
 */
export async function findOrCreateLead({ phone, name, waId, origin = 'WhatsApp' }) {
  const supabase = db();
  const normalized = normalizePhone(phone);

  // 1. Buscar por teléfono
  const { data: existing } = await supabase
    .from('leads')
    .select('*')
    .eq('phone', normalized)
    .maybeSingle();

  if (existing) {
    // Completar nombre si llegó vacío antes
    if (name && (!existing.name || existing.name === 'Cliente Nuevo')) {
      await supabase.from('leads').update({ name }).eq('id', existing.id);
      existing.name = name;
    }
    return existing;
  }

  // 2. Crear ficha automática
  const now = new Date().toISOString();
  const { data: created, error } = await supabase
    .from('leads')
    .insert([{
      name: name || 'Cliente Nuevo',
      phone: normalized,
      wa_id: waId || null,
      origin,
      stage: 'Nuevo',
      amount: 0,
      tags: [],
      wa_labels: [],
      notes: 'Ficha creada automáticamente desde WhatsApp.',
      first_contact: now,
      last_message_at: now,
      created_at: now,
    }])
    .select()
    .single();

  // Carrera: si otro proceso lo creó al mismo tiempo, recupéralo.
  if (error && error.code === '23505') {
    const { data: again } = await supabase
      .from('leads').select('*').eq('phone', normalized).single();
    return again;
  }
  if (error) throw error;
  return created;
}

/**
 * Inserta un mensaje evitando duplicados por wa_message_id.
 * Devuelve { inserted: boolean, message }.
 */
export async function insertMessage(msg) {
  const supabase = db();

  // Dedupe: si ya existe el wa_message_id, no insertar de nuevo.
  if (msg.wa_message_id) {
    const { data: dup } = await supabase
      .from('messages')
      .select('id')
      .eq('wa_message_id', msg.wa_message_id)
      .maybeSingle();
    if (dup) return { inserted: false, message: dup };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert([{
      lead_id:       msg.lead_id,
      sender:        msg.sender,            // 'client' | 'agent'
      text:          msg.text || '',
      source:        msg.source || 'crm',   // 'crm' | 'phone' | 'api' | 'client'
      status:        msg.status || 'sent',
      type:          msg.type || 'text',
      media_url:     msg.media_url || null,
      media_mime:    msg.media_mime || null,
      wa_message_id: msg.wa_message_id || null,
      wa_timestamp:  msg.wa_timestamp || null,
      created_at:    msg.created_at || new Date().toISOString(),
    }])
    .select()
    .single();

  if (error && error.code === '23505') return { inserted: false, message: null };
  if (error) throw error;

  // Actualiza el "último mensaje" del lead para ordenar la bandeja.
  await supabase
    .from('leads')
    .update({ last_message_at: data.created_at })
    .eq('id', msg.lead_id);

  return { inserted: true, message: data };
}

/** Actualiza el estado (sent/delivered/read/failed) de un mensaje por wa_message_id. */
export async function updateMessageStatus(waMessageId, status) {
  if (!waMessageId) return;
  const supabase = db();
  await supabase
    .from('messages')
    .update({ status })
    .eq('wa_message_id', waMessageId);
}

/** Marca como leídos en el CRM los mensajes de un lead (sync de lectura). */
export async function markLeadRead(leadId) {
  const supabase = db();
  await supabase.from('leads').update({ unread_count: 0 }).eq('id', leadId);
  await supabase
    .from('messages')
    .update({ status: 'read' })
    .eq('lead_id', leadId)
    .eq('sender', 'client')
    .neq('status', 'read');
}

/** Incrementa el contador de no leídos de un lead. */
export async function bumpUnread(leadId) {
  const supabase = db();
  const { data } = await supabase.from('leads').select('unread_count').eq('id', leadId).single();
  const next = (data?.unread_count || 0) + 1;
  await supabase.from('leads').update({ unread_count: next }).eq('id', leadId);
}

/** Guarda/actualiza etiquetas de WhatsApp Business en el catálogo del CRM. */
export async function upsertLabels(labels = []) {
  if (!labels.length) return;
  const supabase = db();
  await supabase
    .from('wa_labels')
    .upsert(labels.map(l => ({ id: l.id, name: l.name, color: l.color || null })), { onConflict: 'id' });
}

/** Estado de sincronización (para barra de progreso y dedupe de import). */
export async function getSyncState() {
  const supabase = db();
  const { data } = await supabase.from('wa_sync_state').select('*').eq('id', 'default').maybeSingle();
  return data || { id: 'default', history_done: false, imported_count: 0 };
}

export async function setSyncState(patch) {
  const supabase = db();
  await supabase
    .from('wa_sync_state')
    .upsert({ id: 'default', ...patch, updated_at: new Date().toISOString() }, { onConflict: 'id' });
}

export default db;
