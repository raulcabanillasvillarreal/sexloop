import React from 'react';
import { DollarSign, Users, Award, ShoppingBag, BarChart2, TrendingUp } from 'lucide-react';

export default function Dashboard({ leads, products }) {
  // Calculando estadísticas reales de los leads
  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => l.stage !== 'Ganado' && l.stage !== 'Perdido').length;
  const wonLeads = leads.filter(l => l.stage === 'Ganado');
  const lostLeads = leads.filter(l => l.stage === 'Perdido');
  const conversionRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : 0;
  
  const totalRevenue = wonLeads.reduce((acc, lead) => acc + Number(lead.amount || 0), 0);

  // Agrupar leads por origen
  const originCounts = leads.reduce((acc, lead) => {
    acc[lead.origin] = (acc[lead.origin] || 0) + 1;
    return acc;
  }, {});

  // Contar productos de interés (tags)
  const productTagsCount = leads.reduce((acc, lead) => {
    (lead.tags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  const popularProducts = Object.entries(productTagsCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return (
    <div>
      {/* Grid de Métricas */}
      <div className="dashboard-grid">
        <div className="metric-card">
          <div className="metric-title">Ingresos Totales</div>
          <div className="metric-value">S/ {totalRevenue.toFixed(2)}</div>
          <div className="metric-subtext">
            <TrendingUp size={14} /> +12.4% vs la semana pasada
          </div>
          <div className="metric-icon-wrap">
            <DollarSign size={48} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Leads Activos</div>
          <div className="metric-value">{activeLeads}</div>
          <div className="metric-subtext" style={{ color: 'var(--muted)' }}>
            Total acumulado: {totalLeads}
          </div>
          <div className="metric-icon-wrap">
            <Users size={48} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Tasa de Conversión</div>
          <div className="metric-value">{conversionRate}%</div>
          <div className="metric-subtext">
            Leads ganados: {wonLeads.length}
          </div>
          <div className="metric-icon-wrap">
            <Award size={48} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Catálogo Sexloop</div>
          <div className="metric-value">{products.length}</div>
          <div className="metric-subtext" style={{ color: 'var(--muted)' }}>
            Productos disponibles
          </div>
          <div className="metric-icon-wrap">
            <ShoppingBag size={48} />
          </div>
        </div>
      </div>

      {/* Gráficos y Detalles */}
      <div className="details-section">
        {/* Panel del gráfico SVG */}
        <div className="chart-card">
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Rendimiento por Canal de Ingreso</span>
            <BarChart2 size={18} className="text-muted" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
            {['WhatsApp', 'Web', 'Instagram', 'Facebook'].map(origin => {
              const count = originCounts[origin] || 0;
              const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
              let barColor = 'var(--violeta)';
              if (origin === 'WhatsApp') barColor = '#25D366';
              if (origin === 'Instagram') barColor = '#F06292';
              if (origin === 'Facebook') barColor = '#3b5998';

              return (
                <div key={origin}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    <span>{origin}</span>
                    <span>{count} leads ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percentage}%`, background: barColor, borderRadius: '999px', transition: 'width 1s ease-out' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Productos más populares */}
        <div className="chart-card">
          <div className="chart-header">Productos Populares</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {popularProducts.length > 0 ? (
              popularProducts.map((p, idx) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(138, 43, 226, 0.15)',
                    border: '1px solid var(--violeta)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'var(--rosa)'
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                      Solicitado {p.count} {p.count === 1 ? 'vez' : 'veces'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
                No hay productos etiquetados en los leads activos
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
