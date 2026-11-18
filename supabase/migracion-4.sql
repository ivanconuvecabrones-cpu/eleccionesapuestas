-- ============================================================
-- AVE FÉNIX · Migración 4 — comentarios y reacciones en las noticias
--
-- Pégalo en Supabase → SQL Editor → Run.
-- Es seguro y se puede ejecutar varias veces.
-- Hasta que lo ejecutes, las noticias se ven y se pueden compartir,
-- pero los comentarios y las reacciones no se activan.
-- ============================================================

create table if not exists comentarios (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  noticia_id uuid not null references noticias(id) on delete cascade,
  autor      text not null,
  texto      text not null
);

-- Una reacción de cada tipo por persona y noticia: la restricción
-- unique lo garantiza aunque se pulse dos veces seguidas.
create table if not exists reacciones (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  noticia_id uuid not null references noticias(id) on delete cascade,
  autor      text not null,
  tipo       text not null,
  unique (noticia_id, autor, tipo)
);

alter table comentarios enable row level security;
alter table reacciones  enable row level security;

drop policy if exists "acceso_publico" on public.comentarios;
create policy "acceso_publico" on public.comentarios
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "acceso_publico" on public.reacciones;
create policy "acceso_publico" on public.reacciones
  for all to anon, authenticated using (true) with check (true);
