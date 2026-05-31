-- =====================================================================
--  NÓS / NOSOTROS — esquema Supabase (Postgres) + RLS
--  App privado de reconexión de pareja · programa de 30 días
--  Identificadores en inglés (buena práctica) · contenido en español
--  Ejecutar entero en el SQL Editor de Supabase (un solo paso).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
--  TABLAS
-- ---------------------------------------------------------------------

-- Una fila por pareja. Solo dos miembros la comparten.
create table public.couples (
  id            uuid primary key default gen_random_uuid(),
  invite_code   text unique not null default encode(gen_random_bytes(6), 'hex'),
  start_date    date not null default current_date,           -- día 1 del programa
  pact_text     text not null default
    'Durante 30 días elegimos quedarnos. Pase lo que pase, cada día entramos aquí, '
    || 'nos contamos cómo nos sentimos de verdad y damos un paso para acercarnos. '
    || 'Sin orgullo de por medio, sin dejar que la rutina decida por nosotros.',
  pact_signed_a timestamptz,                                  -- firma del miembro a
  pact_signed_b timestamptz,                                  -- firma del miembro b
  created_at    timestamptz not null default now()
);

-- Perfil de cada persona (1:1 con auth.users).
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  couple_id    uuid references public.couples(id) on delete set null,
  member_slot  text check (member_slot in ('a','b')),
  display_name text not null default '',
  created_at   timestamptz not null default now()
);

-- Contenido del programa: 30 días (semilla, no editable desde el cliente).
create table public.program_days (
  day_number  int primary key check (day_number between 1 and 30),
  week_number int not null check (week_number between 1 and 4),
  theme_key   text not null,           -- p.ej. 'presencia', 'gratitud'
  question_es text not null,           -- la pregunta del día
  gesture_es  text not null            -- el micro-gesto sugerido
);

