// ═══════════════════════════════════════════════════════════════
//  SABIE — /api/recordatorio-eventos  (Función serverless, runtime Node)
//
//  Disparada UNA VEZ AL DÍA por un cron de Vercel (ver vercel.json,
//  sección "crons"). Revisa los eventos institucionales (lv_eventos) y,
//  para los que hoy caen justo en su fecha de aviso (fechaIni - rec días,
//  el mismo campo "rec" que ya usa el popup del portal), envía un correo
//  de recordatorio a TODOS los docentes con correo registrado.
//
//  Backlog crudo sesión 26, punto 10 (segunda mitad): "2 días antes de un
//  evento, enviar un correo recordatorio a los correos registrados de cada
//  docente." — se respeta el "rec" configurado en cada evento (1/2/3 días),
//  no se fuerza siempre a 2.
//
//  REQUIERE 3 variables de entorno nuevas en Vercel (Project Settings →
//  Environment Variables) — nada de esto funciona sin ellas:
//    · RESEND_API_KEY      → API key de https://resend.com (cuenta institucional,
//                             NO por docente — a diferencia de Gemini).
//    · RESEND_FROM          → remitente verificado, ej:
//                             "SABIE <recordatorios@tudominio.com>".
//                             Mientras no haya un dominio verificado en
//                             resend.com/domains, Resend SOLO deja enviar a la
//                             cuenta dueña de la clave — o sea, a nadie más
//                             hasta verificar dominio. Ver resend.com/domains.
//    · SUPABASE_SERVICE_ROLE → clave "service_role" del proyecto (Supabase →
//                             Project Settings → API). Distinta de la "anon"
//                             que ya usa el resto de la app: esta ignora RLS,
//                             necesaria porque un cron no tiene sesión de
//                             ningún docente. NUNCA debe usarse en el cliente.
//    · CRON_SECRET (opcional pero recomendado) → si se define, Vercel la
//                             manda sola en cada llamada de cron
//                             (Authorization: Bearer <CRON_SECRET>); este
//                             archivo la exige si está definida, así nadie
//                             más puede disparar el envío llamando la URL.
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://loztrkwlttxyfhbkznyu.supabase.co';

// "Hoy" en horario de Colombia (UTC-5, sin horario de verano) — el cron
// corre en UTC y cerca de medianoche el día podría desfasarse si se usa
// la fecha UTC directa.
function hoyBogota() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

async function supaGet(path) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE
    }
  });
  if (!r.ok) throw new Error('Supabase GET ' + path + ' → ' + r.status);
  return r.json();
}
async function supaPatch(path, body) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method: 'PATCH',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(body)
  });
  return r.ok;
}
async function enviarCorreo(to, subject, html) {
  const from = process.env.RESEND_FROM || 'SABIE <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, html })
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, data: j };
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Protección: si hay CRON_SECRET configurado, exigirlo. Vercel lo manda
  // solo en sus propias invocaciones de cron cuando la env existe.
  if (process.env.CRON_SECRET) {
    const auth = req.headers['authorization'] || '';
    if (auth !== 'Bearer ' + process.env.CRON_SECRET) {
      res.status(401).json({ error: 'No autorizado.' });
      return;
    }
  }
  if (!process.env.RESEND_API_KEY || !process.env.SUPABASE_SERVICE_ROLE) {
    res.status(500).json({ error: 'Faltan variables de entorno (RESEND_API_KEY / SUPABASE_SERVICE_ROLE) — ver comentario al inicio de este archivo.' });
    return;
  }

  try {
    const hoy = hoyBogota();

    const eventosRaw = await supaGet('lv_eventos?select=*');
    const eventos = eventosRaw.map(r => ({ _row: r, ...(r.datos || {}) }));

    // Eventos cuyo aviso cae exactamente hoy y que aún no se avisaron por correo
    const disparan = eventos.filter(ev => {
      if (!ev.portal || !ev.fechaIni) return false;
      if (ev.recordatorioEnviadoFecha === hoy) return false;
      const rec = ev.rec != null ? ev.rec : 1;
      const d = new Date(ev.fechaIni + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - rec);
      const disparo = d.toISOString().slice(0, 10);
      return disparo === hoy;
    });

    if (!disparan.length) {
      res.status(200).json({ ok: true, enviados: 0, mensaje: 'Sin eventos que avisar hoy.' });
      return;
    }

    const docentesRaw = await supaGet('lv_docentes?select=*');
    const docentes = docentesRaw.map(r => ({ id: r.id, ...(r.datos || {}) }))
      .filter(d => d.email && /\S+@\S+\.\S+/.test(d.email));

    const CAT_LABEL = { reunion: 'Reunión', academico: 'Fecha académica', festivo: 'Festivo/Sin clase', externo: 'Externo' };
    const listaHtml = disparan.map(ev => {
      const cat = CAT_LABEL[ev.cat] || 'Evento';
      return `<li><strong>${escHtml(ev.titulo || '')}</strong> — ${escHtml(cat)}<br>
        📅 ${escHtml(ev.fechaIni)}${ev.fechaFin && ev.fechaFin !== ev.fechaIni ? ' al ' + escHtml(ev.fechaFin) : ''}${ev.hora ? ' · ' + escHtml(ev.hora) : ''}
        ${ev.desc ? '<br>' + escHtml(ev.desc) : ''}</li>`;
    }).join('');

    let enviados = 0;
    for (const d of docentes) {
      const subject = disparan.length === 1
        ? 'Recordatorio: ' + (disparan[0].titulo || 'evento próximo')
        : `Recordatorio: ${disparan.length} eventos próximos`;
      const html = `<p>Hola ${escHtml((d.nombre || '').split(' ')[0] || '')},</p>
        <p>Te recordamos ${disparan.length > 1 ? 'estos eventos institucionales próximos' : 'este evento institucional próximo'}:</p>
        <ul>${listaHtml}</ul>
        <p style="font-size:.85em;color:#666">SABIE — Sistema de Aprendizaje, Bienestar e Inclusión Educativa</p>`;
      const r = await enviarCorreo(d.email, subject, html);
      if (r.ok) enviados++;
    }

    // Marcar los eventos como avisados hoy (evita reenvíos si el cron corre de nuevo)
    for (const ev of disparan) {
      await supaPatch('lv_eventos?id=eq.' + encodeURIComponent(ev._row.id),
        { datos: Object.assign({}, ev._row.datos, { recordatorioEnviadoFecha: hoy }) });
    }

    res.status(200).json({ ok: true, eventos: disparan.length, docentes: docentes.length, enviados });
  } catch (e) {
    res.status(500).json({ error: 'Error enviando recordatorios: ' + e.message });
  }
};

function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
