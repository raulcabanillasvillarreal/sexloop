import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, User, CheckCheck, ArrowLeft, FileText, DollarSign, Tag, ClipboardList, Info, HelpCircle } from 'lucide-react';

const CHAT_TEMPLATES = [
  { id: 't1', label: 'Bienvenida', text: '¡Hola! Bienvenido a Sexloop. ¿En qué producto estás interesado el día de hoy? Recuerda que todos nuestros envíos son 100% discretos.' },
  { id: 't2', label: 'Yape/Plin', text: 'Puedes realizar tu Yape o Plin al número oficial 916 916 455 a nombre de Sexloop. Una vez hecho, envíanos la captura aquí para procesar tu pedido.' },
  { id: 't3', label: 'Shalom', text: 'Realizamos envíos discretos por Agencia Shalom a todo el Perú (costo S/ 10). Para el despacho envíanos: Nombres, DNI, Celular y la Agencia Shalom de destino.' },
  { id: 't4', label: 'Olva Courier', text: 'Enviamos por Olva Courier discreto a tu domicilio (Lima S/ 15 / Provincias S/ 20). Por favor confírmanos tu dirección completa, distrito, provincia y referencia.' }
];

export default function WhatsAppSimulator({ leads, messages, addMessage, updateLeadDetails, templates = [] }) {
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [mobileInChat, setMobileInChat] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const messagesEndRef = useRef(null);

  // Seleccionar el primer lead por defecto si no hay ninguno activo
  useEffect(() => {
    if (leads.length > 0 && !activeLeadId) {
      setActiveLeadId(leads[0].id);
    }
  }, [leads, activeLeadId]);

  // Hacer scroll automático al final del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeLeadId]);

  const activeLead = leads.find(l => l.id === activeLeadId);
  const activeChatMessages = messages.filter(m => m.lead_id === activeLeadId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeLeadId) return;

    // 1. Agregar mensaje del agente
    addMessage(activeLeadId, 'agent', inputText.trim());
    const queryText = inputText.trim().toLowerCase();
    setInputText('');

    // 2. Simular respuesta del cliente después de 1.5 segundos
    setTimeout(() => {
      let responseText = '¡Perfecto! Quedo a la espera de sus indicaciones.';
      
      if (queryText.includes('precio') || queryText.includes('cuanto cuesta') || queryText.includes('costo')) {
        responseText = 'Excelente precio. Me parece muy bien, ¿cómo puedo hacer el pago por Yape o Plin?';
      } else if (queryText.includes('yape') || queryText.includes('plin') || queryText.includes('cuenta') || queryText.includes('pago') || queryText.includes('yapeé') || queryText.includes('abono')) {
        responseText = 'Listo, ya realicé el abono. En breve les envío la captura de pantalla por aquí para que lo verifiquen.';
      } else if (queryText.includes('envio') || queryText.includes('shalom') || queryText.includes('olva') || queryText.includes('despacho') || queryText.includes('discreto')) {
        responseText = 'Genial. Por favor, asegúrense de que el empaque sea totalmente discreto. No quiero que se note qué hay dentro de la caja.';
      } else if (queryText.includes('hola') || queryText.includes('buenas') || queryText.includes('bienvenido')) {
        responseText = 'Hola. Sí, estuve revisando su catálogo en sexloop.pe y quería consultar por los retardantes en spray.';
      } else if (queryText.includes('stock') || queryText.includes('disponible')) {
        responseText = 'Perfecto, agréguenlo a mi pedido entonces. ¿Cuándo estarían haciendo el envío?';
      }

      addMessage(activeLeadId, 'client', responseText);
    }, 1500);
  };

  // Cargar plantilla en el borrador en lugar de enviarla de golpe
  const handleSelectTemplate = (templateText) => {
    setInputText(templateText);
  };

  // Manejar edición de ficha rápida en panel lateral derecho
  const handleDetailChange = (field, value) => {
    if (!activeLead) return;
    const updated = { ...activeLead, [field]: value };
    updateLeadDetails(updated);
  };

  const chatListItems = leads.map(lead => {
    const leadMsgs = messages.filter(m => m.lead_id === lead.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const lastMsg = leadMsgs[leadMsgs.length - 1];
    
    return {
      lead,
      lastMsgText: lastMsg ? lastMsg.text : 'Sin mensajes aún',
      lastMsgTime: lastMsg 
        ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : ''
    };
  });

  const handleSelectLeadMobile = (leadId) => {
    setActiveLeadId(leadId);
    setMobileInChat(true);
  };

  return (
    <div className={`chat-container ${mobileInChat ? 'in-chat' : ''}`}>
      
      {/* 1. Lista de Chats (Izquierda) */}
      <div className="chat-list">
        <div className="chat-list-header">Conversaciones</div>
        {chatListItems.map(({ lead, lastMsgText, lastMsgTime }) => (
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
              <div className="chat-last-msg">{lastMsgText}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Ventana de Chat Activo (Centro) */}
      {activeLead ? (
        <div className="chat-window" style={{ borderRight: showDetailsPanel ? '1px solid var(--border-color)' : 'none' }}>
          <div className="chat-window-header">
            <div className="chat-window-user">
              <button 
                className="hamburger-btn" 
                style={{ display: 'none', marginRight: '8px' }}
                onClick={() => setMobileInChat(false)}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="chat-user-avatar" style={{ background: 'linear-gradient(135deg, var(--rosa), var(--violeta))' }}>
                {activeLead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="chat-window-name">{activeLead.name}</div>
                <div className="chat-window-phone">{activeLead.phone || 'Sin Teléfono'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                onClick={() => setShowDetailsPanel(!showDetailsPanel)}
              >
                <Info size={12} /> {showDetailsPanel ? 'Ocultar Detalles' : 'Ver Detalles'}
              </button>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="chat-messages-area">
            {activeChatMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={`message-bubble ${msg.sender}`}
              >
                <div>{msg.text}</div>
                <div className="message-time" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.sender === 'agent' && <CheckCheck size={12} color="#25D366" />}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Barra de Plantillas (Borrador) */}
          <div className="chat-templates-bar">
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <FileText size={10} /> Borrador:
            </span>
            {(templates.length > 0 ? templates : CHAT_TEMPLATES).map(t => (
              <button
                key={t.id}
                type="button"
                className="template-pill"
                onClick={() => handleSelectTemplate(t.text)}
                title="Cargar al cuadro de texto"
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Formulario de Entrada */}
          <form className="chat-input-area" onSubmit={handleSend}>
            <input
              type="text"
              className="chat-input"
              placeholder="Carga una plantilla o escribe aquí..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button type="submit" className="btn-send">
              <Send size={15} />
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          Selecciona un lead para ver la conversación
        </div>
      )}

      {/* 3. Panel de Detalles del Lead (Derecha) - Inspirado en ManyChat/Kommo */}
      {showDetailsPanel && activeLead && (
        <div className="chat-details-panel">
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Detalles del Lead</h4>
          </div>

          {/* Nombre */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}><User size={10} /> CLIENTE</label>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              value={activeLead.name}
              onChange={(e) => handleDetailChange('name', e.target.value)}
            />
          </div>

          {/* Teléfono */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={10} /> WHATSAPP</label>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              value={activeLead.phone || ''}
              onChange={(e) => handleDetailChange('phone', e.target.value)}
            />
          </div>

          {/* Monto */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={10} /> MONTO ESTIMADO</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '7px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>S/</span>
              <input
                type="number"
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '6px 10px 6px 28px', fontWeight: 700, color: 'var(--rosa)' }}
                value={activeLead.amount}
                onChange={(e) => handleDetailChange('amount', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Estado de Embudo */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.65rem' }}>ETAPA DEL EMBUDO</label>
            <select
              className="form-input"
              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              value={activeLead.stage}
              onChange={(e) => handleDetailChange('stage', e.target.value)}
            >
              <option value="Nuevo">Nuevos</option>
              <option value="Contactado">Contactado</option>
              <option value="Negociacion">En Negociación</option>
              <option value="Pago Pendiente">Pago Pendiente</option>
              <option value="Ganado">Cerrado Ganado</option>
              <option value="Perdido">Cerrado Perdido</option>
            </select>
          </div>

          {/* Canal Origen */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.65rem' }}>CANAL DE ORIGEN</label>
            <select
              className="form-input"
              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              value={activeLead.origin}
              onChange={(e) => handleDetailChange('origin', e.target.value)}
            >
              <option value="WhatsApp">WhatsApp</option>
              <option value="Web">Web de SexLoop</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
            </select>
          </div>

          {/* Notas de Seguimiento */}
          <div className="form-group" style={{ flexGrow: 1 }}>
            <label className="form-label" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}><ClipboardList size={10} /> NOTAS / ENVÍO</label>
            <textarea
              className="form-input"
              style={{ fontSize: '0.78rem', padding: '6px 10px', height: '100px', resize: 'none' }}
              value={activeLead.notes || ''}
              onChange={(e) => handleDetailChange('notes', e.target.value)}
              placeholder="Escribe aquí notas de envío o shalom..."
            ></textarea>
          </div>
        </div>
      )}
    </div>
  );
}
