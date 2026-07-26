-- ═══════════════════════════════════════════════════════════════════════
-- SABIE — PASO FINAL (v2, sin tablas temporales)
--   1. Fusiona los 3 duplicados restantes
--   2. Carga los correos del Excel institucional
--   3. Crea las fichas de los 2 coordinadores que faltaban
-- Creado: jul 26, 2026
--
-- Corre el archivo COMPLETO de una sola vez. Todo es reversible:
-- las fichas duplicadas van a la papelera (recuperables 30 días).
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- 1. FUSIONAR LOS 3 DUPLICADOS RESTANTES
--    Se conserva la ficha que TIENE las materias; hereda "Dirige",
--    sede, jornada y cédula de la ficha que se elimina.
-- ───────────────────────────────────────────────────────────────────────

-- 1.1 Trasladar asignaciones a la ficha que se conserva
update lv_asignaciones a
set datos = jsonb_set(a.datos, '{docenteId}', to_jsonb(c.id))
from (values
        ('ELIAS HERNANDEZ HERNANDEZ',  'Elias Enrique Hernández Hernandez'),
        ('JOSÉ ARMANDO TRONCOSO PINO', 'José Troncoso Pino'),
        ('JOSE DANIEL SAENZ PETRO',    'Daniel Saenz')
     ) as f(conservar, descartar)
join lv_docentes c on c.datos->>'nombre' = f.conservar
                  and coalesce((c.datos->>'_eliminado')::boolean,false) = false
join lv_docentes x on x.datos->>'nombre' = f.descartar
                  and coalesce((x.datos->>'_eliminado')::boolean,false) = false
where a.datos->>'docenteId' = x.id
  and coalesce((a.datos->>'_eliminado')::boolean,false) = false;

-- 1.2 Heredar los campos que le falten a la ficha conservada
update lv_docentes d
set datos = d.datos
  || case when coalesce(trim(d.datos->>'dirige'),'') = ''
            and coalesce(trim(x.datos->>'dirige'),'') <> ''
          then jsonb_build_object('dirige', x.datos->>'dirige') else '{}'::jsonb end
  || case when coalesce(trim(d.datos->>'sede'),'') = ''
            and coalesce(trim(x.datos->>'sede'),'') <> ''
          then jsonb_build_object('sede', x.datos->>'sede') else '{}'::jsonb end
  || case when coalesce(trim(d.datos->>'jornada'),'') = ''
            and coalesce(trim(x.datos->>'jornada'),'') <> ''
          then jsonb_build_object('jornada', x.datos->>'jornada') else '{}'::jsonb end
  || case when coalesce(trim(d.datos->>'cedula'),'') = ''
            and coalesce(trim(x.datos->>'cedula'),'') <> ''
          then jsonb_build_object('cedula', x.datos->>'cedula') else '{}'::jsonb end
from (values
        ('ELIAS HERNANDEZ HERNANDEZ',  'Elias Enrique Hernández Hernandez'),
        ('JOSÉ ARMANDO TRONCOSO PINO', 'José Troncoso Pino'),
        ('JOSE DANIEL SAENZ PETRO',    'Daniel Saenz')
     ) as f(conservar, descartar)
join lv_docentes x on x.datos->>'nombre' = f.descartar
                  and coalesce((x.datos->>'_eliminado')::boolean,false) = false
where d.datos->>'nombre' = f.conservar
  and coalesce((d.datos->>'_eliminado')::boolean,false) = false;

-- 1.3 Mandar la ficha duplicada a la papelera
update lv_docentes d
set datos = d.datos || jsonb_build_object('_eliminado', true,
                                          '_eliminadoEn', extract(epoch from now())*1000)
from (values
        ('Elias Enrique Hernández Hernandez'),
        ('José Troncoso Pino'),
        ('Daniel Saenz')
     ) as f(descartar)
where d.datos->>'nombre' = f.descartar
  and coalesce((d.datos->>'_eliminado')::boolean,false) = false;


