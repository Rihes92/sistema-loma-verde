// ═══════════════════════════════════════════════════════════════
//  Sistema Loma Verde — Catálogo pedagógico de Inclusión
//  Archivo: inclusion-catalogo.js (usado por 11-inclusion.html)
//
//  Fuentes: Pautas DUA CAST 2018/3.0 (udlguidelines.cast.org,
//  traducción educadua.es) · Decreto 1421/2017 e instructivo
//  PIAR del MEN (ejemplos de ajustes razonables, 12/12/2017).
// ═══════════════════════════════════════════════════════════════

// ── Puntos de verificación DUA (CAST) ──────────────────────────
const DUA = {
  '1.1':{pr:'Representación',pa:'Percepción',t:'Personalizar la visualización de la información',e:'letra grande, buen contraste, espacio entre líneas, material limpio y ordenado'},
  '1.2':{pr:'Representación',pa:'Percepción',t:'Alternativas para la información auditiva',e:'apoyos escritos o gráficos de lo que se dice, instrucciones también por escrito'},
  '1.3':{pr:'Representación',pa:'Percepción',t:'Alternativas para la información visual',e:'descripción oral de imágenes y esquemas, material táctil o concreto'},
  '2.1':{pr:'Representación',pa:'Lenguaje y símbolos',t:'Clarificar vocabulario y símbolos',e:'glosario previo, palabras clave explicadas con ejemplos cercanos al contexto rural'},
  '2.2':{pr:'Representación',pa:'Lenguaje y símbolos',t:'Clarificar sintaxis y estructura',e:'frases cortas, instrucciones paso a paso, un solo verbo por instrucción'},
  '2.3':{pr:'Representación',pa:'Lenguaje y símbolos',t:'Apoyar la decodificación de textos y símbolos',e:'lectura acompañada, texto con apoyos, tiempo extra de lectura'},
  '2.5':{pr:'Representación',pa:'Lenguaje y símbolos',t:'Ilustrar con múltiples medios',e:'imagen + texto + explicación oral del mismo contenido; mapas, fotos, objetos reales'},
  '3.1':{pr:'Representación',pa:'Comprensión',t:'Activar conocimientos previos',e:'iniciar con lo que el estudiante ya vive o conoce (vereda, familia, cultivos, río)'},
  '3.2':{pr:'Representación',pa:'Comprensión',t:'Destacar ideas principales y relaciones',e:'organizador gráfico, subrayado guiado, esquema en el tablero'},
  '3.3':{pr:'Representación',pa:'Comprensión',t:'Guiar el procesamiento paso a paso',e:'dividir la tarea en pasos pequeños con verificación en cada uno'},
  '3.4':{pr:'Representación',pa:'Comprensión',t:'Maximizar la transferencia',e:'aplicar lo aprendido a una situación real del entorno del estudiante'},
  '4.1':{pr:'Acción y expresión',pa:'Interacción física',t:'Variar los métodos de respuesta',e:'responder oralmente, señalando, dibujando o manipulando material concreto'},
  '4.2':{pr:'Acción y expresión',pa:'Interacción física',t:'Optimizar el acceso a herramientas y apoyos',e:'ubicación preferencial en el aula, material adaptado, apoyos técnicos disponibles'},
  '5.1':{pr:'Acción y expresión',pa:'Expresión y comunicación',t:'Usar múltiples medios de comunicación',e:'permitir demostrar lo aprendido con maqueta, dibujo, exposición oral, dramatización o escrito'},
  '5.2':{pr:'Acción y expresión',pa:'Expresión y comunicación',t:'Usar múltiples herramientas de composición',e:'plantillas, inicios de frase, dictado al docente o a un compañero'},
  '5.3':{pr:'Acción y expresión',pa:'Expresión y comunicación',t:'Graduar los niveles de apoyo en la práctica',e:'primero con ayuda total, luego con pistas, luego solo — retirando apoyo gradualmente'},
  '6.1':{pr:'Acción y expresión',pa:'Funciones ejecutivas',t:'Guiar el establecimiento de metas',e:'meta visible y alcanzable para la clase de hoy, acordada con el estudiante'},
  '6.2':{pr:'Acción y expresión',pa:'Funciones ejecutivas',t:'Apoyar la planificación',e:'lista de pasos visible, agenda de la clase en el tablero'},
  '6.3':{pr:'Acción y expresión',pa:'Funciones ejecutivas',t:'Facilitar la gestión de información',e:'tabla o ficha para ir consignando lo encontrado'},
  '6.4':{pr:'Acción y expresión',pa:'Funciones ejecutivas',t:'Monitorear el progreso',e:'lista de chequeo simple para que el estudiante marque lo que ya logró'},
  '7.1':{pr:'Implicación',pa:'Captar el interés',t:'Optimizar la elección y la autonomía',e:'dejar escoger entre 2-3 opciones de tema, material o forma de trabajar'},
  '7.2':{pr:'Implicación',pa:'Captar el interés',t:'Optimizar relevancia, valor y autenticidad',e:'conectar el tema con la vida de la vereda, el trabajo familiar, intereses del estudiante'},
  '7.3':{pr:'Implicación',pa:'Captar el interés',t:'Minimizar amenazas y distracciones',e:'ambiente predecible, anticipar cambios de actividad, evitar exponer al estudiante'},
  '8.2':{pr:'Implicación',pa:'Esfuerzo y persistencia',t:'Variar el nivel de desafío',e:'misma meta con niveles de exigencia distintos; versión básica y versión reto'},
  '8.3':{pr:'Implicación',pa:'Esfuerzo y persistencia',t:'Fomentar colaboración y comunidad',e:'trabajo en parejas o grupos pequeños con roles claros, tutoría entre compañeros'},
  '8.4':{pr:'Implicación',pa:'Esfuerzo y persistencia',t:'Retroalimentación orientada a la mejora',e:'devolución frecuente, específica y centrada en el proceso, no en la persona'},
  '9.2':{pr:'Implicación',pa:'Autorregulación',t:'Facilitar estrategias de afrontamiento',e:'pausas activas, rincón de calma, señales acordadas para pedir ayuda'},
  '9.3':{pr:'Implicación',pa:'Autorregulación',t:'Desarrollar autoevaluación y reflexión',e:'al cierre: ¿qué aprendí?, ¿qué me costó?, ¿qué necesito mañana?'},
};

