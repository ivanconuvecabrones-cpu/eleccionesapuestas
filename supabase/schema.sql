-- ============================================================
-- AVE FÉNIX · Elecciones 2026
-- Pega TODO este archivo en Supabase → SQL Editor → Run.
-- Se puede volver a ejecutar sin romper nada.
-- ============================================================

-- ---------- TABLAS ----------

create table if not exists candidatos (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  nombre          text not null unique,
  alias           text,
  partido         text,
  siglas          text,
  color           text,
  emoji           text,
  lema            text,
  descripcion     text,
  foto_url        text,
  casa_apuestas   text,
  unidad          numeric,
  bankroll        numeric,
  stats           jsonb not null default '{}'::jsonb,
  promesas        jsonb not null default '[]'::jsonb,
  apoyo           text,
  min_nba         text,
  min_futbol      text,
  min_otros       text,
  programa_url    text,
  test_respuestas jsonb not null default '{}'::jsonb
);

create table if not exists noticias (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  candidato_id uuid references candidatos(id) on delete cascade,
  autor        text,
  titulo       text not null,
  cuerpo       text,
  imagen_url   text
);

create table if not exists galeria (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  candidato_id uuid references candidatos(id) on delete cascade,
  autor        text,
  titulo       text,
  url          text not null
);

create table if not exists preguntas (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  candidato_id uuid references candidatos(id) on delete cascade,
  autor        text not null,
  texto        text not null
);

create table if not exists respuestas (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  pregunta_id  uuid not null references preguntas(id) on delete cascade,
  candidato_id uuid not null references candidatos(id) on delete cascade,
  texto        text not null
);

-- Un voto por persona: lo garantiza la restricción unique.
create table if not exists votos (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  votante      text not null unique,
  candidato_id uuid not null references candidatos(id) on delete cascade
);

-- El sondeo sí se puede cambiar, pero una fila por persona.
create table if not exists sondeo (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  votante      text not null unique,
  candidato_id uuid not null references candidatos(id) on delete cascade
);

create table if not exists debate_preguntas (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  autor      text not null,
  texto      text not null
);

-- Fases que controla el panel de admin.
create table if not exists ajustes (
  clave      text primary key,
  valor      jsonb,
  created_at timestamptz not null default now()
);

-- ---------- PERMISOS ----------
-- Elecciones de un grupo de 13 amigos: la web es abierta y cualquiera
-- con el enlace puede leer y escribir. El control real son los códigos
-- personales (en js/config.js) y el panel de admin.

alter table candidatos       enable row level security;
alter table noticias         enable row level security;
alter table galeria          enable row level security;
alter table preguntas        enable row level security;
alter table respuestas       enable row level security;
alter table votos            enable row level security;
alter table sondeo           enable row level security;
alter table debate_preguntas enable row level security;
alter table ajustes          enable row level security;

do $$
declare t text;
begin
  foreach t in array array['candidatos','noticias','galeria','preguntas',
                           'respuestas','votos','sondeo','debate_preguntas','ajustes']
  loop
    execute format('drop policy if exists "acceso_publico" on public.%I', t);
    execute format(
      'create policy "acceso_publico" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- ARCHIVOS (fotos, PDFs, memes) ----------

insert into storage.buckets (id, name, public)
values ('elecciones', 'elecciones', true)
on conflict (id) do update set public = true;

drop policy if exists "elecciones_leer"   on storage.objects;
drop policy if exists "elecciones_subir"  on storage.objects;
drop policy if exists "elecciones_borrar" on storage.objects;

create policy "elecciones_leer" on storage.objects
  for select to anon, authenticated using (bucket_id = 'elecciones');

create policy "elecciones_subir" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'elecciones');

create policy "elecciones_borrar" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'elecciones');

-- ---------- LISTO ----------
-- Comprueba que aparecen 9 tablas en Table Editor y un bucket
-- llamado "elecciones" en Storage. Nada más.
