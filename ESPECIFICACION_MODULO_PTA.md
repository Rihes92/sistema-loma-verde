# Especificación — Módulo "Centros de Interés (PTA)" para SABIE

> Documento para ejecutar en una sesión nueva (recomendado: Claude Sonnet 5).
> Lee primero `CLAUDE.md` completo. Este archivo define QUÉ construir; sigue las
> convenciones de SABIE para el CÓMO.

## 0. Terminología (aclaración)

- **PTA** = *Programa Todos a Aprender* (MEN): acompañamiento a básica primaria (1º–5º)
  en Lenguaje y Matemáticas, con tutores y comunidades de aprendizaje. NO es exactamente
  lo que pidió Francy.
- Lo solicitado (grupos de estudiantes por preferencia, con líder, docentes y asistencia)
  corresponde a **Centros de Interés** (jornada única / jornada escolar complementaria):
  grupos temáticos orientados por un mediador/líder, en líneas pedagógicas.
- **Decisión:** el módulo se llama **"Centros de Interés"** en la UI. Francy lo llamó
  "PTA", así que se puede poner el subtítulo "Centros de Interés · PTA" o dejar "PTA"
  como etiqueta si ella lo prefiere. Confirmar el rótulo con ella al inicio.

## 1. Objetivo del módulo (requisitos de Francy)

1. Registrar los **Centros de Interés** que existen en la institución.
2. **Importar las listas** de estudiantes de cada centro.
3. Llevar el **registro de asistencia** a cada centro.
4. Desde **Coordinación**: asignar el **líder** de cada centro y asignar **docentes** a
   cada centro.
5. Que cada centro **le aparezca a cada docente según sus espacios de trabajo** (o sea,
   un docente ve solo los centros donde es líder o está asignado).

## 2. Roles y visibilidad

- **Coordinación/Admin** (`login.esAdmin` en la app; `es_coordinacion()` en el servidor):
  crea/edita/elimina centros, asigna **líder** (un docente) y **docentes** (varios).
  Ve todos los centros.
- **Docente**: ve SOLO los centros donde `login.docenteId` es el líder o está en la lista
  de docentes asignados. Puede gestionar inscripciones y registrar asistencia de esos
  centros. (Mismo patrón de "según asignaciones" que usa el resto de la app.)
- Ojo con los ids: en la app el docente se identifica por `login.docenteId`
  (= `lv_docentes.id`, vinculado por correo). Usar ESE id para líder/docentes asignados
  (igual que `lv_asignaciones`). NO el `auth.uid()`.

## 3. Modelo de datos (patrón SABIE: arrays de `{id, datos}`)

Tres claves nuevas de `localStorage`, cada una sincronizada a una tabla Supabase vía el
`MAPA` de `sync.js` (todas con `transform: (r) => ({ id: r.id, datos: r })`).

### 3.1 `lv_centros` — el catálogo de centros
```
{
  id,                // uid()
  nombre,            // "Fútbol", "Robótica", "Danzas"...
  linea,            // categoría/línea pedagógica (ver §8)
  descripcion,
  jornada,           // "Mañana" | "Tarde" | "Complementaria" (texto libre/selección)
  sede,              // opcional (LV_INST.sede() por defecto)
  cupo,              // número opcional
  liderId,           // docenteId del líder (lv_docentes.id) | ''
  docentesIds: [],   // docenteIds asignados (lv_docentes.id)
  creado, actualizado
  // NOTA: NO agregar el nombre del colegio aquí; usar LV_INST para documentos.
}
```
Líder y docentes van EMBEBIDOS en el centro (los asigna Coordinación). Simplifica la
sincronización (un solo registro por centro).

