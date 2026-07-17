-- ═══════════════════════════════════════════════════════════════
-- SABIE — Módulo de Permisos Docentes (jul 2026)
-- Ejecutar en: Supabase → SQL Editor → Run  (idempotente)
-- ═══════════════════════════════════════════════════════════════
create table if not exists lv_permisos (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_permisos;
create trigger tg_actualizado_en before insert or update on lv_permisos
  for each row execute function public.tocar_actualizado_en();
alter table lv_permisos enable row level security;
drop policy if exists "solo_autenticados" on lv_permisos;
create policy "solo_autenticados" on lv_permisos
  for all to authenticated using (true) with check (true);
select 'lv_permisos lista' as resultado;
