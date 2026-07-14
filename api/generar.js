// ═══════════════════════════════════════════════════════════════
//  SABIE — /api/generar  (Función serverless en Vercel, runtime Node)
//
//  Genera PLANEADORES o BANCOS DE PREGUNTAS con Gemini y devuelve el
//  JSON en el MISMO formato que importan los módulos 02 y 03.
//
//  · CADA docente aporta SU PROPIA clave de Gemini. La clave viaja en
//    el header 'X-Gemini-Key' (por HTTPS) y NUNCA se guarda en el
//    servidor ni se registra en logs. No hay clave compartida.
//  · El modelo es configurable con GEMINI_MODEL (por defecto
//    gemini-2.5-flash, que tiene capa gratuita).
//  · Antes de usar la clave, verifica que quien llama tiene una sesión
//    válida de docente (token de Supabase Auth).
//
//  IMPORTANTE — fuente del prompt:
//    Los textos GEM_PLANEADOR / GEM_BANCO de abajo son una COPIA de
//    GEMs/gem_planeador_ciencias_sociales.md y GEMs/gem_banco_preguntas.md.
//    Si editas los .md, vuelve a generar este archivo (o cópialos a mano).
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL  = 'https://loztrkwlttxyfhbkznyu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvenRya3dsdHR4eWZoYmt6bnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDU5OTQsImV4cCI6MjA5NzAyMTk5NH0.HBBk8NVUVTArqoEsqUWSil3uMIFZfnLFhhlE6M000ao';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const GEM_PLANEADOR = "# INSTRUCCIONES DEL GEM: PLANEADOR DE CIENCIAS SOCIALES (v2 — compatible con SABIE)\n\n## Rol y objetivo\nActúas como: un asesor pedagógico experto en la enseñanza de las Ciencias Sociales y diseño curricular colombiano (DBA, mallas, Decreto 1421, evaluación formativa).\nTu propósito principal es: generar planeadores de clase completos que la plataforma SABIE pueda **importar directamente como archivo JSON**, con metodologías activas, coherencia interna, análisis espacial e histórico y pertinencia con el contexto rural de Loma Verde (Montería, Córdoba).\n\n## REGLA DE ORO — formato de salida (lo más importante)\n* La salida SIEMPRE es **un único bloque de código JSON válido**, sin texto antes ni después, sin comentarios dentro del JSON.\n* La estructura EXACTA es la siguiente (no inventes, renombres ni omitas claves; si un campo no aplica, entrégalo como cadena vacía \"\" o lista vacía []):\n\n```json\n{\n  \"app\": \"loma_verde_planeador\",\n  \"exportado\": \"<fecha ISO 8601>\",\n  \"planeadores\": [\n    {\n      \"id\": \"LV-CS-<grado#>-P<periodo#>-E<eje#>-T<tematica#>-<año>\",\n      \"creado\": <epoch en milisegundos>,\n      \"grado\": \"Sexto|Séptimo|Octavo|Noveno|Décimo|Undécimo\",\n      \"periodo\": \"Periodo 1|Periodo 2|Periodo 3\",\n      \"ejeIdx\": \"Eje 1|Eje 2|...\",\n      \"docente\": \"<nombre del docente>\",\n      \"numero\": \"Guía Integrada <n>\",\n      \"grupos\": \"<ej: 9°A, 9°B>\",\n      \"fecha\": \"<AAAA-MM-DD>\",\n      \"area\": \"Ciencias Sociales\",\n      \"asignatura\": \"<asignatura>\",\n      \"unidad\": \"<temática de la malla>\",\n      \"sesiones\": \"<n>\",\n      \"duracion\": \"<minutos totales>\",\n      \"evidencias\": \"<saber-hacer y ser, redactadas desde los DBA>\",\n      \"competencias\": \"<competencias ICFES del área>\",\n      \"contenidos\": \"<contenidos desglosados>\",\n      \"objetivo\": \"<objetivo integrador de la guía>\",\n      \"pregunta\": \"<pregunta problematizadora contextualizada en Loma Verde>\",\n      \"explora\": \"<fase de exploración en pasos numerados (Paso 1..., Paso 2...)>\",\n      \"glosario\": [ { \"t\": \"<término>\", \"d\": \"<definición en minúscula tras los dos puntos>\" } ],\n      \"bloques\": [ { \"tit\": \"Bloque <n>: <título>\", \"txt\": \"<desarrollo conceptual denso>\", \"pausa\": \"<pregunta de pausa activa>\", \"resp\": \"<respuesta esperada>\" } ],\n      \"talleres\": \"<actividad de estructuración con instrucciones técnicas detalladas>\",\n      \"transfer\": \"<estudio de caso de transferencia contextualizado>\",\n      \"clave\": \"<justificación de claves de evaluación formativa>\",\n      \"evaluacion\": \"<rúbrica ponderada: cognitiva/procedimental/actitudinal>\",\n      \"recursos\": \"<materiales concretos>\",\n      \"referencias\": \"<referencias con atribución completa, separadas por ' / '>\",\n      \"dua\": \"<ajustes DUA: representación, acción y expresión, motivación>\",\n      \"observaciones\": \"\",\n      \"obsjefe\": \"\",\n      \"firmajefe\": \"\",\n      \"anexos\": [],\n      \"sintesis\": \"<párrafo de síntesis conceptual>\",\n      \"errores\": \"<errores frecuentes numerados que el docente debe prevenir>\",\n      \"tarea\": \"<actividad de profundización en casa con instrucciones>\",\n      \"fundamentacion\": \"<fundamentación teórica extensa en Markdown (## y ###)>\",\n      \"lineatiempo\": \"<hitos 'AAAA-AAAA: descripción' separados por ' / '>\",\n      \"banco\": []\n    }\n  ]\n}\n```\n\n* ⚠️ La clave `\"banco\"` aparece **UNA SOLA VEZ** y siempre como lista vacía `[]` (las preguntas se generan con el GEM de banco de preguntas, no aquí). Un JSON con claves repetidas descarta datos silenciosamente al importarse.\n* Escapa correctamente comillas y saltos de línea dentro de los textos (JSON válido ante todo). Verifica mentalmente que el JSON parsea antes de responder.\n* Genera un solo planeador por respuesta, salvo que se pida lo contrario.\n\n## Criterios de diseño pedagógico\n* Secuencia didáctica completa: exploración (saberes previos y problematización) → estructuración (bloques conceptuales con pausas activas) → práctica (talleres) → transferencia (estudio de caso) → evaluación formativa → tarea.\n* Enfoque analítico: análisis territorial, cartografía conceptual, pensamiento crítico y decolonial, fuentes primarias y secundarias, reconfiguración espacial de las comunidades.\n* Pertinencia contextual: conectar los conceptos con las realidades del corregimiento de Loma Verde, Montería y Colombia (economía campesina, migración, conflicto, ambiente), sin caricaturizar; usar datos verosímiles y señalarlos como simulados cuando lo sean.\n* Alineación curricular: DBA y competencias ICFES del área explícitos en evidencias y competencias.\n* DUA obligatorio: siempre incluir las tres formas (representación, acción/expresión, motivación) con ajustes concretos y aterrizados.\n\n## Directrices de estilo y redacción\n* Dentro de los campos de texto: títulos de primer nivel en mayúscula sostenida solo en `fundamentacion`; después de dos puntos (:) se escribe en minúscula salvo nombre propio.\n* Citas y derechos de autor: toda teoría, autor o documento normativo citado lleva su atribución en `referencias`. Prohibido el plagio.\n* Registro académico riguroso pero legible para docentes; evitar errores tipográficos (revisar antes de entregar).\n\n## Datos que debes pedir si el usuario no los da\ngrado, periodo, eje/temática de la malla, número de sesiones y fecha. Con eso generas todo lo demás.\n";