### 3.2 `lv_centros_inscripciones` — estudiantes de cada centro (listas)
```
{
  id,          // uid()
  centroId,    // -> lv_centros.id
  estId,       // -> lv_estudiantes.id si se pudo emparejar; si no, ''
  nombre,      // nombre del estudiante (siempre, aunque no haya estId)
  documento,   // opcional (para emparejar/identificar)
  grado, grupo,// opcional (los estudiantes de un centro pueden venir de varios cursos)
  creado, actualizado
}
```
Un registro por estudiante inscrito. Permite importar listas grandes y reutilizarlas.
Al importar, intentar emparejar con `lv_estudiantes` por documento o por nombre
normalizado; si no hay match, guardar igual con `estId:''` (no bloquear).

### 3.3 `lv_centros_asistencia` — asistencia por sesión
Estructura especial tipo la asistencia actual (`{cursoId_fecha: {...}}`). Un registro
por (centro + fecha):
```
{
  id,           // centroId + '_' + fecha  (AAAA-MM-DD)
  centroId,
  fecha,        // AAAA-MM-DD
  registradoPor,// login.docenteId
  registros: { <inscripcionId | estId>: 'presente'|'ausente'|'tarde'|'excusa' },
  actualizado
}
```
Reutilizar el helper de fecha y el patrón de la planilla de asistencia (módulo 05).

## 4. Integración con SABIE (lista de enganches)

1. **`sync.js` → `MAPA`**: agregar las 3 claves nuevas:
   ```
   'lv_centros':               { tabla: 'lv_centros',               id:'id', transform:(r)=>({id:r.id,datos:r}) },
   'lv_centros_inscripciones': { tabla: 'lv_centros_inscripciones', id:'id', transform:(r)=>({id:r.id,datos:r}) },
   'lv_centros_asistencia':    { tabla: 'lv_centros_asistencia',    id:'id', transform:(r)=>({id:r.id,datos:r}) },
   ```
   (La asistencia usa `{id, datos}` normal; si se prefiere estructura especial tipo
   `asistencia`, replicar ese manejo en `descargarTodo`. Lo más simple: `{id,datos}`.)
2. **Migración SQL** `migracion_centros_interes.sql` (correr en Supabase): crear las 3
   tablas (`id text primary key`, `datos jsonb`, `actualizado_en timestamptz default now()`),
   agregar el trigger `tocar_actualizado_en` (ya existe) y RLS. Para RLS: seguir el patrón
   ACTUAL del proyecto (`solo_autenticados` = `using(true) with check(true)`) para no
   romper el modelo offline-first; el filtrado por dueño/rol se afinará en la etapa 2 más
   adelante. La escritura de `lv_centros` idealmente restringida a `es_coordinacion()`
   (como `lv_asignaciones`) porque solo Coordinación crea/edita centros; inscripciones y
   asistencia = escritura para docentes autenticados. Incluir bloque de verificación.
3. **Módulo nuevo**: `modulos/17-centros-interes.html` (siguiente número tras 16).
   Estructura como los demás: `exigirSesion()` al inicio, `lv-tema.css` + CSS embebido,
   `window.LV_SYNC_TABLAS=['lv_centros','lv_centros_inscripciones','lv_centros_asistencia','lv_estudiantes','lv_docentes']`
   antes de `sync.js`. Usar `esc()` para todo texto (XSS). Reusar `lib/xlsx.full.min.js`
   para importar listas (ver módulo 02 malla como referencia de import Excel).
4. **Sidebar** (`index.html`): agregar el enlace en el grupo "Institución" (junto a los
   módulos 10–16). Es un módulo institucional; visible para todos (cada quien verá solo
   sus centros; Coordinación ve todo).
5. **`sw.js`**: agregar `./modulos/17-centros-interes.html` a `ARCHIVOS` y **subir la
   versión de caché** (`loma-verde-v46`).
6. **Coordinación**: la asignación de líder + docentes puede vivir DENTRO del módulo 17
   (sección visible solo si `login.esAdmin`), o como pestaña en `coordinacion.html`. Más
   simple y cohesivo: dentro del módulo 17.

## 5. Pantallas (pestañas del módulo 17)

