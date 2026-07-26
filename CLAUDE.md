# SABIE — Contexto del proyecto para Claude

> Lee este archivo completo antes de trabajar en el proyecto. Resume qué es, cómo funciona,

## ▶ AJUSTE (jul 25, 2026 — sesión 30e): botón para descartar TODOS los borradores sin publicar — CÓDIGO LISTO, sin desplegar

- **Reporte de Richard tras el push de la sesión 30d:** captura con una lista larguísima
  de "horas sin ubicar" (decenas de docentes, cada uno con varias materias-grado con horas
  faltantes) — muy por encima del "17 horas sin ubicar (98.6%)" documentado en la sesión
  29. Antes de tocar código se le preguntó (AskUserQuestion) si ya tenía un borrador
  guardado de antes de hoy: **confirmó que sí.**
- **Causa raíz (sin bug de cálculo nuevo — confirmado con Node comparando el algoritmo
  VIEJO de la sesión 29 contra el NUEVO de la sesión 30c con los datos reales: 245
  unidades y 525 horas en AMBOS, 0 de diferencia):** el motor automático tiene una regla
  de seguridad — "solo llena huecos vacíos, nunca sobrescribe una celda ya ocupada (ni
  publicada ni en borrador)". El borrador que Richard ya tenía guardado se generó ANTES
  de los fixes de sede de esta sesión (30b-30d) con la lógica vieja de `gruposBachPorGrado`
  (máximo de una sola fila) que en el escenario general puede dejar huecos ocupados de
  forma incompleta/imprecisa en ciertos grados. Al regenerar HOY, el motor respeta ese
  borrador viejo tal cual — y como ya "ocupa" buena parte de la semana de cada docente,
  las horas nuevas (ahora correctamente calculadas) ya no tienen dónde caber → aparecen
  como conflicto, aunque el cálculo en sí no cambió. No es un bug de la sesión 30c/30d —
  es la consecuencia esperada de la regla "nunca sobrescribir" chocando con un borrador
  desactualizado.
- **Botón nuevo "🧹 Descartar TODOS los borradores sin publicar"** en la tarjeta de
  generación automática de `modulos/21-horarios-coordinacion.html`, junto al de "Generar
  automáticamente". Vacía `lv_horarios_borrador` COMPLETO de un solo golpe (con confirm
  explícito y conteo de cuántos borradores se van a perder) — **NO toca `lv_horarios`**
  (lo ya publicado), mismo candado de siempre; solo limpia cambios sin publicar. Antes,
  solo existía el botón "Descartar borrador" del editor manual, uno por uno por docente
  (`btn-limpiar-borrador`) — impráctico con ~45 docentes bachillerato afectados. Se agregó
  un texto explicativo junto al botón para que quede claro CUÁNDO usarlo (justo este
  escenario: borrador viejo de antes de una corrección del sistema).
- SW **v102**. `node --check` limpio en los 3 bloques `<script>`; balance de
  `div/table/tr/td/th/label/select/button/details/summary` verificado (37/37, resto igual
  que sesión 30d + 1 button nuevo).
- **PENDIENTE:** push; que Richard toque "🧹 Descartar TODOS los borradores sin publicar"
  (confirma que solo afecta lo sin publicar, no lo ya publicado), luego "🤖 Generar
  automáticamente" desde cero, y confirme que el número de horas sin ubicar vuelve a un
  rango parecido al documentado (17 horas, 98.6% ubicadas) — si sigue apareciendo una
  lista larga después de descartar y regenerar limpio, ahí sí habría que investigar un
  problema de cálculo real, no de borrador viejo.

## ▶ AJUSTE (jul 25, 2026 — sesión 30d): fix crítico — LV_CURSO.sedeCode() colapsaba sedes reales distintas — CÓDIGO LISTO, sin desplegar

- **Reporte de Richard tras el push de la sesión 30c:** "Ahora aparecieron un sin número de
  cruces" — captura con **140 cruces** detectados entre "Danarlys Elena Martínez Medrano" y
  "Diana Marcela Montero Jiménez" para "Preescolar-1" y "1°-1", en casi todos los
  bloques/días de la semana.
- **Causa raíz encontrada:** `LV_CURSO.sedeCode()` (auth.js, función compartida por toda la
  app desde sesión 21) truncaba SIEMPRE a las primeras 3 letras y **descartaba los
  dígitos** del nombre. Contra el catálogo REAL de 16 sedes (`LV_INST.sedes()`), esto
  producía dos colisiones reales: **"Juana Julia 1" y "Juana Julia 2" daban las dos
  "JUA"**, y **"San Diego"/"San Francisco"/"San Miguel" daban las tres "SAN"**. Verificado
  con Node contra el catálogo real: exactamente esas 2 colisiones, 0 más. Danarlys
  (docente semilla, sede "JUANA JULIA 1") y Diana (semilla, sede "JUANA JULIA 2") son
  sedes DISTINTAS y reales — la sesión 30b había arreglado que la sede SÍ viajara hasta la
  celda y SÍ se comparara en los cruces (`mismoGrupoReal`), lo cual expuso esta colisión
  preexistente que antes nunca importaba (nadie comparaba sede en cruces todavía). No es
  una regresión de la sesión 30c (grupos de bachillerato) — es un bug de `sedeCode()` en sí
  mismo, activado indirectamente por el fix de la sesión 30b.
- **Corregido `LV_CURSO.sedeCode()` en `auth.js`:** ahora agrega los DÍGITOS del nombre al
  final del código (distingue "Juana Julia 1/2" sin alargar el código: `JUA1`/`JUA2`), y si
  aun así el código colisiona con OTRA sede real del catálogo (`LV_INST.sedes()`), toma más
  letras hasta ser único (distingue "San Diego/Francisco/Miguel": `SAND`/`SANF`/`SANM`).
  Las 14 sedes que nunca colisionaron devuelven EXACTAMENTE el mismo código de 3 letras
  que antes (retrocompatible — no rompe nada ya guardado con esos códigos, como cursos con
  sede en su etiqueta corta "3-1 CRI"). Función pura, un solo lugar (`auth.js`), usada por
  `LV_CURSO.etiqueta()`, `LV_CURSO.dirigeCurso()`, `LV_PERM.cursoEsMio()`, el `permiteMateria`
  duplicado de `index.html`, y ahora también `mismoGrupoReal()` de
  `21-horarios-coordinacion.html` — un solo fix corrige los 5 usos, no había copias sueltas
  (verificado con grep, sin otra implementación duplicada del truncado viejo).
- **Verificado con Node contra el catálogo real de 16 sedes:** 16/16 códigos únicos, 0
  colisiones. Simulado el escenario EXACTO del reporte de Richard (Preescolar-1, Danarlys
  en Juana Julia 1 vs Diana en Juana Julia 2): `mismoGrupoReal()` ahora da `false` (correcto
  — sedes distintas, no es cruce); la misma comparación con dos celdas de la MISMA sede
  sigue dando `true` (un cruce real de verdad se sigue detectando, no se rompió lo que sí
  funcionaba).
- **OJO — no confundir con el campo `dirige` de cada docente** (texto tipo "9-3, 1-1 JUA"
  usado para "¿qué grupos dirige?"): revisado con cuidado, la semilla real de docentes NO
  trae sufijo de sede en ningún token `dirige` (ej. Danarlys: `"Prejardin-2, 0-1, 1-101"`,
  sin " JUA" al final) — así que `dirigeCurso()` ya no distinguía sede ahí de todas formas
  (el chequeo de sede se salta cuando el token no la trae), y este fix no cambia ese
  comportamiento para nadie. Si en el futuro coordinación empieza a escribir sufijos de
  sede en `dirige` a mano (ej. "1-1 JUA"), ahora sí conviene que use el código nuevo y
  preciso (`JUA1`/`JUA2`) en vez del ambiguo "JUA" viejo — documentado aquí para que quede
  claro por qué.
- SW **v101**. `node --check` limpio en `auth.js`; balance/sintaxis verificado en los
  bloques `<script>` de `index.html`, `coordinacion.html` y
  `21-horarios-coordinacion.html` (los 3 archivos que llaman a `LV_CURSO.sedeCode`).
- **PENDIENTE:** push; que Richard recargue "Horarios (Coordinación)" y confirme que los
  140 cruces falsos entre Danarlys y Diana (y cualquier otro par de docentes de Juana
  Julia 1 vs 2, o San Diego/Francisco/Miguel) ya no aparecen, y que un cruce REAL (mismo
  grado-grupo-sede con dos docentes distintos a la misma hora) se sigue detectando bien.

## ▶ AJUSTE (jul 25, 2026 — sesión 30c): grupos de bachillerato numerados por sede (Principal/Juana Julia 1) — CÓDIGO LISTO, sin desplegar

- **Pregunta de Richard tras la sesión 30b:** "¿Cómo vamos a resolver lo de los grupos? Es
  decir, que se sepa si es grupo 1 o 2 o 3." Su especificación exacta: la numeración debe
  empezar en Sede Principal (si noveno-química tiene 2 grupos en Principal, son 1 y 2; si
  hay uno más en Juana Julia 1, es el 3 — **numeración continua, sin reiniciar**).
  Confirmó que **las ÚNICAS sedes con bachillerato (6°-11°) son Principal y Juana Julia 1**
  — el resto de sedes son solo primaria. Para primaria confirmó que la numeración YA es
  correcta (independiente por sede: "La Popa" con un grupo de primero es 1-1, sin relación
  con la numeración de otra sede) — no tocado, ya lo hacía bien el import de sesión 27.
- **Mi primera propuesta (sede fija por docente, en Hoja de Vida) quedó DESCARTADA por un
  contraejemplo real de Richard:** "el profesor Richard Miguel Hernández Sabié da Ciencias
  Sociales en 10-2 en la sede Principal y Ciencias Sociales en 10-3 en la sede Juana Julia
  1 — ¿cómo se diferencia eso?" — un mismo docente puede cubrir grupos de AMBAS sedes en
  la MISMA materia-grado. La sede tiene que quedar a nivel de la ASIGNACIÓN (fila
  materia+grado), no del docente.
- **Campo nuevo `numGruposJJ1`** en cada asignación de bachillerato (sin migración SQL,
  JSONB): cuántos de los `numGrupos` totales que esa fila declara son de Juana Julia 1; el
  resto (`numGrupos - numGruposJJ1`) se asume Principal. Por defecto 0/ausente en TODO lo
  ya importado (todo cae en Principal hasta que coordinación lo corrija a mano) — el Excel
  de bachillerato NO trae sede (verificado desde la sesión 27), así que este dato no se
  puede inferir, solo declarar.
- **`coordinacion.html` → pestaña Asignaciones:** la columna "Grupos" (bach.) ahora muestra
  el total declarado + un input pequeño para editar cuántos de esos grupos son de Juana
  Julia 1 (el resto se ve como "Principal: N"). Esto de paso resuelve la duda de Richard
  sobre "hay dos columnas que dicen grupo, no sé qué diferencia hay" — no era un bug: una
  es "Grupo/Sede (primaria)" (el grupo EXACTO, ya viene preciso del Excel) y la otra es
  "Grupos (bach.)" (solo un CONTEO, el número específico 9-1/9-2 se decide en Horarios) —
  se renombraron ambos encabezados y se agregó un texto explicativo para que no se
  confundan. **Con esto también queda resuelta la pregunta de Richard sobre "solo se puede
  asignar una sola sede al docente":** la sede ya NO se asigna al docente en ningún lado
  para bachillerato — vive en la asignación (por fila materia+grado), así que un mismo
  docente puede tener grupos en Principal y en Juana Julia 1 sin ningún conflicto de
  diseño. El desplegable de sede que se ve junto al nombre del docente en el selector de
  Asignaciones (`d.sede`) es un dato distinto y sin relación (uso general/primaria); no
  restringe nada de esto.
- **`modulos/21-horarios-coordinacion.html` — `SEDES_BACH_ORDEN = ['PRINCIPAL','JUANA JULIA 1']`**
  (las únicas 2 con bachillerato, en el orden de numeración). El modal de asignar clase
  (`fillAreaMateria`) ahora ofrece este catálogo corto para áreas de bachillerato (en vez
  del catálogo completo de 16 sedes que solo aplica a primaria).
- **`gruposBachPorGradoYSede(asignaciones)` NUEVA** (reemplaza `gruposBachPorGrado`):
  calcula el total de grupos de CADA sede, por grado, para poder numerar y detectar
  sobre-cupo. **Bug real encontrado y corregido ANTES de dar esto por bueno** (atrapado
  con el mismo harness de Node de siempre, contra un escenario sintético calcado del
  ejemplo de Richard): la primera versión tomaba el MÁXIMO de `numGrupos` de una sola fila
  para estimar el total del grado — funciona si cada materia+grado tiene un solo docente,
  pero **91 de las 245 combinaciones materia+grado reales tienen 2 o 3 docentes distintos**
  compartiendo la misma materia (ej. Matemáticas 9° con 3 profes). Con el máximo de una
  sola fila, el segundo/tercer docente de una materia compartida perdía grupos en
  silencio (probado: un docente con 1 grupo Principal + 1 JJ1 solo recibía el JJ1, el
  Principal se descartaba porque el cursor ya estaba lleno). **Corregido:** ahora se SUMAN
  los grupos (principal y JJ1 por separado) de todas las asignaciones de la MISMA
  materia+grado primero, y solo LUEGO se toma el máximo entre materias distintas del mismo
  grado (para permitir que una materia sin repartir del todo tome el total de otra que sí
  lo esté). Verificado con Node: el escenario exacto de Richard (2 docentes, Sociales 10°,
  uno con 2 grupos Principal y otro con 1 Principal + 1 Juana Julia 1) ahora da los 4
  grupos correctos (1,2,3 Principal + 4 Juana Julia 1), sin perder ninguno.
- **`construirUnidades()` — reparto continuo entre sedes:** dos cursores independientes
  (`cursorPrincipal` empieza en 1; `cursorJJ1` empieza en `totalPrincipal+1`, para no
  reiniciar la cuenta) — un mismo docente puede consumir números de AMBOS cursores en la
  misma iteración si su fila declara grupos de las dos sedes. Si una asignación pide más
  grupos de los que hay en total para su sede, queda reportado en `avisos` (no se pierde
  en silencio, coordinación ve el aviso y corrige el reparto en Asignaciones).
- **Verificado con Node contra los 284 datos reales** (no solo el escenario sintético):
  con `numGruposJJ1` ausente en TODAS las asignaciones reales (nadie lo ha declarado
  todavía — es un campo nuevo), el resultado es 245 unidades de bachillerato, **0
  choques** materia+grado+grupo+sede entre docentes distintos, **0 avisos**, **0 unidades
  sin sede**, y **0 en Juana Julia 1** (esperado: todo cae en Principal por defecto hasta
  que coordinación declare manualmente cuáles son de Juana Julia 1). Corrida completa de
  `generarHorariosAuto()` contra los datos reales: **17 conflictos** (horas sin ubicar) —
  exactamente el mismo número que la sesión 29 (98.6% ubicadas), confirmando que el fix no
  regresionó nada.
- SW **v100**. `node --check` limpio en los 3 bloques `<script>` de
  `21-horarios-coordinacion.html` y los 2 de `coordinacion.html`.
- **PENDIENTE:** push; que Richard entre a Coordinación → Asignaciones y, para el profesor
  Richard Miguel Hernández Sabié (Ciencias Sociales, 10°), marque cuántos de sus grupos
  son de Juana Julia 1 (según su ejemplo: 1 de 2) — luego ir a Horarios (Coordinación),
  tocar "Generar automáticamente" de nuevo, y confirmar que los grupos de bachillerato
  quedan numerados de forma continua (Principal primero, Juana Julia 1 después) sin
  reiniciar la cuenta y sin cruces.

