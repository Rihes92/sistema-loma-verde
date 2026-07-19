-- ═══════════════════════════════════════════════════════════════
-- SABIE — ETAPA 2 · FASE 2b (jul 2026): canonización de grado/grupo/sede
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- POR QUÉ
--   El diagnóstico (jul 19) mostró que el mismo curso vive escrito de
--   formas distintas: cursos con grado "Noveno (9°)" y grupo "3", pero
--   direcciones de grupo "9-903". La Fase 2 comparaba texto normalizado
--   y eso NO coincidía → los directores de grupo no resolvían sus
--   cursos. Esta migración enseña a la RLS la misma canonización que
--   ahora usa la app (LV_CURSO en auth.js):
--     · grado:  "Noveno (9°)" → 9 · "9°" → 9 · "Prejardin" → prejardin
--     · grupo:  "903" (grado 9) → 3 · "1101" (grado 11) → 1 · "01" → 1
--     · sede:   "Cristo Es Mi Luz" → CRI (3 letras, para tokens "1-1 CRI")
--   Solo REEMPLAZA funciones — las políticas "por_curso" de la Fase 2
--   quedan intactas y empiezan a comparar bien al instante.
--
-- REVERSIBLE: volver a correr la sección 0 de migracion_etapa2_fase2.sql
--   restaura las funciones anteriores (o el ROLLBACK de esa misma
--   migración quita las políticas por completo).
-- ═══════════════════════════════════════════════════════════════

-- ── Canonizadores (espejo de LV_CURSO de auth.js) ───────────────

create or replace function public.lv_grado_canon(t text)
returns text language sql immutable as $$
  select case
    when coalesce(t,'') ~ '\(\s*\d+' then
      ((regexp_match(t, '\(\s*(\d+)'))[1])::int::text
    when trim(coalesce(t,'')) ~ '^\d+' then
      ((regexp_match(trim(t), '^(\d+)'))[1])::int::text
    else lower(regexp_replace(translate(coalesce(t,''),
      'áéíóúÁÉÍÓÚñÑ','aeiouAEIOUnN'), '[°\s]', '', 'g'))
  end;
$$;

create or replace function public.lv_grupo_canon(grado text, grupo text)
returns text language sql immutable as $$
  with g as (
    select public.lv_grado_canon(grado) as gc,
           public.lv_norm(coalesce(grupo,'')) as gr
  )
  select case
    when gr !~ '^\d+$' then gr                       -- "unico", "A" → tal cual
    else coalesce(nullif(ltrim(
      case when gc ~ '^\d+$' and length(gr) > length(gc)
                and left(gr, length(gc)) = gc
           then substr(gr, length(gc)+1)             -- "903"→"03", "1101"→"01"
           else gr end,
      '0'), ''), '0')                                -- "03"→"3", "0"→"0"
  end
  from g;
$$;

create or replace function public.lv_sede_code(s text)
returns text language sql immutable as $$
  select upper(left(regexp_replace(translate(coalesce(s,''),
    'áéíóúÁÉÍÓÚñÑ','aeiouAEIOUnN'), '[^a-zA-Z]', '', 'g'), 3));
$$;

