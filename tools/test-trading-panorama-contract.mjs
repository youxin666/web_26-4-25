import assert from 'node:assert/strict';
import fs from 'node:fs';
const worker = fs.readFileSync('trading-worker.js', 'utf8');
const html = fs.readFileSync('trading-public/index.html', 'utf8');
for (const token of ['/api/panorama','panorama:published','panorama:draft','async alarm()']) assert.ok(worker.includes(token), `missing ${token}`);
assert.doesNotMatch(worker, /api_key=.*COINALYZE_API_KEY/);
assert.ok(html.includes('data-view="panorama"'), 'missing panorama tab');
console.log('trading panorama contract tests passed');
