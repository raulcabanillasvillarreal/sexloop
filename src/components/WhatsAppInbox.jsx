import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Phone, User, Check, CheckCheck, AlertCircle, ArrowLeft, FileText,
  DollarSign, ClipboardList, Info, Paperclip, Smartphone, Monitor, Plus, X
} from 'lucide-react';

const FALLBACK_TEMPLATES = [
  { id: 't1', label: 'Bienvenida', text: '¡Hola! Bienvenido a Sexloop. ¿En qué producto estás interesado el día de hoy? Recuerda que todos nuestros envíos son 100% discretos.' },
  { id: 't2', label: 'Yape/Plin', text: 'Puedes realizar tu Yape o Plin al número oficial 916 916 455 a nombre de Sexloop. Una vez hecho, envíanos la captura aquí para procesar tu pedido.' },
  { id: 't3', label: 'Shalom', text: 'Realizamos envíos discretos por Agencia Shalom a todo el Perú (costo S/ 10). Para el despacho envíanos: Nombres, DNI, Celular y la Agencia Shalom de destino.' },
];

// Tilde de estado del mensaje del agente: enviado ✓, entregado ✓✓, leído ✓✓ (azul)
function StatusTicks({ status }) {
  if (status === 'failed') return <AlertCircle size={12} color="var(--danger)" title="Error al enviar" />;
  if (status === 'read') return <CheckCheck size={13} color="#53bdeb" title="Leído" />;
  if (status === 'delivered') return <CheckCheck size={13} color="var(--text-secondary)" title="Entregado" />;
  return <Check size={12} color="var(--text-secondary)" title="Enviado" />; // sent
}

// Distintivo de origen: 📱 celular vs 💻 CRM
function SourceBadge({ source }) {
  if (source === 'phone') {
    return <span title="Enviado desde el celular" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, opacity: 0.7 }}><Smartphone size={10} /></span>;
  }
  if (source === 'crm' || source === 'api') {
    return <span title="Enviado desde el CRM" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, opacity: 0.7 }}><Monitor size={10} /></span>;
  }
  return null;
}

function MessageMedia({ msg }) {
  if (!msg.media_url) return null;
  const mime = msg.media_mime || '';
  if (msg.type === 'image' || mime.startsWith('image/')) {
    return <img src={msg.media_url} alt="adjunto" style={{ maxWidth: 220, borderRadius: 8, marginBottom: 4, display: 'block' }} />;
  }
  if (msg.type === 'audio' || mime.startsWith('audio/')) {
    return <audio controls src={msg.media_url} style={{ maxWidth: 220, marginBottom: 4 }} />;
  }
  if (msg.type === 'video' || mime.startsWith('video/')) {
    return <video controls src={msg.media_url} style={{ maxWidth: 220, borderRadius: 8, marginBottom: 4 }} />;
  }
  return (
    <a href={msg.media_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'inherit', textDecoration: 'underline', marginBottom: 4 }}>
      <FileText size={14} /> Ver documento
    </a>
  );
}