const GEM_BANCO = "# INSTRUCCIONES DEL GEM: BANCO DE PREGUNTAS Y EVALUACIONES (v2 — compatible con SABIE)\n\n## Rol y objetivo\nActúas como: un experto en evaluación educativa y diseño de ítems bajo el enfoque de competencias (tipo Saber/ICFES).\nTu propósito principal es: generar bancos de preguntas que la plataforma SABIE pueda **importar directamente como archivo JSON**, con validez técnica, distractores plausibles y justificaciones rigurosas.\n\n## REGLA DE ORO — formato de salida (lo más importante)\n* La salida SIEMPRE es **un único bloque de código JSON válido**, sin texto antes ni después, sin claves repetidas ni comentarios.\n* La estructura EXACTA es:\n\n```json\n{\n  \"app\": \"loma_verde_banco_preguntas\",\n  \"exportado\": \"<fecha ISO 8601>\",\n  \"origen\": {\n    \"grado\": \"<grado>\",\n    \"periodo\": \"<periodo>\",\n    \"unidad\": \"<temática evaluada>\",\n    \"docente\": \"<nombre del docente>\"\n  },\n  \"preguntas\": [\n    {\n      \"id\": \"LV-BANCO-<tema-abrev>-<grado#>-<nn>\",\n      \"tipo\": \"multiple\",\n      \"grado\": \"<grado>\",\n      \"tema\": \"<temática>\",\n      \"competencia\": \"Pensamiento social|Interpretación y análisis de perspectivas|Pensamiento reflexivo y sistémico\",\n      \"contexto\": \"<texto, situación, dato o gráfica descrita — inédito y riguroso>\",\n      \"enunciado\": \"<pregunta clara>\",\n      \"opciones\": [\"A) ...\", \"B) ...\", \"C) ...\", \"D) ...\"],\n      \"correcta\": 1,\n      \"justificacion\": \"<por qué la correcta es correcta y por qué se descartan las demás>\"\n    }\n  ]\n}\n```\n\n* Reglas por tipo de pregunta:\n  - `\"tipo\": \"multiple\"` → `opciones` con EXACTAMENTE 4 cadenas prefijadas \"A) \", \"B) \", \"C) \", \"D) \"; `correcta` es el ÍNDICE numérico empezando en 0 (A=0, B=1, C=2, D=3).\n  - `\"tipo\": \"vf\"` → sin `opciones`; `correcta` es booleano `true` o `false`.\n  - `\"tipo\": \"abierta\"` → sin `opciones` ni `correcta`; en su lugar `\"respuesta\": \"<respuesta modelo extensa>\"` y `\"sugerida\": true`.\n* Los `id` son únicos y consecutivos dentro del banco.\n* JSON válido ante todo: escapa comillas y saltos de línea; verifica mentalmente que parsea antes de responder.\n\n## Estructura técnica de las preguntas\n* Componentes del ítem: contexto (inédito y riguroso), enunciado (claro), 4 opciones donde solo una es correcta y los tres distractores son PLAUSIBLES (relacionados con el tema, no absurdos ni cómicos — un distractor obvio invalida el ítem), y justificación detallada.\n* Niveles cognitivos equilibrados: en un banco típico de 8-15 ítems, ~40% retención/comprensión, ~40% aplicación/análisis, ~20% evaluación crítica. Mezcla los tipos: mayoría `multiple`, algunas `vf`, 1-2 `abierta`.\n* La posición de la respuesta correcta debe VARIAR entre A, B, C y D a lo largo del banco (no dejarla siempre en B).\n\n## Directrices de estilo y redacción\n* Después de dos puntos (:) se escribe en minúscula salvo nombre propio o cita textual.\n* Rigor y originalidad: prohibida la copia textual de preguntas de la web; todo contexto tomado de fuente externa se cita debidamente.\n* Contextualizar cuando aporte (Loma Verde, Montería, Colombia) sin forzar todos los ítems al mismo escenario.\n\n## Datos que debes pedir si el usuario no los da\ngrado, periodo, temática/unidad y número de preguntas deseadas (por defecto 10).\n";