// ── Barreras (BAP) → pautas DUA → ajustes tipo (instructivo MEN) ─
const BARRERAS = [
  // COMUNICATIVAS
  {id:'b_texto',   cat:'Comunicativas', t:'Se le dificulta comprender textos largos o densos',
   dua:['2.1','2.3','3.2','2.5'],
   ajustes:['Entregar textos cortos y con vocabulario clarificado','Acompañar todo texto con imagen u organizador gráfico','Lectura guiada por el docente o en parejas','Dar tiempo adicional para la lectura']},
  {id:'b_oral',    cat:'Comunicativas', t:'Se le dificulta expresarse oralmente / participar hablando',
   dua:['5.1','5.2','7.3'],
   ajustes:['Permitir respuestas escritas, dibujadas o señaladas','No obligar a hablar en público; ofrecer alternativas','Dar tiempo para preparar la respuesta antes de pedirla']},
  {id:'b_escrito', cat:'Comunicativas', t:'Se le dificulta producir textos escritos',
   dua:['5.2','5.1','5.3'],
   ajustes:['Usar plantillas e inicios de frase','Permitir dictado al docente o a un compañero','Evaluar el contenido, no la ortografía/caligrafía (según el caso)']},
  {id:'b_escucha', cat:'Comunicativas', t:'Pierde la información que solo se da hablada (atención auditiva o hipoacusia)',
   dua:['1.2','2.2','6.2'],
   ajustes:['Instrucciones también por escrito o con imagen','Hablar de frente al estudiante, verificar comprensión','Ubicación cerca del docente']},
  {id:'b_vision',  cat:'Físicas y sensoriales', t:'Baja visión o dificultad con material visual',
   dua:['1.3','1.1','4.2'],
   ajustes:['Material con letra grande y buen contraste','Describir oralmente imágenes y esquemas','Ubicación preferencial y buena iluminación','Permitir material táctil o concreto']},
  {id:'b_motora',  cat:'Físicas y sensoriales', t:'Dificultad motora (escritura, manipulación, desplazamiento)',
   dua:['4.1','4.2','5.1'],
   ajustes:['Variar la forma de responder (oral, señalar, seleccionar)','Adaptar material (agarres, tamaño, fichas grandes)','Garantizar acceso físico al aula y al material','Dar más tiempo para tareas motrices']},
  // METODOLÓGICAS / COGNITIVAS
  {id:'b_ritmo',   cat:'Metodológicas', t:'Necesita más tiempo o un ritmo distinto al del grupo',
   dua:['8.2','3.3','5.3'],
   ajustes:['Dividir la tarea en pasos cortos con verificación','Reducir cantidad sin reducir la meta esencial','Tiempo adicional acordado y sin castigo','Versión básica y versión reto de la misma actividad']},
  {id:'b_abstrac', cat:'Metodológicas', t:'Se le dificultan los conceptos abstractos',
   dua:['3.1','2.5','3.4','7.2'],
   ajustes:['Partir siempre de ejemplos concretos del entorno (vereda, cultivos, familia)','Usar material manipulable y experiencias directas','Ir de lo concreto a lo abstracto en pasos pequeños']},
  {id:'b_memoria', cat:'Metodológicas', t:'Se le dificulta retener instrucciones o contenidos',
   dua:['6.2','6.3','3.2','2.2'],
   ajustes:['Una instrucción a la vez, verificando antes de dar la siguiente','Apoyos de memoria visibles (carteles, fichas, agenda en el tablero)','Repaso breve al inicio de cada clase']},
  {id:'b_atencion',cat:'Metodológicas', t:'Se distrae con facilidad / atención corta',
   dua:['7.3','6.1','8.2','9.2'],
   ajustes:['Actividades cortas y variadas con pausas activas','Ubicación lejos de ventanas/puertas, cerca del docente','Meta visible de la clase y lista de chequeo para automonitoreo','Acordar una señal discreta para reenfocar']},
  {id:'b_lectoesc',cat:'Metodológicas', t:'No ha consolidado la lectoescritura (respecto al grado)',
   dua:['2.3','1.2','5.1','5.3'],
   ajustes:['Evaluar oralmente o con apoyos gráficos mientras se nivela','Trabajo específico de lectoescritura con material del tema','Parejas lectoras: un compañero lee, ambos responden']},
  // ACTITUDINALES / EMOCIONALES
  {id:'b_motiva',  cat:'Actitudinales y emocionales', t:'Baja motivación / no le encuentra sentido a la tarea',
   dua:['7.2','7.1','8.4','6.1'],
   ajustes:['Conectar la tarea con sus intereses y su vida real','Ofrecer opciones para elegir cómo trabajar','Retroalimentación frecuente que resalte el avance','Metas pequeñas y alcanzables hoy']},
  {id:'b_frustra', cat:'Actitudinales y emocionales', t:'Baja tolerancia a la frustración / se bloquea o abandona',
   dua:['9.2','8.2','8.4','7.3'],
   ajustes:['Graduar el desafío: comenzar por lo que sí puede lograr','Enseñar y permitir estrategias de calma (pausa, respiración, rincón tranquilo)','Retroalimentar el esfuerzo y el proceso','Anticipar los cambios de actividad']},
  {id:'b_social',  cat:'Actitudinales y emocionales', t:'Dificultad para trabajar con otros / interacción social (incluye TEA)',
   dua:['8.3','7.3','6.2','9.2'],
   ajustes:['Grupos pequeños con roles claros y explícitos','Anticipar rutinas y cambios; ambiente predecible','Instrucciones sociales explícitas (qué hacer y decir)','Respetar tiempos de trabajo individual cuando lo necesite']},
  // ORGANIZATIVAS / CONTEXTO
  {id:'b_asist',   cat:'Organizativas y de contexto', t:'Asistencia irregular (trabajo rural, distancia, salud)',
   dua:['6.3','3.4','8.3'],
   ajustes:['Guías autocontenidas para adelantar en casa','Compañero monitor que le comparte lo trabajado','Priorizar los aprendizajes esenciales del periodo','Flexibilizar fechas de entrega con acuerdos']},
  {id:'b_recursos',cat:'Organizativas y de contexto', t:'Sin acceso a internet o materiales en casa',
   dua:['4.2','6.3','7.2'],
   ajustes:['Todo el material debe poder resolverse con lo disponible en el aula','Guías impresas o copiadas en el cuaderno','Tareas realizables con recursos del entorno (no digitales)']},
];

