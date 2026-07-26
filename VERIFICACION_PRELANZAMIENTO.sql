-- ═══════════════════════════════════════════════════════════════════════
-- SABIE — VERIFICACIÓN Y PUESTA AL DÍA ANTES DEL LANZAMIENTO
-- Creado: auditoría previa al lanzamiento institucional (jul 26, 2026)
--
-- POR QUÉ EXISTE ESTE ARCHIVO:
-- Varias migraciones quedaron documentadas en CLAUDE.md como "SIN CORRER".
-- Si una tabla NO existe en Supabase, la app NO da error visible: el cambio
-- se queda atascado en la cola local del navegador del docente para
-- siempre (solo se ve el globito "⏳ N cambios sin subir"). Los datos NO
-- se pierden, pero viven SOLO en ese equipo — si el docente cambia de
-- computador o borra datos del navegador, se pierden de verdad.
--
-- CÓMO USARLO:
--   1. Entra a Supabase → SQL Editor → New query.
--   2. Copia y pega TODO este archivo.
--   3. Toca "Run".
--   4. Revisa la tabla de resultados del final: TODAS las filas deben
--      decir "OK". Si alguna dice "FALTA", avísame.
--
-- ES SEGURO CORRERLO AUNQUE YA HAYAS CORRIDO LAS MIGRACIONES ANTES:
-- todo usa "if not exists" / "drop policy if exists", así que re-correrlo
-- NO borra datos, NO duplica nada y NO rompe lo que ya funciona.
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- SECCIÓN 0 — Función de sello de tiempo (la usan todas las tablas)
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end $$;


-- ───────────────────────────────────────────────────────────────────────
-- SECCIÓN 1 — Tablas que podrían faltar (una por cada migración pendiente)
-- ───────────────────────────────────────────────────────────────────────

