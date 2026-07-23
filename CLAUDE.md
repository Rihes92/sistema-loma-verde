# SABIE — Contexto del proyecto para Claude

> Lee este archivo completo antes de trabajar en el proyecto. Resume qué es, cómo funciona,
> qué decisiones se han tomado y qué falta. Actualízalo cuando hagas cambios importantes.

## ▶ POR DÓNDE RETOMAR (jul 22, 2026 — sesión 23d, fusión del asistente IA dentro de Evaluaciones de aula)

- **Duda de Francy:** ¿para qué dos módulos que crean exámenes (el 03 y el 19)?
  HALLAZGO verificado en código: los dos guardan en la MISMA tabla `lv_examenes`
  y la lista "Mis exámenes" del 03 ya mostraba los del 19 (no filtra `esFinal`).
  No son dos productos: son **dos formas de crear** (a mano vs asistente con IA)
  la misma cosa. DECISIÓN de Francy: **fusionar** — el asistente deja de ser un
  módulo aparte y pasa a ser una **página hija** de Evaluaciones de aula.
- **Por qué "página hija" y no fusión de código en un solo archivo:** solo 2 IDs
  se comparten (`doc-out`, `toast`, y para lo mismo), PERO en el JS hay decenas
  de nombres repetidos (`esc`, `uid`, `lsRead`, `lsWrite`, `MALLA`, `GRADOS`,
  `GLBL`, `TIPO_LBL`, `htmlToText`, `validarPreguntas`, `renderLista`…). Pegar el
  asistente entero en el 03 daría SyntaxError por redeclaración. La página hija
  logra la fusión desde el punto de vista del usuario (un solo módulo en la
  barra, un botón dentro que abre el asistente) sin el riesgo de desduplicar
  350 líneas. NO se migró ninguna tabla (ya comparten `lv_examenes`).
- **Cambios (SW v75):**
  · **03 (Evaluaciones de aula):** (a) tarjeta nueva arriba de la pestaña Crear
    con botón **"🤖 Generar con asistente de IA"** (`#b-asistente`) que abre el
    19 llevando `?area=&materia=` (lo setea un `load` con `LV_CTX`). (b) Se
    trajeron los **tres impresos completos** del 19 —membrete `LV_INST`, examen
    por partes con puntaje, hoja de respuestas y **clave del docente** con
    conversión a 1.0–5.0— como funciones `verExamenDoc`/`verHojaDoc`/
    `verClaveDoc` (prefijo `_px*` en los helpers para no chocar con las viejas
    `verExam`/`hojaResp`, que quedan sin usar). Los botones de "Mis exámenes"
    ahora llaman a estos. `_pxPuntos()` asume 1 pt por pregunta cerrada y 2 por
    abierta cuando el examen no trae `puntos` (los creados a mano); los del
    asistente sí traen `x.puntos`. Badge "Examen final" para los `esFinal`. Se
    agregó el CSS de membrete/secc/pts/clave/firma al `.exam-doc` del 03.
  · **19 (ahora "Evaluaciones de aula · Asistente de IA"):** header renombrado,
    botón "← Evaluaciones de aula" (`#volver-eval`), y **se eliminó su lista
    propia** de exámenes (era la duplicación). Al guardar, muestra una pantalla
    de éxito `#p-guardado` con los 3 impresos del recién guardado + "Ver en
    Evaluaciones de aula →" + "Crear otro". `renderLista`/`borrarExamen` y la
    sección `p-lista` borradas; `finalesGuardados()` se conserva solo para que
    los impresos encuentren el examen. Los enlaces de volver conservan el
    contexto de materia.
  · Enlace del 19 **quitado de la barra lateral y de materia-hub** (queda
    accesible solo desde el botón dentro del 03). `navToModule` revertido a
    `0[1-9]` (el 19 ya no está en la barra). El archivo `19-examen-final.html`
    sigue en el precache del SW (es una página viva, no un stub).
- Estado final: **2 módulos de examen** con trabajos claros — Evaluaciones de
  aula (crear a mano o con IA, 6°-11°, malla o Saber 11, e imprimir bien) y
  Preparación Saber 11 (seguimiento/análisis de simulacros). Verificado:
  `node --check` en los bloques inline de 03 (3), 19 (3), index (6) y
  materia-hub (2) + sw.js; balance div/section en 03 y 19.
- **PENDIENTE:** push; que Francy pruebe el flujo completo: entrar a la materia
  → Evaluaciones de aula → botón del asistente → generar → guardar → volver y
  ver el examen en "Mis exámenes" con sus tres impresos. Siguen pendientes de
  antes: test de lectura en inglés y grados 1°-11° en el de español. Y, si algún
  día se quiere, la fusión REAL del 04 dentro del 03 (migrando `lv11_*`).

## ▶ POR DÓNDE RETOMAR (jul 22, 2026 — sesión 23c, reenfoque de los módulos de evaluación)

- **Pregunta de Francy:** con el módulo 19 recién hecho, ¿tiene sentido tener
  además el 03 (6°-10°) y el 04 (simulacros 11°)? DIAGNÓSTICO: el 04 es el 03
  **duplicado** — mismas 5 pestañas (crear/lista/banco/presentar/resultados),
  código casi idéntico, +1 pestaña de análisis. Lo único distinto es el marco
  al que se alinean: malla curricular (03) vs matriz Saber 11 (04). Evidencia
  del costo: la auditoría de la sesión 10 tuvo que corregir la MISMA fuga de
  privacidad dos veces, una por archivo, y el botón de IA hubo que replicarlo.
  El 19 NO es duplicado: es otra puerta de entrada (asistente + IA + impresos)
  y ya guarda en `lv_examenes`, así que sus exámenes salen en la lista del 03.
- **DATO CLAVE que dio Francy: los exámenes se resuelven CASI SIEMPRE EN PAPEL.**
  Eso degrada el motor de examen en línea (cronómetro, autocalificación 85/15)
  a función secundaria — NO se borra, pero deja de ser el centro — y sube la
  prioridad de la calidad de lo impreso y de la clave de calificación.
- **Diagnóstico de fondo: estaban partidos por el eje equivocado** (por GRADO:
  6°-10° vs 11°) cuando lo que los diferencia es el PROPÓSITO. Por eso un
  docente de 11° no tenía dónde evaluar su malla y uno de 9° no podía armar
  ítems tipo ICFES aunque exista Saber 9.
- **DECISIÓN de Francy: "reenfocar sin fusionar"** (no migrar las tablas
  `lv11_*`, que tienen datos reales de estudiantes). Hecho en esta sesión:
  · **03 → "Evaluaciones de aula · 6° a 11°"**: se agregó `Undécimo` a
    GRADOS/GLBL y un **selector de marco de referencia** (`#e-marco`): malla
    curricular o matriz Saber 11. Con "icfes" se ocultan los ejes y aparecen
    competencia/afirmación (`#fila-malla` / `#fila-icfes`), con el recuadro de
    evidencias del ICFES. `MATRIZ11` se copió del 04 (convención del proyecto:
    duplicar por archivo, no compartir JS). El examen guarda `marco`,
    `compIdx` y `afirIdx`; `editEx` restaura según el marco. `refreshMarco()`
    reemplazó a `refreshEjes()` en el arranque, en el `load` y al limpiar el
    formulario. Esto es lo que hace VERDADERO el reenfoque: sin ello, renombrar
    el 04 sería mentira porque se seguiría necesitando para crear ítems ICFES.
  · **04 → "Preparación Saber 11"**: se reordenaron las pestañas para que abra
    en **Análisis de simulacros** (su función propia: simulacros externos +
    desempeño por competencia/afirmación), `tab-crear` pasó a `hide` y
    `tab-analisis` a visible, y `renderAnalisis()` corre al arrancar. Se agregó
    una tarjeta fija que explica que las evaluaciones nuevas se crean en
    Evaluaciones de aula y que las pestañas de creación quedan para editar y
    presentar lo ya guardado. **NO se borró ninguna pestaña ni ningún dato.**
  · Nombres actualizados en `index.html` (sidebar), `materia-hub.html` y los
    headers/títulos de 03 y 04. SW **v74**. Sintaxis verificada (`node --check`
    en sw.js + bloques inline de 03, 04, index y materia-hub; balance de
    div/section/label/select en 03 y div/section en 04).
- **PENDIENTE de este reenfoque (paso 3, acordado y NO hecho):** llevar al 03
  los tres impresos buenos del 19 — membrete completo de `LV_INST`, puntaje por
  pregunta y **clave de calificación del docente** (el 03 hoy imprime con un
  encabezado básico, sin puntajes ni clave). Es lo que más se va a sentir,
  justamente porque todo se resuelve en papel. Son ~100 líneas copiadas de
  `19-examen-final.html` (`membrete()`, `verExamen`, `verHoja`, `verClave`).
- **Destino de largo plazo (NO hacer sin sesión dedicada + respaldo):** dos
  módulos — un motor único de evaluación 6°-11° y el asistente 19 — fusionando
  el 04 dentro del 03. Exige migrar `lv11_examenes`, `lv11_resultados`,
  `lv11_banco` y `lv11_simulacros_ext`. Con el reenfoque ya hecho, el terreno
  queda listo: el 04 solo conserva análisis + histórico.

## ▶ POR DÓNDE RETOMAR (jul 22, 2026 — sesión 23b, mallas oficiales + fix del módulo 03)

