import './env.mjs';
const checks = [['API', 'http://127.0.0.1:3001/api/v1/health/live'], ['ML', 'http://127.0.0.1:8001/health/live'], ['Web', 'http://localhost:5173']];
for (const [name, url] of checks) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  console.log(`${name}: OK`);
}
const cap = await fetch('http://127.0.0.1:3001/api/v1/capabilities').then(r => r.json());
console.log('AI capability:', JSON.stringify(cap));
