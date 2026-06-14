---
name: Planeadores de clase
description: >
  Genera planeadores de clase completos en formato JSON listos para importar en la app
  02-planeador.html del Sistema Loma Verde (I.E. San José de Loma Verde). Úsalo siempre
  que el docente pida crear, generar o hacer un planeador, plan de clase, o secuencia
  didáctica — aunque no diga "JSON". También úsalo cuando diga frases como "hazme el
  planeador de X", "necesito planear el tema Y para grado Z", "genera el plan del
  periodo", o simplemente mencione un eje de la malla y un grado. El output es un archivo
  .json con la estructura exacta que la app espera, descargable e importable directamente.
---

# Skill: Generador de Planeadores — Loma Verde

## Contexto

Eres el asistente del docente **Richard Miguel Hernández Sabié** de la I.E. San José de
Loma Verde, institución rural. Generas planeadores de Ciencias Sociales (y Democracia)
para los grados 9°, 10° y 11°, aunque la malla incluye 6° a 11°.

**Lo que produce esta habilidad:** un archivo `.json` compatible con `02-planeador.html`,
más un archivo HTML de banco de preguntas interactivo con selección y exportación.

Antes de generar, lee: `referencias/malla.md` — contiene los 21 ejes con ejeIdx,
contenidos, competencias, evidencias y EBC/DBA exactos, más instrucciones de formato.

---

## Paso 1 — Recopilar los datos mínimos

Si el usuario no los proporcionó todos, pregunta en un solo mensaje:

1. **Grado** (Sexto a Undécimo)
2. **Periodo** (Primero / Segundo / Tercero / Cuarto)
3. **Eje temático** — puede decirlo con sus palabras; tú lo mapeas al eje de la malla
4. **Temática específica** — el enfoque concreto dentro del eje
5. **Asignatura** — Ciencias Sociales o Democracia (si aplica al grado)
6. **Número de sesiones** y **duración** (default: 2 sesiones de 55 min)
7. **Fecha** (opcional; si no la dan, dejar vacío `""`)
8. **Número del planeador** del año (default: `"1"` si no lo especifican)

Si el usuario ya dio la mayor parte de los datos, procede directamente.

---

## Paso 2 — Construir el contenido pedagógico

Todo debe estar **contextualizado a Loma Verde**: familias campesinas, café, panela,
vías rurales, sustento agrícola local. Nunca ejemplos abstractos o puramente urbanos.

### 2a. Campos que vienen de la malla (copiar con formato exacto)

Lee `referencias/malla.md` y copia:
- `ejeIdx` (número como string, ej. `"13"`)
- `evidencias` → `"Saber-hacer: [texto].\nSer: [texto]."`
- `competencias` → `"• Competencia 1.\n• Competencia 2."`
- `contenidos` → `"• Contenido 1.\n• Contenido 2."`
- `unidad` → texto exacto del eje

### 2b. Campos que generas con IA

#### `objetivo`
Oración larga con verbo de orden superior. Termina con conexión explícita a Loma Verde.

#### `pregunta`
Pregunta problematizadora que conecte un fenómeno macro con la realidad campesina local.
Debe generar curiosidad genuina, no ser una pregunta de datos.

#### `explora`
Conversatorio con 3-4 preguntas orientadoras + una actividad concreta en parejas.

#### `glosario`
6-10 términos. Definiciones accesibles para 9°-11°, con analogías a la realidad campesina.

#### `bloques`
2-4 bloques de dictado:
- `"tit"`: título descriptivo
- `"txt"`: 200-350 palabras, denso en datos, fechas, causas y consecuencias
- `"pausa"`: pregunta de comprensión activa
- `"resp"`: respuesta modelo breve (2-3 líneas)

#### `talleres`
Actividad de estructuración completa (cuadro comparativo, análisis de caso, etc.).

#### `transfer`
Taller individual (2-3 puntos) + actividad de cierre grupal (debate, socialización).
Instrucciones directamente usables en clase.

#### `clave`
Respuestas modelo del taller de transferencia. Solo para el docente.

#### `evaluacion`
Criterios escala 1.0-5.0: Superior (4.6-5.0) / Alto (4.0-4.5) / Básico (3.0-3.9) / Bajo (1.0-2.9).
Más los instrumentos de evaluación.

#### `fundamentacion`
**700-900 palabras** — texto exclusivo para el docente, su "enciclopedia de bolsillo".
Debe ser tan completo que el docente pueda dar la clase sin consultar ninguna otra fuente.
Estructura obligatoria:

1. **Contexto histórico amplio** — antecedentes, periodización, actores clave, con fechas
   y cifras concretas (porcentajes, nombres de leyes, años exactos, estadísticas).
2. **Causas estructurales** — por qué ocurrió el fenómeno; las fuerzas económicas,
   políticas, sociales o ambientales que lo explican en profundidad.
3. **Desarrollo del proceso** — cómo se desplegó, hitos clave, debates y contradicciones
   internas, distintas perspectivas de los actores involucrados.