-- Una entrada por persona por día.
create table public.entries (
  id               uuid primary key default gen_random_uuid(),
  couple_id        uuid not null references public.couples(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  day_number       int  not null references public.program_days(day_number),
  connection_score int  check (connection_score between 0 and 10),
  mood             text,
  reflection_es    text,
  gesture_done     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (couple_id, user_id, day_number)
);

-- Comentarios sobre la entrada del otro (tras la "revelación").
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references public.entries(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- Sugerencias / peticiones entre la pareja.
create table public.suggestions (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples(id) on delete cascade,
  proposer_id   uuid not null references public.profiles(id) on delete cascade,
  body          text not null,
  status        text not null default 'pending'
                  check (status in ('pending','accepted','declined','countered')),
  response_body text,
  created_at    timestamptz not null default now()
);

-- Acuerdos: lo aceptado se vuelve parte del "pacto vivo".
create table public.agreements (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples(id) on delete cascade,
  suggestion_id uuid references public.suggestions(id) on delete set null,
  body          text not null,
  created_at    timestamptz not null default now()
);

-- Reflexión semanal (el "diagnóstico" del ciclo, sin diagnosticar a nadie).
create table public.weekly_reflections (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  week_number    int  not null check (week_number between 1 and 4),
  trigger_text   text,   -- qué disparó distancia esta semana
  primary_emotion text,  -- la emoción de debajo (tristeza, miedo, vergüenza...)
  need_text      text,   -- qué necesitaba sentir
  created_at     timestamptz not null default now(),
  unique (couple_id, user_id, week_number)
);

-- ---------------------------------------------------------------------
--  HELPERS
-- ---------------------------------------------------------------------

-- Devuelve el couple_id del usuario actual (SECURITY DEFINER evita
-- recursión de políticas al leerse sobre la propia tabla profiles).
create or replace function public.current_couple_id()
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

-- Crea automáticamente el perfil al registrarse un usuario.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name',''));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- El primer miembro crea la pareja y queda como 'a'.
create or replace function public.create_couple()
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.couples default values returning id into new_id;
  update public.profiles set couple_id = new_id, member_slot = 'a'
    where id = auth.uid();
  return new_id;
end; $$;

-- El segundo miembro se une con el código de invitación.
create or replace function public.join_couple(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from public.couples where invite_code = code;
  if cid is null then raise exception 'Código de invitación inválido'; end if;
  update public.profiles set couple_id = cid, member_slot = 'b'
    where id = auth.uid();
  return cid;
end; $$;

-- ---------------------------------------------------------------------
--  RLS — solo los dos miembros de la pareja ven sus datos
-- ---------------------------------------------------------------------

alter table public.couples            enable row level security;
alter table public.profiles           enable row level security;
alter table public.program_days       enable row level security;
alter table public.entries            enable row level security;
alter table public.comments           enable row level security;
alter table public.suggestions        enable row level security;
alter table public.agreements         enable row level security;
alter table public.weekly_reflections enable row level security;

-- couples: ver y actualizar solo la propia pareja.
create policy couples_select on public.couples for select
  using (id = public.current_couple_id());
create policy couples_update on public.couples for update
  using (id = public.current_couple_id());

-- profiles: ver el propio y el de la pareja; editar el propio.
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or couple_id = public.current_couple_id());
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update
  using (id = auth.uid());

-- program_days: lectura para cualquier usuario autenticado (contenido común).
create policy program_days_select on public.program_days for select
  to authenticated using (true);

-- entries: todo restringido a la pareja; solo escribo mis propias entradas.
create policy entries_select on public.entries for select
  using (couple_id = public.current_couple_id());
create policy entries_insert on public.entries for insert
  with check (couple_id = public.current_couple_id() and user_id = auth.uid());
create policy entries_update on public.entries for update
  using (user_id = auth.uid());

-- comments: visibles para la pareja dueña de la entrada; escribo como yo.
create policy comments_select on public.comments for select
  using (exists (select 1 from public.entries e
                 where e.id = entry_id and e.couple_id = public.current_couple_id()));
create policy comments_insert on public.comments for insert
  with check (author_id = auth.uid()
              and exists (select 1 from public.entries e
                          where e.id = entry_id and e.couple_id = public.current_couple_id()));

-- suggestions: dentro de la pareja; propongo como yo; ambos pueden responder.
create policy suggestions_select on public.suggestions for select
  using (couple_id = public.current_couple_id());
create policy suggestions_insert on public.suggestions for insert
  with check (couple_id = public.current_couple_id() and proposer_id = auth.uid());
create policy suggestions_update on public.suggestions for update
  using (couple_id = public.current_couple_id());

-- agreements: dentro de la pareja.
create policy agreements_select on public.agreements for select
  using (couple_id = public.current_couple_id());
create policy agreements_insert on public.agreements for insert
  with check (couple_id = public.current_couple_id());

-- weekly_reflections: dentro de la pareja; escribo la mía.
create policy weekly_select on public.weekly_reflections for select
  using (couple_id = public.current_couple_id());
create policy weekly_insert on public.weekly_reflections for insert
  with check (couple_id = public.current_couple_id() and user_id = auth.uid());
create policy weekly_update on public.weekly_reflections for update
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
--  SEMILLA — Semana 1 "Presencia" (días 1-7), lista para arrancar
--  Base: Gottman (bids, rituales de conexión, aprecio).
--  Semanas 2-4 se cargan después con el mismo formato.
-- ---------------------------------------------------------------------

insert into public.program_days (day_number, week_number, theme_key, question_es, gesture_es) values
 (1,1,'pacto',     '¿Qué fue lo que me hizo elegirte hace 26 años, y qué de aquello sigue vivo hoy?', 'Un abrazo de seis segundos al despedirnos y al reencontrarnos.'),
 (2,1,'gratitud',  '¿Qué hizo mi pareja hoy, por pequeño que sea, que quiero agradecer?',            'Decirle en voz alta una cosa concreta que aprecio de él/ella.'),
 (3,1,'escucha',   '¿Cuándo intentamos hoy conectar el uno con el otro, y cómo respondí yo?',        'Dejar el móvil y escuchar dos minutos cómo fue su día, con preguntas.'),
 (4,1,'cercania',  '¿En qué momento de hoy me sentí más cerca de ti?',                               'Un gesto físico sin motivo: la mano, el hombro, un beso.'),
 (5,1,'ritual',    '¿Qué pequeño ritual diario nos gustaría recuperar o crear?',                     'Tomar un café o un mate juntos, diez minutos, sin pantallas.'),
 (6,1,'admiracion','¿Qué cualidad tuya admiro y casi nunca te digo?',                                'Enviarle un mensaje a media jornada solo para saber cómo está.'),
 (7,1,'cierre',    '¿Cómo cambió esta semana la sensación de estar cerca?',                          'Elegir juntos algo lindo para hacer mañana.');
