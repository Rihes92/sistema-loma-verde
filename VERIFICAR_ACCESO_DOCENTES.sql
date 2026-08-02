-- ═══════════════════════════════════════════════════════════════════════
-- SABIE — ¿PUEDEN ENTRAR TODOS LOS DOCENTES?  (auditoría ago 2, 2026)
--
-- Responde con datos reales tres preguntas:
--   1. ¿Qué docentes NO pueden entrar todavía, y por qué?
--   2. ¿Hay correos con caracteres invisibles que rompen el login?
--   3. ¿Hay docentes duplicados o correos repetidos?
--
-- TODO ESTE ARCHIVO ES DE SOLO LECTURA salvo la sección 4, que está
-- comentada a propósito: léela antes de descomentar nada.
--
-- Ejecutar en: Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- 1. TABLERO GENERAL — el número que importa
-- ───────────────────────────────────────────────────────────────────────
select
  count(*)                                                          as docentes_activos,
  count(*) filter (where coalesce(trim(datos->>'email'),'') <> '')  as con_correo,
  count(*) filter (where coalesce(trim(datos->>'email'),'') =  '')  as sin_correo
from lv_docentes
where coalesce((datos->>'_eliminado')::boolean,false) = false;


-- ───────────────────────────────────────────────────────────────────────
-- 2. ESTADO DE CADA DOCENTE (esta es la lista para revisar una por una)
--    "Listo para entrar" = tiene correo en su ficha Y existe el usuario.
--
--    OJO con el carácter U+00A0 (espacio duro): se cuela al copiar y pegar
--    desde Excel/Word y es INVISIBLE. El trim() de Postgres NO lo quita,
--    así que un correo con ese carácter crea un usuario que nadie puede
--    usar (el docente escribe el correo "bien" y no calza). Por eso aquí
--    se limpia explícitamente antes de comparar.
-- ───────────────────────────────────────────────────────────────────────
with d as (
  select
    d.id,
    coalesce(d.datos->>'nombre','(sin nombre)')                            as docente,
    coalesce(d.datos->>'email','')                                         as correo_crudo,
    lower(btrim(replace(replace(coalesce(d.datos->>'email',''),
          chr(160),' '), chr(9),' ')))                                     as correo_limpio
  from lv_docentes d
  where coalesce((d.datos->>'_eliminado')::boolean,false) = false
)
select
  d.docente,
  d.correo_limpio                                            as correo,
  case
    when d.correo_limpio = ''                then '❌ Sin correo en su ficha (Coordinación → Docentes)'
    when d.correo_crudo <> d.correo_limpio   then '⚠️ El correo tiene espacios o caracteres invisibles — hay que corregirlo'
    when u.id is null                        then '❌ Falta crearle el usuario (correr ALTA_MASIVA_DOCENTES.sql)'
    when u.email_confirmed_at is null        then '⚠️ Usuario creado pero sin confirmar'
    when u.last_sign_in_at is null           then '🟡 Listo para entrar — nunca ha iniciado sesión'
    else                                          '✅ Ya ha entrado (' || to_char(u.last_sign_in_at,'DD/MM/YYYY') || ')'
  end                                                        as estado,
  coalesce(p.rol,'—')                                        as rol
from d
left join auth.users u on lower(btrim(u.email)) = d.correo_limpio
left join perfiles   p on p.id = u.id
order by
  case
    when d.correo_limpio = ''              then 0
    when d.correo_crudo <> d.correo_limpio then 1
    when u.id is null                      then 2
    when u.last_sign_in_at is null         then 3
    else 4
  end,
  d.docente;


-- ───────────────────────────────────────────────────────────────────────
-- 3. DUPLICADOS — dos fichas de docente con el mismo correo
--    (pasa al importar la asignación académica si el nombre venía escrito
--     distinto; el login tomaría solo una de las dos fichas)
-- ───────────────────────────────────────────────────────────────────────
select
  lower(btrim(replace(datos->>'email', chr(160), ' '))) as correo,
  count(*)                                             as fichas,
  string_agg(datos->>'nombre', ' | ')                  as docentes
from lv_docentes
where coalesce((datos->>'_eliminado')::boolean,false) = false
  and coalesce(trim(datos->>'email'),'') <> ''
group by 1
having count(*) > 1
order by 2 desc;


-- ───────────────────────────────────────────────────────────────────────
-- 4. LIMPIEZA DE CORREOS  ⚠️ ESTO SÍ ESCRIBE — descomentar solo si la
--    consulta 2 mostró filas con "espacios o caracteres invisibles".
--
--    Quita espacios duros (U+00A0), tabuladores y espacios normales, y
--    pasa el correo a minúsculas dentro de lv_docentes. NO toca
--    auth.users: si el usuario ya se creó con el correo sucio, hay que
--    corregirlo también en Authentication → Users, o borrarlo y volver a
--    correr ALTA_MASIVA_DOCENTES.sql (que ya solo creará los que falten).
-- ───────────────────────────────────────────────────────────────────────
-- update lv_docentes
-- set datos = jsonb_set(datos, '{email}',
--       to_jsonb(lower(btrim(replace(replace(datos->>'email', chr(160),' '), chr(9),' ')))))
-- where coalesce((datos->>'_eliminado')::boolean,false) = false
--   and coalesce(datos->>'email','') <>
--       lower(btrim(replace(replace(coalesce(datos->>'email',''), chr(160),' '), chr(9),' ')));


-- ───────────────────────────────────────────────────────────────────────
-- 5. ¿ESTÁN TODAS LAS TABLAS QUE LA APP NECESITA?
--    Si alguna dice "FALTA", hay que correr su migración antes de usar
--    el módulo que la usa.
-- ───────────────────────────────────────────────────────────────────────
select t.tabla,
       case when to_regclass('public.'||t.tabla) is null
            then '❌ FALTA — correr su migración'
            else '✅ existe' end as estado
from (values
  ('cursos'),('estudiantes'),('notas'),('asistencia'),('eventos'),
  ('lv_docentes'),('lv_asignaciones'),('lv_institucion'),('lv_malla'),
  ('lv_acudientes'),('lv_observador'),('lv_piar'),('lv_boletines'),
  ('lv_examenes'),('lv_resultados'),('lv_banco'),('lv_planeadores'),
  ('lv11_examenes'),('lv11_resultados'),('lv11_simulacros_ext'),
  ('lv_herramientas'),('lv_actividades'),('lv_centros'),
  ('lv_centros_inscripciones'),('lv_centros_asistencia'),
  ('lv_permisos'),('lv_matricula'),('lv_preescolar'),('lv_horarios'),
  ('lv_orientacion_casos'),('lv_orientacion_detalle'),('lv_grupos'),
  ('perfiles')
) as t(tabla)
order by 2 desc, 1;


-- ───────────────────────────────────────────────────────────────────────
-- 6. ¿QUEDÓ CARGADA LA MATRÍCULA DE SIMAT?
--    Después de correr el import desde la app, esto debe dar ~675 y ~99.
-- ───────────────────────────────────────────────────────────────────────
select
  (select count(*) from lv_matricula
     where coalesce((datos->>'_eliminado')::boolean,false) = false)                          as estudiantes_total,
  (select count(*) from lv_matricula
     where coalesce(datos->>'estado','activo') = 'activo'
       and coalesce((datos->>'_eliminado')::boolean,false) = false)                          as activos,
  (select count(*) from lv_grupos
     where coalesce((datos->>'_eliminado')::boolean,false) = false)                          as grupos;