- **CARPETA NUEVA `Mallas/` en la raíz del proyecto.** Francy irá dejando ahí
  el Excel de la malla de cada asignatura. Hoy están *Malla curricular -
  Ciencias sociales.xlsx* y *Malla curricular - Competencias ciudadanas.xlsx*.
  **Este es el FORMATO OFICIAL** para todas las mallas futuras (verificado:
  los dos archivos son idénticos en estructura, 36 ejes cada uno = 6 grados ×
  3 periodos × 2 ejes):
  · Fila 1 = encabezados. Columnas: `Periodo | Eje temático | Temas puntuales /
    ideas clave | Estándares básicos de competencias y DBA | Competencia /
    Componente | Evidencias de aprendizaje (ser, hacer, saber-hacer)`.
  · Filas de **encabezado de grado**: el nombre del grado en MAYÚSCULAS en la
    columna A (SEXTO, SÉPTIMO, …, UNDÉCIMO) y el resto de columnas vacías;
    aplica a todas las filas siguientes hasta el próximo encabezado.
  · Columna A en las filas de datos = número de periodo (1, 2, 3); si va
    vacía, hereda el periodo de la fila de arriba (van de a dos ejes por
    periodo).
  · Las celdas de temas/competencia vienen como viñetas `* texto` separadas
    por saltos de línea; la primera viñeta de casi todos los ejes es la
    "Pregunta problematizadora".
- **El importador que YA existía en el Planeador lee justo ese formato**
  (Planeador → Malla curricular → importar Excel). No hubo que escribir uno
  nuevo. IMPORTANTE para Francy: hay que importar **entrando por la materia
  correcta**, porque el importador etiqueta cada tema con `LV_CTX.materia`.
- **`nl2list()` NUEVA en 02-planeador.html:** el importador guardaba los temas
  como `* uno<br>* dos`; ahora convierte las viñetas en `<ul><li>` real (mismo
  formato que la malla semilla), que es lo que el módulo 19 necesita para
  desglosar cada temática en su propia casilla. Se aplica a `temas` y
  `competencia`; `ebcDba` y `evidencias` siguen con `nl2html` (son etiqueta +
  texto, no listas puras). Si el texto no trae viñetas, cae a nl2html sin
  romper nada. Probada con node (7 casos: malla real, sin viñetas, una sola
  viñeta, cabecera antes de las viñetas, continuación de línea, vacío/null,
  escape de `<`/`&`/`"`).
- **BUG DEL MÓDULO 03 CORREGIDO** (el hallazgo de la sesión 23): se eliminó la
  constante `MALLA` hardcodeada (copia congelada de Sociales) y ahora usa
  `refreshMalla()` = `lsRead('malla')` + `LV_CTX.filtrar`, igual que el
  Planeador y el módulo 19. Detalles del cambio:
  · El `value` de cada `<option>` de eje pasó de ser el ÍNDICE en el arreglo
    al **texto del eje** — con una malla dinámica (cambia por materia y es
    editable) un índice deja de apuntar al mismo sitio. `ejeIdx` conserva el
    nombre del campo pero ahora guarda texto; al editar un examen viejo (que
    guardó un número) simplemente no queda preseleccionado el eje —
    `isNaN(Number(...))` lo detecta y lo ignora. No se pierde nada más.
  · `refreshEjes()` llama primero a `refreshMalla()`, y se agregó un
    `window.addEventListener('load', refreshEjes)` porque en el módulo 03
    `auth.js`/`materia-context.js` se cargan DESPUÉS del script principal: en
    el primer render `LV_CTX` todavía no existe y la malla saldría sin filtrar.
  · Si la materia no tiene ejes para ese grado/periodo, el selector dice
    "(esta materia no tiene ejes para ese grado y periodo)" en vez de ofrecer
    los de otra materia.
  · Se agregó `lv_malla` a `LV_SYNC_TABLAS` del módulo 03.
- **Módulo 19 ajustado al formato oficial:** `temasDe()` ahora también quita la
  viñeta `*` (antes solo `•` y `-`) y **excluye la línea de "Pregunta
  problematizadora"** de las casillas de temáticas — no es una temática
  evaluable sino el encuadre del eje; se muestra aparte en el recuadro de
  referencia vía `preguntaDe()`. Probado con node (5 casos: malla importada
  nueva con `<li>`, importación vieja con `<br>` y `*`, semilla sin pregunta,
  eje vacío, eje que solo trae la pregunta).
- SW **v73**. Sintaxis verificada (`node --check` en sw.js y en los bloques
  inline de 02, 03 y 19; balance de etiquetas del 03 tras borrar la constante).
- **PENDIENTE:** push (OJO: el push anterior falló porque Francy corrió los
  comandos desde `~` y no desde la carpeta del proyecto — hay que hacer `cd`
  primero); que Francy importe las dos mallas entrando por su materia y
  confirme que el módulo 03 y el 19 muestran los ejes correctos en cada una.
  Siguen pendientes de la sesión 23: test de lectura en inglés y grados 1° a
  11° en el de español (ver detalle abajo).

## ▶ POR DÓNDE RETOMAR (jul 22, 2026 — sesión 23, módulo 19 Examen Final de Periodo)

- **Módulo NUEVO `modulos/19-examen-final.html`** (pedido de Francy): arma un
  examen final de periodo desde la MALLA de la materia activa, con las
  preguntas redactadas por Gemini. Asistente de 4 pasos: (1) datos
  (grado/periodo/título/asignatura/docente/tiempo/instrucciones); (2) **ejes y
  temáticas** — cada eje de `lv_malla` sale como casilla, y sus temáticas se
  desglosan una por una parseando los `<li>` del campo `temas` (marcar el eje
  marca todas sus temáticas; el recuadro muestra EBC/DBA, competencias y
  evidencias del eje como referencia); (3) cantidades por tipo (selección
  múltiple / V-F / abiertas) **con puntaje por pregunta** y total calculado en
  vivo + campo de la clave de Gemini; (4) **revisión editable OBLIGATORIA**
  antes de guardar (aviso fijo de que la IA puede equivocarse; se puede editar
  enunciado, contexto, opciones, respuesta correcta, justificación y quitar
  preguntas). Guarda en `lv_examenes` con `esFinal:true` → el examen también
  aparece en el módulo 03 y hereda su edición.
- **HALLAZGO IMPORTANTE (bug preexistente, NO corregido aún):** `03-examenes.html`
  tiene la malla de Ciencias Sociales **escrita a mano dentro del archivo**
  (`const MALLA = [...]`, línea ~287), NO la lee de `lv_malla`. Es decir: al
  entrar al módulo 03 desde otra materia, los ejes que ofrece son los de
  Sociales. El módulo 19 SÍ lo hace bien (`lsRead('malla')` + `LV_CTX.filtrar`,
  igual que el Planeador). **Pendiente: migrar el 03 al mismo patrón** — es un
  cambio pequeño (borrar la constante y usar refreshMalla()), pero toca su
  `refreshEjes()` y el flujo de `ejeIdx` guardado en exámenes viejos, así que
  se dejó para su propio momento.