-- ───────────────────────────────────────────────────────────────────────
-- 2. CARGAR LOS CORREOS DEL EXCEL INSTITUCIONAL
--    Solo escribe donde la ficha NO tiene correo — nunca sobrescribe
--    un correo que ya funciona (Francy y Gary conservan el suyo).
-- ───────────────────────────────────────────────────────────────────────
update lv_docentes d
set datos = d.datos || jsonb_build_object('email', c.correo)
from (values
    ('ANA MARIA GONZALEZ PUCHE', 'mariagp2302@gmail.com'),
    ('ARTURO MIRANDA CONTRERAS', 'a.miranda9003@gmail.com'),
    ('Ana Elvira Mendoza Cordero', 'anaelviramendoza2014@hotmail.com'),
    ('Andrés Felipe Pérez Bustamante', 'andrezpb11@gmail.com'),
    ('Aris Camila Negrete Durango', 'ac1003717361@gmail.com'),
    ('Arleineth Diaz Pacheco', 'arleineth23.verde@gmail.com'),
    ('CLAUDIA AMBROSIA TORRENTE HERRERA', 'claudiatorrente2009@gmail.com'),
    ('Carlos Elias Villalobos Uribe', 'carvillagold96@gmail.com'),
    ('Cirly Esther Coneo Carvajal', 'cirly28@hotmail.com'),
    ('DIONYS ESTHER PRIOLÓ FRANCO', 'dionyspriolofranco@hotmail.com'),
    ('ELIAS HERNANDEZ HERNANDEZ', 'eliashernandez@hotmail.es'),
    ('Edilberto Manuel Calderín Gomez', 'edilbertocalderin81@gmail.com'),
    ('Iván David Vega Juris', 'ivanvegajuris@gmail.com'),
    ('JAIR ALBERTO MORALES SALGADO', 'moraless2001@hotmail.com'),
    ('JAIRO ENRIQUE NEGRETE DIAZ', 'jend11078@gmail.com'),
    ('JOSÉ ARMANDO TRONCOSO PINO', 'troncosopino1@gmail.com'),
    ('Jhon Sebastian Salazar Romero', 'jhonsesaro@gmail.com'),
    ('Julio Samir Salgado Baquero', 'j.s.s.b@hotmail.com'),
    ('Katerine Sáez Almanza', 'katerinesaezalmanza98@gmail.com'),
    ('Lina Luz Lopez Vargas', 'linalopezv2405@gmail.com'),
    ('MARIA ALEJANDRA VERGARA BRUNAL', 'ma.vergarabrunal@gmail.com'),
    ('MARIA BOLIVIA ESPITIA PAYARES', 'mariaboliviaespitia@gmail.com'),
    ('Mario Emiro Ayala Mora', 'marioemiroayalamora@gmail.com'),
    ('María Camila López Delgado', 'mclopezd1@gmail.com'),
    ('NAZLY PAOLA PEÑA ANDRADE', 'nazlypaola.p2708@gmail.com'),
    ('Naby Luz Suarez Velásquez', 'nabysuarezvelazquez@gmail.com'),
    ('Rafael Elias Anichiarico Cavadia', 'rafaelias_25@hotmail.com'),
    ('Regina Paola Berrio Flórez', 'paolabf87@gmail.com'),
    ('SOR MARGARITA PALACIO CALLE', 'palaciosmargarita292@gmail.com'),
    ('Sandra Marcela Peralta Pacheco', 'sandra271951@hotmail.com'),
    ('Yinesa Paola Lozano Diaz', 'yinesalozano15@hotmail.com')
     ) as c(nombre, correo)
where d.datos->>'nombre' = c.nombre
  and coalesce((d.datos->>'_eliminado')::boolean,false) = false
  and coalesce(trim(d.datos->>'email'),'') = '';


-- ───────────────────────────────────────────────────────────────────────
-- 3. CREAR LAS FICHAS DE LOS DOS COORDINADORES
--    (Están en el Excel de correos pero no en la asignación académica,
--     por eso no existían como fichas. No se les asigna materia: su
--     función es de coordinación.)
--    OJO: el ROL de coordinador se asigna DESPUÉS, desde la app:
--    Coordinación → 🔑 Roles. Aquí solo se crea la ficha.
-- ───────────────────────────────────────────────────────────────────────
with nuevos as (
  select gen_random_uuid()::text as nid, v.nombre, v.correo
  from (values
          ('Hector Aquiles Sáenz García', 'hectoraquiles0511@gmail.com'),
          ('Mónica Lucía Guerrero',       'abrilenmayo_10@hotmail.com')
       ) as v(nombre, correo)
  where not exists (
    select 1 from lv_docentes d
    where lower(trim(d.datos->>'email')) = v.correo
      and coalesce((d.datos->>'_eliminado')::boolean,false) = false
  )
)
insert into lv_docentes (id, datos)
select n.nid,
       jsonb_build_object(
         'id',      n.nid,
         'nombre',  n.nombre,
         'email',   n.correo,
         'sede',    'PRINCIPAL',
         'jornada', 'Única',
         'dirige',  '',
         'areaDesempeno', 'Coordinación',
         'creado',  (extract(epoch from now())*1000)::bigint
       )
from nuevos n;


-- ═══════════════════════════════════════════════════════════════════════
-- 4. VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════

-- 4.1 Estado de cada persona activa
select
  d.datos->>'nombre'                                       as docente,
  coalesce(nullif(trim(lower(d.datos->>'email')),''),'—')  as correo,
  (select count(*) from lv_asignaciones a
    where a.datos->>'docenteId' = d.id
      and coalesce((a.datos->>'_eliminado')::boolean,false) = false) as materias,
  case when coalesce(trim(d.datos->>'email'),'') = '' then '❌ FALTA CORREO'
       when coalesce(d.datos->>'areaDesempeno','') = 'Coordinación' then '✅ coordinación'
       when (select count(*) from lv_asignaciones a
              where a.datos->>'docenteId' = d.id
                and coalesce((a.datos->>'_eliminado')::boolean,false) = false) = 0
            then '⚠️ sin materias asignadas'
       else '✅ listo' end                                  as estado
from lv_docentes d
where coalesce((d.datos->>'_eliminado')::boolean, false) = false
order by 4, 1;

-- 4.2 ¿Algún correo repetido en dos fichas? (debe dar 0 filas)
select lower(trim(d.datos->>'email')) as correo_repetido, count(*) as veces,
       string_agg(d.datos->>'nombre', ' | ') as fichas
from lv_docentes d
where coalesce((d.datos->>'_eliminado')::boolean, false) = false
  and coalesce(trim(d.datos->>'email'),'') <> ''
group by 1 having count(*) > 1;

-- 4.3 Resumen
select count(*) as personas_activas,
       count(*) filter (where coalesce(trim(d.datos->>'email'),'') <> '') as con_correo,
       count(*) filter (where coalesce(trim(d.datos->>'email'),'') =  '') as sin_correo
from lv_docentes d
where coalesce((d.datos->>'_eliminado')::boolean, false) = false;
