-- ═══════════════════════════════════════════════════════════════
-- SABIE — Módulo "Centros de Interés · PTA" (jul 2026)
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- Crea las 3 tablas nuevas del módulo (ver ESPECIFICACION_MODULO_PTA.md):
--   · lv_centros               — catálogo de centros (línea, líder, docentes)
--   · lv_centros_inscripciones — estudiantes inscritos por centro
--   · lv_centros_asistencia    — asistencia por centro y fecha
--
-- Es IDEMPOTENTE: se puede correr varias veces sin dañar nada.
--
-- RLS: sigue el patrón ACTUAL del proyecto ("solo_autenticados" =
-- using(true) with check(true)) para no romper el modelo offline-first;
-- el filtrado por dueño/curso se afina en la etapa 2. La EXCEPCIÓN es
-- lv_centros: solo Coordinación crea/edita centros (líder, docentes,
-- línea, cupo...), así que su escritura queda restringida a
-- public.es_coordinacion() (misma función que ya protege lv_docentes /
-- lv_asignaciones / lv_institucion en migracion_seguridad_v2.sql).
-- La LECTURA de lv_centros es para todos los autenticados (cada docente
-- filtra en la app cuáles son "sus" centros, según sea líder o esté
-- asignado — igual que el resto de la app con lv_asignaciones).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Crear las 3 tablas (si no existen) + trigger actualizado_en ──
do $$
declare
  t text;
  tablas text[] := array['lv_centros','lv_centros_inscripciones','lv_centros_asistencia'];
begin
  foreach t in array tablas loop
    execute format('create table if not exists %I (
      id             text primary key,
      datos          jsonb,
      actualizado_en timestamptz default now()
    )', t);
    execute format('drop trigger if exists tg_actualizado_en on %I', t);
    execute format('create trigger tg_actualizado_en before insert or update on %I
                    for each row execute function public.tocar_actualizado_en()', t);
  end loop;
end $$;

-- ── 2. RLS ────────────────────────────────────────────────────────

-- 2a. lv_centros_inscripciones y lv_centros_asistencia:
--     "solo_autenticados" — cualquier docente con sesión puede leer/escribir
--     (gestionan inscripciones y asistencia de SUS centros; el filtrado de
--     cuáles son "sus" centros vive en la app, igual que hoy con cursos).
do $$
declare
  t text;
  tablas text[] := array['lv_centros_inscripciones','lv_centros_asistencia'];
begin
  foreach t in array tablas loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "solo_autenticados" on %I', t);
    execute format('create policy "solo_autenticados" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- 2b. lv_centros: lectura para todos los autenticados, escritura SOLO
--     para Coordinación (crear/editar/eliminar centros, asignar líder
--     y docentes). Requiere public.es_coordinacion(), creada en
--     migracion_seguridad_v2.sql — si no existe, esta migración falla
--     con un mensaje claro (correr primero migracion_seguridad_v2.sql).
alter table lv_centros enable row level security;
drop policy if exists "solo_autenticados" on lv_centros;
drop policy if exists "centros_lectura" on lv_centros;
drop policy if exists "centros_escritura" on lv_centros;
create policy "centros_lectura" on lv_centros for select to authenticated using (true);
create policy "centros_escritura" on lv_centros for all to authenticated
  using (public.es_coordinacion()) with check (public.es_coordinacion());

-- ── 3. VERIFICACIÓN — pega estos resultados en el chat ──────────────

-- 3a. Las 3 tablas deben existir con rls = true
select tablename as tabla, rowsecurity as rls
from pg_tables
where schemaname = 'public'
  and tablename in ('lv_centros','lv_centros_inscripciones','lv_centros_asistencia');

-- 3b. Políticas creadas (lv_centros debe mostrar 2: lectura + escritura;
--     las otras dos, 1 cada una: solo_autenticados)
select tablename as tabla, policyname as politica, cmd as operacion
from pg_policies
where schemaname = 'public'
  and tablename in ('lv_centros','lv_centros_inscripciones','lv_centros_asistencia')
order by tablename, policyname;

-- 3c. ¿Alguna de las 3 quedó SIN RLS? (debe devolver 0 filas)
select tablename as "⚠️ TABLA SIN RLS"
from pg_tables
where schemaname = 'public'
  and rowsecurity = false
  and tablename in ('lv_centros','lv_centros_inscripciones','lv_centros_asistencia');
