# 📲 Integración WhatsApp Business API (Coexistence) · Sexloop CRM

Esta integración conecta el CRM con la **API oficial de WhatsApp Business Cloud (Meta)**
usando el modo **Coexistence**: el **mismo número** funciona a la vez en el **celular**
(app WhatsApp Business) y en el **CRM**. Los mensajes se sincronizan en ambos sentidos.

---

## 🧱 Arquitectura

```
WhatsApp (Meta Cloud API v19.0)
        │  webhook (mensajes, ecos del celular, estados, historial)
        ▼
whatsapp/server.js  (Express)  ───►  Supabase (leads, messages, wa_labels)
        ▲                                     │ Realtime
        │  /api/send · /api/import            ▼
   Frontend React (Vite) ◄──────────  aparece al instante en la bandeja
```

- **Frontend** (`src/`): React + Vite. Lee de Supabase y recibe novedades por **Realtime**.
- **Backend** (`whatsapp/`): recibe el webhook de Meta y envía mensajes. Usa la **service role key** de Supabase.
- **Base de datos**: la **misma** de Supabase que ya usa el CRM (tablas extendidas con `whatsapp/supabase-schema.sql`).

> Una SPA estática no puede recibir webhooks ni guardar tokens secretos: por eso el
> webhook y el envío viven en el backend (`whatsapp/server.js`) o en la función
> serverless `api/webhook.js` (Vercel).

---

## ✅ Requisitos previos

1. Cuenta de **Meta Business** y un **número de WhatsApp** dado de alta en WhatsApp Business (app del celular).
2. Proyecto de **Supabase** (el mismo del CRM).
3. **Node 18+** (probado en Node 26).

---

## 1️⃣ Crear cuenta en Meta Business Manager

