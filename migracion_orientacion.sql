-- ═══════════════════════════════════════════════════════════════════════
-- SABIE — Módulo de Orientación Escolar / Psico-orientación (ago 2026)
-- Creado en sesión de diseño (retoma el backlog señalado en sesión 31).
--
-- QUÉ ES:
-- Digitaliza el flujo real que ya usa el colegio en papel (formatos
-- CE-F001 a CE-F005, adaptados del Plan Nacional de Orientación Escolar,
-- MEN 2021, dentro del Sistema Nacional de Convivencia Escolar): un
-- docente REMITE un caso (CE-F001), y el orientador escolar lo toma y
-- registra ficha de intervención (CE-F002), entrevistas con acudiente
-- (CE-F003), remisiones externas (CE-F004) y seguimientos (CE-F005).
--
-- DECISIONES CONFIRMADAS CON RICHARD (AskUserQuestion, ago 2026):
--   1. El rol de orientación lo tiene UN DOCENTE ESPECÍFICO designado
--      (no coordinación) — se asigna en Coordinación → Institución,
--      campo "Orientador(a) escolar" → lv_institucion.orientadorDocenteId.
--   2. El docente que remite un caso SOLO ve el estado general
--      (recibido/en proceso/cerrado) después de remitirlo — NO el detalle
--      clínico que registre el orientador.
--   3. Es un módulo APARTE del Observador (Situación Tipo I/II/III) —
--      sin cruce automático, para no mezclar datos de convivencia con
--      datos de salud/familia.
--
-- ARQUITECTURA DE PRIVACIDAD (por eso son DOS tablas, no una):
--   · lv_orientacion_casos    — el "expediente público": CE-F001
--     (motivo, acciones pedagógicas ya intentadas, observaciones) +
--     estado del caso. Cualquier docente autenticado puede INSERTAR
--     (remitir) un caso nuevo, y solo puede LEER los que él mismo
--     remitió (o todos, si es orientador/coordinación). Coordinación
--     puede ver y cambiar el ESTADO (por eso tiene permiso de UPDATE
--     aquí), pero eso es todo lo sensible que toca esta tabla.
--   · lv_orientacion_detalle  — CE-F002 (salud, familia, etnia, víctima
--     del conflicto — lo MÁS sensible del proyecto, más que lv_matricula),
--     CE-F003, CE-F004, CE-F005. SOLO es_orientador() — ni siquiera
--     coordinación/rector tiene acceso de servidor a esta tabla. Si el
--     orientador cambia o no hay nadie designado, coordinación reasigna
--     el campo orientadorDocenteId (a sí misma o a otra persona) desde
--     Institución — esa es la válvula de emergencia, no un bypass directo.
--
-- Ejecutar en: Supabase → SQL Editor → Run  (idempotente)
-- ═══════════════════════════════════════════════════════════════════════

-- ── es_orientador(): ¿el usuario actual es la persona designada como
--    orientador(a) escolar? Reutiliza lv_mi_docente_id() (ya existe,
--    de migracion_etapa2_fase2.sql) — mismo patrón que es_coordinacion().
create or replace function public.es_orientador()
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from lv_institucion i
    where coalesce((i.datos->>'_eliminado')::boolean,false) = false
      and coalesce(i.datos->>'orientadorDocenteId','') <> ''
      and i.datos->>'orientadorDocenteId' = public.lv_mi_docente_id()
  );
$$;

