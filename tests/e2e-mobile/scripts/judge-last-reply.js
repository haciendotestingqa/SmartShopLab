/**
 * Maestro runScript — LLM-as-judge vía backend local.
 *
 * La API key NUNCA está aquí: solo en `.env.ai-evals`, leída por el backend.
 * Este script llama POST http://127.0.0.1:3001/api/ai/judge
 * Entrada: maestro.copiedText = respuesta del asistente en pantalla
 */

function cleanEnv(value, fallback) {
  if (value === null || value === undefined) return fallback;
  var s = String(value).trim();
  if (!s || s === 'undefined' || s === 'null' || s.indexOf('${') === 0) return fallback;
  return s;
}

var question = cleanEnv(
  typeof USER_QUESTION !== 'undefined' ? USER_QUESTION : '',
  'Hola, que laptops tienen?'
);
var rubric = cleanEnv(
  typeof JUDGE_RUBRIC !== 'undefined' ? JUDGE_RUBRIC : '',
  'Debe basarse en el catalogo real: SmartBook Pro Laptop ~1299.99. Espanol, util. Sin inventar descuentos/garantias/envios.'
);
var judgeUrl = cleanEnv(
  typeof JUDGE_API_URL !== 'undefined' ? JUDGE_API_URL : '',
  'http://127.0.0.1:3001/api/ai/judge'
);

var assistantReply = maestro.copiedText || '';

output.judge = {
  pass: false,
  score: 0,
  reason: '',
  mentionsCatalog: false,
  noForbiddenClaims: false,
  checksMatchesCatalog: false,
  checksNoHallucination: false,
  replyPreview: assistantReply.slice(0, 220),
  catalogExpected: 'SmartBook Pro Laptop ~$1299.99 (catalog.ts)',
};

if (!assistantReply || assistantReply.length < 3) {
  output.judge.reason = 'No se copio texto de chat-message-assistant-latest';
  throw new Error(output.judge.reason);
}

var response = http.post(judgeUrl, {
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userQuestion: question,
    assistantReply: assistantReply,
    rubric: rubric,
  }),
});

if (response.status >= 400) {
  output.judge.reason =
    'Juez backend HTTP ' + response.status + ': ' + String(response.body).slice(0, 240);
  throw new Error(output.judge.reason);
}

var verdict = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
var checks = verdict.checks || {};

output.judge = {
  pass: Boolean(verdict.pass),
  score: typeof verdict.score === 'number' ? verdict.score : 0,
  reason: verdict.reason || 'Sin razon',
  mentionsCatalog: Boolean(verdict.mentionsCatalog),
  noForbiddenClaims: Boolean(verdict.noForbiddenClaims),
  checksMatchesCatalog: Boolean(checks.matches_catalog),
  checksNoHallucination: Boolean(checks.no_hallucination),
  checksRelevant: Boolean(checks.relevant),
  checksFactual: Boolean(checks.factual),
  replyPreview: assistantReply.slice(0, 220),
  catalogExpected: verdict.catalogExpected || 'SmartBook Pro Laptop ~$1299.99',
  judgeModel: verdict.judgeModel || '',
};

if (!output.judge.pass) {
  throw new Error(
    'LLM-as-judge FAIL score=' +
      output.judge.score +
      ' | reason=' +
      output.judge.reason +
      ' | reply=' +
      assistantReply.slice(0, 120)
  );
}
