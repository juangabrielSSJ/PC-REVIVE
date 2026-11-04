// ══ PDC Bolivia — formato oficial (momentos con párrafos, criterios en viñetas, adaptaciones con etiquetas) ══
let API_KEY = "";
let datosSemanas = [null,null,null,null];
let criteriosIA = {ser:[],saber:[],hacer:[]};
const ORD = ['PRIMERA','SEGUNDA','TERCERA','CUARTA'];

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

// ── LISTAS / PÁRRAFOS ──
// Convierte texto (con saltos de línea o •) o arreglo en arreglo limpio
function normalizarLista(x){
  const arr=Array.isArray(x)?x:String(x||'').split(/\n|•/);
  return arr.map(s=>String(s).replace(/^[\s\-–—*·•]+/,'').trim()).filter(Boolean);
}
// <textarea> usa saltos de línea; <input> usa " • "
function setLista(id,arr){
  const e=document.getElementById(id);if(!e)return;
  e.value=normalizarLista(arr).join(e.tagName==='TEXTAREA'?'\n':' • ');
}
function getLista(id){return normalizarLista(getValue(id))}

// Separa "Etiqueta: descripción" (para metodología de adaptaciones)
function splitEtq(t){
  const m=String(t).match(/^([^:.]{3,70}):\s*([\s\S]+)$/);
  return m?[m[1],m[2]]:null;
}
function htmlLista(arr,etq){
  const l=normalizarLista(arr);
  if(!l.length) return '';
  return `<ul>${l.map(x=>{
    const p=etq?splitEtq(x):null;
    return `<li>${p?`<strong>${esc(p[0])}:</strong> ${esc(p[1])}`:esc(x)}</li>`;
  }).join('')}</ul>`;
}
// Párrafos separados (momentos del proceso formativo y recursos)
function htmlParrafos(arr,alinear){
  return normalizarLista(arr).map(p=>`<div class="par"${alinear?` style="text-align:${alinear}"`:''}>${esc(p)}</div>`).join('');
}

// Cantidad de criterios (viñetas) por dimensión
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
      'Uso de material visual: Empleo de láminas educativas de gran formato con esquemas y analogías sencillas sobre '+t+', que permitan fijar las nociones de forma intuitiva y colorida.',
      'Explicaciones paso a paso: División de los contenidos y ejercicios en secuencias guiadas, desarrollando un procedimiento a la vez de manera pausada.',
      'Apoyo individual: Orientación y tutoría personalizada del docente durante las actividades, complementada con el apoyo solidario de un compañero tutor dentro del equipo.',
      'Aprendizaje práctico: Priorización de la interacción directa y concreta con los materiales para consolidar los principios teóricos mediante la acción.'
    ],
    resultados:[
      'El estudiante reconoce los conceptos fundamentales del tema y su aplicación en situaciones cotidianas de su hogar y comunidad.',
      'El estudiante asimila los procedimientos básicos y los aplica de forma guiada, con seguridad y orden.',
      'El estudiante participa activamente en los trabajos prácticos, integrándose socialmente y registrando datos básicos de forma guiada.'
    ],
    ser:['Manifiesta interés y esfuerzo propio en las tareas escolares y demuestra compañerismo al integrarse en las actividades.'],
    saber:['Reconoce los conceptos fundamentales del tema, respondiendo con apoyo en evaluaciones orales o gráficas.'],
    hacer:['Realiza las prácticas sencillas siguiendo pautas preestablecidas y presenta un producto simplificado.']
  };
}