-- ── Mis cursos, ahora con comparación canónica ──────────────────
--  · asignación: materia (norm) + grado canónico + grupo canónico
--    (comodín: grupo vacío en cualquiera de los dos lados)
--  · dirige: tokens "9-903" / "9-3" / "1-1 JUA" (sede opcional; solo
--    se exige si el token Y el curso tienen sede)
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
          and public.lv_grado_canon(a.datos->>'grado') = public.lv_grado_canon(c.datos->>'grado')
          and ( public.lv_norm(a.datos->>'grupo') = ''
             or public.lv_norm(c.datos->>'grupo') = ''
             or public.lv_grupo_canon(a.datos->>'grado', a.datos->>'grupo')
              = public.lv_grupo_canon(c.datos->>'grado', c.datos->>'grupo') )
      )
      or exists (
        select 1
        from lv_docentes d,
             unnest(string_to_array(coalesce(d.datos->>'dirige',''), ',')) as tok
        where d.id::text = public.lv_mi_docente_id()
          and trim(tok) <> ''
          and public.lv_grado_canon(split_part(split_part(trim(tok),' ',1),'-',1))
            = public.lv_grado_canon(c.datos->>'grado')
          and ( split_part(split_part(trim(tok),' ',1),'-',2) = ''
             or public.lv_norm(c.datos->>'grupo') = ''
             or public.lv_grupo_canon(
                  split_part(split_part(trim(tok),' ',1),'-',1),
                  split_part(split_part(trim(tok),' ',1),'-',2))
              = public.lv_grupo_canon(c.datos->>'grado', c.datos->>'grupo') )
          and ( public.lv_sede_code(split_part(trim(tok),' ',2)) = ''
             or public.lv_sede_code(c.datos->>'sede') = ''
             or public.lv_sede_code(split_part(trim(tok),' ',2))
              = public.lv_sede_code(c.datos->>'sede') )
      )
    );
$$;

-- ── Cadena estudiante → curso, comparación canónica + sede ──────
create or replace function public.lv_est_visible(eid text)
returns boolean language sql security definer stable set search_path = public as $$
  with est as (
    select e.datos->>'cursoId' as cid
    from estudiantes e
    where e.id::text = coalesce(eid,'')
    limit 1
  ),
  cur as (
    select c.datos->>'grado' as grado, c.datos->>'grupo' as grupo,
           c.datos->>'sede'  as sede
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
          and public.lv_grado_canon(m.datos->>'grado') = public.lv_grado_canon(cur.grado)
          and ( public.lv_norm(m.datos->>'grupo') = ''
             or public.lv_norm(cur.grupo) = ''
             or public.lv_grupo_canon(m.datos->>'grado', m.datos->>'grupo')
              = public.lv_grupo_canon(cur.grado, cur.grupo) )
          and ( public.lv_sede_code(m.datos->>'sede') = ''
             or public.lv_sede_code(cur.sede) = ''
             or public.lv_sede_code(m.datos->>'sede') = public.lv_sede_code(cur.sede) )
      );
$$;

-- ── Acudientes por hijos[].grado/grupo, comparación canónica ────
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
        where public.lv_grado_canon(h->>'grado') = public.lv_grado_canon(m.datos->>'grado')
          and ( public.lv_norm(h->>'grupo') = ''
             or public.lv_norm(m.datos->>'grupo') = ''
             or public.lv_grupo_canon(h->>'grado', h->>'grupo')
              = public.lv_grupo_canon(m.datos->>'grado', m.datos->>'grupo') )
      );
$$;

-- ── VERIFICACIÓN — corre esto aparte y pégalo en el chat ────────
-- Canonizadores con los formatos reales del diagnóstico:
select 'Noveno (9°) + 903'   as caso, public.lv_grado_canon('Noveno (9°)')   as grado, public.lv_grupo_canon('Noveno (9°)','903')    as grupo
union all
select 'Undécimo (11°) + 1101', public.lv_grado_canon('Undécimo (11°)'), public.lv_grupo_canon('Undécimo (11°)','1101')
union all
select 'Décimo (10°) + 3',      public.lv_grado_canon('Décimo (10°)'),   public.lv_grupo_canon('Décimo (10°)','3')
union all
select 'token 6-601',           public.lv_grado_canon('6'),              public.lv_grupo_canon('6','601')
union all
select 'Prejardin-2',           public.lv_grado_canon('Prejardin'),      public.lv_grupo_canon('Prejardin','2')
union all
select 'token 0-1',             public.lv_grado_canon('0'),              public.lv_grupo_canon('0','1');
-- Esperado: 9/3 · 11/1 · 10/3 · 6/1 · prejardin/2 · 0/1
