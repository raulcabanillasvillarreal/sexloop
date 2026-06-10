import React, { useEffect, useState, useRef } from 'react';
import { Smartphone, CheckCircle2, AlertCircle, Loader2, QrCode, Copy } from 'lucide-react';
import { whatsappApi } from '../services/whatsappApi';

// Embedded Signup con COEXISTENCE: conecta tu número real (que ya usas en la
// app WhatsApp Business) manteniéndolo en el celular Y en el CRM a la vez.
// Requiere VITE_META_APP_ID y VITE_META_CONFIG_ID (config de "Inicio de sesión
// con Facebook para empresas").
const APP_ID = import.meta.env.VITE_META_APP_ID || '';
const CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID || '';
const GRAPH_VERSION = 'v19.0';

export default function WhatsAppConnect() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | connecting | done | error
  const [result, setResult] = useState(null);    // { phone_number_id, waba_id, token }
  const [error, setError] = useState('');
  const sessionInfo = useRef({});

  const configured = APP_ID && CONFIG_ID;

  // 1) Cargar el SDK de Facebook
  useEffect(() => {
    if (!configured) return;
    window.fbAsyncInit = function () {
      window.FB.init({ appId: APP_ID, autoLogAppEvents: true, xfbml: false, version: GRAPH_VERSION });
      setReady(true);
    };
    if (window.FB) { setReady(true); return; }
    if (!document.getElementById('facebook-jssdk')) {
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      js.async = true; js.defer = true; js.crossOrigin = 'anonymous';
      document.body.appendChild(js);
    }
  }, [configured]);

  // 2) Escuchar los datos que devuelve el Embedded Signup (phone_number_id, waba_id)
  useEffect(() => {
    const handler = (event) => {
      if (typeof event.origin !== 'string' || !event.origin.endsWith('facebook.com')) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          // data.event: 'FINISH' (ok), 'CANCEL', 'ERROR'
          if (data.data) sessionInfo.current = { ...sessionInfo.current, ...data.data };
          if (data.event === 'CANCEL') { setStatus('error'); setError('Conexión cancelada por el usuario.'); }
        }
      } catch { /* el mensaje no era JSON de WhatsApp */ }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // 3) Lanzar el flujo de Coexistence (abre el popup con el QR)
  const launch = () => {
    if (!window.FB) { setError('El SDK de Facebook aún no cargó. Espera unos segundos.'); return; }
    setError(''); setResult(null); setStatus('connecting');
    sessionInfo.current = {};

    window.FB.login(async (response) => {
      const code = response?.authResponse?.code;
      if (!code) {
        setStatus('error');
        setError('No se completó la conexión (cancelada o sin permisos).');
        return;
      }
      // 4) Intercambiar el "code" por un token (en el backend, con el app secret)
      const exchange = await whatsappApi.embeddedSignup(code);
      if (!exchange.ok) {
        setStatus('error');
        setError(exchange.error || 'No se pudo obtener el token de acceso.');
        return;
      }
      setResult({
        phone_number_id: sessionInfo.current.phone_number_id || '(revisa en Meta)',
        waba_id: sessionInfo.current.waba_id || '(revisa en Meta)',
        token: exchange.access_token || '',
      });
      setStatus('done');
    }, {
      config_id: CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        // Coexistence: conectar un número que ya usas en WhatsApp Business app
        featureType: 'whatsapp_business_app_onboarding',
        sessionInfoVersion: '3',
      },
    });
  };

  const copy = (txt) => navigator.clipboard?.writeText(txt);

  return (
    <div className="chart-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
        <Smartphone size={20} color="var(--violeta)" />
        <h3 className="chart-header" style={{ margin: 0 }}>Conectar WhatsApp (Coexistence)</h3>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
        Conecta tu número real escaneando un <strong>código QR</strong> desde tu app de
        WhatsApp Business. Tu número seguirá funcionando en el <strong>celular</strong> y
        también en el <strong>CRM</strong> a la vez (modo Coexistence).
      </p>

      {!configured && (
        <div style={{ display: 'flex', gap: 8, background: '#fef3c7', color: '#92400e', padding: '10px 12px', borderRadius: 8, fontSize: '0.75rem', marginBottom: 12 }}>
          <AlertCircle size={16} />
          <span>Falta configurar <code>VITE_META_APP_ID</code> y <code>VITE_META_CONFIG_ID</code> en Vercel. Sigue los pasos del README.</span>
        </div>
      )}

      {status !== 'done' && (
        <button
          className="btn-primary"
          onClick={launch}
          disabled={!configured || !ready || status === 'connecting'}
          style={{ alignSelf: 'flex-start' }}
        >
          {status === 'connecting'
            ? <><Loader2 size={14} className="spin" /> Abriendo…</>
            : <><QrCode size={14} /> Conectar con QR</>}
        </button>
      )}

      {!ready && configured && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 8 }}>Cargando conexión segura con Meta…</p>
      )}

      {error && (
        <div style={{ display: 'flex', gap: 8, background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: 8, fontSize: '0.75rem', marginTop: 12 }}>
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}

      {status === 'done' && result && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a', fontWeight: 700, fontSize: '0.85rem', marginBottom: 10 }}>
            <CheckCircle2 size={18} /> ¡Número conectado en modo Coexistence!
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
            Copia estos valores y actualízalos en <strong>Vercel → Environments</strong>, luego <strong>Redeploy</strong>:
          </p>
          {[
            ['WHATSAPP_PHONE_NUMBER_ID', result.phone_number_id],
            ['WHATSAPP_BUSINESS_ACCOUNT_ID', result.waba_id],
            ['WHATSAPP_TOKEN', result.token],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <code style={{ fontSize: '0.7rem', minWidth: 230 }}>{k}</code>
              <input className="form-input" readOnly value={v} style={{ fontSize: '0.7rem', padding: '4px 8px' }} />
              <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => copy(v)} title="Copiar"><Copy size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
