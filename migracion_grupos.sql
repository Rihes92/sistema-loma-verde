-- ═══════════════════════════════════════════════════════════════════════
-- SABIE — Catálogo institucional de GRUPOS reales (ago 2026, sesión 33)
--
-- QUÉ RESUELVE:
-- Hasta hoy no existía en ninguna parte del proyecto una lista de "qué
-- grupos tiene de verdad el colegio". Cada docente escribía grado, grupo y
-- sede A MANO al crear su curso — de ahí salen los errores de tipeo que ya
-- costaron dos sesiones enteras de arreglos (sesión 21: "9-903" vs "9-3"
-- rompía al director de grupo; sesión 30b/30d: sedes que se confundían
-- entre sí y generaban cruces falsos en los horarios). El generador
-- automático de horarios además tenía que ADIVINAR cuántos grupos hay por
-- grado (campos manuales numGrupos/numGruposJJ1, sesión 30c).
--
-- Esta tabla es la fuente de verdad, y sale del ARCHIVO PLANO DE SIMAT
-- (el sistema nacional de matrículas) — no se escribe a mano: se importa
-- desde Coordinación → Matrícula → "Importar archivo plano de SIMAT",
-- junto con los estudiantes.
--
-- QUÉ NO ES:
-- NO reemplaza a lv_cursos. Un "curso" en SABIE sigue siendo POR MATERIA
-- (Matemáticas de 9-1, creado por su docente). Un "grupo" es el grupo
-- físico real (9-1 de la sede Principal), que existe una sola vez y no
-- pertenece a ningún docente. La tabla nueva solo ALIMENTA los
-- desplegables y los reportes; no cambia cómo funcionan los cursos.
--
-- Estructura de cada registro (JSONB):
--   { id, grado, grupo, sede, jornada, estudiantes, origen:'simat',
--     importadoEn, importadoPor }
--   · id = clave estable "grado|grupo|sede" canonizada, para que
--     reimportar ACTUALICE el mismo grupo en vez de duplicarlo.
--
-- Ejecutar en: Supabase → SQL Editor → Run  (idempotente)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists lv_grupos (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);

drop trigger if exists tg_actualizado_en on lv_grupos;
create trigger tg_actualizado_en before insert or update on lv_grupos
  for each row execute function public.tocar_actualizado_en();

alter table lv_grupos enable row level security;

-- A DIFERENCIA de lv_matricula (que es coordinación-only porque trae
-- documento de identidad y fecha de nacimiento), este catálogo NO tiene
-- ningún dato personal: es solo "existe el grupo 9-1 en la sede Principal,
-- con 22 estudiantes". Cualquier docente autenticado necesita LEERLO para
-- que el desplegable de "crear curso" le ofrezca los grupos reales — mismo
-- criterio que lv_centros (lectura abierta, escritura de coordinación).
drop policy if exists "solo_autenticados" on lv_grupos;
drop policy if exists "lectura_docentes" on lv_grupos;
create policy "lectura_docentes" on lv_grupos
  for select to authenticated
  using (true);

-- Escribir (importar desde SIMAT, corregir a mano) es solo de coordinación.
drop policy if exists "escritura_coordinacion" on lv_grupos;
create policy "escritura_coordinacion" on lv_grupos
  for all to authenticated
  using (public.es_coordinacion())
  with check (public.es_coordinacion());

select 'lv_grupos lista' as resultado;

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (solo lectura) — después de correr el import desde la app:
--   select count(*) as grupos from lv_grupos;                     -- ~99
--   select datos->>'sede' as sede, count(*) from lv_grupos
--     group by 1 order by 2 desc;
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- ═══════════════════════════════════════════════════════════════════════
-- drop table if exists lv_grupos;
