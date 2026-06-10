import React, { useState, useEffect } from 'react';
import { 
  KanbanSquare, 
  LayoutDashboard, 
  MessageSquareCode, 
  Users, 
  Plus, 
  Sparkles,
  Save,
  Trash2,
  Menu,
  Settings as SettingsIcon
} from 'lucide-react';
import { supabase, getLocalData, setLocalData, uploadMediaFile, waMediaType } from './supabaseClient';
import { whatsappApi } from './services/whatsappApi';
import { notifyNewMessage, updateTabBadge, requestNotificationPermission } from './services/notifications';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import WhatsAppInbox from './components/WhatsAppInbox';
import ClientDatabase from './components/ClientDatabase';
import CrmSettings from './components/Settings';

// --- CATALOGO MOCK PARA CARGAR PRODUCTOS COMO ETIQUETAS ---
const DEFAULT_PRODUCTS = [
  { name: 'Lubricante anal aroma chicle Erosex', price: 39.00 },
  { name: 'Lubricante anal aroma fresa Erosex', price: 39.00 },
  { name: 'Lubricante anal aroma manzana Erosex', price: 39.00 },
  { name: 'Lubricante anal silver Erosex', price: 45.00 },
  { name: 'Retardante en crema Golden', price: 49.00 },
  { name: 'Retardante en spray Golden', price: 59.00 },
  { name: 'Crema retardante Maxman', price: 55.00 },
  { name: 'Pastilla potenciadora Hard Bull', price: 69.00 }
];

const INITIAL_LEADS = [
  { id: 'lead_1', name: 'Carlos Mendoza', phone: '+51987654321', origin: 'WhatsApp', stage: 'Nuevo', amount: 78.00, tags: ['Lubricante anal aroma chicle Erosex', 'Lubricante anal aroma fresa Erosex'], notes: 'Preguntó por envíos a Arequipa vía Shalom. Interesado en sabores frutales.', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'lead_2', name: 'Sofía Ugarte', phone: '+51912345678', origin: 'Web', stage: 'Contactado', amount: 45.00, tags: ['Lubricante anal silver Erosex'], notes: 'Hizo la compra online pero no completó el pago. Contactar para cerrar.', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'lead_3', name: 'Juan Diego Ramos', phone: '+51933445566', origin: 'Instagram', stage: 'Negociacion', amount: 128.00, tags: ['Retardante en spray Golden', 'Pastilla potenciadora Hard Bull'], notes: 'Quiere envío discreto a oficina de Olva en San Isidro. Se le envió opciones de pago.', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: 'lead_4', name: 'Marco Polo', phone: '+51944556677', origin: 'WhatsApp', stage: 'Pago Pendiente', amount: 39.00, tags: ['Lubricante anal aroma manzana Erosex'], notes: 'Envió captura de Yape, falta confirmar abono en cuenta bancaria.', created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 'lead_5', name: 'Elena Flores', phone: '+51955667788', origin: 'Facebook', stage: 'Ganado', amount: 49.00, tags: ['Retardante en crema Golden'], notes: 'Pedido enviado discreto por Shalom. Código de seguimiento enviado.', created_at: new Date(Date.now() - 3600000 * 48).toISOString() }
];

