-- ============================================================
-- AVE FÉNIX · Migración 3 — nombre del diario y varias imágenes por noticia
--
-- Pégalo en Supabase → SQL Editor → Run.
-- Es seguro y se puede ejecutar varias veces.
-- Hasta que lo ejecutes, las noticias se guardan igual pero sin el
-- nombre del diario y solo con la primera imagen.
-- ============================================================

alter table noticias add column if not exists diario   text;
alter table noticias add column if not exists imagenes jsonb not null default '[]'::jsonb;
