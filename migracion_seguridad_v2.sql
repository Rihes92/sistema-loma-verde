-- ═══════════════════════════════════════════════════════════════
-- SABIE — Migración de SEGURIDAD v2 (julio 2026)
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- Es IDEMPOTENTE: puedes correrla varias veces sin dañar nada, y
-- funciona igual si ya corriste (o no) migracion_seguridad.sql.
--
-- Qué hace:
--  1. Completa `actualizado_en` + trigger en TODAS las tablas,
--     incluidas las 6 que la migración v1 no cubría (observador,
--     piar, inclusión, boletines, herramientas, institución).
--  2. Activa RLS "solo usuarios autenticados" en TODAS las tablas.
--  3. NUEVO — roles en el servidor: escribir en las tablas
--     administrativas (lv_docentes, lv_asignaciones, lv_institucion)
--     ahora exige rol admin/coordinador en la tabla `perfiles`.
--     Hasta hoy ese candado era solo visual (cliente); un docente
--     con conocimientos técnicos podía saltárselo.
--  4. Al final: consultas de VERIFICACIÓN (pega el resultado en el
--     chat para confirmar que todo quedó bien).
-- ═══════════════════════════════════════════════════════════════

-- ── 0. Requisito: tabla perfiles (por si la v1 no corrió) ───────
create table if not exists perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  rol        text not null default 'docente',
  creado_en  timestamptz default now()
);
alter table perfiles enable row level security;
drop policy if exists "perfil_propio_select" on perfiles;
create policy "perfil_propio_select" on perfiles
  for select to authenticated using (id = auth.uid());

create or replace function public.crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists tg_crear_perfil on auth.users;
create trigger tg_crear_perfil
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();
insert into perfiles (id, email)
select id, email from auth.users on conflict (id) do nothing;

-- ── 1. actualizado_en + trigger en TODAS las tablas ─────────────
create or replace function public.tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

do $$
declare
  t text;
  tablas text[] := array[
    'cursos','estudiantes','notas','asistencia','eventos','horario',
    'lv_planeadores','lv_comunicados','lv_examenes','lv11_examenes',
    'lv_resultados','lv11_resultados','lv11_simulacros_ext','lv_banco',
    'lv_malla','lv_docentes','lv_asignaciones','lv_acudientes',
    'lv_observador','lv_piar','lv_inclusion_actividades','lv_boletines',
    'lv_herramientas','lv_institucion'
  ];
begin
  foreach t in array tablas loop
    if to_regclass('public.'||t) is null then
      raise notice 'Tabla % no existe aún — se omite (se creará cuando el módulo suba su primer dato... ver nota al final)', t;
      continue;
    end if;
    execute format('alter table %I add column if not exists actualizado_en timestamptz default now()', t);
    execute format('update %I set actualizado_en = now() where actualizado_en is null', t);
    execute format('drop trigger if exists tg_actualizado_en on %I', t);
    execute format('create trigger tg_actualizado_en before insert or update on %I
                    for each row execute function public.tocar_actualizado_en()', t);
  end loop;
end $$;

-- ── 2. RLS "solo autenticados" en TODAS las tablas ──────────────
do $$
declare
  t text;
  tablas text[] := array[
    'cursos','estudiantes','notas','asistencia','eventos','horario',
    'lv_planeadores','lv_comunicados','lv_examenes','lv11_examenes',
    'lv_resultados','lv11_resultados','lv11_simulacros_ext','lv_banco',
    'lv_malla','lv_docentes','lv_asignaciones','lv_acudientes',
    'lv_observador','lv_piar','lv_inclusion_actividades','lv_boletines',
    'lv_herramientas','lv_institucion'
  ];
begin
  foreach t in array tablas loop
    if to_regclass('public.'||t) is null then continue; end if;
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "propio_docente_select" on %I', t);
    execute format('drop policy if exists "propio_docente_write" on %I', t);
    execute format('drop policy if exists "solo_autenticados" on %I', t);
    execute format(
      'create policy "solo_autenticados" on %I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- ── 3. Roles en el servidor para tablas administrativas ─────────
-- Función que dice si el usuario actual es admin o coordinador.
-- SECURITY DEFINER: puede leer perfiles sin chocar con el RLS de esa tabla.
create or replace function public.es_coordinacion()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid() and rol in ('admin','coordinador')
  );
$$;

do $$
declare
  t text;
  admin_tablas text[] := array['lv_docentes','lv_asignaciones','lv_institucion'];
begin
  foreach t in array admin_tablas loop
    if to_regclass('public.'||t) is null then continue; end if;
    -- lectura: cualquier docente autenticado (la app la necesita para
    -- el login y el filtrado de materias)
    execute format('drop policy if exists "solo_autenticados" on %I', t);
    execute format('drop policy if exists "admin_lectura" on %I', t);
    execute format('drop policy if exists "admin_escritura" on %I', t);
    execute format('create policy "admin_lectura" on %I for select to authenticated using (true)', t);
    -- escritura: solo admin / coordinador (validado en el SERVIDOR)
    execute format('create policy "admin_escritura" on %I for all to authenticated
                    using (public.es_coordinacion()) with check (public.es_coordinacion())', t);
  end loop;
end $$;

-- NOTA: lv_malla queda con escritura para todos los docentes a propósito
-- (el Planeador permite a los docentes gestionar su malla curricular).

-- ── 4. VERIFICACIÓN — pega estos resultados en el chat ──────────
-- 4a. ¿Alguna tabla SIN RLS? (debe devolver 0 filas)
select tablename as "⚠️ TABLA SIN RLS"
from pg_tables
where schemaname = 'public' and rowsecurity = false;

-- 4b. Resumen de políticas por tabla
select tablename as tabla, policyname as politica, cmd as operacion
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
