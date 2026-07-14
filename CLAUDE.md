# SABIE — Contexto del proyecto para Claude

> Lee este archivo completo antes de trabajar en el proyecto. Resume qué es, cómo funciona,
> qué decisiones se han tomado y qué falta. Actualízalo cuando hagas cambios importantes.

## ▶ POR DÓNDE RETOMAR (último estado: jul 14, 2026 — sesión 3)

- **Fuga de privacidad corregida en el portal (`index.html`).** Francy notó que
  "Resumen del sistema" y "Actividad reciente" mostraban cursos/notas/asistencia de
  OTROS docentes. Causa: con la Fase 2 de arquitectura pausada, cada dispositivo
  espeja TODAS las materias de TODOS los docentes en localStorage, y esas dos
  secciones leían `lv_cursos`/`lv_calificaciones`/`lv_examenes`/`lv_planeadores`/
  `lv_as_asistencia` sin filtrar. Arreglo: se extrajo el cálculo de permisos
  (`PERM` + `permiteMateria()`, arriba del todo del script de `index.html`) que
  reutiliza el MISMO mecanismo que ya filtraba el menú "Áreas académicas" —
  `lv_asignaciones` por `docenteId`, con `materia` ya etiquetada en cursos/exámenes/
  planeadores (no la complejidad de "por curso" de la Fase 2, que sigue pausada).
  Asistencia (`lv_as_asistencia`/`lv_as_estudiantes`, sin etiqueta de materia) se
  filtra por pertenencia de `cursoId` a los cursos ya filtrados. `lv_com_historial`
  (Comunicados) no tiene etiqueta de materia todavía → se omite de "Actividad
  reciente" para docentes normales (solo Coordinación/accesoTotal la ve), para no
  arriesgar exponer citaciones de otros cursos. Admin y quienes tienen "Primaria" o
  "Todas las materias" en sus asignaciones (`accesoTotal`) siguen viendo todo, igual
  que en el menú. SW **v50**. PENDIENTE: push y probar con una cuenta docente real
  (no admin) para confirmar que el resumen ya solo muestra lo suyo.
- **Checklist de "Docentes asignados" (sesión 2): confirmado arreglado** por Francy
  tras el despliegue — ya no hace falta tocarlo.
- **Backlog F ("menores") — headers unificados, jul 14 sesión 3.** Los 6 módulos
  10-15 no tenían el logo `../Logo/logo.jpg` en su `<header class="appbar">` (sí lo
  tenían 05/16/17); además 14-analítica y 15-herramientas no tenían `<span
  class="pill">` ni la clase `.pill` en su CSS, y 15 tenía el botón "← Portal" sin
  `class="portal-btn"` (usaba el selector genérico `header.appbar a`). Se agregó el
  logo a los 6, el pill "SABIE" a 14/15 (10-13 ya tenían un pill, se dejó su texto
  tal cual — p.ej. 11 dice "Decreto 1421/2017"), y se corrigió la clase del botón en
  15. SW **v51**. NO se tocó el orden de `auth.js`/`exigirSesion()` (10-15 y 16 lo
  cargan en `<head>`; 05 y 17 después de `<body>` — inconsistente entre sí pero
  funciona en ambos casos; tocar el orden de scripts es justo lo que causó un bug
  grave antes, así que se dejó igual).
  **PENDIENTE de backlog F:** campos de institución (DANE, resolución, escudo) +
  membrete de comunicados — necesita decisiones de Francy (qué campos exactos, si
  ya tiene el escudo/resolución a mano). Respaldos automáticos de Supabase NO es
  código de la app — se configura en Supabase → Database → Backups (Point-in-Time
  Recovery), fuera del alcance de este repo.

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 2)

