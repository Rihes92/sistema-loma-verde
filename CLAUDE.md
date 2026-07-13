# SABIE — Contexto del proyecto para Claude

> Lee este archivo completo antes de trabajar en el proyecto. Resume qué es, cómo funciona,
> qué decisiones se han tomado y qué falta. Actualízalo cuando hagas cambios importantes.

## Qué es

**SABIE** (Sistema de Aprendizaje, Bienestar e Inclusión Educativa) es la plataforma docente
de la I.E. San José de Loma Verde (Colombia): ~800 estudiantes, ~50 docentes de primaria y
bachillerato. Dueño del proyecto: Francy Vargas (agresotlomaverde@gmail.com). Visión a largo
plazo: convertirla en producto vendible a otros colegios (multi-tenant), por eso la marca es
SABIE y el nombre del colegio se retiró de la interfaz (solo permanece dentro de plantillas de
documentos impresos/WhatsApp, que luego será configurable).

## Stack y arquitectura actual

- **Frontend:** HTML/CSS/JS vanilla, sin framework ni build. Un archivo HTML por módulo,
  cada uno con su propio CSS embebido + `lv-tema.css` compartido (paleta azul `#1e3a8a`).
- **Backend:** Supabase (proyecto `loztrkwlttxyfhbkznyu`) — Auth (email+password) y Postgres
  vía REST. La anon key está en `auth.js` y `sync.js` (duplicada).
- **Datos:** patrón offline-first. TODO se guarda en `localStorage` (claves `lv_*`) y
  `sync.js` lo sincroniza con Supabase: cola de pendientes, upsert por lotes, descarga
  incremental por `actualizado_en`, polling cada 15 s, merge "gana el más reciente".
  El mapeo clave→tabla está en `MAPA` dentro de `sync.js`.
- **Auth:** `auth.js` (LV_AUTH) guarda sesión en localStorage, renueva tokens, expone
  `exigirSesion()` que cada página llama al inicio. Roles en tabla `perfiles`
  (docente/coordinador/admin); `lv_login` en localStorage guarda `{docenteId, nombre, esAdmin}`.
- **PWA:** `manifest.json` + `sw.js` (cache versionada manualmente: `loma-verde-vNN`;
  **hay que subir el número en cada despliegue**). Deploy: GitHub
  (`Rihes92/sistema-loma-verde`, rama `main`) → Vercel automático.

## Estructura

- `login.html` / `recuperar.html` — pantalla dividida (panel azul con logo centrado + form).
- `index.html` — portal con **sidebar fija** (grupos: Mi clase, Estudiantes, Institución,
  Herramientas), topbar con saludo/fecha, secciones: Para hoy → Buscador de estudiantes →
  Áreas académicas (acordeón filtrado por asignaciones del docente) → Resumen → Alertas →
  Actividad. Coordinación solo visible para admin.
- `materia-hub.html` — al elegir área+materia muestra los 15 módulos en dos secciones:
  "de la materia" (01-09, reciben `?area=&materia=`) e "institucionales" (10-15).
- `modulos/01..15` — calificaciones, planeador, exámenes 6-10, simulacros 11 (ICFES),
  asistencia, comunicados, horario, eventos, acudientes, observador (Ley 1620), inclusión
  (DUA/PIAR Decreto 1421), director de grupo, boletines, analítica, herramientas.
- `modulos/herramientas/` — 9 herramientas formativas (test lectura, cálculo mental,
  rúbricas, sociograma, etc.) que envían notas a la planilla.
- `coordinacion.html` — gestión de docentes, asignaciones, malla, papelera (solo admin).
- `materia-context.js` (LV_CTX) — contexto área/materia por URL/sessionStorage; incluye
  migración de registros viejos sin materia (se etiquetan 'Sociales').
- SQL en raíz: `migracion_seguridad.sql` (RLS — verificar si ya se corrió),
  `migration_multitenant.sql`, otros parciales.

## Roadmap acordado (en orden)

