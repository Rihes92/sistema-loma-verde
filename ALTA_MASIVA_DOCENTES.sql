-- ═══════════════════════════════════════════════════════════════════════
-- SABIE — ALTA MASIVA DE USUARIOS PARA LOS DOCENTES
-- Creado: auditoría previa al lanzamiento institucional (jul 26, 2026)
--
-- ⚠️ LEE ESTO COMPLETO ANTES DE CORRERLO.
--
-- QUÉ RESUELVE:
-- La app NO tiene registro propio: un docente solo puede entrar si alguien
-- le creó antes un usuario. Crearlos uno por uno en el panel de Supabase
-- (Authentication → Users → Add user) para ~50 docentes es inviable en un
-- fin de semana. Este script los crea TODOS de una vez, tomando los correos
-- que ya están escritos en las fichas de docente (Coordinación → Docentes).
--
-- CÓMO FUNCIONA:
--   · Solo crea usuarios para docentes que YA tengan correo en su ficha.
--   · NO toca a quien ya tenga usuario (es seguro re-correrlo).
--   · A todos les pone la MISMA contraseña temporal (la defines abajo).
--   · Los deja con el rol 'docente' en la tabla perfiles.
--
-- ═══════════════════════════════════════════════════════════════════════
-- 🔴 PASO 1 OBLIGATORIO — CAMBIA LA CONTRASEÑA TEMPORAL
--    Cámbiala en la línea marcada más abajo ('SabieLomaVerde2026*').
--    Escoge algo que puedas dictar en voz alta el lunes.
--
-- 🔴 PASO 2 OBLIGATORIO — EL LUNES, EN LA PRESENTACIÓN
--    Diles a TODOS que cambien la contraseña apenas entren:
--    Portal → recuadro de usuario (abajo a la izquierda) → "Cambiar
--    contraseña". Mientras no la cambien, cualquiera que sepa la clave
--    temporal puede entrar con el correo de otro y ver sus datos.
--
-- 🔴 PASO 3 — ANTES DE CORRER ESTO
--    Asegúrate de que cada docente tenga su correo escrito en su ficha
--    (Coordinación → Docentes). Los que no lo tengan, NO se crean —
--    la consulta del final te dice exactamente quiénes quedaron por fuera.
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- PASO A — Vista previa: ¿a quiénes se les va a crear usuario?
-- Corre PRIMERO solo esta consulta y revisa la lista.
-- ───────────────────────────────────────────────────────────────────────
select
  d.datos->>'nombre'                        as se_creara_usuario_para,
  trim(lower(d.datos->>'email'))            as correo
from lv_docentes d
where coalesce((d.datos->>'_eliminado')::boolean, false) = false
  and coalesce(trim(d.datos->>'email'), '') <> ''
  and not exists (
    select 1 from auth.users u
    where lower(u.email) = trim(lower(d.datos->>'email'))
  )
order by 1;


-- ───────────────────────────────────────────────────────────────────────
-- PASO B — Creación real.
-- Si la lista de arriba se ve bien, corre este bloque.
-- ───────────────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

do $$
declare
  -- 🔴🔴🔴 CAMBIA ESTA CONTRASEÑA TEMPORAL 🔴🔴🔴
  clave_temporal text := 'ESCRIBE_AQUI_LA_CLAVE_TEMPORAL';
  -- 🔴🔴🔴 ─────────────────────────────── 🔴🔴🔴
  r            record;
  nuevo_id     uuid;
  creados      int := 0;
begin
  for r in
    select trim(lower(d.datos->>'email')) as email,
           d.datos->>'nombre'             as nombre
    from lv_docentes d
    where coalesce((d.datos->>'_eliminado')::boolean, false) = false
      and coalesce(trim(d.datos->>'email'), '') <> ''
      and not exists (
        select 1 from auth.users u
        where lower(u.email) = trim(lower(d.datos->>'email'))
      )
  loop
    nuevo_id := gen_random_uuid();

    -- Usuario de autenticación, con el correo ya confirmado
    -- (para que no tengan que abrir ningún enlace de verificación).
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      nuevo_id, 'authenticated', 'authenticated', r.email,
      crypt(clave_temporal, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nombre', r.nombre),
      '', '', '', ''
    );

    -- Identidad de proveedor "email" — sin esto el login falla
    -- en las versiones recientes de Supabase.
    insert into auth.identities (
      provider_id, id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      nuevo_id, gen_random_uuid(), nuevo_id,
      jsonb_build_object('sub', nuevo_id::text, 'email', r.email, 'email_verified', true),
      'email', now(), now(), now()
    );

    creados := creados + 1;
  end loop;

  raise notice 'Usuarios creados: %', creados;
end $$;


-- ───────────────────────────────────────────────────────────────────────
-- PASO C — Asegurar que todos tengan rol 'docente' en perfiles.
-- (El rol de coordinación/rectoría se asigna después desde la app:
--  Coordinación → pestaña 🔑 Roles.)
-- ───────────────────────────────────────────────────────────────────────
insert into perfiles (id, rol)
select u.id, 'docente'
from auth.users u
where not exists (select 1 from perfiles p where p.id = u.id)
on conflict (id) do nothing;


-- ───────────────────────────────────────────────────────────────────────
-- PASO D — VERIFICACIÓN FINAL
-- Revisa que nadie quede en rojo. Los que aparezcan con "falta correo"
-- hay que arreglarlos a mano en Coordinación → Docentes y volver a correr.
-- ───────────────────────────────────────────────────────────────────────
select
  coalesce(d.datos->>'nombre', '(sin nombre)')              as docente,
  coalesce(nullif(trim(lower(d.datos->>'email')), ''), '—') as correo,
  case
    when coalesce(trim(d.datos->>'email'), '') = ''
      then '❌ Falta el correo en su ficha (Coordinación → Docentes)'
    when u.id is null
      then '❌ Sigue sin usuario — revisar'
    else '✅ Listo para entrar'
  end                                                       as estado
from lv_docentes d
left join auth.users u
       on lower(u.email) = trim(lower(d.datos->>'email'))
where coalesce((d.datos->>'_eliminado')::boolean, false) = false
order by
  case
    when coalesce(trim(d.datos->>'email'), '') = '' then 0
    when u.id is null then 1
    else 2
  end,
  docente;
