-- ═══════════════════════════════════════════════════════════════
-- SABIE — Fotos del Observador (jul 2026, sesión 25e)
-- Bucket PRIVADO para adjuntar una foto a una anotación de
-- observador desde la planilla de clase. La foto va a Storage
-- (NO al JSON de sync), igual que el banco de actividades.
-- Ejecutar en: Supabase → SQL Editor → Run  (idempotente)
-- ═══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('observador-fotos','observador-fotos', false)
on conflict (id) do nothing;

-- Lectura: cualquier docente autenticado (mismo nivel que hoy tiene
-- lv_observador — no hay filtro por curso/dueño todavía, ver Fase 2
-- de arquitectura pendiente en CLAUDE.md).
drop policy if exists "obsfotos_lectura_autenticados" on storage.objects;
create policy "obsfotos_lectura_autenticados" on storage.objects
  for select to authenticated using (bucket_id = 'observador-fotos');

-- Escritura: cualquier docente autenticado puede subir una foto desde
-- su clase (la anotación queda igual etiquetada con quién la registró).
drop policy if exists "obsfotos_escritura_autenticados" on storage.objects;
create policy "obsfotos_escritura_autenticados" on storage.objects
  for insert to authenticated with check (bucket_id = 'observador-fotos');

select 'bucket observador-fotos listo' as resultado;
