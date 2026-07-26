# AUDITORÍA PREVIA AL LANZAMIENTO — SABIE
**Fecha:** 26 de julio de 2026
**Motivo:** presentación institucional y puesta en uso real (lunes 27 de julio)
**Alcance:** 49 archivos de código, 32 tablas de base de datos, 23 migraciones SQL

---

## ⏱️ LO QUE HAY QUE HACER ANTES DEL LUNES (en este orden)

| # | Acción | Dónde | Tiempo | Sin esto… |
|---|--------|-------|--------|-----------|
| 1 | Correr `VERIFICACION_PRELANZAMIENTO.sql` | Supabase → SQL Editor | 2 min | Módulos que no guardan en la nube |
| 2 | Revisar quién NO puede entrar (sale en el mismo script) | Supabase | 2 min | Docentes bloqueados el lunes |
| 3 | Completar correos faltantes en fichas | Coordinación → Docentes | 15 min | Esos docentes no entran |
| 4 | Correr `ALTA_MASIVA_DOCENTES.sql` | Supabase → SQL Editor | 3 min | Solo entran ~4 personas |
| 5 | Probar con la cuenta de un docente real | La app | 5 min | Descubrir fallas en vivo |
| 6 | Activar respaldos automáticos | Supabase → Database → Backups | 3 min | Sin red de seguridad ante un error |

**Total estimado: 30 minutos.** Los pasos 1 a 4 son obligatorios.

---

## 🔴 HALLAZGOS CRÍTICOS

### C-1. La mayoría de los docentes probablemente NO puede iniciar sesión
**Este es el riesgo más alto de la presentación del lunes.**

Para que un docente entre hacen falta **dos cosas independientes**, y ambas se crean a mano:

1. Un **usuario** con correo y contraseña en Supabase (Authentication → Users).
2. Ese mismo correo escrito en su **ficha de docente** (Coordinación → Docentes).

La aplicación **no tiene registro propio**: un docente no puede crearse una cuenta solo. Verificado en el código: no existe ninguna función de alta de usuarios (`signup`) en toda la aplicación. Según la bitácora del proyecto, hacia julio 19 solo unas 4 de ~50 personas tenían cuenta.

Si el lunes 46 docentes intentan entrar y no pueden, la presentación se cae.

**Solución entregada:**
- `VERIFICACION_PRELANZAMIENTO.sql` → sección 4 te dice, docente por docente, quién puede entrar y quién no, y por qué.
- `ALTA_MASIVA_DOCENTES.sql` → crea de una sola vez los usuarios de todos los docentes que ya tengan correo en su ficha, con una contraseña temporal común.

**Importante:** la contraseña temporal es la misma para todos. Hay que exigir en la presentación que **cada uno la cambie apenas entre** (Portal → recuadro de usuario → "Cambiar contraseña"). Mientras no lo hagan, cualquiera que sepa la clave podría entrar con el correo de otro.

---

### C-2. Migraciones de base de datos sin correr — módulos que no guardan en la nube
Seis migraciones quedaron documentadas como *"SIN CORRER"* en la bitácora del proyecto:

| Migración | Módulo afectado | Qué pasa sin ella |
|-----------|-----------------|-------------------|
| `migracion_horarios.sql` | Horarios (21) y Mi Horario (07) | Coordinación publica el horario y **el docente nunca lo ve** |
| `migracion_permisos.sql` | Permisos docentes (18) | El docente solicita y **coordinación nunca lo recibe** |
| `migracion_matricula.sql` | Matrícula (20) | La matrícula no sale de ese equipo |
| `migracion_preescolar.sql` | Boletines (13) | Las valoraciones de preescolar no se guardan |
| `migracion_centros_interes.sql` | Centros de Interés (17) | Inscripciones y asistencia no se guardan |
| `migracion_observador_foto.sql` | Observador (10 y 01) | Adjuntar foto falla |

**Por qué es grave y difícil de notar:** cuando falta una tabla, la app **no muestra ningún error**. El cambio se queda atascado en la cola del navegador del docente y solo se ve un globito discreto que dice *"⏳ N cambios sin subir"*. Los datos no se pierden de inmediato, pero **viven únicamente en ese equipo**: si el docente cambia de computador o limpia el navegador, se pierden de verdad.

**Solución entregada:** `VERIFICACION_PRELANZAMIENTO.sql` crea todas las tablas faltantes de una vez y termina mostrando una tabla donde cada fila debe decir **✅ OK**. Es seguro correrlo aunque algunas ya existan.

---

## 🟠 HALLAZGOS IMPORTANTES (no bloquean el lunes)

### I-1. El control de acceso de Coordinación es solo de la aplicación, no del servidor
Los módulos **Coordinación**, **Matrícula (20)** y **Horarios (21)** verifican el permiso en el navegador (`if(!ES_COORD)`). Un docente con conocimientos técnicos podría saltarse esa pantalla desde la consola del navegador.

Está **parcialmente mitigado**: la tabla de matrícula (`lv_matricula`), que es la más sensible porque tiene documentos de identidad y fechas de nacimiento, **sí está protegida en el servidor** — aunque alguien se salte la pantalla, la base de datos le niega los datos.

Sin esa protección de servidor quedan `lv_horarios`, `lv_docentes` (parcial) y las tablas de Centros de Interés.