-- ── Tabla 1: lv_orientacion_casos ────────────────────────────────────────
create table if not exists lv_orientacion_casos (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_orientacion_casos;
create trigger tg_actualizado_en before insert or update on lv_orientacion_casos
  for each row execute function public.tocar_actualizado_en();
alter table lv_orientacion_casos enable row level security;

-- Cualquier docente autenticado puede REMITIR un caso — pero solo a
-- nombre de sí mismo (with check obliga a que remitidoPorId sea el suyo;
-- no se puede remitir "a nombre de" otro docente).
drop policy if exists "insertar_remision" on lv_orientacion_casos;
create policy "insertar_remision" on lv_orientacion_casos
  for insert to authenticated
  with check (datos->>'remitidoPorId' = public.lv_mi_docente_id());

-- Ver: coordinación, el orientador designado, o el propio remitente
-- (solo sus casos — ve el CE-F001 que él mismo escribió y el estado).
drop policy if exists "ver_propio_o_orientador" on lv_orientacion_casos;
create policy "ver_propio_o_orientador" on lv_orientacion_casos
  for select to authenticated
  using (
    public.es_coordinacion() or public.es_orientador()
    or datos->>'remitidoPorId' = public.lv_mi_docente_id()
  );

-- Editar (cambiar estado, corregir datos del caso): solo orientador/coordinación.
drop policy if exists "editar_solo_orientador" on lv_orientacion_casos;
create policy "editar_solo_orientador" on lv_orientacion_casos
  for update to authenticated
  using (public.es_coordinacion() or public.es_orientador())
  with check (public.es_coordinacion() or public.es_orientador());

drop policy if exists "eliminar_solo_orientador" on lv_orientacion_casos;
create policy "eliminar_solo_orientador" on lv_orientacion_casos
  for delete to authenticated
  using (public.es_coordinacion() or public.es_orientador());

-- ── Tabla 2: lv_orientacion_detalle ──────────────────────────────────────
-- Ficha de intervención + entrevistas + remisiones externas + seguimientos.
-- El docente que remitió el caso NUNCA tiene acceso a esta tabla.
create table if not exists lv_orientacion_detalle (
  id             text primary key,
  datos          jsonb,
  actualizado_en timestamptz default now()
);
drop trigger if exists tg_actualizado_en on lv_orientacion_detalle;
create trigger tg_actualizado_en before insert or update on lv_orientacion_detalle
  for each row execute function public.tocar_actualizado_en();
alter table lv_orientacion_detalle enable row level security;

-- A propósito NO incluye es_coordinacion() — ver nota de arquitectura arriba.
drop policy if exists "solo_orientador" on lv_orientacion_detalle;
create policy "solo_orientador" on lv_orientacion_detalle
  for all to authenticated
  using (public.es_orientador())
  with check (public.es_orientador());

-- ── Lectura ampliada para el orientador: ve el Observador de TODO el
--    colegio (decisión de Richard, ago 2026 — le da contexto de convivencia
--    ANTES de que le remitan un caso formal, que es justo su trabajo), pero
--    SOLO LECTURA — crear/editar/borrar anotaciones sigue siendo del
--    director de grupo (política "por_curso" ya existente en
--    migracion_etapa2_fase2.sql, que NO se toca). Esta es una política
--    ADICIONAL de SELECT — en Postgres, varias políticas para el mismo
--    comando se combinan con OR — así que solo AMPLÍA la lectura, nunca
--    reduce ni afecta escritura (insert/update/delete siguen exigiendo
--    lv_est_visible/lv_acceso_total, igual que para cualquier otro
--    docente sin ser director de ese grupo).
drop policy if exists "orientador_lee_todo" on lv_observador;
create policy "orientador_lee_todo" on lv_observador
  for select to authenticated
  using (public.es_orientador());

-- Sin esto, "ver todo el colegio en Observador" queda solo en el papel: la
-- app pide TODOS los cursos/estudiantes al servidor, pero sin esta política
-- las tablas "cursos" y "estudiantes" (RLS "por_curso", de
-- migracion_etapa2_fase2.sql) le siguen devolviendo solo lo suyo — y como
-- la orientadora normalmente no tiene asignaciones propias, el servidor le
-- devuelve una lista vacía y el módulo se ve sin ningún curso. Misma lógica
-- que arriba: política ADICIONAL de solo SELECT, no toca insert/update/
-- delete (crear/editar cursos o estudiantes sigue siendo del docente
-- dueño/coordinación, sin cambios).
drop policy if exists "orientador_lee_todo" on cursos;
create policy "orientador_lee_todo" on cursos
  for select to authenticated
  using (public.es_orientador());

drop policy if exists "orientador_lee_todo" on estudiantes;
create policy "orientador_lee_todo" on estudiantes
  for select to authenticated
  using (public.es_orientador());

select 'lv_orientacion_casos y lv_orientacion_detalle listas' as resultado;

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (opcional, solo lectura) — corre esto después de asignar
-- un orientador en Coordinación → Institución, con la sesión de esa
-- persona, para confirmar que es_orientador() da true:
--   select public.es_orientador();
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK (si hace falta deshacer todo)
-- ═══════════════════════════════════════════════════════════════════════
-- drop table if exists lv_orientacion_detalle;
-- drop table if exists lv_orientacion_casos;
-- drop function if exists public.es_orientador();
-- drop policy if exists "orientador_lee_todo" on lv_observador;
-- drop policy if exists "orientador_lee_todo" on cursos;
-- drop policy if exists "orientador_lee_todo" on estudiantes;