- **Ajustes post-despliegue al módulo Centros de Interés** (Francy ya corrió el SQL e
  hizo push del código inicial): (1) se corrigió un bug visual real — el checklist de
  "Docentes asignados" (Coordinación) y el picker de "estudiantes existentes" (módulo 17)
  se veían rotos porque la regla CSS genérica `input,select{width:100%;padding;border}`
  también inflaba los checkboxes/radios a cajas gigantes; se resetean aparte
  (`input[type=checkbox],input[type=radio]{...}`) y las listas pasaron a grid de 2+
  columnas con texto truncado. (2) Francy subió 2 fichas reales de PTAFI (Ajedrez,
  SteMedIA) — son documentos de proyecto completos (justificación, objetivos,
  metodología, cronograma, recursos, evaluación), demasiado grandes para el formulario
  rápido de "crear centro". Se agregaron 3 campos OPCIONALES a `lv_centros` (sin migración
  SQL — es JSONB): `poblacion` (texto libre, ej. "12 a 17 años"), `objetivoGeneral`
  (textarea corto) y `fichaUrl` (link a la ficha completa en OneDrive/Drive, con
  `safeUrl()` para evitar esquemas raros en el href). Se muestran en la tarjeta del
  centro (módulo 17) y en la tabla de Coordinación. SW subido a **v49**.
  PENDIENTE: push de este segundo lote de cambios.

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 1)

- **Módulo "Centros de Interés · PTA" — CÓDIGO LISTO, falta desplegar.** Construido según
  `ESPECIFICACION_MODULO_PTA.md` (jul 14): módulo nuevo `modulos/17-centros-interes.html`
  (pestañas Centros / Estudiantes / Asistencia / Resumen) + pestaña nueva **🌟 Centros de
  Interés** en `coordinacion.html` (ahí vive TODO el CRUD de centros: crear/editar/eliminar,
  asignar líder y docentes — decisión de Francy, jul 14: NO dentro del módulo 17). El
  módulo 17 solo LEE `lv_centros` y filtra "mis centros" (líder o asignado, comparando
  `login.docenteId` — NO `auth.uid()`); gestiona inscripciones (import Excel / lista
  masiva / selector de estudiantes existentes) y asistencia (P/F/T/E por sesión) de esos
  centros. Rótulo en la UI: **"Centros de Interés · PTA"** (decisión de Francy). 3 tablas
  nuevas en el MAPA de `sync.js`: `lv_centros`, `lv_centros_inscripciones`,
  `lv_centros_asistencia` (ver detalle en "Estructura" y "Backlog" más abajo). SQL listo
  en `migracion_centros_interes.sql` (RLS: lv_centros solo-lectura para todos + escritura
  solo `es_coordinacion()`; las otras 2 con el patrón `solo_autenticados` de siempre).
  Enlace agregado en sidebar (`index.html`, grupo Institución) y en `materia-hub.html`
  (institucionales). SW subido a **v46**. `node --check` limpio en los 4 archivos tocados.
  **PENDIENTE:** correr `migracion_centros_interes.sql` en Supabase y desplegar
  (git push → Vercel). Nada de esto se ha probado en producción todavía.
- **Etapa 2 (arquitectura) — CONSOLIDADA en punto seguro.** Fase 0 (etiquetado de dueño
  `_owner`) y Fase 1 (RLS de privacidad en resultados) están DESPLEGADAS y funcionando.
  La **Fase 2 (por curso) queda PAUSADA a propósito**: es grande y frágil por
  las referencias de curso inconsistentes (ver roadmap punto 5, "COMPLEJIDAD DETECTADA").
  NO improvisar en caliente; retomarla en sesión dedicada, con groundwork por módulo y
  pruebas tabla por tabla. Para esa parte pesada de diseño conviene Opus; el groundwork
  mecánico, Sonnet.
- **Siguiente trabajo acordado (hacer con Sonnet 5):** los "menores" del backlog F
  (headers de módulos 10-15, campos de institución DANE/resolución/escudo + membrete).
- **Pendiente operativo:** desplegar el módulo de Centros de Interés (ver arriba). El botón
  🤖 en el módulo **04 (exámenes 11)** sigue sin hacer (replicar del 03) si se quiere.


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
- `materia-hub.html` — al elegir área+materia muestra los módulos en dos secciones:
  "de la materia" (01-09, reciben `?area=&materia=`) e "institucionales" (10-17).
- `modulos/01..15` — calificaciones, planeador, exámenes 6-10, simulacros 11 (ICFES),
  asistencia, comunicados, horario, eventos, acudientes, observador (Ley 1620), inclusión
  (DUA/PIAR Decreto 1421), director de grupo, boletines, analítica, herramientas.
- `modulos/16-actividades.html` — Banco de Actividades (fichas/cuadernos de primaria en
  Supabase Storage, visor con descarga autenticada).
