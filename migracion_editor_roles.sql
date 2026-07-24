-- ═══════════════════════════════════════════════════════════════
-- SABIE — Editor de roles en la app (julio 2026, sesión 25)
--
-- Permite que SOLO el administrador/rector (rol 'admin') vea y edite
-- los roles de todos los usuarios desde Coordinación → 🔑 Roles.
--
-- QUÉ HACE:
--   · es_admin()  → NUEVA. true solo si el usuario actual tiene rol 'admin'
--     (más estricta que es_coordinacion(), que incluye coordinador).
--   · perfiles    → política de lectura: cada quien ve SU perfil, y el
--     admin ve TODOS. Política de update: solo el admin puede cambiar
--     roles (el rol viaja por PATCH desde la app con el token del admin).
--
-- SEGURO / REVERSIBLE:
--   · Solo toca la tabla perfiles y agrega una función. Idempotente.
--   · es_admin() es SECURITY DEFINER: lee perfiles sin recursión de RLS.
--   · ROLLBACK al final.
--
-- Ejecutar en: Supabase → SQL Editor → pega todo → Run.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Función es_admin() ───────────────────────────────────────
create or replace function public.es_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- ── 2. Políticas de perfiles ────────────────────────────────────
alter table perfiles enable row level security;

-- lectura: el propio perfil, o TODO si es admin
drop policy if exists "perfil_propio_select" on perfiles;
drop policy if exists "perfil_select" on perfiles;
create policy "perfil_select" on perfiles
  for select to authenticated
  using ( id = auth.uid() or public.es_admin() );

-- escritura del rol: SOLO admin
drop policy if exists "perfil_admin_update" on perfiles;
create policy "perfil_admin_update" on perfiles
  for update to authenticated
  using ( public.es_admin() )
  with check ( public.es_admin() );

-- ── 3. VERIFICACIÓN (solo lectura) ──────────────────────────────
--   Como admin verás la lista completa; como docente, solo tu fila.
select email, rol from perfiles order by rol, email;


-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK (descomenta y corre para revertir a como estaba)
-- ═══════════════════════════════════════════════════════════════
-- drop policy if exists "perfil_select"       on perfiles;
-- drop policy if exists "perfil_admin_update" on perfiles;
-- create policy "perfil_propio_select" on perfiles
--   for select to authenticated using (id = auth.uid());
-- drop function if exists public.es_admin();
