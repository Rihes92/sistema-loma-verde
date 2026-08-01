-- ═══════════════════════════════════════════════════════════════════════
-- SABIE — REVISIÓN DE DIRECTORES DE GRUPO
-- Creado: jul 26, 2026
--
-- QUÉ REVISA:
-- Un docente accede a Observador, Dirección de Grupo, Boletines y Analítica
-- SOLO si el campo "Dirige" de su ficha coincide con un curso realmente
-- creado en el sistema. Si el texto está mal escrito, o si nadie ha creado
-- todavía el curso de ese grupo, el director entra y no ve nada.
--
-- Este archivo NO modifica nada. Solo diagnostica.
-- Correcciones: Coordinación → Docentes → ✏️ → campo "Dirige grupo(s)".
--               (ahí mismo hay un listado de grupos para marcar con clic)
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- Funciones de canonización — replican EXACTAMENTE lo que hace la app
-- (LV_CURSO.gradoCanon / grupoCanon en auth.js). Así el diagnóstico
-- refleja lo que el docente realmente va a ver, no una aproximación.
-- ───────────────────────────────────────────────────────────────────────
create or replace function lv_d_grado(t text) returns text language plpgsql immutable as $$
declare s text; m text[];
begin
  s := trim(coalesce(t,''));
  m := regexp_match(s, '\((\d+)');                       -- "Noveno (9°)" -> 9
  if m is not null then return (m[1])::int::text; end if;
  m := regexp_match(s, '^(\d+)');                        -- "9", "9°", "06"
  if m is not null then return (m[1])::int::text; end if;
  return lower(regexp_replace(translate(s,
           'áéíóúüñÁÉÍÓÚÜÑ','aeiounAEIOUN'), '[°[:space:]]', '', 'g'));
end $$;

create or replace function lv_d_grupo(grado text, grupo text) returns text language plpgsql immutable as $$
declare g text; gc text;
begin
  g := lower(regexp_replace(translate(coalesce(grupo,''),
         'áéíóúüñÁÉÍÓÚÜÑ','aeiounAEIOUN'), '[°[:space:]]', '', 'g'));
  if g !~ '^\d+$' then return g; end if;                  -- "único" -> tal cual
  gc := lv_d_grado(grado);
  if gc ~ '^\d+$' and length(g) > length(gc) and position(gc in g) = 1 then
    g := substr(g, length(gc)+1);                         -- "903" con grado 9 -> "3"
  end if;
  g := regexp_replace(g, '^0+', '');
  if g = '' then g := '0'; end if;
  return g;
end $$;


-- ═══════════════════════════════════════════════════════════════════════
-- 1. ESTADO DE CADA DIRECTOR DE GRUPO
--    Una fila por cada grupo declarado en el campo "Dirige".
-- ═══════════════════════════════════════════════════════════════════════
with directores as (
  select d.id, d.datos->>'nombre' as docente,
         nullif(trim(lower(d.datos->>'email')),'') as correo,
         trim(tok) as token
  from lv_docentes d,
       lateral unnest(string_to_array(coalesce(d.datos->>'dirige',''), ',')) as tok
  where coalesce((d.datos->>'_eliminado')::boolean,false) = false
    and coalesce(trim(d.datos->>'dirige'),'') <> ''
    and trim(tok) <> ''
),
parsed as (
  select id, docente, correo, token,
         lv_d_grado(split_part(split_part(token,' ',1),'-',1))                                    as grado_c,
         lv_d_grupo(split_part(split_part(token,' ',1),'-',1),
                    split_part(split_part(token,' ',1),'-',2))                                    as grupo_c
  from directores
),
cursos_c as (
  select lv_d_grado(c.datos->>'grado')                          as grado_c,
         lv_d_grupo(c.datos->>'grado', c.datos->>'grupo')       as grupo_c,
         count(*)                                               as cuantos,
         sum((select count(*) from estudiantes e
               where e.datos->>'cursoId' = c.id
                 and coalesce((e.datos->>'_eliminado')::boolean,false)=false)) as estudiantes
  from cursos c
  where coalesce((c.datos->>'_eliminado')::boolean,false) = false
  group by 1,2
)
select
  p.docente                                   as director,
  coalesce(p.correo,'—')                      as correo,
  p.token                                     as "dirige (texto)",
  p.grado_c || '-' || p.grupo_c               as "grupo interpretado",
  coalesce(cc.cuantos,0)                      as "cursos que coinciden",
  coalesce(cc.estudiantes,0)                  as "estudiantes",
  case
    when p.correo is null
      then '❌ sin correo — no puede ni entrar'
    when coalesce(cc.cuantos,0) = 0
      then '⚠️ ningún curso creado con ese grado-grupo: entrará y no verá estudiantes'
    else '✅ correcto'
  end                                         as estado
from parsed p
left join cursos_c cc on cc.grado_c = p.grado_c and cc.grupo_c = p.grupo_c
order by
  case when p.correo is null then 0
       when coalesce(cc.cuantos,0) = 0 then 1 else 2 end,
  p.docente, p.token;


-- ═══════════════════════════════════════════════════════════════════════
-- 2. GRUPOS QUE EXISTEN PERO NO TIENEN DIRECTOR ASIGNADO
--    (nadie podrá abrir su Observador ni generar sus boletines)
-- ═══════════════════════════════════════════════════════════════════════
with cursos_c as (
  select distinct
         lv_d_grado(c.datos->>'grado')                    as grado_c,
         lv_d_grupo(c.datos->>'grado', c.datos->>'grupo') as grupo_c,
         c.datos->>'sede'                                 as sede
  from cursos c
  where coalesce((c.datos->>'_eliminado')::boolean,false) = false
),
dirigidos as (
  select distinct
         lv_d_grado(split_part(split_part(trim(tok),' ',1),'-',1))  as grado_c,
         lv_d_grupo(split_part(split_part(trim(tok),' ',1),'-',1),
                    split_part(split_part(trim(tok),' ',1),'-',2))  as grupo_c
  from lv_docentes d,
       lateral unnest(string_to_array(coalesce(d.datos->>'dirige',''), ',')) as tok
  where coalesce((d.datos->>'_eliminado')::boolean,false) = false
    and trim(tok) <> ''
)
select cc.grado_c || '-' || cc.grupo_c as "grupo sin director",
       coalesce(cc.sede,'—')           as sede,
       '⚠️ nadie lo dirige' as estado
from cursos_c cc
where not exists (select 1 from dirigidos dd
                  where dd.grado_c = cc.grado_c and dd.grupo_c = cc.grupo_c)
order by 1;


-- ═══════════════════════════════════════════════════════════════════════
-- 3. RESUMEN
-- ═══════════════════════════════════════════════════════════════════════
select
  count(*) filter (where coalesce(trim(d.datos->>'dirige'),'') <> '') as docentes_con_direccion,
  count(*) filter (where coalesce(trim(d.datos->>'dirige'),'') =  '') as docentes_sin_direccion,
  count(*)                                                            as total_activos
from lv_docentes d
where coalesce((d.datos->>'_eliminado')::boolean,false) = false;

-- 3.1 Cuántos cursos hay creados en total (si es 0, aún nadie ha armado su planilla)
select count(*) as cursos_creados
from cursos c
where coalesce((c.datos->>'_eliminado')::boolean,false) = false;