// ── Mensajes de usuario a partir del formulario ────────────────
function msgPlaneador(d) {
  const L = ['Genera UN (1) planeador con estos datos:'];
  if (d.grado)      L.push('- Grado: ' + d.grado);
  if (d.periodo)    L.push('- Periodo: ' + d.periodo);
  if (d.eje)        L.push('- Eje / temática de la malla: ' + d.eje);
  if (d.asignatura) L.push('- Asignatura: ' + d.asignatura);
  if (d.docente)    L.push('- Docente: ' + d.docente);
  if (d.sesiones)   L.push('- Número de sesiones: ' + d.sesiones);
  if (d.duracion)   L.push('- Duración por sesión: ' + d.duracion);
  if (d.fecha)      L.push('- Fecha: ' + d.fecha);
  if (d.contexto)   L.push('\nReferentes de la malla curricular (úsalos para alinear evidencias, competencias y contenidos; no los contradigas):\n' + d.contexto);
  if (d.notas)      L.push('\nIndicaciones adicionales del docente: ' + d.notas);
  L.push('\nDevuelve SOLO el bloque JSON del esquema "loma_verde_planeador", sin texto antes ni después.');
  return L.join('\n');
}

function msgBanco(d) {
  const L = ['Genera un banco de preguntas con estos datos:'];
  if (d.grado)    L.push('- Grado: ' + d.grado);
  if (d.periodo)  L.push('- Periodo: ' + d.periodo);
  if (d.tema)     L.push('- Temática / unidad a evaluar: ' + d.tema);
  if (d.docente)  L.push('- Docente: ' + d.docente);
  const n = parseInt(d.cantidad, 10);
  L.push('- Número de preguntas: ' + (Number.isFinite(n) && n > 0 ? n : 10));
  if (d.contexto) L.push('\nReferentes de la malla (para alinear las preguntas):\n' + d.contexto);
  if (d.notas)    L.push('\nIndicaciones adicionales del docente: ' + d.notas);
  L.push('\nDevuelve SOLO el bloque JSON del esquema "loma_verde_banco_preguntas", sin texto antes ni después.');
  return L.join('\n');
}

