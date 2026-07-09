# Guía: activar la seguridad del Sistema Loma Verde

El código nuevo ya está listo y es **compatible con el estado actual** (la app sigue funcionando igual hasta que completes estos pasos). Hazlos en orden, con 20–30 minutos disponibles.

## Paso 1 — Backup
En Supabase: **Database → Backups** (o exporta cada tabla a CSV desde el Table Editor).

## Paso 2 — Crear los usuarios de los docentes
En Supabase: **Authentication → Users → Add user → Create new user**.
- Crea un usuario por cada docente, con su correo y una contraseña temporal.
- Marca "Auto Confirm User" para que no necesiten confirmar el correo.
- **Importante:** el correo debe ser EXACTAMENTE el mismo que aparece en la ficha del docente en Coordinación (campo "Correo"). Así el sistema los vincula al iniciar sesión.
- Crea también tu propio usuario (administrador).

## Paso 3 — Correr la migración SQL
En Supabase: **SQL Editor → New query**, pega el contenido de `migracion_seguridad.sql` y ejecuta (**Run**).
Esto activa el candado real: desde ese momento, sin iniciar sesión no se puede leer ni escribir NADA en la base de datos.

## Paso 4 — Asignarte el rol de administrador
En el mismo SQL Editor:
```sql
update perfiles set rol = 'admin' where email = 'richard.mhsabie@icloud.com';
```
(usa el correo con el que creaste tu usuario). Los roles `admin` y `coordinador` dan acceso al módulo de Coordinación; los docentes normales no lo ven.

## Paso 5 — Probar
1. Abre la app y cierra sesión si estabas dentro.
2. Entra con tu correo y contraseña nuevos.
3. Verifica que se cargan tus datos y que Coordinación abre para ti.
4. Entra con el usuario de un docente y verifica que solo ve sus materias.

## Paso 6 — Desplegar
Sube los cambios a Vercel (git push). El service worker se actualiza solo (versión de caché nueva).

---

## Qué cambió exactamente

| Antes | Ahora |
|---|---|
| La base de datos aceptaba lecturas y escrituras de cualquiera con la anon key (visible en el código fuente) | Solo usuarios autenticados en Supabase pueden leer/escribir (RLS) |
| Claves de docentes guardadas en texto plano y descargadas a todos los dispositivos | Contraseñas gestionadas por Supabase Auth (cifradas, nunca salen del servidor) |
| Clave maestra `lomaverde-admin-2026` y clave de coordinación `coordinacion2026` escritas en el código | Roles reales en la tabla `perfiles` (admin/coordinador/docente) |
| Los módulos se abrían por URL directa sin login | Todos los módulos redirigen a login si no hay sesión |
| Descargaba TODAS las tablas completas cada 15 segundos | Solo baja lo que cambió desde la última descarga (sync incremental) |
| Techo silencioso de 1.000 filas por tabla | Paginación automática, sin límite |
| Guardar una nota re-subía todos los registros uno por uno | Solo sube lo que cambió, en un solo envío por tabla |
| Si el almacenamiento local se llenaba, fallaba en silencio | Aviso al 80% y alerta roja si un guardado falla, con botón de respaldo |

## Preguntas frecuentes

**¿Y si un docente olvida su contraseña?**
Supabase → Authentication → Users → (usuario) → "Send password recovery" o cámbiasela directamente con "Update password".

**¿La app sigue funcionando sin internet?**
Sí. La sesión queda guardada en el dispositivo; los cambios se encolan y se suben al volver la conexión, igual que antes.

**¿Debo borrar las claves viejas de los docentes?**
El campo ya no existe en Coordinación y el login ya no las usa. Si quieres limpiarlas de la base: los registros de `lv_docentes` guardan `datos` como JSON; se limpiarán solos a medida que edites cada docente. No es urgente porque ya no se descargan sin autenticación.

**¿Qué pasa si corro el SQL antes de crear los usuarios?**
Nadie podrá entrar hasta que los crees. Por eso el orden: usuarios primero, SQL después.
