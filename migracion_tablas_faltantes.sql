-- ═══════════════════════════════════════════════════════════════
-- SABIE — Crear tablas FALTANTES detectadas en la verificación
-- (jul 2026). Ejecutar en: Supabase → SQL Editor → Run
--
-- Estas 4 tablas están en el código (sync.js → MAPA) pero nunca se
-- crearon en la base: los simulacros de 11° y los resultados de
-- exámenes SOLO existían en el localStorage de cada dispositivo.
-- Al crearlas, la cola de pendientes de cada dispositivo subirá
-- automáticamente lo que tenga guardado (al abrir la app).
-- Idempotente: correr de nuevo no daña nada.
-- ═══════════════════════════════════════════════════════════════

do $$
declare
  t text;
  tablas text[] := array['lv_resultados','lv11_examenes','lv11_resultados','lv11_simulacros_ext'];
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
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "solo_autenticados" on %I', t);
    execute format('create policy "solo_autenticados" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Verificación: deben aparecer las 4 con rls = true
select tablename, rowsecurity as rls
from pg_tables
where schemaname='public'
  and tablename in ('lv_resultados','lv11_examenes','lv11_resultados','lv11_simulacros_ext');