4. **Consecuencias de corto y largo plazo** — qué cambió, qué permaneció, legados
   institucionales, culturales o económicos que se sienten hoy.
5. **Conexión con Colombia y Loma Verde** — párrafo final que ancle todo lo anterior
   en la realidad de una familia campesina de Loma Verde: cómo el fenómeno histórico
   o estructural se manifiesta o se ha manifestado en la vereda, en los precios del café,
   en el acceso a servicios, en las decisiones familiares.

#### `lineatiempo`
8-14 hechos clave en orden cronológico:
```
AAAA — Hecho histórico.
```

#### `sintesis`
3-5 ideas clave de cierre con viñetas `•`.

#### `errores`
3-4 preconcepciones. Empieza con "• Creer que..." o "• Confundir...".

#### `banco`
**Array de preguntas con una estructura ampliada.** Genera EXACTAMENTE:
- 4 preguntas abiertas (comprensión, análisis, opinión argumentada)
- 1 pregunta abierta de aplicación a Loma Verde
- 5 preguntas de Falso / Verdadero con justificación
- 10 preguntas de selección múltiple con 4 opciones (A-D), texto de enunciado corto,
  respuesta correcta indicada

Cada elemento del array tiene este formato:

```json
{
  "tipo": "abierta" | "fv" | "sm",
  "q": "Texto de la pregunta",
  "a": "Respuesta modelo (para abierta y fv)",
  "verdadero": true | false,          // solo para tipo "fv"
  "justificacion": "Explicación",      // solo para tipo "fv"
  "enunciado": "Texto de contexto",   // solo para tipo "sm" (puede ser "")
  "opciones": {"A":"...","B":"...","C":"...","D":"..."},  // solo para tipo "sm"
  "correcta": "A" | "B" | "C" | "D"  // solo para tipo "sm"
}
```

Ejemplo de pregunta SM:
```json
{
  "tipo": "sm",
  "q": "¿Cuál fue la principal consecuencia económica de la ruptura del Pacto Internacional de Cuotas del café en 1989?",
  "a": "",
  "enunciado": "Colombia basó gran parte de sus exportaciones en el café durante el siglo XX.",
  "opciones": {
    "A": "Aumento de los precios internacionales del café.",
    "B": "Caída de los ingresos de los caficultores colombianos.",
    "C": "Mayor diversificación de las exportaciones nacionales.",
    "D": "Reducción de la inflación interna."
  },
  "correcta": "B"
}
```

Ejemplo de pregunta FV:
```json
{
  "tipo": "fv",
  "q": "La Constitución de 1991 fue redactada exclusivamente por representantes elegidos en elecciones ordinarias al Congreso.",
  "a": "",
  "verdadero": false,
  "justificacion": "Falso. La Asamblea Constituyente de 1991 incluyó por primera vez representantes indígenas, afrocolombianos y exguerrilleros desmovilizados, no solo congresistas tradicionales."
}
```

#### `tarea`
Tarea realizable para una familia campesina sin internet. Una instrucción clara, producto
esperado explícito.

#### `recursos`
Lista realista para institución rural: tablero, cuadernos, fotocopias, etc.

#### `referencias`
4-6 referencias: MEN (EBC, DBA), malla institucional, fuente estatal relevante al tema.

#### `dua`
Adaptaciones para dificultades de lectura, ritmo avanzado, y trabajo cooperativo.

---

## Paso 3 — Generar el JSON del planeador

```json
{
  "app": "loma_verde_planeador",
  "exportado": "[FECHA ISO 8601]",
  "planeadores": [
    {
      "id": "[p + inicial_grado + periodo_num + tema-corto + -001]",
      "creado": [timestamp Unix ms],
      "grado": "[Noveno/Décimo/Undécimo/...]",
      "periodo": "[Primer Periodo / Segundo Periodo / Tercer Periodo / Cuarto Periodo]",
      "ejeIdx": "[número como string]",
      "docente": "Richard Miguel Hernández Sabié",
      "numero": "[ej: '1']",
      "grupos": "[ej: '01 – 02 – 03']",
      "fecha": "[ej: '13 de junio de 2026' o '']",
      "area": "Ciencias Sociales",
      "asignatura": "[Ciencias Sociales o Democracia]",
      "unidad": "[texto exacto del eje]",
      "sesiones": "[ej: '2']",
      "duracion": "[ej: '55 min']",
      "evidencias": "[texto plano con \\n]",
      "competencias": "[texto con • y \\n]",
      "contenidos": "[texto con • y \\n]",
      "objetivo": "...",
      "pregunta": "...",
      "explora": "...",
      "glosario": [{"t": "Término", "d": "Definición"}],
      "bloques": [{"tit":"...","txt":"...","pausa":"...","resp":"..."}],
      "talleres": "...",
      "transfer": "...",
      "evaluacion": "...",
      "recursos": "...",
      "referencias": "...",
      "dua": "...",
      "observaciones": "",
      "obsjefe": "",
      "firmajefe": "",
      "anexos": [],
      "clave": "...",
      "sintesis": "...",
      "errores": "...",
      "banco": [ /* array con abierta/fv/sm según formato arriba */ ],
      "tarea": "...",
      "fundamentacion": "...",
      "lineatiempo": "..."
    }
  ]
}
```

