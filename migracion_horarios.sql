-- ═══════════════════════════════════════════════════════════════
-- SABIE — Horarios armados por Coordinación (jul 2026, sesión 26k)
-- Reemplaza el modelo viejo de lv_horario (guardado por MATERIA, con
-- riesgo real de choque entre docentes de la misma materia) por uno
-- por DOCENTE: un registro por docente = su horario semanal publicado.
-- lv_horario (la tabla vieja) NO se borra ni se toca — queda como
-- histórico; el módulo 07-horario.html deja de escribir en ella.
-- Ejecutar en: Supabase → SQL Editor → Run  (idempotente)
-- ═══════════════════════════════════════════════════════════════
create table if not exists lv_horarios (
  id             text primary key,   -- id del docente (lv_docentes.id)
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_horarios;
create trigger tg_actualizado_en before insert or update on lv_horarios
  for each row execute function public.tocar_actualizado_en();
alter table lv_horarios enable row level security;
-- Mismo nivel que la mayoría de tablas del proyecto: lectura/escritura
-- abierta a cualquier autenticado (la restricción real de "solo
-- coordinación puede EDITAR" es de la app, igual que en Matrícula,
-- Roles, etc. hasta que llegue la Fase 2 de RLS por rol/curso).
drop policy if exists "solo_autenticados" on lv_horarios;
create policy "solo_autenticados" on lv_horarios
  for all to authenticated using (true) with check (true);
select 'lv_horarios lista' as resultado;