1. **Centros** — lista/tarjetas de centros (filtro por línea/jornada). 
   - Coordinación: botón "+ Nuevo centro", editar, eliminar (borrado lógico `_eliminado`),
     y asignar **líder** (select de docentes) + **docentes** (multi-select).
   - Docente: ve solo sus centros (líder o asignado); entra a gestionar inscripciones y
     asistencia.
2. **Estudiantes / Lista** (por centro): importar lista (Excel/CSV con plantilla),
   agregar/quitar estudiantes manualmente, o elegir de `lv_estudiantes` existentes.
   Mostrar total inscritos y cupo.
3. **Asistencia** (por centro + fecha): marcar presente/ausente/tarde/excusa para cada
   inscrito; guardar; ver/editar historial por fecha. Exportable/imprimible.
4. (Opcional) **Resumen**: % de asistencia por estudiante/centro, para el líder.

## 6. Importación de listas (detalle)

- Usar `lib/xlsx.full.min.js` (ya está en el proyecto; lo carga p.ej. el módulo 02).
- Plantilla mínima de columnas: `Nombre` (obligatoria), `Documento`, `Grado`, `Grupo`.
- Validar como el importador robusto (paso B del roadmap): reportar filas inválidas,
  importar las válidas, mensajes claros.
- Emparejar con `lv_estudiantes` por `documento` (si viene) o por nombre normalizado;
  si no hay match, guardar con `estId:''` (no bloquear).
- Ofrecer también "Agregar desde estudiantes existentes" (selector filtrable) para no
  depender siempre de Excel.

## 7. Convenciones y trampas a respetar (de CLAUDE.md)

- **Editar archivos con bash/python** (el editor está bloqueado en esta carpeta OneDrive).
- Scripts con `src` NO llevan código inline (causó un bug grave en index.html).
- Tras desplegar: **subir la versión de `CACHE` en `sw.js`**.
- Escapar SIEMPRE con `esc()` (XSS); ya hubo hardening en herramientas y tiquete.
- Borrados lógicos con `_eliminado: true` (papelera 30 días).
- El nombre del colegio va vía `LV_INST` (no hardcodear); permanece solo en documentos
  oficiales impresos.
- La etapa 2 (Fase 0) ya estampa `_owner` central en `sync.js`: estos registros nuevos lo
  recibirán automáticamente al subir — no hay que hacer nada especial.
- Verificar el JS con `node --check` (extraer los `<script>` sin `src`), como en las
  sesiones anteriores.
- Git: locks de OneDrive; usar el ritual de terminal (rm locks + add + commit + push).

## 8. Categorías/líneas sugeridas (defaults del selector "línea")

Arte · Deporte · Música y danza · Oralidad · Lectura y escritura · Medio ambiente ·
Ciudadanía y convivencia · Ciencia y tecnología · Pensamiento lógico-matemático ·
Emprendimiento · Bilingüismo. (Dejar editable / "Otra".)

## 9. Checklist de construcción (orden sugerido para Sonnet)

1. Confirmar con Francy el rótulo ("Centros de Interés" vs "PTA") y si la asignación va
   dentro del módulo 17 o en Coordinación.
2. `migracion_centros_interes.sql` (3 tablas + trigger + RLS + verificación).
3. `sync.js`: agregar las 3 claves al `MAPA`.
4. `modulos/17-centros-interes.html` (pestañas §5, import §6, visibilidad §2).
5. Enlace en sidebar (`index.html`) + `sw.js` v46.
6. Verificar (`node --check`, IDs cableados, roles).
7. Actualizar `CLAUDE.md` (nuevo módulo 17, tablas nuevas en MAPA, migración).
8. Entregar el comando de `git push` (con borrado de locks).

## 10. Fuentes de la investigación

- PTA (MEN): https://www.mineducacion.gov.co/1780/articles-363488_recurso_2.pdf
- Jornada Única (MEN): https://www.mineducacion.gov.co/portal/especiales/Jornada-unica/
- Centros de Interés / Jornada Complementaria (IDRD Bogotá):
  https://www.idrd.gov.co/deportes/jornada-escolar-complementaria