const INITIAL_MESSAGES = [
  { id: 'm1', lead_id: 'lead_1', sender: 'client', text: 'Hola, vi su página sexloop.pe. Quería saber cuánto cuesta el envío a Arequipa.', created_at: new Date(Date.now() - 3600000 * 2 - 1000 * 60 * 10).toISOString() },
  { id: 'm2', lead_id: 'lead_1', sender: 'agent', text: '¡Hola Carlos! Bienvenido a Sexloop. El envío a Arequipa por Shalom cuesta S/ 10 adicionales. Los paquetes van 100% sellados y sin logos ni marcas para total discreción. ¿Qué productos te interesaron?', created_at: new Date(Date.now() - 3600000 * 2 - 1000 * 60 * 8).toISOString() },
  { id: 'm3', lead_id: 'lead_1', sender: 'client', text: 'Excelente. Me interesan el lubricante de chicle y el de fresa. ¿Tienen stock?', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'm4', lead_id: 'lead_2', sender: 'client', text: 'Buenas, intenté comprar el lubricante anal silver por la web pero me dio error el Yape.', created_at: new Date(Date.now() - 3600000 * 5 - 1000 * 60 * 5).toISOString() },
  { id: 'm5', lead_id: 'lead_2', sender: 'agent', text: 'Hola Sofía, no te preocupes. Puedes realizarnos el Yape directo al número oficial de Sexloop 916 718 455 a nombre de Sexloop SAC y nos envías la captura por aquí.', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'm6', lead_id: 'lead_3', sender: 'client', text: 'Hola, quiero pedir el retardante en spray y un Hard Bull.', created_at: new Date(Date.now() - 3600000 * 24 - 1000 * 60 * 3).toISOString() },
  { id: 'm7', lead_id: 'lead_3', sender: 'agent', text: '¡Claro Juan Diego! El total de ambos sería S/ 128. ¿Prefieres recoger en oficina de Olva Courier o Shalom?', created_at: new Date(Date.now() - 3600000 * 24 - 1000 * 60).toISOString() },
  { id: 'm8', lead_id: 'lead_3', sender: 'client', text: 'Olva Courier de San Isidro por favor. ¿Cuáles son sus cuentas bancarias?', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: 'm9', lead_id: 'lead_4', sender: 'client', text: 'Listo, ya les yapeé los S/ 39 por el lubricante de manzana. Adjunto captura.', created_at: new Date(Date.now() - 3600000 * 12).toISOString() }
];

const DEFAULT_TEMPLATES = [
  { id: 't1', label: 'Bienvenida', text: '¡Hola! Bienvenido a Sexloop. ¿En qué producto estás interesado el día de hoy? Recuerda que todos nuestros envíos son 100% discretos.' },
  { id: 't2', label: 'Yape/Plin', text: 'Puedes realizar tu Yape o Plin al número oficial 916 916 455 a nombre de Sexloop. Una vez hecho, envíanos la captura aquí para procesar tu pedido.' },
  { id: 't3', label: 'Shalom', text: 'Realizamos envíos discretos por Agencia Shalom a todo el Perú (costo S/ 10). Para el despacho envíanos: Nombres, DNI, Celular y la Agencia Shalom de destino.' },
  { id: 't4', label: 'Olva Courier', text: 'Enviamos por Olva Courier discreto a tu domicilio (Lima S/ 15 / Provincias S/ 20). Por favor confírmanos tu dirección completa, distrito, provincia y referencia.' }
];

