-- ============================================================
--  Sexloop CRM · Esquema de WhatsApp Cloud API (Coexistence)
-- ============================================================
--  Ejecuta este script en el editor SQL de tu proyecto Supabase.
--  Es IDEMPOTENTE: puedes correrlo varias veces sin romper nada.
--  Extiende las tablas que ya usa el CRM (leads, messages) y
--  agrega las que faltan para la integración oficial de Meta.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLA leads  (ficha de cliente)
-- ------------------------------------------------------------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  phone       text,
  origin      text default 'WhatsApp',
  stage       text default 'Nuevo',
  amount      numeric default 0,
  tags        jsonb default '[]'::jsonb,
  notes       text,
  created_at  timestamptz default now()
);

-- Campos extra para WhatsApp / Coexistence (si ya existe la tabla)
alter table public.leads add column if not exists wa_id          text;       -- wa_id que devuelve Meta
alter table public.leads add column if not exists wa_labels      jsonb default '[]'::jsonb;  -- etiquetas importadas de WhatsApp Business
alter table public.leads add column if not exists first_contact  timestamptz;-- fecha del primer contacto
alter table public.leads add column if not exists last_message_at timestamptz;-- para ordenar la bandeja
alter table public.leads add column if not exists unread_count   integer default 0;

-- El teléfono identifica al cliente: evita leads duplicados al reconectar
create unique index if not exists leads_phone_key on public.leads (phone);

-- ------------------------------------------------------------
-- 2. TABLA messages  (historial unificado celular + CRM)
-- ------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references public.leads(id) on delete cascade,
  sender      text not null,            -- 'client' | 'agent'
  text        text,
  created_at  timestamptz default now()
);

-- Campos extra para la API oficial
alter table public.messages add column if not exists wa_message_id text;      -- id del mensaje en Meta (wamid.*)
alter table public.messages add column if not exists source        text default 'crm'; -- 'crm' | 'phone' | 'api' | 'client'
alter table public.messages add column if not exists status        text default 'sent'; -- sent | delivered | read | failed | received
alter table public.messages add column if not exists type          text default 'text'; -- text | image | audio | document | video
alter table public.messages add column if not exists media_url     text;
alter table public.messages add column if not exists media_mime    text;
alter table public.messages add column if not exists wa_timestamp  timestamptz;

-- Evita duplicar el mismo mensaje de WhatsApp si el webhook llega 2 veces
create unique index if not exists messages_wa_message_id_key
  on public.messages (wa_message_id) where wa_message_id is not null;

create index if not exists messages_lead_id_idx on public.messages (lead_id);

-- ------------------------------------------------------------
-- 3. TABLA wa_labels  (catálogo de etiquetas de WhatsApp Business)
-- ------------------------------------------------------------
create table if not exists public.wa_labels (
  id          text primary key,         -- id de la etiqueta en WhatsApp Business
  name        text not null,
  color       text,
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------
-- 4. TABLA wa_sync_state  (control de importaciones / dedupe)
-- ------------------------------------------------------------
create table if not exists public.wa_sync_state (
  id              text primary key default 'default',
  last_import_at  timestamptz,
  history_done    boolean default false,
  imported_count  integer default 0,
  updated_at      timestamptz default now()
);

insert into public.wa_sync_state (id) values ('default')
  on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 5. REALTIME  (para sincronización en tiempo real en el CRM)
-- ------------------------------------------------------------
-- Agrega las tablas a la publicación de Realtime de Supabase.
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.leads;
  exception when duplicate_object then null;
  end;
end $$;

-- ------------------------------------------------------------
-- 6. RLS  (Row Level Security en TODAS las tablas)
-- ------------------------------------------------------------
-- El backend escribe con la SERVICE ROLE KEY → SIEMPRE omite RLS.
-- El frontend lee/escribe con la ANON KEY:
--   · leads, messages, wa_labels  → el CRM los muestra → política permisiva.
--   · wa_sync_state               → SOLO la usa el backend → RLS activado
--                                     SIN política (acceso anónimo bloqueado).
alter table public.leads         enable row level security;
alter table public.messages      enable row level security;
alter table public.wa_labels     enable row level security;
alter table public.wa_sync_state enable row level security;  -- sin política: solo service role

do $$
begin
  if not exists (select 1 from pg_policies where tablename='leads' and policyname='leads_all') then
    create policy leads_all on public.leads for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='messages_all') then
    create policy messages_all on public.messages for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='wa_labels' and policyname='wa_labels_all') then
    create policy wa_labels_all on public.wa_labels for all using (true) with check (true);
  end if;
  -- wa_sync_state: intencionalmente SIN política (queda accesible solo a la service role).
end $$;
