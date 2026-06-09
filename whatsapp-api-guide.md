# Guía de Integración: WhatsApp Business Cloud API Oficial

Esta guía te muestra paso a paso cómo conectar este CRM (Sexloop CRM) con la **API oficial de WhatsApp Business Cloud (de Meta)**, permitiéndote recibir y enviar mensajes reales, usar plantillas oficiales y conectarlo con tu base de datos en Supabase.

---

## 1. Configuración Inicial en Meta Developers

Para utilizar la API oficial de WhatsApp, necesitas una cuenta de desarrollador de Meta y registrar tu número.

1. Ve a [Meta for Developers](https://developers.facebook.com) e inicia sesión.
2. Haz clic en **Mis Aplicaciones** y crea una nueva aplicación de tipo **Business** (Negocios).
3. Añade el producto de **WhatsApp** a tu aplicación.
4. En el panel izquierdo, ve a **WhatsApp > Configuración de la API**:
   - Obtendrás un **Identificador de número de teléfono (Phone Number ID)**.
   - Obtendrás un **Identificador de cuenta de WhatsApp Business (WhatsApp Business Account ID)**.
   - Copia el **Token de acceso temporal** (para pruebas de 24 horas) o genera un **Token de acceso permanente** desde el Administrador Comercial.

---

## 2. Creación y Registro de Plantillas (Templates) en Meta

La API oficial exige que para iniciar conversaciones después de 24 horas de inactividad, utilices **Plantillas Aprobadas por Meta**.

1. Ve a tu **Administrador de WhatsApp** en el Business Manager de Meta.
2. Selecciona **Plantillas de mensaje** y haz clic en **Crear plantilla**.
3. Define tu plantilla utilizando variables dinámicas `{{1}}`, `{{2}}` para personalización (nombre del cliente, precio, etc.).
   *Ejemplo de Plantilla (Bienvenida):*
   > "Hola {{1}}! Bienvenido a Sexloop. Vimos que estás interesado en {{2}}. Recuerda que realizamos envíos discretos a todo el Perú."

---

## 3. Servidor Intermedio: Recibir Mensajes Reales (Webhook)

Debes montar un Webhook (por ejemplo, en un servidor Node.js/Express o en un **Supabase Edge Function**) para recibir notificaciones cuando un cliente envíe un mensaje a tu número de WhatsApp.

Aquí tienes el código de ejemplo de una función en Node.js (Express) que recibe el mensaje de WhatsApp e inserta los datos automáticamente en tus tablas de **Supabase**:

```javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Clave de servicio para omitir políticas RLS al escribir
);

// 1. Verificación del Webhook por parte de Meta (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = 'mi_token_de_verificacion_seguro_123'; // Define el mismo en Meta

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 2. Recepción de mensajes enviados por clientes (POST)
app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (message) {
      const phone = message.from; // Teléfono del cliente
      const clientName = contact?.profile?.name || 'Cliente Nuevo';
      const text = message.text?.body || '[Contenido no soportado/Multimedia]';
      const messageId = message.id;

      // Buscar si el cliente (lead) ya existe en Supabase por su teléfono
      let { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', phone)
        .single();

      // Si no existe, creamos un nuevo lead (Nuevo Lead)
      if (!lead) {
        const { data: newLead } = await supabase
          .from('leads')
          .insert([{ 
            name: clientName, 
            phone: phone, 
            origin: 'WhatsApp', 
            stage: 'Nuevo',
            amount: 0,
            notes: 'Lead creado automáticamente por mensaje entrante de WhatsApp.' 
          }])
          .select()
          .single();
        
        lead = newLead;
      }

      // Insertar el mensaje entrante en la tabla 'messages' asociado al lead_id
      await supabase.from('messages').insert([{
        lead_id: lead.id,
        sender: 'client',
        text: text
      }]);

      console.log(`Mensaje registrado de ${clientName} (${phone}): ${text}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log('Webhook escuchando en puerto 3000'));
```

---

## 4. Enviar Mensajes desde el CRM hacia WhatsApp API

En el frontend (dentro de tu archivo `App.jsx` o en tu API backend), cuando el agente haga clic en el botón de **Enviar**, se debe llamar a la API oficial de WhatsApp en lugar de simular la respuesta:

A continuación, la función de Node.js que realiza la llamada HTTPS a Meta para enviar mensajes de texto plano:

```javascript
const axios = require('axios');

async function sendWhatsAppMessage(recipientPhone, messageText) {
  const PHONE_NUMBER_ID = 'TU_PHONE_NUMBER_ID';
  const ACCESS_TOKEN = 'TU_META_ACCESS_TOKEN';

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: recipientPhone, // Formato internacional sin caracteres especiales (ej: 51916916455)
        type: 'text',
        text: {
          body: messageText
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Mensaje enviado exitosamente:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error enviando mensaje a WhatsApp:', error.response?.data || error.message);
    throw error;
  }
}
```

---

## 5. El Flujo de "Borrador" (Draft) en el CRM

Como agente de ventas, no querrás que los mensajes se manden automáticamente al hacer clic en una plantilla. Por ello, el CRM ahora cuenta con el siguiente flujo:

1. **Selección de Plantilla**: El agente hace clic en el botón **"Bienvenida"**, **"Yape/Plin"**, **"Shalom"** o **"Olva"**.
2. **Carga en Borrador**: En lugar de gatillar el envío inmediato, el texto de la plantilla se inyecta directamente dentro del cuadro de texto (`input`) del chat.
3. **Personalización**: El agente puede cambiar el nombre del cliente, corregir datos o agregar notas personales al mensaje.
4. **Envío Manual**: El agente pulsa la tecla Enter o el botón de **Enviar (avión de papel)** para despachar finalmente el mensaje a través de la API oficial e insertarlo en el historial de Supabase.