// ── Niveles por grado (para ajustar el lenguaje de la actividad) ─
const NIVELES = [
  {id:'basica1', t:'1° a 3°',  grados:['Primero','Segundo','Tercero','1','2','3'],       tono:'juego, material concreto, pictogramas, trabajo oral y manipulativo'},
  {id:'basica2', t:'4° a 5°',  grados:['Cuarto','Quinto','4','5'],                        tono:'material concreto + primeros esquemas, lectura corta guiada, trabajo colaborativo'},
  {id:'secund',  t:'6° a 9°',  grados:['Sexto','Séptimo','Octavo','Noveno','6','7','8','9'], tono:'organizadores gráficos, casos del contexto, roles en grupo, producto elegible'},
  {id:'media',   t:'10° a 11°',grados:['Décimo','Undécimo','10','11'],                    tono:'análisis de fuentes y casos, debate estructurado, producto con opciones tipo ICFES'},
];
function nivelDe(grado){
  const g=String(grado||'').replace('°','').trim();
  return NIVELES.find(n=>n.grados.some(x=>x.toLowerCase()===g.toLowerCase())) || NIVELES[2];
}

// ── Categorías de discapacidad/diagnóstico (SIMAT, para el PIAR) ─
const CATEGORIAS_PIAR = ['Discapacidad intelectual','Discapacidad auditiva','Discapacidad visual','Discapacidad física/motora',
  'Trastorno del Espectro Autista (TEA)','Discapacidad psicosocial','Discapacidad múltiple','Trastorno específico del aprendizaje',
  'TDAH','Capacidades o talentos excepcionales','Sin diagnóstico (en proceso)','Otra'];