export default function WhatsAppInbox({
  leads, messages, templates = [],
  onSendText, onSendMedia, onMarkRead, onStartNewChat, updateLeadDetails,
  backendOnline = false, typingLeadId = null,
}) {
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [mobileInChat, setMobileInChat] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const [sending, setSending] = useState(false);
  // Composer de "escribir a número nuevo"
  const [showNewChat, setShowNewChat] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleCreateNewChat = async (e) => {
    if (e) e.preventDefault();
    if (!newPhone.trim() || !onStartNewChat) return;
    const lead = await onStartNewChat({ phone: newPhone, name: newName });
    if (lead) {
      setActiveLeadId(lead.id);
      setMobileInChat(true);
      setShowNewChat(false);
      setNewPhone('');
      setNewName('');
    }
  };

  useEffect(() => {
    if (leads.length > 0 && !activeLeadId) setActiveLeadId(leads[0].id);
  }, [leads, activeLeadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeLeadId, typingLeadId]);

  // Al abrir un chat, marcar como leído (sync CRM → celular)
  useEffect(() => {
    if (activeLeadId && onMarkRead) {
      const lead = leads.find(l => l.id === activeLeadId);
      if (lead && (lead.unread_count || 0) > 0) onMarkRead(lead);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeadId]);

  const activeLead = leads.find(l => l.id === activeLeadId);
  const activeChatMessages = messages
    .filter(m => m.lead_id === activeLeadId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeLead || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);
    await onSendText(activeLead, text);
    setSending(false);
  };

  const handleAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeLead) return;
    setSending(true);
    await onSendMedia(activeLead, file);
    setSending(false);
    e.target.value = '';
  };

  const chatListItems = leads
    .map(lead => {
      const leadMsgs = messages.filter(m => m.lead_id === lead.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const lastMsg = leadMsgs[leadMsgs.length - 1];
      return {
        lead,
        lastMsgText: lastMsg ? lastMsg.text : 'Sin mensajes aún',
        lastMsgTime: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        lastTs: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
        unread: lead.unread_count || 0,
      };
    })
    .sort((a, b) => b.lastTs - a.lastTs);

  const handleSelectLeadMobile = (leadId) => {
    setActiveLeadId(leadId);
    setMobileInChat(true);
  };

  const handleDetailChange = (field, value) => {
    if (!activeLead) return;
    updateLeadDetails({ ...activeLead, [field]: value });
  };

  return (
    <div className={`chat-container ${mobileInChat ? 'in-chat' : ''}`}>

      {/* 1. Lista de Chats */}
      <div className="chat-list">
        <div className="chat-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span>Conversaciones</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: backendOnline ? '#dcfce7' : '#fee2e2', color: backendOnline ? '#16a34a' : '#dc2626' }}>
              {backendOnline ? '● API conectada' : '○ API offline'}
            </span>
            <button className="new-chat-btn" title="Escribir a un número nuevo" onClick={() => setShowNewChat(v => !v)}>
              {showNewChat ? <X size={16} /> : <Plus size={16} />}
            </button>
          </div>
        </div>

        {/* Formulario: escribir a un número nuevo */}
        {showNewChat && (
          <form className="new-chat-form" onSubmit={handleCreateNewChat}>
            <input
              type="text"
              placeholder="Número con código país (ej. +51987654321)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              placeholder="Nombre (opcional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="new-chat-actions">
              <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                Iniciar chat
              </button>
            </div>
          </form>
        )}
        {chatListItems.map(({ lead, lastMsgText, lastMsgTime, unread }) => (
          <div
            key={lead.id}
            className={`chat-user-item ${activeLeadId === lead.id ? 'active' : ''}`}
            onClick={() => handleSelectLeadMobile(lead.id)}
          >
            <div className="chat-user-avatar">
              {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="chat-user-info">
              <div className="chat-user-name">
                <span>{lead.name}</span>
                <span className="chat-last-time">{lastMsgTime}</span>
              </div>
              <div className="chat-last-msg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastMsgText}</span>
                {unread > 0 && (
                  <span style={{ background: '#25D366', color: '#fff', fontSize: '0.6rem', fontWeight: 800, borderRadius: 10, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>
                    {unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Ventana de Chat */}
      {activeLead ? (
        <div className="chat-window" style={{ borderRight: showDetailsPanel ? '1px solid var(--border-color)' : 'none' }}>
          <div className="chat-window-header">
            <div className="chat-window-user">
              <button className="hamburger-btn" style={{ display: 'none', marginRight: '8px' }} onClick={() => setMobileInChat(false)}>
                <ArrowLeft size={18} />
              </button>
              <div className="chat-user-avatar" style={{ background: 'linear-gradient(135deg, var(--rosa), var(--violeta))' }}>
                {activeLead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="chat-window-name">{activeLead.name}</div>
                <div className="chat-window-phone">
                  {typingLeadId === activeLead.id
                    ? <span style={{ color: '#25D366', fontWeight: 700 }}>escribiendo…</span>
                    : (activeLead.phone || 'Sin Teléfono')}
                </div>
              </div>
            </div>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.7rem' }} onClick={() => setShowDetailsPanel(!showDetailsPanel)}>
              <Info size={12} /> {showDetailsPanel ? 'Ocultar Detalles' : 'Ver Detalles'}
            </button>
          </div>

          {/* Mensajes */}
          <div className="chat-messages-area">
            {activeChatMessages.map((msg) => (
              <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                <MessageMedia msg={msg} />
                {msg.text && <div>{msg.text}</div>}
                <div className="message-time" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.sender === 'agent' && <SourceBadge source={msg.source} />}
                  {msg.sender === 'agent' && <StatusTicks status={msg.status} />}
                </div>
              </div>
            ))}
            {typingLeadId === activeLead.id && (
              <div className="message-bubble client" style={{ fontStyle: 'italic', opacity: 0.7 }}>escribiendo…</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Plantillas */}
          <div className="chat-templates-bar">
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <FileText size={10} /> Borrador:
            </span>
            {(templates.length > 0 ? templates : FALLBACK_TEMPLATES).map(t => (
              <button key={t.id} type="button" className="template-pill" onClick={() => setInputText(t.text)} title="Cargar al cuadro de texto">
                {t.label}
              </button>
            ))}
          </div>

          {/* Entrada */}
          <form className="chat-input-area" onSubmit={handleSend}>
            <input ref={fileInputRef} type="file" hidden onChange={handleAttach} accept="image/*,application/pdf,audio/*,video/*" />
            <button type="button" className="btn-send" style={{ background: '#fff', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }} onClick={() => fileInputRef.current?.click()} title="Adjuntar imagen o archivo">
              <Paperclip size={15} />
            </button>
            <input
              type="text"
              className="chat-input"
              placeholder={sending ? 'Enviando…' : 'Carga una plantilla o escribe aquí...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={sending}
            />
            <button type="submit" className="btn-send" disabled={sending}>
              <Send size={15} />
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          Selecciona un lead para ver la conversación
        </div>
      )}

      {/* 3. Panel de Detalles */}
      {showDetailsPanel && activeLead && (
        <div className="chat-details-panel">
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Detalles del Lead</h4>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}><User size={10} /> CLIENTE</label>
            <input type="text" className="form-input" style={{ fontSize: '0.8rem', padding: '6px 10px' }} value={activeLead.name} onChange={(e) => handleDetailChange('name', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={10} /> WHATSAPP</label>
            <input type="text" className="form-input" style={{ fontSize: '0.8rem', padding: '6px 10px' }} value={activeLead.phone || ''} onChange={(e) => handleDetailChange('phone', e.target.value)} />
          </div>

          {/* Etiquetas de WhatsApp Business importadas */}
          {Array.isArray(activeLead.wa_labels) && activeLead.wa_labels.length > 0 && (
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.65rem' }}>ETIQUETAS WHATSAPP</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {activeLead.wa_labels.map((lbl, i) => (
                  <span key={i} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, background: '#ede9fe', color: 'var(--violeta)', fontWeight: 700 }}>
                    {typeof lbl === 'string' ? lbl : lbl.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={10} /> MONTO ESTIMADO</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '7px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>S/</span>
              <input type="number" className="form-input" style={{ fontSize: '0.8rem', padding: '6px 10px 6px 28px', fontWeight: 700, color: 'var(--rosa)' }} value={activeLead.amount} onChange={(e) => handleDetailChange('amount', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.65rem' }}>ETAPA DEL EMBUDO</label>
            <select className="form-input" style={{ fontSize: '0.8rem', padding: '6px 10px' }} value={activeLead.stage} onChange={(e) => handleDetailChange('stage', e.target.value)}>
              <option value="Nuevo">Nuevos</option>
              <option value="Contactado">Contactado</option>
              <option value="Negociacion">En Negociación</option>
              <option value="Pago Pendiente">Pago Pendiente</option>
              <option value="Ganado">Cerrado Ganado</option>
              <option value="Perdido">Cerrado Perdido</option>
            </select>
          </div>

          <div className="form-group" style={{ flexGrow: 1 }}>
            <label className="form-label" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}><ClipboardList size={10} /> NOTAS / ENVÍO</label>
            <textarea className="form-input" style={{ fontSize: '0.78rem', padding: '6px 10px', height: '100px', resize: 'none' }} value={activeLead.notes || ''} onChange={(e) => handleDetailChange('notes', e.target.value)} placeholder="Escribe aquí notas de envío o shalom..."></textarea>
          </div>
        </div>
      )}
    </div>
  );
}
