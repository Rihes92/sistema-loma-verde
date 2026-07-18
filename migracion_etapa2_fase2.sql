-- ═══════════════════════════════════════════════════════════════
-- SABIE — Arquitectura ETAPA 2 · FASE 2 (julio 2026)
-- Filtrado POR CURSO (RLS): cada docente ve solo los cursos que le
-- corresponden por asignación o por dirección de grupo.
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- ORDEN RECOMENDADO
--   1. Desplegar primero el código de esta sesión (git push → Vercel).
--   2. Correr esta migración.
--   3. Probar con una cuenta docente normal (no admin) — ver sección
--      VERIFICACIÓN al final.
--
-- QUÉ HACE
--   Reemplaza la política abierta "solo_autenticados" por una política
--   "por_curso" en estas tablas:
--     · cursos          → mis cursos (asignación materia+grado+grupo,
--                         o dirección de grupo "dirige", cualquier materia)
--     · estudiantes     → cursoId ∈ mis cursos
--     · notas           → cursoId ∈ mis cursos
--     · asistencia      → cursoId ∈ mis cursos (o el prefijo del id
--                         "cursoId_fecha" si el campo falta)
--     · lv_observador   → estId → estudiante → su curso comparte
--                         grado-grupo con alguno de mis cursos
--     · lv_piar         → igual que observador (cadena por estId)
--     · lv_acudientes   → algún hijo con grado/grupo de mis cursos
--     · lv_banco        → materia del ítem ∈ mis asignaciones
--                         (compartido por MATERIA, decisión de Fase 1)
--
--   NO se tocan: lv_planeadores y lv_examenes/lv11_examenes (compartidos
--   a propósito), lv_boletines (solo guarda la configuración 'cfg',
--   compartida), lv_herramientas (se revisa aparte), lv_malla,
--   lv_eventos, lv_horario, lv_comunicados, permisos, centros, etc.
--
-- CÓMO SABE QUIÉN ERES (el "puente")
--   correo del token (auth.jwt) → lv_docentes.datos->>'email'
--   → id del docente → lv_asignaciones.datos->>'docenteId'
--   → {materia, grado, grupo} → cursos.
--   Además: lv_docentes.datos->>'dirige' ("6-601, 7-701") da acceso a
--   TODAS las materias de esos grado-grupo (director de grupo:
--   boletines, mi grupo, analítica siguen completos).
--   Comodines respetados: área 'Primaria' o materia 'Todas las
--   materias' = acceso total. es_coordinacion() = acceso total.
--
-- POR QUÉ ES SEGURO / REVERSIBLE (mismas garantías que la Fase 1)
--   · TRANSICIONAL: un registro que NO se puede resolver (sin cursoId,
--     sin estId, estudiante o curso que ya no existe, hijo sin grado)
--     sigue VISIBLE para todos — nadie pierde datos viejos o raros.
--     El filtro solo muerde sobre registros bien referenciados.
--   · Un docente sin correo vinculado en lv_docentes no resuelve
--     ningún curso → vería solo lo no-resoluble. El correo ya es
--     requisito del login, así que en la práctica todos lo tienen;
--     la verificación 2c lista los que falten.
--   · IDEMPOTENTE: puedes correrla varias veces.
--   · ROLLBACK completo al final (restaura "solo_autenticados").
-- ═══════════════════════════════════════════════════════════════

-- ── 0. Utilidades ───────────────────────────────────────────────

-- Normalización idéntica a la de la app (norm de 10/13):
-- minúsculas, sin '°' y sin espacios.
create or replace function public.lv_norm(t text)
returns text language sql immutable as $$
  select lower(replace(replace(coalesce(t,''), '°', ''), ' ', ''));
$$;

-- Id del docente (tabla lv_docentes) del usuario actual, por correo.
create or replace function public.lv_mi_docente_id()
returns text language sql security definer stable set search_path = public as $$
  select d.id::text
  from lv_docentes d
  where lower(trim(coalesce(d.datos->>'email',''))) =
        lower(trim(coalesce(auth.jwt()->>'email','')))
    and lower(trim(coalesce(d.datos->>'email',''))) <> ''
    and coalesce(d.datos->>'_eliminado','') <> 'true'
  limit 1;
$$;

-- ¿Acceso total? (coordinación, o comodines Primaria / Todas las materias)
create or replace function public.lv_acceso_total()
returns boolean language sql security definer stable set search_path = public as $$
  select public.es_coordinacion() or exists (
    select 1 from lv_asignaciones a
    where a.datos->>'docenteId' = public.lv_mi_docente_id()
      and coalesce(a.datos->>'_eliminado','') <> 'true'
      and ( public.lv_norm(a.datos->>'area')    = public.lv_norm('Primaria')
         or public.lv_norm(a.datos->>'materia') = public.lv_norm('Todas las materias') )
  );