- **`api/generar.js`: tipo nuevo `examen_final`.** Reusa el mismo GEM y el mismo
  esquema de salida del banco (`loma_verde_banco_preguntas`), así que el cliente
  reutiliza `validarPreguntas()` sin cambios. Lo que cambia es
  `msgExamenFinal()`: pide las cantidades por tipo de forma EXPLÍCITA y
  verificable ("el arreglo debe traer EXACTAMENTE N elementos… cuenta antes de
  responder"), lista las temáticas exactas como cerco ("no evalúes nada fuera
  de esta lista") y pide repartirlas parejo. El banco normal pedía la cantidad
  en texto libre y el modelo la cumplía a medias. Si aun así no cuadra, el
  módulo avisa en el paso 4 cuántas llegaron de cada tipo en vez de fallar.
- **Tres documentos imprimibles** (los tres con membrete completo de `LV_INST`:
  logo, nombre, NIT/DANE/ICFES, secretaría y ciudad): (a) **examen** dividido en
  tres partes por tipo de pregunta, con puntaje visible por pregunta y total;
  (b) **hoja de respuestas del estudiante** (burbujas A-D / V-F en dos columnas
  + renglones aparte para las abiertas); (c) **clave de calificación del
  docente** — NUEVA, no existía en el 03: tabla de respuestas correctas con
  justificación y puntaje, más una tabla de conversión de puntos a la escala
  1.0–5.0 y espacio de firmas.
- **`navToModule()` en index.html ampliado a `(0[1-9]|19)`:** el 19 necesita
  contexto de materia (de ahí sale la malla), así que el modal "¿a qué materia
  deseas entrar?" ahora también lo intercepta. Sin eso, entrar por la sidebar
  dejaba `LV_CTX.materia` en null y `filtrar()` devolvía los ejes de TODAS las
  materias mezclados.
- Si la materia no tiene malla cargada, el módulo NO muestra el asistente:
  muestra una tarjeta que lo explica y enlaza al Planeador (evita ofrecer ejes
  equivocados). Reintenta a los 3 s por si la malla llega de Supabase después.
- Enlaces en `materia-hub.html` (junto a Exámenes 6°-10°) y en la sidebar de
  `index.html`. SW **v72** (+ el módulo en el precache). Sintaxis verificada:
  `node --check` en sw.js y api/generar.js, y en los bloques `<script>` inline
  de index.html (6), materia-hub.html (2) y 19-examen-final.html (3). Probados
  con node el parser de temáticas (7 casos: lista real de la malla, `<li>` con
  atributos, texto plano, `<br>`, vacío, null, entidades HTML) y el cálculo de
  puntajes/conversión a 5.0.
- **PENDIENTE:** push; que Francy pruebe el flujo completo con una materia real
  (necesita su clave de Gemini guardada) y confirme que los ejes que aparecen
  son los de la materia con la que entró. **Lo acordado y NO hecho todavía en
  esta sesión (siguen pendientes, en este orden):** (1) **Test de lectura en
  inglés** — `reading-aloud.html` NO es una versión en inglés del test de
  español, es otra herramienta mucho más pobre (196 líneas vs 793): no tiene
  panel de proyección, marcado de palabras con clic, micrófono, cronómetro
  durante la lectura, reporte diagnóstico ni historial exportable; el docente
  cuenta las palabras a mano. Hay que portar `test-lectura.html` completo con
  `lang='en-US'` en el reconocedor, normalizador sin tildes ajustado al inglés
  y banco de textos/rangos en inglés. (2) **Grados 1° a 11° en el test de
  español** — hoy solo 1° a 5°. OJO: los rangos oficiales ICFES/PTA solo
  existen para 3° y 5° (1°, 2° y 4° ya están declarados en el módulo como
  estimación/interpolación); de 6° a 11° NO hay instrumento oficial colombiano,
  así que cada grado nuevo debe declarar su fuente en el reporte igual que
  ahora, y hay que escribir textos nuevos para los seis grados.

## ▶ POR DÓNDE RETOMAR (jul 19, 2026 — sesión 22, Panel de Coordinación en index.html)

- **Construido el "Panel de Coordinación" acordado en la sesión 18** (reemplaza
  "Tu Día en SABIE" cuando `PERM.esAdmin`, los docentes normales siguen viendo
  su dashboard personal sin cambios). 4 tarjetas, mismo estilo `act-card` de
  siempre: (1) **Permisos pendientes** (`lv_permisos` estado pendiente, borde
  rojo — es la única urgencia real, alguien espera respuesta); (2) **Notas del
  periodo sin cargar** (cruza `lv_cursos`+`lv_asignaciones`+`lv_calificaciones`,
  "periodo actual" inferido igual que 12-director.html: el que tenga más
  registros con datos); (3) **Directores sin anotaciones en Observador en 30
  días** (campo `dirige` de cada docente cruzado con `lv_observador` vía
  estudiante→curso, usando `LV_CURSO.dirigeCurso` — el mismo canonizador del
  fix de la sesión 21, para NO repetir ese bug aquí); (4) **Eventos de la
  semana** (`lv_eventos`, 7 días en vez de los 15 del dashboard docente).
- **DECISIÓN clave (confirmada con Francy, evita "desinformación"):** las
  tarjetas 2 y 3 SOLO consideran docentes con correo registrado (cuenta
  activa). Hoy son ~4 de ~50; listar también a los sin cuenta habría llenado
  el panel de "pendientes" que nadie puede resolver todavía (no es su culpa,
  no pueden ni iniciar sesión) — puro ruido, no señal. El panel muestra una
  nota informativa fija arriba de las tarjetas ("X de Y docentes tienen
  cuenta activa…") para que quede clara esa cobertura y no se lea como que
  "solo hay 4 docentes en el colegio". Colores con intención: rojo (`--bad`)
  solo en permisos (urgencia humana real); azul (`--primary-light`) en notas
  y observador (mide adopción, no negligencia — evita el tono acusatorio).
  Umbral de Observador elegido por Francy: 30 días de silencio (no "todo el
  año"), a sabiendas de que con tan pocas cuentas activas la lista igual sale
  corta y manejable.
- **Atribución de "notas sin cargar" a un docente:** por curso, busca en
  `lv_asignaciones` una fila cuyo grado-grupo coincida (canónico, `LV_CURSO.key`)
  y cuya materia sea la del curso o el comodín "Todas las materias" — si no
  hay estudiantes matriculados en el curso, o no hay asignación, o el docente
  asignado no tiene cuenta activa, el curso se omite (no se le atribuye a
  nadie sin evidencia clara).
  **Nota técnica de orden de scripts (por si se retoma):** `renderPanelCoordinacion()`
  quedó definida y se invoca en el ÚLTIMO `<script>` de `index.html` (después
  de `auth.js`/`sync.js`), no en el bloque del dashboard docente de más arriba
  — porque necesita `LV_CURSO`, que vive en `auth.js` y ese carga después. El
  IIFE del dashboard docente ahora hace `if(PERM.esAdmin) return;` al inicio
  para no pintar nada en las tarjetas que el panel de coordinación va a
  reemplazar.
  SW **v71**. `node --check` limpio en los 6 bloques `<script>` de `index.html`.
- **PENDIENTE:** push; que Francy entre con la cuenta de Coordinación y
  confirme que el panel se ve bien y que los números cuadran con la realidad
  (sobre todo el periodo activo inferido y la atribución de cursos a
  docentes). Ideas para después, no hechas hoy: enlace directo a cada
  permiso/curso puntual (hoy todo enlaza al módulo, no al registro exacto);
  quitar del todo la tarjeta de notas si algún periodo aún no tiene ninguna
  actividad en el colegio (hoy se muestra vacío, no se oculta); mover el
  umbral de 30 días y el filtro de cuenta activa a algo configurable si la
  cobertura de cuentas cambia mucho.

## ▶ POR DÓNDE RETOMAR (jul 19, 2026 — sesión 21, canonización de cursos/sedes + fix director de grupo)

- **Verificación Fase 2 completada:** política `por_curso` activa en las 8
  tablas (2a OK). 2c mostró 35 docentes sin correo en su ficha — normal:
  solo ~4 tienen cuenta real; al dar de alta a cada docente hay que
  registrar su correo en Coordinación (ya era requisito del login).
- **BUG del director de grupo DIAGNOSTICADO Y CORREGIDO:** los cursos
  guardan grado "Noveno (9°)" y grupo "3", pero las direcciones dicen
  "9-903" → ni el módulo 12 ni la RLS coincidían (bug PREEXISTENTE en la
  app, heredado por la Fase 2). Solución (elección de Francy): CANONIZAR
  comparaciones sin renombrar datos + sede como campo propio.
- **`LV_CURSO` NUEVO en auth.js** (se carga en todas las páginas):
  gradoCanon ("Noveno (9°)"→9), grupoCanon ("903" con grado 9→3, "1101"
  con 11→1), key, sedeCode ("Cristo Es Mi Luz"→CRI), esPrimaria,
  etiqueta (bach. "9-3"; primaria con sede "3-1 CRI"), dirigeTokens y
  dirigeCurso (acepta formatos viejos "9-903" y nuevos "9-3"/"1-1 JUA";
  la sede solo se exige si el token Y el curso la tienen). Testeado con
  node con los casos reales del diagnóstico — todos pasan.
- **7 puntos de comparación de `dirige` migrados a LV_CURSO.dirigeCurso:**
  01 (PERM_dirige), 10, 11 (PERM_dirige), 12, 13 (gruposDirigidos +
  nombre del dirigente en el boletín), 14. index.html:1019 solo chequea
  truthy → sin cambio.
- **Coordinación:** (1) checklist "Grupos con cursos creados" bajo el
  campo Dirige (marca/desmarca y el texto se arma solo en canónico; los
  tokens manuales se conservan — sirve para grupos de primaria aún sin
  cursos); (2) tarjeta "🏫 Cursos y sedes" en pestaña Asignaciones
  (select de sede por curso → marcarCambio lv_cursos); (3) campo "Sedes"
  en Institución → lv_institucion.sedes (LV_INST.sedes() en auth.js con
  las 7 sedes reales de respaldo).
- **01-calificaciones:** el formulario de curso ganó grados de PRIMARIA
  (Prejardín…Quinto) y select de Sede (catálogo LV_INST.sedes()); el
  curso nuevo estampa `sede`.
- **`migracion_etapa2_fase2b.sql` NUEVO (SIN CORRER):** lv_grado_canon,
  lv_grupo_canon, lv_sede_code + REEMPLAZA lv_mis_cursos, lv_est_visible
  y lv_acudiente_visible con comparación canónica y sede opcional. Las
  políticas por_curso NO se tocan (usan las mismas funciones). Al final
  trae una verificación de canonizadores (esperado: 9/3 · 11/1 · 10/3 ·
  6/1 · prejardin/2 · 0/1). Reversible re-corriendo la sección 0 de
  fase2.
- SW **v70**. Sintaxis OK (auth.js, sw.js y los 7 HTML tocados).
- **fase2b CORRIDA en Supabase (jul 19):** verificación de canonizadores
  EXACTA a lo esperado (9/3 · 11/1 · 10/3 · 6/1 · prejardin/2 · 0/1).
- **PENDIENTE:** push (el primer intento falló: zsh aborta con
  `no matches found: .git/*.lock` si no hay locks — usar (N)) + probar: (a) cuenta del director
  (ej. Shirley 9-903) debe ver Dirección de grupo/boletines/analítica de
  su 9-3; (b) checklist de dirige en Coordinación; (c) asignar sedes a
  cursos de primaria cuando existan. DECISIÓN PENDIENTE de Francy:
  migrar o no los textos viejos de dirige a canónico (hoy no hace falta,
  la canonización los entiende) y unificar la ETIQUETA visible de cursos
  en toda la app con LV_CURSO.etiqueta() (por módulo, gradual).

## ▶ POR DÓNDE RETOMAR (jul 18, 2026 — sesión 20, ARQUITECTURA ETAPA 2 · FASE 2 — código y SQL listos)

- **Fase 2 (por-curso) CONSTRUIDA en sesión dedicada**, como estaba planeado.
  Auditoría previa confirmó el mapa: estudiantes/notas tienen `cursoId`;
  asistencia tiene `cursoId` + id `cursoId_fecha`; observador/piar tienen
  `estId` (curso solo como texto); acudientes solo `hijos[].grado/grupo`;
  boletines solo guarda `cfg` (compartido → fuera); puente = correo del JWT
  → lv_docentes.email → docenteId → lv_asignaciones {materia,grado,grupo}
  + campo `dirige` ("6-601, 7-701") para directores de grupo.
- **DECISIÓN DE DISEÑO clave (evitó el refactor por módulo temido):** las
  políticas NO exigen cursoId estampado — resuelven la cadena
  estId→estudiantes→curso→grado-grupo DENTRO de funciones SECURITY DEFINER
  (ignoran RLS al consultar). El groundwork en la app quedó mínimo.
- **`migracion_etapa2_fase2.sql` NUEVO (SIN CORRER):** funciones
  `lv_norm()`, `lv_mi_docente_id()`, `lv_acceso_total()` (coordinación +
  comodines Primaria/Todas las materias), `lv_mis_cursos()` (asignación
  materia+grado+grupo con comodín de grupo vacío, O dirige en cualquier
  materia — así director de grupo/boletines/analítica no pierden nada),
  `lv_curso_visible()`, `lv_est_visible()` (cadena por estId, compara por
  grado-grupo), `lv_acudiente_visible()` (hijos[].grado/grupo),
  `lv_materia_visible()` (banco por materia). Política `por_curso` en 8
  tablas: cursos, estudiantes, notas, asistencia, lv_observador, lv_piar,
  lv_acudientes, lv_banco. TRANSICIONAL (todo lo no-resoluble sigue
  visible → nadie pierde datos), idempotente, con verificación (2a-2d) y
  ROLLBACK completo comentado al final. lv_planeadores/lv_examenes/
  lv11_examenes/lv_boletines/lv_herramientas NO se tocan (decisiones
  previas).
- **Groundwork app (refuerzo para backfill futuro, no requerido por la
  RLS):** 10-observador estampa `cursoId` en anotaciones nuevas
  (estSel.cursoId); 11-inclusion conserva cursoId en la lista de
  estudiantes y lo estampa en PIAR nuevos. SW **v69**. Sintaxis OK
  (node --check en sw.js + bloques script de 10 y 11).
- **DESPLIEGUE (jul 19):** push HECHO (commit 2b190fa en origin/main) y
  `migracion_etapa2_fase2.sql` CORRIDO en Supabase. Verificación 2d:
  observador sin estId 0 · piar sin estId 0 · notas sin cursoId 0 ·
  estudiantes sin cursoId 94 (transicional: visibles a todos; backfill
  después) · banco sin materia 290 (se auto-etiquetan 'Sociales' vía
  lvMigrarMateria al pasar por los equipos y subir). FALTA: resultados
  2a/2b/2c (sobre todo 2c, docentes sin correo) y la prueba con cuenta
  docente NO admin + director de grupo (boletines/mi grupo/analitica).
- **OJO:** la RLS filtra las DESCARGAS nuevas; lo ya espejado en
  localStorage de cada equipo se queda hasta limpiar datos del navegador
  o entrar en un equipo nuevo. La reducción del espejo es gradual.
- **Pendiente después de validar:** backfill de registros sin referencia
  (2d), RLS por dueño de permisos/centros (anotado en sesiones 16/18),
  y Fase 3 (IndexedDB) solo si aprieta el espacio.
- **ACORDADO PARA SESIÓN NUEVA — "Panel de Coordinación"** (Francy dice
  «vamos con el panel de coordinación»): en index.html, cuando entra
  admin/coordinación, reemplazar "Tu Día en SABIE" por un panel con:
  (1) permisos pendientes por revisar (lv_permisos estado pendiente,
  elevar la alerta existente a tarjeta con detalle); (2) docentes sin
  notas del periodo actual (asignaciones → cursos con LV_CURSO →
  lv_calificaciones); (3) directores de grupo sin anotaciones recientes
  en observador (dirige → estudiantes → lv_observador); (4) eventos de
  los próximos 7 días (lv_eventos). ADVERTENCIA dada: con ~4 cuentas
  reales, las listas de "no han cargado" saldrán largas (miden
  adopción). El resumen del sistema de arriba se conserva.
- PENDIENTE heredado: probar las 4 herramientas interactivas con
  estudiantes, cédula en ficha del docente.

## ▶ POR DÓNDE RETOMAR (jul 18, 2026 — sesión 19, test de lectura explicado + 4 herramientas interactivas)

- **Test de Lectura auditado a fondo (inquietud de Francy por "2.5 y nivel C"):**
  FUNCIONA BIEN. Nota = 55% velocidad (PPM vs rangos oficiales por grado, notas
  Muy lenta 1.7 / Lenta 3.0 / Óptimo 4.0 / Rápido 4.8) + 45% calidad (% palabras
  correctas: ≥92% D, ≥75% C, ≥50% B, <50% A → notas 4.7/3.5/2.5/1.5). OJO: en la
  escala MEN/PTA la D es el MEJOR nivel y la A el más bajo. El patrón "2.5 y C"
  = calidad buena (C=3.5) + velocidad Muy lenta (1.7) → 2.51: leen bien pero muy
  despacio para el estándar nacional. DECISIÓN de Francy: DEJARLO ASÍ (estándar
  estricto como línea base). Si luego quiere suavizar: subir notas de velocidad
  y/o pesos 45/55 — está todo en test-lectura.html (notaVelocidad/notaCalidad).
- **4 herramientas interactivas NUEVAS** (elección de Francy, todas offline,
  todas con juego + nota opcional a la planilla vía LV_HERR):
  `tabla-periodica.html` (118 elementos con usos cotidianos, modo reto),
  `colombia.html` (32 deptos+Bogotá por regiones, capital y dato al tocar, quiz
  de capitales bidireccional), `cuerpo-humano.html` (5 sistemas sobre silueta
  SVG, juego "¿dónde está…?"), `ortografia.html` (aguda/grave/esdrújula,
  completar b/v-c/s/z-g/j-h, ¿lleva tilde?, 2 niveles). Integradas en
  15-herramientas.html (sección nueva "Interactivas") y en sw.js. SW **v68**.
  Sintaxis OK en todas.
- **Arquitectura etapa 2:** Francy preguntó si arrancamos. RESPUESTA: NO en esta
  conversación (contexto casi agotado tras semanas de trabajo). Hacerla en
  SESIÓN NUEVA dedicada diciendo "vamos con arquitectura etapa 2" — el plan
  completo por fases está en el roadmap punto 5 de este archivo (Fase 0 y 1
  hechas; falta Fase 2 por-curso, la compleja). Ese refactor NO se improvisa.
- PENDIENTE: push (commit listo o por hacer), probar las 4 herramientas con
  estudiantes reales, y (anotado antes) cédula en ficha del docente.

## ▶ POR DÓNDE RETOMAR (jul 16, 2026 — sesión 18, fix materia en import + módulo Permisos)

- **Bug corregido (reporte de Francy):** planeadores importados en una materia
  distinta aparecían en Ciencias Sociales. Causa: `guardarPlaneadores()` (02)
  no etiquetaba `materia`/`area` al importar y el JSON de los GEMs no trae ese
  campo → `lvMigrarMateria()` los marcaba 'Sociales'. Además los importados no
  se subían a la nube (solo lsWrite, sin marcarCambio) — solo viajaban cuando
  la migración los tocaba. Arreglo: guardarPlaneadores estampa materia/área
  del contexto activo (fallback 'Sociales' si entra por sidebar) y marca cada
  plan con LV_SYNC.marcarCambio. IMPORTANTE para docentes: importar estando
  DENTRO de la materia (Áreas → materia → Planeador), no por la sidebar.
- **Módulo NUEVO `modulos/18-permisos.html` — Permisos Docentes:** pestañas
  Solicitar (tipo/fechas/jornada completa o parcial con horas/motivo/quién
  cubre), Mis solicitudes (estados ⏳✅❌🚫, cancelar pendientes, imprimir
  formato aprobado con membrete LV_INST + firmas) y Aprobaciones (solo
  esAdmin: stats —pendientes/aprobados/rechazados/días aprobados en el año—,
  filtros por estado y docente, aprobar/rechazar con comentario vía prompt).
  Tabla `lv_permisos` {id, datos} en MAPA de sync; `migracion_permisos.sql`
  NUEVO (correr en Supabase, idempotente). Alertas en el portal: a
  coordinación le sale «N solicitudes esperando respuesta» y al docente
  «Coordinación respondió» (últimos 7 días). Enlace en sidebar (Institución)
  y materia-hub. SW **v66**. Sintaxis OK en todos los tocados.
  **Ajuste posterior (misma sesión):** Francy adjuntó el formato oficial
  FA_006/FSP001 → el módulo quedó calcado: tipos oficiales (EPS cita/urgencias,
  salud, incapacidad, calamidad, licencia, capacitación, traslado, otro),
  campo CÉDULA (se recuerda en el equipo, clave lv_perm_cedula), decisión
  «¿descuenta salario?» al aprobar (p.descuenta), e impresión con membrete
  completo (LV_INST nit/dane/icfes/correo), código FSP001, casillas SÍ/NO de
  descuento y firmas: funcionario, coordinador de convivencia y V°B° Rector(e).
  Imprimible en cualquier estado menos cancelado. SW **v67**.
- PENDIENTE: push + correr migracion_permisos.sql. Ideas futuras del módulo
  (anotadas, no hechas): adjuntar soporte (foto incapacidad) cuando haya
  patrón de Storage por docente; aviso WhatsApp a coordinación (patrón wa.me
  ya existe en 06/10); cruce con horario para listar clases afectadas;
  RLS por dueño para que cada docente solo vea sus permisos (va con etapa 2).

## ▶ POR DÓNDE RETOMAR (jul 15, 2026 — sesión 17, integración Banco de Actividades ↔ Planeador)

- **Nueva funcionalidad en `02-planeador.html`:** Se añadió el botón **"🏦 Importar del Banco"** en la sección "Secuencia didáctica" (Etapa de estructuración), encima del campo "Talleres / actividades de estructuración". Al pulsarlo:
  1. Se abre un modal que lee `localStorage.lv_actividades` (catálogo institucional sincronizado desde Supabase en el módulo `16-actividades.html`).
  2. Permite buscar y filtrar por texto y por grado.
  3. Al elegir un ítem, inserta su título y tipo como texto referenciado en el campo de "Talleres".
- **Aclaración de arquitectura:** El planeador ya tenía previamente el botón "📷 Del banco" (que lee imágenes propias del docente desde IndexedDB) para agregar miniaturas reales a la sección de Anexos. El nuevo botón es COMPLEMENTARIO y lee del banco institucional de actividades/PDFs.
- **No requiere IA:** Todo es lógica JavaScript pura, sin costos ni APIs.
- **Pendiente:** CLAUDE.md y push.

## ▶ POR DÓNDE RETOMAR (jul 15, 2026 — sesión 16, mejoras de UX en navegación y dashboard)

- **Mejoras de Baja y Media Complejidad implementadas a petición de Francy:**
  - **Limpieza:** Se eliminaron las imágenes huérfanas `Logo/Logo_nuevo.png` y `Logo/sabie-full.png`.
  - **Generador IA en 11°:** Se replicó el botón generador de preguntas con IA en `04-examenes-11.html`.
  - **Dashboard Central:** Se sustituyó "Actividad Reciente" en `index.html` por "Tu Día en SABIE", que muestra: tareas pendientes (alertas de asistencia y estudiantes en riesgo), un gráfico CSS con promedios de curso, y los próximos eventos a 15 días.
  - **Navegación Inteligente (Smart Modal):** Se interceptan los clics del menú lateral en `index.html`. Si el módulo requiere materia (01 al 09) y el docente enseña varias, se lanza un modal solicitando "¿A qué materia deseas entrar?" antes de redirigir con `?materia=X`. Si enseña solo una, navega directo.
  - *Las mejoras de alta complejidad quedaron pausadas para después.*

## ▶ POR DÓNDE RETOMAR (jul 15, 2026 — sesión 15, UX offline: badge, instalar, dudas de Francy)

- **Dudas de Francy respondidas (dejar claro a los docentes):** (1) La sesión
  se inicia UNA sola vez con internet en cada dispositivo/navegador; sobrevive
  a apagar el computador (localStorage persiste). NO hay que entrar cada día
  desde la casa: mañana en el colegio sin internet la app abre directo al
  portal. Solo se pierde si el docente CIERRA SESIÓN, borra datos del
  navegador, o (Safari normal) pasa +7 días sin usarla (ITP purga storage —
  la app instalada/PWA no sufre esto). (2) diagnostico.html NO requiere
  cerrar sesión: está enlazada también en el pie del PORTAL (además del
  login) y abrirla no toca la sesión; el ✅ de la sidebar es el indicador
  principal post-login.
- **Badge de cambios pendientes rediseñado (sync.js):** ahora muestra CONTEO
  («⏳ 5 cambio(s) sin subir — toca para subirlos» con internet / «📵 5
  cambio(s) guardados aquí — se subirán solos al volver el internet» sin él),
  aparece al instante al guardar offline (marcarCambio → mostrarBadge(true)),
  da retroalimentación al tocarlo (explica si no hay internet; muestra
  "Subiendo N…" y el restante) y tras cada intento de subida refleja lo que
  queda. Es la "barra de progreso" pedida por Francy en versión ligera:
  el número baja a medida que sube. Si quiere barra visual completa, hacerla
  después sobre esta misma base (pendientesGet().length).
- **Botón "⬇️ Instalar SABIE en este equipo"** (verde, sidebar del portal):
  aparece cuando el navegador dispara beforeinstallprompt (Chrome/Edge en
  Mac/Windows/Android). Safari NO lo soporta → ahí sigue siendo Archivo →
  Agregar al Dock (documentar a docentes). Se oculta al instalar.
- SW **v65** (solo versión; el v5 transaccional quedó igual). Sintaxis OK
  (sync.js, index.html). PENDIENTE: push.
- **NOTA DE CONTINUIDAD:** Francy está cerca de su límite semanal de tokens y
  puede continuar en otra herramienta (p. ej. Antigravity). TODO el contexto
  vive en este archivo. Convenciones críticas para cualquier asistente:
  scripts con src NUNCA llevan código inline; subir versión de CACHE en
  sw.js en cada despliegue; editar por reemplazo exacto de texto (archivos
  grandes); validar sintaxis extrayendo <script> con node --check; los
  commits desde Cowork fallan por locks de OneDrive → Francy corre en
  Terminal: rm -f .git/*.lock(N) .git/objects/maintenance.lock(N) && git add
  -A && git commit && git push (el (N) evita que zsh aborte si no hay locks). Deploy = push a main (Vercel auto).

## ▶ POR DÓNDE RETOMAR (jul 15, 2026 — sesión 14, offline falló EN CAMPO — SW v5 transaccional)

- **El offline volvió a fallar para Francy y varios docentes (Safari, Chrome y
  app del Dock)** pese a v62/v63 desplegados (verificado: producción sin
  redirecciones). AUDITORÍA: la falla letal estaba en el CICLO DE VIDA del SW,
  no en el fetch: (a) instalar una versión nueva descargaba los ~50 archivos y
  los fallos individuales se tragaban en silencio; skipWaiting corría IGUAL y
  el activate BORRABA la caché buena anterior → con wifi débil el dispositivo
  quedaba con caché vacía/agujereada e invisible al usuario. Con 11 versiones
  en 2 días (v53→v63), cada push re-descargaba todo en cada dispositivo:
  bastaba un corte para "quedar sin offline". (b) cache.put con streams
  (Response(resp.body)) — Safari a veces lo rechaza. (c) network-first para
  TODO = lento con señal débil. (d) cero visibilidad del estado.
- **Reescritura completa: sw.js v5 (CACHE loma-verde-v64), archivo nuevo:**
  precache TRANSACCIONAL (nunca borra cachés viejas hasta que la nueva esté
  100% completa; mientras tanto sirven de respaldo — buscarEnCache busca en
  TODAS), rescate de archivos desde cachés viejas sin red, AUTO-REPARACIÓN
  (completarPrecache en activate + cada navegación máx. 1/10min + a pedido),
  todo guardado como blob status-200 limpio (Safari-proof), recursos =
  cache-first con refresco en 2º plano, navegaciones = red-first 3.5s →
  alias → portal, canal postMessage {tipo:'estado'|'completar'}.
- **Visibilidad nueva:** indicador en la sidebar del portal («✅ Listo para
  trabajar sin internet» / «⏳ Preparando X/50…» que se auto-repara) +
  página `diagnostico.html` (SW, versión, archivos X/50 + faltantes, sesión,
  datos locales, espacio; botón Reparar ahora) enlazada desde el pie del
  login y del portal. login.html ahora también registra el SW.
- PENDIENTE: push; protocolo de prueba con docentes: con internet abrir el
  portal → esperar el ✅ verde en la sidebar (o abrir diagnostico.html y ver
  «COMPLETO») → recién ahí probar sin internet. Si algo falla: captura de
  diagnostico.html — ya no estamos a ciegas.
- Pregunta de Francy sobre .exe/.dmg respondida: Electron/Tauri posible pero
  no recomendado aún (peso, firma de Apple, actualizaciones manuales en 50
  equipos); la PWA robusta + indicador es el camino; reevaluar si persiste.

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 13b, mensaje offline del login)

- **Francy probó offline SIN sesión iniciada** → el login cacheado cargó bien
  (el SW v62 funciona) pero al pulsar Entrar salió "Load failed" (error crudo
  del fetch a Supabase). Es comportamiento esperado: verificar contraseña
  REQUIERE internet; el modo offline aplica a quien ya tiene sesión (entra
  directo al portal sin pasar por login). Arreglo de UX en `login.html`:
  el catch ahora distingue error de red (navigator.onLine + regex sobre
  err.message) y muestra explicación en español («iniciar sesión requiere
  internet; si ya habías entrado, la app abre sola; si te pide contraseña,
  tu sesión se cerró»). SW **v63**. Sintaxis OK. PENDIENTE: push + prueba
  offline CON sesión: online→login→recargar 2 veces→navegar→quitar internet
  →reabrir (debe abrir el portal directo).

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 13, offline de raíz + rutas + Atrás)

- **Cuatro quejas de Francy atendidas:** (1-2) offline roto y Chrome≠Safari:
  causa raíz encontrada — `cleanUrls:true` en vercel.json redirigía cada .html
  a URL sin extensión: el SW guardaba con una clave y el navegador pedía otra
  (offline = nada coincidía), y el precache guardaba respuestas `redirected`
  que Safari rechaza (la sesión 12 lo limpió solo en el fetch handler, no en
  install). Arreglo triple: `cleanUrls:false` (mata las redirecciones),
  limpieza de `redirected` también en el precache, y `buscarEnCache()` con
  alias (/login ↔ /login.html ↔ /carpeta/) + fallback al portal en
  navegaciones. (3) rutas inconsistentes: 07-horario ahora FUSIONA los buckets
  de todas las materias del docente (+_global) en una sola vista con `_mk` por
  celda para editar/borrar en su bucket de origen; celdas nuevas van a la
  materia del contexto o a la primera asignada; "limpiar todo" borra todos sus
  buckets también en la nube. (01-calificaciones ya se había arreglado en
  commit 1aa4eb1.) (4) botón "← Atrás" agregado a los headers de 10-17 y
  coordinacion.html (history.back con fallback al portal). SW **v62**.
  Sintaxis verificada. PENDIENTE: push; que Francy pruebe offline así:
  con internet abrir la app, iniciar sesión, RECARGAR DOS VECES (para que el
  SW nuevo tome control), navegar 2-3 módulos, luego quitar internet y
  reabrir. En el Dock de Safari: eliminar la app del Dock y volverla a
  agregar DESPUÉS del push (sesión aislada). Chrome y Safari mostrarán lo
  mismo una vez ambos recarguen el SW v62 y sincronicen con la misma cuenta.
  ⚠️ Conocido (etapa 2): lv_horario sigue compartido entre docentes de la
  misma materia (colisión posible) — requiere claves por docente.

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 12, app no funcionaba sin internet)

- **Francy probó "Agregar al Dock" en Safari/Mac para usar SABIE sin internet y
  falló en dos rondas.** Primer error: página en blanco genérica al abrir offline
  recién agregada — diagnosticado como comportamiento esperado de una app de Dock
  de Safari (contexto de almacenamiento/sesión totalmente aislado de Safari normal,
  según la propia documentación de Apple: no comparte cookies/caché/sesión). Se le
  indicó "cebarla" primero con internet: abrirla, iniciar sesión ahí mismo, esperar
  a que sincronice, entrar a varios módulos, y solo ENTONCES probar sin internet.
  Segundo error, tras seguir esos pasos: `"Response served by service worker has
  redirections" (WebKitInternal:0)` al cargar `sanjosedelomaverde.com/`. Este sí
  era un bug real de `sw.js`. **Causa:** Safari/WebKit es más estricto que Chrome/
  Firefox — si el Service Worker devuelve en `respondWith()` una respuesta que
  vino de una petición que internamente siguió una redirección (`resp.redirected
  === true`, típico de normalización de dominio en Vercel), Safari la rechaza de
  plano en vez de servirla. Esto pasaba justo en la navegación principal (`/`) al
  reabrir la app ya con el Service Worker activo — coincide exactamente con "cargó
  bien la primera vez, falló al cerrar y reabrir offline". **Arreglo** en el
  `fetch` handler de `sw.js`: si `resp.redirected` es true, se reconstruye con
  `new Response(resp.body,{status,statusText,headers})` (limpia la bandera
  `redirected`) ANTES de devolverla y ANTES de guardarla en caché — así ni la
  respuesta en vivo ni la que se sirve luego desde caché quedan marcadas como
  redirigida. No toca la lógica de red-primero-caché-después, solo intercepta el
  caso puntual que rompía Safari. SW **v60**. `node --check sw.js` limpio.
  **PENDIENTE:** push; que Francy vuelva a agregar SABIE al Dock (o simplemente
  cierre y reabra la que ya tiene — el Service Worker se actualiza solo al
  detectar el cambio de versión de caché) y confirme que ahora sí carga sin
  internet después de haberla usado una vez conectada.

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 11, arreglo rápido)

- **Logo del login estirado en Safari**, hallado por Francy con captura de pantalla.
  `login.html` → `.brand img.logo-full{width:min(420px,88%);...}` fijaba solo el ancho;
  la proporción dependía de que el navegador dedujera el alto a partir de los atributos
  HTML `width="1024" height="1024"` agregados en la sesión 5 (para evitar layout shift).
  Esa combinación de `width` vía `min()` + aspect-ratio implícito por atributos no se
  está respetando bien en Safari — el logo (cuadrado 1024×1024 real, confirmado
  abriendo el archivo) se veía estirado verticalmente, ocupando casi todo el panel
  izquierdo. Arreglado fijando la proporción explícitamente en CSS en vez de dejarla
  implícita: se agregó `height:auto;aspect-ratio:1/1;object-fit:contain` tanto a
  `.brand img.logo-full` (escritorio) como a `.brand-movil img` (móvil, mismo patrón,
  arreglado preventivamente aunque no se reportó ahí). SW **v59**. `node --check`
  limpio (login.html no tiene bloques de script inline afectados por el cambio, solo
  CSS).
  **PENDIENTE:** push; que Francy confirme en Safari que el logo ya se ve cuadrado
  y bien proporcionado.

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 10, auditoría funcional completa)

- **Francy pidió una revisión exhaustiva de TODA la app** (no solo diseño, ya
  cubierto en sesión 5) buscando bugs y fallas reales. Se lanzaron 5 auditorías
  en paralelo (núcleo académico, asistencia/exámenes, comunicación/seguimiento,
  administración, infraestructura core). Aparecieron 9 hallazgos **críticos**
  (fugas de privacidad entre docentes/materias, del mismo tipo ya corregido en
  sesión 3 pero en más lugares, más un XSS real) — Francy eligió arreglarlos
  todos hoy mismo. Resumen de cada uno:

  1. **PIAR sin ningún filtro** (`11-inclusion.html`) — cualquier docente veía
     y editaba el PIAR de cualquier estudiante (diagnóstico médico, entorno
     familiar). Arreglado: `todosEstudiantes()` ahora filtra por
     `estudianteEsMio(curso)` — permitido si la materia del curso está en las
     asignaciones del docente, si dirige ese grado-grupo, o si es admin/acceso
     total. Se agregó `lv_docentes`+`lv_asignaciones` a `LV_SYNC_TABLAS`.
  2-3. **Buscador global de estudiantes y alerta de Observador Tipo II/III**
     (`index.html`) — sin filtrar, exponían curso/acudiente/observador y
     situaciones de convivencia de cualquier estudiante a cualquier docente.
     Arreglado con `PERM.permiteMateria()` (el mismo objeto de la sesión 3) en
     el buscador y en cumpleaños; la alerta de Observador ahora solo se
     muestra si el docente dirige algún grupo o es admin (mismo criterio que
     el propio módulo Observador).
  4. **Analítica → "Perfil del estudiante" sin control de acceso** — a
     diferencia de Director/Boletines, no tenía gate. Se agregó
     `esAdmin`/`gruposDirigidos()` (duplicado del patrón de 12-director.html)
     y un mensaje de "acceso restringido" cuando el docente no dirige ningún
     grupo.
  5. **Exámenes — "Presentar" y "Resultados" sin filtrar** (`03-examenes.html`
     y `04-examenes-11.html`) — y los resultados nunca se etiquetaban con
     materia. Arreglado: `fillPresentar()`/`renderResultados()` usan
     `LV_CTX.filtrar()`; `saveResult()` ahora estampa `materia`. En 04 además
     se etiquetaron y filtraron los Simulacros ICFES externos
     (`simulacros_ext`) en `renderAnalisis()`, `updateCharts()` y al crear uno.
  6. **Historial de Comunicados sin filtrar** (`06-comunicados.html`) —
     exponía nombre/acudiente/teléfono de citaciones de otras materias.
     Arreglado con `historialVisible()` (usa `LV_CTX.filtrar()` solo para
     MOSTRAR, nunca para sobrescribir el array completo). De paso se encontró
     y arregló un bug real de pérdida de datos: "Limpiar historial" borraba
     el historial de TODOS los docentes; ahora solo borra lo que el docente
     actual puede ver.
  7. **Exportar CSV y restaurar respaldo** (`01-calificaciones.html`) — el CSV
     exportaba notas de todos los cursos/materias; arreglado filtrando por
     `LV_CTX`. Restaurar un respaldo .json sigue siendo total a propósito
     (es la función de disaster-recovery), pero la advertencia ahora explica
     que sobreescribe datos de TODOS los docentes en este dispositivo y en la
     nube — antes decía solo "reemplazará los datos actuales".
  8. **Centros de Interés — el filtro de "mi centro" era solo de interfaz**
     — se podía saltar desde la consola del navegador (`seleccionarCentro(id)`
     con un id ajeno). Arreglado centralizando el control en la función
     `centro(id)` (único punto por el que pasan TODAS las pestañas de
     lectura/escritura), que ahora devuelve `null` si el centro no es del
     docente. También se agregó filtro de `_eliminado` a `ESTUDIANTES`/
     `CURSOS`/`DOCENTES` (antes solo `CENTROS` lo tenía). **PENDIENTE real:**
     el servidor (RLS de `lv_centros_inscripciones`/`lv_centros_asistencia`)
     sigue siendo `solo_autenticados`, sin restricción por dueño — arreglarlo
     bien requiere una función puente `auth.uid() → lv_docentes.id` que el
     proyecto todavía no tiene (es la misma pieza que dejó pausada la Etapa 2
     · Fase 2 por su complejidad). Se decidió NO improvisarla hoy; queda para
     una sesión dedicada con pruebas contra la base real.
  9. **XSS real en `herramientas/test-lectura.html`** — único módulo de
     herramientas sin función `esc()`; insertaba nombre de estudiante/docente
     en `innerHTML` sin escapar. Arreglado: se agregó `esc()` y se aplicó en
     `pintarReporte()` y `pintarHistorial()`.

  SW **v58**. `node --check`-equivalente limpio en los 9 archivos tocados
  (11-inclusion, index, 14-analitica, 03-examenes, 04-examenes-11,
  06-comunicados, 01-calificaciones, 17-centros-interes,
  herramientas/test-lectura.html).

  **Hallazgos NO críticos de la auditoría, sin tocar hoy** (quedan para
  después, ver detalle completo en la conversación si hace falta): 12-director
  y 14-analitica usan pesos/escala de nota fijos en vez de leer Ajustes reales;
  Observador cruza anotaciones entre estudiantes homónimos de cursos distintos
  por su fallback de emparejamiento por nombre; Horario no aísla celdas por
  docente (solo por materia); banco de imágenes del Planeador visible entre
  materias en equipo compartido; algunos `innerHTML` sin `esc()` en el preview
  de WhatsApp/Carta de Comunicados; importador de notas pisa silenciosamente
  nombres duplicados del Excel; condición de carrera si SABIE está abierto en
  dos pestañas a la vez; bug menor de `shortName()` en 04-examenes-11 que
  nunca abrevia nombres en el podio (doble backslash en el regex).

  **PENDIENTE:** push; que Francy pruebe con una cuenta docente normal (no
  admin) que PIAR/buscador/Analítica/Exámenes/Comunicados ya solo muestran lo
  suyo, y que el director de grupo correspondiente SÍ sigue viendo lo que debe
  ver (Observador, Perfil del estudiante).

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 9, botón "← Atrás" genérico)

- **Francy notó que en los módulos de materia (01-09) solo aparecía "← Portal", sin
  "← Atrás".** Causa: `materia-context.js` (LV_CTX) ya pintaba un botón "← Atrás" hacia
  `materia-hub.html`, pero SOLO cuando había contexto de materia en la URL/sessionStorage
  (es decir, si entrabas por "Áreas académicas" → materia-hub → módulo). Si entrabas por
  el enlace directo del sidebar del portal (que no pasa `?area=&materia=`), `LV_CTX.materia`
  quedaba `null` y `pintarPill()` no hacía nada. Arreglo en `materia-context.js`
  (`pintarPill()`): cuando NO hay contexto de materia, ahora se agrega un botón "← Atrás"
  genérico que usa `history.back()` (solo si `history.length>1`, para no mostrarlo en una
  pestaña recién abierta sin nada a dónde volver) — funciona sin importar de dónde vino
  (portal, materia-hub, u otro módulo). Cuando SÍ hay contexto de materia, se mantiene el
  comportamiento anterior sin cambios (botón "← Atrás" hacia materia-hub + pill de materia).
  Cubre los módulos 01-09 (los únicos que cargan `materia-context.js`); los institucionales
  10-17 no tienen concepto de "materia" así que se dejaron con solo "← Portal", que sigue
  siendo lo correcto ahí. SW **v57**. `node --check` limpio.
  **PENDIENTE:** push; que Francy confirme que el botón "← Atrás" aparece ahora también
  entrando por el sidebar directo.

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 8, ajuste de íconos)

- **Íconos SVG del sidebar del portal, con color propio.** Francy probó el piloto de
  íconos SVG (sesión 5, punto 4 del audit) y no le gustó que quedaran todos blancos
  (`stroke="currentColor"` heredando el color de texto del sidebar) — con los emojis
  cada módulo se distinguía por color de un vistazo, y el SVG monocromático perdió esa
  señal visual. Opciones planteadas: volver a emoji, color por grupo/sección, o color
  propio por ícono — Francy eligió **color propio por ícono**. Arreglo: cada
  `<span class="ic">` del sidebar (18 en total) ahora lleva `style="color:#hex"` con
  un color distinto (paleta pastel/vibrante tipo Tailwind-400, verificada con ≥3:1 de
  contraste contra el degradado azul del sidebar `--primary`/`--primary-dark`); el SVG
  interno sigue usando `stroke="currentColor"` así que toma ese color del `<span>` que
  lo envuelve, sin afectar el color del texto del link (que sigue blanco, fuera del
  span). SW **v56**. `node --check`-equivalente limpio en `index.html`.
  **PENDIENTE:** push; que Francy confirme que el resultado le gusta antes de decidir
  si se generaliza el patrón (SVG + color propio) al resto de la app.

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 7, arreglo rápido)

- **Fuga de privacidad en Progreso (`01-calificaciones.html`), hallada por Francy tras
  probar el importador.** Desde la materia "Democracia" veía el progreso de cursos de
  Ciencias Sociales e incluso de Lengua Castellana (otra docente). Causa: la pestaña
  Progreso usa una función propia `fillProgresoSelect()` (separada de
  `fillCursoSelects()`) para llenar el `<select>` de curso, y esa función listaba
  `cursos` sin filtrar — no usaba `LV_CTX.filtrar(cursos)` como sí hacen `#p-curso`,
  `#r-curso` y `#n-curso` en la misma pestaña. Bug preexistente, no introducido en
  esta sesión. Arreglado: ahora `fillProgresoSelect()` aplica el mismo filtro por
  materia. SW **v55**. `node --check`-equivalente limpio.
  **PENDIENTE:** push; que Francy confirme desde una cuenta/materia normal que
  Progreso ya solo muestra sus propios cursos.

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 6)

- **Importador de notas + Nivelaciones, en `modulos/01-calificaciones.html`.** Francy
  pidió poder subir las notas del periodo 1 desde su planilla real (Excel de
  seguimiento: columnas Cód, ESTUDIANTES, N1..N6, Acumulativo 25%, Autoevaluación 5%,
  Cooevaluación 5%, Heteroevaluación 5%, Inasistencias — adjuntó
  `Seguimiento_903_CIENCIAS_SOCIALES.xlsx` como ejemplo real) y un sistema de
  nivelaciones: estudiantes reprobados (definitiva < nota mínima) se listan
  automáticamente, el docente les mete una nota de nivelación, y esa nota
  **reemplaza la definitiva SOLO SI es mayor** (si no, se conserva la definitiva
  original) — se confirmó con Francy vía preguntas: crear automáticamente a los
  estudiantes que no coincidan por nombre, y sí generar el acta imprimible (adjuntó
  `Ciencias sociales 9-3.pdf` como ejemplo de "Acta de Nivelación" de otro sistema,
  gestionescolar.co, usada de referencia de formato).
  - **Pestaña "Nivelaciones" nueva** (`#tab-nivelacion`): curso + periodo, lista solo
    a los reprobados (`calcDefinitiva(cal) < CFG.scale.passing`) con un input de nota
    de nivelación. Guarda en el mismo registro de `lv_calificaciones` como
    `cal.nivelacion` — **campo nuevo, sin migración SQL** (sync.js ya sincroniza el
    objeto `cal` completo como JSON opaco vía `transform:(r)=>({id:r.id,datos:r})`,
    así que cualquier campo nuevo viaja solo).
  - **`defFinal(cal)`** = `cal.nivelacion` si existe y es mayor que
    `calcDefinitiva(cal)`; si no, la definitiva normal. Reemplaza a `calcDefinitiva`
    en TODOS los lugares donde se muestra/usa la nota "oficial" del periodo dentro de
    01-calificaciones.html: Planilla (con etiqueta "(niv)" junto a la nota
    reemplazada), Reportes (`statsFor`), Progreso, exportación a CSV/Excel.
  - **Mismo criterio replicado en los otros 3 módulos que duplican el cálculo de
    definitiva** (convención del proyecto: sin JS compartido) — sus funciones
    `defin(cal)` en `12-director.html`, `13-boletines.html` y `14-analitica.html`
    ahora también miran `cal.nivelacion` antes de devolver la definitiva, para que
    boletines, "mi grupo" y analítica queden consistentes con la nivelación sin
    tocar cada módulo por separado en el futuro.
  - **Acta de Nivelación imprimible**: botón "🖨️ Imprimir acta" en la pestaña
    Nivelaciones. Genera un documento con membrete institucional (logo + `LV_INST` +
    `membreteLinea()`, mismo patrón que boletines/comunicados), curso/grado/grupo/
    periodo/fecha, tabla de reprobados con su nota de nivelación y definitiva
    antes→después, y firma del docente (`lv_login.nombre`). Usa un contenedor
    `#acta-print` oculto que solo se muestra en `@media print` cuando
    `document.body` tiene la clase `printing-acta` (mismo patrón aislado que usa
    `13-boletines.html` con `#print-area`, no interfiere con el `window.print()` que
    ya usaba la pestaña Reportes). **No incluye número de acta secuencial** (el PDF
    de referencia traía "ACTA No. 1173" de gestionescolar.co, un sistema externo —
    no hay una fuente de verdad para numerar actas dentro de SABIE todavía; si
    Francy lo necesita, es un desarrollo aparte).
  - **Importador de notas** (botón "⬆️ Importar notas" junto al de "Importar lista"
    en la pestaña Planilla, mismo curso+periodo ya seleccionados en los selects de
    arriba): sube un .xlsx/.xlsm/.csv, detecta la fila de encabezados buscando la
    columna de nombres (reutiliza `NAMECOL_RE` del importador de listados existente)
    y clasifica el resto de columnas por regex — `N\d+` → notas cognitivas
    (posicional, no depende de `CFG.cognitivoSlots`), `acumulativ`, `autoevaluaci`,
    `co+evaluaci` (cubre "Coevaluación" y "Cooevaluación"), `heteroevaluaci`,
    `inasistenc`. Las columnas ya calculadas de la planilla externa (Cognitivo 60%,
    DEFINITIVA 100%, Escala, Observación, Cód) se ignoran a propósito — la app
    recalcula todo con su propio motor (`calcDefinitiva`), no se copian valores
    derivados. Empareja estudiantes por nombre normalizado (`normN`: minúsculas,
    sin tildes, espacios colapsados) contra el curso ya seleccionado; el que no
    coincide con nadie **se crea automáticamente** (decisión confirmada por Francy),
    la vista previa marca cuáles son "Existente" vs "Nuevo — se creará" antes de
    confirmar.
  SW **v54**. `node --check`-equivalente limpio en los 4 archivos tocados
  (01-calificaciones, 12-director, 13-boletines, 14-analitica); balance de
  `<div>`/`<section>` verificado en 01-calificaciones (archivo grande, edición por
  reemplazos de texto exactos, no reescritura completa).
  **PENDIENTE:** push (Francy lo hace con su ritual de Terminal); que Francy pruebe
  el importador con su planilla real de otro curso/materia y confirme que las
  columnas se detectan bien; decidir si vale la pena un número de acta secuencial
  más adelante.

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 5)

- **Auditoría de diseño UI/UX (10 prioridades) + correcciones, sesión punto por punto.**
  Francy encontró un framework de diseño de terceros (`ui-ux-pro-max`, no instalable en
  esta sesión de Cowork) con 10 categorías priorizadas; se aplicaron los mismos principios
  manualmente. Auditoría completa hecha primero (sin tocar código), luego correcciones
  UNA POR UNA a pedido de Francy ("vamos uno a uno, push al final"). Resultado por punto:
  1. **Accesibilidad:** `lv-tema.css` → `--muted` (#64748b→#475569), `--ok`
     (#16a34a→#15803d) y `--warn` (#d97706→#b45309) oscurecidos para pasar 4.5:1 de
     contraste (antes 3.2-4.3:1). Como `lv-tema.css` es la única fuente de esas variables
     (se carga al final, gana el cascade), el fix aplica a TODA la app sin tocar módulo
     por módulo. Se agregó `role="alert" aria-live="assertive"` a los 19 `<div id="toast">`
     de la app (coordinacion.html + 18 módulos) para que lectores de pantalla anuncien
     los mensajes.
  2. **Táctil:** `modulos/05-asistencia.html` le faltaba el reset
     `input[type=checkbox],input[type=radio]{width:16px;height:16px;...}` que ya tenían
     coordinacion.html y 17-centros-interes.html — los radios P/F/T/E de la tabla de
     asistencia diaria quedaban estirados por la regla genérica `input,select{width:100%}`.
     Corregido con el mismo patrón.
  3. **Performance:** `login.html` → los dos `<img src="Logo/sabie-full.jpg">` (logo
     grande, 1024×1024) no tenían `width`/`height`, riesgo de layout shift al cargar —
     agregado. `Logo/Logo_nuevo.png` (4.9MB) y `Logo/sabie-full.png` (985KB) están
     huérfanos (no los referencia ningún archivo) — **Francy debe borrarlos a mano**,
     Claude no tiene permiso de borrado en esa carpeta OneDrive desde esta sesión.
  4. **Iconografía (piloto, a pedido de Francy):** los 18 íconos del sidebar de
     `index.html` (menú principal del portal) se reemplazaron de emoji a SVG inline
     (trazo `currentColor`, sin relleno, 19×19px) — CSS `.sb-link .ic` actualizado para
     acomodarlos. Quedan ~49 emojis sin tocar en el resto de `index.html` (íconos de
     materias del dashboard, alertas) y el resto de la app (~300+ emojis) intacta —
     decisión explícita de Francy de hacer solo un piloto antes de decidir si se
     generaliza. **Pendiente: que Francy vea el resultado y decida si se hace en el
     resto de la app.**
  5. **Layout responsive:** revisado a fondo, NO se tocó nada — ya está bien resuelto
     (sidebar colapsa a menú deslizante en móvil vía `@media(max-width:920px)`, grillas
     usan `repeat(auto-fit/auto-fill,minmax(...))` que no necesitan media query, tablas
     con `.tableScroll` de scroll horizontal + primera columna fija, tabs con
     `overflow-x:auto`). Único hallazgo: breakpoints inconsistentes entre módulos
     (600/640/700/760/800/880/920px) para el mismo patrón — cosmético, no se tocó por
     bajo beneficio/riesgo.
  6. **Tipografía:** en `index.html` se subieron los 3 textos más pequeños del portal:
     subtítulo del sidebar (.62rem→.7rem), etiquetas de sección (.66rem→.72rem), contador
     de materias (.7rem→.75rem). El mismo patrón (texto <12px) se repite en ~20 módulos
     más (calendarios, badges, celdas de tabla) — NO tocado ahí porque los espacios son
     más ajustados y no hay forma de verificar visualmente que no se desborde sin
     renderizar. Pendiente si Francy quiere que se revise módulo por módulo.
  7. **Animación:** agregado soporte global a `prefers-reduced-motion` en `lv-tema.css`
     (anula duración de animaciones/transiciones vía `!important` cuando el sistema
     operativo lo pide) — cubre toda la app de una vez al ser el tema compartido.
  8. **Formularios:** revisado `login.html` (el más crítico) — ya está bien resuelto
     (labels visibles, `role="alert"`, estados de carga "Verificando…"/"Cargando tus
     datos…", validación nativa HTML5 vía `required`). No se tocó nada.
  9. **Navegación:** hallazgo corregido del audit inicial — la app YA tiene
     `materia-context.js` (`LV_CTX`), que inyecta dinámicamente un botón "← Atrás" y un
     pill con la materia activa en el header de cada módulo cuando se entra desde una
     materia específica (vía `materia-hub.html`). Ya resuelve el problema de "contexto
     perdido" que se había señalado en el audit. La diferencia sidebar (portal) vs
     topbar+tabs (módulos) es un patrón "drill-down" intencional, no se tocó.
  10. **Gráficos/datos:** `modulos/05-asistencia.html` → se agregó la letra (P/F/T/E)
      visible debajo del ícono en cada encabezado de columna de la tabla de asistencia,
      para no depender solo del color (accent-color) ni de un `title` que no se ve en
      celular.
  SW **v53**. `node --check`-equivalente (extracción de bloques `<script>` + `new
  Function`) limpio en `index.html` y `modulos/05-asistencia.html`, los dos archivos con
  cambios de JS/markup no triviales.
  **PENDIENTE:** push de todo este lote (Francy pidió hacerlo al final, no por punto);
  que Francy borre `Logo/Logo_nuevo.png` y `Logo/sabie-full.png` a mano; decidir si el
  piloto de íconos SVG se generaliza a toda la app; decidir si vale la pena revisar
  texto pequeño y breakpoints módulo por módulo.

## ▶ POR DÓNDE RETOMAR (último estado: jul 14, 2026 — sesión 4)

- **Backlog F completado — campos de institución + membrete.** Francy pasó los datos
  reales (NIT 900.129.463-7, DANE 223001002405, Código ICFES 156950, Secretaría de
  Educación Municipal de Montería, Montería – Córdoba, correo
  iesanjosedelomaverde@semmonteria.gov.co) y una foto del membrete oficial que usa
  la institución. Cambios:
  - `auth.js` → `LV_INST` gana `nit()`, `dane()`, `icfes()`, `correo()`,
    `secretaria()`, `ciudad()`, `resolucion()` (con los valores reales como
    respaldo si `lv_institucion` está vacío). El escudo sigue siendo
    `Logo/logo.jpg` (ya coincide con el escudo real de la institución — se
    confirmó comparando con los íconos PWA existentes); no hay subida de imagen,
    se reemplaza el archivo si cambia.
  - `coordinacion.html` → tarjeta Institución: 3 inputs nuevos (NIT, DANE, ICFES,
    resolución, secretaría, ciudad, correo) que se guardan en `lv_institucion`.
    **`resolucion` quedó vacío** (no aparecía en el membrete que envió Francy —
    pendiente que ella la escriba si aplica).
  - `modulos/06-comunicados.html` → el membrete de la carta oficial tenía un
    **bug real**: mostraba un SVG placeholder "LV" y un código DANE
    **equivocado** (2530010024, hardcodeado) en vez del real. Se reemplazó por
    `Logo/logo.jpg` + una línea dinámica con NIT/DANE/ICFES/resolución +
    secretaría/ciudad, leída de `LV_INST`.
  - `modulos/10-observador.html`, `11-inclusion.html` (3 lugares: texto genérico,
    PIAR anexo 1, PIAR acta anexo 3), `13-boletines.html`, `14-analitica.html` →
    se agregó una función `membreteLinea()` (duplicada por archivo, patrón ya
    usado en el proyecto de no compartir JS entre módulos) que imprime NIT/DANE/
    Código ICFES/Resolución debajo del título en el encabezado de impresión
    (`.p-head`), leyendo de `LV_INST`.
  - SW **v52**. `node --check` limpio en los 7 archivos con `<script>` inline
    tocados.
  **PENDIENTE:** push; y que Francy confirme/complete el número de Resolución de
  aprobación (no vino en la foto del membrete que envió).
- **Respaldos automáticos de Supabase** (parte de backlog F) siguen SIN hacer —
  no es código de este repo, se configura en Supabase → Database → Backups
  (Point-in-Time Recovery).

## ▶ POR DÓNDE RETOMAR (jul 14, 2026 — sesión 3)

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