1. ✅ **Fixes** — buscador muerto (script src+inline), hero desactualizado, materia-hub
   incompleto, títulos unificados "— SABIE", nombre institucional fuera de la UI.
2. ✅ **Visual** — login pantalla dividida (solo logo+nombre+significado, centrado),
   portal con sidebar. Paleta azul se mantiene.
3. ✅ **Arquitectura (etapa 1)** — hecho:
   - URL/KEY de Supabase en UNA fuente: `auth.js` (LV_AUTH); `sync.js` la referencia.
   - **Branding configurable:** tabla `lv_institucion` (correr `migracion_instituciones.sql`
     en Supabase), helper `LV_INST` en auth.js (nombre/corto/sede con fallback al nombre
     actual), se edita en Coordinación → Resumen → Institución. Los documentos impresos,
     WhatsApp y exámenes exportados (viaja en `DATA.inst`) ya lo usan.
   - **Sync por demanda:** cada módulo declara `window.LV_SYNC_TABLAS=[...]` antes de
     sync.js → descarga/polling solo tocan esas tablas (+lv_institucion siempre).
     El portal, coordinación y login sincronizan todo (sin declaración). Las subidas
     nunca se filtran. Si un módulo lee una tabla no declarada, el dato llega igual al
     pasar por el portal; solo agregar la clave a su lista si necesita frescura en vivo.
   - CSS duplicado: se evaluó y se pospuso (solo 12 reglas idénticas entre módulos;
     riesgo > beneficio). Hacerlo cuando se rediseñen módulos con componentes comunes.
   - **Pendiente (etapa 2, va junto con seguridad):** dejar de espejar toda la base por
     dispositivo — filtrado por fila en RLS (docente ve solo lo suyo) + consultas por
     curso bajo demanda + IndexedDB como caché. Requiere refactor por módulo porque hoy
     todos leen localStorage de forma síncrona.
4. 🔄 **Seguridad** — en curso: `migracion_seguridad_v2.sql` creado (idempotente):
   RLS + actualizado_en en las 24 tablas (v1 dejaba 6 por fuera), roles en SERVIDOR
   para lv_docentes/lv_asignaciones/lv_institucion vía `es_coordinacion()` (lv_malla
   queda abierta a docentes por el Planeador), y consultas de verificación al final.
   XSS: escapado agregado a herramientas-comun.js y tiquete.html (selectores).
   Falta: correr la v2 en Supabase y pegar la verificación; luego etapa 2 de
   arquitectura (filtrado por fila + datos por demanda).
   (contexto v1: `migracion_seguridad.sql` —
   OJO: su lista de tablas NO incluye las nuevas lv_observador, lv_piar,
   lv_inclusion_actividades, lv_boletines, lv_herramientas ni lv_institucion),
   políticas por rol en servidor (hoy el gate de Coordinación es solo cliente),
   unificar escapado XSS (~200 usos de innerHTML, solo 6 módulos tienen `esc()`),
   y ahí mismo la etapa 2 de arquitectura (filtrado por fila + datos por demanda).

## Convenciones y trampas conocidas

- Editar archivos con cuidado: scripts con `src` NO pueden llevar código inline (ya causó
  un bug grave en index.html).
- Tras cualquier cambio desplegado: subir versión de `CACHE` en `sw.js`.
- Los docentes ven materias según `lv_asignaciones` (docenteId + materia); área 'Primaria'
  o materia 'Todas las materias' = acceso total.
- Estructuras especiales en sync: `horario` (objeto por materia/día/hora) y `asistencia`
  (`{cursoId_fecha: {...}}`); el resto son arrays con `{id, datos}` (JSON envuelto).
- Borrados lógicos: `_eliminado: true` (papelera 30 días en Coordinación).
- El nombre del colegio SÍ debe permanecer en: plantillas de comunicados/WhatsApp,
  impresiones de exámenes, boletines, PIAR, observador (documentos oficiales).
