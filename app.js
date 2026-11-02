// ══ PDC Bolivia — versión ligera (solo PDC, criterios unificados) ══
let API_KEY = "";
let datosSemanas = [null,null,null,null];

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
function esc(t){return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function setValue(id,v){const e=document.getElementById(id);if(e)e.value=v}
function getValue(id){const e=document.getElementById(id);return e?e.value.trim():''}
function setIAStatus(t,m){const e=document.getElementById('ia-status');e.className='ia-status '+t;e.textContent=m}
function mostrarLoading(t){document.getElementById('load-txt').textContent=t||'...';document.getElementById('loading').classList.add('on')}
function ocultarLoading(){document.getElementById('loading').classList.remove('on')}

// ══ GENERACIÓN IA (una sola llamada, prompt compacto) ══
async function generarConIA(){
  const desc=getValue('ia-descripcion'), ctx=getValue('ia-contexto');
  const area=getValue('f-area')||'el área indicada';
  const grado=getValue('f-grado')||'5to de Secundaria';
  const tema=getValue('f-tema')||'el tema del mes';
  const objNivel=getValue('f-obj-nivel')||'(no proporcionado)';
  if(!desc){setIAStatus('err','⚠️ Describe los 4 temas semanales primero.');return;}

  setIAStatus('cargando','⏳ Generando PDC con Groq...');
  document.getElementById('btn-ia').disabled=true;
  mostrarLoading('Generando PDC con IA...');

  const prompt=`Eres maestro boliviano experto en planificación curricular (Ley 070, nivel secundario). Genera un PDC mensual.
Área: ${area} | Año: ${grado} | Tema: ${tema}
Objetivo Holístico de Nivel: ${objNivel}
Contexto: ${ctx}
Semanas (herramientas, materiales, productos): ${desc}

REGLAS:
- Usa las herramientas y productos que describe el docente en PRÁCTICA, PRODUCCIÓN y recursos. Producto distinto cada semana.
- Coherencia: PRÁCTICA→TEORÍA→PRODUCCIÓN→VALORACIÓN.
- Longitud: práctica 4-5 oraciones (2 actividades con pasos y materiales); teoría 3-4 oraciones con terminología técnica; producción 2-3 oraciones; valoración 2 oraciones (comunidad, Vivir Bien); recursos 5 líneas separadas por \\n.
- objetivo: 3-4 líneas, verbo plural + valor (SER) + contenido (SABER) + método (HACER) + finalidad comunitaria, basado en el Objetivo Holístico.
- criterios: UNA sola evaluación del mes que integra las 4 semanas. Cada uno de 30-40 palabras, verbos observables variados e indicador de logro claro. SER = actitudes observadas en el mes; SABER = conceptos de las 4 semanas; HACER = productos de las 4 semanas.
- adaptacion: para ritmo lento, básica y alcanzable.

Responde SOLO JSON válido:
{"objetivo":"","semanas":[{"contenido":"","practica":"","teoria":"","produccion":"","valoracion":"","recursos":""},{...},{...},{...}],
"criterios":{"ser":"","saber":"","hacer":""},
"adaptacion":{"metodo":"material visual, pasos simples, apoyo individual, práctica manipulativa específicos del tema","resultados":"3 logros básicos concretos","ser":"1-2 oraciones","saber":"1-2 oraciones","hacer":"1-2 oraciones"}}
Las "semanas" deben ser exactamente 4 objetos completos.`;

  try{
    const resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({
        model:'openai/gpt-oss-120b',max_tokens:3000,temperature:0.5,
        response_format:{type:'json_object'},
        messages:[
          {role:'system',content:'Experto en educación boliviana SEP. Respondes solo JSON válido.'},
          {role:'user',content:prompt}
        ]
      })
    });
    if(!resp.ok){const e=await resp.json();throw new Error(e.error?.message||'Error en la API de Groq');}
    const data=await resp.json();
    let js=data.choices[0].message.content.trim().replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();
    const r=JSON.parse(js);
    if(!r.semanas||r.semanas.length<4) throw new Error('La IA no devolvió las 4 semanas. Intente de nuevo.');

    datosSemanas=r.semanas;
    if(r.objetivo) setValue('f-objetivo',r.objetivo);
    const c=r.criterios||{};
    setValue('cr-ser',c.ser||'');setValue('cr-saber',c.saber||'');setValue('cr-hacer',c.hacer||'');
    const a=r.adaptacion||{};
    setValue('f-adap-met',a.metodo||'');setValue('f-adap-res',a.resultados||'');
    setValue('f-adap-ser',a.ser||'');setValue('f-adap-saber',a.saber||'');setValue('f-adap-hacer',a.hacer||'');

    renderCamposSemanas(datosSemanas);
    // criterios: se guardan en los campos (cr-*) que crea renderCamposSemanas
    setValue('cr-ser',c.ser||'');setValue('cr-saber',c.saber||'');setValue('cr-hacer',c.hacer||'');
    document.getElementById('sec-contenidos').style.display='block';
    setIAStatus('ok','✅ ¡PDC generado! Puedes editar antes de exportar.');
    generarVistaPreviaPDC();
  }catch(e){
    console.error(e);setIAStatus('err','❌ Error: '+e.message);
  }finally{
    ocultarLoading();document.getElementById('btn-ia').disabled=false;
  }
}

