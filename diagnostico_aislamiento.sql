-- ═══════════════════════════════════════════════════════════════
-- SABIE — DIAGNÓSTICO del aislamiento por docente (SOLO LECTURA)
--
-- Este script NO cambia nada: solo consulta. Sirve para descubrir
-- POR QUÉ un docente ve planillas que no son suyas, antes de tocar
-- cualquier dato.
--
-- CÓMO USARLO
--   Supabase → SQL Editor → New query → pega TODO → Run.
--   Corre por bloques (cada SELECT da su tabla de resultados) y
--   copia los resultados de vuelta al chat.
--
--   En los bloques marcados con  «CORREO_AQUI»  reemplaza ese texto
--   por el correo del docente que reporta el problema (entre comillas
--   simples) y vuelve a correr ese bloque.
-- ═══════════════════════════════════════════════════════════════


-- ── A. ¿Qué política está activa en cada tabla sensible? ─────────
--   Esperado: "por_curso" en las 8 tablas. Si aparece
--   "solo_autenticados", esa tabla NO está aislada (todos la ven).
select tablename as tabla, policyname as politica
from pg_policies
where schemaname = 'public'
  and tablename in ('cursos','estudiantes','notas','asistencia',
                    'lv_observador','lv_piar','lv_acudientes','lv_banco')
order by tablename, policyname;


-- ── B. ¿Quién tiene rol elevado? (coordinador/admin = ve TODO) ───
--   Aquí NO debería aparecer ningún docente normal. Si un profe de
--   aula sale como 'coordinador' o 'admin', esa es la fuga: hay que
--   bajarlo a 'docente'.
select email, rol
from perfiles
where rol in ('admin','coordinador')
order by rol, email;


-- ── C. ¿Quién tiene asignación COMODÍN? (también da acceso total) ─
--   Un docente con área 'Primaria' o materia 'Todas las materias'
--   ve todo por diseño. Revisa que solo lo tengan quienes deben.
select d.datos->>'nombre'  as docente,
       d.datos->>'email'   as correo,
       a.datos->>'area'    as area,
       a.datos->>'materia' as materia,
       a.datos->>'grado'   as grado,
       a.datos->>'grupo'   as grupo
from lv_asignaciones a
join lv_docentes d on d.id::text = a.datos->>'docenteId'
where coalesce(a.datos->>'_eliminado','') <> 'true'
  and ( lower(replace(replace(coalesce(a.datos->>'area',''),   '°',''),' ','')) = 'primaria'
     or lower(replace(replace(coalesce(a.datos->>'materia',''),'°',''),' ','')) = 'todaslasmaterias' )
order by docente;


-- ── D. Higiene de datos: registros "transición" que se ven de más ─
--   Un registro sin cursoId (o un curso sin materia) queda VISIBLE
--   para todos a propósito, hasta hacer el backfill. Números altos =
--   candidatos a limpiar.
select 'cursos sin materia'        as caso, count(*) as n from cursos       where coalesce(datos->>'materia','')='' and coalesce(datos->>'_eliminado','')<>'true'
union all
select 'estudiantes sin cursoId',        count(*)      from estudiantes  where coalesce(datos->>'cursoId','')='' and coalesce(datos->>'_eliminado','')<>'true'
union all
select 'notas sin cursoId',              count(*)      from notas        where coalesce(datos->>'cursoId','')='' and coalesce(datos->>'_eliminado','')<>'true'
union all
select 'observador sin estId',           count(*)      from lv_observador where coalesce(datos->>'estId','')=''  and coalesce(datos->>'_eliminado','')<>'true'
union all
select 'acudientes sin hijos con grado', count(*)      from lv_acudientes
   where coalesce(datos->>'_eliminado','')<>'true'
     and not exists (select 1 from jsonb_array_elements(coalesce(datos->'hijos','[]'::jsonb)) h
                     where lower(replace(replace(coalesce(h->>'grado',''),'°',''),' ',''))<>'');


-- ── E. Docentes registrados SIN correo (no resuelven ningún curso) ─
select d.datos->>'nombre' as docente
from lv_docentes d
where lower(trim(coalesce(d.datos->>'email',''))) = ''
  and coalesce(d.datos->>'_eliminado','') <> 'true'
order by docente;


-- ── F. SIMULACIÓN POR DOCENTE  (reemplaza CORREO_AQUI y corre) ────
--   Muestra, para ESE correo: su rol, si tiene comodín, y cuántos
--   cursos resolvería su asignación. Así ves de un vistazo si un
--   profe "ve todo" por rol, por comodín, o si está bien acotado.
with param as ( select lower(trim('CORREO_AQUI')) as correo ),
yo as (
  select d.id::text as docente_id, d.datos->>'nombre' as nombre
  from lv_docentes d, param
  where lower(trim(coalesce(d.datos->>'email',''))) = param.correo
  limit 1
)
select
  (select correo from param)                                     as correo,
  (select nombre from yo)                                        as docente,
  (select docente_id from yo)                                    as docente_id,
  (select rol from perfiles p, param
     where lower(trim(coalesce(p.email,''))) = param.correo limit 1) as rol_en_perfiles,
  exists(
    select 1 from lv_asignaciones a
    where a.datos->>'docenteId' = (select docente_id from yo)
      and coalesce(a.datos->>'_eliminado','') <> 'true'
      and ( lower(replace(replace(coalesce(a.datos->>'area',''),   '°',''),' ','')) = 'primaria'
         or lower(replace(replace(coalesce(a.datos->>'materia',''),'°',''),' ','')) = 'todaslasmaterias' )
  )                                                              as tiene_comodin_acceso_total,
  (select count(*) from cursos c
     where coalesce(c.datos->>'_eliminado','') <> 'true'
       and exists(
         select 1 from lv_asignaciones a
         where a.datos->>'docenteId' = (select docente_id from yo)
           and coalesce(a.datos->>'_eliminado','') <> 'true'
           and lower(replace(replace(coalesce(a.datos->>'materia',''),'°',''),' ','')) = lower(replace(replace(coalesce(c.datos->>'materia',''),'°',''),' ',''))
           and lower(replace(replace(coalesce(a.datos->>'grado',''),  '°',''),' ','')) = lower(replace(replace(coalesce(c.datos->>'grado',''),  '°',''),' ',''))
       ))                                                        as cursos_que_resolveria;