- `modulos/17-centros-interes.html` — **Centros de Interés · PTA** (jul 2026): pestañas
  Centros (solo lectura — "mis centros" según líder/asignado), Estudiantes (inscripciones:
  manual, lista masiva, import Excel, o desde `lv_estudiantes`), Asistencia (P/F/T/E por
  sesión + historial por fecha) y Resumen (% asistencia, exporta CSV). El CRUD completo de
  centros (crear/editar/eliminar + asignar líder y docentes) vive en `coordinacion.html`,
  NO en este módulo (decisión de Francy). Tablas: `lv_centros`, `lv_centros_inscripciones`,
  `lv_centros_asistencia` (ver `migracion_centros_interes.sql`). `lv_centros` incluye 3
  campos opcionales (jul 14, sesión 2, sin migración — es JSONB): `poblacion` (texto),
  `objetivoGeneral` (texto corto) y `fichaUrl` (link a la ficha PTAFI completa en
  OneDrive/Drive) — resumen rápido de la ficha oficial, en vez de transcribirla entera.
- `modulos/herramientas/` — 9 herramientas formativas (test lectura, cálculo mental,
  rúbricas, sociograma, etc.) que envían notas a la planilla.
- `coordinacion.html` — pestañas: Docentes, Asignaciones, **🌟 Centros de Interés** (crear/
  editar/eliminar centros, asignar líder + docentes), Resumen, Papelera (solo admin).
- `materia-context.js` (LV_CTX) — contexto área/materia por URL/sessionStorage; incluye
  migración de registros viejos sin materia (se etiquetan 'Sociales').
- SQL en raíz: `migracion_seguridad_v2.sql` (RLS activo, corrido), `migracion_centros_interes.sql`
  (Centros de Interés — pendiente de correr), `migration_multitenant.sql`, otros parciales.

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

G. ✅ **Módulo "Centros de Interés · PTA"** (código listo, jul 14): ver especificación
   completa en `ESPECIFICACION_MODULO_PTA.md`. Construido: `modulos/17-centros-interes.html`
   (Centros/Estudiantes/Asistencia/Resumen) + pestaña **🌟 Centros de Interés** en
   `coordinacion.html` (CRUD completo de centros + asignación de líder/docentes — decisión
   de Francy: NO dentro del módulo 17). 3 tablas nuevas en el MAPA de sync.js: `lv_centros`,
   `lv_centros_inscripciones`, `lv_centros_asistencia`. SQL en `migracion_centros_interes.sql`
   (pendiente de correr en Supabase). Enlaces en sidebar y materia-hub. SW **v46**.
   PENDIENTE: correr el SQL y desplegar.

## Estado al cierre de la sesión (jul 14, 2026)
Hecho y en producción (sesiones previas): fixes, rediseño (login pantalla dividida con logo
nuevo sabie-full.jpg / portal sidebar), arquitectura etapa 1, seguridad completa, GEMs v2,
importador robusto, banco de actividades (módulo 16 + bucket subido), generación con IA
(backlog D, código listo — `api/generar.js` + botón 🤖 en Planeador/Banco, clave POR
DOCENTE vía `lv_gemini_key`), etapa 2 · Fase 0 y Fase 1 (etiquetado `_owner` + RLS de
privacidad en resultados) DESPLEGADAS.

**Esta sesión (jul 14): módulo "Centros de Interés · PTA" — CÓDIGO LISTO, sin desplegar**
(ver punto G del backlog y "POR DÓNDE RETOMAR" arriba). Archivos nuevos/tocados:
`modulos/17-centros-interes.html` (nuevo), `coordinacion.html` (pestaña 🌟 Centros de
Interés), `sync.js` (3 tablas en MAPA), `index.html` (enlace sidebar), `materia-hub.html`
(enlace institucional), `sw.js` (v46), `migracion_centros_interes.sql` (nuevo, sin correr).
`node --check` limpio en los 4 archivos con `<script>` inline tocados.

SIGUIENTE PASO ACORDADO: correr `migracion_centros_interes.sql` en Supabase, desplegar
(git push → Vercel), probar el módulo con datos reales. Después: replicar el botón 🤖 en
el módulo **04 (exámenes 11)** si se quiere, videos → YouTube no listado (catálogo
tipo 'video'), arquitectura etapa 2 · Fase 2 (pausada a propósito), menores (backlog F).
Git: locks de OneDrive impiden commits desde Cowork; Francy usa su ritual de Terminal
(rm locks + add + commit + push).
