-- ═══════════════════════════════════════════════════════════════════════
-- SABIE — DETECTAR Y FUSIONAR DOCENTES DUPLICADOS
-- Creado: auditoría previa al lanzamiento (jul 26, 2026)
--
-- EL PROBLEMA:
-- La importación de la Asignación Académica empareja docentes por NOMBRE.
-- Cuando el nombre del Excel no coincidía exactamente con el ya registrado
-- (una tilde, una letra, un segundo nombre), en vez de actualizar la ficha
-- existente creó una NUEVA. Resultado: la misma persona aparece dos veces.
--
-- POR QUÉ ES GRAVE:
-- Los datos quedaron repartidos entre las dos fichas:
--   · la ficha VIEJA suele tener el CORREO (con el que la persona entra) y
--     el campo "Dirige" (director de grupo);
--   · la ficha NUEVA suele tener la ASIGNACIÓN ACADÉMICA (sus materias).
-- Efecto: el docente entra pero NO VE NINGUNA MATERIA, porque sus materias
-- están colgadas de la otra ficha.
--
-- CÓMO USAR ESTE ARCHIVO:
--   PASO 1 — corre solo la sección 1 (no modifica nada) y revisa la lista.
--   PASO 2 — corre la sección 2 (tampoco modifica nada): muestra qué haría.
--   PASO 3 — si la vista previa se ve bien, corre la sección 3.
--   PASO 4 — corre la sección 4 para verificar.
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- SECCIÓN 0 — Preparación (funciones de comparación de nombres)
-- ───────────────────────────────────────────────────────────────────────
create extension if not exists fuzzystrmatch;

create or replace function lv_norm_nombre(t text)
returns text language sql immutable as $$
  select regexp_replace(
           upper(translate(coalesce(t,''),
             'áéíóúüñÁÉÍÓÚÜÑàèìòùÀÈÌÒÙ',
             'aeiounAEIOUNAEIOUAEIOU')),
           '[^A-Z ]', '', 'g')
$$;

-- Compara por APELLIDOS + primer nombre, tolerando diferencias pequeñas.
create or replace function lv_clave_persona(t text)
returns text language sql immutable as $$
  select array_to_string(
    (select array_agg(p order by p)
     from unnest(string_to_array(trim(regexp_replace(lv_norm_nombre(t), ' +', ' ', 'g')), ' ')) p
     where length(p) > 2), ' ')
$$;


-- ═══════════════════════════════════════════════════════════════════════
-- SECCIÓN 1 — DIAGNÓSTICO (solo lectura)
-- Muestra los posibles duplicados y qué tiene cada ficha.
-- ═══════════════════════════════════════════════════════════════════════
with docs as (
  select d.id,
         d.datos->>'nombre'                              as nombre,
         nullif(trim(lower(d.datos->>'email')), '')      as email,
         nullif(trim(d.datos->>'dirige'), '')            as dirige,
         nullif(trim(d.datos->>'sede'), '')              as sede,
         lv_clave_persona(d.datos->>'nombre')            as clave,
         (select count(*) from lv_asignaciones a
           where a.datos->>'docenteId' = d.id
             and coalesce((a.datos->>'_eliminado')::boolean,false) = false) as asignaciones
  from lv_docentes d
  where coalesce((d.datos->>'_eliminado')::boolean, false) = false
),
pares as (
  select a.id as id_a, a.nombre as nombre_a, a.email as email_a, a.dirige as dirige_a, a.asignaciones as asig_a,
         b.id as id_b, b.nombre as nombre_b, b.email as email_b, b.dirige as dirige_b, b.asignaciones as asig_b
  from docs a
  join docs b
    on a.id < b.id
   and (
        a.clave = b.clave
     or levenshtein(a.clave, b.clave) <= 3
     or a.clave like '%' || b.clave || '%'
     or b.clave like '%' || a.clave || '%'
   )
)
select
  nombre_a  as "Ficha A",
  coalesce(email_a,'—')  as "correo A",
  asig_a    as "asig. A",
  coalesce(dirige_a,'—') as "dirige A",
  '  ↔  '   as " ",
  nombre_b  as "Ficha B",
  coalesce(email_b,'—')  as "correo B",
  asig_b    as "asig. B",
  coalesce(dirige_b,'—') as "dirige B"
