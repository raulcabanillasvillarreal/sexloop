import React, { useState } from 'react';
import { Search, Eye, Filter } from 'lucide-react';

export default function ClientDatabase({ leads, onSelectLead }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');

  // Filtrar leads según búsquedas y filtros
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (lead.phone && lead.phone.includes(searchTerm));
    
    const matchesOrigin = selectedOrigin === 'All' || lead.origin === selectedOrigin;
    const matchesStage = selectedStage === 'All' || lead.stage === selectedStage;

    return matchesSearch && matchesOrigin && matchesStage;
  });

  return (
    <div>
      {/* Filtros */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        flexWrap: 'wrap', 
        marginBottom: '24px',
        background: 'rgba(29, 26, 51, 0.2)',
        padding: '16px',
        borderRadius: '12px',
        border: 'var(--border-glass)',
        alignItems: 'center'
      }}>
        {/* Barra de Búsqueda */}
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Buscar por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} className="text-muted" style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--muted)' }} />
        </div>

        {/* Filtrar por Origen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)' }}>CANAL:</span>
          <select 
            className="form-input" 
            style={{ width: 'auto', padding: '6px 12px' }}
            value={selectedOrigin}
            onChange={(e) => setSelectedOrigin(e.target.value)}
          >
            <option value="All">Todos</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Web">Web de SexLoop</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
          </select>
        </div>

        {/* Filtrar por Etapa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)' }}>ESTADO:</span>
          <select 
            className="form-input" 
            style={{ width: 'auto', padding: '6px 12px' }}
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            <option value="All">Todos</option>
            <option value="Nuevo">Nuevos</option>
            <option value="Contactado">Contactado</option>
            <option value="Negociacion">En Negociación</option>
            <option value="Pago Pendiente">Pago Pendiente</option>
            <option value="Ganado">Cerrado Ganado</option>
            <option value="Perdido">Cerrado Perdido</option>
          </select>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="table-container">
        {filteredLeads.length > 0 ? (
          <table className="crm-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Canal Origen</th>
                <th>Estado Lead</th>
                <th>Productos de Interés</th>
                <th>Monto del Trato</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 700 }}>{lead.name}</td>
                  <td>{lead.phone || 'No registrado'}</td>
                  <td>
                    <span className={`lead-card-origin origin-${lead.origin.toLowerCase()}`}>
                      {lead.origin}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      background: 'rgba(255,255,255,0.05)', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      {lead.stage}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '280px' }}>
                      {(lead.tags || []).map(tag => (
                        <span key={tag} className="lead-tag">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--rosa)' }}>
                    S/ {Number(lead.amount || 0).toFixed(2)}
                  </td>
                  <td>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                      onClick={() => onSelectLead(lead)}
                    >
                      <Eye size={12} /> Ver Ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
            No se encontraron clientes con los filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
}
