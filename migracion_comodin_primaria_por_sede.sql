-- ═══════════════════════════════════════════════════════════════
-- SABIE — Comodín de primaria acotado a "primaria de su sede"
-- (julio 2026, sesión 24)
--
-- PROBLEMA (confirmado con el diagnóstico):
--   El comodín "Todas las materias" / área "Primaria" hacía que
--   lv_acceso_total() fuera TRUE → esos docentes veían TODO el
--   colegio, incluido bachillerato (p. ej. las planillas de Sociales).
--   Ej.: luisherr13 → rol docente, comodín true, cursos por asignación 0
--   → solo veía por el "acceso total" del comodín.
--
-- DECISIÓN (Francy):
--   · Acceso TOTAL real = solo coordinación / rector (es_coordinacion()).
--   · El comodín de primaria pasa a significar: "todas las materias de
--     los grados de PRIMARIA (preescolar a 5°) de MI SEDE" — ni
--     bachillerato, ni otras sedes.
--
-- QUÉ CAMBIA (solo 3 funciones; las políticas por_curso NO se tocan):
--   · lv_es_primaria(grado)  → NUEVA. true si el grado es preescolar..5°.
--   · lv_acceso_total()      → ahora = es_coordinacion() únicamente.
--   · lv_mis_cursos()        → se le agrega la rama del comodín por sede.
--
-- SEGURO / REVERSIBLE:
--   · Solo redefine funciones (idempotente). Las 8 políticas por_curso
--     siguen igual y las usan.
--   · Red de seguridad: un director de grupo de primaria sigue viendo
--     su grupo por el campo "dirige" aunque falte la sede en el curso.
--   · ROLLBACK al final (restaura las funciones como estaban en fase 2).
--
-- ⚠️ CORRE PRIMERO la sección 0 (solo lectura) y confirma que los
--    cursos de primaria tienen sede. Si no la tienen, esos docentes
--    verían solo lo que dirigen hasta estampar la sede en los cursos.
-- ═══════════════════════════════════════════════════════════════


-- ── 0. VERIFICACIÓN PREVIA (solo lectura) ───────────────────────
select coalesce(nullif(datos->>'sede',''),'(sin sede)') as sede,
       count(*) as cursos
from cursos where coalesce(datos->>'_eliminado','')<>'true'
group by 1 order by 2 desc;

select datos->>'nombre' as docente,
       coalesce(nullif(datos->>'sede',''),'(sin sede)') as sede
from lv_docentes
where datos->>'email' in ('danarlysmartinez@gmail.com','dhaniramosa@gmail.com',
                          'Lic.dianamonteroj@hotmail.com','luisherr13@gmail.com');


-- ── 1. Helper: ¿el grado es de primaria (preescolar a 5°)? ──────
--   Acepta "1°".."5°", "5", preescolar por nombre (con o sin tildes).
--   Bachillerato ("6°".."11°", "Sexto"...) → false.
create or replace function public.lv_es_primaria(g text)
returns boolean language sql immutable as $$
  select case
    when (regexp_match(coalesce(g,''), '(\d+)'))[1] is not null
      then ((regexp_match(g, '(\d+)'))[1])::int between 0 and 5
    else translate(lower(coalesce(g,'')), 'áéíóúñ', 'aeioun')
         ~ '(prejardin|jardin|transicion|preescolar|parvulo)'
  end;
$$;


-- ── 2. Acceso total = SOLO coordinación / rector ────────────────
--   (antes también lo daba el comodín; ya no).
create or replace function public.lv_acceso_total()
returns boolean language sql security definer stable set search_path = public as $$
  select public.es_coordinacion();
$$;


-- ── 3. Mis cursos: asignación + dirección de grupo + comodín-sede ─
create or replace function public.lv_mis_cursos()
returns setof text language sql security definer stable set search_path = public as $$
  select c.id::text
  from cursos c
  where coalesce(c.datos->>'_eliminado','') <> 'true'
    and (
      -- 1) asignación por materia+grado (grupo con comodín vacío)
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
      -- 2) director de grupo (dirige): todas las materias de ese grado-grupo
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
      -- 3) comodín de PRIMARIA acotado a MI SEDE (reemplaza el antiguo
      --    "acceso total" del comodín). Solo grados de primaria y solo
      --    cursos cuya sede coincide con la del docente.
      or (
        public.lv_es_primaria(c.datos->>'grado')
        and public.lv_norm(coalesce(c.datos->>'sede','')) <> ''
        and public.lv_norm(coalesce(c.datos->>'sede','')) = public.lv_norm(
              (select d.datos->>'sede' from lv_docentes d
               where d.id::text = public.lv_mi_docente_id() limit 1))
        and exists (
          select 1 from lv_asignaciones a
          where a.datos->>'docenteId' = public.lv_mi_docente_id()
            and coalesce(a.datos->>'_eliminado','') <> 'true'
            and ( public.lv_norm(a.datos->>'area')    = public.lv_norm('Primaria')
               or public.lv_norm(a.datos->>'materia') = public.lv_norm('Todas las materias') )
        )
      )
    );
$$;


-- ── 4. VERIFICACIÓN (solo lectura) ──────────────────────────────
-- 4a. Ya nadie tiene acceso total por comodín: acceso_total solo debe
--     ser true para coordinación/rector. (Se evalúa por docente abajo.)
-- 4b. Para cada docente de primaria: cuántos cursos de PRIMARIA de su
--     sede resolvería ahora (debería ser > 0 si su sede está en cursos,
--     y NINGÚN curso de bachillerato).
select d.datos->>'nombre' as docente,
       d.datos->>'sede'   as sede_docente,
       (select count(*) from cursos c
          where coalesce(c.datos->>'_eliminado','')<>'true'
            and public.lv_es_primaria(c.datos->>'grado')
            and public.lv_norm(coalesce(c.datos->>'sede','')) = public.lv_norm(coalesce(d.datos->>'sede','')) )
         as cursos_primaria_de_su_sede
from lv_docentes d
where d.datos->>'email' in ('danarlysmartinez@gmail.com','dhaniramosa@gmail.com',
                            'Lic.dianamonteroj@hotmail.com','luisherr13@gmail.com')
order by docente;


-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK  (restaura las funciones como estaban en la Fase 2)
-- Descomenta y corre solo si quieres revertir.
-- ═══════════════════════════════════════════════════════════════
-- create or replace function public.lv_acceso_total()
-- returns boolean language sql security definer stable set search_path = public as $$
--   select public.es_coordinacion() or exists (
--     select 1 from lv_asignaciones a
--     where a.datos->>'docenteId' = public.lv_mi_docente_id()
--       and coalesce(a.datos->>'_eliminado','') <> 'true'
--       and ( public.lv_norm(a.datos->>'area')    = public.lv_norm('Primaria')
--          or public.lv_norm(a.datos->>'materia') = public.lv_norm('Todas las materias') )
--   );
-- $$;
-- -- (y volver a crear lv_mis_cursos SIN la rama 3, como en
-- --  migracion_etapa2_fase2.sql)