from pares
order by nombre_a;


-- ═══════════════════════════════════════════════════════════════════════
-- SECCIÓN 2 — VISTA PREVIA DE LA FUSIÓN (solo lectura)
--
-- Regla usada para decidir cuál ficha SE CONSERVA:
--   1º la que tenga CORREO (es la que permite iniciar sesión);
--   2º si ninguna o ambas lo tienen, la que tenga más asignaciones;
--   3º en empate, la más antigua.
-- La ficha conservada recibe lo que le falte (correo, dirige, cédula,
-- sede) y TODAS las asignaciones de la otra. La otra va a la papelera.
-- ═══════════════════════════════════════════════════════════════════════
create or replace view lv_v_fusion as
with docs as (
  select d.id,
         d.datos                                          as datos,
         d.datos->>'nombre'                               as nombre,
         nullif(trim(lower(d.datos->>'email')), '')       as email,
         lv_clave_persona(d.datos->>'nombre')             as clave,
         coalesce((d.datos->>'creado')::bigint, 0)        as creado,
         (select count(*) from lv_asignaciones a
           where a.datos->>'docenteId' = d.id
             and coalesce((a.datos->>'_eliminado')::boolean,false) = false) as asignaciones
  from lv_docentes d
  where coalesce((d.datos->>'_eliminado')::boolean, false) = false
),
grupos as (
  select a.id as id_a, b.id as id_b
  from docs a join docs b
    on a.id < b.id
   and ( a.clave = b.clave
      or levenshtein(a.clave, b.clave) <= 3
      or a.clave like '%' || b.clave || '%'
      or b.clave like '%' || a.clave || '%' )
),
decidido as (
  select
    case when (da.email is not null and db.email is null) then da.id
         when (db.email is not null and da.email is null) then db.id
         when da.asignaciones <> db.asignaciones
              then case when da.asignaciones > db.asignaciones then da.id else db.id end
         else case when da.creado <= db.creado then da.id else db.id end
    end as id_conservar,
    case when (da.email is not null and db.email is null) then db.id
         when (db.email is not null and da.email is null) then da.id
         when da.asignaciones <> db.asignaciones
              then case when da.asignaciones > db.asignaciones then db.id else da.id end
         else case when da.creado <= db.creado then db.id else da.id end
    end as id_descartar
  from grupos g
  join docs da on da.id = g.id_a
  join docs db on db.id = g.id_b
)
select d.id_conservar, d.id_descartar,
       c.nombre as nombre_conservar, c.email as email_conservar, c.asignaciones as asig_conservar,
       x.nombre as nombre_descartar, x.email as email_descartar, x.asignaciones as asig_descartar
from decidido d
join docs c on c.id = d.id_conservar
join docs x on x.id = d.id_descartar;

select
  nombre_conservar                      as "SE CONSERVA",
  coalesce(email_conservar,'(sin correo)') as "su correo",
  asig_conservar                        as "asig. antes",
  asig_conservar + asig_descartar       as "asig. después",
  nombre_descartar                      as "se elimina (a papelera)",
  coalesce(email_descartar,'—')         as "correo que se traslada"
from lv_v_fusion
order by 1;


-- ═══════════════════════════════════════════════════════════════════════
-- SECCIÓN 3 — APLICAR LA FUSIÓN
-- ⚠️ Corre esto SOLO si la vista previa de la sección 2 se ve correcta.
-- ═══════════════════════════════════════════════════════════════════════
begin;