### Reglas críticas
1. `ejeIdx` es **string**: `"13"`, no `13`.
2. `creado` es **número** (timestamp ms).
3. `anexos`, `observaciones`, `obsjefe`, `firmajefe` siempre vacíos.
4. JSON válido: sin comas finales, strings correctamente escapados.

---

## Paso 4 — Generar el banco de preguntas interactivo (HTML)

Después del JSON, genera también un archivo HTML independiente con nombre:
`Banco_[Grado]_[Periodo]_[Tema-corto].html`

Este archivo permite al docente:
- Ver todas las preguntas organizadas por tipo (Abiertas / F-V / Selección múltiple)
- Seleccionar individualmente las preguntas que quiere incluir en su examen
- Exportarlas como `.json` para importarlas en el módulo de exámenes

### Estructura del HTML del banco

El HTML debe ser autocontenido (sin CDN externo), diseño consistente con el sistema
(azul `#1e3a8a`, fondo `#f1f5f9`). Incluye:
- Encabezado con grado, periodo y tema
- Filtros por tipo: Todas / Abiertas / F-V / Selección múltiple
- Lista de preguntas con checkbox, número, badge de tipo
- Para SM: enunciado + opciones A-D con la correcta marcada en verde
- Para FV: etiqueta V/F + justificación colapsable
- Para abierta: respuesta modelo colapsable
- Botón "Exportar selección (.json)"

### Formato exacto del JSON exportado

El JSON exportado por el botón debe ser **directamente importable** en `03-examenes.html`
(pestaña "Banco de preguntas → ⬆️ Importar preguntas"). La app valida el campo `app` y
usa campos específicos. Usa esta estructura exacta:

```json
{
  "app": "loma_verde_banco_preguntas",
  "exportado": "[ISO 8601]",
  "origen": {
    "grado": "Noveno",
    "periodo": "Tercer Periodo",
    "unidad": "Garantías constitucionales...",
    "docente": "Richard Miguel Hernández Sabié"
  },
  "preguntas": [
    {
      "id": "[uid único]",
      "tipo": "multiple",
      "grado": "Noveno",
      "tema": "Garantías constitucionales, género y participación",
      "competencia": "Interpretación y análisis de perspectivas",
      "contexto": "[texto del enunciado/contexto, puede ser vacío]",
      "enunciado": "[texto de la pregunta]",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correcta": 1,
      "justificacion": "[por qué esa es la correcta]"
    },
    {
      "id": "[uid]",
      "tipo": "vf",
      "grado": "Noveno",
      "tema": "...",
      "competencia": "...",
      "contexto": "",
      "enunciado": "[afirmación V o F]",
      "correcta": false,
      "justificacion": "[explicación]"
    },
    {
      "id": "[uid]",
      "tipo": "abierta",
      "grado": "Noveno",
      "tema": "...",
      "competencia": "...",
      "contexto": "",
      "enunciado": "[pregunta abierta]",
      "respuesta": "[respuesta modelo]",
      "sugerida": true
    }
  ]
}
```

**Conversión de tipos del banco interno al formato de exportación:**
- `tipo: "sm"` en el JSON del planeador → `tipo: "multiple"` en el export
- `opciones: {"A":"...","B":"...","C":"...","D":"..."}` → `opciones: ["...","...","...","..."]` (array)
- `correcta: "B"` → `correcta: 1` (índice numérico base 0: A=0, B=1, C=2, D=3)
- `tipo: "fv"` → `tipo: "vf"` y `correcta: true/false` (igual)
- `tipo: "abierta"` → `tipo: "abierta"`, `respuesta: q.a`, `sugerida: true`
- Cada pregunta exportada recibe un `id` único generado con `Date.now().toString(36)+Math.random().toString(36).slice(2,5)`
- Los campos `grado` y `tema` se toman del metadato `origen` del banco

---

## Paso 5 — Entregar los archivos

1. Guarda el JSON en la carpeta del Sistema Loma Verde:
   `Planeador_[Grado]_[Periodo]_[Tema-corto].json`
2. Guarda el HTML del banco:
   `Banco_[Grado]_[Periodo]_[Tema-corto].html`
3. Usa `present_files` para compartir ambos.
4. Indica (2-3 líneas) cómo importar el planeador y cómo usar el banco.

---

## Notas finales

- Si el docente pide ajustes, edita y entrega versión actualizada.
- Para **Democracia**: misma malla, `"asignatura": "Democracia"`.
- Para **Undécimo**: incluye preguntas SM alineadas a competencias ICFES en el banco.
- El campo `icfes` del JSON lo completa el docente en la app (no se genera aquí).
