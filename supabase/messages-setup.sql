-- Conecta360 · Chat / pre-conversaciones
-- Ejecutar en Supabase → SQL Editor (proyecto higmzzfiwsjjiimdqoyr)
-- Alineado con lib/supabase/messages-repository.ts

-- ---------------------------------------------------------------------------
-- 1. Tabla messages (columnas oficiales del frontend)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  meeting_id uuid references public.meetings (id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Migrar nombres legacy si la tabla ya existía con columnas incorrectas
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'body'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'content'
  ) then
    alter table public.messages rename column body to content;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'recipient_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'receiver_id'
  ) then
    alter table public.messages rename column recipient_id to receiver_id;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'content'
  ) then
    alter table public.messages add column content text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'receiver_id'
  ) then
    alter table public.messages add column receiver_id uuid references auth.users (id);
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'meeting_id'
  ) then
    alter table public.messages add column meeting_id uuid references public.meetings (id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'read_at'
  ) then
    alter table public.messages add column read_at timestamptz;
  end if;
end $$;

create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists messages_receiver_id_idx on public.messages (receiver_id);
create index if not exists messages_meeting_id_idx on public.messages (meeting_id);
create index if not exists messages_created_at_idx on public.messages (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Helper: reunión confirmada entre dos usuarios
-- ---------------------------------------------------------------------------
create or replace function public.has_confirmed_meeting_with(
  p_user_id uuid,
  p_other_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meetings m
    where m.status in ('confirmada', 'confirmed', 'completada', 'completed')
      and (
        (m.requester_id = p_user_id and m.recipient_id = p_other_id)
        or (m.recipient_id = p_user_id and m.requester_id = p_other_id)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.messages enable row level security;

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
  on public.messages
  for select
  to authenticated
  using (
    auth.uid() in (sender_id, receiver_id)
    and public.has_confirmed_meeting_with(
      auth.uid(),
      case when auth.uid() = sender_id then receiver_id else sender_id end
    )
  );

drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.has_confirmed_meeting_with(auth.uid(), receiver_id)
  );

drop policy if exists "messages_update_mark_read" on public.messages;
create policy "messages_update_mark_read"
  on public.messages
  for update
  to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Realtime (mensajes en vivo)
-- ---------------------------------------------------------------------------
alter table public.messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Verificación rápida (opcional)
-- ---------------------------------------------------------------------------
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'messages'
-- order by ordinal_position;
