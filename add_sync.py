import re, shutil, os

BASE = "/Users/rihes1992/Library/CloudStorage/OneDrive-Personal(2)/Magisterio/Clases/19. Automatización/Sistema Loma Verde"

# Configuración por módulo: qué reemplazar y con qué
MODULOS = {
    "modulos/05-asistencia.html": {
        "old": "function lsW(k,v){localStorage.setItem(PRE+k,JSON.stringify(v))}",
        "new": """function lsW(k,v){
  localStorage.setItem(PRE+k,JSON.stringify(v));
  if(typeof LV_SYNC!=='undefined'){
    var mapa={'asistencia':'lv_as_asistencia','cursos':'lv_as_cursos','estudiantes':'lv_as_estudiantes'};
    var lvKey=mapa[k]||('lv_as_'+k);
    if(Array.isArray(v)){v.forEach(function(r){if(r&&r.id)LV_SYNC.marcarCambio(lvKey,r);});}
    else if(v&&typeof v==='object'){Object.entries(v).forEach(function(e){LV_SYNC.marcarCambio(lvKey,Object.assign({id:e[0]},e[1]));});}
  }
}"""
    },
    "modulos/07-horario.html": {
        "old": "function lsW(d){try{localStorage.setItem(LS_KEY,JSON.stringify(d))}catch(_){}}",
        "new": """function lsW(d){
  try{localStorage.setItem(LS_KEY,JSON.stringify(d));}catch(_){}
  if(typeof LV_SYNC!=='undefined'&&Array.isArray(d)){
    d.forEach(function(r){if(r&&r.id)LV_SYNC.marcarCambio('lv_horario',r);});
  }
}"""
    },
    "modulos/08-eventos.html": {
        "old": "function lsW(d){try{localStorage.setItem(LS_KEY,JSON.stringify(d));}catch(e){}}",
        "new": """function lsW(d){
  try{localStorage.setItem(LS_KEY,JSON.stringify(d));}catch(e){}
  if(typeof LV_SYNC!=='undefined'&&Array.isArray(d)){
    d.forEach(function(r){if(r&&r.id)LV_SYNC.marcarCambio('lv_eventos',r);});
  }
}"""
    }
}

for ruta, cfg in MODULOS.items():
    path = os.path.join(BASE, ruta)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if cfg["old"] in content:
        content = content.replace(cfg["old"], cfg["new"])
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ {ruta} — sincronización agregada")
    else:
        print(f"⚠️  {ruta} — patrón no encontrado, revisar manualmente")

