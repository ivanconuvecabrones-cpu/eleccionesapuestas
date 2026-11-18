-- ============================================================
-- AVE FÉNIX · Migración 5 — avisos al móvil con la app cerrada
--
-- Crea la tabla donde cada dispositivo deja su suscripción y los
-- disparadores que llaman a la función supabase/functions/enviar-push
-- cada vez que se crea algo.
--
-- Sustituye __SECRETO__ por el mismo valor que el secreto
-- WEBHOOK_SECRET de la función. NO subas el valor real al repo.
-- Se puede ejecutar varias veces.
-- ============================================================

create extension if not exists pg_net;

create table if not exists suscripciones (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  nombre     text
);

alter table suscripciones enable row level security;
drop policy if exists "acceso_publico" on public.suscripciones;
create policy "acceso_publico" on public.suscripciones
  for all to anon, authenticated using (true) with check (true);

create or replace function public.notificar_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    perform net.http_post(
      url := 'https://tuknqpushteljccnzsxi.supabase.co/functions/v1/enviar-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', '__SECRETO__'),
      body := jsonb_build_object('tabla', TG_TABLE_NAME, 'registro', to_jsonb(NEW))
    );
  exception when others then
    null;  -- un fallo del aviso nunca debe impedir que se guarde la publicación
  end;
  return new;
end;
$$;

drop trigger if exists push_candidatos on public.candidatos;
create trigger push_candidatos after insert on public.candidatos
  for each row execute function public.notificar_push();

drop trigger if exists push_noticias on public.noticias;
create trigger push_noticias after insert on public.noticias
  for each row execute function public.notificar_push();

drop trigger if exists push_galeria on public.galeria;
create trigger push_galeria after insert on public.galeria
  for each row execute function public.notificar_push();

drop trigger if exists push_preguntas on public.preguntas;
create trigger push_preguntas after insert on public.preguntas
  for each row execute function public.notificar_push();

drop trigger if exists push_comentarios on public.comentarios;
create trigger push_comentarios after insert on public.comentarios
  for each row execute function public.notificar_push();

drop trigger if exists push_reacciones on public.reacciones;
create trigger push_reacciones after insert on public.reacciones
  for each row execute function public.notificar_push();