function renderCamposSemanas(semanas){
  const box=(t,inner)=>`<details style="margin-bottom:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:6px;overflow:hidden"><summary style="padding:8px 12px;cursor:pointer;font-size:11px;font-weight:bold;color:var(--dorado);background:rgba(200,165,0,.1)">${t}</summary><div style="padding:10px">${inner}</div></details>`;
  const f=(l,id,v,r)=>`<div class="campo"><label>${l}</label><textarea id="${id}" rows="${r}">${esc(v)}</textarea></div>`;
  const prev={ser:getValue('cr-ser'),saber:getValue('cr-saber'),hacer:getValue('cr-hacer')};
  document.getElementById('campos-semanas').innerHTML=
    semanas.map((s,i)=>box('📅 SEMANA '+(i+1),
      `<div class="campo"><label>Contenido/Tema</label><input type="text" id="cs${i}-cont" value="${esc(s.contenido)}"></div>`+
      f('Práctica',`cs${i}-prac`,s.practica,3)+f('Teoría',`cs${i}-teor`,s.teoria,3)+
      f('Producción',`cs${i}-prod`,s.produccion,2)+f('Valoración',`cs${i}-val`,s.valoracion,2)+
      f('Recursos (uno por línea)',`cs${i}-rec`,s.recursos,3)
    )).join('')+
    box('🎯 CRITERIOS DE EVALUACIÓN (4 semanas)',
      f('SER','cr-ser',prev.ser,3)+f('SABER','cr-saber',prev.saber,3)+f('HACER','cr-hacer',prev.hacer,3));
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
  semanas.forEach(s=>{s.recursos=s.recursos||''});
  return {
    nro:getValue('f-nro'),mes:getValue('f-mes'),distrito:getValue('f-distrito'),unidad:getValue('f-unidad'),
    grado:getValue('f-grado'),paralelo:getValue('f-paralelo'),trimestre:getValue('f-trimestre'),
    director:getValue('f-director'),maestro:getValue('f-maestro'),area:getValue('f-area'),fecha:getValue('f-fecha'),
    objNivel:getValue('f-obj-nivel'),objetivo:getValue('f-objetivo'),tema:getValue('f-tema'),
    semanas,
    criterios:{ser:getValue('cr-ser'),saber:getValue('cr-saber'),hacer:getValue('cr-hacer')},
    adaptacion:{metodo:getValue('f-adap-met'),resultados:getValue('f-adap-res'),ser:getValue('f-adap-ser'),saber:getValue('f-adap-saber'),hacer:getValue('f-adap-hacer')}
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
.cel-obj{background:#f0f4ff;font-size:7.5pt;text-align:justify}
.cel-cont{background:#fff8e8;font-weight:bold;font-size:7pt;text-align:center;vertical-align:middle}
.cel-crit{background:#fafbff;font-size:7pt;line-height:1.4;text-align:justify}
.cel-crit .bl{margin-bottom:8px}
.sl{font-weight:bold;color:#1a3a6b;font-size:7pt;text-transform:uppercase;background:#d0d8e8;padding:1px 3px;display:block;margin-bottom:2px}
.sub{font-weight:bold;font-size:7pt}
.ct{font-weight:bold;color:#2d5fa8;font-size:7pt}
.tbl-adap{width:100%;border-collapse:collapse;font-size:7.5pt;border:1.5px solid #333;margin-bottom:6px}
.tbl-adap th{background:#1a3a6b;color:#fff;padding:4px;text-align:center;font-size:7pt;border:1px solid #333}
.tbl-adap td{border:1px solid #333;padding:4px 6px;vertical-align:top;font-size:7.5pt;line-height:1.3}
.etq-adap{background:#f0f4ff;font-weight:bold;text-align:center;font-size:7pt}
.firmas{display:flex;justify-content:space-around;margin-top:14px;padding-top:6px}
.firma-b{text-align:center;width:42%}
.firma-l{border-top:1px solid #333;margin-bottom:3px}
.firma-t{font-size:7.5pt;font-style:italic}`;

// ══ HTML DEL PDC ══
function buildPDCInner(d){
  const c=d.criterios;
  return `
  <div class="pdc-cab">
    <div class="pdc-t1">EDUCACIÓN SECUNDARIA COMUNITARIA PRODUCTIVA</div>
    <div class="pdc-t2">PLAN DE DESARROLLO CURRICULAR N°${d.nro} &nbsp;&nbsp;&nbsp; MES: ${d.mes}</div>
  </div>
  <div class="sec-tit">I. DATOS REFERENCIALES</div>
  <table class="tbl-ref">
    <tr><td class="etq">DISTRITO EDUCATIVO</td><td>${d.distrito}</td><td class="etq">UNIDAD EDUCATIVA</td><td>${d.unidad}</td></tr>
    <tr><td class="etq">NIVEL</td><td>SECUNDARIO</td><td class="etq">AÑO DE ESCOLARIDAD</td><td>${d.grado} — PARALELO ${d.paralelo}</td></tr>
    <tr><td class="etq">DIRECTOR (A)</td><td>${d.director}</td><td class="etq">MAESTRO (A)</td><td>${d.maestro}</td></tr>
    <tr><td class="etq">ÁREA</td><td>${d.area}</td><td class="etq">TRIMESTRE</td><td>${d.trimestre}</td></tr>
    <tr><td class="etq">FECHA</td><td colspan="3">${d.fecha}</td></tr>
  </table>
  <div class="sec-tit">II. DESARROLLO</div>
  <div style="font-weight:bold;font-size:9pt;margin:3px 0 2px">Objetivo Holístico de Nivel:</div>
  <div class="obj-box">${d.objNivel||'— Ingrese el Objetivo Holístico de Nivel en el formulario —'}</div>
  <table class="tbl-pdc">
    <thead><tr>
      <th style="width:13%">Objetivo de<br>aprendizaje</th><th style="width:12%">Contenidos</th>
      <th style="width:32%">Momentos del proceso formativo</th><th style="width:12%">Recursos</th>
      <th style="width:7%">Periodos</th><th style="width:24%">Criterios de evaluación</th>
    </tr></thead>
    <tbody>
    ${d.semanas.map((s,i)=>`<tr>
      ${i===0?`<td class="cel-obj" rowspan="4">${d.objetivo}</td>`:''}
      <td class="cel-cont">${i===0?`<strong>${d.tema}</strong><br><br>`:''}<span style="font-weight:normal;font-style:italic;font-size:7pt">${s.contenido}</span></td>
      <td><span class="sl">SEMANA ${i+1}</span>
        <span class="sub">PRÁCTICA:</span><br>${s.practica}<br>
        <span class="sub">TEORÍA:</span><br>${s.teoria}<br>
        <span class="sub">PRODUCCIÓN:</span><br>${s.produccion}<br>
        <span class="sub">VALORACIÓN:</span><br>${s.valoracion}</td>
      <td style="font-size:7pt">${s.recursos.replace(/\n/g,'<br>')}</td>
      <td style="text-align:center;font-weight:bold;color:#1a3a6b;font-size:7pt">Semana ${i+1}</td>
      ${i===0?`<td class="cel-crit" rowspan="4">
        <span class="sl">SEMANAS 1 – 4</span>
        <div class="bl"><span class="ct">SER:</span> ${c.ser}</div>
        <div class="bl"><span class="ct">SABER:</span> ${c.saber}</div>
        <div><span class="ct">HACER:</span> ${c.hacer}</div></td>`:''}
    </tr>`).join('')}
    </tbody>
  </table>
  <div class="sec-tit">Adaptaciones curriculares: <span style="font-weight:normal;font-size:7.5pt">(Estudiantes con dificultades en el aprendizaje o ritmos de aprendizaje distinto y otros)</span></div>
  <table class="tbl-adap">
    <thead><tr><th style="width:15%">Contenidos</th><th style="width:18%">Discapacidad / TDAH / TEA / Ritmo lento</th><th style="width:42%">Adaptación</th><th style="width:25%">Criterios de Evaluación</th></tr></thead>
    <tbody><tr>
      <td class="etq-adap">${d.tema}</td><td class="etq-adap">Ritmo lento de aprendizaje</td>
      <td><strong style="font-size:7pt">METODOLOGÍA</strong><br><span style="font-size:7pt">${d.adaptacion.metodo.replace(/\n\n/g,'<br><br>').replace(/\n/g,' ')}</span><br><br>
        <strong style="font-size:7pt">RESULTADOS ESPERADOS</strong><br><span style="font-size:7pt">${d.adaptacion.resultados}</span></td>
      <td><div style="margin-bottom:3px"><span class="ct">SER:</span> <span style="font-size:7pt">${d.adaptacion.ser}</span></div>
        <div style="margin-bottom:3px"><span class="ct">SABER:</span> <span style="font-size:7pt">${d.adaptacion.saber}</span></div>
        <div><span class="ct">HACER:</span> <span style="font-size:7pt">${d.adaptacion.hacer}</span></div></td>
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

// ══ EDICIÓN: lleva al panel de contenidos editables ══
function abrirEdicion(){
  const sec=document.getElementById('sec-contenidos');
  if(sec.style.display==='none'){
    renderCamposSemanas(datosSemanas.map((s,i)=>s||{contenido:'Semana '+(i+1),practica:'',teoria:'',produccion:'',valoracion:'',recursos:''}));
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

// ══ EXPORT WORD (solo PDC) ══
async function exportarWord(){
  if(!document.getElementById('pdc-doc')){alert('Genera la vista previa primero.');return;}
  if(typeof JSZip==='undefined'){
    mostrarLoading('Cargando librería...');
    await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  }
  mostrarLoading('Generando Word (.docx)...');
  try{
    const d=leerDatos(),c=d.criterios,a=d.adaptacion;
    const xe=t=>(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const wr=(t,b,sz,col,it)=>`<w:r><w:rPr>${b?'<w:b/>':''}${it?'<w:i/>':''}${col?`<w:color w:val="${col}"/>`:''}<w:sz w:val="${sz||14}"/><w:szCs w:val="${sz||14}"/></w:rPr><w:t xml:space="preserve">${xe(String(t))}</w:t></w:r>`;
    const wp=(runs,jc,bf,af)=>`<w:p><w:pPr>${jc?`<w:jc w:val="${jc}"/>`:''}<w:spacing w:before="${bf||20}" w:after="${af||20}"/></w:pPr>${runs}</w:p>`;
    const B=['top','left','bottom','right'].map(s=>`<w:${s} w:val="single" w:sz="4" w:space="0" w:color="333333"/>`).join('');
    const wc=(inner,w,fill,vm)=>`<w:tc><w:tcPr>${vm==='s'?'<w:vMerge w:val="restart"/>':vm==='c'?'<w:vMerge/>':''}<w:tcW w:w="${w}" w:type="dxa"/><w:tcBorders>${B}</w:tcBorders>${fill?`<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`:''}<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="55" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="55" w:type="dxa"/></w:tcMar></w:tcPr>${inner}</w:tc>`;
    const wcT=(t,w,fill,b,sz,jc)=>wc(wp(wr(t||' ',b,sz||13),jc),w,fill);
    const wch=(t,w)=>wc(wp(wr(t,true,13,'FFFFFF'),'center'),w,'1A3A6B');
    const wtr=cells=>`<w:tr>${cells}</w:tr>`;
    const wt=(rows)=>`<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblBorders>${B}<w:insideH w:val="single" w:sz="4" w:space="0" w:color="333333"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="333333"/></w:tblBorders></w:tblPr>${rows}</w:tbl>`;
    const W=10766;
    const lines=(t,sz)=>(t||'').split('\n').filter(l=>l.trim()).map(l=>wp(wr(l,false,sz||12))).join('')||wp(wr(' '));

    // Datos referenciales
    const e=Math.round(W*.21),v=Math.round(W/2)-e;
    const fila=(l1,v1,l2,v2)=>wtr(wcT(l1,e,'D0D8E8',true,13)+wcT(v1,v,null,false,13)+wcT(l2,e,'D0D8E8',true,13)+wcT(v2,v,null,false,13));
    const tblRef=wt(fila('DISTRITO EDUCATIVO',d.distrito,'UNIDAD EDUCATIVA',d.unidad)+fila('NIVEL','SECUNDARIO','AÑO DE ESCOLARIDAD',d.grado+' — PAR. '+d.paralelo)+fila('DIRECTOR (A)',d.director,'MAESTRO (A)',d.maestro)+fila('ÁREA',d.area,'TRIMESTRE',d.trimestre)+
      wtr(wcT('FECHA',e,'D0D8E8',true,13)+wc(wp(wr(d.fecha||' ',false,13)),W-e)));

    // Tabla PDC con criterios unificados (celda combinada)
    const w1=Math.round(W*.13),w2=Math.round(W*.12),w3=Math.round(W*.32),w4=Math.round(W*.12),w5=Math.round(W*.07),w6=W-w1-w2-w3-w4-w5;
    const critXml=wp(wr('SEMANAS 1 – 4',true,12,'1A3A6B'),'','40','60')+
      wp(wr('SER: ',true,12,'2D5FA8')+wr(c.ser,false,12),'both','20','80')+
      wp(wr('SABER: ',true,12,'2D5FA8')+wr(c.saber,false,12),'both','20','80')+
      wp(wr('HACER: ',true,12,'2D5FA8')+wr(c.hacer,false,12),'both','20','40');
    const filas=d.semanas.map((s,i)=>{
      const mom=wp(wr('SEMANA '+(i+1),true,12,'1A3A6B'))+
        ['PRÁCTICA','TEORÍA','PRODUCCIÓN','VALORACIÓN'].map((k,j)=>wp(wr(k+': ',true,12)+wr([s.practica,s.teoria,s.produccion,s.valoracion][j],false,12))).join('');
      const cont=(i===0?wp(wr(d.tema,true,13),'center'):'')+wp(wr(s.contenido,false,12,null,true),'center');
      return wtr(
        (i===0?wc(wp(wr(d.objetivo,false,13),'both'),w1,'EEF2FF','s'):wc(wp(wr(' ')),w1,'EEF2FF','c'))+
        wc(cont,w2,'FFF8E8')+wc(mom,w3)+wc(lines(s.recursos),w4)+
        wc(wp(wr('Sem '+(i+1),true,12,'1A3A6B'),'center'),w5)+
        (i===0?wc(critXml,w6,'FAFBFF','s'):wc(wp(wr(' ')),w6,'FAFBFF','c'))
      );
    }).join('');
    const tblPDC=wt(wtr(wch('Objetivo de aprendizaje',w1)+wch('Contenidos',w2)+wch('Momentos del proceso formativo',w3)+wch('Recursos',w4)+wch('Periodos',w5)+wch('Criterios de evaluación',w6))+filas);

    // Adaptaciones
    const a1=Math.round(W*.15),a2=Math.round(W*.18),a3=Math.round(W*.42),a4=W-a1-a2-a3;
    const adMet=wp(wr('METODOLOGÍA',true,13))+wp(wr((a.metodo||'').replace(/\n/g,' '),false,12))+wp(wr('RESULTADOS ESPERADOS',true,13))+wp(wr(a.resultados,false,12));
    const adCrit=['ser','saber','hacer'].map(k=>wp(wr(k.toUpperCase()+': ',true,12,'2D5FA8')+wr(a[k],false,12))).join('');
    const tblAdap=wt(wtr(wch('Contenidos',a1)+wch('Discapacidad / TDAH / TEA / Ritmo lento',a2)+wch('Adaptación',a3)+wch('Criterios de Evaluación',a4))+
      wtr(wcT(d.tema,a1,'EEF2FF',true,12,'center')+wcT('Ritmo lento de aprendizaje',a2,'EEF2FF',false,12,'center')+wc(adMet,a3)+wc(adCrit,a4)));

    // Firmas
    const wF=Math.round(W*.42),nb='<w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>';
    const fc=(t,w)=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${t?'<w:tcBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="333333"/></w:tcBorders>':nb}</w:tcPr>${wp(wr(t||' ',false,14,null,true),'center',t?'60':'360','40')}</w:tc>`;
    const tblFirmas=`<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/></w:tblPr>${wtr(fc('Firma y sello del docente',wF)+fc('',W-wF*2)+fc('Firma y sello del director (a)',wF))}</w:tbl>`;

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