## ▶ AJUSTE (jul 25, 2026 — sesión 30b): fix crítico — cruces falsos por no distinguir sede en primaria — CÓDIGO LISTO, sin desplegar

- **Reporte de Richard tras revisar la tarjeta de cruces (sesión 30):** "Está marcando
  cruces, porque no se distingue la sede en la que está cada docente." Confirmado con
  Node contra los datos reales: **6 combinaciones grado+grupo se repiten en hasta 15
  sedes distintas** (ej. "Preescolar-1" existe en 15 sedes rurales que solo tienen un
  grupo por grado) — sin sede, el reporte de cruces los trataba a todos como el mismo
  grupo físico chocando entre sí. Con ~44 docentes de primaria, esto producía decenas de
  falsos positivos.
- **Causa raíz encontrada:** el motor automático (sesión 29) SÍ usaba la sede
  internamente para no chocar grupos al generarlos (`grupoKeyGen` ya la incluía), pero al
  ESCRIBIR la celda final (`colocar()`) la descartaba — guardaba solo
  `{materia,grado,grupo,aula}`, sin `sede`. El reporte de cruces (`detectarChoques()` del
  editor manual, ya existente desde sesión 26k, y `choquesGlobales()` nuevo de la sesión
  30) comparaban grado+grupo nada más, porque nunca tuvieron con qué comparar sede.
- **Corregido en 3 puntos de `21-horarios-coordinacion.html`:**
  1. `colocar()` del motor automático ahora SÍ guarda `sede` en la celda generada.
  2. El modal manual de "Asignar clase" ganó un campo **Sede** (`#ed-sede`, catálogo de
     `LV_INST.sedes()`) que solo aparece cuando el Área elegida es "Primaria" — en
     bachillerato no aplica (el Excel de bachillerato no trae sede, sesión 27).
     `guardarCelda()` la guarda; se muestra en la celda de la grilla como código corto
     (ej. "3-1 PRI", vía `LV_CURSO.sedeCode()`).
  3. **`mismoGrupoReal(a,b)` nueva** — función única usada tanto por `detectarChoques()`
     (editor de un docente) como por `choquesGlobales()` (reporte de todo el colegio):
     compara grado+grupo siempre, y sede **solo si AMBAS celdas la traen** (retrocompatible
     con bachillerato, que nunca la tiene, y con celdas viejas sin sede).
- **Backfill automático para NO perder el trabajo ya hecho:** el borrador que Richard ya
  generó y revisó quedó con celdas de primaria SIN sede (por el bug de arriba).
  `backfillSedePrimaria(celdas, docenteId)` nueva — al leer el horario de un docente
  (`cargarDocente()` y `celdasActualesDe()`), si una celda de "Todas las materias" no
  trae sede, la busca en la PROPIA asignación de ese docente (que siempre la trae en
  primaria) por grado+grupo y la rellena — sin inventar nada, cruzando con la fuente ya
  importada. Si la celda venía de un BORRADOR, la corrección se guarda de una vez
  (`marcarBorrador()`/`guardarBorradores()`); si venía de algo ya PUBLICADO, la corrección
  solo vive en memoria hasta que se publique de nuevo (no reescribe `lv_horarios` fuera
  del botón "Publicar", respetando el mismo candado de siempre). **Richard NO tiene que
  regenerar nada** — con solo abrir el reporte o cada docente, la sede se corrige sola.
- **Verificado con Node contra los datos reales:** (1) generando desde cero con el motor
  ya corregido, las 735 celdas de primaria quedan con sede, 0 cruces reportados (antes
  del fix este mismo escenario habría marcado decenas); (2) simulando el escenario EXACTO
  de Richard — un borrador viejo con celdas sin sede, dos docentes con "Preescolar-1" en
  sedes distintas (Principal y Juana Julia 1) — `choquesGlobales()` da 0 cruces Y el
  backfill deja la sede escrita de una vez en el borrador, sin que Richard tenga que
  tocar nada.
- SW **v99**. `node --check` limpio en los 3 bloques `<script>`; balance de
  `div/table/tr/td/th/label/select/button/details/summary` verificado (37/37, resto
  igual que sesión 30 + 1 label/select nuevos del campo Sede).
- **PENDIENTE:** push; que Richard recargue "Horarios (Coordinación)", abra el reporte de
  cruces y confirme que ya no aparecen los falsos positivos entre sedes distintas — y que
  abriendo cualquier docente de primaria (aunque sea solo para mirar) ya le queda la sede
  corregida en su borrador sin acción extra.

## ▶ AJUSTE (jul 25, 2026 — sesión 30): reporte persistente de conflictos + nuevo modelo de horas (60 min + descanso) — CÓDIGO LISTO, sin desplegar

- **Feedback de Richard tras probar la generación automática (sesión 29):** ya generó y
  guardó un borrador, pero (1) no encontraba dónde ver el reporte de horas sin ubicar
  (desaparecía al guardar); (2) pidió un informe de esas horas y de los docentes con
  cruces; (3) pidió que la grilla refleje el horario real del colegio: 7 horas de clase
  de 60 minutos, con un descanso de 20 minutos después de la 4ª hora (antes eran 7
  bloques de 50 minutos seguidos, sin descanso).
- **Causa real del punto 1:** el resultado de la generación (`_genResultado`) vivía SOLO
  en una variable de JavaScript en memoria — al guardar como borrador, el código la
  vaciaba (`_genResultado=null`) para "limpiar la pantalla", borrando de paso el propio
  reporte que Richard necesitaba seguir consultando. No era un bug de cálculo, era que el
  reporte nunca se guardaba en ningún lado persistente.
- **Reporte persistido en `localStorage` (`lv_horarios_reporte`, solo local — como
  `lv_horarios_borrador`, nunca se sincroniza):** ahora se separan dos cosas que antes
  eran una sola variable: `_reporte` (conflictos/avisos/fecha/estadísticas — persiste
  entre recargas de página y NO se borra al guardar) y `_genNuevas` (las celdas recién
  generadas, en memoria, solo hasta guardarlas). Al entrar al módulo, si hay un reporte
  guardado de una generación anterior, se muestra de inmediato sin tener que generar de
  nuevo. Un botón nuevo **"🗑️ Descartar este reporte"** lo limpia a propósito cuando
  Richard ya resolvió todo (aclarado en el propio botón: no borra ningún horario, solo
  oculta el resumen).
- **Detalle de horas sin ubicar mejorado:** cada docente del listado ahora trae un botón
  **"✏️ Editar"** que abre directo su grilla en el selector de arriba (mismo patrón que ya
  usaba la tabla "Todos los docentes") — así Richard no tiene que buscar manualmente al
  docente. También se explica en el propio texto CÓMO completar una hora sin ubicar:
  abrir al docente, buscar un día/bloque libre (celda a rayas) y asignar ahí la materia/
  grado/grupo desde el modal ya existente.
- **Tarjeta nueva "⚠️ Cruces entre docentes"** (siempre visible, se recalcula en vivo, NO
  depende de haber generado nada): función `choquesGlobales()` compara TODOS los pares de
  docentes (su horario vigente = borrador si tiene, si no lo publicado — mismo criterio
  que ya usaba `cargarDocente()`) y reporta si dos docentes distintos quedaron con clase
  al mismo grado-grupo a la misma hora — con un botón "✏️" por cada uno de los dos para
  saltar directo a arreglarlo. Por construcción, la generación automática NUNCA debería
  dejar ninguno (ya se probó así en la sesión 29), así que esta tarjeta sirve sobre todo
  para detectar cruces introducidos por ediciones manuales posteriores. Se refresca sola
  después de publicar, descartar un borrador, o editar/quitar una celda a mano.
- **Nuevo modelo de horas** (`bloques()` en `21-horarios-coordinacion.html` Y en
  `07-horario.html`, duplicado a propósito en los dos como ya es la convención del
  proyecto): antes 7 bloques de 50 minutos seguidos; ahora 7 horas de 60 minutos, con un
  descanso de 20 minutos después de la 4ª hora (bloques 0-3 seguidos, descanso, bloques
  4-6 seguidos). Lunes sigue empezando a las 8:00 y el resto de días a las 7:00 (eso no
  cambió). Se agregó una **fila visual de descanso** en la grilla (en ambos módulos,
  coordinación y "Mi Horario" del docente) — no es un bloque real, no es clickable, solo
  muestra el rango de hora del descanso para que quede claro en la vista y al imprimir.
  Verificado con Node que los horarios calculados son correctos (ej. lunes:
  08:00–09:00, 09:00–10:00, 10:00–11:00, 11:00–12:00, descanso, 12:20–13:20, 13:20–14:20,
  14:20–15:20).
- **Verificado con Node** el nuevo `choquesGlobales()` contra un escenario sintético (3
  docentes, 1 choque real esperado entre 2 de ellos por compartir grado-grupo a la misma
  hora, 1 docente sin relación) — detectó exactamente ese choque, sin falsos positivos ni
  negativos.
- SW **v98**. `node --check` limpio en los 3 bloques `<script>` de
  `21-horarios-coordinacion.html` y los 3 de `07-horario.html`; balance de
  `div/table/tr/td/th/label/select/button/details/summary` verificado (36/36, 1/1, 2/2,
  4/4, 4/4, 6/6, 4/4, 13/13, 3/3, 3/3).
- **PENDIENTE:** push; que Richard recargue "Horarios (Coordinación)" y confirme que (a)
  el reporte de la última generación sigue visible tal como lo dejó; (b) la tarjeta de
  cruces aparece y, si no hay ninguno, dice "sin cruces"; (c) la grilla de cada docente
  (y "Mi Horario" para una cuenta docente) ahora muestra las horas de 60 minutos con el
  descanso de 20 minutos marcado después de la 4ª hora.

## ▶ AJUSTE (jul 25, 2026 — sesión 29): motor de generación automática de horarios — CÓDIGO LISTO, sin desplegar

- **Punto 3 del pedido original de Richard (sesión 27), el último que quedaba pendiente:**
  "A partir de la asignación puedes crear automáticamente los horarios… que los
  coordinadores solo modifiquen esa asignación y los horarios se puedan crear de manera
  automática, sin cruces ni errores." Antes de construir se resolvió un problema real de
  fondo: el Excel de bachillerato NO trae el número de grupo exacto (solo un CONTEO, ej.
  "2 grupos de 9°" en la columna "Nº G") — no existe en ningún lugar del proyecto un
  catálogo de "qué grupos tiene cada grado" (`lv_cursos` se crea suelto, materia por
  materia, cada vez que un docente entra a su planilla). Se le preguntó a Richard 4
  cosas de alcance (respondidas): (1) generar los números de grupo automáticamente 1..N
  por grado (N = el máximo "Nº de grupos" declarado por cualquier materia de ese grado),
  en vez de pedirle confirmación manual o intentar inferir de Matrícula; (2) generar el
  horario de TODO el colegio de una vez, con vista previa antes de guardar nada; (3) si
  no cabe todo sin cruces, generar lo mejor posible y marcar lo que falta (no bloquear
  todo por unas pocas horas sin cupo); (4) respetar lo que ya esté publicado o en
  borrador — el motor solo llena huecos vacíos, nunca reemplaza.
- **Verificación empírica ANTES de programar (no se asumió nada):** se confirmó contra el
  archivo Excel real que la columna "Nº H" (horas) es la carga curricular FIJA de esa
  materia en ese grado — el mismo valor sin importar cuántos docentes/grupos la dictan
  (ej. Matemáticas en 9° siempre vale 4 horas/semana, ya sea 1 o 2 grupos) — es decir,
  cada grupo que cubre un docente recibe esas horas completas, no una fracción repartida.
  También se confirmó que la carga total por grado (suma de materias únicas) da 34-36
  horas/semana, MUY cerca del límite real de 35 bloques disponibles (7×5) — esto explica
  y respalda la decisión de Richard de aceptar "mejor esfuerzo + marcar conflictos" en
  vez de exigir una solución perfecta.
- **Motor nuevo en `modulos/21-horarios-coordinacion.html`** (sin tabla ni migración SQL
  nueva — reutiliza `lv_asignaciones`/`lv_docentes`/`lv_horarios` y el mismo
  `lv_horarios_borrador` local que ya usaba el editor manual):
  · `construirUnidades(asignaciones)` — expande cada asignación en "unidades de clase"
    concretas (quién, qué materia, en qué grado-grupo, cuántas horas/semana). Bachillerato:
    reparte los números de grupo 1..N entre los docentes que dictan la MISMA materia en
    el MISMO grado (orden estable por `docenteId`); si la suma de "Nº de grupos"
    declarados excede el total detectado para ese grado, lo reporta como aviso en vez de
    fallar en silencio. Primaria: como grado+grupo+sede ya vienen exactos del import
    (sesión 27), no hay que inventar nada — el docente cubre TODA su semana con "Todas
    las materias" en ese grupo (si un docente tuviera más de un grado-grupo, se reparte
    parejo entre ellos).
  · `generarHorariosAuto(asignaciones, celdasPorDocente)` — greedy "más restringido
    primero" (las unidades con más horas/semana se colocan antes); dentro de cada unidad,
    prioriza repartir en días distintos antes de repetir uno. Nunca toca una celda que ya
    esté ocupada en `celdasPorDocente` (que es el borrador si existe, si no lo publicado
    — mismo criterio que ya usaba `cargarDocente()`), así que respeta lo decidido a mano
    por coordinación. Si una hora no cabe en ningún bloque libre sin chocar, queda
    reportada en `conflictos` en vez de forzarla.
  · **Tarjeta nueva "🤖 Generar horarios automáticamente"** arriba del selector de
    docente: botón "Generar automáticamente" corre el motor EN MEMORIA (no escribe nada
    todavía) y muestra una vista previa — horas ubicadas, docentes afectados, avisos de
    inconsistencia del Excel origen, y el detalle de qué horas no cupieron (por docente/
    materia/grado-grupo). Solo al tocar "💾 Guardar todo como borrador" se escribe —
    fusionando lo generado con lo que cada docente ya tenía (borrador o publicado), nunca
    sobrescribiendo — en `lv_horarios_borrador` para todos los docentes afectados a la
    vez. De ahí en adelante, cada docente se revisa y publica UNO POR UNO exactamente
    igual que hoy (mismo botón "✅ Publicar horario", misma detección de choques ya
    existente) — el generador automático no se salta ese candado de seguridad.
- **Verificado con Node contra los datos reales** (no datos sintéticos): se reconstruyeron
  los 45 docentes/284 asignaciones reales del Excel (mismo parser de la sesión 27) y se
  corrió el motor EXACTO tal como quedó en el archivo. Resultado: **0 choques de docente,
  0 choques de grupo** (con sede correctamente distinguida — se detectó y corrigió un
  falso positivo del PROPIO script de prueba, no del motor, que confundía dos grupos con
  el mismo número en sedes distintas), **1243 de 1260 horas de bachillerato ubicadas
  (98.6%)**, 17 horas sin poder ubicar (todas reportadas como conflicto, ninguna se perdió
  en silencio), y los 44 docentes de primaria terminaron con su semana completa (35
  celdas). Prueba aparte confirmó que si un docente ya tenía una celda publicada/borrador,
  el motor la respeta y solo llena las demás.
- SW **v97**. `node --check` limpio en los 3 bloques `<script>` de
  `21-horarios-coordinacion.html`; balance de
  `div/table/tr/td/th/label/select/button` verificado (32/32, 1/1, 2/2, 4/4, 4/4, 6/6,
  4/4, 9/9).
- **PENDIENTE:** push; que Richard entre a "Horarios (Coordinación)", importe/confirme
  que la Asignación Académica esté cargada, toque "🤖 Generar automáticamente", revise la
  vista previa (sobre todo la lista de horas sin ubicar) y luego "💾 Guardar todo como
  borrador"; después revisar y publicar unos pocos docentes de prueba (uno de primaria,
  uno de bachillerato) para confirmar que su horario se ve bien y sin choques. Con esto
  quedan resueltos los 3 puntos del pedido original de Richard (sesión 27): importar la
  asignación, la hoja de vida, y ahora la generación automática de horarios.