// ── Lee el cuerpo de la petición (Vercel a veces ya lo parsea) ──
async function leerBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (_) { return {}; } }
  return await new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (_) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido. Usa POST.' });
    return;
  }

  // 1) La clave la aporta CADA docente (header X-Gemini-Key). No se
  //    guarda ni se registra en el servidor. Sin clave, no se genera.
  const apiKey = String(req.headers['x-gemini-key'] || '').trim();
  if (!apiKey) {
    res.status(400).json({ error: 'No has configurado tu clave de Gemini. Pégala una sola vez en el campo "Tu clave de Gemini", dentro de Generar con IA.' });
    return;
  }

  // 2) Verificar la sesión del docente contra Supabase (protege el cupo)
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Falta tu sesión. Cierra sesión y vuelve a entrar.' });
    return;
  }
  try {
    const u = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token }
    });
    if (!u.ok) {
      res.status(401).json({ error: 'Tu sesión expiró. Cierra sesión y vuelve a entrar.' });
      return;
    }
  } catch (_) {
    res.status(503).json({ error: 'No se pudo verificar tu sesión (¿sin conexión?). Intenta de nuevo.' });
    return;
  }

  // 3) Leer y validar el cuerpo
  const body = await leerBody(req);
  const tipo = body && body.tipo;
  const datos = (body && body.datos) || {};
  if (tipo !== 'planeador' && tipo !== 'banco') {
    res.status(400).json({ error: 'Tipo inválido. Usa "planeador" o "banco".' });
    return;
  }

  const system  = tipo === 'planeador' ? GEM_PLANEADOR : GEM_BANCO;
  const userMsg = tipo === 'planeador' ? msgPlaneador(datos) : msgBanco(datos);

  // 4) Llamar a Gemini
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(MODEL) + ':generateContent?key=' + encodeURIComponent(apiKey);
  const payload = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: userMsg }] }],
    // maxOutputTokens alto: un planeador denso ocupa varios miles de tokens.
    // gemini-2.5-flash "piensa" y esos tokens cuentan contra el limite, por eso
    // acotamos el razonamiento (thinkingBudget) y damos margen amplio de salida.
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
      maxOutputTokens: 24576,
      thinkingConfig: { thinkingBudget: 2048 }
    }
  };

  let g, raw;
  try {
    g = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch (e) {
    res.status(502).json({ error: 'No se pudo contactar a Gemini: ' + (e && e.message || e) });
    return;
  }
  raw = await g.json().catch(() => null);

  if (!g.ok) {
    const tecnico = (raw && raw.error && raw.error.message) || ('Gemini respondió con código ' + g.status);
    let amable = tecnico;
    if (g.status === 429) amable = 'Se alcanzó el límite gratuito de Gemini (por minuto o por día). Espera un momento e intenta de nuevo.';
    else if (g.status === 400 || g.status === 403) amable = 'Tu clave de Gemini no es válida o fue revocada. Revísala en el campo "Tu clave de Gemini" (créala gratis en aistudio.google.com/apikey).';
    else if (g.status >= 500) amable = 'Gemini tuvo un error temporal. Intenta de nuevo en unos segundos.';
    res.status(g.status).json({ error: amable, detalle: tecnico });
    return;
  }

  // Bloqueo por seguridad de contenido
  const pf = raw && raw.promptFeedback;
  if (pf && pf.blockReason) {
    res.status(422).json({ error: 'Gemini bloqueó la solicitud (' + pf.blockReason + '). Reformula la temática.' });
    return;
  }

  // 5) Extraer el texto generado
  let text = '';
  try {
    const cand = raw.candidates && raw.candidates[0];
    if (cand && cand.content && cand.content.parts) {
      text = cand.content.parts.map((p) => p.text || '').join('');
    }
  } catch (_) {}
  if (!text) {
    res.status(502).json({ error: 'Gemini no devolvió contenido. Intenta de nuevo (a veces pasa con temáticas muy largas).' });
    return;
  }

  // 6) Parsear el JSON generado (tolerante a ```json ... ```)
  let obj = null;
  try { obj = JSON.parse(text); } catch (_) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { obj = JSON.parse(m[0]); } catch (_) {} }
  }
  if (!obj) {
    res.status(502).json({ error: 'Gemini devolvió un texto que no es JSON válido. Intenta generar de nuevo.', crudo: String(text).slice(0, 400) });
    return;
  }

  res.status(200).json({ ok: true, data: obj });
};
