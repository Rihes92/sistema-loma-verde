-- ═══════════════════════════════════════════════════════════════
-- SABIE — Módulo de Matrícula + Acudientes (jul 2026, sesión 25c)
-- Registro OFICIAL de estudiantes (documento, fecha nac., sede,
-- grado, grupo, acudiente), separado del roster por-curso que ya
-- usa 01-calificaciones (lv_estudiantes). Estructura razonable de
-- partida — AJUSTAR cuando Richard envíe la ficha oficial del
-- colegio (campos exactos, tipos de documento, etc.).
-- Ejecutar en: Supabase → SQL Editor → Run  (idempotente)
-- ═══════════════════════════════════════════════════════════════
create table if not exists lv_matricula (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_matricula;
create trigger tg_actualizado_en before insert or update on lv_matricula
  for each row execute function public.tocar_actualizado_en();

alter table lv_matricula enable row level security;

-- Contiene datos sensibles (documento de identidad, fecha de nacimiento)
-- de TODO el colegio: a diferencia de lv_centros o lv_permisos, aquí NI
-- SIQUIERA la lectura es para todos los docentes — solo coordinación/
-- rector, igual que lv_docentes/lv_asignaciones/lv_institucion.
drop policy if exists "solo_autenticados" on lv_matricula;
drop policy if exists "coordinacion_todo" on lv_matricula;
create policy "coordinacion_todo" on lv_matricula
  for all to authenticated
  using (public.es_coordinacion())
  with check (public.es_coordinacion());

select 'lv_matricula lista' as resultado;