-- 3.1 Trasladar las asignaciones a la ficha que se conserva
update lv_asignaciones a
set datos = jsonb_set(a.datos, '{docenteId}', to_jsonb(f.id_conservar))
from lv_v_fusion f
where a.datos->>'docenteId' = f.id_descartar
  and coalesce((a.datos->>'_eliminado')::boolean,false) = false;

-- 3.2 Completar en la ficha conservada los campos que le falten
update lv_docentes d
set datos = d.datos
  || case when coalesce(trim(d.datos->>'email'),'') = ''
            and coalesce(trim(x.datos->>'email'),'') <> ''
          then jsonb_build_object('email', trim(lower(x.datos->>'email'))) else '{}'::jsonb end
  || case when coalesce(trim(d.datos->>'dirige'),'') = ''
            and coalesce(trim(x.datos->>'dirige'),'') <> ''
          then jsonb_build_object('dirige', x.datos->>'dirige') else '{}'::jsonb end
  || case when coalesce(trim(d.datos->>'cedula'),'') = ''
            and coalesce(trim(x.datos->>'cedula'),'') <> ''
          then jsonb_build_object('cedula', x.datos->>'cedula') else '{}'::jsonb end
  || case when coalesce(trim(d.datos->>'sede'),'') = ''
            and coalesce(trim(x.datos->>'sede'),'') <> ''
          then jsonb_build_object('sede', x.datos->>'sede') else '{}'::jsonb end
  || case when coalesce(trim(d.datos->>'tituloProfesional'),'') = ''
            and coalesce(trim(x.datos->>'tituloProfesional'),'') <> ''
          then jsonb_build_object('tituloProfesional', x.datos->>'tituloProfesional') else '{}'::jsonb end
from lv_v_fusion f
join lv_docentes x on x.id = f.id_descartar
where d.id = f.id_conservar;

-- 3.3 Mandar la ficha duplicada a la papelera (recuperable 30 días)
update lv_docentes d
set datos = d.datos || jsonb_build_object('_eliminado', true,
                                          '_eliminadoEn', extract(epoch from now())*1000)
from lv_v_fusion f
where d.id = f.id_descartar;

commit;


-- ═══════════════════════════════════════════════════════════════════════
-- SECCIÓN 4 — VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════════════════
-- 4.1 ¿Quedan duplicados?
with docs as (
  select d.id, d.datos->>'nombre' as nombre, lv_clave_persona(d.datos->>'nombre') as clave
  from lv_docentes d
  where coalesce((d.datos->>'_eliminado')::boolean, false) = false
)
select a.nombre as "Ficha A", b.nombre as "Ficha B", '⚠️ revisar a mano' as estado
from docs a join docs b
  on a.id < b.id and (a.clave = b.clave or levenshtein(a.clave, b.clave) <= 3);
-- (0 filas = no quedan duplicados)

-- 4.2 Resumen general
select
  count(*)                                                              as docentes_activos,
  count(*) filter (where coalesce(trim(d.datos->>'email'),'') <> '')     as con_correo,
  count(*) filter (where coalesce(trim(d.datos->>'email'),'') =  '')     as sin_correo
from lv_docentes d
where coalesce((d.datos->>'_eliminado')::boolean, false) = false;

-- 4.3 Docentes activos y cuántas materias tiene cada uno
select
  d.datos->>'nombre'                                       as docente,
  coalesce(nullif(trim(lower(d.datos->>'email')),''),'—')  as correo,
  (select count(*) from lv_asignaciones a
    where a.datos->>'docenteId' = d.id
      and coalesce((a.datos->>'_eliminado')::boolean,false) = false) as materias,
  case when coalesce(trim(d.datos->>'email'),'') = '' then '❌ falta correo'
       when (select count(*) from lv_asignaciones a
              where a.datos->>'docenteId' = d.id
                and coalesce((a.datos->>'_eliminado')::boolean,false) = false) = 0
            then '⚠️ sin asignación — entraría y no vería materias'
       else '✅ completo' end                               as estado
from lv_docentes d
where coalesce((d.datos->>'_eliminado')::boolean, false) = false
order by 4, 1;