$$;

-- Mis cursos: por asignación (materia+grado, grupo con comodín vacío)
-- o por dirección de grupo (campo "dirige", cualquier materia).
create or replace function public.lv_mis_cursos()
returns setof text language sql security definer stable set search_path = public as $$
  select c.id::text
  from cursos c
  where coalesce(c.datos->>'_eliminado','') <> 'true'
    and (
      exists (
        select 1 from lv_asignaciones a
        where a.datos->>'docenteId' = public.lv_mi_docente_id()
          and coalesce(a.datos->>'_eliminado','') <> 'true'
          and public.lv_norm(a.datos->>'materia') = public.lv_norm(c.datos->>'materia')
          and public.lv_norm(a.datos->>'grado')   = public.lv_norm(c.datos->>'grado')
          and ( public.lv_norm(a.datos->>'grupo') = ''
             or public.lv_norm(c.datos->>'grupo') = ''
             or public.lv_norm(a.datos->>'grupo') = public.lv_norm(c.datos->>'grupo') )
      )
      or exists (
        select 1
        from lv_docentes d,
             unnest(string_to_array(coalesce(d.datos->>'dirige',''), ',')) as tok
        where d.id::text = public.lv_mi_docente_id()
          and trim(tok) <> ''
          and public.lv_norm(split_part(trim(tok),'-',1)) = public.lv_norm(c.datos->>'grado')
          and ( public.lv_norm(split_part(trim(tok),'-',2)) = ''
             or public.lv_norm(c.datos->>'grupo') = ''
             or public.lv_norm(split_part(trim(tok),'-',2)) = public.lv_norm(c.datos->>'grupo') )
      )
    );
$$;

-- ¿Puedo ver un registro anclado a este cursoId?
-- true si: sin cursoId (transición) · curso ya no existe (transición)
-- · o el curso es mío.
create or replace function public.lv_curso_visible(cid text)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(cid,'') = ''
      or not exists (select 1 from cursos c where c.id::text = cid)
      or cid in (select public.lv_mis_cursos());
$$;

-- ¿Puedo ver un registro anclado a este estudiante (estId)?
-- Cadena: estId → estudiante → su curso → comparte GRADO-GRUPO con
-- alguno de mis cursos (cualquier materia: cubre director de grupo y
-- docentes de la misma clase). Transicional si algo no resuelve.
create or replace function public.lv_est_visible(eid text)
returns boolean language sql security definer stable set search_path = public as $$
  with est as (
    select e.datos->>'cursoId' as cid
    from estudiantes e
    where e.id::text = coalesce(eid,'')
    limit 1
  ),
  cur as (
    select c.datos->>'grado' as grado, c.datos->>'grupo' as grupo
    from cursos c, est
    where c.id::text = est.cid
    limit 1
  )
  select coalesce(eid,'') = ''
      or not exists (select 1 from est)             -- estudiante no existe
      or not exists (select 1 from cur)             -- curso no existe
      or exists (
        select 1 from cursos m, cur
        where m.id::text in (select public.lv_mis_cursos())
          and public.lv_norm(m.datos->>'grado') = public.lv_norm(cur.grado)
          and ( public.lv_norm(m.datos->>'grupo') = ''
             or public.lv_norm(cur.grupo) = ''
             or public.lv_norm(m.datos->>'grupo') = public.lv_norm(cur.grupo) )
      );
$$;

-- ¿Puedo ver este acudiente? Por los grado/grupo de sus hijos.
-- Transicional: sin hijos, o ningún hijo con grado → visible.
create or replace function public.lv_acudiente_visible(d jsonb)
returns boolean language sql security definer stable set search_path = public as $$
  select jsonb_typeof(d->'hijos') is distinct from 'array'
      or not exists (
        select 1 from jsonb_array_elements(d->'hijos') h
        where public.lv_norm(h->>'grado') <> ''
      )
      or exists (
        select 1
        from jsonb_array_elements(d->'hijos') h
        join cursos m on m.id::text in (select public.lv_mis_cursos())
        where public.lv_norm(h->>'grado') = public.lv_norm(m.datos->>'grado')
          and ( public.lv_norm(h->>'grupo') = ''
             or public.lv_norm(m.datos->>'grupo') = ''
             or public.lv_norm(h->>'grupo') = public.lv_norm(m.datos->>'grupo') )
      );
$$;

-- ¿Puedo ver este ítem del banco? Compartido por MATERIA.
create or replace function public.lv_materia_visible(mat text)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(mat,'') = ''
      or exists (
        select 1 from lv_asignaciones a
        where a.datos->>'docenteId' = public.lv_mi_docente_id()
          and coalesce(a.datos->>'_eliminado','') <> 'true'
          and public.lv_norm(a.datos->>'materia') = public.lv_norm(mat)
      );
