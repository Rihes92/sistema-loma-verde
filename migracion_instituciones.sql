-- ═══════════════════════════════════════════════════════════════
-- SABIE — Migración: tabla de INSTITUCIÓN (branding configurable)
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- Qué hace:
--  1. Crea la tabla `lv_institucion` (misma estructura {id, datos}
--     que las demás tablas de la app).
--  2. Trigger de `actualizado_en` (sincronización incremental).
--  3. RLS "solo usuarios autenticados", igual que el resto.
--  4. Inserta la fila por defecto con los datos actuales del colegio.
--
-- Después de correrla, el nombre de la institución se edita desde
-- la app: Coordinación → Resumen → Institución. Este es el primer
-- paso hacia el modelo multi-institución (ver migration_multitenant.sql).
-- ═══════════════════════════════════════════════════════════════

create table if not exists lv_institucion (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);

-- trigger de actualizado_en (la función ya existe si corriste
-- migracion_seguridad.sql; se redefine por si acaso)
create or replace function public.tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

drop trigger if exists tg_actualizado_en on lv_institucion;
create trigger tg_actualizado_en
  before insert or update on lv_institucion
  for each row execute function public.tocar_actualizado_en();

-- RLS: solo autenticados (mismo criterio que las demás tablas)
alter table lv_institucion enable row level security;
drop policy if exists "solo_autenticados" on lv_institucion;
create policy "solo_autenticados" on lv_institucion
  for all to authenticated using (true) with check (true);

-- Fila por defecto (no pisa si ya existe)
insert into lv_institucion (id, datos) values (
  'principal',
  '{"id":"principal","nombre":"Institución Educativa San José de Loma Verde","nombreCorto":"I.E. San José de Loma Verde","sede":"Sede Principal"}'::jsonb
) on conflict (id) do nothing;
