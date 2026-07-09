-- ═══════════════════════════════════════════════════════════════
-- Sistema Loma Verde — Migración de SEGURIDAD (julio 2026)
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- ⚠️ ANTES DE CORRER: haz un backup (Database → Backups, o exporta
--    cada tabla a CSV desde el Table Editor).
--
-- Qué hace:
--  1. Crea la tabla `perfiles` (rol de cada usuario: docente /
--     coordinador / admin) con creación automática al dar de alta
--     un usuario en Authentication.
--  2. Asegura la columna `actualizado_en` + trigger en TODAS las
--     tablas (necesaria para la sincronización incremental).
--  3. Activa RLS en todas las tablas con política "solo usuarios
--     autenticados": la anon key sola YA NO puede leer ni escribir
--     nada. Esto cierra el hueco de la base de datos abierta.
--
-- Nota: la política es "cualquier docente autenticado ve los datos
-- del colegio" (así funciona la app hoy: datos compartidos filtrados
-- por interfaz). Un aislamiento estricto por docente (docente_id =
-- auth.uid()) es un paso posterior que requiere etiquetar cada
-- registro; ver migration_multitenant.sql como referencia.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabla de perfiles y roles ────────────────────────────────
create table if not exists perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  rol        text not null default 'docente',  -- docente | coordinador | admin
  creado_en  timestamptz default now()
);

alter table perfiles enable row level security;

drop policy if exists "perfil_propio_select" on perfiles;
create policy "perfil_propio_select" on perfiles
  for select to authenticated using (id = auth.uid());

-- Crear el perfil automáticamente cuando se da de alta un usuario
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

-- Perfiles para usuarios que ya existían antes de esta migración
insert into perfiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ── 2. actualizado_en + trigger en todas las tablas ─────────────
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
    'lv_malla','lv_docentes','lv_asignaciones','lv_acudientes'
  ];
begin
  foreach t in array tablas loop
    if to_regclass('public.'||t) is null then continue; end if;
    execute format('alter table %I add column if not exists actualizado_en timestamptz default now()', t);
    execute format('update %I set actualizado_en = now() where actualizado_en is null', t);
    execute format('drop trigger if exists tg_actualizado_en on %I', t);
    execute format('create trigger tg_actualizado_en before insert or update on %I
                    for each row execute function public.tocar_actualizado_en()', t);
  end loop;
end $$;

-- ── 3. RLS: solo usuarios autenticados ──────────────────────────
do $$
declare
  t text;
  tablas text[] := array[
    'cursos','estudiantes','notas','asistencia','eventos','horario',
    'lv_planeadores','lv_comunicados','lv_examenes','lv11_examenes',
    'lv_resultados','lv11_resultados','lv11_simulacros_ext','lv_banco',
    'lv_malla','lv_docentes','lv_asignaciones','lv_acudientes'
  ];
begin
  foreach t in array tablas loop
    if to_regclass('public.'||t) is null then continue; end if;
    execute format('alter table %I enable row level security', t);
    -- limpiar políticas anteriores (de pruebas o de la migración vieja)
    execute format('drop policy if exists "propio_docente_select" on %I', t);
    execute format('drop policy if exists "propio_docente_write" on %I', t);
    execute format('drop policy if exists "solo_autenticados" on %I', t);
    execute format(
      'create policy "solo_autenticados" on %I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- ── 4. Marca tu usuario como administrador ──────────────────────
-- Reemplaza el correo por el tuyo y descomenta la línea:
-- update perfiles set rol = 'admin' where email = 'richard.mhsabie@icloud.com';

-- Para dar rol de coordinación a otro usuario:
-- update perfiles set rol = 'coordinador' where email = 'correo@ejemplo.com';
