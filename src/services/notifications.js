// ============================================================
//  src/services/notifications.js
//  Notificaciones del CRM al recibir mensajes nuevos:
//   - Notificación nativa del navegador
//   - Sonido de alerta (configurable / silenciable)
//   - Badge con nº de no leídos en el título de la pestaña
// ============================================================

const BASE_TITLE = 'SexLoop CRM | Panel Administrativo Premium';

/** Pide permiso de notificaciones del navegador (llamar tras un click). */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

/** Activa/desactiva el sonido (persistido en localStorage). */
export function setSoundEnabled(enabled) {
  try { localStorage.setItem('sexloop_sound', enabled ? '1' : '0'); } catch { /* noop */ }
}

export function isSoundEnabled() {
  try { return localStorage.getItem('sexloop_sound') !== '0'; } catch { return true; }
}

/** Reproduce un beep corto generado con WebAudio (sin archivos externos). */
export function playAlertSound() {
  if (!isSoundEnabled()) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
    osc.onended = () => ctx.close();
  } catch { /* el navegador puede bloquear audio sin interacción previa */ }
}

/** Muestra una notificación nativa del navegador. */
export function showBrowserNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return; // si ya está mirando, no molestar
  try {
    const n = new Notification(title, {
      body,
      icon: 'https://www.sexloop.pe/images/logo-sexloop.png',
      tag: 'sexloop-wa',
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* noop */ }
}

/** Actualiza el badge (nº de no leídos) en el título de la pestaña. */
export function updateTabBadge(unreadCount) {
  document.title = unreadCount > 0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE;
}

/** Notificación completa: navegador + sonido + badge. */
export function notifyNewMessage({ name, text, totalUnread }) {
  showBrowserNotification(`Nuevo mensaje de ${name || 'Cliente'}`, text || 'Mensaje de WhatsApp');
  playAlertSound();
  updateTabBadge(totalUnread);
}

export default {
  requestNotificationPermission,
  setSoundEnabled,
  isSoundEnabled,
  playAlertSound,
  showBrowserNotification,
  updateTabBadge,
  notifyNewMessage,
};
