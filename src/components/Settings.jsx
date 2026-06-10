import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit3, MessageSquare, Key, Sliders, DownloadCloud, Bell, BellOff } from 'lucide-react';
import { whatsappApi } from '../services/whatsappApi';
import { isSoundEnabled, setSoundEnabled, requestNotificationPermission } from '../services/notifications';
import WhatsAppConnect from './WhatsAppConnect';

export default function Settings({ templates, saveTemplates, apiSettings, saveApiSettings }) {
  // --- Importación de historial (30 días) ---
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  useEffect(() => {
    let timer;
    const poll = async () => {
      const p = await whatsappApi.importStatus();
      if (!p.offline) setProgress(p);
      if (importing && p && !p.historyDone) timer = setTimeout(poll, 2000);
      else setImporting(false);
    };
    if (importing) poll();
    return () => clearTimeout(timer);
  }, [importing]);

  const handleImport = async () => {
    const res = await whatsappApi.startImport();
    if (res.offline) { alert('El backend de WhatsApp no está disponible. Inicia: npm run whatsapp'); return; }
    if (res.alreadyDone) { alert('La importación ya se realizó antes (sin duplicados).'); }
    setImporting(true);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) requestNotificationPermission();
  };

  // Estado local para plantillas
  const [localTemplates, setLocalTemplates] = useState([...templates]);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [newTemplate, setNewTemplate] = useState({ label: '', text: '' });
  
  // Estado local para API
  const [localApi, setLocalApi] = useState({
    phoneNumberId: apiSettings.phoneNumberId || '',
    verifyToken: apiSettings.verifyToken || '',
    accessToken: apiSettings.accessToken || ''
  });

  // Guardar API Settings
  const handleSaveApi = (e) => {
    e.preventDefault();
    saveApiSettings(localApi);
  };

  // Agregar plantilla nueva
  const handleAddTemplate = (e) => {
    e.preventDefault();
    if (!newTemplate.label.trim() || !newTemplate.text.trim()) return;
    
    const updated = [
      ...localTemplates,
      { id: 't_' + Date.now(), label: newTemplate.label, text: newTemplate.text }
    ];
    setLocalTemplates(updated);
    saveTemplates(updated);
    setNewTemplate({ label: '', text: '' });
  };

  // Eliminar plantilla
  const handleDeleteTemplate = (id) => {
    const updated = localTemplates.filter(t => t.id !== id);
    setLocalTemplates(updated);
    saveTemplates(updated);
  };

  // Iniciar edición de plantilla
  const startEditTemplate = (t) => {
    setEditingTemplateId(t.id);
  };

  // Guardar edición de plantilla
  const saveEditedTemplate = (id, newLabel, newText) => {
    const updated = localTemplates.map(t => 
      t.id === id ? { ...t, label: newLabel, text: newText } : t
    );
    setLocalTemplates(updated);
    saveTemplates(updated);
    setEditingTemplateId(null);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {/* Columna Izquierda: Plantillas de Mensajes */}
      <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <MessageSquare size={20} color="var(--violeta)" />
          <h3 className="chart-header" style={{ margin: 0 }}>Plantillas de WhatsApp</h3>
        </div>

        {/* Listado de Plantillas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
          {localTemplates.map(t => (
            <div key={t.id} style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', background: '#fafafc' }}>
              {editingTemplateId === t.id ? (
                // Edición Activa
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue={t.label}
                    id={`label-${t.id}`}
                    placeholder="Etiqueta corta"
                  />
                  <textarea
                    className="form-input"
                    defaultValue={t.text}
                    id={`text-${t.id}`}
                    rows="3"
                    placeholder="Contenido del mensaje..."
                  ></textarea>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setEditingTemplateId(null)}>
                      Cancelar
                    </button>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => saveEditedTemplate(
                        t.id, 
                        document.getElementById(`label-${t.id}`).value, 
                        document.getElementById(`text-${t.id}`).value
                      )}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                // Vista Normal
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.label}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => startEditTemplate(t)}>
                        <Edit3 size={12} />
                      </button>
                      <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleDeleteTemplate(t.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{t.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Formulario Agregar Plantilla */}
        <form onSubmit={handleAddTemplate} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)' }}>AÑADIR NUEVA PLANTILLA</span>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="Nombre de Plantilla (Ej: Cierre Shalom)"
              value={newTemplate.label}
              onChange={(e) => setNewTemplate({ ...newTemplate, label: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <textarea
              className="form-input"
              rows="2"
              placeholder="Texto completo de la plantilla..."
              value={newTemplate.text}
              onChange={(e) => setNewTemplate({ ...newTemplate, text: e.target.value })}
              required
            ></textarea>
          </div>
          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
            <Plus size={14} /> Agregar Plantilla
          </button>
        </form>
      </div>

      {/* Columna Derecha: Configuración API & Parámetros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Conexión del número real por Coexistence (QR) */}
        <WhatsAppConnect />

        {/* WhatsApp Cloud API Integración */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Key size={20} color="var(--violeta)" />
            <h3 className="chart-header" style={{ margin: 0 }}>WhatsApp Business Cloud API</h3>
          </div>

          <form onSubmit={handleSaveApi} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Phone Number ID (ID Teléfono)</label>
              <input
                type="text"
                className="form-input"
                value={localApi.phoneNumberId}
                onChange={(e) => setLocalApi({ ...localApi, phoneNumberId: e.target.value })}
                placeholder="Ej. 104593821038482"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Verify Token (Webhook)</label>
              <input
                type="text"
                className="form-input"
                value={localApi.verifyToken}
                onChange={(e) => setLocalApi({ ...localApi, verifyToken: e.target.value })}
                placeholder="Ej. mi_token_verificacion_seguro"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Permanent Access Token (Meta Token)</label>
              <textarea
                className="form-input"
                rows="3"
                value={localApi.accessToken}
                onChange={(e) => setLocalApi({ ...localApi, accessToken: e.target.value })}
                placeholder="EAAWp... (Token largo generado en Meta Developers)"
              ></textarea>
            </div>

            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
              <Save size={14} /> Guardar Ajustes API
            </button>
          </form>
        </div>

        {/* Importación de Historial (30 días · Coexistence) */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
            <DownloadCloud size={20} color="var(--violeta)" />
            <h3 className="chart-header" style={{ margin: 0 }}>Importar Chats de WhatsApp</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '12px' }}>
            Importa los chats y mensajes de los <strong>últimos 30 días</strong> desde WhatsApp Business
            (modo Coexistence). Crea fichas de cliente y trae las etiquetas automáticamente. Se evita duplicar si reconectas.
          </p>

          {progress && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span>{importing ? 'Importando…' : (progress.historyDone ? 'Importación completa' : 'Listo para importar')}</span>
                <span>{progress.importedMessages} msgs · {progress.importedLeads} clientes · {progress.importedLabels} etiquetas</span>
              </div>
              <div style={{ height: 8, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: progress.historyDone ? '100%' : (importing ? '66%' : '8%'),
                  background: 'linear-gradient(90deg, var(--rosa), var(--violeta))',
                  transition: 'width .6s ease',
                }} />
              </div>
            </div>
          )}

          <button className="btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handleImport} disabled={importing}>
            <DownloadCloud size={14} /> {importing ? 'Importando…' : 'Importar últimos 30 días'}
          </button>
        </div>

        {/* Notificaciones */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Bell size={20} color="var(--violeta)" />
            <h3 className="chart-header" style={{ margin: 0 }}>Notificaciones</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem' }}>Sonido de alerta al recibir mensajes</span>
            <button className="btn-secondary" onClick={toggleSound} style={{ padding: '6px 12px' }}>
              {soundOn ? <><Bell size={14} /> Activado</> : <><BellOff size={14} /> Silenciado</>}
            </button>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>
            Las notificaciones del navegador y el badge de no leídos en la pestaña se activan al permitir notificaciones.
          </p>
        </div>

        {/* Ajustes Generales de CRM */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Sliders size={20} color="var(--violeta)" />
            <h3 className="chart-header" style={{ margin: 0 }}>Parámetros Generales</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Los datos del CRM se están almacenando de forma segura y en tiempo real. 
            Si deseas conectar la base de datos de producción, asegúrate de actualizar tu archivo <code>.env</code> con las credenciales de tu proyecto Supabase.
          </p>
        </div>

      </div>
    </div>
  );
}
