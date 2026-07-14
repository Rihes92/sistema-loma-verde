# Generar con IA en SABIE — guía para docentes

La app trae el botón **🤖 Generar con IA** en el Planeador (módulo 02) y en el
Banco de preguntas (módulo 03). Redacta planeadores y bancos de preguntas listos
para revisar y editar.

**Cada docente usa su propia clave gratuita de Gemini.** No hay una clave
compartida del colegio: así cada quien tiene su propio cupo y nadie depende de los
demás. La clave se guarda **solo en tu equipo** (no viaja a la base de datos ni a
otros dispositivos).

---

## Paso 1 · Crear tu clave gratuita de Gemini (5 minutos, una sola vez)

1. Entra a **https://aistudio.google.com/apikey** con tu cuenta de Google.
2. Clic en **"Create API key" / "Crear clave de API"**.
3. Si te pide un proyecto, elige **"Create API key in new project"**. No necesitas
   tarjeta de crédito para la capa gratuita.
4. Copia la clave que aparece (empieza por `AIza...`).

> La capa gratuita permite ~10 generaciones por minuto y ~500 por día. Suficiente
> de sobra para el trabajo diario de un docente.

---

## Paso 2 · Pegar tu clave en la app (30 segundos)

1. Abre el **Planeador** (o el **Banco de preguntas**).
2. Entra a la sección **🤖 Generar con IA**.
3. En el campo **"🔑 Tu clave de Gemini"** pega tu clave `AIza...` y presiona
   **Guardar clave**. Verás **"✓ Clave guardada en este equipo"**.

Listo. La clave queda guardada en ese equipo; no tienes que volver a pegarla.

> Si usas la app en **otro equipo** (otro computador o el celular), repite el Paso 2
> allí una vez. La clave es la misma; solo hay que pegarla en cada dispositivo.
>
> Para **quitar** la clave de un equipo: deja el campo vacío y presiona
> **Guardar clave**.

---

## Paso 3 · Generar

- **Planeador:** elige grado → periodo → eje de la malla (o escribe una temática),
  número de sesiones y, si quieres, indicaciones extra. Presiona **Generar
  planeador**. En menos de un minuto aparece en **Mis planeadores**.
- **Banco:** elige grado, escribe la temática y cuántas preguntas quieres. Presiona
  **Generar preguntas**. Se agregan al banco de la materia activa.

**Revisa siempre** lo generado antes de usarlo: la IA puede equivocarse.

---

## Si algo falla

La app muestra mensajes claros:

- **"No has configurado tu clave de Gemini"** → falta el Paso 2 en ese equipo.
- **"Tu clave de Gemini no es válida o fue revocada"** → revisa que copiaste bien la
  clave `AIza...`, o crea una nueva en aistudio.google.com/apikey.
- **"Se alcanzó el límite gratuito de Gemini"** → llegaste al tope por minuto o por
  día; espera un momento e intenta de nuevo.
- **"No se pudo generar… revisa tu conexión"** → la generación necesita internet.

---

## Para quien mantiene el sistema (técnico)

- Función serverless: `api/generar.js` (Vercel, runtime Node). Recibe
  `{ tipo:'planeador'|'banco', datos:{...} }` y **la clave del docente en el header
  `X-Gemini-Key`** (no se guarda ni se registra en el servidor). **No usa variables
  de entorno para la clave** — no hay que configurar nada en Vercel salvo desplegar.
- Verifica el token de sesión del docente contra Supabase (`/auth/v1/user`) antes de
  usar la clave, para que el endpoint no quede abierto a terceros.
- La clave del docente se guarda en `localStorage` (`lv_gemini_key`) mediante el
  helper `LV_GEMINI` en `auth.js`. **No está en el MAPA de `sync.js`**, por eso nunca
  se sincroniza a Supabase ni a otros dispositivos.
- Modelo por defecto: `gemini-2.5-flash` (configurable con la env `GEMINI_MODEL`).
- Usa los **GEMs v2** como *system prompt* (embebidos en `api/generar.js`, copiados
  de `GEMs/*.md`; si editas los `.md`, recópialos dentro de `api/generar.js`).
- La respuesta pasa por **el mismo importador** (validación de esquema) antes de
  guardar. Nada se guarda sin validar.
- Solo hay que **desplegar el código** (git push → Vercel). No hay paso de API key
  en Vercel porque la clave la pone cada docente.
