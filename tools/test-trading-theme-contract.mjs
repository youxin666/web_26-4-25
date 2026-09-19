import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('trading-public/index.html', 'utf8');
const css = fs.readFileSync('trading-public/styles.css', 'utf8');
const controllerPath = 'trading-public/theme-controller.js';

assert.ok(fs.existsSync(controllerPath), 'theme controller must exist');
const controller = fs.readFileSync(controllerPath, 'utf8');

assert.match(html, /data-theme-bootstrap/);
assert.match(html, /id="theme-toggle"/);
assert.match(html, /aria-label="主题模式/);
assert.match(html, /src="\/theme-controller\.js\?v=/);
assert.match(css, /:root\[data-theme="light"\]/);
assert.match(css, /--surface:/);
assert.match(css, /--surface-raised:/);
assert.match(css, /--shadow-panel:/);
assert.match(controller, /trading-theme-preference/);
assert.match(controller, /matchMedia\('\(prefers-color-scheme: dark\)'\)/);
assert.match(controller, /localStorage\.setItem/);
assert.match(controller, /addEventListener\('change'/);
assert.doesNotMatch(controller, /fetch\(|setInterval\(|\/api\//);

console.log('trading theme contract tests passed');