## ▶ AJUSTE (jul 25, 2026 — sesión 28): cierre del hueco de permisos del comodín (grado/grupo/sede) — CÓDIGO LISTO, sin desplegar

- **Continuación directa del hallazgo señalado en la sesión 27** (ver ajuste de abajo):
  Richard pidió explícitamente seguir con esto ("Ya importé. Funciona. Pero esta parte...
  debe quedar al 100%... Debemos seguir"), confirmado con una pregunta de alcance
  (multiSelect): sí cerrar el hueco de permisos, sí además diseñar los horarios
  automáticos, nada más pendiente en Asignaciones/Hoja de Vida.
- **Investigación previa (antes de tocar código):** el comodín ("Todas las materias"/área
  Primaria) se evalúa en DOS lugares separados, no uno — `LV_PERM.cursoEsMio()` en
  `auth.js` (usado por `01-calificaciones.html` y `11-inclusion.html`) y un `PERM`/
  `permiteMateria()` **duplicado e independiente** dentro de `index.html` (no puede usar
  LV_PERM porque ese bloque corre ANTES de que `<script src="auth.js">` cargue en el mismo
  archivo — mismo bug de orden de scripts ya documentado en sesiones anteriores). Los
  otros ~8 módulos que usan LV_PERM (10,12,13,14,17,18,20) lo usan para `gruposDirigidos`/
  `esAdmin`, sin relación con este comodín — no había que tocarlos.
- **`LV_PERM.cursoEsMio()` reescrito en `auth.js`:** antes, CUALQUIER asignación con
  `area==='Primaria'` o `materia==='Todas las materias'` daba acceso total sin mirar el
  curso. Ahora, función nueva `_comodinCubreCurso(asig, curso)` compara `grado` (siempre,
  vía `LV_CURSO.gradoCanon`), `grupo` (si ambos lo traen, vía `grupoCanon`) y `sede` (si
  ambos la traen, vía `sedeCode`) — el comodín solo cubre ESE grado-grupo-sede específico.
  **Retrocompatibilidad explícita:** una asignación vieja SIN campo `grado` (de antes de
  esta sesión, aún no reimportada) sigue dando acceso total — no hay con qué acotar lo que
  el registro no trae; se corrige sola al reimportar/editar esa asignación.
- **Bug real encontrado y corregido DURANTE las pruebas (no habría funcionado si no se
  prueba):** el atajo de "materia igual → acceso" (`curso.materia === asig.materia`)
  calzaba trivialmente cuando AMBOS valían literalmente `'Todas las materias'` — el
  comodín se colaba por igualdad de texto, saltándose por completo el acotado nuevo de
  grado/grupo/sede. Corregido excluyendo `'Todas las materias'` de ese atajo, forzando
  que ese valor SIEMPRE pase por `_comodinCubreCurso`.
- **El mismo fix, aplicado a mano en `index.html`** (no puede llamar a `LV_PERM`, ver
  arriba): `PERM` ahora también guarda `misAsig` (las asignaciones propias del docente).
  `permiteMateria(materia, registro)` gana un 2º parámetro OPCIONAL — el registro completo
  (curso/examen/planeador, con `.grado`/`.grupo`/`.sede` si los trae) — y aplica la misma
  lógica de `_comodinCubreCurso` inline. **Si no se pasa el 2º parámetro, o `LV_CURSO`
  todavía no cargó, cae al comportamiento anterior (acceso total)** — es un fallback de
  compatibilidad, no un hueco nuevo: se actualizaron los 8 sitios donde `index.html` llama
  a `permiteMateria` (buscador de cursos, lista de exámenes 03/04, planeadores, buscador
  global de estudiantes, cumpleaños) para que TODOS pasen el registro completo como 2º
  argumento — ninguno quedó usando la forma vieja de 1 argumento.
- **Verificado con Node contra la lógica real** (no solo `node --check`): harness en
  `/tmp` que carga el `LV_CURSO` real de `auth.js` y ejecuta 8 escenarios contra
  `cursoEsMio()` (admin bypass, comodín viejo sin grado = acceso total, comodín nuevo
  preciso permite su grado/grupo/sede y NIEGA grado/grupo/sede distintos, materia exacta
  de bachillerato sin cambios, director de grupo sin cambios) — los 8 pasaron. Luego,
  harness separado para el `permiteMateria` de `index.html` (extraído tal cual del
  archivo real) con 15 aserciones (mismos escenarios + comportamiento con/sin 2º
  argumento + múltiples comodines) — las 15 pasaron. Esto atrapó el bug de "Todas las
  materias por igualdad de texto" antes de darlo por bueno.
- SW **v96**. `node --check` limpio en `auth.js`, `sw.js` y los 6 bloques `<script>`
  inline de `index.html`.
- **PENDIENTE:** push; que Richard confirme con una cuenta docente de primaria real (con
  asignación ya reimportada, o sea con `grado` presente) que ya SOLO ve su grado-grupo-
  sede específico en el buscador de estudiantes, Áreas académicas, exámenes y planeadores
  — y que un director de grupo y un docente de bachillerato normal siguen viendo
  exactamente lo mismo que antes (esto es un cierre de hueco, no debería cambiar nada para
  quien no tenga el comodín). Con esto, el punto 2 de la sesión 27 (cerrar el hueco de
  permisos) queda hecho. **Sigue pendiente el punto 3 original del pedido de Richard:**
  el motor de generación automática de horarios a partir de la asignación importada — es
  un problema de programación con restricciones (sin cruces de docente/grupo, horas
  exactas por semana, cabe en la grilla de 7 bloques × 5 días del módulo 21) y es la
  siguiente pieza de trabajo, en sesión propia.

## ▶ AJUSTE (jul 25, 2026 — sesión 27): Importador de Asignación Académica (Excel) + Hoja de Vida — CÓDIGO LISTO, sin desplegar

- **Pedido de Richard, 3 puntos:** (1) tomar el Excel oficial "V2_1. FORMATO ASIGNACION
  ACADEMICA_2026" (dos hojas: bachillerato y primaria) y reemplazar TODO lo que hay hoy
  en Asignaciones; (2) construir algo con esos datos para una "hoja de vida" del docente;
  (3) generar los horarios automáticamente a partir de la asignación. Antes de construir
  se le hicieron 3 preguntas de alcance (respondidas): hacer las 3 fases aunque tome
  varias sesiones; reemplazar el comodín "Todas las materias" de primaria por la
  asignación PRECISA grado+grupo+sede que trae el Excel; la hoja de vida vive en una
  pestaña nueva dentro de Coordinación (no un módulo aparte), por ser dato sensible
  (cédula) igual que Matrícula.
- **Estructura real del Excel (verificada leyendo el archivo, no asumida):** hoja
  "PROYECCION DE ASIG BACHILLERATO" (23 docentes, 6°-11°) — cada docente ocupa VARIAS
  filas (una por materia que dicta), y cada materia trae, por cada grado, un par
  Horas/Nº de grupos (NO un número de grupo específico — el Excel dice "este docente
  dicta Matemáticas a 2 grupos de 9°", pero no dice si son 9-1 y 9-2 o cuáles). Hoja
  "ASIG PRIMARIA" (22 docentes, Preescolar-5°) — una fila por docente, "INTEGRADA" (dicta
  todo), con GRUPO + Nº estudiantes por cada grado que cubre, más SEDE y JORNADA exactas.
- **Import 100% en el cliente (nada de servidor nuevo):** nuevo importador dentro de `coordinacion.html` →
  pestaña Asignaciones → tarjeta "📥 Importar Asignación Académica (Excel)". Usa
  `lib/xlsx.full.min.js` (ya estaba en el proyecto, mismo patrón que el importador de
  notas de 01-calificaciones). Parsea AMBAS hojas con funciones nuevas
  `impParseBachillerato()`/`impParsePrimaria()`, empareja cada docente del Excel contra
  `docentes` existentes por NOMBRE normalizado (sin tildes/mayúsculas) — si no hay
  coincidencia exacta, se crea un docente nuevo (nunca fusiona por "parecido", para no
  mezclar dos personas distintas por error). **Verificado con Node contra el archivo real**
  (harness en `/tmp`, no se subió al repo): 23+22=45 docentes, 196 asignaciones de
  bachillerato + 88 de primaria = 284 en total, **0 materias sin reconocer** (la tabla de
  equivalencias cubre el 100% de lo que trae el archivo real).
- **Tabla de equivalencias Excel→catálogo de la app** (`IMP_MATERIA_MAP`, normaliza tildes/
  mayúsculas/puntuación antes de comparar): cubre variantes y errores de tipeo reales del
  archivo ("Ciencias  Sociales" con doble espacio, "Lengua castellna" con la "a" que
  falta, "Matematicas" sin tilde, etc.). Decisiones de mapeo no triviales: **"Democracia"
  → "Competencias Ciudadanas"** (mismo concepto, nombre distinto); **"Edu. Artistica" +
  "Emprendimiento" (filas separadas en el Excel) se FUSIONAN** en la única materia
  combinada que ya tiene la app ("Artística y Emprendimiento") — se SUMAN las horas de
  ambas filas y se toma el MÁXIMO de "número de grupos" (no se suma, para no duplicar el
  conteo de secciones).
- **Grado "Preescolar" genérico (limitación real del archivo, no una decisión mía):** el
  Excel de primaria NO distingue Prejardín/Jardín/Transición — trae una sola columna
  "PREESCOLAR". Se importa tal cual como grado **"Preescolar"**, que NO coincide con
  ninguno de los 3 grados oficiales de `GRADOS` en la app. Si Richard sabe qué nivel
  específico cubre cada docente, toca ajustarlo a mano después en Asignaciones —
  documentado en la propia página (comentario en el código) para que quede claro por qué.
- **Bachillerato: el campo "grupo" de la asignación queda VACÍO a propósito.** El Excel
  da un CONTEO de grupos por materia-grado, no el número específico (9-1 vs 9-2). Inventar
  esa asignación específica sería adivinar. La decisión (documentada aquí, no se le
  preguntó a Richard porque se resuelve sola): el número de grupo específico se termina
  de decidir cuando coordinación arma el horario real en el módulo 21
  (`21-horarios-coordinacion.html`, sesión 26k) — ahí sí se elige, celda por celda, a qué
  grado-grupo-aula concreto va cada clase. Dos campos nuevos en cada asignación para
  soportar esto: `horas` (número) y `numGrupos` (número) — sin migración SQL, JSONB.
- **Primaria: SÍ trae grupo+sede exactos** (columna "GRUPO" + "SEDE" del Excel) → cada
  asignación de primaria queda con `area:'Primaria', materia:'Todas las materias',
  grado, grupo, sede` precisos, reemplazando lo que antes era un comodín sin acotar.
- **⚠️ HALLAZGO IMPORTANTE — RESUELTO en la sesión 28 (ver ajuste más abajo):** Richard
  aprobó "reemplazar el comodín por asignación precisa", pero investigando se encontró que
  el comodín vivía en DOS sitios distintos: (1) el RLS de Supabase (`lv_acceso_total()`),
  YA corregido desde la sesión 24 (exige coordinación, ya no comodín); (2) `LV_PERM.
  cursoEsMio()` en `auth.js` + el `PERM`/`permiteMateria()` duplicado de `index.html`, que
  trataban CUALQUIER asignación con `area==='Primaria'` o `materia==='Todas las materias'`
  como acceso total SIN mirar grado/grupo/sede. Quedó señalado aquí mismo para no mezclarlo
  con el import — cerrado justo después, en la sesión 28.
- **Nueva pestaña "🪪 Hoja de Vida" en Coordinación:** lista todos los docentes con
  cédula/título profesional/área de desempeño (se llenan solos con el import; también
  editables a mano, botón ✏️ por fila). Campos nuevos en `lv_docentes` (sin migración
  SQL): `cedula`, `tituloProfesional`, `areaDesempeno`. Solo visible para coordinación/
  rector (mismo nivel de acceso que el resto de `coordinacion.html`).
- **Vista previa obligatoria antes de aplicar (destructivo):** el importador NUNCA borra
  nada hasta que Richard vea la vista previa completa (cuántas asignaciones actuales se
  reemplazan, cuántos docentes nuevos se crean, cuántos se actualizan, y una lista de
  docentes YA registrados que no aparecen en el Excel y quedarán sin ninguna asignación —
  para detectar fallos de emparejamiento por nombre) y toque "✅ Reemplazar todo y
  aplicar" + un `confirm()` explícito. El borrado real usa el mismo patrón ya establecido
  en el proyecto (`LV_SYNC.marcarCambio(..., {_eliminado:true})` por cada registro viejo
  antes de sobrescribir el arreglo local).
- SW **v95**. `node --check` limpio en los 2 bloques `<script>` de `coordinacion.html`;
  balance de `div/section/table/tr/td/th/label/select/button` verificado. Lógica de
  parseo probada con Node + la librería real `xlsx.full.min.js` contra el archivo real
  del colegio (no una prueba sintética) antes de darla por buena.
- **PENDIENTE:** push; correr el import de verdad desde Coordinación → Asignaciones con
  el archivo real y revisar la vista previa con cuidado antes de confirmar (sobre todo la
  lista de "docentes sin asignación después" — sirve para detectar nombres que no
  calzaron). Después, en orden: (a) decidir si se cierra el hueco de `LV_PERM.
  accesoTotal()` señalado arriba (cambio de mayor riesgo, sesión propia); (b) el punto 3
  del pedido original — generación automática de horarios a partir de esta asignación —
  es un motor de programación con restricciones (sin cruces de docente/grupo, horas
  exactas por semana, cabe en la grilla de 7 bloques × 5 días del módulo 21) y queda
  como su propia fase futura, tal como ya se había decidido en la sesión 26k al construir
  el editor manual de horarios.

## ▶ AJUSTE (jul 25, 2026 — sesión 26l): recordatorio por correo de Eventos — CÓDIGO LISTO, requiere pasos manuales de Richard

- **Punto 10 del backlog crudo (segunda mitad):** "2 días antes de un evento, enviar un
  correo recordatorio a los correos registrados de cada docente." El proyecto no tenía
  NINGUNA infraestructura de correo — se le señaló esto a Richard antes de construir
  (mismo patrón del proyecto de no elegir proveedores externos en silencio) y se le
  preguntó con qué servicio avanzar. **Decisión de Richard: Resend.**
- **`api/recordatorio-eventos.js` NUEVO** (función serverless de Vercel, sin dependencias
  npm — como `api/generar.js`, todo con `fetch()` directo, el proyecto no tiene
  `package.json`). Se ejecuta una vez al día vía **cron de Vercel** (nuevo bloque `crons`
  en `vercel.json`, `"0 12 * * *"` = 7am hora Bogotá, UTC-5). Reutiliza el MISMO campo
  `rec` (1/2/3 días antes) y `portal` que ya usa el aviso emergente del portal en
  `index.html` — mismo criterio de "cuándo avisar" y misma audiencia (TODOS los docentes
  con correo registrado, sin filtrar por materia/área, igual que ese popup). Por cada
  evento cuyo aviso cae exactamente hoy, agrupa por docente (un solo correo con todos los
  eventos del día, no uno por evento) y llama a la API REST de Resend
  (`POST https://api.resend.com/emails`) con `fetch()`. Marca cada evento avisado con un
  campo nuevo `recordatorioEnviadoFecha` (sin migración SQL, es JSONB) para no reenviar si
  el cron corre dos veces el mismo día.
  **Usa una clave nueva y más sensible: `SUPABASE_SERVICE_ROLE`** (no la `anon` que usa el
  resto de la app) porque un cron no tiene sesión de ningún docente y necesita saltarse
  RLS para leer `lv_eventos`/`lv_docentes` y escribir de vuelta — NUNCA debe usarse en el
  cliente, solo vive como variable de entorno en Vercel.
- **`vercel.json`** ganó el bloque `"crons"` apuntando a `/api/recordatorio-eventos`.
  No se tocó `sw.js` (los archivos de `api/` son del servidor, no se cachean ni se
  precargan — no hace falta subir versión del Service Worker por este cambio).
  `node --check` limpio en el archivo nuevo; `vercel.json` validado como JSON.
- **ESTO NO FUNCIONA SOLO CON EL PUSH — a diferencia de todo lo demás en esta sesión,
  Richard tiene que completar 3 pasos por fuera del código antes de que salga un solo
  correo real:**
  1. **Crear cuenta en [resend.com](https://resend.com)** (tiene plan gratis, 100
     correos/día / 3.000 al mes — de sobra para ~50 docentes).
  2. **Verificar un dominio propio en resend.com/domains** (agregar los registros DNS que
     Resend indique, ej. en el dominio del correo institucional). **Mientras no haya un
     dominio verificado, Resend SOLO deja enviar a la propia cuenta dueña de la clave —
     a NINGÚN docente más.** Si Richard no tiene un dominio propio a mano todavía, puede
     probar el flujo primero enviándose correos a sí mismo con el remitente de prueba
     `onboarding@resend.dev` (ya es el valor por defecto si no se configura `RESEND_FROM`),
     pero para que le llegue a los docentes reales el dominio verificado es obligatorio.
  3. **Agregar 3 variables de entorno en Vercel** (Project Settings → Environment
     Variables del proyecto `sistema-loma-verde`):
     - `RESEND_API_KEY` — la API key que genera Resend (cuenta institucional, UNA sola
       clave para todo el colegio — a diferencia de Gemini, que es por docente).
     - `RESEND_FROM` — remitente verificado, ej. `SABIE <recordatorios@tudominio.com>`
       (el dominio debe coincidir con el verificado en el paso 2).
     - `SUPABASE_SERVICE_ROLE` — la clave "service_role" del proyecto de Supabase
       (Supabase → Project Settings → API → "service_role secret", NO la "anon" que ya
       usa el resto de la app).
     Opcional pero recomendado: `CRON_SECRET` (cualquier texto secreto que Richard
     invente) — si se define, Vercel la manda sola en cada llamada del cron y el archivo
     la exige, así nadie más puede disparar el envío llamando la URL a mano.
- **DESPLEGADO Y PROBADO (jul 25, 2026, misma sesión):** Richard completó los 3 pasos
  manuales (cuenta Resend, dominio `sanjosedelomaverde.com` verificado — lo compró en
  Vercel, así que Resend lo auto-configuró con un click via "Auto configure" en vez de
  copiar registros DNS a mano — y las 4 variables de entorno en Vercel). Se encontró y
  corrigió un bug real antes de que quedara funcionando: el archivo consultaba la tabla
  `lv_eventos`, pero en Supabase esa tabla en realidad se llama **`eventos`** (sin el
  prefijo `lv_`) — es una excepción del proyecto (junto con `notas` y `asistencia`, ver
  `MAPA` en `sync.js` línea ~41-45) donde la clave de localStorage sí lleva el prefijo
  pero la tabla real en la nube no. Corregido en `api/recordatorio-eventos.js` (commit
  `58d8aab`). Probado con `curl` directo al endpoint
  (`GET /api/recordatorio-eventos` con el header `Authorization: Bearer <CRON_SECRET>`):
  responde `{"ok":true,"enviados":0,"mensaje":"Sin eventos que avisar hoy."}` — confirma
  que lee Supabase correctamente con `SUPABASE_SERVICE_ROLE`, sin errores. Aún NO se ha
  probado el envío real de un correo (no hay ningún evento hoy cuyo aviso caiga
  justo hoy) — para esa prueba final falta crear un evento de prueba en el módulo 08 con
  fecha de mañana y "1 día antes", y volver a llamar al endpoint (o esperar al cron de
  las 7am).
- **PENDIENTE:** probar el envío real de un correo con un evento de prueba (ver arriba).
  Con el plan gratis de Vercel (Hobby), el cron corre UNA vez al día con hasta ±59 min de
  margen — no es instantáneo ni exacto a la hora programada, pero alcanza de sobra para un
  aviso "2 días antes". Queda pendiente para otra sesión: el correo de "permiso aprobado"
  (punto 16, segunda mitad) puede reusar esta misma infraestructura de Resend ya
  configurada y verificada.

## ▶ BACKLOG CRUDO (jul 25, 2026 — sesión 26, feedback de Richard tras probar todo)

Richard probó el trabajo de las sesiones 25a-25g y dejó una lista larga de observaciones y
pedidos nuevos, todos en un solo mensaje. SIN TRIAGE TODAVÍA — se transcribe tal cual para
no perderla, y se irá marcando/resolviendo por partes en sesiones siguientes (no se abordó
todo de una, ver el triage y las preguntas que se le hicieron a Richard justo después de
este bloque, o en la sesión donde se retome cada punto).

1. **Saber 11 (módulo 04):** no debería requerir entrar por una materia — debe ser
   accesible directo para todos los docentes/coordinación/rector, sin selector de
   asignatura al entrar.
2. **Saber 11 (módulo 04) — recorte:** la pestaña crear/editar no cumple función
   importante; el módulo debería concentrarse en análisis exhaustivo de simulacros y cómo
   abordar estudiantes sin avance. El banco de preguntas ahí tampoco sirve. Los exámenes de
   11° deberían estar en el módulo de exámenes 6-11 (el 03), igual que "Presentar
   simulacro".
3. **Banco de imágenes (Planeador):** organizar por grado, curso, periodo, eje temático y
   temática. Duda abierta: ¿guardar en un Drive personal de cada docente en vez de
   Supabase, para no llenar el almacenamiento? Richard piensa en upgrade de Supabase o
   Vercel pero no sabe cuál ni si lo del Drive personal es viable — pide sugerencia.
4. **Botón "📔 Observar" (planilla, 01-calificaciones):** visualmente no gusta y la
   posición tampoco. Pide sugerencias reales de dónde/cómo ponerlo.
5. **Botón "Mejoramiento" (pestaña Reportes) y botón "🚨 Alertar" (planilla):** deberían
   llevar al módulo de Comunicados y AL PARECER NO ESTÁ FUNCIONANDO. Alertar además no
   gusta visualmente ni en su posición.
6. **Banco de preguntas duplicado:** existe una opción en el Planeador (02) y otra en
   Evaluaciones (03). Richard cree que debería quedar solo en Evaluaciones. Pide
   sugerencia.
7. **Pestaña "Resultados" (Evaluaciones, 03):** hoy solo muestra resultados de exámenes.
   ¿Se le puede dar alguna sincronización o función más importante?
8. **Asistencia:** revisar que la alerta de +25% de inasistencias SÍ esté generando el
   aviso hacia Comunicados (sospecha de que no está funcionando).
9. **Horarios (07) — función GRANDE nueva:** desde Coordinación/admin poder crear los
   horarios de TODOS los docentes (todas las áreas/materias/docentes/grados/grupos),
   idealmente con una vista previa antes de generar/publicar (¿con ayuda de IA?). Una vez
   publicado, cada docente ve SU horario ya cargado (no lo arma él); coordinación/rector
   puede ver el horario de todos.
10. **Eventos (08):** cualquier docente ve/agrega, pero solo coordinación/rector
    edita/elimina (revisar si ya es así). Pedido nuevo: 2 días antes de un evento,
    enviar un correo recordatorio a los correos registrados de cada docente.
11. **Acudientes (09) vs Matrícula (20):** Richard cree que 09 no debería existir como
    módulo aparte — al matricular a un estudiante (grado/curso/sede) ya debería quedar
    con su(s) acudiente(s), alimentando esa base de datos ahí mismo. Solo coordinación/
    rector deberían tener acceso (hoy 09 está abierto a cualquier docente).
12. **Observador → Boletines:** las anotaciones del observador deberían aparecer en el
    boletín del estudiante.
13. **Boletines (13) — dos plantillas:** bachillerato y primaria como hoy, pero
    prejardín/jardín/transición debe ser MÁS DESCRIPTIVO — toda la info del estudiante e
    institucional, más un espacio grande para que el docente describa comportamiento y
    evolución, quizás con opciones estandarizadas (positivas/negativas) para agilizar,
    pensado para niños de esas edades.
14. **Director de grupo (12):** no le gusta cómo se muestra la información hoy. Pide que
    se vea más organizado y amable visualmente, y que incluya alertas, planes de
    mejoramiento y anotaciones del observador juntos.
15. **Analítica (14):** ¿no cumple ninguna función? Pregunta si se podría suprimir.
16. **Permisos (18):** al aprobar una solicitud, debería llegarle al docente una
    notificación en su panel general Y un correo. Además: el rol RECTOR (admin) no
    debería ver la pestaña "Solicitar" — esa pestaña es solo para coordinador y docente
    (el rector solo aprueba).
> qué decisiones se han tomado y qué falta. Actualízalo cuando hagas cambios importantes.

## ▶ AJUSTE (jul 25, 2026 — sesión 26k): Horarios armados por Coordinación (módulo nuevo)

- **Punto 9 del backlog crudo — la función "grande" del backlog:** "desde Coordinación/
  admin poder crear los horarios de TODOS los docentes... con una vista previa antes de
  generar/publicar. Una vez publicado, cada docente ve SU horario ya cargado (no lo arma
  él); coordinación/rector puede ver el horario de todos." Antes de construir, se le
  señaló a Richard un problema real de fondo: `lv_horario` (la tabla vieja) guardaba el
  horario por **materia**, no por docente — dos profes de la misma materia podían
  pisarse el horario en la nube sin darse cuenta (bug ya documentado desde sesión 13).
  Se le preguntó a Richard 3 cosas de alcance (respondidas): (1) el docente deja de poder
  editar su horario — solo lo VE, coordinación lo arma todo; (2) coordinación arma el
  horario **por docente** (elige un profe, llena su semana), no por grado-grupo; (3) la
  generación automática con IA queda **pendiente para otra sesión** — hoy solo editor
  manual + vista previa con detección de choques.
- **Tabla nueva `lv_horarios`** (`migracion_horarios.sql`, SIN CORRER; RLS
  `solo_autenticados`, mismo nivel que la mayoría de tablas del proyecto): un registro
  por DOCENTE = `{id: docenteId, docenteId, docenteNombre, celdas:{dia:{bloque:
  {materia,grado,grupo,aula}}}, publicadoPor, publicadoEn}`. La tabla vieja `lv_horario`
  (por materia) **no se borra ni se toca** — queda como histórico sin uso.
- **Módulo nuevo `modulos/21-horarios-coordinacion.html`** (gate `ES_COORD`, mismo patrón
  que Matrícula): selector de docente → grilla semanal (7 bloques × 5 días, mismo diseño
  visual que tenía el 07 viejo) → clic en una celda abre modal con Área→Materia (catálogo
  `AREAS` completo de 9 áreas, copiado de `coordinacion.html`, no solo Sociales) + Grado +
  Grupo + Aula/nota. **Los cambios NO se sincronizan de inmediato** — se guardan como
  "borrador" SOLO en este equipo (`localStorage.lv_horarios_borrador`, clave a propósito
  fuera de `LV_SYNC_TABLAS`, nunca viaja a Supabase) hasta que coordinación toca
  **"✅ Publicar horario"**, que recién ahí escribe el registro real en `lv_horarios` y
  lo sube — ese es el mecanismo de "vista previa antes de publicar" que pedía Richard.
  **Detección de choques** (`detectarChoques()`): compara las celdas en edición contra
  los horarios YA PUBLICADOS de todos los OTROS docentes — si el mismo grado-grupo tiene
  clase con otro profe a la misma hora, la celda se marca en rojo y aparece el detalle
  ("Miércoles bloque 3: 9-3 ya tiene clase con Fulanita"); publicar con choques pendientes
  pide confirmación extra. Tarjeta inferior "👥 Todos los docentes" con badge de estado
  (🟢 Publicado / 🟡 Borrador sin publicar / gris Sin horario) y acceso directo a editar
  cualquiera — así resuelve también "coordinación/rector puede ver el horario de todos".
- **`modulos/07-horario.html` REESCRITO por completo — CAMBIO DE COMPORTAMIENTO real:**
  antes cualquier docente armaba y editaba su propio horario libremente (por materia,
  clic en celda → asignar). Ahora es de **SOLO LECTURA**: lee `lv_horarios` buscando el
  registro cuyo `id` es el `docenteId` de la sesión y solo lo muestra (grilla + stats de
  horas por materia); si coordinación aún no le ha publicado nada, ve un mensaje claro en
  vez de una grilla vacía editable. Ya no carga `materia-context.js` (no lo necesita: es
  UN horario por docente, no por materia). **Richard debe saber esto antes de desplegar:**
  cualquier horario que un docente ya se había armado a mano con el sistema viejo (tabla
  `lv_horario`) queda invisible hasta que coordinación lo reconstruya en el módulo nuevo
  — no hay migración automática de esos datos (mezclar los buckets por-materia de cada
  docente en un solo horario por-docente de forma automática no es confiable: un mismo
  bucket de materia podía tener celdas de varios profes distintos).
- **Enlaces:** `index.html` → el link plano "Horario" de la sidebar (todos los docentes)
  ahora excluido del modal de materia (`navToModule`, igual que 04) porque ya no es "por
  materia"; nuevo link "🗓️ Horarios (Coordinación)" (`#nav-horarios`, oculto salvo
  `login.esAdmin`, junto a Matrícula/Coordinación). `materia-hub.html` → "Mi Horario" se
  movió de `MODULOS` (por materia) a `MODULOS_INST` (institucionales).
  SW **v94** (+ el módulo nuevo en el precache). `node --check`-equivalente (6+2+3+3
  bloques `<script>`) limpio en `index.html`, `materia-hub.html`, `07-horario.html` y
  `21-horarios-coordinacion.html`; balance de `<div>/<table>/<tr>/<td>/<th>/<label>/
  <select>` verificado en los dos módulos nuevos/reescritos; `node --check` limpio en
  `sync.js`.
- **PENDIENTE:** correr `migracion_horarios.sql` en Supabase; push; que Richard entre
  como coordinación/rector a "Horarios (Coordinación)", arme el horario de un docente de
  prueba, confirme que la vista previa marca un choque si le pone el mismo grado-grupo
  que ya tiene otro docente publicado, publique, y que ESE docente (con su propia cuenta)
  vea su horario ya cargado y de solo lectura en "Mi Horario". **Generación automática
  con IA queda pendiente**, a propósito, para una sesión aparte (Richard lo pidió como
  posible mejora futura, no para hoy).

## ▶ AJUSTE (jul 25, 2026 — sesión 26j): Boletín descriptivo para preescolar

- **Punto 13 del backlog crudo:** "Boletines — dos plantillas: bachillerato y primaria
  como hoy, pero prejardín/jardín/transición debe ser MÁS DESCRIPTIVO — toda la info del
  estudiante e institucional, más un espacio grande para que el docente describa
  comportamiento y evolución, quizás con opciones estandarizadas (positivas/negativas)."
  **Hallazgo antes de construir:** revisando el código, NO existían dos plantillas — había
  UNA sola tabla de notas para todos los grados. Se le señaló esto a Richard antes de
  construir, junto con dos preguntas de alcance (respondidas): (1) Prejardín/Jardín/
  Transición NO se califican con notas numéricas — el boletín de esos grados debe ser
  puramente descriptivo, sin la tabla 1.0–5.0; (2) el espacio de descripción usa las
  **dimensiones del desarrollo del MEN** (cognitiva, comunicativa, corporal, socio-
  afectiva, estética), cada una con frases rápidas positivas/negativas para marcar + un
  comentario corto libre.
- **Tabla nueva `lv_preescolar`** (`migracion_preescolar.sql`, SIN CORRER; RLS
  `solo_autenticados`, mismo nivel que `lv_calificaciones`/`lv_observador`): `{id, estId,
  periodo, dims:{cognitiva:{opciones:[...],texto:''}, comunicativa:{...}, ...}, creado,
  actualizado}`. Deliberadamente NO se guardó dentro de `lv_calificaciones` — son motores
  de valoración distintos (numérico vs. descriptivo) y mezclarlos habría arriesgado el
  cálculo de `defin()`/`calcDefinitiva()` que usa medio sistema. Agregada a `LV_SYNC_TABLAS`
  de `13-boletines.html` y al `MAPA` de `sync.js`.
- **`esPreescolar(grado)` nueva** en `13-boletines.html` (usa `LV_CURSO.gradoCanon`, que ya
  convierte "Transición (0°)" → `'0'`): distingue Prejardín/Jardín/Transición del resto.
- **Tarjeta nueva "📝 Valoración descriptiva (preescolar)"** en la pantalla de Generar
  boletines: SOLO aparece cuando el grupo seleccionado es de preescolar. Por estudiante
  (en un `<details>` plegable), las 5 dimensiones del MEN con frases-chip verdes
  (positivas) y rojas (negativas) que se marcan con un clic + una casilla de comentario
  corto; botón "Guardar" por estudiante que escribe en `lv_preescolar` (clave
  estId+periodo).
- **`construirBoletines()`/`htmlBoletin()` bifurcan por `esPreescolar(grupo.grado)`:** si
  es preescolar, arman un objeto liviano (sin `filas`/`prom`/`observacion` de notas) con
  `dims` + las anotaciones del observador del año (mismo bloque que ya se agregó en la
  sesión 26f) y lo imprimen con `htmlBoletinPreescolar()` — nueva plantilla con encabezado
  "INFORME DESCRIPTIVO DEL DESARROLLO", una tabla por dimensión con las frases marcadas +
  el comentario libre, sin ninguna tabla de valoración numérica. `renderLista()` también
  se ajustó para no mostrar el aviso de "sin notas" ni "promedio" en boletines de
  preescolar (ninguno de los dos aplica ahí).
  SW **v93**. `node --check`-equivalente (3 bloques `<script>`) limpio; balance de
  `<div>/<table>/<tr>/<td>/<th>/<label>/<select>/<details>/<summary>` verificado en
  `modulos/13-boletines.html`; `node --check` limpio en `sync.js`.
- **PENDIENTE:** correr `migracion_preescolar.sql` en Supabase; push; que Richard entre
  como director de un grupo de Prejardín/Jardín/Transición, marque algunas frases de
  ejemplo en un par de dimensiones, guarde, y confirme que el boletín impreso se ve bien
  (sin tabla de notas, con las frases y el comentario). Los grupos de 1°-11° deben seguir
  viéndose exactamente igual que antes (no se tocó su plantilla).

## ▶ AJUSTE (jul 25, 2026 — sesión 26i): Preparación Saber 11 (04) sin selector de materia

- **Punto 1 del backlog crudo:** "Saber 11 (módulo 04) no debería requerir entrar por
  una materia — debe ser accesible directo para todos los docentes/coordinación/rector,
  sin selector de asignatura al entrar." Diagnóstico: el módulo NUNCA fue realmente
  "por materia" en el fondo — su matriz de competencias (`MATRIZ11`) está fija para
  Ciencias Sociales/Saber 11, `asignatura` siempre vale 'Ciencias Sociales' por defecto
  en todo el archivo. El selector de materia que aparecía al entrar era solo el modal
  genérico del portal (`navToModule`, backlog sesión 16), no algo que el propio módulo
  necesitara.
- **Corregido en dos lugares:** (1) `index.html` → `navToModule()` ahora EXCLUYE
  `04-examenes-11.html` de la lista de módulos que interceptan el clic con el modal
  "¿A qué materia deseas entrar?" (mismo patrón que ya tenían excluidos 16 y 17). El
  clic en la sidebar ahora abre el 04 directo, sin `?materia=` en la URL. (2)
  `materia-hub.html` → la tarjeta "Preparación Saber 11" se movió del arreglo `MODULOS`
  (los "de la materia", que Áreas académicas filtra por asignación) al arreglo
  `MODULOS_INST` (institucionales, visibles siempre) — así también aparece igual sin
  importar por qué materia entraste al hub.
- **No hizo falta tocar `04-examenes-11.html`:** `LV_CTX.filtrar()` (en
  `materia-context.js`) ya estaba escrito para no filtrar nada cuando no hay contexto de
  materia (`if (!materia) return lista;`) — así que abrir el módulo sin `?materia=` ya
  mostraba todo el historial de simulacros sin cambios de código. El header también sigue
  bien: `materia-context.js` (sesión 9) ya pinta un "← Atrás" genérico con
  `history.back()` cuando no hay contexto de materia.
- **Alcance de HOY, a propósito:** esto es solo el punto 1 (acceso directo). El punto 2
  (recorte: quitar "Crear/Editar" y "Presentar simulacro" del 04 porque ya existen en
  Evaluaciones de aula) se dejó pendiente — investigado y NO improvisado porque el
  análisis del 04 lee de tablas separadas (`lv11_resultados`/`lv11_examenes`) que NO se
  alimentan de lo que se presenta desde el 03 (`lv_resultados`/`lv_examenes`); quitar
  "Presentar simulacro" del 04 sin conectar ambas fuentes dejaría el "Análisis de
  simulacros" —que es la función que se quiere que sea el corazón del 04— sin datos
  nuevos en silencio. Decisión de Richard: dejarlo para una sesión con más tiempo, dado
  el riesgo de tocar el motor de análisis y/o migrar datos reales de resultados.
  SW **v92**. `node --check`-equivalente (6+2 bloques `<script>`) limpio en `index.html`
  y `materia-hub.html`.
- **PENDIENTE:** push; que Richard confirme que "Preparación Saber 11" abre directo desde
  la sidebar (sin preguntar materia) y que sigue viendo todos sus simulacros guardados.
  Decidir cuándo abordar el punto 2 (recorte real, con o sin unificar el análisis).

## ▶ AJUSTE (jul 25, 2026 — sesión 26h): botones 🚨 Alertar / 📔 Observar reubicados

- **Puntos 4-5 del backlog crudo:** "el botón 📔 Observar no gusta visualmente ni la
  posición" y "🚨 Alertar tampoco gusta visualmente ni en su posición". Antes vivían
  pegados al nombre del estudiante en la primera columna de la planilla (`01-calificaciones.html`),
  como botones de texto completo ("🚨 Alertar", "📔 Observar") compitiendo por espacio con
  el nombre y el badge de "⚠️ % fallas" — la fila se veía recargada justo donde el docente
  más necesita leer rápido (el nombre).
- **Movidos a la columna de Acciones** (la misma donde ya vivía el botón "✕" de eliminar,
  al final de la fila): ahora son botones SOLO ÍCONO (🚨 / 📔 / ✕), del mismo tamaño y
  estilo, agrupados donde el docente ya espera encontrar acciones sobre la fila — el
  nombre del estudiante queda limpio (solo el nombre + el badge de inasistencias). El
  texto explicativo se conservó en el `title` (tooltip) de cada botón. Sin cambios de
  comportamiento: mismas condiciones para mostrarse (Alertar solo si ≥50% de notas
  evaluadas están bajas), mismas funciones `generarAlertaAuto`/`abrirObservar`/`delEst`.
  SW **v91**. `node --check`-equivalente (4 bloques `<script>`) limpio en
  `modulos/01-calificaciones.html`.
- **PENDIENTE:** push; que Richard confirme que la fila se ve más limpia y que los 3
  botones (🚨/📔/✕) siguen funcionando igual desde la columna de la derecha.

## ▶ DECISIÓN (jul 25, 2026 — sesión 26g): Analítica (14) se queda — sí cumple función

- **Punto 15 del backlog crudo:** "Analítica: ¿no cumple ninguna función? Pregunta si se
  podría suprimir." Revisado a fondo (sin tocar código): el módulo SÍ cumple dos funciones
  reales, distintas de todo lo demás en la app:
  1. **Radiografía ICFES 11°** — cruza resultados de simulacros (módulo 04) por
     competencia de la Matriz Saber 11, muestra dónde el grupo está débil y enlaza a
     Inclusión/Exámenes 11° para reforzar. No existe en ningún otro módulo.
  2. **Perfil del estudiante** — "hoja de vida académica" imprimible en una sola vista
     (notas por materia/periodo, asistencia, observador, PIAR, acudiente, herramientas
     formativas). Pensada para empalme entre docentes o consulta de coordinación/director
     de grupo. Es MÁS completa que la tarjeta de `12-director.html` (que es un tablero de
     alertas en vivo del grupo, no un documento de entrega/impresión).
- **Decisión de Richard: dejarlo como está.** No es una función muerta — es un módulo con
  poca visibilidad/uso, no sin propósito. No se tocó código.

## ▶ AJUSTE (jul 25, 2026 — sesión 26f): anotaciones del Observador ahora imprimen en el boletín

- **Punto 12 del backlog crudo:** "las anotaciones del observador deberían aparecer en el
  boletín del estudiante". Antes del hoy, `13-boletines.html` SOLO usaba el observador
  como una COMPUERTA previa (exige mínimo N anotaciones en el año antes de dejar generar
  boletines) y contaba cuántos "Reconocimiento" tenía cada estudiante para una frase
  automática ("⭐ Recibió N reconocimiento(s)…") — pero nunca imprimía el contenido real
  de las anotaciones (Situación Tipo I/II/III, Académica, Visita domiciliaria, etc.).
- **`construirBoletines()`:** cada estudiante ahora trae `observadorAnotaciones` — sus
  anotaciones del observador del AÑO en curso (mismo criterio anual que ya usaba
  `faltantesObservador()`; el observador no se organiza por periodo, así que no tiene
  sentido cortarlas por periodo 1/2/3), ordenadas por fecha.
- **`htmlBoletin()`:** si el estudiante tiene anotaciones, se agrega una tabla nueva
  "📔 Observador del estudiante — N anotación(es) en {año}" con tipo + fecha + descripción
  (recortada a 220 caracteres para no desbordar la página) + compromiso si lo tiene. Se
  agregó `fmtF()` a este archivo (no existía; se copió del mismo helper de fecha que ya
  usa `10-observador.html`).
- **Decisión de diseño (no se preguntó a Richard, pero se documenta el porqué):** se
  imprimen TODOS los tipos, incluidas Situación Tipo II/III, no solo reconocimientos. No
  se consideró una fuga nueva de privacidad porque el boletín de un estudiante ya solo lo
  ve su propio acudiente, y esas mismas situaciones YA le llegan al acudiente por
  WhatsApp en el momento en que se registran (`abrirAlertaWhatsApp` en 10-observador.html)
  — el boletín solo las consolida, no expone nada que la familia no supiera ya.
  SW **v90**. `node --check`-equivalente (3 bloques `<script>`) limpio; balance de
  `<div>/<table>/<tr>/<td>/<th>` verificado en `modulos/13-boletines.html`.
- **PENDIENTE:** push; que Richard genere un boletín de un estudiante con anotaciones
  reales en el observador y confirme que se ven bien impresas (o en vista previa antes de
  imprimir) y que la tabla no rompe el salto de página entre boletines.

## ▶ AJUSTE (jul 25, 2026 — sesión 26e): banco de preguntas consolidado en Evaluaciones

- **Punto 6 del backlog crudo:** "existe una opción en el Planeador (02) y otra en
  Evaluaciones (03). Creo que debería quedar solo en Evaluaciones. Pide sugerencia."
  Diagnóstico: NO eran la misma tabla — el "Banco de preguntas" del Planeador (`o.banco`,
  campo `{q,a}` simple guardado DENTRO de cada planeador, para imprimir un quiz junto con
  la clase) es un dato distinto del banco real y reutilizable de Evaluaciones (`lv_banco`,
  clasificado por grado/eje/tipo, usado para armar exámenes). Nunca hubo pérdida de datos
  por "duplicado" — el problema es de EXPERIENCIA: un docente podía escribir la misma
  pregunta dos veces sin saber que ya la tenía en el banco de Evaluaciones.
- **Decisión (sugerida y aplicada):** en vez de borrar el campo del Planeador (se
  perdería la función de "quiz impreso junto con la clase", y son 32 planeadores... datos
  reales ya guardados con eso), se agregó un botón **"🏦 Del banco de Evaluaciones"** junto
  al ya existente "+ Pregunta suelta" en la sección de banco del Planeador. Abre un
  selector (modal `#modal-preguntas`, mismo patrón que "🏦 Importar del Banco" de
  actividades, sesión 17) que LEE `lv_banco` (filtrado por materia vía `LV_CTX.filtrar` y
  por el grado ya elegido en el planeador) y al marcar preguntas las agrega como texto
  plano `{q,a}` al banco del planeador — la respuesta se resuelve sola según el tipo
  (`opciones[correcta]` en multiple, "Verdadero/Falso" en vf, `x.respuesta` en abierta).
  El picker es de SOLO LECTURA — no crea, edita ni borra nada en `lv_banco`; la autoría
  real (crear a mano, importar `.json`, generar con IA) sigue viviendo exclusivamente en
  Evaluaciones (03), que es justo lo que pedía Richard.
- `lv_banco` agregado a `LV_SYNC_TABLAS` del Planeador (antes no lo sincronizaba, así que
  el picker no habría visto preguntas frescas sin pasar antes por el portal o por 03).
  SW **v89**. `node --check`-equivalente (3 bloques `<script>`) limpio; balance de
  `<div>/<section>/<table>/<tr>/<td>/<th>/<label>/<select>` verificado en
  `modulos/02-planeador.html`.
- **PENDIENTE:** push; que Richard entre a un planeador de una materia que ya tenga
  preguntas en el banco de Evaluaciones, pruebe "🏦 Del banco de Evaluaciones" y confirme
  que las trae bien (texto y respuesta) y que el quiz sigue imprimiéndose igual que antes.

## ▶ AJUSTE (jul 25, 2026 — sesión 26d): 09-Acudientes fusionado dentro de Matrícula (20)

- **Punto 11 del backlog crudo:** "creo que 09 no debería existir como módulo aparte — al
  matricular a un estudiante ya debería quedar con su(s) acudiente(s)… solo coordinación/
  rector deberían tener acceso (hoy 09 está abierto a cualquier docente)". `20-matricula.html`
  YA hacía la mitad (vincula/crea acudiente al matricular) desde la sesión 25c — lo que
  faltaba era la gestión completa (listar/editar/eliminar/buscar todos los acudientes,
  no solo los recién matriculados) y quitar el acceso abierto del módulo 09.
- **`modulos/20-matricula.html` gana pestaña nueva "👪 Acudientes"** (además de Matrícula y
  Resumen, mismo gate `ES_COORD` de todo el módulo): formulario para registrar/editar datos
  básicos de un acudiente (nombre, parentesco, teléfono, correo, notas), tabla con
  buscador+filtro por grado, WhatsApp directo, y por cada acudiente un botón
  **"🔗 Vincular estudiante"** que despliega un `<select>` de estudiantes YA matriculados
  (`lv_matricula`, no texto libre) para amarrarlos por `estId` — así cualquier vínculo
  nuevo desde esta pestaña queda siempre atado a un registro real de matrícula, a
  diferencia del 09 viejo que vinculaba por nombre escrito a mano. Al eliminar un
  acudiente o quitar un hijo vinculado por `estId`, se limpia también `acudienteId` del
  lado de `lv_matricula` (consistencia en ambos sentidos).
- **`migrarAcudientes()` del 09 viejo se portó tal cual a `20-matricula.html`** (agrupa
  registros planos sin `hijos[]` por teléfono o nombre, corre una vez al cargar si
  `ES_COORD`) — por si quedaban acudientes de antes de la sesión 2 sin migrar, ya que el
  09 (que era el único lugar donde corría esta migración) deja de usarse.
- **`modulos/09-acudientes.html` reemplazado por una página de redirección** (`<meta
  http-equiv="refresh">` + `location.replace`) a `20-matricula.html?tab=acudientes` — se
  conserva el archivo (no se borra) solo para que accesos directos/marcadores viejos no
  queden rotos; si alguien sin ser coordinación llega ahí, cae en el mismo "🔒 acceso
  restringido" que ya tenía el módulo 20. `20-matricula.html` lee `?tab=` al cargar para
  abrir directo en la pestaña Acudientes cuando viene de esa redirección.
- **Enlaces quitados:** el link plano "👪 Acudientes" del sidebar de `index.html` (abierto
  a cualquier docente) y la tarjeta de Acudientes en `materia-hub.html` (sección
  institucionales). El link a `20-matricula.html` en el sidebar (`#nav-matricula`, ya
  oculto salvo `login.esAdmin`) se renombró a "Matrícula y Acudientes" para que quede
  claro que ahí vive todo ahora.
- **OJO — no se tocó la RLS de `lv_acudientes`** (sigue `solo_autenticados`, sin
  restricción por rol en el servidor, igual que antes de esta sesión): la restricción a
  coordinación/rector es solo de la app (como ya era el caso), no del backend. Si se
  quiere cerrar ese hueco de verdad, hace falta una migración SQL aparte con
  `es_coordinacion()` en `lv_acudientes` (mismo patrón que `lv_matricula`) — no se hizo
  hoy para no mezclarlo con este cambio.
  SW **v88**. `node --check`-equivalente (3+1+6+2 bloques `<script>`) limpio en
  `20-matricula.html`, `09-acudientes.html`, `index.html` y `materia-hub.html`; balance de
  `<div>/<section>/<table>/<tr>/<td>/<th>/<label>/<select>` verificado en `20-matricula.html`.
- **PENDIENTE:** push; que Richard entre como coordinación/rector a "Matrícula y
  Acudientes" → pestaña Acudientes y confirme que ve TODOS los acudientes que antes veía
  en el 09 viejo (la migración los debe traer), que vincular un estudiante ya matriculado
  funciona, y que entrando con una cuenta docente normal ya no aparece "Acudientes" en el
  sidebar ni en Áreas académicas. Decidir si vale la pena la migración SQL de RLS de
  `lv_acudientes` mencionada arriba.

## ▶ AJUSTE (jul 25, 2026 — sesión 26c): pestaña "Solicitar" oculta para el rector en Permisos

- **Punto 16 del backlog crudo (segunda mitad):** "creo que el rol RECTOR (admin) no
  debería ver la pestaña 'Solicitar' — esa pestaña es solo para coordinador y docente (el
  rector solo aprueba)". Corregido en `modulos/18-permisos.html`: justo después de
  `if(ES_COORD)$('#tab-btn-aprobar').classList.remove('hide');` se agregó un bloque que,
  SOLO si `LOGIN.rol==='admin'` (rector — no coordinador, que sí debe poder solicitar sus
  propios permisos, por eso se distingue de `ES_COORD`), oculta el botón de pestaña
  `data-tab="solicitar"` y cambia la pestaña activa por defecto a "✅ Aprobaciones". No
  hace falta llamar a `render()` de nuevo: ya se llama una sola vez, sin condición, al
  final del archivo, y pinta tanto "Mis solicitudes" como "Aprobaciones" sin importar cuál
  pestaña esté visible en ese momento — el cambio de pestaña activa es solo manipulación
  de clases CSS sobre contenido que ya está pintado.
- **Primera mitad del punto 16 (notificación al docente cuando se aprueba un permiso):**
  YA EXISTÍA — verificado en `index.html` (dashboard personal del docente, ~línea
  1080-1097): tarjeta "🗓️ Coordinación respondió tu(s) permiso(s)…" para solicitudes
  respondidas en los últimos 7 días. Lo que falta es el CORREO (no hecho, ni hoy ni antes)
  — requiere decidir e implementar infraestructura nueva (candidato: Supabase Edge
  Function + un servicio de correo tipo Resend/SendGrid), no es un cambio de código
  existente. Queda pendiente de decisión con Richard antes de construirlo.
  SW **v87**. `node --check`-equivalente (3 bloques `<script>`) limpio en
  `modulos/18-permisos.html`.
- **PENDIENTE:** push; que Richard entre con la cuenta de rector (rol admin) a Permisos y
  confirme que ya no ve "Solicitar" y que abre directo en "Aprobaciones" — y que una
  cuenta de coordinador SÍ sigue viendo las tres pestañas normalmente. Decidir sobre el
  correo de aprobación de permisos (y el recordatorio de eventos del punto 10, misma
  infraestructura) antes de seguir con el resto del backlog crudo.

## ▶ AJUSTE (jul 25, 2026 — sesión 26b): alerta de inasistencia también para admin/coordinación

- **Causa real encontrada del punto 8 del backlog crudo** ("revisar que la alerta de +25%
  inasistencias funcione"): la alerta YA EXISTÍA y funciona bien — es la tarjeta
  "🚨 N estudiante(s) con más del 25% de inasistencias" del dashboard personal
  ("Tu Día en SABIE"). El problema es que ese dashboard entero hace
  `if(PERM.esAdmin) return;` al inicio (sesión 22, para cederle el espacio al Panel de
  Coordinación) — así que Richard, que entra como admin, JAMÁS la ve. No era un bug de
  cálculo, era una tarjeta que solo existía para el rol equivocado.
- **Corregido:** nueva tarjeta 5ª en `renderPanelCoordinacion()` (Panel de Coordinación,
  visible solo para admin/coordinación) — "🚨 Inasistencia alta (>25%)", MISMO cálculo que
  ya usa el dashboard docente pero SIN filtrar por materia (coordinación ve todo el
  colegio): cuenta faltas (`F`) sobre el total de días registrados por estudiante-curso en
  `lv_as_asistencia`/`lv_as_estudiantes`, ordenada de mayor a menor %, cada fila enlaza a
  Asistencia. Se exige mínimo 4 registros antes de alertar (evita falsos positivos con
  apenas 1-2 días tomados).
  SW **v86**. `node --check` limpio en index.html (6 bloques).
- **PENDIENTE:** push; que Richard entre como admin y confirme que la tarjeta aparece (o
  que diga "✅ Ningún estudiante supera el 25%" si nadie la dispara todavía). Sigue
  pendiente su pregunta de si esto debería ser además una alerta MÁS proactiva (push/
  correo) — por ahora queda como tarjeta del panel, igual que las otras 4.

## ▶ POR DÓNDE RETOMAR (jul 25, 2026 — sesión 26, bug del botón "📝 Mejoramiento")

- **Investigados los 2 bugs que Richard reportó como prioridad (ver backlog crudo arriba,
  puntos 5 y 8):**
  1. **Botón "📝 Mejoramiento" (pestaña Reportes, 01-calificaciones) — BUG REAL,
     CORREGIDO (sin desplegar):** `generarMejoramiento()` abría Comunicados con
     `window.open('06-comunicados.html?draft=1','_blank')` — pestaña NUEVA y SIN
     `area=`/`materia=` en la URL. Un pop-up bloqueado por el navegador (Chrome a veces
     los bloquea con solo un ícono discreto en la barra de direcciones, fácil de no ver)
     explica perfecto el reporte de "no está funcionando". Corregido para que use el
     MISMO patrón que ya usan `generarAlertaAuto()` (01, botón 🚨 Alertar) y
     `generarCitacionAuto()` (05-asistencia, botón 📩 Citar): `location.href` en la
     MISMA pestaña + `area=`/`materia=` en la URL. Los otros dos ya estaban bien escritos
     (mismo patrón, con `location.href`) — si Richard los ve fallar en la práctica, es
     otra causa (probar de nuevo tras este fix por si compartían algo).
  2. **Alerta de +25% de inasistencias (05-asistencia) — NO ES UN BUG, es manual por
     diseño y probablemente Richard no lo sabía:** existe el botón "📩 Citar" en la
     pestaña **Estadísticas** de Asistencia (no en la planilla diaria), visible SOLO
     cuando el % de asistencia de un estudiante baja de 75% (bajo la fila del
     estudiante). No hay ninguna alerta PUSH/automática hoy — el docente tiene que entrar
     a esa pestaña y verlo. Si Richard esperaba algo proactivo (un aviso sin tener que ir
     a buscarlo), es un pedido de FEATURE nueva, no un bug — candidato natural: sumarlo al
     Panel de Coordinación (sesión 22) o a las alertas del dashboard docente, no se hizo
     hoy porque no estaba claro si eso es lo que Richard quiere o solo confirmar que el
     botón exista.
  SW **v85**. `node --check` limpio en 01-calificaciones.html.
- **PENDIENTE:** push; que Richard pruebe el botón "📝 Mejoramiento" desde Reportes con un
  estudiante reprobado y confirme que ahora sí abre Comunicados con curso/estudiante
  pre-llenados. Decidir si la citación por inasistencia (punto 2) se queda como botón
  manual o pasa a ser una alerta proactiva en el portal — Richard tiene el resto del
  backlog crudo de la sesión 26 sin triage todavía (ver bloque arriba del todo del
  archivo), incluida su pregunta sobre reposicionar visualmente los botones 🚨 Alertar y
  📔 Observar en la planilla, que quedó pendiente de sugerencia concreta.

## ▶ POR DÓNDE RETOMAR (jul 24, 2026 — sesión 25g, "forzar limpieza" remota)

- **Punto 9 del backlog de la auditoría (sesión 24) — CÓDIGO LISTO, sin desplegar.**
  Era la opción marcada como "opcional" en el backlog: hasta hoy, si a un docente se le
  quitaba un permiso mal dado, su copia local (espejo en `localStorage`) seguía teniendo
  los datos de más hasta que ÉL MISMO tocara "🧹 Borrar mis datos de este equipo" — el
  admin no tenía forma de forzar esa limpieza a distancia. Ahora sí.
- **`LV_INST.dataEpoch()` NUEVO en `auth.js`** — lee `lv_institucion.dataEpoch` (número,
  sin migración SQL, es JSONB). **`verificarEpocaDatos()` NUEVO en `sync.js`**: compara
  esa época contra `localStorage.lv_epoca_vista` (la última que este equipo vio). Si la
  del servidor es MAYOR, corre `limpiarPorEpoca()` — sube pendientes, borra todas las
  claves `lv_*` del equipo (conservando `lv_gemini_key` y el propio marcador de época),
  avisa con un `alert()` y cierra sesión (`LV_AUTH.logout()`) — mismo borrado que ya hacía
  el botón manual del portal (sesión 24), pero disparado automáticamente. Se llama después
  de `descargarTodo()` tanto en `init()` (al abrir la app) como en `chequearYActualizar()`
  (el polling de 15s), para que también alcance a alguien que ya tenía la pestaña abierta.
  **La PRIMERA vez que corre en un equipo NO limpia nada** — adopta la época actual como
  punto de partida, para no expulsar a todo el colegio el día que esto se despliega solo
  porque nunca habían visto ninguna época todavía.
- **Botón en `coordinacion.html`** — tarjeta nueva "🧹 Forzar limpieza remota" en
  Resumen → Institución, **visible SOLO para `MI_ROL==='admin'`** (ni siquiera
  coordinación — es una acción más pesada que editar roles, así que se dejó al mismo nivel
  de exclusividad que la pestaña Roles de la sesión 25). Al tocarlo (con confirm explícito
  de qué va a pasar), sube `lv_institucion.dataEpoch = Date.now()` reusando el resto del
  registro de institución (no pisa nombre/NIT/sedes/etc., solo agrega el campo).
  SW **v84**. `node --check` limpio en auth.js, sync.js y coordinacion.html; balance de
  `<div>/<section>/<table>/<tr>/<td>/<th>/<label>/<select>` verificado en coordinacion.html.
- **PENDIENTE:** push, y que Richard pruebe con cuidado (es la función más "grande": afecta
  a TODOS los docentes a la vez) — idealmente primero en un equipo de prueba: tocar el
  botón, y en OTRO dispositivo con sesión antigua abrir la app con internet y confirmar que
  se limpia solo y pide reingresar, sin perder datos en la nube. Con esto quedan cubiertos
  los 3 puntos "grandes" de la auditoría de la sesión 24 (matrícula+acudientes, observación
  con foto, permisos centralizados) más este opcional — el backlog original de esa
  auditoría queda cerrado salvo los dos pendientes de fondo ya señalados en la sesión 25f
  (mover el bloque PERM de `index.html`, y cerrar el hueco de 03/04/06).

## ▶ POR DÓNDE RETOMAR (jul 24, 2026 — sesión 25f, permisos.js central → LV_PERM)

- **Punto 8 del backlog de la auditoría (sesión 24) — CÓDIGO LISTO, sin desplegar.**
  Hasta hoy, "¿es mío este curso?" / "¿qué grupos dirijo?" / "¿soy coordinación?" se
  recalculaba POR SEPARADO en cada módulo (a veces con nombres de variable distintos:
  `esAdmin` vs `ES_COORD`), y cada fuga de privacidad de las auditorías (sesiones 3, 10,
  24) hubo que corregirla una vez por archivo porque no había una sola fuente de verdad.
- **`LV_PERM` NUEVO en `auth.js`** (junto a `LV_CURSO`/`LV_INST`, mismo patrón: funciones
  puras, lee `localStorage` directo, no depende del `lsRead` de cada módulo): `login()`,
  `esAdmin()`, `esCoordinacion()` (alias de esAdmin, para los módulos "solo coordinación"
  que lo llamaban `ES_COORD`), `nombre()`, `miDocente(docentes)`, `misAsignaciones(asig)`,
  `accesoTotal(asig)` (comodín Primaria/Todas las materias), `materiasPermitidas(asig)`,
  `permiteMateria(materia, asig)`, `cursoEsMio(curso, asig, docentes)` (por materia O por
  dirigir el grupo) y `gruposDirigidos(cursos, docentes)` (todos los cursos si es admin;
  si no, los que dirige por `LV_CURSO.dirigeCurso`). Los arrays se PASAN como parámetro
  (cada módulo ya los tiene en memoria con su propio nombre de variable) — si no se pasan,
  cae a leer `localStorage` directo.
- **Migrados a delegar en LV_PERM (mismo comportamiento, sin duplicar código):**
  `01-calificaciones.html` (`cursoEsMio`), `11-inclusion.html` (`estudianteEsMio` —
  literalmente la misma función que 01, copiada y pegada antes), `10-observador.html`,
  `12-director.html`, `13-boletines.html`, `14-analitica.html` (las 4 tenían la MISMA
  función `gruposDirigidos()` de 6 líneas, copiada tal cual en cada archivo),
  `17-centros-interes.html` (`SOY_ADMIN`/`MI_DOCENTE_ID`), `18-permisos.html` y
  `20-matricula.html` (`ES_COORD`).
- **`index.html` NO se migró — a propósito, no es un descuido.** Verificado con un
  subagente de investigación: el bloque `PERM`/`calcularPermisos()` del portal corre en un
  `<script>` inline que está ANTES de `<script src="auth.js">` en el propio archivo (mismo
  bug de orden de scripts que ya rompió el buscador una vez, documentado en varias
  sesiones de este archivo). Si ese bloque llamara a `LV_PERM` tal cual, `LV_PERM` todavía
  no existiría y el portal entero se habría roto al cargar. Se dejó el bloque
  self-contenido como estaba (misma lógica, duplicada a propósito solo aquí), con un
  comentario explicando por qué. Mover el bloque de sitio en `index.html` (para que sí
  pueda usar LV_PERM) es posible pero es su propio cambio de riesgo — no se improvisó hoy.
- **Hallazgo colateral (NO corregido hoy, a propósito):** `03-examenes.html`,
  `04-examenes-11.html` y `06-comunicados.html` NO tienen el filtro fuerte de
  asignaciones/dirige — dependen SOLO de `LV_CTX.filtrar()`, que filtra por el CONTEXTO de
  navegación (`?materia=` en la URL), no por la asignación real del docente, y no filtra
  nada si el docente entra por el enlace directo del sidebar. Es el mismo bug que ya se
  corrigió en 01-calificaciones (sesión 3) pero sigue sin corregirse en estos 3. Migrarlos
  a `LV_PERM.cursoEsMio`/`permiteMateria` sería a la vez centralizar Y cambiar
  comportamiento (dejarían de mostrar exámenes/comunicados de materias sin asignación
  formal) — se dejó fuera de esta sesión para no mezclar un refactor con un cambio de
  comportamiento; queda como punto pendiente aparte.
  SW **v83**. `node --check` limpio en auth.js y los 10 archivos tocados (`new Function`
  sobre cada bloque `<script>` inline); balance de `<div>/<section>/<table>/<tr>/<td>/
  <th>/<label>/<select>` verificado en los 10 — el único desbalance encontrado
  (`14-analitica.html`, 14 `<td` vs 13 `</td>`) es PREEXISTENTE (confirmado con `git diff`:
  mi cambio ahí solo tocó 6 líneas de JS, cero HTML), no es una regresión de hoy.
- **PENDIENTE:** push, y que Richard pruebe con una cuenta docente normal que Observador/
  Inclusión/Director/Boletines/Analítica/Centros de Interés/Permisos/Matrícula siguen
  mostrando exactamente lo mismo que antes (es un refactor de "mismo comportamiento", así
  que cualquier diferencia visible sería un bug de esta migración). Pendientes de fondo
  que quedaron señalados: mover el bloque PERM de `index.html` para que también use
  LV_PERM (sesión aparte, toca el orden de scripts), y cerrar el hueco de 03/04/06 (sesión
  aparte, es cambio de comportamiento).

## ▶ POR DÓNDE RETOMAR (jul 24, 2026 — sesión 25e, observación de clase con foto)

- **Punto 7 del backlog de la auditoría (sesión 24) — CÓDIGO LISTO, sin desplegar.** En la
  planilla de `01-calificaciones.html`, cada estudiante ahora tiene un botón
  **"📔 Observar"** (junto al de "🚨 Alertar") que abre un modal con los MISMOS tipos del
  observador (Situación Tipo I/II/III, Académica, Reconocimiento, Visita domiciliaria),
  fecha, descripción y una **foto opcional**. Al guardar, crea un registro en
  `lv_observador` con `estId`, `cursoId`, `curso`, `materia` (de `LV_CTX`) y `autor` — así
  CUALQUIER docente puede aportar una anotación desde su clase, no solo el director de
  grupo (que la sigue viendo de solo-lectura en `10-observador.html`, sin cambios en sus
  permisos). Los registros nuevos llevan `origen:'planilla'` para poder distinguirlos.
- **La foto va a Storage, NO al JSON de sync** (igual que decidió Francy en la sesión 24):
  bucket nuevo `observador-fotos`, ruta `{estId}/{idAnotacion}.{ext}`, subida con
  `fetch POST` autenticado (mismo patrón de token que ya usa `16-actividades.html` para
  LEER, aquí además para ESCRIBIR). El registro guarda solo `fotoRuta` (texto), no base64.
  `migracion_observador_foto.sql` (NUEVO, SIN CORRER): bucket privado + política de
  lectura y escritura para cualquier autenticado — mismo nivel de privacidad que hoy tiene
  `lv_observador` (`solo_autenticados`, sin filtro por curso; la Fase 2 de arquitectura que
  restringiría esto sigue pausada a propósito).
- **`10-observador.html`:** si una anotación trae `fotoRuta`, aparece un botón
  "📷 Ver foto" que la descarga autenticada desde Storage y la muestra en un overlay
  (mismo patrón de descarga que el visor de `16-actividades.html`). También se marca junto
  a la fecha "(desde la clase)" cuando `origen==='planilla'`, para que el director de grupo
  distinga de un vistazo qué anotaciones llegaron desde otra materia.
  SW **v82**. `node --check` limpio en 01-calificaciones.html y 10-observador.html (3
  bloques cada uno); balance de `<div>/<section>/<table>/<tr>/<td>/<th>/<label>/<select>`
  verificado en ambos (01-calificaciones es un archivo grande, se editó por reemplazos de
  texto exactos, no reescritura completa — la lógica nueva se insertó DESPUÉS de que `$`,
  `uid`, `esc`, `toast`, `login`, `cursos` y `estudiantes` ya estuvieran definidos, para no
  repetir el bug de orden de scripts documentado en sesiones anteriores).
- **PENDIENTE:** correr `migracion_observador_foto.sql` en Supabase, push, y que Richard
  pruebe el flujo completo: desde una materia cualquiera, botón "📔 Observar" en un
  estudiante → adjuntar foto → guardar → entrar como director de ese grupo a
  `10-observador.html` y confirmar que la anotación aparece con la foto visible.

## ▶ AJUSTE (jul 24, 2026 — sesión 25d): catálogo de sedes corregido

- Richard reportó que el selector de Sede en Matrícula (y en Calificaciones, que comparte
  el mismo catálogo) no traía todas las sedes reales y sí traía una que no existe:
  "María Auxiliadora". Causa: `LV_INST.sedes()` en `auth.js` es el respaldo que se usa
  MIENTRAS nadie haya guardado el campo "Sedes" en Coordinación → Resumen → Institución —
  y ese respaldo traía una lista corta desactualizada (7 sedes, con María Auxiliadora
  inventada). Mientras tanto, `coordinacion.html` SÍ tiene el catálogo real y completo
  (constante `SEDES`, 16 sedes, sacado de la información real de docentes/asignaciones que
  se importó en la sesión 21 — la fuente que pidió usar Richard).
- **Corregido:** el respaldo de `LV_INST.sedes()` en `auth.js` ahora tiene las 16 sedes
  reales (Principal, Juana Julia 1, Juana Julia 2, Cristo Es Mi Luz, El Oyeto, Fronteras de
  Córdoba, La Octavia, La Popa, Mi Porvenir Es Cristo Jesus, San Diego, San Francisco, San
  Miguel, Verdinal, El Rincon, La Gloria, Carlos Ospina) — igual a `coordinacion.html`. Como
  es una fuente central, arregla a la vez el selector de sede en 01-calificaciones y en el
  módulo nuevo 20-matricula, sin tocar cada archivo. SW **v81**.
- **OJO — esto NO alcanza si el campo "Sedes" en Coordinación → Resumen → Institución ya
  quedó GUARDADO alguna vez con datos viejos/incorrectos** (ese valor manda sobre el
  respaldo). Si Richard ya lo había guardado con "María Auxiliadora" incluida, hay que
  corregirlo a mano ahí mismo — el respaldo de `auth.js` solo aplica mientras ese campo
  esté vacío.
- **PENDIENTE:** push; que Richard confirme en Coordinación → Institución que el campo
  "Sedes" está vacío (para que tome el respaldo corregido) o, si ya tiene algo guardado,
  que lo corrija manualmente ahí con la lista real de 16 sedes.

## ▶ POR DÓNDE RETOMAR (jul 24, 2026 — sesión 25c, módulo NUEVO de Matrícula + Acudientes)

- **`modulos/20-matricula.html` — CÓDIGO LISTO, sin desplegar.** Punto 6 del backlog de la
  auditoría (sesión 24): registro OFICIAL de estudiantes amarrado a un acudiente, SOLO para
  coordinación/rector — reemplaza que los docentes creen estudiantes sueltos en la planilla
  (btn-add-est / importar lista del módulo 01). Richard/Francy pidió avanzar con una
  **estructura razonable** sin tener aún la ficha oficial del colegio; falta ajustarla
  cuando la envíe.
- **Decisión de arquitectura clave:** este módulo NO toca `lv_estudiantes` (el roster
  por-curso que ya usa 01-calificaciones/05-asistencia, duplicado por materia — cada curso
  de cada docente tiene su propia lista de "estudiantes"). `lv_matricula` es un registro
  MAESTRO paralelo, institucional, por estudiante real (no por curso-materia). Conectar
  ambos mundos (que el roster de un curso se alimente de la matrícula oficial) es un
  refactor de más riesgo que toca 01-calificaciones — un archivo grande y ya auditado —
  y se deja pendiente a propósito, siguiendo la misma cautela que la Fase 2 de arquitectura
  (no improvisar en caliente sobre módulos críticos sin sesión dedicada + pruebas).
- **Tabla nueva `lv_matricula`** (`migracion_matricula.sql`, SIN CORRER): `{id, tipoDoc,
  documento, fechaNacimiento, genero, nombres, apellidos, sede, grado, grupo, jornada,
  estado ('activo'|'retirado'), acudienteId, observaciones, creado, actualizado,
  registradoPor}`. RLS: a diferencia de `lv_centros`/`lv_permisos` (lectura abierta a
  docentes), aquí NI LA LECTURA es para todos — contiene documento de identidad y fecha de
  nacimiento de todo el colegio, así que la política `coordinacion_todo` exige
  `es_coordinacion()` tanto para leer como para escribir (mismo nivel que
  `lv_docentes`/`lv_asignaciones`/`lv_institucion`).
- **Acudientes: reutiliza `lv_acudientes` tal cual existe hoy** (el mismo formato
  `{nombreAcudiente, parentesco, telefono, email, hijos:[...]}` de `09-acudientes.html`),
  no una tabla aparte. Al matricular, el docente-coordinador busca un acudiente existente
  (por nombre/teléfono) o registra uno nuevo desde el mismo formulario; en cualquiera de
  los dos casos se guarda `acudienteId` en el registro de matrícula Y se agrega/actualiza
  una entrada en `hijos[]` del acudiente con un campo nuevo `estId` (el id de la matrícula)
  — retrocompatible: `09-acudientes.html` no se tocó y sigue funcionando igual, simplemente
  ahora algunos `hijos[]` traen `estId` de más.
  · Pestaña **Resumen**: activos/retirados/acudientes, conteo por sede y por grado, y una
    lista de "estudiantes sin acudiente" (alerta de calidad de datos) + exportar CSV.
  · Retirar un estudiante es un cambio de `estado` (no borra); Eliminar manda a la papelera
    (`_eliminado:true`, patrón de siempre) y limpia el vínculo del lado del acudiente.
  · Gate de acceso: todo el módulo (no solo partes, a diferencia de 12-director) exige
    `login.esAdmin` (admin o coordinador); si no, solo se ve una tarjeta de "acceso
    restringido". No se agregó a `materia-hub.html` (a diferencia de 17/18, que sí sirven a
    cualquier docente) — el único enlace vive en el sidebar del portal, oculto para
    docentes normales, con el mismo patrón que ya usa el link a Coordinación (`nav-coord`).
  SW **v80** (+ el módulo en el precache). `node --check` limpio en sw.js/sync.js; bloques
  `<script>` inline de index.html y 20-matricula.html verificados con `new Function`;
  balance de `<div>/<section>/<table>/<tr>/<td>/<th>/<label>/<select>` verificado en
  20-matricula.html.
- **PENDIENTE:** correr `migracion_matricula.sql` en Supabase, push, y que Richard pruebe
  el flujo completo (matricular con acudiente nuevo, matricular vinculando a uno existente,
  retirar, eliminar, exportar CSV) y confirme que el resumen cuadra. Cuando llegue la ficha
  oficial del colegio: ajustar campos exactos (tipos de documento, EPS, IPS, dirección,
  etc. — hoy son los campos "razonables" que ya mencionó Richard: documento, fecha nac.,
  sede, grado, grupo). Más adelante, en sesión propia: decidir si/cómo conectar este
  registro maestro con los rosters por-curso de 01-calificaciones (punto de riesgo alto,
  no hacer sin planificarlo).

## ▶ ACLARACIÓN (jul 24, 2026 — sesión 25b): Richard y Francy son la misma persona

- Confirmado con el dueño: **Richard Sabié y "Francy Vargas" son la misma persona/cuenta**
  (correo agresotlomaverde@gmail.com). Todo el historial de sesiones de más abajo, donde se
  narra "Francy pidió…", "Francy probó…", "que Francy confirme…", se refiere a la MISMA
  persona con la que se sigue trabajando ahora — no hay dos usuarios distintos ni confusión
  de roles entre ellos. No se reescribió el historial completo (habría sido un cambio enorme
  y riesgoso sobre ~1250 líneas de bitácora); basta con leer "Francy" = "Richard" de aquí en
  adelante. El único admin real en Supabase es `richard.mhsabie@icloud.com` — todos los demás
  correos en `perfiles` son docentes.
- Verificado en la misma sesión: el push del **Editor de roles admin (sesión 25, SW v79)**
  SÍ quedó en producción (commit `cc27596` en `origin/main`, working tree limpio) y
  `migracion_editor_roles.sql` SÍ se corrió (confirmado con los datos reales de `perfiles`:
  solo richard.mhsabie@icloud.com tiene rol admin, el resto docente). Prueba del editor de
  roles (cambiar a alguien a coordinador, reentrar, ver Coordinación sin la pestaña Roles):
  HECHA por Richard, OK.
- Verificado también: **`migracion_comodin_primaria_por_sede.sql` (sesión 24) SÍ corrió
  completa** (no solo las consultas de lectura) — confirmado con
  `select pg_get_functiondef('public.lv_acceso_total()'::regprocedure)`, que devuelve
  exactamente `select public.es_coordinacion();` sin la rama del comodín. Queda pendiente
  que los 4 docentes con comodín de primaria (Danarlys, Daniela, Diana, Luis) cierren sesión
  y vuelvan a entrar, y que Luis confirme que ya no ve Sociales de bachillerato.

## ▶ POR DÓNDE RETOMAR (jul 24, 2026 — sesión 25, Editor de roles admin + separar coordinación de admin)

- **Editor de roles en la app (SW v79):** ahora el admin/rector puede ver y
  cambiar los roles de todos los usuarios SIN entrar a Supabase.
  · **`login.html`:** `lv_login` ahora guarda también `rol` (docente/
    coordinador/admin), no solo `esAdmin`. `esAdmin` sigue agrupando admin+
    coordinador para el acceso a Coordinación; `rol` permite separar lo que
    SOLO admin puede hacer. OJO: sesiones viejas no tienen `rol` hasta reentrar.
  · **`coordinacion.html`:** pestaña nueva **🔑 Roles** (`#tab-roles`), su botón
    `#tabbtn-roles` arranca oculto y se revela solo si `MI_ROL==='admin'` (se
    lee de `lv_login.rol` en el gate). Lista los usuarios de `perfiles` vía REST
    con el token del admin (`renderRoles`), cruza el correo con `lv_docentes`
    para mostrar el nombre, y un `<select>` por fila cambia el rol con PATCH a
    `perfiles` (`guardarRol`, con confirm). La propia cuenta del admin sale como
    "— tu propia cuenta —" (no editable) para no auto-degradarse y quedar sin
    admin. Coordinación (rol coordinador) entra a Coordinación pero NO ve la
    pestaña Roles.
  · **`migracion_editor_roles.sql` (NUEVO, en la raíz):** función `es_admin()`
    (rol='admin', más estricta que `es_coordinacion()`); política de `perfiles`:
    lectura = propio o admin; update = solo admin. Idempotente + rollback.
- **PENDIENTE:** correr `migracion_editor_roles.sql` en Supabase, push, y que
  Francy **cierre sesión y vuelva a entrar** (para que su `lv_login` tenga
  `rol:'admin'` y aparezca la pestaña Roles). Luego probar: cambiar a alguien a
  coordinador, que esa persona reentre y vea Coordinación pero no la pestaña
  Roles. Con esto queda cubierto el punto 1 de la auditoría (separar coord/admin
  + editar roles desde la app). Siguen en fila: matrícula+acudientes (punto 3),
  observación en clase con foto (punto 4), permisos.js central (punto 5), y el
  "forzar limpieza" central opcional.

## ▶ POR DÓNDE RETOMAR (jul 24, 2026 — sesión 24, AUDITORÍA + fix de la fuga del comodín de primaria)

- **Contexto:** Francy empezó a dar acceso a docentes reales y reportó que los
  profes nuevos veían las planillas de Sociales que ella cargó. Pidió auditoría,
  aclaración de roles, aislamiento por docente, y varias mejoras nuevas.
- **DIAGNÓSTICO (con SQL de solo lectura, `diagnostico_aislamiento.sql`, en la
  raíz):** el aislamiento `por_curso` YA está activo en las 8 tablas (bloque A).
  Ningún profe de aula quedó como coordinador/admin (bloque B: único admin =
  richard.mhsabie@icloud.com). **La fuga era el COMODÍN de primaria:** 4
  docentes (Danarlys, Daniela, Diana, Luis) con área "Primaria" / materia "Todas
  las materias" hacían que `lv_acceso_total()` fuera TRUE → veían TODO el
  colegio, incluido bachillerato. Confirmado con el bloque F (luisherr13: rol
  docente, comodín true, cursos por asignación 0 → solo veía por el acceso total
  del comodín).
- **DECISIÓN de Francy:** acceso total real = solo coordinación/rector; el
  comodín de primaria pasa a significar "todas las materias de primaria
  (preescolar–5°) de MI SEDE" (ni bachillerato, ni otras sedes).
- **`migracion_comodin_primaria_por_sede.sql` (NUEVO, en la raíz):** redefine 3
  funciones (idempotente, reversible, NO toca políticas ni mueve datos):
  · `lv_es_primaria(grado)` NUEVA — true si grado es preescolar..5° (maneja
    "1°".."5°", "5", y preescolar por nombre con/sin tildes vía translate).
  · `lv_acceso_total()` → ahora = `es_coordinacion()` únicamente (se quitó la
    rama del comodín).
  · `lv_mis_cursos()` → se le agregó la rama 3: cursos de primaria cuya sede
    (`lv_norm`) coincide con la del docente (`lv_docentes.datos->>'sede'`), si el
    docente tiene el comodín. Ramas 1 (asignación) y 2 (dirige) intactas — el
    director de grupo sigue viendo su grupo aunque falte la sede en el curso.
  Trae verificación de solo lectura y ROLLBACK comentado.
- **Estado al momento de escribir:** Francy corrió las verificaciones. Sedes de
  los 4 docentes OK (Juana Julia 1 y 2). La verificación 4b dio 0 cursos de
  primaria de su sede PORQUE aún no existe NINGÚN curso de primaria creado (la
  consulta de cursos de primaria devolvió 0 filas). O sea: no hay backfill que
  hacer; cuando los docentes de primaria creen su planilla eligiendo sede, la
  verán. **PENDIENTE de confirmar:** que Francy haya corrido las secciones 1-3
  (funciones) y no solo las de lectura — se verifica con
  `select pg_get_functiondef('public.lv_acceso_total()'::regprocedure)` (debe
  decir solo `select public.es_coordinacion()`). Luego: los 4 docentes cierran
  sesión y vuelven a entrar (para soltar lo ya espejado en su navegador) y Luis
  confirma que ya no ve Sociales de bachillerato. Commit de los 2 .sql nuevos.
- **BOTÓN "🧹 Borrar mis datos de este equipo" (index.html, SW v78):** en el
  recuadro de usuario de la sidebar del portal, junto a Cambiar contraseña /
  Cerrar sesión. Necesario porque VERIFICADO en código: `logout()` NO limpia el
  espejo (solo borra sesión), y `descargarTodo()` es incremental (agrega/
  actualiza, no borra lo que el server deja de devolver por RLS). Así que la
  data filtrada antes del fix se queda pegada en el navegador de cada docente
  hasta limpiarla. El botón: (1) exige internet; (2) sube pendientes
  (`LV_SYNC.subirPendientes`) para no perder cambios; (3) borra TODAS las claves
  `lv_*` (espejo + marcador `lv_sync_ultima` + cola `lv_sync_pendientes`),
  conservando solo `lv_gemini_key`; (4) `LV_AUTH.logout()`. Al volver a entrar,
  descarga de cero y solo lo permitido. Cada docente lo toca en SU equipo.
- **Pregunta de Francy: ¿un botón para que el ADMIN borre los datos de un
  docente remotamente?** Respuesta: directo NO (el navegador no deja alcanzar
  el localStorage de otro dispositivo). ALTERNATIVA propuesta (NO hecha aún):
  un "forzar limpieza" — un marcador de época de datos en Supabase
  (p.ej. lv_institucion.dataEpoch o tabla propia); cada cliente guarda la época
  que vio; si al abrir (con internet) la época del server es mayor, el cliente
  se auto-limpia (mismo borrado del botón) y re-descarga. Así el admin dispara
  una limpieza global sin tocar cada equipo. Queda como opción si Francy quiere
  control central.
- **AUDITORÍA — hallazgos y acuerdos para próximas sesiones (en orden que eligió
  Francy: aislamiento primero, ya casi cerrado):**
  1. **Roles:** hoy coordinación y admin están FUSIONADOS en el código
     (`login.html`: `esAdmin = rol IN ('admin','coordinador')`) y el rol solo se
     cambia a mano en la tabla `perfiles` de Supabase (no hay UI). ACORDADO:
     guardar el `rol` real en la sesión, separar permisos (admin/rector puede
     editar roles; coordinación no), y crear un **editor de roles solo para
     admin** dentro de Coordinación que escriba en `perfiles`.
  2. **Qué ven TODOS los docentes** (decisión de Francy): malla (solo lectura),
     banco de actividades, calendario de eventos y herramientas formativas. Lo
     demás (notas, estudiantes, observador) es privado por docente/grupo.
  3. **Automatización/estructura:** centralizar permisos en un `permisos.js`
     compartido (hoy cada módulo recalcula PERM y por eso la misma fuga se
     corrigió varias veces por separado); alta de docentes más automática.
  4. **Mejora — observación en clase → observador:** en la planilla, botón por
     estudiante que abra un formulario con los MISMOS tipos del observador
     (Situación Tipo I/II/III, Académica, Reconocimiento), permita adjuntar FOTO
     (va a Storage, NO al JSON de sync) y escriba en `lv_observador` con estId +
     curso + docente + materia. El observador sigue siendo de solo-lectura para
     el director de grupo, pero cualquier docente puede aportar desde su clase.
  5. **Módulo NUEVO de matrícula fusionado con acudientes:** registro de
     estudiantes (documento, fecha nac., sede, grado, grupo…) amarrado a un
     acudiente, SOLO para coordinación/rector. Reemplaza que los docentes creen
     estudiantes sueltos en la planilla (btn-add-est / importar lista en el 01).
     Francy enviará luego la ficha oficial del colegio para ajustarlo.
  6. **Permisos docentes (matriz acordada):** el docente NO registra estudiantes
     nuevos ni crea cursos (eso es coordinación/rector); sí carga notas de sus
     materias/grupos, hace observaciones de clase, y (si es director) ve el
     observador/boletines/analítica de su grupo.

## ▶ POR DÓNDE RETOMAR (jul 22, 2026 — sesión 23f, Test de español extendido a 1°-11°)

- **`test-lectura.html` (español) extendido de 1°-5° a 1°-11°.** Cambios:
  · Selector de grado ahora 1° a 11°; subtítulo del header actualizado.
  · `BANCO`: 6 textos nuevos PROPIOS en español, grados 6°-11°, dificultad
    creciente (6° el río de la vereda; 11° pensamiento crítico). Los de 1°-5°
    intactos (5° sigue con su fuente ICFES declarada).
  · `VELOCIDAD` 6°-11° NUEVOS (PPM): continúan la progresión de 5° hacia el
    ritmo de lector adulto (~150 PPM). 6°:110/125/135 · 7°:115/130/140 ·
    8°:120/135/145 · 9°:125/140/150 · 10°:130/145/155 · 11°:135/150/160
    (umbrales de Muy lenta/Lenta/Óptimo). **Fuente:** de 6° en adelante NO hay
    instrumento oficial colombiano (los oficiales ICFES/PTA solo cubren 3° y
    5°), así que son GUÍA INTERNA; editables.
  · `RANGO_TEXTO` pasó de hardcode a **calcularse de VELOCIDAD** (como en el de
    inglés), lo que de paso corrigió una inconsistencia vieja de 1 unidad en el
    grado 3° ("61–84" → "60–84"). `ESTATUS_FUENTE` conserva la declaración
    exacta de 1°-5° (oficial 3° y 5°, interpolación 4°, estimación 1°/2°) y
    agrega para 6°-11° "guía interna: no existe instrumento oficial colombiano".
  · La tarjeta del test de español en `15-herramientas.html` ya decía "1° a
    11°" — ahora el módulo lo cumple de verdad.
- SW **v77**. Sintaxis verificada (`node --check` en los 3 bloques inline;
  BANCO y VELOCIDAD cubren 1-11; rangos calculados G5/G8/G11 cuadran con node).
- **PENDIENTE:** push; que Francy pruebe unos grados nuevos. Con esto quedan
  hechos los dos test de lectura (inglés y español, ambos 1°-11°, motor
  completo). Nota: los dos test declaran honestamente que de 6° a 11° (y en
  inglés en todos los grados) los rangos son guía interna sin estándar oficial
  colombiano — si el colegio define criterios propios, se cambian los números
  en `VELOCIDAD` de cada archivo.

## ▶ POR DÓNDE RETOMAR (jul 22, 2026 — sesión 23e, Test de lectura en INGLÉS)

- **`reading-aloud.html` reescrito COMPLETO** (era una herramienta pobre de 196
  líneas: sin panel de proyección, sin micrófono, sin cronómetro corriendo, sin
  reporte ni historial — el docente contaba a mano). Ahora es una copia del
  motor de `test-lectura.html` (793 líneas) adaptada al inglés: panel de
  proyección + pantalla completa, marcado de palabras por clic (pendiente→
  correcta→incorrecta→omitida), micrófono con reconocimiento **`lang='en-US'`**
  y auto-reinicio, cronómetro con PPM al minuto 1, reporte diagnóstico (55%
  velocidad + 45% calidad, escala 1.0–5.0), historial local + export CSV, envío
  de nota a la planilla vía `LV_HERR` (etiqueta 'Reading Test · Inglés').
- **Contenido en inglés, UI en español** (el docente es hispanohablante):
  · `BANCO` de 11 textos propios en inglés, grados **1° a 11°**, dificultad
    creciente (1° casi palabras sueltas; 11° pensamiento crítico).
  · `VELOCIDAD` en PPM correctas, grados 1-11. **OJO — decisión de fuente:** NO
    existe instrumento oficial colombiano de lectura en voz alta en INGLÉS como
    lengua extranjera (EFL). Los rangos son una GUÍA INTERNA basada en la
    progresión EFL + normas internacionales de inglés L1 (Hasbrouck & Tindal)
    ajustadas a la baja. `ESTATUS_FUENTE` lo declara así para TODOS los grados
    en el reporte (misma honestidad que el test de español con 1°/2°/4°). Son
    editables: cambiar los números en `VELOCIDAD` si el colegio define criterio.
  · `RANGO_TEXTO` y `ESTATUS_FUENTE` se **calculan** de `VELOCIDAD` (no se
    hardcodean) para que nunca se desincronicen de los umbrales.
  · `DESCRIPCION_CALIDAD` A–D y `generarOrientacion()` reescritas para lectura
    en inglés (phonics, choral reading, sonidos th/sh, etc.).
  · Normalizador: el de español ya sirve para inglés (minúsculas, quita signos
    y apóstrofes → "don't"→"dont", que es lo que devuelve el reconocedor).
- Enlace en `15-herramientas.html` actualizado (título "Reading Test · Inglés",
  descripción del motor completo; ya decía "1° a 11°"). SW **v76**. Sintaxis:
  `node --check` en los 3 bloques inline de reading-aloud + sw.js; verificado
  con node que BANCO y VELOCIDAD cubren 1-11 y que RANGO/clasificaVelocidad
  cuadran (G1/G6/G11).
- **PENDIENTE de esta sesión:** push; que Francy pruebe el reconocimiento de voz
  en inglés con un estudiante real (Chrome/Edge de escritorio; Safari no soporta
  SpeechRecognition). **Sigue pendiente (lo último acordado): grados 1° a 11° en
  el test de ESPAÑOL** (`test-lectura.html`, hoy solo 1°-5°) — hay que escribir
  textos nuevos 6°-11° y definir rangos con fuente declarada (los oficiales
  ICFES/PTA solo existen para 3° y 5°; de 6° en adelante no hay instrumento
  colombiano, igual que en inglés). OJO: la tarjeta del test de español en
  15-herramientas ya dice "1° a 11°" pero el módulo aún es 1°-5° — se corrige al
  hacer esa extensión.

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
bachillerato. Dueño del proyecto: Richard Sabié / Francy Vargas — **misma persona/cuenta**
(correo agresotlomaverde@gmail.com; en el historial de sesiones abajo aparece como "Francy",
nombre que usaba antes — ver aclaración jul 24, sesión 25b, al inicio de este archivo). El
admin técnico real en Supabase es richard.mhsabie@icloud.com; es el ÚNICO admin del sistema
(el resto de correos en `perfiles` son docentes). Visión a largo
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
- `modulos/20-matricula.html` — **Matrícula y Acudientes** (jul 2026, sesión 25c; pestaña
  Acudientes fusionada aquí en sesión 26d, ver ajuste arriba): registro MAESTRO de
  estudiantes (documento, fecha nac., sede, grado, grupo, estado) amarrado a un acudiente
  de `lv_acudientes`, SOLO coordinación/rector — estructura de partida, pendiente de
  ajustar con la ficha oficial del colegio. Pestañas Matrícula (form + lista con filtros),
  Acudientes (CRUD completo de acudientes, antes vivía en `09-acudientes.html`, abierto a
  cualquier docente — ahora restringido) y Resumen (conteos + estudiantes sin acudiente +
  exportar CSV). `modulos/09-acudientes.html` ya NO es un módulo funcional: solo redirige
  a `20-matricula.html?tab=acudientes` (se conserva el archivo para no romper accesos
  directos viejos). Tabla nueva
  `lv_matricula` (ver `migracion_matricula.sql`, RLS `es_coordinacion()` tanto lectura como
  escritura). NO alimenta todavía los rosters por-curso de 01-calificaciones/05-asistencia
  (`lv_estudiantes`, duplicado por materia) — es un registro paralelo; conectarlos es
  trabajo pendiente de mayor riesgo. Solo enlazado en el sidebar del portal (oculto para
  docentes normales), no en `materia-hub.html`.
- `modulos/21-horarios-coordinacion.html` — **Horarios · Coordinación** (jul 2026, sesión
  26k): SOLO coordinación/rector arma el horario semanal de cada docente (grilla 7×5),
  con detección de choques contra otros horarios ya publicados y publicación explícita
  (los cambios quedan de borrador local hasta publicar). Tabla `lv_horarios` (una fila por
  docente). `modulos/07-horario.html` pasó a ser de solo lectura para cada docente (ya no
  autoservicio) — ver ajuste de sesión 26k para el detalle completo. **Generación
  automática (sesión 29):** tarjeta "🤖 Generar horarios automáticamente" que expande
  `lv_asignaciones` en unidades de clase y las coloca sin cruces de docente ni de grupo
  (mejor esfuerzo — marca lo que no cupo), respetando siempre lo ya publicado/borrador;
  el resultado se guarda como borrador para revisar y publicar docente por docente, igual
  que el flujo manual — ver ajuste de sesión 29 para el detalle completo.
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
