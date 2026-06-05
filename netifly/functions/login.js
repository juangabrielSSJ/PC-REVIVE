exports.handler = async function(event, context) {
  // Solo aceptar POST
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { password, apikey } = JSON.parse(event.body || '{}');

  // La contraseña viene de variable de entorno de Netlify (nunca en el código)
  const PASS_CORRECTA = process.env.PDC_PASSWORD;

  if(!password || password !== PASS_CORRECTA){
    return {
      statusCode: 401,
      body: JSON.stringify({ ok: false, error: 'Contraseña incorrecta' })
    };
  }

  if(!apikey || !apikey.startsWith('gsk_')){
    return {
      statusCode: 401,
      body: JSON.stringify({ ok: false, error: 'API Key de Groq inválida' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true })
  };
};