// ══ GENERACIÓN IA (una sola llamada) ══
async function generarConIA(){
  const desc=getValue('ia-descripcion'), ctx=getValue('ia-contexto');
  const adapPedido=getValue('ia-adaptacion');
  const area=getValue('f-area')||'el área indicada';
  const grado=getValue('f-grado')||'6to de Secundaria';
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

  const prompt=`Eres maestro boliviano experto en planificación curricular (Ley 070 Avelino Siñani–Elizardo Pérez, Modelo Educativo Sociocomunitario Productivo, nivel secundario). Genera un PDC mensual profesional con el formato oficial de los PDC bolivianos.
Área: ${area} | Año: ${grado} | Tema general del mes: ${tema}
Objetivo Holístico de Nivel: ${objNivel}
Contexto: ${ctx||'(sin contexto adicional)'}
Semanas (temas, herramientas, materiales, productos): ${desc}
Pedido de adaptación curricular del docente: ${adapPedido||'(no especificó: genera la adaptación de forma automática)'}

REGLAS GENERALES:
- Adapta la naturaleza de las actividades al ÁREA (ciencias: observación del entorno, experimentación y laboratorio; matemática: problemas contextualizados; lenguaje/comunicación: lectura, análisis y producción de textos; ciencias sociales: investigación comunitaria y debate; técnica/artes: taller y proyecto, etc.).
- Redacta en estilo nominal/técnico propio de los PDC bolivianos: "Observación guiada de...", "Diálogo comunitario a partir de...", "Explicación de...", "Elaboración de...", "Reflexión comunitaria sobre...". Vincula siempre con la comunidad y el contexto productivo.
- Usa las herramientas, materiales y productos que describe el docente. Producto distinto cada semana. Respeta el orden de las semanas del docente.
- Cada semana sigue la secuencia PRÁCTICA→TEORÍA→PRODUCCIÓN→VALORACIÓN, coherente con el contenido de esa semana.

FORMATO DE CADA SEMANA:
- contenido: subtema de la semana (3 a 8 palabras).
- practica: ARREGLO de exactamente 2 actividades, cada una de 1 oración corta (máx. 25 palabras).
- teoria: ARREGLO de exactamente 2 párrafos, cada uno de 1 oración corta (máx. 25 palabras) con terminología técnica del área.
- produccion: 1 oración (máx. 20 palabras) con el producto concreto de la semana.
- valoracion: 1 oración (máx. 20 palabras) de reflexión comunitaria / Vivir Bien.
- recursos: ARREGLO de 4 materiales muy cortos (2 a 5 palabras cada uno).
SÉ BREVE: no repitas ideas ni agregues texto fuera del JSON.

OTROS CAMPOS:
- objetivo (objetivo de aprendizaje): 2-3 líneas (máx. 55 palabras), inicia con verbo en primera persona del plural (Fortalecemos, Desarrollamos, Valoramos...) + valor (SER) + estudio/análisis del contenido (SABER) + método o herramientas (HACER) + finalidad comunitaria, basado en el Objetivo Holístico de Nivel y el tema general.
- criterios: son para CALIFICAR a los estudiantes. Cada dimensión es un ARREGLO de viñetas (strings). ${reglaCrit}
  Cada viñeta: 15-20 palabras, verbo observable en tercera persona (ej. "Demuestra", "Explica", "Elabora"), contenido concreto de la semana e indicador de logro medible.
  SER se deriva de la VALORACIÓN; SABER de la TEORÍA; HACER de la PRÁCTICA y PRODUCCIÓN.
- adaptacion (estudiantes con ritmo lento o dificultades de aprendizaje): si el docente pidió algo específico, respétalo. Si no, genérala automáticamente vinculada al tema "${tema}".
  "metodo" = exactamente 4 viñetas de máx. 20 palabras con formato "Título corto: descripción" (ej. "Uso de material visual: ...", "Explicaciones paso a paso: ...", "Apoyo individual: ...", "Aprendizaje práctico: ...").
  "resultados" = exactamente 3 viñetas de máx. 15 palabras que inician con "El estudiante...".
  "ser", "saber", "hacer" = 1 viñeta de máx. 15 palabras cada una.

Responde SOLO JSON válido con esta estructura:
{"objetivo":"","semanas":[{"contenido":"","practica":["",""],"teoria":["",""],"produccion":"","valoracion":"","recursos":["","","",""]},{...},{...},{...}],
"criterios":{"ser":["..."],"saber":["..."],"hacer":["..."]},
"adaptacion":{"metodo":["..."],"resultados":["..."],"ser":["..."],"saber":["..."],"hacer":["..."]}}
Las "semanas" deben ser exactamente 4 objetos completos.`;

  try{
    const resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({
        model:'openai/gpt-oss-120b',max_tokens:3500,temperature:0.5,
        reasoning_effort:'low',
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
    semanas.map((s,i)=>box('📅 '+ORD[i]+' SEMANA',
      `<div class="campo"><label>Contenido/Subtema</label><input type="text" id="cs${i}-cont" value="${esc(s.contenido)}"></div>`+
      f('Práctica (una actividad por línea)',`cs${i}-prac`,lst(s.practica),6)+
      f('Teoría (un párrafo por línea)',`cs${i}-teor`,lst(s.teoria),6)+
      f('Producción',`cs${i}-prod`,lst(s.produccion),3)+
      f('Valoración',`cs${i}-val`,lst(s.valoracion),3)+
      f('Recursos (uno por línea)',`cs${i}-rec`,lst(s.recursos),5)
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
    encabezado:getValue('f-encabezado'), // opcional: ej. "COMUNICARSE: 76418463 LIC. NOMBRE APELLIDO"
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
.pdc-enc{text-align:right;font-size:8pt;font-weight:bold;color:#1a3a6b;margin-bottom:3px}
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
.cel-cont{background:#fff8e8;font-size:7pt;text-align:center;vertical-align:middle}
.cel-cont .tg{font-weight:bold;display:block;margin-bottom:8px}
.cel-crit{background:#fafbff;font-size:7pt;line-height:1.35;text-align:justify}
.cel-crit .bl{margin-bottom:6px}
.sl{font-weight:bold;color:#1a3a6b;font-size:7pt;text-transform:uppercase;background:#d0d8e8;padding:1px 3px;display:block;margin-bottom:3px}
.sub{font-weight:bold;font-size:7pt;display:block}
.mom{margin-bottom:4px}
.par{margin:0 0 3px;text-align:justify}
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
  const momento=(t,x)=>{
    const l=normalizarLista(x);
    return l.length?`<div class="mom"><span class="sub">${t}:</span>${htmlParrafos(l)}</div>`:'';
  };
  return `
  ${d.encabezado?`<div class="pdc-enc">${esc(d.encabezado)}</div>`:''}
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
      <td class="cel-cont">${i===0?`<span class="tg">${esc(d.tema)}</span>`:''}${esc(s.contenido)}</td>
      <td><span class="sl">${ORD[i]} SEMANA</span>
        ${momento('PRÁCTICA',s.practica)}
        ${momento('TEORÍA',s.teoria)}
        ${momento('PRODUCCIÓN',s.produccion)}
        ${momento('VALORACIÓN',s.valoracion)}</td>
      <td style="font-size:7pt">${htmlParrafos(s.recursos,'left')}</td>
      <td style="text-align:center;font-weight:bold;color:#1a3a6b;font-size:7pt">Semana ${i+1}</td>
      ${i===0?`<td class="cel-crit" rowspan="4">
        <span class="sl">SEMANAS 1 – 4</span>
        <div class="bl"><span class="ct">SER</span>${htmlLista(c.ser)}</div>
        <div class="bl"><span class="ct">SABER</span>${htmlLista(c.saber)}</div>
        <div><span class="ct">HACER</span>${htmlLista(c.hacer)}</div></td>`:''}
    </tr>`).join('')}
    </tbody>
  </table>
  <div class="sec-tit">Adaptaciones curriculares: <span style="font-weight:normal;font-size:7.5pt">(Estudiantes con: dificultades en el aprendizaje-generales y específicos-o ritmos de aprendizaje distinto y otros)</span></div>
  <table class="tbl-adap">
    <thead><tr><th style="width:14%">Contenidos</th><th style="width:15%">Discapacidad / Talento Extraordinario / TDAH / TEA y otros</th><th style="width:43%">Adaptación</th><th style="width:28%">Criterios de Evaluación</th></tr></thead>
    <tbody><tr>
      <td class="etq-adap">${esc(d.tema)}</td><td class="etq-adap">Ritmo lento de aprendizaje</td>
      <td class="cel-ad"><div class="h">Metodología</div>${htmlLista(a.metodo,true)}
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
    // viñeta con sangría francesa (con etiqueta en negrita opcional)
    const wb=(t,sz,etq)=>{
      const p=etq?splitEtq(t):null;
      const cuerpo=p?wr(p[0]+': ',true,sz||12)+wr(p[1],false,sz||12):wr(t,false,sz||12);
      return wp(wr('•\u00A0',true,sz||12,'1A3A6B')+cuerpo,'both','10','20','<w:ind w:left="200" w:hanging="200"/>');
    };
    const wbl=(arr,sz,etq)=>normalizarLista(arr).map(x=>wb(x,sz,etq)).join('')||wp(wr(' '));
    const wh=(t,col)=>wp(wr(t,true,12,col||'2D5FA8'),'','40','10');
    const B=['top','left','bottom','right'].map(s=>`<w:${s} w:val="single" w:sz="4" w:space="0" w:color="333333"/>`).join('');
    const wc=(inner,w,fill,vm)=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${vm==='s'?'<w:vMerge w:val="restart"/>':vm==='c'?'<w:vMerge/>':''}<w:tcBorders>${B}</w:tcBorders>${fill?`<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`:''}<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="55" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="55" w:type="dxa"/></w:tcMar></w:tcPr>${inner}</w:tc>`;
    const wcT=(t,w,fill,b,sz,jc)=>wc(wp(wr(t||' ',b,sz||13),jc),w,fill);
    const wch=(t,w)=>wc(wp(wr(t,true,13,'FFFFFF'),'center'),w,'1A3A6B');
    const wtr=(cells,noSplit)=>`<w:tr>${noSplit?'<w:trPr><w:cantSplit/></w:trPr>':''}${cells}</w:tr>`;
    const wt=rows=>`<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblBorders>${B}<w:insideH w:val="single" w:sz="4" w:space="0" w:color="333333"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="333333"/></w:tblBorders></w:tblPr>${rows}</w:tbl>`;
    // párrafos separados (una línea del arreglo = un párrafo)
    const paras=(x,jc,sz)=>normalizarLista(x).map(l=>wp(wr(l,false,sz||12),jc||'','10','30')).join('')||wp(wr(' '));

    // Datos referenciales
    const e=Math.round(W*.21),v=Math.round(W/2)-e;
    const fila=(l1,v1,l2,v2)=>wtr(wcT(l1,e,'D0D8E8',true,13)+wcT(v1,v,null,false,13)+wcT(l2,e,'D0D8E8',true,13)+wcT(v2,v,null,false,13));
    const tblRef=wt(fila('DISTRITO EDUCATIVO',d.distrito,'UNIDAD EDUCATIVA',d.unidad)+fila('NIVEL','SECUNDARIO','AÑO DE ESCOLARIDAD',d.grado+' — PAR. '+d.paralelo)+fila('DIRECTOR (A)',d.director,'MAESTRO (A)',d.maestro)+fila('ÁREA',d.area,'TRIMESTRE',d.trimestre)+
      wtr(wcT('FECHA',e,'D0D8E8',true,13)+wc(wp(wr(d.fecha||' ',false,13)),W-e)));

    // Tabla PDC
    const w1=Math.round(W*.13),w2=Math.round(W*.12),w3=Math.round(W*.31),w4=Math.round(W*.11),w5=Math.round(W*.06),w6=W-w1-w2-w3-w4-w5;
    const critXml=wp(wr('SEMANAS 1 – 4',true,12,'1A3A6B'),'','40','40')+
      wh('SER')+wbl(c.ser)+wh('SABER')+wbl(c.saber)+wh('HACER')+wbl(c.hacer);
    const momW=(k,x)=>{
      const l=normalizarLista(x);
      return l.length?wp(wr(k+':',true,12),'','40','10')+paras(l,'both'):'';
    };
    const filas=d.semanas.map((s,i)=>{
      const mom=wp(wr(ORD[i]+' SEMANA',true,12,'1A3A6B'),'','20','40')+
        momW('PRÁCTICA',s.practica)+momW('TEORÍA',s.teoria)+momW('PRODUCCIÓN',s.produccion)+momW('VALORACIÓN',s.valoracion);
      const cont=(i===0?wp(wr(d.tema,true,13),'center','20','160'):'')+wp(wr(s.contenido,false,12),'center');
      return wtr(
        (i===0?wc(wp(wr(d.objetivo,false,13),'both'),w1,'EEF2FF','s'):wc(wp(wr(' ')),w1,'EEF2FF','c'))+
        wc(cont,w2,'FFF8E8')+wc(mom,w3)+wc(paras(s.recursos,'left',12),w4)+
        wc(wp(wr('Semana '+(i+1),true,12,'1A3A6B'),'center'),w5)+
        (i===0?wc(critXml,w6,'FAFBFF','s'):wc(wp(wr(' ')),w6,'FAFBFF','c')),
      false);
    }).join('');
    const tblPDC=wt(wtr(wch('Objetivo de aprendizaje',w1)+wch('Contenidos',w2)+wch('Momentos del proceso formativo',w3)+wch('Recursos',w4)+wch('Periodos',w5)+wch('Criterios de evaluación',w6))+filas);

    // Adaptaciones
    const a1=Math.round(W*.14),a2=Math.round(W*.15),a3=Math.round(W*.43),a4=W-a1-a2-a3;
    const adMet=wh('METODOLOGÍA','1A3A6B')+wbl(a.metodo,12,true)+wh('RESULTADOS ESPERADOS','1A3A6B')+wbl(a.resultados);
    const adCrit=wh('SER')+wbl(a.ser)+wh('SABER')+wbl(a.saber)+wh('HACER')+wbl(a.hacer);
    const tblAdap=wt(wtr(wch('Contenidos',a1)+wch('Discapacidad / Talento Extraordinario / TDAH / TEA y otros',a2)+wch('Adaptación',a3)+wch('Criterios de Evaluación',a4))+
      wtr(wcT(d.tema,a1,'EEF2FF',true,12,'center')+wcT('Ritmo lento de aprendizaje',a2,'EEF2FF',false,12,'center')+wc(adMet,a3)+wc(adCrit,a4),true));

    // Firmas
    const wF=Math.round(W*.42),nb='<w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>';
    const fc=(t,w)=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${t?'<w:tcBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="333333"/></w:tcBorders>':nb}</w:tcPr>${wp(wr(t||' ',false,14,null,true),'center',t?'60':'360','40')}</w:tc>`;
    const tblFirmas=`<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/></w:tblPr>${wtr(fc('Firma y sello del docente',wF)+fc('',W-wF*2)+fc('Firma y sello del director (a)',wF),true)}</w:tbl>`;

    const tit=(t,sz)=>wp(wr(t,true,sz,'1A3A6B'),'center','80','40');
    const sec=t=>wp(wr(t,true,16),'','60','30');
    const enc=d.encabezado?wp(wr(d.encabezado,true,14,'1A3A6B'),'right'):'';
    const docXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${enc}${tit('EDUCACIÓN SECUNDARIA COMUNITARIA PRODUCTIVA',22)}${tit('PLAN DE DESARROLLO CURRICULAR N°'+d.nro+'   MES: '+d.mes,18)}
${sec('I. DATOS REFERENCIALES')}${tblRef}${sec('II. DESARROLLO')}
${wp(wr('Objetivo Holístico de Nivel:',true,15))}${wp(wr(d.objNivel||' ',false,14),'both')}
${wp(wr(' '))}${tblPDC}${wp(wr(' '))}${sec('Adaptaciones curriculares: (Estudiantes con: dificultades en el aprendizaje-generales y específicos-o ritmos de aprendizaje distinto y otros)')}${tblAdap}${wp(wr(' '))}${tblFirmas}
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
