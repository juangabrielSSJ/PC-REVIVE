// ══ CONTRASEÑA ══
let API_KEY = "";
let datosSemanas = [null,null,null,null];
let datosRubrica = null;
let estudiantesActuales = [];

// ══ MAPEO GRADO -> CLAVE ══
function claveGrado(gradoVal, paralelo){
  const m = {"PRIMERO DE SECUNDARIA":"1","SEGUNDO DE SECUNDARIA":"2","TERCERO DE SECUNDARIA":"3","CUARTO DE SECUNDARIA":"4","QUINTO DE SECUNDARIA":"5","SEXTO DE SECUNDARIA":"6"};
  return (m[gradoVal]||"1") + paralelo.toUpperCase();
}

function actualizarParalelos(){
  actualizarEstudiantes();
}

function intentarLogin(){
  const pass  = document.getElementById('inp-pass').value.trim();
  const api   = document.getElementById('inp-apikey').value.trim();
  const errEl = document.getElementById('login-err');
  errEl.style.display = 'none';

  const hashIngresado = btoa(pass + 'pdc_salt_2026');
  if(btoa('pdc2026' + 'pdc_salt_2026') !== hashIngresado){
    errEl.style.display = 'block';
    errEl.textContent = '⚠️ Contraseña incorrecta.';
    return;
  }

  if(!api.startsWith('gsk_')){
    errEl.style.display = 'block';
    errEl.textContent = '⚠️ La API Key debe comenzar con "gsk_".';
    return;
  }

  API_KEY = api;
  document.getElementById('pantalla-login').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  actualizarEstudiantes();
}

document.addEventListener('keydown', e=>{
  if(e.key==='Enter' && document.getElementById('pantalla-login').style.display!=='none') intentarLogin();
});
function cerrarSesion(){
  API_KEY="";
  document.getElementById('inp-pass').value='';
  document.getElementById('inp-apikey').value='';
  document.getElementById('pantalla-login').style.display='flex';
  document.getElementById('app').style.display='none';
  document.getElementById('login-err').style.display='none';
}



function actualizarEstudiantes(){
  const grado = document.getElementById('f-grado').value;
  const paralelo = document.getElementById('f-paralelo').value;
  const m = {"PRIMERO DE SECUNDARIA":"1ro","SEGUNDO DE SECUNDARIA":"2do","TERCERO DE SECUNDARIA":"3ro","CUARTO DE SECUNDARIA":"4to","QUINTO DE SECUNDARIA":"5to","SEXTO DE SECUNDARIA":"6to"};
  const lbl = document.getElementById('badge-curso-lbl');
  if(lbl) lbl.textContent = (m[grado]||grado) + " " + paralelo;
  const cant = parseInt(document.getElementById('f-num-estudiantes')?.value) || 30;
  estudiantesActuales = Array.from({length: cant}, (_,i) => '');
  const info = document.getElementById('info-estudiantes');
  if(info){
    info.textContent = `✅ ${cant} filas vacías generadas — el docente escribe los nombres`;
    info.style.color = '#2ecc71';
  }
}