**Riesgo real en su contexto:** bajo. Requiere intención deliberada y conocimientos de programación.
**Recomendación:** cerrarlo en una sesión dedicada después del lanzamiento (es la "Fase 2" ya identificada en el proyecto).

### I-2. Módulo Saber 11 (04): cualquier docente ve los resultados de todos
El módulo abre sin contexto de materia (fue una decisión deliberada para que sea institucional), y como consecuencia `LV_CTX.filtrar()` no filtra nada: **cualquier docente ve los simulacros y resultados de todos los estudiantes de 11°**, con nombre y puntaje.

Puede ser lo deseado (es material de preparación institucional), pero conviene decidirlo a conciencia. Un docente de primaria no tiene por qué ver los puntajes de 11°.

### I-3. Registros antiguos sin etiqueta de materia se ven desde todas las materias
La función de filtrado incluye a propósito los registros que no tienen materia asignada (`!x[campo]`), para no perder datos viejos. Efecto secundario: un registro antiguo sin etiquetar aparece en todas las materias, y borrarlo desde una lo borra de todas.

**Recomendación:** avisar a los docentes que si ven algo que no es suyo, lo reporten en lugar de borrarlo.

### I-4. El espacio del navegador puede llenarse a lo largo del año
Cada equipo guarda una copia local de los datos. El límite típico del navegador son unos **5 MB**. Con ~800 estudiantes, varios periodos y todas las materias, las cuentas de coordinación (que ven todo) pueden acercarse a ese límite hacia el final del año.

**Ya está mitigado:** la app vigila el espacio y avisa al 80% (aviso amarillo) y al 100% (aviso rojo con descarga de respaldo).
**Recomendación:** si aparece el aviso amarillo, usar "🧹 Borrar mis datos de este equipo" (el dato sigue seguro en la nube).

---

## 🟡 OBSERVACIONES MENORES

- **Cálculos duplicados:** la nota definitiva se calcula por separado en cuatro módulos (planilla, director de grupo, boletines, analítica). Hoy están sincronizados, pero un cambio futuro en la fórmula debe aplicarse en los cuatro.
- **Pesos de evaluación fijos:** Director de Grupo (12) y Analítica (14) usan pesos fijos en vez de leer los configurados en Ajustes.
- **Homónimos:** el Observador puede cruzar anotaciones entre estudiantes con el mismo nombre en cursos distintos.
- **Dos pestañas abiertas:** trabajar con SABIE en dos pestañas simultáneas puede producir resultados inconsistentes.
- **Importador de notas:** si el Excel trae dos estudiantes con el mismo nombre, uno pisa al otro sin avisar.

---

## ✅ LO QUE SE VERIFICÓ Y ESTÁ BIEN

| Área | Resultado |
|------|-----------|
| Sintaxis de código | **49 de 49 archivos sin errores** |
| Funcionamiento sin internet | **57 de 57 archivos en la caché**, ninguno faltante ni sobrante |
| Seguridad de base de datos (RLS) | Activa en todas las tablas |
| Contraseñas | Gestionadas por Supabase; ninguna escrita en el código |
| Protección contra código malicioso | Función de escapado presente en todos los módulos |
| Aislamiento entre docentes | Corregido en auditorías previas (planilla, PIAR, buscador, analítica, comunicados) |
| Distinción de sedes | Corregida esta semana (las 16 sedes con código único) |
| Papelera | Borrado lógico con 30 días de recuperación |
| Aviso de espacio lleno | Presente, con respaldo descargable |
| Generación automática de horarios | Verificada contra los datos reales: 98,6% de horas ubicadas, sin cruces |

---

## 📋 RECOMENDACIONES PARA LA PRESENTACIÓN DEL LUNES

**Qué decir sí o sí:**
1. **Cambien la contraseña apenas entren.** Es el punto más importante.
2. **La primera vez hay que entrar con internet.** Después la app funciona sin conexión en ese mismo equipo.
3. **El globito "⏳ cambios sin subir" es normal sin internet** — se suben solos al reconectar. No cerrar el navegador sin haber recuperado señal si aparece.
4. **Si algo se ve raro o no es suyo, repórtenlo — no lo borren.**

**Qué NO mostrar el lunes** (para no generar dudas):
- Módulo Saber 11 (04) hasta decidir el punto I-2.
- Matrícula y Acudientes, salvo con coordinación aparte (datos sensibles).

**Recomendación de despliegue por fases:**
Empezar con **Calificaciones, Asistencia, Planeador, Mi Horario y Observador** — que es el 80% del uso diario — y abrir los demás módulos en semanas siguientes. Reduce el ruido de soporte inicial y hace la adopción más fácil.

---

## 🛡️ RESPALDOS — PENDIENTE DE CONFIGURAR

No hay respaldos automáticos configurados. Es lo único que protege ante un borrado masivo accidental.

**Cómo activarlo:** Supabase → Database → Backups → activar *Point-in-Time Recovery*.
Está incluido en los planes pagos de Supabase. Con datos reales de 800 estudiantes y 50 docentes, es una inversión justificada.

---

*Auditoría realizada mediante revisión de código, verificación de sintaxis, análisis de dependencias entre módulos y base de datos, y pruebas con los datos reales de la institución.*
