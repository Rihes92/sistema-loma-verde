-- ═══════════════════════════════════════════════════════════════
-- SABIE — Valoración descriptiva de Preescolar (jul 2026, sesión 26j)
-- Prejardín/Jardín/Transición no se califican con la tabla numérica de
-- Calificaciones (1.0–5.0) — el boletín de estos grados es descriptivo por
-- dimensiones del MEN. Se guarda en su propia tabla (no en lv_calificaciones)
-- para no mezclar dos motores de valoración distintos.
-- Ejecutar en: Supabase → SQL Editor → Run  (idempotente)
-- ═══════════════════════════════════════════════════════════════
create table if not exists lv_preescolar (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_preescolar;
create trigger tg_actualizado_en before insert or update on lv_preescolar
  for each row execute function public.tocar_actualizado_en();
alter table lv_preescolar enable row level security;
-- Mismo nivel de dato de aula que lv_calificaciones/lv_observador: cualquier
-- docente autenticado puede leer y escribir (filtrado real por curso queda
-- pendiente de la Fase 2 de arquitectura, igual que el resto de estas tablas).
drop policy if exists "solo_autenticados" on lv_preescolar;
create policy "solo_autenticados" on lv_preescolar
  for all to authenticated using (true) with check (true);
select 'lv_preescolar lista' as resultado;
