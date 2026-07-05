-- ═══════════════════════════════════════════════════════════════
-- Sistema Loma Verde — Migración a multi-tenant (varios docentes / colegios)
-- Ejecutar en: Supabase → SQL Editor → New query
--
-- Qué hace:
--  1. Agrega colegio_id y docente_id a cada tabla existente.
--  2. Activa Row Level Security (RLS).
--  3. Crea políticas: cada docente solo ve/edita sus propios datos.
--     (para datos que deban ser compartidos por todo el colegio,
--      ver la sección "Datos compartidos" al final)
--
-- IMPORTANTE: haz un backup antes de correr esto (Supabase → Database
-- → Backups, o Table Editor → Export CSV de cada tabla).
-- ═══════════════════════════════════════════════════════════════

-- 1) Tabla de colegios (para cuando vendas a otros colegios)
create table if not exists colegios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  creado_en timestamptz default now()
);

insert into colegios (id, nombre)
values ('00000000-0000-0000-0000-000000000001', 'I.E. San José de Loma Verde')
on conflict (id) do nothing;

-- 2) Agregar columnas a cada tabla (ajusta la lista si tienes más tablas)
do $$
declare
  t text;
  tablas text[] := array[
    'cursos','estudiantes','notas','asistencia','eventos','horario',
    'lv_planeadores','lv_comunicados','lv_examenes','lv11_examenes',
    'lv_resultados','lv11_resultados','lv11_simulacros_ext','lv_banco'
  ];
begin
  foreach t in array tablas loop
    execute format('alter table if exists %I add column if not exists docente_id uuid references auth.users(id)', t);
    execute format('alter table if exists %I add column if not exists colegio_id uuid references colegios(id) default ''00000000-0000-0000-0000-000000000001''', t);
    execute format('alter table if exists %I enable row level security', t);
  end loop;
end $$;

-- 3) Asignar el docente_id actual a los registros existentes
--    Reemplaza <TU_USER_ID> por tu uuid (Authentication → Users → copia el id)
-- update cursos set docente_id = '<TU_USER_ID>' where docente_id is null;
-- (repite para cada tabla, o usa el bloque genérico de abajo una vez tengas tu id)

-- 4) Políticas RLS: cada docente ve/edita solo lo suyo
do $$
declare
  t text;
  tablas text[] := array[
    'cursos','estudiantes','notas','asistencia','eventos','horario',
    'lv_planeadores','lv_comunicados','lv_examenes','lv11_examenes',
    'lv_resultados','lv11_resultados','lv11_simulacros_ext','lv_banco'
  ];
begin
  foreach t in array tablas loop
    execute format('drop policy if exists "propio_docente_select" on %I', t);
    execute format('drop policy if exists "propio_docente_write" on %I', t);
    execute format(
      'create policy "propio_docente_select" on %I for select using (docente_id = auth.uid())', t
    );
    execute format(
      'create policy "propio_docente_write" on %I for all using (docente_id = auth.uid()) with check (docente_id = auth.uid())', t
    );
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════
-- Datos compartidos (si algo debe verlo TODO el colegio, ej. eventos
-- o comunicados institucionales), usa esta política en vez de la de
-- arriba para esa tabla específica:
--
--   create policy "todo_el_colegio" on eventos
--     for select using (colegio_id = (
--       select colegio_id from perfiles where id = auth.uid()
--     ));
--
-- Para eso necesitarás una tabla "perfiles" que relacione cada
-- auth.users.id con su colegio_id y rol (docente/coordinador/admin).
-- Puedo crearla cuando definamos roles.
-- ═══════════════════════════════════════════════════════════════
