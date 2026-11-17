-- ============================================================
-- AVE FÉNIX · Migración 2 — vídeo de campaña y emblema por imagen
--
-- Pégalo en Supabase → SQL Editor → Run.
-- Es seguro y se puede ejecutar varias veces.
-- Hasta que lo ejecutes, la web sigue funcionando: simplemente
-- guarda las candidaturas sin vídeo ni emblema propio.
-- ============================================================

alter table candidatos add column if not exists video_url   text;
alter table candidatos add column if not exists emblema_url text;

-- Listo. No hace falta tocar nada más.
