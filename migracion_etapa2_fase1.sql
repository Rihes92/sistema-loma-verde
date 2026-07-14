-- ═══════════════════════════════════════════════════════════════
-- SABIE — Arquitectura ETAPA 2 · FASE 1 (julio 2026)
-- Filtrado por DUEÑO (RLS) en las tablas de RESULTADOS de estudiantes.
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- QUÉ HACE
--   Cambia la lectura de estas tablas para que cada docente vea SOLO
--   sus propios registros (los que tienen datos->>'_owner' = su auth uid).
--   Coordinación/Admin sigue viendo TODO (vía public.es_coordinacion()).
--
--   Tablas afectadas (datos de desempeño, claramente privados):
--     · lv_resultados          (resultados de exámenes 6°–10°)
--     · lv11_resultados        (resultados de exámenes 11°)
--     · lv11_simulacros_ext    (simulacros ICFES externos)
--
--   NO se tocan: planeadores y exámenes (compartidos a propósito),
--   banco de preguntas (irá en Fase 2, compartido por materia) ni
--   lv_herramientas (alimenta la planilla; se revisa aparte).
--
-- POR QUÉ ES SEGURO / REVERSIBLE
--   · Política de TRANSICIÓN: un registro es visible si es tuyo
--     (_owner = auth.uid()) O si aún no tiene dueño (_owner IS NULL)
--     O si eres coordinación. Los registros VIEJOS (creados antes de
--     desplegar la Fase 0) tienen _owner NULL, así que SIGUEN VISIBLES
--     para todos: NADIE pierde datos. El filtrado solo "muerde" sobre
--     registros NUEVOS que ya traen su etiqueta _owner.
--   · Las ESCRITURAS no se bloquean: se permite escribir lo propio o
--     lo que no tiene dueño; nunca sobrescribir lo de otro docente.
--   · Es IDEMPOTENTE: puedes correrla varias veces.
--   · Al final hay un bloque de ROLLBACK para revertir en un clic.
--
-- REQUISITO PREVIO
--   Haber desplegado la FASE 0 (etiquetado _owner en sync.js). Si aún
--   no, esta migración es inofensiva pero no filtra nada todavía
--   (todos los _owner serían NULL). Correrla igual no hace daño.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Aplicar la política por dueño (transición) ───────────────
do $$
declare
  t     text;
  pred  text := '(datos->>''_owner'' = (auth.uid())::text '
             || 'or datos->>''_owner'' is null '
             || 'or public.es_coordinacion())';
  tablas text[] := array['lv_resultados','lv11_resultados','lv11_simulacros_ext'];
begin
  foreach t in array tablas loop
    if to_regclass('public.'||t) is null then
      raise notice 'Tabla % no existe — se omite.', t;
      continue;
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'datos'
    ) then
      raise notice 'Tabla % no tiene columna "datos" — se omite (revisar).', t;
      continue;
    end if;

    execute format('alter table %I enable row level security', t);
    -- quitar la política abierta anterior y cualquier versión previa de esta
    execute format('drop policy if exists "solo_autenticados" on %I', t);
    execute format('drop policy if exists "propio_owner" on %I', t);
    -- una sola política "for all": using controla lectura/edición/borrado,
    -- with check controla inserción/edición.
    execute format(
      'create policy "propio_owner" on %I for all to authenticated using %s with check %s',
      t, pred, pred
    );
    raise notice 'OK — política propio_owner aplicada en %', t;
  end loop;
end $$;

-- ── 2. VERIFICACIÓN — pega estos resultados en el chat ──────────

-- 2a. Políticas activas en las tablas afectadas (debe verse "propio_owner")
select tablename as tabla, policyname as politica, cmd as operacion
from pg_policies
where schemaname = 'public'
  and tablename in ('lv_resultados','lv11_resultados','lv11_simulacros_ext')
order by tablename, policyname;

-- 2b. Cuántos registros ya tienen dueño (_owner) vs. cuántos son viejos
--     (los viejos, _owner NULL, siguen visibles para todos hasta el backfill).
select 'lv_resultados' as tabla,
       count(*) as total,
       count(*) filter (where datos->>'_owner' is not null) as con_owner,
       count(*) filter (where datos->>'_owner' is null)     as sin_owner_viejos
from lv_resultados
union all
select 'lv11_resultados',
       count(*), count(*) filter (where datos->>'_owner' is not null),
       count(*) filter (where datos->>'_owner' is null)
from lv11_resultados
union all
select 'lv11_simulacros_ext',
       count(*), count(*) filter (where datos->>'_owner' is not null),
       count(*) filter (where datos->>'_owner' is null)
from lv11_simulacros_ext;


-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK — REVERTIR LA FASE 1 (dejar todo como estaba)
-- Copia SOLO este bloque en una consulta nueva y córrelo si algo
-- se ve mal. Restaura la política abierta "solo_autenticados".
-- ═══════════════════════════════════════════════════════════════
-- do $$
-- declare
--   t text;
--   tablas text[] := array['lv_resultados','lv11_resultados','lv11_simulacros_ext'];
-- begin
--   foreach t in array tablas loop
--     if to_regclass('public.'||t) is null then continue; end if;
--     execute format('drop policy if exists "propio_owner" on %I', t);
--     execute format('drop policy if exists "solo_autenticados" on %I', t);
--     execute format('create policy "solo_autenticados" on %I for all to authenticated using (true) with check (true)', t);
--     raise notice 'Revertida %', t;
--   end loop;
-- end $$;
