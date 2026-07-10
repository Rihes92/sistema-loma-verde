// ═══════════════════════════════════════════════════════════════
//  Sistema Loma Verde — Motor común de Herramientas pedagógicas
//  Archivo: herramientas-comun.js
//  (incluir DESPUÉS de auth.js y sync.js en cada herramienta)
//
//  Da a toda herramienta tres capacidades:
//   1. Selector de curso/estudiante desde los datos del sistema.
//   2. Guardar resultados en lv_herramientas (sincronizado) para
//      que aparezcan en el Perfil del estudiante y en el historial.
//   3. Enviar la nota a la planilla de Calificaciones (primera
//      casilla cognitiva libre del periodo), con confirmación.
// ═══════════════════════════════════════════════════════════════

const LV_HERR = (() => {

  function leer(k){ try{ return JSON.parse(localStorage.getItem(k))||[]; }catch(_){ return []; } }
  const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const normN = v => String(v??'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
  let login=null; try{ login=JSON.parse(localStorage.getItem('lv_login')||'null'); }catch(_){}
  const autor = login ? (login.nombre||'Docente') : 'Docente';

  // ── cursos y estudiantes del sistema ─────────────────────────
  function cursos(){
    return leer('lv_cursos').slice().sort((a,b)=>
      String(a.grado).localeCompare(String(b.grado),undefined,{numeric:true})||
      String(a.grupo||'').localeCompare(String(b.grupo||''),undefined,{numeric:true})||
      String(a.materia||'').localeCompare(String(b.materia||'')));
  }
  function estudiantesDe(cursoId){
    return leer('lv_estudiantes').filter(e=>e.cursoId===cursoId)
      .sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  }

  // Rellena dos <select> (curso y estudiante) y los mantiene ligados.
  function selectorEstudiante(selCursoId, selEstId, onCambio){
    const sc=document.getElementById(selCursoId), se=document.getElementById(selEstId);
    function pintarCursos(){
      const cs=cursos();
      sc.innerHTML='<option value="">— Elegir curso —</option>'+cs.map(c=>
        `<option value="${c.id}">${c.grado||''}${c.grupo?'-'+c.grupo:''} · ${c.materia||c.nombre||''}</option>`).join('');
    }
    function pintarEsts(){
      const ests=sc.value?estudiantesDe(sc.value):[];
      se.innerHTML='<option value="">— Elegir estudiante —</option>'+ests.map(e=>
        `<option value="${e.id}">${e.nombre}</option>`).join('');
    }
    sc.addEventListener('change',()=>{ pintarEsts(); if(onCambio)onCambio(); });
    se.addEventListener('change',()=>{ if(onCambio)onCambio(); });
    pintarCursos(); pintarEsts();
    setTimeout(()=>{ if(sc.options.length<=1) pintarCursos(); },2500);
    return {
      curso: ()=>cursos().find(c=>c.id===sc.value)||null,
      estudiante: ()=>estudiantesDe(sc.value).find(e=>e.id===se.value)||null
    };
  }

  // ── guardar resultado de la herramienta (sincronizado) ───────
  //  datos: {herramienta, estudiante, estId, curso, grado, grupo,
  //          nota, nivel, detalle:{...libre}}
  function guardarResultado(datos){
    const reg={ id:uid(), fecha:new Date().toISOString().slice(0,10),
      anio:new Date().getFullYear(), autor, creado:Date.now(), ...datos };
    const arr=leer('lv_herramientas'); arr.push(reg);
    try{ localStorage.setItem('lv_herramientas', JSON.stringify(arr)); }
    catch(_){ if(typeof LV_SYNC!=='undefined'&&LV_SYNC.revisarEspacio)LV_SYNC.revisarEspacio(); }
    if(typeof LV_SYNC!=='undefined') LV_SYNC.marcarCambio('lv_herramientas', reg);
    return reg;
  }
  function resultados(filtro){
    let arr=leer('lv_herramientas').filter(r=>!r._eliminado);
    if(filtro&&filtro.herramienta) arr=arr.filter(r=>r.herramienta===filtro.herramienta);
    if(filtro&&filtro.estudiante) arr=arr.filter(r=>normN(r.estudiante)===normN(filtro.estudiante));
    return arr.sort((a,b)=>(b.creado||0)-(a.creado||0));
  }

  // ── enviar nota a la planilla de Calificaciones ──────────────
  //  Escribe en la PRIMERA casilla cognitiva libre del periodo.
  //  Devuelve {ok, msg}.
  function enviarAPlanilla({cursoId, estId, periodo, nota, etiqueta}){
    try{
      if(!cursoId||!estId) return {ok:false,msg:'Elige curso y estudiante.'};
      if(!(nota>0)) return {ok:false,msg:'No hay nota calculada.'};
      periodo=String(periodo||'1').replace(/\D/g,'')||'1';
      nota=Math.min(5,Math.max(1,+(+nota).toFixed(1)));
      const cals=leer('lv_calificaciones');
      const id=`${cursoId}|${periodo}|${estId}`;
      let cal=cals.find(c=>c.id===id);
      if(!cal){
        cal={id,cursoId,periodo,estId,cognitivas:Array(10).fill(null),acumulativo:0,auto:0,co:0,hetero:0,inas:0};
        cals.push(cal);
      }
      cal.cognitivas=cal.cognitivas||Array(10).fill(null);
      const slot=cal.cognitivas.findIndex(v=>v==null||v===0);
      if(slot<0) return {ok:false,msg:'La planilla de ese periodo ya tiene las 10 casillas cognitivas llenas.'};
      cal.cognitivas[slot]=nota;
      cal.actualizado_en=new Date().toISOString();
      try{ localStorage.setItem('lv_calificaciones', JSON.stringify(cals)); }catch(_){}
      if(typeof LV_SYNC!=='undefined') LV_SYNC.marcarCambio('lv_calificaciones', cal);
      return {ok:true,msg:`Nota ${nota.toFixed(1)} enviada a la casilla ${slot+1} del periodo ${periodo}${etiqueta?' ('+etiqueta+')':''}.`};
    }catch(err){ return {ok:false,msg:'Error al escribir en la planilla.'}; }
  }

  return { selectorEstudiante, guardarResultado, resultados, enviarAPlanilla, cursos, estudiantesDe, autor, uid };
})();