-- 1.1 lv_horarios — Horarios armados por Coordinación (módulos 21 y 07)
--     SIN ESTA TABLA: coordinación publica un horario y el docente NUNCA
--     lo ve en "Mi Horario" desde su propia cuenta.
create table if not exists lv_horarios (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_horarios;
create trigger tg_actualizado_en before insert or update on lv_horarios
  for each row execute function public.tocar_actualizado_en();
alter table lv_horarios enable row level security;
drop policy if exists "solo_autenticados" on lv_horarios;
create policy "solo_autenticados" on lv_horarios
  for all to authenticated using (true) with check (true);

-- 1.2 lv_permisos — Permisos docentes (módulo 18)
--     SIN ESTA TABLA: el docente solicita un permiso y coordinación
--     nunca lo ve (queda solo en el equipo del docente).
create table if not exists lv_permisos (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_permisos;
create trigger tg_actualizado_en before insert or update on lv_permisos
  for each row execute function public.tocar_actualizado_en();
alter table lv_permisos enable row level security;
drop policy if exists "solo_autenticados" on lv_permisos;
create policy "solo_autenticados" on lv_permisos
  for all to authenticated using (true) with check (true);

-- 1.3 lv_preescolar — Boletín descriptivo de preescolar (módulo 13)
--     SIN ESTA TABLA: las valoraciones descriptivas de Prejardín/Jardín/
--     Transición no se guardan en la nube.
create table if not exists lv_preescolar (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_preescolar;
create trigger tg_actualizado_en before insert or update on lv_preescolar
  for each row execute function public.tocar_actualizado_en();
alter table lv_preescolar enable row level security;
drop policy if exists "solo_autenticados" on lv_preescolar;
create policy "solo_autenticados" on lv_preescolar
  for all to authenticated using (true) with check (true);

-- 1.4 lv_matricula — Matrícula oficial (módulo 20)
--     OJO: esta tabla es MÁS restringida que las demás — contiene
--     documento de identidad y fecha de nacimiento de todo el colegio,
--     así que NI LA LECTURA es para todos: exige coordinación/rectoría.
create table if not exists lv_matricula (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_matricula;
create trigger tg_actualizado_en before insert or update on lv_matricula
  for each row execute function public.tocar_actualizado_en();
alter table lv_matricula enable row level security;
drop policy if exists "solo_autenticados" on lv_matricula;
drop policy if exists "coordinacion_todo" on lv_matricula;
create policy "coordinacion_todo" on lv_matricula
  for all to authenticated
  using (public.es_coordinacion())
  with check (public.es_coordinacion());

-- 1.5 Centros de Interés · PTA (módulo 17) — 3 tablas
create table if not exists lv_centros (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_centros;
create trigger tg_actualizado_en before insert or update on lv_centros
  for each row execute function public.tocar_actualizado_en();
alter table lv_centros enable row level security;
-- lectura para cualquier docente (necesita ver "sus" centros),
-- escritura solo coordinación (el CRUD vive en coordinacion.html)
drop policy if exists "lectura_autenticados" on lv_centros;
create policy "lectura_autenticados" on lv_centros
  for select to authenticated using (true);
drop policy if exists "escritura_coordinacion" on lv_centros;
create policy "escritura_coordinacion" on lv_centros
  for all to authenticated
  using (public.es_coordinacion())
  with check (public.es_coordinacion());

create table if not exists lv_centros_inscripciones (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_centros_inscripciones;
create trigger tg_actualizado_en before insert or update on lv_centros_inscripciones
  for each row execute function public.tocar_actualizado_en();
alter table lv_centros_inscripciones enable row level security;
drop policy if exists "solo_autenticados" on lv_centros_inscripciones;
create policy "solo_autenticados" on lv_centros_inscripciones
  for all to authenticated using (true) with check (true);

create table if not exists lv_centros_asistencia (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_centros_asistencia;
create trigger tg_actualizado_en before insert or update on lv_centros_asistencia
  for each row execute function public.tocar_actualizado_en();
alter table lv_centros_asistencia enable row level security;
drop policy if exists "solo_autenticados" on lv_centros_asistencia;
create policy "solo_autenticados" on lv_centros_asistencia
  for all to authenticated using (true) with check (true);


-- ───────────────────────────────────────────────────────────────────────
-- SECCIÓN 2 — Almacenamiento de fotos del Observador (módulo 10 / 01)
-- SIN ESTO: el botón "📔 Observar" falla al adjuntar una foto.
-- ───────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
select 'observador-fotos', 'observador-fotos', false
where not exists (select 1 from storage.buckets where id = 'observador-fotos');

drop policy if exists "observador_fotos_lectura" on storage.objects;
create policy "observador_fotos_lectura" on storage.objects
  for select to authenticated using (bucket_id = 'observador-fotos');

drop policy if exists "observador_fotos_escritura" on storage.objects;
create policy "observador_fotos_escritura" on storage.objects
  for insert to authenticated with check (bucket_id = 'observador-fotos');

drop policy if exists "observador_fotos_actualizar" on storage.objects;
create policy "observador_fotos_actualizar" on storage.objects
  for update to authenticated using (bucket_id = 'observador-fotos');


-- ═══════════════════════════════════════════════════════════════════════
-- SECCIÓN 3 — VERIFICACIÓN FINAL
-- Lee la tabla de resultados: TODAS las filas deben decir "OK".
-- ═══════════════════════════════════════════════════════════════════════
with esperadas(nombre, para_que) as (
  values
    ('cursos',                    'Planilla de calificaciones'),
    ('estudiantes',               'Listas de estudiantes por curso'),
    ('notas',                     'Calificaciones'),
    ('asistencia',                'Asistencia diaria'),
    ('eventos',                   'Calendario institucional'),
    ('lv_planeadores',            'Planeador de clases'),
    ('lv_comunicados',            'Comunicados y citaciones'),
    ('lv_examenes',               'Evaluaciones de aula'),
    ('lv_resultados',             'Resultados de evaluaciones'),
    ('lv11_examenes',             'Simulacros Saber 11'),
    ('lv11_resultados',           'Resultados Saber 11'),
    ('lv11_simulacros_ext',       'Simulacros externos'),
    ('lv_banco',                  'Banco de preguntas'),
    ('lv_malla',                  'Malla curricular'),
    ('lv_docentes',               'Ficha de docentes'),
    ('lv_asignaciones',           'Asignación académica'),
    ('lv_acudientes',             'Acudientes'),
    ('lv_observador',             'Observador del estudiante'),
    ('lv_piar',                   'Inclusión / PIAR'),
    ('lv_inclusion_actividades',  'Actividades de inclusión'),
    ('lv_boletines',              'Boletines'),
    ('lv_herramientas',           'Notas de herramientas formativas'),
    ('lv_institucion',            'Datos de la institución'),
    ('lv_actividades',            'Banco de actividades'),
    ('lv_permisos',               'Permisos docentes'),
    ('lv_matricula',              'Matrícula oficial'),
    ('lv_preescolar',             'Boletín descriptivo de preescolar'),
    ('lv_horarios',               'Horarios por docente'),
    ('lv_centros',                'Centros de Interés'),
    ('lv_centros_inscripciones',  'Inscripciones a Centros'),
    ('lv_centros_asistencia',     'Asistencia a Centros'),
    ('perfiles',                  'Roles de usuario (docente/coordinador/admin)')
)
select
  e.nombre                                   as tabla,
  e.para_que                                 as "se usa para",
  case when t.tablename is null
       then '❌ FALTA — este módulo no guardará en la nube'
       else '✅ OK' end                       as estado,
  case when t.tablename is not null and c.relrowsecurity is not true
       then '⚠️ SIN RLS — revisar seguridad'
       else '' end                            as advertencia
from esperadas e
left join pg_tables t
       on t.schemaname = 'public' and t.tablename = e.nombre
left join pg_class c
       on c.relname = e.nombre and c.relnamespace = 'public'::regnamespace
order by
  case when t.tablename is null then 0 else 1 end,   -- las que faltan, primero
  e.nombre;


-- ═══════════════════════════════════════════════════════════════════════
-- SECCIÓN 4 — ¿CUÁNTOS DOCENTES PUEDEN REALMENTE ENTRAR EL LUNES?
--
-- Para que un docente inicie sesión hacen falta DOS cosas separadas:
--   (a) un USUARIO con correo y contraseña (Supabase → Authentication)
--   (b) ese mismo correo escrito en su FICHA de docente (Coordinación →
--       Docentes → campo "Correo")
-- Si falta cualquiera de las dos, NO entra. Corre esta consulta y mira
-- la columna "estado".
-- ═══════════════════════════════════════════════════════════════════════
select
  coalesce(d.datos->>'nombre', '(sin nombre)')                 as docente,
  coalesce(nullif(trim(lower(d.datos->>'email')), ''), '—')    as correo_en_ficha,
  case
    when coalesce(trim(d.datos->>'email'), '') = ''
      then '❌ NO puede entrar — falta escribir su correo en la ficha'
    when u.id is null
      then '❌ NO puede entrar — falta crearle el usuario en Supabase'
    else '✅ Puede entrar'
  end                                                          as estado,
  coalesce(p.rol, '—')                                         as rol
from lv_docentes d
left join auth.users u
       on lower(u.email) = trim(lower(d.datos->>'email'))
left join perfiles p
       on p.id = u.id
where coalesce((d.datos->>'_eliminado')::boolean, false) = false
order by
  case
    when coalesce(trim(d.datos->>'email'), '') = '' then 0
    when u.id is null then 1
    else 2
  end,
  docente;

-- Resumen en una sola línea
select
  count(*)                                                              as docentes_totales,
  count(*) filter (where coalesce(trim(d.datos->>'email'), '') <> '')   as con_correo_en_ficha,
  count(u.id)                                                           as con_usuario_creado,
  count(*) - count(u.id)                                                as "NO PODRAN ENTRAR"
from lv_docentes d
left join auth.users u
       on lower(u.email) = trim(lower(d.datos->>'email'))
where coalesce((d.datos->>'_eliminado')::boolean, false) = false;
