import './env.mjs';
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY server env’da yo‘q.');
const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, store: false, input: 'Reply with OK only.', max_output_tokens: 64, ...(model.startsWith('gpt-5.6-luna') ? { reasoning: { effort: 'none' } } : {}) }), signal: AbortSignal.timeout(30000) });
const payload = await response.json();
console.log(JSON.stringify({ status: response.status, model, responseStatus: payload.status, errorCode: payload.error?.code || null, errorMessage: String(payload.error?.message || payload.message || '').replaceAll(process.env.OPENAI_API_KEY, '[REDACTED]').slice(0,250) }));
if (!response.ok || payload.status !== 'completed') process.exitCode = 1;
