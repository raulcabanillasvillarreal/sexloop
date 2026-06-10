import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { whatsappApi } from '../services/whatsappApi';

// Tarjeta "Estado de WhatsApp": consulta /api/wa-status (el backend pregunta a
// Meta con el token del servidor) y muestra el estado del número, la calidad
// y los bloqueos que impiden enviar (pago, verificación de empresa, etc.).

const QUALITY = { GREEN: ['Alta', '#16a34a'], YELLOW: ['Media', '#d97706'], RED: ['Baja', '#dc2626'] };

// Traduce los errores de salud de Meta a acciones claras.
function friendlyHealthError(err = {}) {
  switch (err.error_code) {
    case 141006:
      return 'Método de pago inválido o ausente: agrega uno en Meta → Configuración del negocio → Pagos.';
    case 141010:
      return 'La Verificación de Empresa de Meta aún no está aprobada (en revisión).';
    default:
      return err.error_description || 'Restricción reportada por Meta.';
  }
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '6px 0', borderBottom: '1px dashed var(--border-color)' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{children}</span>
    </div>
  );
}

export default function WhatsAppStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    whatsappApi.waStatus().then((res) => { setData(res); setLoading(false); });
  };

  useEffect(load, []);

  const number = data?.number?.ok ? data.number : null;
  const waba = data?.waba?.ok ? data.waba : null;
  const connected = number?.status === 'CONNECTED';
  const [qualityLabel, qualityColor] = QUALITY[number?.quality_rating] || ['—', 'var(--text-secondary)'];

  // Entidades con problemas (WABA bloqueada, negocio limitado, etc.)
  const issues = (waba?.health_status?.entities || [])
    .filter((e) => e.can_send_message !== 'AVAILABLE')
    .flatMap((e) => (e.errors || []).map((err) => ({ ...err, entity: e.entity_type })));

  return (
    <div className="chart-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
        <Activity size={20} color="var(--violeta)" />
        <h3 className="chart-header" style={{ margin: 0, flex: 1 }}>Estado de WhatsApp</h3>
        <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={load} disabled={loading} title="Actualizar">
          <RefreshCw size={13} className={loading ? 'spin' : undefined} />
        </button>
      </div>

      {loading && !data && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Consultando a Meta…</p>
      )}

      {data && !number && (
        <div style={{ display: 'flex', gap: 8, background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: 8, fontSize: '0.75rem' }}>
          <AlertCircle size={16} /> <span>No se pudo consultar el estado: {data.number?.error || data.error || 'sin conexión'}</span>
        </div>
      )}

      {number && (
        <>
          <Row label="Número">{number.display_phone_number} · {number.verified_name}</Row>
          <Row label="Conexión">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: connected ? '#16a34a' : '#dc2626' }}>
              {connected ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {connected ? 'Conectado' : (number.status || 'Desconocido')}
            </span>
          </Row>
          <Row label="Calidad de envío"><span style={{ color: qualityColor }}>{qualityLabel}</span></Row>
          {waba && (
            <Row label="Cuenta (WABA)">{waba.name} · {waba.account_review_status === 'APPROVED' ? 'Aprobada' : waba.account_review_status}</Row>
          )}

          {issues.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {issues.map((issue, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, background: '#fef3c7', color: '#92400e', padding: '10px 12px', borderRadius: 8, fontSize: '0.73rem', lineHeight: 1.5 }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{friendlyHealthError(issue)}</span>
                </div>
              ))}
            </div>
          )}

          {issues.length === 0 && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#16a34a', marginTop: 12 }}>
              <CheckCircle2 size={14} /> Sin restricciones: puedes enviar y recibir mensajes.
            </p>
          )}
        </>
      )}
    </div>
  );
}