$$;

-- ── 1. Políticas por tabla ──────────────────────────────────────
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('cursos',        '(public.lv_acceso_total() or coalesce(datos->>''materia'','''') = '''' or id::text in (select public.lv_mis_cursos()))'),
      ('estudiantes',   '(public.lv_acceso_total() or public.lv_curso_visible(datos->>''cursoId''))'),
      ('notas',         '(public.lv_acceso_total() or public.lv_curso_visible(datos->>''cursoId''))'),
      ('asistencia',    '(public.lv_acceso_total() or public.lv_curso_visible(coalesce(nullif(datos->>''cursoId'',''''), split_part(coalesce(datos->>''id'',''''),''_'',1))))'),
      ('lv_observador', '(public.lv_acceso_total() or public.lv_est_visible(datos->>''estId''))'),
      ('lv_piar',       '(public.lv_acceso_total() or public.lv_est_visible(datos->>''estId''))'),
      ('lv_acudientes', '(public.lv_acceso_total() or public.lv_acudiente_visible(datos))'),
      ('lv_banco',      '(public.lv_acceso_total() or public.lv_materia_visible(datos->>''materia''))')
    ) as t(tabla, predicado)
  loop
    if to_regclass('public.'||r.tabla) is null then
      raise notice 'Tabla % no existe — se omite.', r.tabla;
      continue;
    end if;
    execute format('alter table %I enable row level security', r.tabla);
    execute format('drop policy if exists "solo_autenticados" on %I', r.tabla);
    execute format('drop policy if exists "por_curso" on %I', r.tabla);
    execute format(
      'create policy "por_curso" on %I for all to authenticated using %s with check %s',
      r.tabla, r.predicado, r.predicado
    );
    raise notice 'OK — política por_curso aplicada en %', r.tabla;
  end loop;
end $$;

-- ── 2. VERIFICACIÓN — corre esto y pega los resultados en el chat ─

-- 2a. Políticas activas (debe verse "por_curso" en las 8 tablas)
select tablename as tabla, policyname as politica
from pg_policies
where schemaname = 'public'
  and tablename in ('cursos','estudiantes','notas','asistencia',
                    'lv_observador','lv_piar','lv_acudientes','lv_banco')
order by tablename;

-- 2b. El puente resuelve TU cuenta (como admin verás soy_coordinacion
--     = true; lo importante es que no dé error).
select public.lv_mi_docente_id()  as mi_docente_id,
       public.es_coordinacion()   as soy_coordinacion,
       public.lv_acceso_total()   as acceso_total,
       (select count(*) from public.lv_mis_cursos()) as mis_cursos;

-- 2c. Docentes SIN correo vinculado (no resolverán ningún curso —
--     completar su ficha en Coordinación; los que nunca entran a la
--     app no importan aún):
select d.id, d.datos->>'nombre' as nombre
from lv_docentes d
where lower(trim(coalesce(d.datos->>'email',''))) = ''
  and coalesce(d.datos->>'_eliminado','') <> 'true';

-- 2d. Registros no-resolubles que quedarán visibles para todos
--     (candidatos a backfill después; números altos = normal al inicio):
select 'observador sin estId' as caso, count(*) from lv_observador
  where coalesce(datos->>'estId','') = ''
union all
select 'piar sin estId', count(*) from lv_piar
  where coalesce(datos->>'estId','') = ''
union all
select 'estudiantes sin cursoId', count(*) from estudiantes
  where coalesce(datos->>'cursoId','') = ''
union all
select 'notas sin cursoId', count(*) from notas
  where coalesce(datos->>'cursoId','') = ''
union all
select 'banco sin materia', count(*) from lv_banco
  where coalesce(datos->>'materia','') = '';


-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK — REVERTIR LA FASE 2 (dejar todo como estaba)
-- Copia SOLO este bloque en una consulta nueva y córrelo si algo
-- se ve mal. Restaura la política abierta "solo_autenticados".
-- Las funciones lv_* pueden quedarse creadas: sin políticas que las
-- usen no hacen nada.
-- ═══════════════════════════════════════════════════════════════
-- do $$
-- declare
--   t text;
--   tablas text[] := array['cursos','estudiantes','notas','asistencia',
--                          'lv_observador','lv_piar','lv_acudientes','lv_banco'];
-- begin
--   foreach t in array tablas loop
--     if to_regclass('public.'||t) is null then continue; end if;
--     execute format('drop policy if exists "por_curso" on %I', t);
--     execute format('drop policy if exists "solo_autenticados" on %I', t);
--     execute format('create policy "solo_autenticados" on %I for all to authenticated using (true) with check (true)', t);
--     raise notice 'Revertida %', t;
--   end loop;
-- end $$;
