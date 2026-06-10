// ============================================================
//  whatsapp/importer.js
//  Importación inicial al conectar por primera vez:
//   - Historial de los últimos N días (default 30) vía COEXISTENCE.
//   - Etiquetas de WhatsApp Business → catálogo del CRM.
//   - Crea fichas de cliente automáticamente (lo hace el webhook).
//   - Evita duplicados (índices únicos + wa_sync_state).
//   - Expone el progreso para la barra de la UI.
//
//  IMPORTANTE sobre Coexistence:
//  Cuando el número se registra en modo Coexistence, Meta ENVÍA el
//  historial automáticamente al webhook (campo "history") tras el
//  onboarding. Este módulo dispara/confirma ese proceso, importa las
//  etiquetas y lleva el conteo para mostrar progreso en el CRM.
// ============================================================

import { GRAPH_BASE, config, authHeaders } from './config.js';
import { db, getSyncState, setSyncState, upsertLabels } from './db.js';

// ------------------------------------------------------------
// Etiquetas de WhatsApp Business (SMB labels en Coexistence)
// ------------------------------------------------------------
export async function importLabels() {
  if (!config.wabaId) {
    console.warn('⚠️  WHATSAPP_BUSINESS_ACCOUNT_ID no definido: se omiten etiquetas.');
    return { ok: false, count: 0, reason: 'sin WABA ID' };
  }
  try {
    // Endpoint de etiquetas SMB (disponible con Coexistence).
    const res = await fetch(
      `${GRAPH_BASE}/${config.phoneNumberId}/smb_labels`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      // Algunos números exponen etiquetas vía el WABA en lugar del phone id.
      const alt = await fetch(`${GRAPH_BASE}/${config.wabaId}/labels`, { headers: authHeaders() });
      if (!alt.ok) return { ok: false, count: 0, reason: `HTTP ${res.status}` };
      const altData = await alt.json();
      const labels = (altData.data || []).map((l) => ({ id: l.id, name: l.name, color: l.color }));
      await upsertLabels(labels);
      return { ok: true, count: labels.length };
    }
    const data = await res.json();
    const labels = (data.data || []).map((l) => ({ id: l.id, name: l.name, color: l.color }));
    await upsertLabels(labels);
    console.log(`🏷️  ${labels.length} etiquetas de WhatsApp importadas.`);
    return { ok: true, count: labels.length };
  } catch (err) {
    console.error('Error importando etiquetas:', err.message);
    return { ok: false, count: 0, reason: err.message };
  }
}

// ------------------------------------------------------------
// Solicitar la sincronización de historial (Coexistence)
// ------------------------------------------------------------
export async function requestHistorySync() {
  // En Coexistence, Meta empuja el historial al webhook tras el
  // onboarding. Algunos setups permiten re-pedirlo con este endpoint.
  try {
    const res = await fetch(`${GRAPH_BASE}/${config.phoneNumberId}/smb_app_data`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ messaging_product: 'whatsapp', sync_type: 'history' }),
    });
    // No todos los números lo soportan; no es un error fatal.
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { requested: false, note: data?.error?.message || 'El historial se recibe automáticamente vía webhook.' };
    }
    return { requested: true };
  } catch {
    return { requested: false, note: 'El historial se recibe automáticamente vía webhook.' };
  }
}

// ------------------------------------------------------------
// Orquestador de la primera conexión
// ------------------------------------------------------------
export async function runInitialImport() {
  const state = await getSyncState();
  if (state.history_done) {
    return { ok: true, alreadyDone: true, message: 'La importación ya se realizó antes (sin duplicados).' };
  }

  await setSyncState({ last_import_at: new Date().toISOString(), history_done: false });

  const labels = await importLabels();
  const history = await requestHistorySync();

  return {
    ok: true,
    started: true,
    labels,
    history,
    historyDays: config.historyDays,
    message: 'Importación iniciada. El historial se irá poblando vía webhook (Coexistence).',
  };
}

// ------------------------------------------------------------
// Progreso de importación para la barra de la UI
// ------------------------------------------------------------
export async function getImportProgress() {
  const supabase = db();
  const sinceISO = new Date(Date.now() - config.historyDays * 86400000).toISOString();

  const { count: msgCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sinceISO);

  const { count: leadCount } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true });

  const { count: labelCount } = await supabase
    .from('wa_labels')
    .select('id', { count: 'exact', head: true });

  const state = await getSyncState();

  return {
    importedMessages: msgCount || 0,
    importedLeads: leadCount || 0,
    importedLabels: labelCount || 0,
    historyDone: !!state.history_done,
    lastImportAt: state.last_import_at || null,
  };
}

/** Marca la importación como completada (evita reprocesar al reconectar). */
export async function finishImport(total) {
  await setSyncState({ history_done: true, imported_count: total || 0 });
}

export default { runInitialImport, importLabels, getImportProgress, finishImport };
