# SABIE — Contexto del proyecto para Claude

> Lee este archivo completo antes de trabajar en el proyecto. Resume qué es, cómo funciona,
> qué decisiones se han tomado y qué falta. Actualízalo cuando hagas cambios importantes.

## ▶ POR DÓNDE RETOMAR (último estado: jul 14, 2026)

- **Etapa 2 (arquitectura) — CONSOLIDADA en punto seguro.** Fase 0 (etiquetado de dueño
  `_owner`) y Fase 1 (RLS de privacidad en resultados) están DESPLEGADAS y funcionando
  (SW v45). La **Fase 2 (por curso) queda PAUSADA a propósito**: es grande y frágil por
  las referencias de curso inconsistentes (ver roadmap punto 5, "COMPLEJIDAD DETECTADA").
  NO improvisar en caliente; retomarla en sesión dedicada, con groundwork por módulo y
  pruebas tabla por tabla. Para esa parte pesada de diseño conviene Opus; el groundwork
  mecánico, Sonnet.
- **Siguiente trabajo acordado (hacer con Sonnet 5):** (a) los "menores" del backlog F
  (headers de módulos 10-15, campos de institución DANE/resolución/escudo + membrete);
  (b) **módulo nuevo PTA / Centros de Interés** — especificación completa en
  `ESPECIFICACION_MODULO_PTA.md` (léela antes de construir).
- **Pendiente operativo:** desplegar quedó hecho (Fase 0/1). El botón 🤖 en el módulo
  **04 (exámenes 11)** sigue sin hacer (replicar del 03) si se quiere.


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
4. ✅ **Seguridad** — completada (jul 2026): `migracion_seguridad_v2.sql` corrido en
   Supabase y verificado (0 tablas sin RLS): RLS en TODAS las tablas, roles en SERVIDOR
   para lv_docentes/lv_asignaciones/lv_institucion vía `es_coordinacion()` (lv_malla
   abierta a docentes por el Planeador). XSS: escapado agregado a herramientas-comun.js
   y tiquete.html. Además se detectó y corrigió que lv_resultados, lv11_examenes,
   lv11_resultados y lv11_simulacros_ext NUNCA existieron en Supabase
   (`migracion_tablas_faltantes.sql` corrido — esos datos ahora sí sincronizan).

