import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync('trading-worker.js', 'utf8');
const html = fs.readFileSync('trading-public/index.html', 'utf8');
const css = fs.readFileSync('trading-public/styles.css', 'utf8');
for (const route of ['/api/detail', '/api/liquidations', '/api/etf']) assert.ok(worker.includes(route), `missing ${route}`);
assert.ok(worker.includes('detail:${symbol}'));
assert.ok(worker.includes("'liquidation:events'"));
assert.ok(worker.includes("['BTC', 'ETH', 'SOL']"));
assert.ok(html.includes('data-view="detail"'));
assert.ok(html.includes('id="detail-view"'));
assert.ok(css.includes('.detail-workspace'));
console.log('trading detail contract tests passed');
