// ══ PDC Bolivia — versión profesional (criterios en viñetas + adaptaciones automáticas) ══
let API_KEY = "";
let datosSemanas = [null,null,null,null];
let criteriosIA = {ser:[],saber:[],hacer:[]};

function actualizarParalelos(){}   // compatibilidad con el HTML antiguo
function actualizarEstudiantes(){} // compatibilidad con el HTML antiguo

// ── SESIÓN ──
function verificarSesion(){
  const key = sessionStorage.getItem('pcrevive_groq_key');
  if(sessionStorage.getItem('pcrevive_auth')==='ok' && key){
    API_KEY = key;
    document.getElementById('pantalla-login').style.display='none';
    document.getElementById('app').style.display='block';
  } else {
    const m=document.getElementById('sesion-msg');
    if(m) m.textContent='No hay sesión activa. Redirigiendo...';
    setTimeout(()=>{window.location.href='index.html'},900);
  }
}
function cerrarSesion(){
  sessionStorage.removeItem('pcrevive_auth');
  sessionStorage.removeItem('pcrevive_groq_key');
  window.location.href='index.html';
}

// ── UTILIDADES ──
function esc(t){return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function setValue(id,v){const e=document.getElementById(id);if(e)e.value=v}
function getValue(id){const e=document.getElementById(id);return e?e.value.trim():''}
function setIAStatus(t,m){const e=document.getElementById('ia-status');e.className='ia-status '+t;e.textContent=m}
function mostrarLoading(t){document.getElementById('load-txt').textContent=t||'...';document.getElementById('loading').classList.add('on')}
function ocultarLoading(){document.getElementById('loading').classList.remove('on')}

// ── LISTAS (viñetas) ──
// Convierte texto o arreglo en arreglo limpio de viñetas
function normalizarLista(x){
  const arr=Array.isArray(x)?x:String(x||'').split(/\n|•/);
  return arr.map(s=>String(s).replace(/^[\s\-–—*·•]+/,'').trim()).filter(Boolean);
}
// Un <textarea> usa saltos de línea; un <input> usa " • " como separador
function setLista(id,arr){
  const e=document.getElementById(id);if(!e)return;
  e.value=normalizarLista(arr).join(e.tagName==='TEXTAREA'?'\n':' • ');
}
function getLista(id){return normalizarLista(getValue(id))}
function htmlLista(arr){
  const l=normalizarLista(arr);
  return l.length?`<ul>${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
}

// Cantidad de criterios (viñetas) por dimensión: 4 por defecto, o lo que pida el docente
function detectarNCriterios(){
  const sel=parseInt(getValue('f-nro-criterios'),10);
  if(sel>=2&&sel<=6) return sel;
  const t=(getValue('ia-descripcion')+' '+getValue('ia-contexto')).toLowerCase();
  const m=t.match(/(\d|dos|tres|cuatro|cinco)\s*(criterios|viñetas|vinetas)/);
  if(m){const v=({dos:2,tres:3,cuatro:4,cinco:5})[m[1]]||parseInt(m[1],10);if(v>=2&&v<=6)return v;}
  return 4;
}

// Adaptación de respaldo si la IA no devuelve contenido
function adaptacionPorDefecto(tema){
  const t=tema||'el tema del mes';
  return {
    metodo:[
      'Conformación de grupos cooperativos heterogéneos, con roles definidos y tutoría entre pares.',
      'Uso de material visual y concreto (láminas, esquemas, modelos manipulables) sobre '+t+'.',
      'Instrucciones en pasos cortos y secuenciados, con ejemplos resueltos antes de la práctica autónoma.',
      'Acompañamiento individual del maestro y tiempo adicional para completar las actividades.',
      'Retroalimentación inmediata y refuerzo en cada momento del proceso formativo.'
    ],
    resultados:[
      'Reconoce y explica con apoyo los conceptos básicos del tema.',
      'Participa activamente en el trabajo grupal asumiendo su rol.',
      'Elabora un producto sencillo aplicando los pasos aprendidos.'
    ],
    ser:['Demuestra interés, respeto y colaboración con sus compañeros durante las actividades.','Valora el apoyo recibido y manifiesta perseverancia ante la dificultad.'],
    saber:['Identifica los conceptos básicos del tema con ayuda de material visual.','Responde preguntas orales o escritas sencillas sobre lo aprendido.'],
    hacer:['Realiza las prácticas con guía del maestro o de un compañero tutor.','Presenta un producto simplificado cumpliendo los criterios mínimos acordados.']
  };
}

// ══ GENERACIÓN IA (una sola llamada) ══
async function generarConIA(){
  const desc=getValue('ia-descripcion'), ctx=getValue('ia-contexto');
  const adapPedido=getValue('ia-adaptacion');
  const area=getValue('f-area')||'el área indicada';
  const grado=getValue('f-grado')||'5to de Secundaria';
  const tema=getValue('f-tema')||'el tema del mes';
  const objNivel=getValue('f-obj-nivel')||'(no proporcionado)';
  const nCrit=detectarNCriterios();
  if(!desc){setIAStatus('err','⚠️ Describe los 4 temas semanales primero.');return;}

  setIAStatus('cargando','⏳ Generando PDC con Groq...');
  document.getElementById('btn-ia').disabled=true;
  mostrarLoading('Generando PDC con IA...');

  const reglaCrit = nCrit===4
    ? 'Exactamente 4 viñetas por dimensión: una por semana, en orden (Semana 1, 2, 3, 4).'
    : `Exactamente ${nCrit} viñetas por dimensión, distribuidas en orden a lo largo de las 4 semanas (agrupa semanas si hay menos viñetas que semanas; reparte equitativamente si hay más).`;

  const prompt=`Eres maestro boliviano experto en planificación curricular (Ley 070, Modelo Sociocomunitario Productivo, nivel secundario). Genera un PDC mensual profesional.
Área: ${area} | Año: ${grado} | Tema: ${tema}
Objetivo Holístico de Nivel: ${objNivel}
Contexto: ${ctx||'(sin contexto adicional)'}
Semanas (herramientas, materiales, productos): ${desc}
Pedido de adaptación curricular del docente: ${adapPedido||'(no especificó: genera la adaptación de forma automática)'}

REGLAS:
- Usa las herramientas y productos que describe el docente en PRÁCTICA, PRODUCCIÓN y recursos. Producto distinto cada semana.
- Coherencia: PRÁCTICA→TEORÍA→PRODUCCIÓN→VALORACIÓN.
- Longitud: práctica 4-5 oraciones (2 actividades con pasos y materiales); teoría 3-4 oraciones con terminología técnica; producción 2-3 oraciones; valoración 2 oraciones (comunidad, Vivir Bien); recursos 5 líneas separadas por \\n.
- objetivo: 3-4 líneas, verbo plural + valor (SER) + contenido (SABER) + método (HACER) + finalidad comunitaria, basado en el Objetivo Holístico.
- criterios: son para CALIFICAR a los estudiantes. Cada dimensión es un ARREGLO de viñetas (strings). ${reglaCrit}
  Cada viñeta: 25-35 palabras, verbo observable en tercera persona (ej. "Demuestra", "Explica", "Elabora"), contenido concreto de la semana e indicador de logro medible (ej. porcentaje, cantidad, calidad).
  SER se deriva del momento de VALORACIÓN (actitudes, valores, trabajo comunitario); SABER del momento de TEORÍA (conceptos, terminología); HACER de la PRÁCTICA y PRODUCCIÓN (procedimientos y producto).
- adaptacion (estudiantes con ritmo lento o dificultades de aprendizaje): si el docente pidió algo específico, respétalo. Si no, genérala automáticamente combinando estrategias reales de aula: trabajo en grupos cooperativos heterogéneos, tutoría entre pares, material educativo visual/manipulativo para todos, instrucciones graduales, tiempo adicional, retroalimentación individual, evaluación diferenciada. Vincúlala al tema "${tema}". "metodo" = 5 viñetas, "resultados" = 3 viñetas, y ser/saber/hacer = 2 viñetas básicas y alcanzables cada una.

Responde SOLO JSON válido:
{"objetivo":"","semanas":[{"contenido":"","practica":"","teoria":"","produccion":"","valoracion":"","recursos":""},{...},{...},{...}],
"criterios":{"ser":["..."],"saber":["..."],"hacer":["..."]},
"adaptacion":{"metodo":["..."],"resultados":["..."],"ser":["..."],"saber":["..."],"hacer":["..."]}}
Las "semanas" deben ser exactamente 4 objetos completos.`;

  try{
    const resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({
        model:'openai/gpt-oss-120b',max_tokens:4500,temperature:0.5,
        response_format:{type:'json_object'},
        messages:[
          {role:'system',content:'Experto en educación boliviana SEP. Respondes solo JSON válido.'},
          {role:'user',content:prompt}
        ]
      })
    });
    if(!resp.ok){const e=await resp.json();throw new Error(e.error?.message||'Error en la API de Groq');}
    const data=await resp.json();
    let js=data.choices[0].message.content.trim();
    const i0=js.indexOf('{'),i1=js.lastIndexOf('}');
    if(i0>=0&&i1>i0) js=js.slice(i0,i1+1);
    const r=JSON.parse(js);
    if(!r.semanas||r.semanas.length<4) throw new Error('La IA no devolvió las 4 semanas. Intente de nuevo.');

    datosSemanas=r.semanas.slice(0,4);
    if(r.objetivo) setValue('f-objetivo',r.objetivo);

    const c=r.criterios||{};
    criteriosIA={ser:normalizarLista(c.ser),saber:normalizarLista(c.saber),hacer:normalizarLista(c.hacer)};

    const def=adaptacionPorDefecto(tema), a=r.adaptacion||{};
    const pick=k=>{const l=normalizarLista(a[k]);return l.length?l:def[k]};
    setLista('f-adap-met',pick('metodo'));setLista('f-adap-res',pick('resultados'));
    setLista('f-adap-ser',pick('ser'));setLista('f-adap-saber',pick('saber'));setLista('f-adap-hacer',pick('hacer'));

    renderCamposSemanas(datosSemanas,criteriosIA);
    document.getElementById('sec-contenidos').style.display='block';
    setIAStatus('ok','✅ ¡PDC generado! Puedes editar antes de exportar.');
    generarVistaPreviaPDC();
  }catch(e){
    console.error(e);setIAStatus('err','❌ Error: '+e.message);
  }finally{
    ocultarLoading();document.getElementById('btn-ia').disabled=false;
  }
}

function renderCamposSemanas(semanas,crit){
  crit=crit||{
    ser:getLista('cr-ser'),saber:getLista('cr-saber'),hacer:getLista('cr-hacer')
  };
  if(!crit.ser.length&&!crit.saber.length&&!crit.hacer.length) crit=criteriosIA;
  const box=(t,inner)=>`<details style="margin-bottom:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:6px;overflow:hidden"><summary style="padding:8px 12px;cursor:pointer;font-size:11px;font-weight:bold;color:var(--dorado);background:rgba(200,165,0,.1)">${t}</summary><div style="padding:10px">${inner}</div></details>`;
  const f=(l,id,v,r)=>`<div class="campo"><label>${l}</label><textarea id="${id}" rows="${r}">${esc(v)}</textarea></div>`;
  const lst=l=>normalizarLista(l).join('\n');
  document.getElementById('campos-semanas').innerHTML=
    semanas.map((s,i)=>box('📅 SEMANA '+(i+1),
      `<div class="campo"><label>Contenido/Tema</label><input type="text" id="cs${i}-cont" value="${esc(s.contenido)}"></div>`+
      f('Práctica',`cs${i}-prac`,s.practica,3)+f('Teoría',`cs${i}-teor`,s.teoria,3)+
      f('Producción',`cs${i}-prod`,s.produccion,2)+f('Valoración',`cs${i}-val`,s.valoracion,2)+
      f('Recursos (uno por línea)',`cs${i}-rec`,s.recursos,3)
    )).join('')+
    box('🎯 CRITERIOS DE EVALUACIÓN (una viñeta por línea)',
      f('SER (actitudes y valores)','cr-ser',lst(crit.ser),5)+
      f('SABER (conocimientos)','cr-saber',lst(crit.saber),5)+
      f('HACER (práctica y producto)','cr-hacer',lst(crit.hacer),5));
}

// ══ LEER DATOS ══
function leerDatos(){
  const semanas=[];
  for(let i=0;i<4;i++){
    if(document.getElementById(`cs${i}-cont`)){
      semanas.push({contenido:getValue(`cs${i}-cont`),practica:getValue(`cs${i}-prac`),teoria:getValue(`cs${i}-teor`),produccion:getValue(`cs${i}-prod`),valoracion:getValue(`cs${i}-val`),recursos:getValue(`cs${i}-rec`)});
    } else if(datosSemanas[i]) semanas.push(datosSemanas[i]);
    else semanas.push({contenido:`Semana ${i+1}`,practica:'',teoria:'',produccion:'',valoracion:'',recursos:''});
  }
  semanas.forEach(s=>{s.recursos=s.recursos||'';s.practica=s.practica||'';s.teoria=s.teoria||'';s.produccion=s.produccion||'';s.valoracion=s.valoracion||'';s.contenido=s.contenido||''});
  const hayCrit=document.getElementById('cr-ser');
  return {
    nro:getValue('f-nro'),mes:getValue('f-mes'),distrito:getValue('f-distrito'),unidad:getValue('f-unidad'),
    grado:getValue('f-grado'),paralelo:getValue('f-paralelo'),trimestre:getValue('f-trimestre'),
    director:getValue('f-director'),maestro:getValue('f-maestro'),area:getValue('f-area'),fecha:getValue('f-fecha'),
    objNivel:getValue('f-obj-nivel'),objetivo:getValue('f-objetivo'),tema:getValue('f-tema'),
    semanas,
    criterios: hayCrit
      ? {ser:getLista('cr-ser'),saber:getLista('cr-saber'),hacer:getLista('cr-hacer')}
      : criteriosIA,
    adaptacion:{
      metodo:getLista('f-adap-met'),resultados:getLista('f-adap-res'),
      ser:getLista('f-adap-ser'),saber:getLista('f-adap-saber'),hacer:getLista('f-adap-hacer')
    }
  };
}

// ══ CSS DEL DOCUMENTO ══
const CSS_DOCUMENTO=`
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Times New Roman',Times,serif;color:#111;background:white;font-size:10pt}
.pdc-cab{text-align:center;margin-bottom:5px}
.pdc-t1{font-size:11.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;color:#1a3a6b;border-top:2.5px solid #1a3a6b;border-bottom:2.5px solid #1a3a6b;padding:4px 0;margin:3px 0}
.pdc-t2{font-size:10pt;font-weight:bold;text-transform:uppercase;margin:2px 0}
.tbl-ref{width:100%;border-collapse:collapse;margin:6px 0;font-size:8.5pt}
.tbl-ref td{border:1px solid #333;padding:3.5px 6px}
.tbl-ref .etq{background:#d0d8e8;font-weight:bold;width:21%;font-size:8pt;text-transform:uppercase}
.sec-tit{font-weight:bold;font-size:9pt;margin:6px 0 3px;text-transform:uppercase}
.obj-box{border:1.5px solid #333;padding:4px 8px;font-size:7.5pt;text-align:justify;line-height:1.35;background:#fafbff;margin-bottom:4px}
.tbl-pdc{width:100%;border-collapse:collapse;font-size:7.5pt;border:1.5px solid #333;margin-bottom:6px}
.tbl-pdc th{background:#1a3a6b;color:#fff;padding:3px 2px;text-align:center;font-size:6.5pt;border:1px solid #333}
.tbl-pdc td{border:1px solid #333;padding:2px 3px;vertical-align:top;line-height:1.3}
.tbl-pdc tr,.tbl-adap tr{page-break-inside:avoid}
.cel-obj{background:#f0f4ff;font-size:7.5pt;text-align:justify}
.cel-cont{background:#fff8e8;font-weight:bold;font-size:7pt;text-align:center;vertical-align:middle}
.cel-crit{background:#fafbff;font-size:7pt;line-height:1.35;text-align:justify}
.cel-crit .bl{margin-bottom:6px}
.sl{font-weight:bold;color:#1a3a6b;font-size:7pt;text-transform:uppercase;background:#d0d8e8;padding:1px 3px;display:block;margin-bottom:2px}
.sub{font-weight:bold;font-size:7pt}
.ct{font-weight:bold;color:#2d5fa8;font-size:7pt;text-transform:uppercase;display:block;border-bottom:.5px solid #9fb3d6;margin-bottom:1px}
.cel-crit ul,.cel-ad ul{list-style:disc;padding-left:10px;margin:1px 0 0 2px}
.cel-crit li,.cel-ad li{margin-bottom:2px;padding-left:1px}
.cel-ad{font-size:7pt;line-height:1.3;text-align:justify}
.cel-ad .h{font-weight:bold;font-size:7pt;color:#1a3a6b;text-transform:uppercase;margin-top:2px}
.tbl-adap{width:100%;border-collapse:collapse;font-size:7.5pt;border:1.5px solid #333;margin-bottom:6px}
.tbl-adap th{background:#1a3a6b;color:#fff;padding:4px;text-align:center;font-size:7pt;border:1px solid #333}
.tbl-adap td{border:1px solid #333;padding:4px 6px;vertical-align:top;font-size:7.5pt;line-height:1.3}
.etq-adap{background:#f0f4ff;font-weight:bold;text-align:center;font-size:7pt}
.firmas{display:flex;justify-content:space-around;margin-top:14px;padding-top:6px;page-break-inside:avoid}
.firma-b{text-align:center;width:42%}
.firma-l{border-top:1px solid #333;margin-bottom:3px}
.firma-t{font-size:7.5pt;font-style:italic}`;

// ══ HTML DEL PDC ══
function buildPDCInner(d){
  const c=d.criterios,a=d.adaptacion;
  const br=t=>esc(t).replace(/\n/g,'<br>');
  return `
  <div class="pdc-cab">
    <div class="pdc-t1">EDUCACIÓN SECUNDARIA COMUNITARIA PRODUCTIVA</div>
    <div class="pdc-t2">PLAN DE DESARROLLO CURRICULAR N°${esc(d.nro)} &nbsp;&nbsp;&nbsp; MES: ${esc(d.mes)}</div>
  </div>
  <div class="sec-tit">I. DATOS REFERENCIALES</div>
  <table class="tbl-ref">
    <tr><td class="etq">DISTRITO EDUCATIVO</td><td>${esc(d.distrito)}</td><td class="etq">UNIDAD EDUCATIVA</td><td>${esc(d.unidad)}</td></tr>
    <tr><td class="etq">NIVEL</td><td>SECUNDARIO</td><td class="etq">AÑO DE ESCOLARIDAD</td><td>${esc(d.grado)} — PARALELO ${esc(d.paralelo)}</td></tr>
    <tr><td class="etq">DIRECTOR (A)</td><td>${esc(d.director)}</td><td class="etq">MAESTRO (A)</td><td>${esc(d.maestro)}</td></tr>
    <tr><td class="etq">ÁREA</td><td>${esc(d.area)}</td><td class="etq">TRIMESTRE</td><td>${esc(d.trimestre)}</td></tr>
    <tr><td class="etq">FECHA</td><td colspan="3">${esc(d.fecha)}</td></tr>
  </table>
  <div class="sec-tit">II. DESARROLLO</div>
  <div style="font-weight:bold;font-size:9pt;margin:3px 0 2px">Objetivo Holístico de Nivel:</div>
  <div class="obj-box">${esc(d.objNivel)||'— Ingrese el Objetivo Holístico de Nivel en el formulario —'}</div>
  <table class="tbl-pdc">
    <thead><tr>
      <th style="width:13%">Objetivo de<br>aprendizaje</th><th style="width:12%">Contenidos</th>
      <th style="width:31%">Momentos del proceso formativo</th><th style="width:11%">Recursos</th>
      <th style="width:6%">Periodos</th><th style="width:27%">Criterios de evaluación</th>
    </tr></thead>
    <tbody>
    ${d.semanas.map((s,i)=>`<tr>
      ${i===0?`<td class="cel-obj" rowspan="4">${esc(d.objetivo)}</td>`:''}
      <td class="cel-cont">${i===0?`<strong>${esc(d.tema)}</strong><br><br>`:''}<span style="font-weight:normal;font-style:italic;font-size:7pt">${esc(s.contenido)}</span></td>
      <td><span class="sl">SEMANA ${i+1}</span>
        <span class="sub">PRÁCTICA:</span><br>${br(s.practica)}<br>
        <span class="sub">TEORÍA:</span><br>${br(s.teoria)}<br>
        <span class="sub">PRODUCCIÓN:</span><br>${br(s.produccion)}<br>
        <span class="sub">VALORACIÓN:</span><br>${br(s.valoracion)}</td>
      <td style="font-size:7pt">${br(s.recursos)}</td>
      <td style="text-align:center;font-weight:bold;color:#1a3a6b;font-size:7pt">Semana ${i+1}</td>
      ${i===0?`<td class="cel-crit" rowspan="4">
        <span class="sl">SEMANAS 1 – 4</span>
        <div class="bl"><span class="ct">SER</span>${htmlLista(c.ser)}</div>
        <div class="bl"><span class="ct">SABER</span>${htmlLista(c.saber)}</div>
        <div><span class="ct">HACER</span>${htmlLista(c.hacer)}</div></td>`:''}
    </tr>`).join('')}
    </tbody>
  </table>
  <div class="sec-tit">Adaptaciones curriculares: <span style="font-weight:normal;font-size:7.5pt">(Estudiantes con dificultades en el aprendizaje o ritmos de aprendizaje distinto y otros)</span></div>
  <table class="tbl-adap">
    <thead><tr><th style="width:14%">Contenidos</th><th style="width:15%">Discapacidad / TDAH / TEA / Ritmo lento</th><th style="width:43%">Adaptación</th><th style="width:28%">Criterios de Evaluación</th></tr></thead>
    <tbody><tr>
      <td class="etq-adap">${esc(d.tema)}</td><td class="etq-adap">Ritmo lento de aprendizaje</td>
      <td class="cel-ad"><div class="h">Metodología</div>${htmlLista(a.metodo)}
        <div class="h" style="margin-top:5px">Resultados esperados</div>${htmlLista(a.resultados)}</td>
      <td class="cel-ad"><div class="h">Ser</div>${htmlLista(a.ser)}
        <div class="h" style="margin-top:4px">Saber</div>${htmlLista(a.saber)}
        <div class="h" style="margin-top:4px">Hacer</div>${htmlLista(a.hacer)}</td>
    </tr></tbody>
  </table>
  <div style="height:40px"></div>
  <div class="firmas">
    <div class="firma-b"><div class="firma-l"></div><div class="firma-t">Firma y sello del docente</div></div>
    <div class="firma-b"><div class="firma-l"></div><div class="firma-t">Firma y sello del director (a)</div></div>
  </div>`;
}

// ══ VISTA PREVIA ══
function generarVistaPreviaPDC(){
  const d=leerDatos();
  const area=document.getElementById('pdc-preview-area');
  area.innerHTML='';
  let st=document.getElementById('_doc_styles');
  if(!st){st=document.createElement('style');st.id='_doc_styles';document.head.appendChild(st);}
  st.textContent=CSS_DOCUMENTO+'.doc-hoja{padding:45px 49px}';
  const hoja=document.createElement('div');
  hoja.id='pdc-doc';hoja.className='doc-hoja';
  hoja.style.cssText='background:white;box-shadow:0 2px 16px rgba(0,0,0,.35);margin-bottom:20px;width:816px;transform-origin:top left;';
  hoja.innerHTML=buildPDCInner(d);
  area.appendChild(hoja);
  requestAnimationFrame(()=>{
    const sc=Math.min(1,area.clientWidth/816);
    hoja.style.transform=`scale(${sc})`;
    hoja.style.marginBottom=((hoja.offsetHeight*sc)-hoja.offsetHeight+20)+'px';
  });
}

// ══ EDICIÓN ══
function abrirEdicion(){
  const sec=document.getElementById('sec-contenidos');
  if(sec.style.display==='none'){
    renderCamposSemanas(datosSemanas.map((s,i)=>s||{contenido:'Semana '+(i+1),practica:'',teoria:'',produccion:'',valoracion:'',recursos:''}),criteriosIA);
    sec.style.display='block';
  }
  sec.querySelectorAll('details').forEach(x=>x.open=true);
  sec.scrollIntoView({behavior:'smooth'});
}
function cerrarEdicion(){document.getElementById('overlay-edicion').classList.remove('activo')}
function aplicarEdicion(){generarVistaPreviaPDC();cerrarEdicion()}

// ══ EXPORT PDF ══
function buscarCorteLimpio(canvas,desdeY,rango){
  const ctx=canvas.getContext('2d'),w=canvas.width,x0=Math.floor(w*.15),an=Math.floor(w*.7);
  let mejorY=desdeY,mejor=Infinity;
  for(let y=desdeY;y>=Math.max(0,desdeY-rango);y--){
    const dt=ctx.getImageData(x0,y,an,1).data;let o=0;
    for(let x=0;x<dt.length;x+=4) if(dt[x]<220||dt[x+1]<220||dt[x+2]<220) o++;
    if(o<mejor){mejor=o;mejorY=y;if(o===0)break;}
  }
  return mejorY;
}
async function exportarPDF(){
  const hoja=document.getElementById('pdc-doc');
  if(!hoja){alert('Genera la vista previa primero.');return;}
  mostrarLoading('Generando PDF...');
  try{
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'letter'});
    const margin=12,contentW=pdf.internal.pageSize.getWidth()-margin*2,contentH=pdf.internal.pageSize.getHeight()-margin*2;
    const targetPx=Math.round(contentW*3.7795275591);
    const oT=hoja.style.transform,oW=hoja.style.width,oM=hoja.style.marginBottom;
    hoja.style.transform='none';hoja.style.width=targetPx+'px';hoja.style.marginBottom='0';
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const canvas=await html2canvas(hoja,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,width:targetPx,windowWidth:targetPx});
    hoja.style.transform=oT;hoja.style.width=oW;hoja.style.marginBottom=oM;
    const pxMm=canvas.width/contentW,altoPag=Math.floor(contentH*pxMm);
    let y=0,primera=true;
    while(y<canvas.height){
      let h;
      if(canvas.height-y<=altoPag) h=canvas.height-y;
      else{h=buscarCorteLimpio(canvas,y+altoPag,120)-y;if(h<=20)h=altoPag;}
      const tc=document.createElement('canvas');tc.width=canvas.width;tc.height=h;
      const t=tc.getContext('2d');t.fillStyle='#fff';t.fillRect(0,0,tc.width,h);
      t.drawImage(canvas,0,y,canvas.width,h,0,0,canvas.width,h);
      if(!primera)pdf.addPage();primera=false;
      pdf.addImage(tc.toDataURL('image/jpeg',.95),'JPEG',margin,margin,contentW,h/pxMm);
      y+=h;
    }
    pdf.save('planificacion.pdf');
  }catch(e){console.error(e);alert('Error al generar el PDF: '+e.message);}
  finally{ocultarLoading();}
}

// ══ EXPORT WORD ══
async function exportarWord(){
  if(!document.getElementById('pdc-doc')){alert('Genera la vista previa primero.');return;}
  if(typeof JSZip==='undefined'){
    mostrarLoading('Cargando librería...');
    await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  }
  mostrarLoading('Generando Word (.docx)...');
  try{
    const d=leerDatos(),c=d.criterios,a=d.adaptacion;
    const W=10766;
    const xe=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const wr=(t,b,sz,col,it)=>`<w:r><w:rPr>${b?'<w:b/>':''}${it?'<w:i/>':''}${col?`<w:color w:val="${col}"/>`:''}<w:sz w:val="${sz||14}"/><w:szCs w:val="${sz||14}"/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
    // orden correcto del esquema: spacing → ind → jc
    const wp=(runs,jc,bf,af,ind)=>`<w:p><w:pPr><w:spacing w:before="${bf||20}" w:after="${af||20}"/>${ind||''}${jc?`<w:jc w:val="${jc}"/>`:''}</w:pPr>${runs}</w:p>`;
    // viñeta con sangría francesa
    const wb=(t,sz)=>wp(wr('•\u00A0',true,sz||12,'1A3A6B')+wr(t,false,sz||12),'both','10','20','<w:ind w:left="200" w:hanging="200"/>');
    const wbl=(arr,sz)=>normalizarLista(arr).map(x=>wb(x,sz)).join('')||wp(wr(' '));
    const wh=(t,col)=>wp(wr(t,true,12,col||'2D5FA8'),'','40','10');
    const B=['top','left','bottom','right'].map(s=>`<w:${s} w:val="single" w:sz="4" w:space="0" w:color="333333"/>`).join('');
    const wc=(inner,w,fill,vm)=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${vm==='s'?'<w:vMerge w:val="restart"/>':vm==='c'?'<w:vMerge/>':''}<w:tcBorders>${B}</w:tcBorders>${fill?`<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`:''}<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="55" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="55" w:type="dxa"/></w:tcMar></w:tcPr>${inner}</w:tc>`;
    const wcT=(t,w,fill,b,sz,jc)=>wc(wp(wr(t||' ',b,sz||13),jc),w,fill);
    const wch=(t,w)=>wc(wp(wr(t,true,13,'FFFFFF'),'center'),w,'1A3A6B');
    const wtr=(cells,noSplit)=>`<w:tr>${noSplit?'<w:trPr><w:cantSplit/></w:trPr>':''}${cells}</w:tr>`;
    const wt=rows=>`<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblBorders>${B}<w:insideH w:val="single" w:sz="4" w:space="0" w:color="333333"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="333333"/></w:tblBorders></w:tblPr>${rows}</w:tbl>`;
    const lines=(t,sz)=>String(t||'').split('\n').filter(l=>l.trim()).map(l=>wp(wr(l,false,sz||12))).join('')||wp(wr(' '));

    // Datos referenciales
    const e=Math.round(W*.21),v=Math.round(W/2)-e;
    const fila=(l1,v1,l2,v2)=>wtr(wcT(l1,e,'D0D8E8',true,13)+wcT(v1,v,null,false,13)+wcT(l2,e,'D0D8E8',true,13)+wcT(v2,v,null,false,13));
    const tblRef=wt(fila('DISTRITO EDUCATIVO',d.distrito,'UNIDAD EDUCATIVA',d.unidad)+fila('NIVEL','SECUNDARIO','AÑO DE ESCOLARIDAD',d.grado+' — PAR. '+d.paralelo)+fila('DIRECTOR (A)',d.director,'MAESTRO (A)',d.maestro)+fila('ÁREA',d.area,'TRIMESTRE',d.trimestre)+
      wtr(wcT('FECHA',e,'D0D8E8',true,13)+wc(wp(wr(d.fecha||' ',false,13)),W-e)));

    // Tabla PDC con criterios en viñetas (celda combinada)
    const w1=Math.round(W*.13),w2=Math.round(W*.12),w3=Math.round(W*.31),w4=Math.round(W*.11),w5=Math.round(W*.06),w6=W-w1-w2-w3-w4-w5;
    const critXml=wp(wr('SEMANAS 1 – 4',true,12,'1A3A6B'),'','40','40')+
      wh('SER')+wbl(c.ser)+wh('SABER')+wbl(c.saber)+wh('HACER')+wbl(c.hacer);
    const filas=d.semanas.map((s,i)=>{
      const mom=wp(wr('SEMANA '+(i+1),true,12,'1A3A6B'))+
        ['PRÁCTICA','TEORÍA','PRODUCCIÓN','VALORACIÓN'].map((k,j)=>wp(wr(k+': ',true,12)+wr([s.practica,s.teoria,s.produccion,s.valoracion][j],false,12),'both')).join('');
      const cont=(i===0?wp(wr(d.tema,true,13),'center'):'')+wp(wr(s.contenido,false,12,null,true),'center');
      return wtr(
        (i===0?wc(wp(wr(d.objetivo,false,13),'both'),w1,'EEF2FF','s'):wc(wp(wr(' ')),w1,'EEF2FF','c'))+
        wc(cont,w2,'FFF8E8')+wc(mom,w3)+wc(lines(s.recursos),w4)+
        wc(wp(wr('Sem '+(i+1),true,12,'1A3A6B'),'center'),w5)+
        (i===0?wc(critXml,w6,'FAFBFF','s'):wc(wp(wr(' ')),w6,'FAFBFF','c')),
      true);
    }).join('');
    const tblPDC=wt(wtr(wch('Objetivo de aprendizaje',w1)+wch('Contenidos',w2)+wch('Momentos del proceso formativo',w3)+wch('Recursos',w4)+wch('Periodos',w5)+wch('Criterios de evaluación',w6))+filas);

    // Adaptaciones con viñetas
    const a1=Math.round(W*.14),a2=Math.round(W*.15),a3=Math.round(W*.43),a4=W-a1-a2-a3;
    const adMet=wh('METODOLOGÍA','1A3A6B')+wbl(a.metodo)+wh('RESULTADOS ESPERADOS','1A3A6B')+wbl(a.resultados);
    const adCrit=wh('SER')+wbl(a.ser)+wh('SABER')+wbl(a.saber)+wh('HACER')+wbl(a.hacer);
    const tblAdap=wt(wtr(wch('Contenidos',a1)+wch('Discapacidad / TDAH / TEA / Ritmo lento',a2)+wch('Adaptación',a3)+wch('Criterios de Evaluación',a4))+
      wtr(wcT(d.tema,a1,'EEF2FF',true,12,'center')+wcT('Ritmo lento de aprendizaje',a2,'EEF2FF',false,12,'center')+wc(adMet,a3)+wc(adCrit,a4),true));

    // Firmas
    const wF=Math.round(W*.42),nb='<w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>';
    const fc=(t,w)=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${t?'<w:tcBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="333333"/></w:tcBorders>':nb}</w:tcPr>${wp(wr(t||' ',false,14,null,true),'center',t?'60':'360','40')}</w:tc>`;
    const tblFirmas=`<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/></w:tblPr>${wtr(fc('Firma y sello del docente',wF)+fc('',W-wF*2)+fc('Firma y sello del director (a)',wF),true)}</w:tbl>`;

    const tit=(t,sz)=>wp(wr(t,true,sz,'1A3A6B'),'center','80','40');
    const sec=t=>wp(wr(t,true,16),'','60','30');
    const docXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${tit('EDUCACIÓN SECUNDARIA COMUNITARIA PRODUCTIVA',22)}${tit('PLAN DE DESARROLLO CURRICULAR N°'+d.nro+'   MES: '+d.mes,18)}
${sec('I. DATOS REFERENCIALES')}${tblRef}${sec('II. DESARROLLO')}
${wp(wr('Objetivo Holístico de Nivel:',true,15))}${wp(wr(d.objNivel||' ',false,14),'both')}
${wp(wr(' '))}${tblPDC}${wp(wr(' '))}${sec('Adaptaciones curriculares')}${tblAdap}${wp(wr(' '))}${tblFirmas}
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="737" w:right="737" w:bottom="737" w:left="737" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;

    const NS='http://schemas.openxmlformats.org/';
    const zip=new JSZip();
    zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
    zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file('word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('word/styles.xml',`<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="${NS}wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="16"/><w:lang w:val="es-BO"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`);
    zip.file('word/document.xml',docXml);
    const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    const u=URL.createObjectURL(blob),l=document.createElement('a');
    l.href=u;l.download=`PDC_${d.mes||'MES'}_${(d.grado||'').replace(/\s+/g,'-')}_${d.paralelo||'A'}.docx`;
    document.body.appendChild(l);l.click();document.body.removeChild(l);URL.revokeObjectURL(u);
  }catch(e){alert('Error Word: '+e.message);console.error(e);}
  finally{ocultarLoading();}
}

window.addEventListener('load',verificarSesion);
