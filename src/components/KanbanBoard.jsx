import React, { useState } from 'react';
import { Phone, MessageSquare } from 'lucide-react';

const STAGES = [
  { id: 'Nuevo', name: 'Nuevos', color: '#3b82f6' },
  { id: 'Contactado', name: 'Contactados', color: '#a855f7' },
  { id: 'Negociacion', name: 'En Negociación', color: '#f59e0b' },
  { id: 'Pago Pendiente', name: 'Pago Pendiente', color: '#f97316' },
  { id: 'Ganado', name: 'Cerrado Ganado', color: '#22c55e' },
  { id: 'Perdido', name: 'Cerrado Perdido', color: '#ef4444' }
];

export default function KanbanBoard({ leads, updateLeadStage, onSelectLead }) {
  const [dragOverStageId, setDragOverStageId] = useState(null);

  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Solo quitar el highlight si salimos de la columna
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Verificar si el cursor realmente salió de los límites de la columna
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverStageId(null);
    }
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    setDragOverStageId(null);
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      updateLeadStage(leadId, targetStage);
    }
  };

  // Agrupar leads por etapa
  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = leads.filter(lead => lead.stage === stage.id);
    return acc;
  }, {});

  return (
    <div className="kanban-container">
      {STAGES.map(stage => {
        const stageLeads = leadsByStage[stage.id] || [];
        const totalAmount = stageLeads.reduce((sum, lead) => sum + Number(lead.amount || 0), 0);
        const isDragOver = dragOverStageId === stage.id;

        return (
          <div 
            key={stage.id} 
            className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Header de columna */}
            <div className="column-header">
              <div className="column-title-wrap">
                <span className="column-dot" style={{ backgroundColor: stage.color }}></span>
                <span className="column-title">{stage.name}</span>
                <span className="column-count">{stageLeads.length}</span>
              </div>
              <div className="column-total">S/ {totalAmount.toFixed(0)}</div>
            </div>

            {/* Contenedor de tarjetas */}
            <div className="cards-container">
              {stageLeads.length > 0 ? (
                stageLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="lead-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => onSelectLead(lead)}
                  >
                    <div className="lead-card-header">
                      <span className="lead-card-name">{lead.name}</span>
                      <span className={`lead-card-origin origin-${lead.origin.toLowerCase()}`}>
                        {lead.origin}
                      </span>
                    </div>

                    <div className="lead-card-amount">S/ {Number(lead.amount || 0).toFixed(2)}</div>

                    <div className="lead-card-tags">
                      {(lead.tags || []).map(tag => (
                        <span key={tag} className="lead-tag" title={tag}>{tag}</span>
                      ))}
                    </div>

                    <div className="lead-card-footer">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Phone size={9} /> {lead.phone || 'Sin número'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  padding: '24px 0',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '8px',
                  background: '#f8f9fa'
                }}>
                  Arrastra aquí
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