1. Entra a [business.facebook.com](https://business.facebook.com) e inicia sesión.
2. Crea (o usa) tu **Cuenta Comercial / Business Manager**.
3. Verifica tu negocio (recomendado para tokens permanentes y límites altos).

## 2️⃣ Crear aplicación en Meta Developers

1. Ve a [developers.facebook.com](https://developers.facebook.com) → **Mis Apps** → **Crear app**.
2. Tipo de app: **Business**.
3. Anota el **META_APP_ID** y el **META_APP_SECRET** (App → Configuración → Básica).

## 3️⃣ Activar WhatsApp Business API

1. En tu app, agrega el producto **WhatsApp**.
2. Asocia tu **Cuenta de WhatsApp Business (WABA)** → anota el **WHATSAPP_BUSINESS_ACCOUNT_ID**.
3. En **WhatsApp → Configuración de la API** verás el **Phone Number ID** → **WHATSAPP_PHONE_NUMBER_ID**.

## 4️⃣ Activar WhatsApp **Coexistence** (mantener el celular)

> Coexistence permite seguir usando el número en la **app WhatsApp Business del celular**
> mientras también lo controlas desde el CRM. Meta sincroniza el historial y los
> "ecos" de los mensajes que envías desde el teléfono.

1. En **WhatsApp → Configuración de la API → Coexistencia** (o desde el **Embedded Signup**),
   elige conectar un número que **ya está en la app WhatsApp Business**.
2. Escanea el **código QR** desde la app del celular: *WhatsApp Business → Ajustes →
   Dispositivos vinculados / Coexistencia con API*.
3. Acepta los permisos de **sincronización de historial** (hasta 6 meses) y de **mensajes**.
4. Al terminar, Meta empezará a enviar al webhook:
   - Mensajes entrantes de clientes.
   - **Ecos** de los mensajes que envíes desde el celular (campo `smb_message_echoes`).
   - El **historial** inicial (campo `history`).

En `.env` deja `WHATSAPP_COEXISTENCE=true`.

## 5️⃣ Obtener el token de acceso y el Phone Number ID

- **Token temporal (24h)**: en *WhatsApp → Configuración de la API* (para probar).
- **Token permanente** (recomendado): crea un **Usuario del sistema** en Business Manager
  con permisos `whatsapp_business_messaging` y `whatsapp_business_management`, y genera un
  token sin caducidad → **WHATSAPP_TOKEN**.
- **Phone Number ID**: en la misma pantalla → **WHATSAPP_PHONE_NUMBER_ID**.

## 6️⃣ Configurar el webhook

1. Elige un **Verify Token** propio (cualquier cadena secreta) → `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
2. Expón tu backend con HTTPS:
   - **Local (pruebas)**: `npm run whatsapp` y en otra terminal `npx ngrok http 3001`.
     Usa la URL `https://xxxx.ngrok.io/webhook`.
   - **Vercel**: despliega el proyecto; la función serverless queda en
     `https://TU-DOMINIO/api/webhook`.
   - **Host Node (Render/Railway/VPS)**: despliega `whatsapp/server.js`; webhook en `/webhook`.
3. En *WhatsApp → Configuración → Webhooks*:
   - **Callback URL**: tu URL pública (`.../webhook`).
   - **Verify Token**: el mismo de `.env`.
   - **Suscríbete** a los campos: `messages`, `message_echoes` / `smb_message_echoes`,
     `history`, `smb_app_state_sync`.

## 7️⃣ Variables de entorno necesarias

Copia `.env.example` a `.env` y complétalo:

```env
# Frontend
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_WHATSAPP_API_URL=http://localhost:3001   # o tu dominio del backend

# Backend WhatsApp
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
META_APP_ID=...
META_APP_SECRET=...
WHATSAPP_COEXISTENCE=true
WHATSAPP_HISTORY_DAYS=30
GRAPH_API_VERSION=v19.0
WHATSAPP_PORT=3001

# Supabase backend (service role: NUNCA en el frontend)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

> ⚠️ El `SUPABASE_SERVICE_ROLE_KEY` y `WHATSAPP_TOKEN` son secretos. `.env` ya está en `.gitignore`.

## 8️⃣ Preparar la base de datos

En Supabase → **SQL Editor**, ejecuta el archivo:

```
whatsapp/supabase-schema.sql
```

Esto extiende `leads` y `messages`, crea `wa_labels` y `wa_sync_state`, activa **Realtime**
y crea el bucket lo gestiona el backend (`whatsapp-media`) para los adjuntos.

## ▶️ Arrancar

```bash
npm install          # dependencias (incluye express, dotenv, cors)
npm run whatsapp     # backend del webhook + API  (puerto 3001)
npm run dev          # frontend del CRM           (puerto 5173)
```

---

## 🔄 Cómo funciona la importación inicial (30 días)

1. Ve a **Ajustes → Importar Chats de WhatsApp** y pulsa **“Importar últimos 30 días”**.
2. El backend (`whatsapp/importer.js`):
   - Importa las **etiquetas** de WhatsApp Business al catálogo `wa_labels`.
   - Solicita/confirma la **sincronización de historial** de Coexistence.
3. Meta envía el **historial** al webhook (campo `history`). Por cada chat:
   - Se **crea la ficha del cliente** automáticamente (si no existe), con fecha de primer contacto.
   - Se importan los **mensajes** de los últimos 30 días.
   - Se **mapean las etiquetas** de WhatsApp al lead.
4. La **barra de progreso** se actualiza consultando `/api/import/status`.
5. **Sin duplicados**: cada mensaje tiene índice único por `wa_message_id` y cada lead por `phone`,
   así que reconectar o reimportar no duplica nada (`wa_sync_state.history_done`).

---

## 🔁 Sincronización en tiempo real (Coexistence)

| Acción | Resultado |
|---|---|
| Cliente escribe | Webhook → Supabase → Realtime → aparece en el CRM + notificación |
| Agente responde **desde el CRM** | `/api/send` → Meta → llega al cliente y al **celular** |
| Agente responde **desde el celular** | Meta envía un **eco** → Supabase → aparece en el CRM (marcado 📱) |
| Lectura | Abrir el chat en el CRM marca leído (`/api/read`) y se sincroniza con el celular |

El historial es **único y unificado** entre celular y CRM. En cada burbuja del agente se
muestra el origen (📱 celular / 🖥️ CRM) y el estado: enviado ✓, entregado ✓✓, leído ✓✓ (azul).

---

## 🗂️ Archivos de la integración

| Archivo | Rol |
|---|---|
| `whatsapp/config.js` | Configuración Cloud API v19.0 + Coexistence |
| `whatsapp/db.js` | Acceso a Supabase (service role), fichas y dedupe |
| `whatsapp/sender.js` | Enviar texto/plantilla/media + reintentos + log |
| `whatsapp/webhook.js` | Verificación + recepción (mensajes, ecos, historial, estados) |
| `whatsapp/media.js` | Descarga de adjuntos y subida a Supabase Storage |
| `whatsapp/importer.js` | Importación de 30 días + etiquetas + progreso |
| `whatsapp/server.js` | Servidor Express que une todo |
| `whatsapp/supabase-schema.sql` | Esquema/migración de la BD |
| `api/webhook.js` | Webhook como función serverless (Vercel) |
| `src/services/whatsappApi.js` | Cliente frontend del backend |
| `src/services/notifications.js` | Notificaciones, sonido y badge |
| `src/components/WhatsAppInbox.jsx` | Bandeja real (estados, origen, media, typing) |

---

## 🛠️ Solución de problemas

- **El CRM dice “API offline”**: arranca `npm run whatsapp` y revisa `VITE_WHATSAPP_API_URL`.
- **Meta no verifica el webhook**: el `Verify Token` de Meta debe ser idéntico a `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- **No llegan ecos del celular**: confirma que suscribiste `smb_message_echoes` y que Coexistence está activo.
- **No aparece el historial**: Coexistence lo envía tras el onboarding; puede tardar minutos. Revisa logs del webhook.
- **Firma inválida**: define `META_APP_SECRET` correctamente o déjalo vacío para desactivar la validación (solo en pruebas).