5. 🔄 **Arquitectura etapa 2** — EN CURSO (objetivo acordado: privacidad + espacio,
   por fases con pruebas y reversa). Hallazgos clave: (a) sync ya descarga con el token
   del docente, así que apretar RLS reduce el espejo casi sin tocar sync.js; (b) los
   registros "propios" NO guardaban dueño (planeadores/exámenes solo el *nombre*, banco
   solo la *materia*) y el `docenteId` de la app es el id de lv_docentes (por correo),
   NO el `auth.uid()` de RLS. Plan por fases:
   · **Fase 0 (HECHA, jul 14):** etiquetado central del dueño. `LV_AUTH.ownerId()` (=auth
     uid) + estampado de `_owner` en `sync.js/marcarCambio` para todo registro envuelto
     {id,datos} al subir (idempotente, no toca horario ni lecturas, no roba propiedad si
     ya hay _owner). Deja base para filtrar por dueño sin cambiar módulos. SW v45.
   · **Fase 1 (SQL LISTO, jul 14 — `migracion_etapa2_fase1.sql`):** RLS por `_owner`
     como POLÍTICAS solamente (transición `using (datos->>'_owner' = auth.uid()::text
     OR datos->>'_owner' IS NULL OR es_coordinacion())`, sin cambiar esquema, reversible,
     con ROLLBACK incluido). DECISIONES de Francy (jul 14): planeadores = VISIBLES entre
     docentes y exámenes = compartidos (materiales de enseñanza) → NO se restringen;
     banco = compartido por materia → va a Fase 2 (predicado por asignación); resultados
     de desempeño = PRIVADOS → Fase 1 cubre solo `lv_resultados`, `lv11_resultados`,
     `lv11_simulacros_ext`. `lv_herramientas` se dejó FUERA (alimenta la planilla mod.01
     y 8 herramientas; se revisa aparte). Correr el SQL DESPUÉS de desplegar Fase 0; los
     registros viejos (_owner NULL) siguen visibles hasta el backfill (pendiente, por
     tabla, con mapeo cuidadoso).
   · **Fase 2 (PAUSADA — consolidada jul 14, retomar en sesión dedicada):** tablas por-curso (estudiantes/notas/asistencia/acudientes/boletines/
     observador/piar) con predicado vía `lv_asignaciones`; probar tabla por tabla que
     ningún módulo pierda datos (director de grupo, boletines, analítica).
     ⚠️ COMPLEJIDAD DETECTADA (jul 14): las referencias de curso NO son homogéneas —
     asignaciones guardan {docenteId(=lv_docentes.id, por correo), materia, grado, grupo}
     SIN cursoId; cursos tienen su propio cursoId + (grado,grupo,materia); estudiantes/
     notas referencian cursoId; PERO observador/piar guardan estId + un TEXTO de curso
     ("grado - grupo", formato variable, p.ej. grupo||'único"); y hay comodines de acceso
     total ("Todas las materias", área "Primaria"). Filtrar por curso en RLS exige un
     puente SECURITY DEFINER `mis_cursos()` (correo→docente→asignaciones→cursos→cursoId,
     honrando comodines) + normalizar/estampar un cursoId limpio en observador/piar/etc.
     desde la app (groundwork estilo Fase 0, pero NO se puede hacer central en sync.js
     porque el cursoId no está en el registro — requiere edición por módulo). Por eso
     Fase 2 = su propio trabajo planificado con pruebas, NO improvisar en caliente.
   · **Fase 3 (opcional, la más grande):** IndexedDB + consultas por demanda para los
     catálogos grandes que son COMPARTIDOS y hoy se espejan a cada equipo (lv_actividades
     ~647 ítems, estudiantes ~800). Requiere refactor async por módulo. Solo si aprieta.
   Referencia: migration_multitenant.sql (usa docente_id+default; NOSOTROS optamos por
   _owner en el JSON para que Fase 1 sea solo políticas).

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

## Backlog acordado (jul 2026) — orden de ejecución sugerido

A. **GEMs v2** (hecho): `GEMs/gem_planeador_ciencias_sociales.md` y `GEMs/gem_banco_preguntas.md`
   reescritos para que Gemini/Claude/GPT devuelvan JSON importable directo (esquema exacto
   incluido). Corregidos: los .md originales NO especificaban el formato JSON de la app;
   el ejemplo de planeador traía la clave "banco" DUPLICADA (JSON.parse descarta la primera
   → las preguntas se perdían al importar); distractores absurdos y respuesta correcta
   siempre en B en el banco de ejemplo; typos.

B. ✅ **Importador robusto** (hecho): módulos 02/03/04 validan JSON al importar — errores
   de parseo con detalle, clave "banco" duplicada bloqueada, campos faltantes por
   planeador, validación por tipo de pregunta (multiple: 4 opciones + correcta 0-3;
   vf: booleano; abierta: respuesta modelo). Importa las válidas y reporta el resto.

C. ✅ **Banco de actividades de primaria** (código listo, falta subir archivos):
   módulo `16-actividades.html` creado (filtros grado/categoría/tipo, visor con
   descarga autenticada de Storage, imprimir/descargar), tabla en MAPA de sync,
   enlace en sidebar + materia-hub, `migracion_actividades.sql` (bucket privado
   'actividades' + política lectura autenticados + tabla + catálogo de 647 items).
   Carpeta `Subir_a_Supabase/` (881 MB, nombres saneados = rutas del catálogo,
   en .gitignore) lista para arrastrar al bucket. COMPLETADO (jul 13): SQL corrido y
   archivos subidos al bucket — el banco está EN PRODUCCIÓN. Puede borrar Subir_a_Supabase/. Videos → YouTube no listado (luego se
   agregan al catálogo como tipo 'video' con url). Detalle original: decisiones tomadas — PDFs curados
   en Supabase Storage PRIVADO (bucket tras login, meta <1 GB), videos en YouTube no
   listado del colegio, material restante como enlaces OneDrive. Copyright: el material
   de terceros (kits comerciales, papercraft Marvel) es SOLO para uso interno del
   colegio, NUNCA en la versión vendible. `Catalogo_Banco_Actividades.xlsx` generado
   (916 archivos, 4.2 GB); Francy marca "Incluir SÍ/NO" y luego: subir a Storage +
   módulo nuevo
   `16-actividades.html` + tabla `lv_actividades` {id, datos} con metadatos (título, grado,
   área, tipo: pdf/video/papercraft/interactivo, url, etiquetas). Archivos PDF en Supabase
   Storage (1 GB gratis; si crece, links a Drive/YouTube en vez de subir). El docente
   filtra por grado/área/tipo, previsualiza, imprime, y puede anexar la actividad a un
   planeador. Los PDF del usuario están hoy fuera de la app (pedirle la carpeta).

D. ✅ **Generación con IA dentro de la app** (código listo, falta la API key):
   `api/generar.js` (función serverless Vercel, runtime Node). Recibe
   `{tipo:'planeador'|'banco', datos}`, **verifica el token del docente contra Supabase**
   (`/auth/v1/user`) antes de gastar cupo, arma el prompt con los **GEMs v2 embebidos**
   como system prompt y llama a **Gemini** eligiendo el modelo AUTOMÁTICAMENTE (lista los
   modelos flash gratuitos disponibles para la clave del docente y toma el mejor —
   `gemini-2.5-flash` fue restringido para claves nuevas jul 2026; por eso no se fija
   un nombre; se puede forzar con la env `GEMINI_MODEL`). **Modelo de clave: CADA docente aporta la suya** (decisión de Francy, jul 13):
   NO hay clave compartida ni env `GEMINI_API_KEY`. El docente crea su clave gratis
   (aistudio.google.com/apikey) y la pega una vez en "🔑 Tu clave de Gemini" dentro de
   Generar con IA; se guarda en `localStorage` (`lv_gemini_key`, helper `LV_GEMINI` en
   auth.js — NO está en el MAPA de sync.js, así que nunca viaja a Supabase ni a otros
   equipos). La función recibe la clave en el header `X-Gemini-Key` (no la guarda ni la
   loguea). Botón **🤖 Generar con IA**: pestaña nueva en el Planeador (02) y
   tarjeta en el Banco (03) — formulario (grado/periodo/eje o temática/sesiones o N°
   preguntas/notas) → POST a `/api/generar` con el token → la respuesta pasa por **el
   mismo importador** (refactorizado en `validarImportPlaneadores`/`guardarPlaneadores` y
   `validarPreguntas`/`guardarPreguntas`, reutilizados por importación de archivo y por IA)
   → se guarda en lv_planeadores/lv_banco. Mensajes de error amables (cuota 429, key
   inválida 403, JSON malo 502, sin sesión 401). Testeado con fetch simulado (11 casos,
   happy path + errores). GEM embebido = copia de `GEMs/*.md`; si editas los .md hay que
   recopiar en `api/generar.js`. Módulo 04 (once) NO se tocó todavía (queda como 03).
   **PENDIENTE:** solo desplegar el código (git push → Vercel). NO hay paso de env en
   Vercel. Cada docente pega su propia clave dentro de la app (ver `GUIA_ACTIVAR_IA.md`).
   Solo con internet.

E. **Arquitectura etapa 2** (alta dificultad, baja urgencia mientras no crezca el uso):
   filtrado por fila RLS + consultas bajo demanda + IndexedDB (ver roadmap punto 5).
   → EN CURSO: Fase 0 hecha (etiquetado de dueño). Ver roadmap punto 5 para el plan por fases.

F. Menores: unificar headers visuales de módulos 10-15, respaldos automáticos
   (Supabase → Backups programados), campos extra de institución (DANE, resolución,
   escudo) en lv_institucion y membrete de comunicados.

## Estado al cierre de la sesión (jul 13, 2026)
Hecho y en producción: fixes, rediseño (login pantalla dividida con logo nuevo
sabie-full.jpg / portal sidebar), arquitectura etapa 1, seguridad completa,
GEMs v2, importador robusto, banco de actividades (módulo 16 + bucket subido).
**Generación con IA (backlog D): CÓDIGO LISTO** — `api/generar.js` + botón 🤖 en
Planeador (02) y Banco (03), Gemini gemini-2.5-flash, importador reutilizado,
testeado (12 casos). **Clave POR DOCENTE** (no compartida): header `X-Gemini-Key`,
guardada en localStorage `lv_gemini_key` (helper `LV_GEMINI` en auth.js, fuera del MAPA
de sync). **Etapa 2 arrancada: Fase 0 HECHA** (etiquetado de dueño `_owner` central en
sync.js + `LV_AUTH.ownerId()`; ver roadmap punto 5 para el plan por fases). SW en **v45**. FALTA para activarla: solo desplegar (git push → Vercel, sin
env); cada docente pega su clave en la app (`GUIA_ACTIVAR_IA.md`).
SIGUIENTE PASO ACORDADO: desplegar, luego replicar el botón 🤖 en
el módulo **04 (exámenes 11)** si se quiere, videos → YouTube no listado (catálogo
tipo 'video'), arquitectura etapa 2, menores (F). Git: locks de OneDrive impiden
commits desde Cowork; Francy usa su ritual de Terminal (rm locks + add + commit + push).
