-- AVE FÉNIX · Migración 6 — voto de ministros el día de las elecciones.
-- Pégalo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
-- Hasta que se ejecute, el voto a presidente funciona igual y los ministros se ignoran.

alter table votos add column if not exists ministro_nba         text;
alter table votos add column if not exists ministro_inversiones text;
alter table votos add column if not exists ministro_otros       text;