export default function App() {
  const [currentView, setCurrentView] = useState('kanban'); // dashboard, kanban, chat, clients, settings
  const [leads, setLeads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  // State de control del sidebar en celular
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Estado de la integración WhatsApp Cloud API
  const [backendOnline, setBackendOnline] = useState(false);
  const [typingLeadId] = useState(null); // reservado para indicador "escribiendo..."

  // States de Modales
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  // States del formulario de Lead nuevo
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    phone: '',
    origin: 'WhatsApp',
    stage: 'Nuevo',
    tags: [],
    notes: ''
  });

  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  // Cargar datos
  useEffect(() => {
    async function loadData() {
      // Cargar plantillas y API de ajustes locales
      setTemplates(getLocalData('sexloop_templates', DEFAULT_TEMPLATES));

      if (supabase) {
        try {
          const { data: dbLeads } = await supabase.from('leads').select('*');
          const { data: dbMessages } = await supabase.from('messages').select('*');

          if (dbLeads) setLeads(dbLeads);
          else setLeads(INITIAL_LEADS);

          if (dbMessages) setMessages(dbMessages);
          else setMessages(INITIAL_MESSAGES);
        } catch (err) {
          console.error("Error cargando desde Supabase, cargando datos locales:", err);
          loadFallbackData();
        }
      } else {
        loadFallbackData();
      }
    }

    function loadFallbackData() {
      setLeads(getLocalData('sexloop_leads', INITIAL_LEADS));
      setMessages(getLocalData('sexloop_messages', INITIAL_MESSAGES));
    }

    loadData();
  }, []);

  // Ref con los leads actuales (para usarlos dentro de callbacks de Realtime)
  const leadsRef = React.useRef([]);
  useEffect(() => { leadsRef.current = leads; }, [leads]);

  // --- Comprobar backend de WhatsApp y pedir permiso de notificaciones ---
  useEffect(() => {
    let alive = true;
    whatsappApi.health().then(h => { if (alive) setBackendOnline(!!h && !h.offline); });
    requestNotificationPermission();
    const interval = setInterval(() => {
      whatsappApi.health().then(h => setBackendOnline(!!h && !h.offline));
    }, 30000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  // --- SINCRONIZACIÓN EN TIEMPO REAL (Supabase Realtime / Coexistence) ---
  // Mensajes desde el celular o desde otro dispositivo aparecen al instante.
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('crm-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        setMessages(prev => {
          // Evitar duplicados (mismo id o mismo wa_message_id)
          if (prev.some(m => m.id === msg.id || (msg.wa_message_id && m.wa_message_id === msg.wa_message_id))) {
            return prev;
          }
          return [...prev, msg];
        });
        // Notificar solo mensajes entrantes del cliente
        if (msg.sender === 'client') {
          const lead = leadsRef.current.find(l => l.id === msg.lead_id);
          const totalUnread = leadsRef.current.reduce((s, l) => s + (l.unread_count || 0), 0) + 1;
          notifyNewMessage({ name: lead?.name, text: msg.text, totalUnread });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, ...msg } : m)));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        const lead = payload.new;
        setLeads(prev => (prev.some(l => l.id === lead.id) ? prev : [lead, ...prev]));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const lead = payload.new;
        setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, ...lead } : l)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- Badge de no leídos en el título de la pestaña ---
  useEffect(() => {
    const totalUnread = leads.reduce((s, l) => s + (l.unread_count || 0), 0);
    updateTabBadge(totalUnread);
  }, [leads]);

  // Notificación Toast helper
  const triggerToast = (message, title = 'Notificación') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- CONTROL DE LEADS ---

  const addLead = async (leadPayload) => {
    // Calcular el monto en base a los precios del catálogo para los productos seleccionados
    const amount = leadPayload.tags.reduce((sum, tagName) => {
      const prod = DEFAULT_PRODUCTS.find(p => p.name === tagName);
      return sum + (prod ? Number(prod.price) : 0);
    }, 0);

    const newLead = {
      ...leadPayload,
      amount,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      const { data, error } = await supabase.from('leads').insert([newLead]).select();
      if (!error && data) {
        setLeads(prev => [data[0], ...prev]);
        triggerToast(`Lead ${leadPayload.name} creado correctamente en Supabase.`, 'Llegada de Lead');
      } else {
        console.error("Error insertando lead en Supabase", error);
      }
    } else {
      const localLeads = getLocalData('sexloop_leads', INITIAL_LEADS);
      const created = { ...newLead, id: 'lead_' + Date.now() };
      const updated = [created, ...localLeads];
      setLeads(updated);
      setLocalData('sexloop_leads', updated);
      triggerToast(`Lead ${leadPayload.name} guardado localmente.`, 'Llegada de Lead');
    }
  };

  const updateLeadStage = async (leadId, newStage) => {
    const updatedLeads = leads.map(l => l.id === leadId ? { ...l, stage: newStage } : l);
    setLeads(updatedLeads);

    if (supabase) {
      await supabase.from('leads').update({ stage: newStage }).eq('id', leadId);
    } else {
      setLocalData('sexloop_leads', updatedLeads);
    }
    triggerToast(`Lead actualizado a la etapa: ${newStage}`, 'Embudo Actualizado');
  };

  const saveEditedLead = async (editedLead) => {
    // Recalcular monto
    const amount = editedLead.tags.reduce((sum, tagName) => {
      const prod = DEFAULT_PRODUCTS.find(p => p.name === tagName);
      return sum + (prod ? Number(prod.price) : 0);
    }, 0);

    const updatedLead = { ...editedLead, amount };
    const updatedLeads = leads.map(l => l.id === editedLead.id ? updatedLead : l);
    setLeads(updatedLeads);

    if (supabase) {
      await supabase.from('leads').update(updatedLead).eq('id', editedLead.id);
    } else {
      setLocalData('sexloop_leads', updatedLeads);
    }
    setSelectedLead(null);
    triggerToast('Datos del cliente actualizados.', 'Ficha del Cliente');
  };

  const deleteLead = async (leadId) => {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente del CRM?')) {
      const updated = leads.filter(l => l.id !== leadId);
      setLeads(updated);
      
      if (supabase) {
        await supabase.from('leads').delete().eq('id', leadId);
      } else {
        setLocalData('sexloop_leads', updated);
      }
      setSelectedLead(null);
      triggerToast('El lead fue eliminado permanentemente.', 'Lead Eliminado');
    }
  };

  // --- CONTROL DE MENSAJES (WhatsApp) ---

  const addMessage = async (leadId, sender, text) => {
    const newMsg = {
      lead_id: leadId,
      sender,
      text,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      const { data } = await supabase.from('messages').insert([newMsg]).select();
      if (data) {
        setMessages(prev => [...prev, data[0]]);
      }
    } else {
      const localMsgs = getLocalData('sexloop_messages', INITIAL_MESSAGES);
      const created = { ...newMsg, id: 'msg_' + Date.now() };
      const updated = [...localMsgs, created];
      setMessages(updated);
      setLocalData('sexloop_messages', updated);
    }

    if (sender === 'client') {
      const lead = leads.find(l => l.id === leadId);
      triggerToast(`Nuevo mensaje de WhatsApp de ${lead ? lead.name : 'Cliente'}`, 'WhatsApp');
    }
  };

  // --- ENVÍO REAL DESDE EL CRM (WhatsApp Cloud API) ---
  // Si el backend está disponible, envía por la API oficial: el mensaje se
  // registra en Supabase desde el servidor y vuelve por Realtime (sin duplicar).
  // Si no hay backend (modo local), guarda localmente como antes.
  const handleSendText = async (lead, text) => {
    if (backendOnline && lead.phone) {
      const res = await whatsappApi.sendMessage(lead.phone, text, lead.id);
      if (!res.ok) {
        triggerToast(res.error || 'No se pudo enviar el mensaje por WhatsApp.', 'Error de Envío');
        if (!supabase) await addMessage(lead.id, 'agent', text); // no perder el texto
        return;
      }
      // Con Supabase, el mensaje vuelve por Realtime (no insertamos para no duplicar).
      // Sin Supabase no hay Realtime: insertamos localmente para que el agente lo vea.
      if (!supabase) await addMessage(lead.id, 'agent', text);
      return;
    }
    // Modo local / sin backend
    await addMessage(lead.id, 'agent', text);
  };

  const handleSendMedia = async (lead, file) => {
    if (!lead.phone) {
      triggerToast('El lead no tiene número de WhatsApp.', 'Error de Envío');
      return;
    }
    const url = await uploadMediaFile(file);
    if (!url) {
      triggerToast('No se pudo subir el archivo (revisa Supabase Storage).', 'Error de Adjunto');
      return;
    }
    if (backendOnline) {
      const res = await whatsappApi.sendMedia(lead.phone, url, waMediaType(file), {
        filename: file.name,
        leadId: lead.id,
      });
      if (!res.ok) triggerToast(res.error || 'No se pudo enviar el archivo.', 'Error de Envío');
    } else {
      triggerToast('Backend de WhatsApp offline. No se envió el archivo.', 'WhatsApp');
    }
  };

  // Marcar conversación como leída (sync de lectura CRM → celular)
  const handleMarkRead = async (lead) => {
    if (supabase) {
      await supabase.from('leads').update({ unread_count: 0 }).eq('id', lead.id);
      setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, unread_count: 0 } : l)));
    }
    if (backendOnline) {
      const lastClientMsg = [...messages]
        .filter(m => m.lead_id === lead.id && m.sender === 'client' && m.wa_message_id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      whatsappApi.markRead(lastClientMsg?.wa_message_id, lead.id);
    }
  };

  // --- INICIAR CHAT CON UN NÚMERO NUEVO ---
  // Si ya existe un lead con ese teléfono, lo devuelve; si no, lo crea.
  // Devuelve el lead para que la bandeja lo abra.
  const startNewChat = async ({ phone, name }) => {
    const normalized = String(phone).replace(/[^\d]/g, '');
    if (!normalized) {
      triggerToast('Ingresa un número válido (con código de país).', 'WhatsApp');
      return null;
    }

    // ¿Ya existe?
    const existing = leads.find(l => String(l.phone || '').replace(/[^\d]/g, '') === normalized);
    if (existing) return existing;

    const newLead = {
      name: name?.trim() || `+${normalized}`,
      phone: `+${normalized}`,
      origin: 'WhatsApp',
      stage: 'Nuevo',
      amount: 0,
      tags: [],
      notes: 'Chat iniciado manualmente desde el CRM.',
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase.from('leads').insert([newLead]).select();
      if (!error && data) {
        setLeads(prev => [data[0], ...prev]);
        triggerToast(`Chat iniciado con ${newLead.name}.`, 'WhatsApp');
        return data[0];
      }
      triggerToast('No se pudo crear el chat (revisa Supabase).', 'Error');
      return null;
    } else {
      const created = { ...newLead, id: 'lead_' + Date.now() };
      const updated = [created, ...getLocalData('sexloop_leads', INITIAL_LEADS)];
      setLeads(updated);
      setLocalData('sexloop_leads', updated);
      triggerToast(`Chat iniciado con ${newLead.name}.`, 'WhatsApp');
      return created;
    }
  };

  // --- SIMULAR LLEGADA DE NUEVO LEAD WEB ---
  const simulateNewLead = () => {
    const mockNames = ['Diego Valdivia', 'Renzo Castellares', 'Andrea Pajuelo', 'Milagros Soto', 'Piero Rossi'];
    const mockPhones = ['+51999888777', '+51988777666', '+51977666555', '+51966555444', '+51955444333'];
    const mockOrigins = ['Web', 'Instagram', 'WhatsApp', 'Facebook'];
    
    // Elegir producto aleatorio para la etiqueta
    const randomProduct = DEFAULT_PRODUCTS[Math.floor(Math.random() * DEFAULT_PRODUCTS.length)];
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
    const randomPhone = mockPhones[Math.floor(Math.random() * mockPhones.length)];
    const randomOrigin = mockOrigins[Math.floor(Math.random() * mockOrigins.length)];

    const leadPayload = {
      name: randomName,
      phone: randomPhone,
      origin: randomOrigin,
      stage: 'Nuevo',
      tags: [randomProduct.name],
      notes: `Ingresó desde la web sexloop.pe consultando por ${randomProduct.name}. Envío discreto solicitado.`
    };

    addLead(leadPayload).then(() => {
      setTimeout(() => {
        const latestLead = leads[0] || { id: 'lead_1' };
        addMessage(
          latestLead.id, 
          'client', 
          `Hola SexLoop, vi en su web el producto "${randomProduct.name}". ¿Tienen stock para enviar hoy a mi dirección?`
        );
      }, 2000);
    });
  };

  const saveTemplates = (newTemplates) => {
    setTemplates(newTemplates);
    setLocalData('sexloop_templates', newTemplates);
    triggerToast('Plantillas de WhatsApp actualizadas.', 'Ajustes');
  };

  // Cerrar sidebar al cambiar de pestaña en celular
  const handleViewChange = (viewName) => {
    setCurrentView(viewName);
    setSidebarOpen(false);
  };

  return (
    <div className="app-container">
      
      {/* Overlay de Cierre del Sidebar en celular */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Barra Lateral (Sidebar) */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div>
          {/* Logo sin el texto de marca redundante */}
          <div className="sidebar-logo">
            <img 
              src="https://www.sexloop.pe/images/logo-sexloop.png" 
              alt="Sexloop" 
              className="logo-img-crm" 
            />
          </div>

          <nav className="sidebar-menu">
            <div 
              className={`menu-item ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleViewChange('dashboard')}
            >
              <LayoutDashboard size={18} /> Dashboard
            </div>
            <div 
              className={`menu-item ${currentView === 'kanban' ? 'active' : ''}`}
              onClick={() => handleViewChange('kanban')}
            >
              <KanbanSquare size={18} /> Leads Pipeline
            </div>
            <div 
              className={`menu-item ${currentView === 'chat' ? 'active' : ''}`}
              onClick={() => handleViewChange('chat')}
            >
              <MessageSquareCode size={18} /> WhatsApp Inbox
            </div>
            <div 
              className={`menu-item ${currentView === 'clients' ? 'active' : ''}`}
              onClick={() => handleViewChange('clients')}
            >
              <Users size={18} /> Clientes Base
            </div>
            <div 
              className={`menu-item ${currentView === 'settings' ? 'active' : ''}`}
              onClick={() => handleViewChange('settings')}
            >
              <SettingsIcon size={18} /> Ajustes
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="wa-status-card">
            <div className="wa-dot"></div>
            <div>
              <div className="wa-text">WhatsApp Listo</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>+51 916 718 455</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="main-content">
        {/* Cabecera */}
        <header className="header">
          <div className="header-left">
            {/* Botón Hamburguesa en Celular */}
            <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={22} />
            </button>
            <div className="header-title">
              {currentView === 'dashboard' && 'Estadísticas Generales'}
              {currentView === 'kanban' && 'Embudo de Ventas / Leads'}
              {currentView === 'chat' && 'Centro de Mensajería WhatsApp'}
              {currentView === 'clients' && 'Base de Datos de Clientes'}
              {currentView === 'settings' && 'Ajustes del CRM'}
            </div>
          </div>

          <div className="header-actions">
            <button className="btn-secondary hide-mobile" onClick={simulateNewLead}>
              <Sparkles size={14} color="var(--rosa)" /> Simular Lead Web
            </button>
            <button className="btn-primary" onClick={() => setShowAddLeadModal(true)}>
              <Plus size={14} /> Crear Lead
            </button>
          </div>
        </header>

        {/* Contenido Dinámico */}
        <div className="page-container">
          {currentView === 'dashboard' && (
            <Dashboard leads={leads} products={DEFAULT_PRODUCTS} />
          )}
          {currentView === 'kanban' && (
            <KanbanBoard 
              leads={leads} 
              updateLeadStage={updateLeadStage} 
              onSelectLead={setSelectedLead}
              onAddLeadClick={() => setShowAddLeadModal(true)}
            />
          )}

          {currentView === 'chat' && (
            <WhatsAppInbox
              leads={leads}
              messages={messages}
              templates={templates}
              onSendText={handleSendText}
              onSendMedia={handleSendMedia}
              onMarkRead={handleMarkRead}
              onStartNewChat={startNewChat}
              updateLeadDetails={saveEditedLead}
              backendOnline={backendOnline}
              typingLeadId={typingLeadId}
            />
          )}

          {currentView === 'clients' && (
            <ClientDatabase 
              leads={leads} 
              onSelectLead={setSelectedLead} 
            />
          )}

          {currentView === 'settings' && (
            <CrmSettings
              templates={templates}
              saveTemplates={saveTemplates}
            />
          )}
        </div>
      </main>

      {/* --- MODALES --- */}

      {/* Ficha / Edición de Lead */}
      {selectedLead && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Ficha de Cliente: {selectedLead.name}</h3>
              <button className="modal-close" onClick={() => setSelectedLead(null)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre del Cliente</label>
              <input
                type="text"
                className="form-input"
                value={selectedLead.name}
                onChange={(e) => setSelectedLead({ ...selectedLead, name: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Teléfono / Celular</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedLead.phone || ''}
                  onChange={(e) => setSelectedLead({ ...selectedLead, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Canal Origen</label>
                <select
                  className="form-input"
                  value={selectedLead.origin}
                  onChange={(e) => setSelectedLead({ ...selectedLead, origin: e.target.value })}
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Web">Web de SexLoop</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Etapa de Lead</label>
                <select
                  className="form-input"
                  value={selectedLead.stage}
                  onChange={(e) => setSelectedLead({ ...selectedLead, stage: e.target.value })}
                >
                  <option value="Nuevo">Nuevo</option>
                  <option value="Contactado">Contactado</option>
                  <option value="Negociacion">En Negociación</option>
                  <option value="Pago Pendiente">Pago Pendiente</option>
                  <option value="Ganado">Cerrado Ganado</option>
                  <option value="Perdido">Cerrado Perdido</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Monto Calculado (S/)</label>
                <div className="form-input" style={{ background: '#fafafc', fontWeight: 800, color: 'var(--rosa)', border: '1px solid var(--border-color)' }}>
                  S/ {selectedLead.amount || '0.00'}
                </div>
              </div>
            </div>

            {/* Productos de interés (Tags) */}
            <div className="form-group">
              <label className="form-label">Productos Solicitados (Etiquetas)</label>
              <div className="tags-select-container">
                {selectedLead.tags.map(tag => (
                  <span key={tag} className="tag-select-item">
                    {tag}
                    <button 
                      type="button" 
                      className="tag-select-remove"
                      onClick={() => {
                        const updatedTags = selectedLead.tags.filter(t => t !== tag);
                        setSelectedLead({ ...selectedLead, tags: updatedTags });
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: 'var(--rosa)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}
                  onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                >
                  {tagDropdownOpen ? 'Cerrar' : '+ Añadir'}
                </button>
              </div>

              {tagDropdownOpen && (
                <div className="tag-option-list">
                  {DEFAULT_PRODUCTS
                    .filter(p => !selectedLead.tags.includes(p.name))
                    .map(p => (
                      <div 
                        key={p.name} 
                        className="tag-option"
                        onClick={() => {
                          setSelectedLead({ ...selectedLead, tags: [...selectedLead.tags, p.name] });
                          setTagDropdownOpen(false);
                        }}
                      >
                        {p.name} (S/ {p.price})
                      </div>
                    ))
                  }
                  {DEFAULT_PRODUCTS.filter(p => !selectedLead.tags.includes(p.name)).length === 0 && (
                    <div style={{ padding: '8px', fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'center' }}>
                      Todos los productos seleccionados
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Notas de Seguimiento</label>
              <textarea
                className="form-input"
                rows="3"
                value={selectedLead.notes || ''}
                onChange={(e) => setSelectedLead({ ...selectedLead, notes: e.target.value })}
              ></textarea>
            </div>

            <div className="form-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn-secondary" style={{ borderColor: '#fecaca', color: 'var(--danger)' }} onClick={() => deleteLead(selectedLead.id)}>
                <Trash2 size={12} /> Eliminar Lead
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setSelectedLead(null)}>
                  Cerrar
                </button>
                <button type="button" className="btn-primary" onClick={() => saveEditedLead(selectedLead)}>
                  <Save size={12} /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agregar Lead Nuevo */}
      {showAddLeadModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Registrar Nuevo Lead</h3>
              <button className="modal-close" onClick={() => setShowAddLeadModal(false)}>✕</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              addLead(newLeadData);
              setShowAddLeadModal(false);
              setNewLeadData({
                name: '',
                phone: '',
                origin: 'WhatsApp',
                stage: 'Nuevo',
                tags: [],
                notes: ''
              });
            }}>
              <div className="form-group">
                <label className="form-label">Nombre del Lead / Cliente</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Nombre y Apellidos"
                  value={newLeadData.name}
                  onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Teléfono Celular</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ej. +51987654321"
                    value={newLeadData.phone}
                    onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Canal Origen</label>
                  <select
                    className="form-input"
                    value={newLeadData.origin}
                    onChange={(e) => setNewLeadData({ ...newLeadData, origin: e.target.value })}
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Web">Web de SexLoop</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Productos Solicitados</label>
                <div className="tags-select-container">
                  {newLeadData.tags.map(tag => (
                    <span key={tag} className="tag-select-item">
                      {tag}
                      <button 
                        type="button" 
                        className="tag-select-remove"
                        onClick={() => {
                          const updatedTags = newLeadData.tags.filter(t => t !== tag);
                          setNewLeadData({ ...newLeadData, tags: updatedTags });
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button 
                    type="button" 
                    style={{ background: 'none', border: 'none', color: 'var(--rosa)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}
                    onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                  >
                    {tagDropdownOpen ? 'Cerrar' : '+ Añadir'}
                  </button>
                </div>

                {tagDropdownOpen && (
                  <div className="tag-option-list">
                    {DEFAULT_PRODUCTS
                      .filter(p => !newLeadData.tags.includes(p.name))
                      .map(p => (
                        <div 
                          key={p.name} 
                          className="tag-option"
                          onClick={() => {
                            setNewLeadData({ ...newLeadData, tags: [...newLeadData.tags, p.name] });
                            setTagDropdownOpen(false);
                          }}
                        >
                          {p.name} (S/ {p.price})
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Notas Iniciales</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Detalles de contacto, dirección de envío, etc."
                  value={newLeadData.notes}
                  onChange={(e) => setNewLeadData({ ...newLeadData, notes: e.target.value })}
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddLeadModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Registrar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NOTIFICACIONES TOAST --- */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <div className="wa-dot" style={{ background: t.title === 'WhatsApp' ? '#25D366' : 'var(--rosa)', boxShadow: t.title === 'WhatsApp' ? '0 0 8px #25D366' : '0 0 8px var(--rosa)' }}></div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>{t.title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{t.message}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