// ══ GENERACIÓN IA ══
async function generarConIA(){
  const desc = document.getElementById('ia-descripcion').value.trim();
  const ctx  = document.getElementById('ia-contexto').value.trim();
  const area = document.getElementById('f-area').value.trim() || 'el área indicada';
  const grado= document.getElementById('f-grado').value || '5to de Secundaria';
  const tema = document.getElementById('f-tema').value.trim() || 'el tema del mes';

  if(!desc){ setIAStatus('err','⚠️ Describe los 4 temas semanales primero.'); return; }

  setIAStatus('cargando','⏳ Llamando a Groq... generando PDC + Rúbrica...');
  document.getElementById('btn-ia').disabled=true;
  mostrarLoading('Generando PDC + Rúbrica con IA...');

  const serPts = getValue('rub-ser-pts')||'10';
  const saber1Pts = getValue('rub-saber1-pts')||'22';
  const saber2Pts = getValue('rub-saber2-pts')||'23';
  const hacer1Pts = getValue('rub-hacer1-pts')||'20';
  const hacer2Pts = getValue('rub-hacer2-pts')||'20';
  const hacer1Nom = getValue('rub-hacer1-nom')||'Actividad 1';
  const hacer2Nom = getValue('rub-hacer2-nom')||'Actividad 2';

  const objNivelVal = getValue('f-obj-nivel') || '(no proporcionado)';
  const prompt = `Eres un maestro boliviano experto en planificación de desarrollo curricular del Sistema Educativo Plurinacional (Ley 070). Genera un PDC completo para nivel secundario boliviano.

DATOS DEL PDC:
- Área: ${area} | Año: ${grado} | Tema del mes: ${tema}
- Objetivo Holístico de Nivel del docente: ${objNivelVal}
- Contexto regional: ${ctx}
- Descripción detallada por semana (herramientas, materiales y productos): ${desc}
- Puntos: SER=${serPts}pts, SABER=${saber1Pts}pts, HACER=${hacer1Pts}pts por registro

INSTRUCCIÓN CRÍTICA — USA LO QUE EL PROFESOR DESCRIBE:
Si el profesor menciona herramientas (simulador, editor, laboratorio, álbum, experimento, archivo digital), ÚSALAS en PRÁCTICA y HACER. Si menciona un producto específico, ese ES el producto de PRODUCCIÓN. Adapta al área: Sistemas usa computadoras/simuladores/archivos; Física/Química usa laboratorio/experimentos; Artes usa materiales plásticos/álbumes; Ciencias Sociales usa mapas/esquemas.

COHERENCIA VERTICAL OBLIGATORIA:
PRÁCTICA → TEORÍA → PRODUCCIÓN → VALORACIÓN → CRITERIOS (evalúan exactamente lo que pasó esa semana)
PRODUCTO diferente cada semana. CRITERIOS diferentes cada semana.

PROBLEMA A EVITAR — REPETICIÓN EN CRITERIOS:
Los criterios SER/SABER/HACER de cada semana DEBEN ser diferentes en verbo, estructura y contenido.
MAL EJEMPLO (repetitivo, PROHIBIDO):
  S1 SER: "Demostramos curiosidad..." S2 SER: "Demostramos perseverancia..." S3 SER: "Demostramos actitud..." S4 SER: "Demostramos responsabilidad..."
  (mismo verbo "Demostramos" en todo = REPETITIVO)
BUEN EJEMPLO (variado, CORRECTO):
  S1 SER: "Manifiesta responsabilidad en la entrega y colabora activamente con su grupo."
  S2 SER: "Respeta las opiniones ajenas y escucha con atención las explicaciones del docente."
  S3 SER: "Colabora de manera solidaria en los trabajos de equipo integrándose sin distinciones."
  S4 SER: "Asume con honestidad la recolección de datos y cuida los recursos e instrumentos."
Varía los verbos: Manifiesta / Respeta / Colabora / Asume / Demuestra / Participa / Valora / Integra
Varía la estructura: a veces una oración, a veces dos. A veces describe conducta en aula, a veces en práctica.

OBJETIVO DE APRENDIZAJE:
Basado en el Objetivo Holístico del docente. Extrae los valores, enfoque y finalidad. Estructura: verbo plural + SER (valor) + contenido SABER + método HACER + finalidad comunitaria. 3-4 líneas.

EXTENSIÓN: completa pero sin exagerar. Práctica: 5-6 oraciones detalladas describiendo las 2 actividades con pasos concretos y materiales. Teoría: 4-5 oraciones con terminología técnica del área, definición, análisis y vinculación al contexto local. Producción: 3 oraciones especificando el producto, su soporte y qué debe contener. Valoración: 2-3 oraciones conectando con la comunidad y el Vivir Bien. Criterios SER/SABER/HACER: 2-3 oraciones completas, observables, medibles y específicas al contenido de esa semana.

RÚBRICA — ESTRUCTURA CORRECTA:
La rúbrica se organiza por SEMANA, no por dimensión. Cada semana tiene SER + SABER + HACER juntos.
Son 4 bloques (uno por semana), cada bloque con 3 criterios (SER, SABER, HACER de esa semana).
Esto permite al profesor calificar semana a semana con los 3 criterios juntos.

Responde ÚNICAMENTE con JSON válido (sin texto adicional, sin markdown, sin backticks):
{
  "objetivo": "Objetivo de aprendizaje basado en el Objetivo Holístico, específico para el tema del mes. 3-4 líneas con estructura SER+SABER+HACER+finalidad comunitaria.",
  "semanas": [
    {
      "contenido": "Título específico del subtema semana 1",
      "practica": "Actividad concreta 1 con materiales/herramientas específicos mencionados por el docente. Segunda actividad de aula o dinámica diferente que refuerza el concepto con materiales accesibles.",
      "teoria": "Concepto principal con terminología técnica del área. Análisis vinculado al contexto local y aplicaciones prácticas en la comunidad.",
      "produccion": "Elaboración de [PRODUCTO ESPECÍFICO semana 1 — diferente en cada semana] en [soporte/herramienta concreta] que contenga [elementos específicos].",
      "valoracion": "Reflexión sobre la aplicación del conocimiento en la vida comunitaria orientada al Vivir Bien.",
      "recursos": "Herramienta o material específico 1\nMaterial concreto 2\nMaterial concreto 3\nMaterial concreto 4\nMaterial concreto 5",
      "ser": "Criterio SER semana 1 — verbo diferente a las otras semanas. Actitud observable específica de esta semana.",
      "saber": "Criterio SABER semana 1 — conocimiento específico de este contenido que el estudiante explica o identifica.",
      "hacer": "Criterio HACER semana 1 — evalúa exactamente el producto de PRODUCCIÓN de esta semana con sus características."
    },
    {
      "contenido": "Título específico subtema semana 2",
      "practica": "Actividad diferente a semana 1 con metodología y materiales distintos.",
      "teoria": "Concepto de semana 2, diferente y complementario al de semana 1.",
      "produccion": "Elaboración de [PRODUCTO DIFERENTE AL DE SEMANA 1] con especificaciones concretas.",
      "valoracion": "Reflexión diferente vinculada al contenido específico de esta semana.",
      "recursos": "Material específico semana 2\nMaterial 2\nMaterial 3\nMaterial 4\nMaterial 5",
      "ser": "Criterio SER semana 2 — verbo DIFERENTE al de semana 1. Actitud específica de las actividades de esta semana.",
      "saber": "Criterio SABER semana 2 — concepto diferente al de semana 1.",
      "hacer": "Criterio HACER semana 2 — evalúa el producto específico de semana 2, diferente al de semana 1."
    },
    {
      "contenido": "Título específico subtema semana 3",
      "practica": "Actividad diferente a semanas anteriores.",
      "teoria": "Concepto de semana 3, avanzando sobre los anteriores.",
      "produccion": "Elaboración de [PRODUCTO DIFERENTE — maqueta/mapa/organizador/archivo/cartel] con especificaciones.",
      "valoracion": "Reflexión vinculada al contenido específico de semana 3.",
      "recursos": "Material específico semana 3\nMaterial 2\nMaterial 3\nMaterial 4\nMaterial 5",
      "ser": "Criterio SER semana 3 — verbo DIFERENTE a semanas 1 y 2.",
      "saber": "Criterio SABER semana 3 — concepto específico diferente.",
      "hacer": "Criterio HACER semana 3 — evalúa el producto específico de semana 3."
    },
    {
      "contenido": "Título específico subtema semana 4",
      "practica": "Actividad integradora de cierre, diferente a las anteriores.",
      "teoria": "Concepto integrador o aplicado de semana 4.",
      "produccion": "Elaboración de [PRODUCTO FINAL — informe/cartel/portafolio/archivo final] diferente a todas las anteriores.",
      "valoracion": "Reflexión final de cierre del mes vinculada al Vivir Bien.",
      "recursos": "Material específico semana 4\nMaterial 2\nMaterial 3\nMaterial 4\nMaterial 5",
      "ser": "Criterio SER semana 4 — verbo DIFERENTE a semanas 1, 2 y 3. Actitud de cierre y responsabilidad.",
      "saber": "Criterio SABER semana 4 — conocimiento integrador del tema.",
      "hacer": "Criterio HACER semana 4 — evalúa el producto final, diferente a los anteriores."
    }
  ],
  "adaptacion": {
    "metodo": "Uso de material visual: descripción específica para este tema y área. Explicaciones paso a paso: cómo se fragmenta este contenido específico en pasos simples. Apoyo individual: tipo de apoyo concreto para las actividades de este tema. Aprendizaje práctico: actividad táctil o manipulativa específica de este contenido.",
    "resultados": "El estudiante logra [logro básico 1 concreto del tema]. El estudiante asimila [logro básico 2 con aplicación práctica]. El estudiante participa [logro de integración social o práctica].",
    "ser": "Criterio SER adaptado básico y alcanzable en 1-2 oraciones.",
    "saber": "Criterio SABER adaptado con conceptos fundamentales del tema en 1-2 oraciones.",
    "hacer": "Criterio HACER adaptado con producto simplificado pero concreto en 1-2 oraciones."
  },
  "rubrica": {
    "semanas": [
      {
        "titulo": "SEMANA 1 — [contenido semana 1]",
        "ser": {
          "nombre": "SER Semana 1: [actitud específica de semana 1]",
          "excelente": "Descripción excelente específica de la actitud de semana 1 en 1-2 oraciones.",
          "bueno": "Descripción buena en 1 oración.",
          "regular": "Descripción regular en 1 oración.",
          "insuficiente": "Descripción insuficiente en 1 oración."
        },
        "saber": {
          "nombre": "SABER Semana 1: [concepto específico de semana 1]",
          "excelente": "Explica con precisión el concepto de semana 1 relacionándolo con el contexto local.",
          "bueno": "Explica correctamente con mínimos errores.",
          "regular": "Identifica con apoyo del docente.",
          "insuficiente": "No identifica ni explica el concepto."
        },
        "hacer": {
          "nombre": "HACER Semana 1: [producto específico de semana 1]",
          "excelente": "Elabora el producto de semana 1 completo, bien organizado y sin errores.",
          "bueno": "Elabora con detalles menores a mejorar.",
          "regular": "Elabora el producto básico con apoyo.",
          "insuficiente": "No elabora el producto solicitado."
        }
      },
      {
        "titulo": "SEMANA 2 — [contenido semana 2]",
        "ser": {"nombre": "SER Semana 2: [actitud específica semana 2]", "excelente": "...", "bueno": "...", "regular": "...", "insuficiente": "..."},
        "saber": {"nombre": "SABER Semana 2: [concepto semana 2]", "excelente": "...", "bueno": "...", "regular": "...", "insuficiente": "..."},
        "hacer": {"nombre": "HACER Semana 2: [producto semana 2]", "excelente": "...", "bueno": "...", "regular": "...", "insuficiente": "..."}
      },
      {
        "titulo": "SEMANA 3 — [contenido semana 3]",
        "ser": {"nombre": "SER Semana 3: [actitud específica semana 3]", "excelente": "...", "bueno": "...", "regular": "...", "insuficiente": "..."},
        "saber": {"nombre": "SABER Semana 3: [concepto semana 3]", "excelente": "...", "bueno": "...", "regular": "...", "insuficiente": "..."},
        "hacer": {"nombre": "HACER Semana 3: [producto semana 3]", "excelente": "...", "bueno": "...", "regular": "...", "insuficiente": "..."}
      },
      {
        "titulo": "SEMANA 4 — [contenido semana 4]",
        "ser": {"nombre": "SER Semana 4: [actitud específica semana 4]", "excelente": "...", "bueno": "...", "regular": "...", "insuficiente": "..."},
        "saber": {"nombre": "SABER Semana 4: [concepto semana 4]", "excelente": "...", "bueno": "...", "regular": "...", "insuficiente": "..."},
        "hacer": {"nombre": "HACER Semana 4: [producto semana 4]", "excelente": "...", "bueno": "...", "regular": "...", "insuficiente": "..."}
      }
    ]
  }
}`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body: JSON.stringify({
        model:'llama-3.3-70b-versatile',
        max_tokens:6000,
        temperature:0.5,
        response_format:{type:'json_object'},
        messages:[
          {role:'system',content:'Eres experto en educación boliviana SEP Ley 070. Respondes ÚNICAMENTE con JSON válido sin texto adicional ni backticks.'},
          {role:'user',content:prompt}
        ]
      })
    });

    if(!resp.ok){ const err = await resp.json(); throw new Error(err.error?.message||'Error en la API de Groq'); }

    const data = await resp.json();
    let jsonStr = data.choices[0].message.content.trim();
    jsonStr = jsonStr.replace(/^```json\s*/,'').replace(/```\s*$/,'').replace(/^```\s*/,'').trim();
    const resultado = JSON.parse(jsonStr);

    if(!resultado.semanas || resultado.semanas.length < 4) throw new Error('La IA no devolvió las 4 semanas. Intente de nuevo.');

    datosSemanas = resultado.semanas;
    datosRubrica = resultado.rubrica || null;
    // Normalize: support both old (ser/saber1/hacer1) and new (semanas) structure
    if(datosRubrica && datosRubrica.semanas && !datosRubrica.ser){
      // New weekly structure - convert for display compatibility
      datosRubrica._semanal = true;
    }

    // Llenar objetivos si la IA los generó
    if(resultado.objNivel) setValue('f-obj-nivel', resultado.objNivel);
    if(resultado.objetivo) setValue('f-objetivo', resultado.objetivo);

    if(resultado.adaptacion){
      const a = resultado.adaptacion;
      setValue('f-adap-met', a.metodo||'');
      setValue('f-adap-res', a.resultados||'');
      setValue('f-adap-ser', a.ser||'');
      setValue('f-adap-saber', a.saber||'');
      setValue('f-adap-hacer', a.hacer||'');
    }

    renderCamposSemanas(datosSemanas);
    document.getElementById('sec-contenidos').style.display='block';
    setIAStatus('ok','✅ ¡PDC + Rúbrica generados! Puedes editar antes de generar la vista previa.');
    generarVistaPreviaPDC();

  } catch(e){
    console.error(e);
    setIAStatus('err','❌ Error: '+e.message);
  } finally {
    ocultarLoading();
    document.getElementById('btn-ia').disabled=false;
  }
}

function renderCamposSemanas(semanas){
  const cont = document.getElementById('campos-semanas');
  cont.innerHTML = semanas.map((s,i)=>`
    <details style="margin-bottom:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:6px;overflow:hidden">
      <summary style="padding:8px 12px;cursor:pointer;font-size:11px;font-weight:bold;color:var(--dorado);background:rgba(200,165,0,.1)">📅 SEMANA ${i+1}</summary>
      <div style="padding:10px">
        <div class="campo"><label>Contenido/Tema</label><input type="text" id="cs${i}-cont" value="${esc(s.contenido)}"></div>
        <div class="campo"><label>Práctica</label><textarea id="cs${i}-prac" rows="3">${esc(s.practica)}</textarea></div>
        <div class="campo"><label>Teoría</label><textarea id="cs${i}-teor" rows="3">${esc(s.teoria)}</textarea></div>
        <div class="campo"><label>Producción</label><textarea id="cs${i}-prod" rows="2">${esc(s.produccion)}</textarea></div>
        <div class="campo"><label>Valoración</label><textarea id="cs${i}-val" rows="2">${esc(s.valoracion)}</textarea></div>
        <div class="campo"><label>Recursos (uno por línea)</label><textarea id="cs${i}-rec" rows="3">${esc(s.recursos)}</textarea></div>
        <div class="campo"><label>SER</label><textarea id="cs${i}-ser" rows="2">${esc(s.ser)}</textarea></div>
        <div class="campo"><label>SABER</label><textarea id="cs${i}-sab" rows="2">${esc(s.saber)}</textarea></div>
        <div class="campo"><label>HACER</label><textarea id="cs${i}-hac" rows="2">${esc(s.hacer)}</textarea></div>
      </div>
    </details>
  `).join('');
}

function esc(t){ return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function setValue(id,v){ const el=document.getElementById(id); if(el) el.value=v; }
function getValue(id){ const el=document.getElementById(id); return el?el.value.trim():''; }
function setIAStatus(tipo,msg){ const el=document.getElementById('ia-status'); el.className='ia-status '+tipo; el.textContent=msg; }

// ══ LEER DATOS ══
function leerDatos(){
  const semanas=[];
  for(let i=0;i<4;i++){
    const cont=document.getElementById(`cs${i}-cont`);
    if(cont){
      semanas.push({contenido:getValue(`cs${i}-cont`),practica:getValue(`cs${i}-prac`),teoria:getValue(`cs${i}-teor`),produccion:getValue(`cs${i}-prod`),valoracion:getValue(`cs${i}-val`),recursos:getValue(`cs${i}-rec`),ser:getValue(`cs${i}-ser`),saber:getValue(`cs${i}-sab`),hacer:getValue(`cs${i}-hac`)});
    } else if(datosSemanas[i]){
      semanas.push(datosSemanas[i]);
    } else {
      semanas.push({contenido:`Semana ${i+1}`,practica:'',teoria:'',produccion:'',valoracion:'',recursos:'',ser:'',saber:'',hacer:''});
    }
  }
  const grado = getValue('f-grado') || document.getElementById('f-grado').value;
  const paralelo = getValue('f-paralelo') || document.getElementById('f-paralelo').value;
  return {
    nro:getValue('f-nro'),mes:getValue('f-mes'),distrito:getValue('f-distrito'),
    unidad:getValue('f-unidad'),grado:document.getElementById('f-grado').value,
    paralelo:document.getElementById('f-paralelo').value,
    trimestre:document.getElementById('f-trimestre').value,
    director:getValue('f-director'),maestro:getValue('f-maestro'),
    area:getValue('f-area'),fecha:getValue('f-fecha'),
    objNivel:getValue('f-obj-nivel'),
    objetivo:getValue('f-objetivo'),tema:getValue('f-tema'),
    semanas,
    adaptacion:{metodo:getValue('f-adap-met'),resultados:getValue('f-adap-res'),ser:getValue('f-adap-ser'),saber:getValue('f-adap-saber'),hacer:getValue('f-adap-hacer')},
    rubConfig:{
      serPts:parseInt(getValue('rub-ser-pts'))||10,
      saberPts:parseInt(getValue('rub-saber1-pts'))||45,
      hacerPts:parseInt(getValue('rub-hacer1-pts'))||40,
      saberNom:getValue('rub-saber1-nom')||'Examen',
      hacerNom:getValue('rub-hacer1-nom')||'Proyecto',
      frecuencia:document.getElementById('rub-frecuencia')?.value||'semanal',
      // legacy compat
      saber1Pts:parseInt(getValue('rub-saber1-pts'))||45,
      saber2Pts:0,
      hacer1Pts:parseInt(getValue('rub-hacer1-pts'))||40,
      hacer2Pts:0,
      hacer1Nom:getValue('rub-hacer1-nom')||'Proyecto',
      hacer2Nom:'',
    },
    estudiantes:estudiantesActuales,
    rubrica:datosRubrica
  };
}

// ══ OBJETIVO HOLÍSTICO — se lee del campo manual ══

// ══ BUILD PDC HTML ══
function buildPDC(d){
  const s = d.semanas;
  return `<div class="pdc-hoja" id="pdc-doc">
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
    <div class="obj-box">${d.objNivel || '<span style="color:#999;font-style:italic">— Ingrese el Objetivo Holístico de Nivel en el formulario —</span>'}</div>
    <table class="tbl-pdc">
      <thead><tr>
        <th style="width:14%">Objetivo de<br>aprendizaje</th>
        <th style="width:13%">Contenidos</th>
        <th style="width:31%">Momentos del proceso formativo</th>
        <th style="width:14%">Recursos</th>
        <th style="width:8%">Periodos</th>
        <th style="width:20%">Criterios de evaluación</th>
      </tr></thead>
      <tbody>
        ${s.map((sem,i)=>`
        <tr>
          ${i===0?`<td class="cel-obj" rowspan="4">${d.objetivo}</td>`:''}
          <td class="cel-cont">${i===0?`<strong>${d.tema}</strong><br><br>`:''}
            <span style="font-weight:normal;font-style:italic;font-size:7pt">${sem.contenido}</span>
          </td>
          <td>
            <span class="sl">SEMANA ${i+1}</span>
            <span class="sub">PRÁCTICA:</span><br>${sem.practica}<br>
            <span class="sub">TEORÍA:</span><br>${sem.teoria}<br>
            <span class="sub">PRODUCCIÓN:</span><br>${sem.produccion}<br>
            <span class="sub">VALORACIÓN:</span><br>${sem.valoracion}
          </td>
          <td style="font-size:7pt">${sem.recursos.replace(/\n/g,'<br>')}</td>
          <td style="text-align:center;font-weight:bold;color:var(--azul);font-size:7pt">Semana ${i+1}</td>
          <td>
            <div style="margin-bottom:3px"><span class="sl">SEMANA ${i+1}</span>
              <span class="ct">SER:</span> <span style="font-size:7pt">${sem.ser}</span>
            </div>
            <div style="margin-bottom:3px"><span class="ct">SABER:</span> <span style="font-size:7pt">${sem.saber}</span></div>
            <div><span class="ct">HACER:</span> <span style="font-size:7pt">${sem.hacer}</span></div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="sec-tit">Adaptaciones curriculares: <span style="font-weight:normal;font-size:7.5pt">(Estudiantes con dificultades en el aprendizaje o ritmos de aprendizaje distinto y otros)</span></div>
    <table class="tbl-adap">
      <thead><tr>
        <th style="width:15%">Contenidos</th>
        <th style="width:18%">Discapacidad / TDAH / TEA / Ritmo lento</th>
        <th style="width:42%">Adaptación</th>
        <th style="width:25%">Criterios de Evaluación</th>
      </tr></thead>
      <tbody><tr>
        <td class="etq-adap">${d.tema}</td>
        <td class="etq-adap">Ritmo lento de aprendizaje</td>
        <td>
          <strong style="font-size:7pt">METODOLOGÍA</strong><br>
          <span style="font-size:7pt">${d.adaptacion.metodo.replace(/\n\n/g,'<br><br>').replace(/\n/g,' ')}</span>
          <br><br>
          <strong style="font-size:7pt">RESULTADOS ESPERADOS</strong><br>
          <span style="font-size:7pt">${d.adaptacion.resultados}</span>
        </td>
        <td>
          <div style="margin-bottom:3px"><span class="ct">SER:</span> <span style="font-size:7pt">${d.adaptacion.ser}</span></div>
          <div style="margin-bottom:3px"><span class="ct">SABER:</span> <span style="font-size:7pt">${d.adaptacion.saber}</span></div>
          <div><span class="ct">HACER:</span> <span style="font-size:7pt">${d.adaptacion.hacer}</span></div>
        </td>
      </tr></tbody>
    </table>
    <div class="firmas">
      <div class="firma-b"><div class="firma-l"></div><div class="firma-t">Firma y sello del docente</div></div>
      <div class="firma-b"><div class="firma-l"></div><div class="firma-t">Firma y sello del director (a)</div></div>
    </div>
  </div>`;
}

// ══ BUILD RÚBRICA HTML ══
function buildRubrica(d){
  const r = d.rubConfig;
  const serPts  = r.serPts  || 10;
  const saberPts= r.saberPts|| r.saber1Pts || 45;
  const hacerPts= r.hacerPts|| r.hacer1Pts || 40;
  const total   = serPts + saberPts + hacerPts;
  const saberNom= r.saberNom|| 'Examen';
  const hacerNom= r.hacerNom|| r.hacer1Nom|| 'Proyecto';
  const frec    = r.frecuencia || 'semanal';
  const rub     = d.rubrica;

  const mapa = {"PRIMERO DE SECUNDARIA":"1ro","SEGUNDO DE SECUNDARIA":"2do","TERCERO DE SECUNDARIA":"3ro","CUARTO DE SECUNDARIA":"4to","QUINTO DE SECUNDARIA":"5to","SEXTO DE SECUNDARIA":"6to"};
  const gradoCorto = (mapa[d.grado]||d.grado) + ' ' + d.paralelo;

  // ── Periodos ──
  let periodos = [];
  if(frec==='semanal') periodos=[{lbl:'Sem. 1'},{lbl:'Sem. 2'},{lbl:'Sem. 3'},{lbl:'Sem. 4'}];
  else if(frec==='quincenal') periodos=[{lbl:'Sem. 1-2'},{lbl:'Sem. 3-4'}];
  else periodos=[{lbl:'Mes'}];
  const frecLabel = frec==='semanal'?'Por Semana (4 registros)':frec==='quincenal'?'Cada 2 Semanas (2 registros)':'Mensual (1 registro)';

  // ── Columnas ordenadas por semana: SER+SABER+HACER por cada periodo ──
  // Semana 1: SER, SABER, HACER | Semana 2: SER, SABER, HACER | ...
  const colsHeaderRow = periodos.map(p=>`
    <th style="width:5%;font-size:6.5pt">SER<br><span style="font-size:5.5pt">${p.lbl}</span><br>(${serPts})</th>
    <th style="width:8%;font-size:6.5pt">${saberNom}<br><span style="font-size:5.5pt">${p.lbl}</span><br>(${saberPts})</th>
    <th style="width:8%;font-size:6.5pt">${hacerNom}<br><span style="font-size:5.5pt">${p.lbl}</span><br>(${hacerPts})</th>
  `).join('');

  const colsGroupRow = periodos.map(p=>`<th colspan="3" style="background:#2d5fa8">${p.lbl}</th>`).join('');

  // ── Filas estudiantes: SER+SABER+HACER por semana ──
  const estudiantesRows = d.estudiantes.length > 0
    ? d.estudiantes.map((est,i)=>{
        const celdas = periodos.map(()=>`<td></td><td></td><td></td>`).join('');
        return `<tr>
          <td style="text-align:center;font-size:7pt">${i+1}</td>
          <td style="font-size:7.5pt;font-weight:bold">${est}</td>
          ${celdas}
        </tr>`;
      }).join('')
    : `<tr><td colspan="${2+periodos.length*3}" style="text-align:center;color:#999;font-style:italic;padding:8px">Selecciona el curso y paralelo para ver la lista</td></tr>`;

  // ── Rangos ──
  function rangoRow(lbl, pts){
    return `<tr><td>${lbl} (${pts} pts)</td>
      <td class="rub-exc">${Math.round(pts*0.85)} – ${pts}</td>
      <td class="rub-bue">${Math.round(pts*0.65)} – ${Math.round(pts*0.84)}</td>
      <td class="rub-reg">${Math.round(pts*0.40)} – ${Math.round(pts*0.64)}</td>
      <td class="rub-ins">0 – ${Math.round(pts*0.39)}</td></tr>`;
  }
  const rangosRows = rangoRow('SER', serPts) + rangoRow(`SABER — ${saberNom}`, saberPts) + rangoRow(`HACER — ${hacerNom}`, hacerPts) +
    `<tr style="font-weight:bold;background:#f0f4ff"><td>TOTAL por registro</td>
      <td class="rub-exc">${Math.round(total*0.85)} – ${total}</td>
      <td class="rub-bue">${Math.round(total*0.65)} – ${Math.round(total*0.84)}</td>
      <td class="rub-reg">${Math.round(total*0.40)} – ${Math.round(total*0.64)}</td>
      <td class="rub-ins">0 – ${Math.round(total*0.39)}</td></tr>`;

  // ── Rúbricas por semana: SER+SABER+HACER juntos ──
  function criterioRow(c){
    if(!c) return '';
    return `<tr>
      <td style="font-size:7.5pt;font-weight:bold;padding-left:10px">${c.nombre||''}</td>
      <td class="rub-exc" style="font-size:7.5pt">${c.excelente||''}</td>
      <td class="rub-bue" style="font-size:7.5pt">${c.bueno||''}</td>
      <td class="rub-reg" style="font-size:7.5pt">${c.regular||''}</td>
      <td class="rub-ins" style="font-size:7.5pt">${c.insuficiente||''}</td>
    </tr>`;
  }

  let rubFilas = '';
  if(rub && rub.semanas && rub.semanas.length > 0){
    const coloresSem = ['#1a3a6b','#2d5fa8','#1e6eb5','#1a4a7b'];
    rub.semanas.forEach((sem, i)=>{
      rubFilas += `<tr><td colspan="5" style="background:${coloresSem[i]||'#1a3a6b'};color:#fff;font-weight:bold;padding:5px 8px;font-size:8.5pt">📅 ${sem.titulo||'SEMANA '+(i+1)}</td></tr>`;
      rubFilas += `<tr><td colspan="5" style="background:#d0d8e8;font-size:7pt;font-weight:bold;padding:2px 8px;color:#1a3a6b">⬤ SER — Actitud y valores (${serPts} pts)</td></tr>`;
      rubFilas += criterioRow(sem.ser);
      rubFilas += `<tr><td colspan="5" style="background:#e0e8ff;font-size:7pt;font-weight:bold;padding:2px 8px;color:#2d5fa8">⬤ SABER — ${saberNom} (${saberPts} pts)</td></tr>`;
      rubFilas += criterioRow(sem.saber);
      rubFilas += `<tr><td colspan="5" style="background:#ddeeff;font-size:7pt;font-weight:bold;padding:2px 8px;color:#1e6eb5">⬤ HACER — ${hacerNom} (${hacerPts} pts)</td></tr>`;
      rubFilas += criterioRow(sem.hacer);
    });
  } else if(rub && rub.ser){
    function buildDim(label, color, criterios){
      if(!criterios||!criterios.length) return '';
      return `<tr><td colspan="5" style="background:${color};color:#fff;font-weight:bold;padding:4px 6px;font-size:8pt">⬤ ${label}</td></tr>${criterios.map(c=>criterioRow(c)).join('')}`;
    }
    rubFilas = buildDim(`SER (${serPts} pts)`,'#1a3a6b',rub.ser?.criterios)+
               buildDim(`SABER — ${saberNom} (${saberPts} pts)`,'#2d5fa8',rub.saber1?.criterios)+
               buildDim(`HACER — ${hacerNom} (${hacerPts} pts)`,'#1e6eb5',rub.hacer1?.criterios);
  } else {
    rubFilas = `<tr><td colspan="5" style="text-align:center;color:#999;padding:20px;font-style:italic">Genera el PDC con IA para obtener rúbricas vinculadas al contenido</td></tr>`;
  }

  return `<div class="rubrica-hoja" id="rubrica-doc">
    <div class="rub-cab">
      <div class="rub-t1">REGISTRO DE CALIFICACIONES Y RÚBRICAS DE EVALUACIÓN</div>
      <div class="rub-t2">${gradoCorto} · ${d.area} · ${d.unidad}</div>
      <div style="font-size:8.5pt;margin-top:3px">Docente: <strong>${d.maestro}</strong> &nbsp;&nbsp; Gestión: 2026 &nbsp;&nbsp; Trimestre: ${d.trimestre} &nbsp;&nbsp; Frecuencia: <strong>${frecLabel}</strong></div>
    </div>

    <div class="rub-sec">REGISTRO DE CALIFICACIONES</div>
    <div style="font-size:7.5pt;margin-bottom:4px">
      ⬤ SER (${serPts} pts) &nbsp; ⬤ SABER — ${saberNom} (${saberPts} pts) &nbsp; ⬤ HACER — ${hacerNom} (${hacerPts} pts)
      &nbsp;|&nbsp; <strong>Total por registro: ${total} pts</strong> &nbsp;|&nbsp; Aprobación: ≥ ${Math.ceil(total*0.51)} pts
    </div>
    <table class="tbl-notas">
      <thead>
        <tr>
          <th rowspan="2" style="width:4%">Nº</th>
          <th rowspan="2" style="width:24%">APELLIDOS Y NOMBRES</th>
          ${colsGroupRow}
        </tr>
        <tr>${colsHeaderRow}</tr>
      </thead>
      <tbody>${estudiantesRows}</tbody>
    </table>

    <div class="rub-sec">RANGOS DE VALORACIÓN POR DIMENSIÓN</div>
    <table class="rub-rangos">
      <thead><tr>
        <th style="width:30%">DIMENSIÓN / PTS</th>
        <th style="width:17.5%" class="rub-exc">EXCELENTE 85–100%</th>
        <th style="width:17.5%" class="rub-bue">BUENO 65–84%</th>
        <th style="width:17.5%" class="rub-reg">REGULAR 40–64%</th>
        <th style="width:17.5%" class="rub-ins">INSUFICIENTE &lt;40%</th>
      </tr></thead>
      <tbody>${rangosRows}</tbody>
    </table>

    <div class="rub-sec">RÚBRICAS DE EVALUACIÓN POR SEMANA — ${gradoCorto}</div>
    <div style="font-size:7.5pt;color:#555;margin-bottom:4px">Cada semana contiene: SER + SABER + HACER vinculados a los momentos del proceso formativo.</div>
    <table class="tbl-rub">
      <thead><tr>
        <th style="width:22%">CRITERIO</th>
        <th style="width:19.5%" class="rub-exc">EXCELENTE</th>
        <th style="width:19.5%" class="rub-bue">BUENO</th>
        <th style="width:19.5%" class="rub-reg">REGULAR</th>
        <th style="width:19.5%" class="rub-ins">INSUFICIENTE</th>
      </tr></thead>
      <tbody>${rubFilas}</tbody>
    </table>

    <div class="firmas">
      <div class="firma-b"><div class="firma-l"></div><div class="firma-t">Firma y sello del docente</div></div>
      <div class="firma-b"><div class="firma-l"></div><div class="firma-t">Firma y sello del director (a)</div></div>
    </div>
  </div>`;
}

// ══ CSS COMPARTIDO PARA PREVIEW Y PDF ══
const CSS_DOCUMENTO = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Times New Roman',Times,serif;color:#111;background:white;font-size:10pt;}
  .pdc-cab{text-align:center;margin-bottom:5px}
  .pdc-t1{font-size:11.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;color:#1a3a6b;border-top:2.5px solid #1a3a6b;border-bottom:2.5px solid #1a3a6b;padding:4px 0;margin:3px 0;}
  .pdc-t2{font-size:10pt;font-weight:bold;text-transform:uppercase;margin:2px 0}
  .tbl-ref{width:100%;border-collapse:collapse;margin:6px 0;font-size:8.5pt}
  .tbl-ref td{border:1px solid #333;padding:3.5px 6px}
  .tbl-ref .etq{background:#d0d8e8;font-weight:bold;width:21%;font-size:8pt;text-transform:uppercase;}
  .sec-tit{font-weight:bold;font-size:9pt;margin:6px 0 3px 0;text-transform:uppercase}
  .obj-box{border:1.5px solid #333;padding:4px 8px;font-size:7.5pt;text-align:justify;line-height:1.35;background:#fafbff;margin-bottom:4px;max-height:none;overflow:visible;}
  .tbl-pdc{width:100%;border-collapse:collapse;font-size:7.5pt;border:1.5px solid #333;margin-bottom:6px;}
  .tbl-pdc th{background:#1a3a6b;color:#fff;padding:3px 2px;text-align:center;font-size:6.5pt;border:1px solid #333;}
  .tbl-pdc td{border:1px solid #333;padding:2px 3px;vertical-align:top;line-height:1.3}
  .cel-obj{background:#f0f4ff;font-size:7.5pt;text-align:justify}
  .cel-cont{background:#fff8e8;font-weight:bold;font-size:7pt;text-align:center;vertical-align:middle}
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
  .firma-t{font-size:7.5pt;font-style:italic}
  .rub-cab{text-align:center;margin-bottom:8px}
  .rub-t1{font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#1a3a6b;border-top:2.5px solid #1a3a6b;border-bottom:2.5px solid #1a3a6b;padding:3px 0;margin:3px 0;}
  .rub-t2{font-size:9.5pt;font-weight:bold;margin:2px 0}
  .rub-sec{font-weight:bold;font-size:9pt;margin:8px 0 4px;text-transform:uppercase;color:#1a3a6b;border-left:4px solid #c8a500;padding-left:6px;}
  .tbl-notas{width:100%;border-collapse:collapse;font-size:7.5pt;border:1.5px solid #333;margin-bottom:8px;}
  .tbl-notas th{background:#1a3a6b;color:#fff;padding:4px 3px;text-align:center;font-size:7pt;border:1px solid #333;}
  .tbl-notas td{border:1px solid #333;padding:3px 5px;vertical-align:middle;height:14pt;}
  .tbl-notas tr:nth-child(even) td{background:#f8f8f8}
  .tbl-rub{width:100%;border-collapse:collapse;font-size:7.5pt;border:1.5px solid #333;margin-bottom:8px;}
  .tbl-rub th{background:#1a3a6b;color:#fff;padding:4px 3px;text-align:center;font-size:7pt;border:1px solid #333;}
  .tbl-rub td{border:1px solid #333;padding:4px 5px;vertical-align:top;line-height:1.3}
  .rub-exc{background:#e8f8e8}
  .rub-bue{background:#e8f0ff}
  .rub-reg{background:#fff8e0}
  .rub-ins{background:#fff0f0}
  .rub-rangos{width:100%;border-collapse:collapse;font-size:7.5pt;border:1.5px solid #333;margin-bottom:8px;}
  .rub-rangos th{background:#1a3a6b;color:#fff;padding:4px;text-align:center;font-size:7pt;border:1px solid #333;}
  .rub-rangos td{border:1px solid #333;padding:3px 5px;text-align:center;}
`;

// ══ CSS SOLO PARA EL PDF (impresión) ══
const CSS_PRINT = `
  @page { size: letter portrait; margin: 12mm 13mm; }
  html, body { background: white !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  /* Segunda sección empieza en nueva página */
  .doc-pagina + .doc-pagina { page-break-before: always; break-before: page; }
  /* El objetivo holístico: limitar a 5 líneas para que no empuje la tabla */
  .obj-box {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 5;
    overflow: hidden;
    max-height: 5.5em;
  }
  /* Tablas: dejar que se corten entre páginas */
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  thead { display: table-header-group; }
  .sec-tit, .rub-sec { page-break-after: avoid; break-after: avoid; }
`;

// ══ CONSTRUIR HTML INTERNO DEL PDC ══
function buildPDCInner(d){
  const s = d.semanas;
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
    <div class="obj-box">${d.objNivel || '— Ingrese el Objetivo Holístico de Nivel en el formulario —'}</div>
    <table class="tbl-pdc">
      <thead><tr>
        <th style="width:14%">Objetivo de<br>aprendizaje</th>
        <th style="width:13%">Contenidos</th>
        <th style="width:31%">Momentos del proceso formativo</th>
        <th style="width:14%">Recursos</th>
        <th style="width:8%">Periodos</th>
        <th style="width:20%">Criterios de evaluación</th>
      </tr></thead>
      <tbody>
        ${s.map((sem,i)=>`
        <tr>
          ${i===0?`<td class="cel-obj" rowspan="4">${d.objetivo}</td>`:''}
          <td class="cel-cont">${i===0?`<strong>${d.tema}</strong><br><br>`:''}
            <span style="font-weight:normal;font-style:italic;font-size:7pt">${sem.contenido}</span>
          </td>
          <td>
            <span class="sl">SEMANA ${i+1}</span>
            <span class="sub">PRÁCTICA:</span><br>${sem.practica}<br>
            <span class="sub">TEORÍA:</span><br>${sem.teoria}<br>
            <span class="sub">PRODUCCIÓN:</span><br>${sem.produccion}<br>
            <span class="sub">VALORACIÓN:</span><br>${sem.valoracion}
          </td>
          <td style="font-size:7pt">${sem.recursos.replace(/\n/g,'<br>')}</td>
          <td style="text-align:center;font-weight:bold;color:#1a3a6b;font-size:7pt">Semana ${i+1}</td>
          <td>
            <div style="margin-bottom:3px"><span class="sl">SEMANA ${i+1}</span>
              <span class="ct">SER:</span> <span style="font-size:7pt">${sem.ser}</span>
            </div>
            <div style="margin-bottom:3px"><span class="ct">SABER:</span> <span style="font-size:7pt">${sem.saber}</span></div>
            <div><span class="ct">HACER:</span> <span style="font-size:7pt">${sem.hacer}</span></div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="sec-tit">Adaptaciones curriculares: <span style="font-weight:normal;font-size:7.5pt">(Estudiantes con dificultades en el aprendizaje o ritmos de aprendizaje distinto y otros)</span></div>
    <table class="tbl-adap">
      <thead><tr>
        <th style="width:15%">Contenidos</th>
        <th style="width:18%">Discapacidad / TDAH / TEA / Ritmo lento</th>
        <th style="width:42%">Adaptación</th>
        <th style="width:25%">Criterios de Evaluación</th>
      </tr></thead>
      <tbody><tr>
        <td class="etq-adap">${d.tema}</td>
        <td class="etq-adap">Ritmo lento de aprendizaje</td>
        <td>
          <strong style="font-size:7pt">METODOLOGÍA</strong><br>
          <span style="font-size:7pt">${d.adaptacion.metodo.replace(/\n\n/g,'<br><br>').replace(/\n/g,' ')}</span>
          <br><br>
          <strong style="font-size:7pt">RESULTADOS ESPERADOS</strong><br>
          <span style="font-size:7pt">${d.adaptacion.resultados}</span>
        </td>
        <td>
          <div style="margin-bottom:3px"><span class="ct">SER:</span> <span style="font-size:7pt">${d.adaptacion.ser}</span></div>
          <div style="margin-bottom:3px"><span class="ct">SABER:</span> <span style="font-size:7pt">${d.adaptacion.saber}</span></div>
          <div><span class="ct">HACER:</span> <span style="font-size:7pt">${d.adaptacion.hacer}</span></div>
        </td>
      </tr></tbody>
    </table>
       <div style="height:40px"></div>
<div class="firmas">
  <div class="firma-b"><div class="firma-l"></div><div class="firma-t">Firma y sello del docente</div></div>
  <div class="firma-b"><div class="firma-l"></div><div class="firma-t">Firma y sello del director (a)</div></div>
</div>`;
}

function buildRubricaInner(d){
  const r = d.rubConfig;
  const serPts  = r.serPts  || 10;
  const saberPts= r.saberPts|| r.saber1Pts || 45;
  const hacerPts= r.hacerPts|| r.hacer1Pts || 40;
  const total   = serPts + saberPts + hacerPts;
  const saberNom= r.saberNom|| 'Examen';
  const hacerNom= r.hacerNom|| r.hacer1Nom|| 'Proyecto';
  const frec    = r.frecuencia || 'semanal';
  const rub     = d.rubrica;
  const mapa = {"PRIMERO DE SECUNDARIA":"1ro","SEGUNDO DE SECUNDARIA":"2do","TERCERO DE SECUNDARIA":"3ro","CUARTO DE SECUNDARIA":"4to","QUINTO DE SECUNDARIA":"5to","SEXTO DE SECUNDARIA":"6to"};
  const gradoCorto = (mapa[d.grado]||d.grado) + ' ' + d.paralelo;
  let periodos = [];
  if(frec==='semanal') periodos=[{lbl:'Sem. 1'},{lbl:'Sem. 2'},{lbl:'Sem. 3'},{lbl:'Sem. 4'}];
  else if(frec==='quincenal') periodos=[{lbl:'Sem. 1-2'},{lbl:'Sem. 3-4'}];
  else periodos=[{lbl:'Mes'}];
  const frecLabel = frec==='semanal'?'Por Semana (4 registros)':frec==='quincenal'?'Cada 2 Semanas (2 registros)':'Mensual (1 registro)';
  const colsHeaderRow = periodos.map(p=>`
    <th style="width:5%;font-size:6.5pt">SER<br><span style="font-size:5.5pt">${p.lbl}</span><br>(${serPts})</th>
    <th style="width:8%;font-size:6.5pt">${saberNom}<br><span style="font-size:5.5pt">${p.lbl}</span><br>(${saberPts})</th>
    <th style="width:8%;font-size:6.5pt">${hacerNom}<br><span style="font-size:5.5pt">${p.lbl}</span><br>(${hacerPts})</th>
  `).join('');
  const colsGroupRow = periodos.map(p=>`<th colspan="3" style="background:#2d5fa8">${p.lbl}</th>`).join('');
  const estudiantesRows = d.estudiantes.length > 0
    ? d.estudiantes.map((est,i)=>{
        const celdas = periodos.map(()=>`<td style="height:14pt"></td><td style="height:14pt"></td><td style="height:14pt"></td>`).join('');
        return `<tr><td style="text-align:center;font-size:7pt;height:14pt">${i+1}</td><td style="font-size:7.5pt;font-weight:bold;height:14pt">${est}</td>${celdas}</tr>`;
      }).join('')
    : `<tr><td colspan="${2+periodos.length*3}" style="text-align:center;color:#999;font-style:italic;padding:8px">Selecciona el curso y paralelo para ver la lista</td></tr>`;
  function rangoRow(lbl, pts){
    return `<tr><td>${lbl} (${pts} pts)</td>
      <td class="rub-exc">${Math.round(pts*0.85)} – ${pts}</td>
      <td class="rub-bue">${Math.round(pts*0.65)} – ${Math.round(pts*0.84)}</td>
      <td class="rub-reg">${Math.round(pts*0.40)} – ${Math.round(pts*0.64)}</td>
      <td class="rub-ins">0 – ${Math.round(pts*0.39)}</td></tr>`;
  }
  const rangosRows = rangoRow('SER', serPts) + rangoRow(`SABER — ${saberNom}`, saberPts) + rangoRow(`HACER — ${hacerNom}`, hacerPts) +
    `<tr style="font-weight:bold;background:#f0f4ff"><td>TOTAL por registro</td>
      <td class="rub-exc">${Math.round(total*0.85)} – ${total}</td>
      <td class="rub-bue">${Math.round(total*0.65)} – ${Math.round(total*0.84)}</td>
      <td class="rub-reg">${Math.round(total*0.40)} – ${Math.round(total*0.64)}</td>
      <td class="rub-ins">0 – ${Math.round(total*0.39)}</td></tr>`;
  function criterioRow(c){
    if(!c) return '';
    return `<tr>
      <td style="font-size:7.5pt;font-weight:bold;padding-left:10px">${c.nombre||''}</td>
      <td class="rub-exc" style="font-size:7.5pt">${c.excelente||''}</td>
      <td class="rub-bue" style="font-size:7.5pt">${c.bueno||''}</td>
      <td class="rub-reg" style="font-size:7.5pt">${c.regular||''}</td>
      <td class="rub-ins" style="font-size:7.5pt">${c.insuficiente||''}</td>
    </tr>`;
  }
  let rubFilas = '';
  if(rub && rub.semanas && rub.semanas.length > 0){
    const coloresSem = ['#1a3a6b','#2d5fa8','#1e6eb5','#1a4a7b'];
    rub.semanas.forEach((sem, i)=>{
      rubFilas += `<tr><td colspan="5" style="background:${coloresSem[i]||'#1a3a6b'};color:#fff;font-weight:bold;padding:5px 8px;font-size:8.5pt">📅 ${sem.titulo||'SEMANA '+(i+1)}</td></tr>`;
      rubFilas += `<tr><td colspan="5" style="background:#d0d8e8;font-size:7pt;font-weight:bold;padding:2px 8px;color:#1a3a6b">⬤ SER — Actitud y valores (${serPts} pts)</td></tr>`;
      rubFilas += criterioRow(sem.ser);
      rubFilas += `<tr><td colspan="5" style="background:#e0e8ff;font-size:7pt;font-weight:bold;padding:2px 8px;color:#2d5fa8">⬤ SABER — ${saberNom} (${saberPts} pts)</td></tr>`;
      rubFilas += criterioRow(sem.saber);
      rubFilas += `<tr><td colspan="5" style="background:#ddeeff;font-size:7pt;font-weight:bold;padding:2px 8px;color:#1e6eb5">⬤ HACER — ${hacerNom} (${hacerPts} pts)</td></tr>`;
      rubFilas += criterioRow(sem.hacer);
    });
  } else {
    rubFilas = `<tr><td colspan="5" style="text-align:center;color:#999;padding:20px;font-style:italic">Genera el PDC con IA para obtener rúbricas vinculadas al contenido</td></tr>`;
  }
  return `
    <div class="rub-cab">
      <div class="rub-t1">REGISTRO DE CALIFICACIONES Y RÚBRICAS DE EVALUACIÓN</div>
      <div class="rub-t2">${gradoCorto} · ${d.area} · ${d.unidad}</div>
      <div style="font-size:8.5pt;margin-top:3px">Docente: <strong>${d.maestro}</strong> &nbsp;&nbsp; Gestión: 2026 &nbsp;&nbsp; Trimestre: ${d.trimestre} &nbsp;&nbsp; Frecuencia: <strong>${frecLabel}</strong></div>
    </div>
    <div class="rub-sec">REGISTRO DE CALIFICACIONES</div>
    <div style="font-size:7.5pt;margin-bottom:4px">
      ⬤ SER (${serPts} pts) &nbsp; ⬤ SABER — ${saberNom} (${saberPts} pts) &nbsp; ⬤ HACER — ${hacerNom} (${hacerPts} pts)
      &nbsp;|&nbsp; <strong>Total por registro: ${total} pts</strong> &nbsp;|&nbsp; Aprobación: ≥ ${Math.ceil(total*0.51)} pts
    </div>
    <table class="tbl-notas">
      <thead>
        <tr>
          <th rowspan="2" style="width:4%">Nº</th>
          <th rowspan="2" style="width:24%">APELLIDOS Y NOMBRES</th>
          ${colsGroupRow}
        </tr>
        <tr>${colsHeaderRow}</tr>
      </thead>
      <tbody>${estudiantesRows}</tbody>
    </table>
    <div class="rub-sec">RANGOS DE VALORACIÓN POR DIMENSIÓN</div>
    <table class="rub-rangos">
      <thead><tr>
        <th style="width:30%">DIMENSIÓN / PTS</th>
        <th style="width:17.5%" class="rub-exc">EXCELENTE 85–100%</th>
        <th style="width:17.5%" class="rub-bue">BUENO 65–84%</th>
        <th style="width:17.5%" class="rub-reg">REGULAR 40–64%</th>
        <th style="width:17.5%" class="rub-ins">INSUFICIENTE &lt;40%</th>
      </tr></thead>
      <tbody>${rangosRows}</tbody>
    </table>
    <div class="rub-sec">RÚBRICAS DE EVALUACIÓN POR SEMANA — ${gradoCorto}</div>
    <div style="font-size:7.5pt;color:#555;margin-bottom:4px">Cada semana: SER + SABER + HACER vinculados al proceso formativo.</div>
    <table class="tbl-rub">
      <thead><tr>
        <th style="width:22%">CRITERIO</th>
        <th style="width:19.5%" class="rub-exc">EXCELENTE</th>
        <th style="width:19.5%" class="rub-bue">BUENO</th>
        <th style="width:19.5%" class="rub-reg">REGULAR</th>
        <th style="width:19.5%" class="rub-ins">INSUFICIENTE</th>
      </tr></thead>
      <tbody>${rubFilas}</tbody>
    </table>
    <div style="height:40px"></div>
<div class="firmas">
  <div class="firma-b"><div class="firma-l"></div><div class="firma-t">Firma y sello del docente</div></div>
  <div class="firma-b"><div class="firma-l"></div><div class="firma-t">Firma y sello del director (a)</div></div>
</div>`;
}

// ══ VISTA PREVIA — iframes escalados que simulan hojas carta reales ══

function generarVistaPreviaPDC(){
  const d = leerDatos();
  const pdcInner  = buildPDCInner(d);
  const rubInner  = buildRubricaInner(d);
  const area = document.getElementById('pdc-preview-area');
  area.innerHTML = '';

  // Inyectar estilos del documento en el head principal (necesario para html2canvas)
  let styleTag = document.getElementById('_doc_styles');
  if(!styleTag){
    styleTag = document.createElement('style');
    styleTag.id = '_doc_styles';
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = CSS_DOCUMENTO + `
    .doc-hoja { padding: 45px 49px; }
  `;

  const bloques = [
    { id:'pdc-doc',     titulo:'📄 PDC — Plan de Desarrollo Curricular', html: pdcInner },
    { id:'rubrica-doc', titulo:'📊 Rúbrica y Registro de Calificaciones', html: rubInner }
  ];

  bloques.forEach(bloque => {
    // Etiqueta
    const etq = document.createElement('div');
    etq.style.cssText = 'font-family:sans-serif;font-size:11px;color:#444;font-weight:600;margin-bottom:6px;padding-left:2px;';
    etq.textContent = bloque.titulo;
    area.appendChild(etq);

    // Hoja blanca con el contenido directo (sin iframe)
    const hoja = document.createElement('div');
    hoja.id = bloque.id;
    hoja.className = 'doc-hoja';
    hoja.style.cssText = 'background:white;box-shadow:0 2px 16px rgba(0,0,0,.35);margin-bottom:20px;width:816px;transform-origin:top left;';
    hoja.innerHTML = bloque.html;
    area.appendChild(hoja);
  });

  // Escalar las hojas al ancho del panel
  requestAnimationFrame(()=>{
    const panelW = area.clientWidth;
    const scale  = Math.min(1, panelW / 816);
    document.querySelectorAll('.doc-hoja').forEach(h=>{
      h.style.transform = `scale(${scale})`;
      h.style.marginBottom = ((h.offsetHeight * scale) - h.offsetHeight + 20) + 'px';
    });
  });
}



// ══ EXPORT PDF ══
// ══ BUSCAR CORTE LIMPIO ══
// Busca el mejor punto de corte escaneando hacia arriba desde el límite.
// En lugar de exigir fila completamente blanca (falla con celdas coloreadas),
// busca la fila con MENOS píxeles oscuros (espacios entre líneas de texto).
function buscarCorteLimpio(canvas, desdeYpx, rangoScan) {
  const ctx = canvas.getContext('2d');
  const w   = canvas.width;
  // Ignorar los primeros y últimos 15% del ancho (bordes de celda con color)
  const xIni = Math.floor(w * 0.15);
  const xFin = Math.floor(w * 0.85);
  const ancho = xFin - xIni;

  let mejorY      = desdeYpx;
  let mejorOscuros = Infinity;

  const inicio = Math.max(0, desdeYpx - rangoScan);
  for (let y = desdeYpx; y >= inicio; y--) {
    const data = ctx.getImageData(xIni, y, ancho, 1).data;
    let oscuros = 0;
    for (let x = 0; x < data.length; x += 4) {
      const r = data[x], g = data[x+1], b = data[x+2];
      // Píxel considerado "oscuro" si no es casi blanco
      if (r < 220 || g < 220 || b < 220) oscuros++;
    }
    if (oscuros < mejorOscuros) {
      mejorOscuros = oscuros;
      mejorY = y;
      // Si encontramos fila con 0 oscuros → corte perfecto, parar
      if (oscuros === 0) break;
    }
  }
  return mejorY;
}

// ══ EXPORT PDF ══
async function exportarPDF() {
  if (!document.getElementById('pdc-doc')) {
    alert('Genera la vista previa primero.');
    return;
  }
  mostrarLoading('Generando PDF...');
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentW = pageW - margin * 2;
    const contentH = pageH - margin * 2;
    const MM_TO_PX = 3.7795275591;
    const targetWidthPx = Math.round(contentW * MM_TO_PX);

    const hojas = ['pdc-doc', 'rubrica-doc']
      .map(id => document.getElementById(id))
      .filter(Boolean);

    let primeraPagina = true;

    for (const hoja of hojas) {
      const origTransform = hoja.style.transform;
      const origWidth     = hoja.style.width;
      const origMargin    = hoja.style.marginBottom;
      hoja.style.transform    = 'none';
      hoja.style.width        = targetWidthPx + 'px';
      hoja.style.marginBottom = '0';

      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const canvas = await html2canvas(hoja, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: targetWidthPx,
        windowWidth: targetWidthPx,
      });

      hoja.style.transform    = origTransform;
      hoja.style.width        = origWidth;
      hoja.style.marginBottom = origMargin;

      const pxPorMm      = canvas.width / contentW;
      const altoPaginaPx = Math.floor(contentH * pxPorMm);

      let yPx = 0;

      while (yPx < canvas.height) {
        const espacioRestante = canvas.height - yPx;
        let sliceHpx;

        if (espacioRestante <= altoPaginaPx) {
          sliceHpx = espacioRestante;
        } else {
          // Buscar el mejor punto de corte en los últimos 120px del límite
          const limitePx = yPx + altoPaginaPx;
          const cortePx  = buscarCorteLimpio(canvas, limitePx, 120);
          sliceHpx = cortePx - yPx;
          if (sliceHpx <= 20) sliceHpx = altoPaginaPx; // seguridad
        }

        const tc  = document.createElement('canvas');
        tc.width  = canvas.width;
        tc.height = sliceHpx;
        const tctx = tc.getContext('2d');
        tctx.fillStyle = '#ffffff';
        tctx.fillRect(0, 0, tc.width, tc.height);
        tctx.drawImage(canvas, 0, yPx, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);

        const sliceHmm = sliceHpx / pxPorMm;

        if (!primeraPagina) pdf.addPage();
        primeraPagina = false;

        pdf.addImage(
          tc.toDataURL('image/jpeg', 0.95),
          'JPEG',
          margin, margin,
          contentW, sliceHmm
        );

        yPx += sliceHpx;
      }
    }

    pdf.save('planificacion.pdf');
  } catch (e) {
    console.error(e);
    alert('Error al generar el PDF: ' + e.message);
  } finally {
    ocultarLoading();
  }
}




// ══ EXPORT WORD ══
async function exportarWord(){
  if(!document.getElementById('pdc-doc') && !document.getElementById('rubrica-doc')){
    alert('Genera la vista previa primero.'); return;
  }

  if(typeof JSZip==='undefined'){
    mostrarLoading('Cargando librería...');
    await new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload=res; s.onerror=rej;
      document.head.appendChild(s);
    });
  }

  mostrarLoading('Generando Word (.docx)...');
  try{
    const d = leerDatos();
    const s = d.semanas;

    // ── Configuración evaluación ──
    const r       = d.rubConfig;
    const serPts  = r.serPts  || 10;
    const sabPts  = r.saberPts|| r.saber1Pts || 45;
    const hacPts  = r.hacerPts|| r.hacer1Pts || 40;
    const total   = serPts + sabPts + hacPts;
    const sabNom  = r.saberNom || r.saber1Nom || 'Examen';
    const hacNom  = r.hacerNom || r.hacer1Nom || 'Proyecto';
    const frec    = r.frecuencia || 'semanal';
    const rub     = d.rubrica;

    const mapaG = {"PRIMERO DE SECUNDARIA":"1ro","SEGUNDO DE SECUNDARIA":"2do","TERCERO DE SECUNDARIA":"3ro","CUARTO DE SECUNDARIA":"4to","QUINTO DE SECUNDARIA":"5to","SEXTO DE SECUNDARIA":"6to"};
    const gradoCorto = (mapaG[d.grado]||d.grado)+' '+d.paralelo;

    // ══════════════════════════════════════════════
    // HELPERS XML WORD
    // ══════════════════════════════════════════════
    function xe(t){ return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;'); }

    // Párrafo con runs
    function wp(runs, jc, spBefore, spAfter){
      let ppr = '';
      if(jc||spBefore||spAfter){
        ppr = '<w:pPr>';
        if(jc)       ppr += `<w:jc w:val="${jc}"/>`;
        if(spBefore) ppr += `<w:spacing w:before="${spBefore}"/>`;
        if(spAfter)  ppr += `<w:spacing w:after="${spAfter}"/>`;
        ppr += '</w:pPr>';
      }
      return `<w:p>${ppr}${runs}</w:p>`;
    }
    // Run de texto
    function wr(txt, bold, sz, color, italic, caps){
      if(txt===null||txt===undefined) return '';
      const rpr = [
        bold   ? '<w:b/><w:bCs/>'    : '',
        italic ? '<w:i/><w:iCs/>'   : '',
        caps   ? '<w:caps/>'         : '',
        color  ? `<w:color w:val="${color}"/>`:'',
        sz     ? `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>` : '<w:sz w:val="16"/><w:szCs w:val="16"/>',
      ].join('');
      return `<w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${xe(String(txt))}</w:t></w:r>`;
    }
    // Párrafo vacío pequeño
    function wblank(sz){ return wp(wr(' ',false,sz||14),'',60,60); }

    // Borde de tabla
    const BRD = `<w:tblBorders>
      <w:top    w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:left   w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:right  w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="333333"/>
    </w:tblBorders>`;
    const BRD_TC = `<w:tcBorders>
      <w:top    w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:left   w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:right  w:val="single" w:sz="4" w:space="0" w:color="333333"/>
    </w:tcBorders>`;

    // Celda con XML interno, ancho, color fondo, fusión vertical
    function wc(innerXml, ww, fill, vMerge){
      const shd  = fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : '';
      const vm   = vMerge==='start'?'<w:vMerge w:val="restart"/>' : vMerge==='cont'?'<w:vMerge/>':'';
      const mar  = `<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="55" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="55" w:type="dxa"/></w:tcMar>`;
      return `<w:tc><w:tcPr>${vm}<w:tcW w:w="${ww}" w:type="dxa"/>${BRD_TC}${shd}${mar}</w:tcPr>${innerXml}</w:tc>`;
    }
    // Celda de texto simple (múltiples líneas separadas por \n)
    function wcT(txt, ww, fill, bold, sz, color, jc, vMerge){
      const lines = (txt||'').split('\n').filter(l=>l.trim());
      const pars  = lines.length
        ? lines.map(l=>wp(wr(l,bold,sz,color),jc,'40','40')).join('')
        : wp(wr(' ',false,sz||14));
      return wc(pars, ww, fill, vMerge);
    }
    // Celda cabecera azul
    function wch(txt, ww, fill){
      const bg = fill||'1A3A6B';
      return wc(wp(wr(txt,true,13,'FFFFFF'),'center','40','40')+wp(wr(' ',false,10),'','0','0'), ww, bg);
    }
    // Celda cabecera multilinea (array de strings)
    function wchM(lines, ww, fill){
      const bg = fill||'1A3A6B';
      const pars = lines.map(l=>wp(wr(l,true,11,'FFFFFF'),'center','20','20')).join('');
      return wc(pars, ww, bg);
    }
    // Fila
    function wtrow(cells, trHgt){ 
      const tpr = trHgt ? `<w:trPr><w:trHeight w:val="${trHgt}" w:hRule="atLeast"/></w:trPr>` : '';
      return `<w:tr>${tpr}${cells}</w:tr>`; 
    }
    // Tabla
    function wtbl(rows, W){ return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${W}" w:type="dxa"/>${BRD}</w:tblPr>${rows}</w:tbl>`; }

    // ══════════════════════════════════════════════
    // MEDIDAS — carta = 12240 dxa, márgenes 737 c/lado → útil = 10766 dxa
    // ══════════════════════════════════════════════
    const W = 10766;

    // ── PDC: proporciones HTML (14%,13%,31%,14%,8%,20%) ──
    const wObj  = Math.round(W*0.14); // 1507
    const wCont = Math.round(W*0.13); // 1400
    const wMom  = Math.round(W*0.31); // 3337
    const wRec  = Math.round(W*0.14); // 1507
    const wPer  = Math.round(W*0.08); //  861
    const wCrit = W - wObj - wCont - wMom - wRec - wPer; // resto

    // ── Tabla Datos Referenciales ──
    const wE = Math.round(W*0.21);
    const wV = Math.round(W/2) - wE;
    const tblRef = wtbl([
      wtrow(wcT('DISTRITO EDUCATIVO',wE,'D0D8E8',true,13,null,'left')+wcT(d.distrito,wV,null,false,13)+wcT('UNIDAD EDUCATIVA',wE,'D0D8E8',true,13,null,'left')+wcT(d.unidad,wV,null,false,13)),
      wtrow(wcT('NIVEL',wE,'D0D8E8',true,13,null,'left')+wcT('SECUNDARIO',wV,null,false,13)+wcT('AÑO DE ESCOLARIDAD',wE,'D0D8E8',true,13,null,'left')+wcT(d.grado+' — PAR. '+d.paralelo,wV,null,false,13)),
      wtrow(wcT('DIRECTOR (A)',wE,'D0D8E8',true,13,null,'left')+wcT(d.director,wV,null,false,13)+wcT('MAESTRO (A)',wE,'D0D8E8',true,13,null,'left')+wcT(d.maestro,wV,null,false,13)),
      wtrow(wcT('ÁREA',wE,'D0D8E8',true,13,null,'left')+wcT(d.area,wV,null,false,13)+wcT('TRIMESTRE',wE,'D0D8E8',true,13,null,'left')+wcT(d.trimestre,wV,null,false,13)),
      wtrow(wcT('FECHA',wE,'D0D8E8',true,13,null,'left')+wc(wp(wr(d.fecha,false,13)),W-wE)),
    ].join(''), W);

    // ── Tabla principal PDC ──
    const filasTabla = s.map((sem,i)=>{
      // Momentos: PRÁCTICA, TEORÍA, PRODUCCIÓN, VALORACIÓN
      const mom =
        wp(wr('SEMANA '+(i+1),true,12,'1A3A6B'),'','40','20')+
        wp(wr('PRÁCTICA: ',true,12)+wr(sem.practica,false,12),'','20','20')+
        wp(wr('TEORÍA: ',true,12)+wr(sem.teoria,false,12),'','20','20')+
        wp(wr('PRODUCCIÓN: ',true,12)+wr(sem.produccion,false,12),'','20','20')+
        wp(wr('VALORACIÓN: ',true,12)+wr(sem.valoracion,false,12),'','20','40');
      // Recursos
      const recLines = (sem.recursos||'').split('\n').filter(l=>l.trim());
      const rec = recLines.length ? recLines.map(l=>wp(wr(l,false,12),'','20','20')).join('') : wp(wr(' ',false,12));
      // Criterios
      const crit =
        wp(wr('SEMANA '+(i+1),true,12,'1A3A6B'),'','40','20')+
        wp(wr('SER: ',true,12,'2D5FA8')+wr(sem.ser,false,12),'','20','20')+
        wp(wr('SABER: ',true,12,'2D5FA8')+wr(sem.saber,false,12),'','20','20')+
        wp(wr('HACER: ',true,12,'2D5FA8')+wr(sem.hacer,false,12),'','20','40');
      // Contenido
      const contInner = (i===0 ? wp(wr(d.tema,true,13),'center','40','20') : '') +
                        wp(wr(sem.contenido,false,12,null,true),'center','20','40');
      return wtrow(
        (i===0 ? wc(wp(wr(d.objetivo,false,13),'both','20','20'), wObj, 'EEF2FF','start') : wc(wp(wr(' ',false,13)), wObj, 'EEF2FF','cont'))+
        wc(contInner, wCont, 'FFF8E8')+
        wc(mom, wMom)+
        wc(rec, wRec)+
        wc(wp(wr('Sem '+(i+1),true,12,'1A3A6B'),'center','40','40'), wPer)+
        wc(crit, wCrit)
      );
    }).join('');

    const tblPDC = wtbl(
      wtrow(wch('Objetivo de\naprendizaje',wObj)+wch('Contenidos',wCont)+wch('Momentos del proceso formativo',wMom)+wch('Recursos',wRec)+wch('Periodos',wPer)+wch('Criterios de evaluación',wCrit))+
      filasTabla, W);

    // ── Tabla Adaptaciones ──
    const wA1=Math.round(W*0.15), wA2=Math.round(W*0.18), wA3=Math.round(W*0.42), wA4=W-Math.round(W*0.15)-Math.round(W*0.18)-Math.round(W*0.42);
    const adaptMet = wp(wr('METODOLOGÍA',true,13),'','40','20')+wp(wr((d.adaptacion.metodo||'').replace(/\n/g,' '),false,12),'','20','20')+wp(wr('RESULTADOS ESPERADOS',true,13),'','20','20')+wp(wr(d.adaptacion.resultados,false,12),'','20','40');
    const adaptCrit = wp(wr('SER: ',true,12,'2D5FA8')+wr(d.adaptacion.ser,false,12),'','40','20')+wp(wr('SABER: ',true,12,'2D5FA8')+wr(d.adaptacion.saber,false,12),'','20','20')+wp(wr('HACER: ',true,12,'2D5FA8')+wr(d.adaptacion.hacer,false,12),'','20','40');
    const tblAdap = wtbl(
      wtrow(wch('Contenidos',wA1)+wch('Discapacidad / TDAH / TEA / Ritmo lento',wA2)+wch('Adaptación',wA3)+wch('Criterios de Evaluación',wA4))+
      wtrow(wcT(d.tema,wA1,'EEF2FF',true,12,null,'center')+wcT('Ritmo lento de aprendizaje',wA2,'EEF2FF',false,12,null,'center')+wc(adaptMet,wA3)+wc(adaptCrit,wA4)),
    W);

    // ── Firmas ──
    const wF = Math.round(W*0.42);
    const wFm= W - wF*2;
    const fmBrd = `<w:tcBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="333333"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>`;
    function firmaCell(txt,ww){ return `<w:tc><w:tcPr><w:tcW w:w="${ww}" w:type="dxa"/>${fmBrd}</w:tcPr>${wp(wr(txt,false,14,null,true),'center','360','40')}</w:tc>`; }
    function firmaSpace(ww){ return `<w:tc><w:tcPr><w:tcW w:w="${ww}" w:type="dxa"/><w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders></w:tcPr>${wp(wr(' '))}</w:tc>`; }
    const tblFirmas = `<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>${wtrow(firmaCell('Firma y sello del docente',wF)+firmaSpace(wFm)+firmaCell('Firma y sello del director (a)',wF))}</w:tbl>`;

    // ══════════════════════════════════════════════
    // RÚBRICA — TABLA DE NOTAS
    // Replica EXACTAMENTE el visualizador:
    //   Fila 1 cabecera: Nº | APELLIDOS Y NOMBRES | [colspan=3 por periodo: "Sem. X"] ...
    //   Fila 2 cabecera: (nada) | (nada) | SER | SABER | HACER | SER | SABER | HACER | ...
    //   Filas datos: número | nombre | celda | celda | celda | ...
    // ══════════════════════════════════════════════
    let periodos = [];
    if(frec==='semanal') periodos=['Sem. 1','Sem. 2','Sem. 3','Sem. 4'];
    else if(frec==='quincenal') periodos=['Sem. 1-2','Sem. 3-4'];
    else periodos=['Mes'];
    const frecLabel = frec==='semanal'?'Por Semana (4 registros)':frec==='quincenal'?'Cada 2 Semanas (2 registros)':'Mensual (1 registro)';

    // Anchos tabla notas: Nº fijo, Nombre fijo, resto dividido en periodos*3 columnas
    const wNN  = 340;   // Nº
    const wNom = 2400;  // Apellidos y nombres
    const wRest= W - wNN - wNom;
    const nCols = periodos.length * 3; // SER+SABER+HACER por periodo
    const wSer  = Math.round(wRest * 0.28 / periodos.length); // SER más angosto
    const wSab  = Math.round(wRest * 0.36 / periodos.length); // SABER
    const wHac  = Math.round(wRest * 0.36 / periodos.length); // HACER
    // Verificar suma (ajustar última columna)
    const sumaCol = periodos.length*(wSer+wSab+wHac);
    const wHacAdj = wHac + (wRest - sumaCol); // absorber diferencia en última col

    // FILA 1: Nº (rowspan2) | Nombre (rowspan2) | Sem.X colspan=3 por cada periodo
    // En Word: rowspan = vMerge, colspan = gridSpan
    function wcSpan(innerXml, ww, span, fill){
      const shd = fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : '';
      const gs  = span > 1 ? `<w:gridSpan w:val="${span}"/>` : '';
      return `<w:tc><w:tcPr>${gs}<w:tcW w:w="${ww}" w:type="dxa"/>${BRD_TC}${shd}<w:tcMar><w:top w:w="30" w:type="dxa"/><w:left w:w="55" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="55" w:type="dxa"/></w:tcMar></w:tcPr>${innerXml}</w:tc>`;
    }
    function wcVM(innerXml, ww, fill, vMerge){
      const shd = fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : '';
      const vm  = vMerge==='start'?'<w:vMerge w:val="restart"/>':vMerge==='cont'?'<w:vMerge/>':'';
      return `<w:tc><w:tcPr>${vm}<w:tcW w:w="${ww}" w:type="dxa"/>${BRD_TC}${shd}<w:tcMar><w:top w:w="30" w:type="dxa"/><w:left w:w="55" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="55" w:type="dxa"/></w:tcMar></w:tcPr>${innerXml}</w:tc>`;
    }

    // Cabecera fila 1: Nº | Nombre | Sem.1 (3 cols) | Sem.2 (3 cols) | ...
    let hdr1 = '';
    hdr1 += wcVM(wp(wr('Nº',true,12,'FFFFFF'),'center','30','30'),       wNN,  '1A3A6B','start');
    hdr1 += wcVM(wp(wr('APELLIDOS Y NOMBRES',true,12,'FFFFFF'),'center','30','30'), wNom, '1A3A6B','start');
    periodos.forEach(lbl=>{
      const wGrupo = wSer + wSab + wHac; // anchura total del grupo
      hdr1 += wcSpan(wp(wr(lbl,true,12,'FFFFFF'),'center','30','30'), wGrupo, 3, '2D5FA8');
    });

    // Cabecera fila 2: celdas vMerge cont para Nº y Nombre, luego SER/SABER/HACER por periodo
    let hdr2 = '';
    hdr2 += wcVM(wp(wr(' ',false,10)), wNN,  '1A3A6B','cont');
    hdr2 += wcVM(wp(wr(' ',false,10)), wNom, '1A3A6B','cont');
    periodos.forEach((lbl,pi)=>{
      const wH = (pi===periodos.length-1) ? wHacAdj : wHac; // última col ajustada
      hdr2 += wc(wp(wr('SER',true,11,'FFFFFF')+wr(' ('+serPts+')',true,10,'FFFFFF'),'center','20','20'), wSer,'1A3A6B');
      hdr2 += wc(wp(wr(sabNom,true,11,'FFFFFF')+wr(' ('+sabPts+')',true,10,'FFFFFF'),'center','20','20'), wSab,'1A3A6B');
      hdr2 += wc(wp(wr(hacNom,true,11,'FFFFFF')+wr(' ('+hacPts+')',true,10,'FFFFFF'),'center','20','20'), wH,  '1A3A6B');
    });

    // Filas de estudiantes
    const EST_H = 360; // altura mínima fila estudiante (~6.4mm)
    let estRowsW = '';
    if(d.estudiantes.length > 0){
      d.estudiantes.forEach((est,i)=>{
        let celdas = wcT(String(i+1), wNN, null, false, 12, null, 'center') +
                     wcT(est, wNom, null, true, 12);
        periodos.forEach((lbl,pi)=>{
          const wH = (pi===periodos.length-1) ? wHacAdj : wHac;
          celdas += wc(wp(wr(' ',false,12)), wSer);
          celdas += wc(wp(wr(' ',false,12)), wSab);
          celdas += wc(wp(wr(' ',false,12)), wH);
        });
        estRowsW += wtrow(celdas, EST_H);
      });
    } else {
      estRowsW = wtrow(wcSpan(wp(wr('Sin lista de estudiantes para este curso',false,12),'center','40','40'), W, 2+periodos.length*3, null));
    }

    const tblNotas = wtbl(wtrow(hdr1)+wtrow(hdr2)+estRowsW, W);

    // ── Tabla Rangos ──
    const wR0=Math.round(W*0.30), wR1=Math.round(W*0.175), wR2=Math.round(W*0.175), wR3=Math.round(W*0.175), wR4=W-wR0-wR1-wR2-wR3;
    function rangoRow(lbl,pts){
      const exc=Math.round(pts*0.85), bue=Math.round(pts*0.65), reg=Math.round(pts*0.40), ins=Math.round(pts*0.39);
      return wtrow(wcT(lbl,wR0,null,false,12)+wcT(`${exc} – ${pts}`,wR1,'E8F8E8',false,12,null,'center')+wcT(`${bue} – ${exc-1}`,wR2,'E8F0FF',false,12,null,'center')+wcT(`${reg} – ${bue-1}`,wR3,'FFF8E0',false,12,null,'center')+wcT(`0 – ${ins}`,wR4,'FFF0F0',false,12,null,'center'));
    }
    const tblRangos = wtbl(
      wtrow(wch('DIMENSIÓN / PTS',wR0)+wchM(['EXCELENTE','85–100%'],wR1,'2E7D32')+wchM(['BUENO','65–84%'],wR2,'1565C0')+wchM(['REGULAR','40–64%'],wR3,'F9A825')+wchM(['INSUFICIENTE','<40%'],wR4,'C62828'))+
      rangoRow(`SER (${serPts} pts)`,serPts)+
      rangoRow(`SABER — ${sabNom} (${sabPts} pts)`,sabPts)+
      rangoRow(`HACER — ${hacNom} (${hacPts} pts)`,hacPts)+
      wtrow(wcT(`TOTAL por registro (${total} pts)`,wR0,'F0F4FF',true,12)+wcT(`${Math.round(total*0.85)} – ${total}`,wR1,'E8F8E8',true,12,null,'center')+wcT(`${Math.round(total*0.65)} – ${Math.round(total*0.85)-1}`,wR2,'E8F0FF',true,12,null,'center')+wcT(`${Math.round(total*0.40)} – ${Math.round(total*0.65)-1}`,wR3,'FFF8E0',true,12,null,'center')+wcT(`0 – ${Math.round(total*0.39)}`,wR4,'FFF0F0',true,12,null,'center')),
    W);

    // ── Tabla Rúbricas por semana ──
    // Columnas: CRITERIO(22%) | EXCELENTE(19.5%) | BUENO(19.5%) | REGULAR(19.5%) | INSUFICIENTE(19.5%)
    const wCR=Math.round(W*0.22), wEX=Math.round(W*0.195), wBU=Math.round(W*0.195), wRG=Math.round(W*0.195), wIN=W-wCR-wEX-wBU-wRG;
    function criterioRowW(c){
      if(!c) return '';
      return wtrow(
        wcT(c.nombre||'', wCR,null,true,12)+
        wcT(c.excelente||'',wEX,'E8F8E8',false,12)+
        wcT(c.bueno||'',    wBU,'E8F0FF',false,12)+
        wcT(c.regular||'',  wRG,'FFF8E0',false,12)+
        wcT(c.insuficiente||'',wIN,'FFF0F0',false,12)
      );
    }
    function dimHdrRowW(lbl,fill){ return wtrow(wcSpan(wp(wr(lbl,true,13,'FFFFFF'),'left','40','40'),W,5,fill)); }
    function subHdrRowW(lbl,fill){ return wtrow(wcSpan(wp(wr(lbl,true,12,'1A3A6B'),'left','30','30'),W,5,fill)); }

    let rubRowsW = '';
    if(rub && rub.semanas && rub.semanas.length>0){
      const fills=['1A3A6B','2D5FA8','1E6EB5','1A4A7B'];
      rub.semanas.forEach((sem,i)=>{
        rubRowsW += dimHdrRowW('📅 '+(sem.titulo||'SEMANA '+(i+1)), fills[i]||'1A3A6B');
        rubRowsW += subHdrRowW('⬤ SER — Actitud y valores ('+serPts+' pts)','D0D8E8');
        rubRowsW += criterioRowW(sem.ser);
        rubRowsW += subHdrRowW('⬤ SABER — '+sabNom+' ('+sabPts+' pts)','E0E8FF');
        rubRowsW += criterioRowW(sem.saber);
        rubRowsW += subHdrRowW('⬤ HACER — '+hacNom+' ('+hacPts+' pts)','DDEEFF');
        rubRowsW += criterioRowW(sem.hacer);
      });
    } else {
      rubRowsW = wtrow(wcSpan(wp(wr('Genera el PDC con IA para obtener las rúbricas.',false,12),'center','40','40'),W,5));
    }
    const tblRubrica = wtbl(
      wtrow(wch('CRITERIO DE EVALUACIÓN',wCR)+wch('EXCELENTE',wEX)+wch('BUENO',wBU)+wch('REGULAR',wRG)+wch('INSUFICIENTE',wIN))+
      rubRowsW,
    W);

    // ══════════════════════════════════════════════
    // DOCUMENTO XML FINAL
    // ══════════════════════════════════════════════
    function wTitulo(txt, sz, color, caps){
      return wp(wr(txt,true,sz,color||'1A3A6B',false,caps),'center','80','40');
    }
    function wSubtitulo(txt, sz){ return wp(wr(txt,true,sz,'1A3A6B'),'center','40','40'); }
    function wSeccion(txt){ return wp(wr(txt,true,16),'','60','30'); }
    function wParrafo(txt,sz){ return wp(wr(txt,false,sz||14),'both','20','20'); }

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  mc:Ignorable="w14">
<w:body>
${wTitulo('EDUCACIÓN SECUNDARIA COMUNITARIA PRODUCTIVA',22,null,true)}
${wSubtitulo('PLAN DE DESARROLLO CURRICULAR N°'+d.nro+'   MES: '+d.mes,18)}
${wblank(12)}
${wSeccion('I. DATOS REFERENCIALES')}
${tblRef}
${wblank(12)}
${wSeccion('II. DESARROLLO')}
${wp(wr('Objetivo Holístico de Nivel:',true,15),'','40','20')}
${wParrafo(d.objNivel,14)}
${wblank(10)}
${tblPDC}
${wblank(10)}
${wSeccion('Adaptaciones curriculares')}
${tblAdap}
${wblank(10)}
${tblFirmas}
<w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t> </w:t></w:r></w:p>
${wTitulo('REGISTRO DE CALIFICACIONES Y RÚBRICAS DE EVALUACIÓN',20,null,true)}
${wSubtitulo(gradoCorto+' — '+d.area+' — '+d.unidad,16)}
${wp(wr('Docente: '+d.maestro+'   |   Gestión: 2026   |   Trimestre: '+d.trimestre+'   |   Frecuencia: '+frecLabel,false,13),'center','20','20')}
${wblank(10)}
${wSeccion('REGISTRO DE CALIFICACIONES')}
${wp(wr('SER ('+serPts+' pts)  |  '+sabNom+' ('+sabPts+' pts)  |  '+hacNom+' ('+hacPts+' pts)  |  Total: '+total+' pts  |  Aprobación: ≥'+Math.ceil(total*0.51)+' pts',false,13),'','20','20')}
${tblNotas}
${wblank(10)}
${wSeccion('RANGOS DE VALORACIÓN POR DIMENSIÓN')}
${tblRangos}
${wblank(10)}
${wSeccion('RÚBRICAS DE EVALUACIÓN POR SEMANA — '+gradoCorto)}
${wp(wr('Cada semana contiene: SER + SABER + HACER vinculados a los momentos del proceso formativo.',false,13),'','20','20')}
${tblRubrica}
${wblank(10)}
${tblFirmas}
<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840" w:orient="portrait"/>
  <w:pgMar w:top="737" w:right="737" w:bottom="737" w:left="737" w:header="0" w:footer="0" w:gutter="0"/>
</w:sectPr>
</w:body>
</w:document>`;

    // ══ Archivos del .docx ══
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;
    const relsMain = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
    const relsWord = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr>
    <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
    <w:sz w:val="16"/><w:szCs w:val="16"/>
    <w:lang w:val="es-BO"/>
  </w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr><w:tblBorders>
      <w:top    w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:left   w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:right  w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    </w:tblBorders></w:tblPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
  </w:style>
</w:styles>`;
    const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>
</w:settings>`;

    const zip = new JSZip();
    zip.file('[Content_Types].xml', contentTypes);
    zip.file('_rels/.rels', relsMain);
    zip.file('word/document.xml', docXml);
    zip.file('word/_rels/document.xml.rels', relsWord);
    zip.file('word/styles.xml', styles);
    zip.file('word/settings.xml', settings);

    const blob = await zip.generateAsync({type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url;
    a.download=`PDC_${d.mes||'MES'}_${(d.grado||'').replace(/\s+/g,'-')}_${d.paralelo||'A'}.docx`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  }catch(e){ alert('Error Word: '+e.message); console.error(e); }
  finally{ ocultarLoading(); }
}



function mostrarLoading(t){ document.getElementById('load-txt').textContent=t||'...'; document.getElementById('loading').classList.add('on'); }
function ocultarLoading(){ document.getElementById('loading').classList.remove('on'); }


// Inicializar al cargar
window.addEventListener('load', ()=>{
  // Pre-llenar paralelos disponibles según grado
  actualizarEstudiantes();
});
