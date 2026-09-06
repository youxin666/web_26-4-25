import fs from 'node:fs';
import assert from 'node:assert/strict';

const cssUrl = new URL('../public/fixed-header.css', import.meta.url);
assert.equal(fs.existsSync(cssUrl), true, 'the fixed header stylesheet must exist');
const css = fs.readFileSync(cssUrl, 'utf8');

assert.match(css, /\.site-header\s*\{[^}]*position:\s*fixed;[^}]*top:\s*12px;[^}]*left:\s*50%;[^}]*translate:\s*-50% 0;/s);
assert.match(css, /\.site-header\s*\{[^}]*backdrop-filter:\s*blur\(24px\) saturate\(1\.45\);/s);
assert.match(css, /\.site-header\s*\{[^}]*-webkit-backdrop-filter:\s*blur\(24px\) saturate\(1\.45\);/s);
assert.match(css, /main\s*\{[^}]*padding-top:\s*112px;/s);
assert.match(css, /@media \(max-width:\s*860px\)[\s\S]*?main\s*\{[^}]*padding-top:\s*82px;/s);
assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*?main\s*\{[^}]*padding-top:\s*74px;/s);

for (const name of fs.readdirSync(new URL('../public/', import.meta.url)).filter((file) => file.endsWith('.html'))) {
  const html = fs.readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8');
  if (!html.includes('styles.css?v=')) continue;
  assert.match(html, /<link rel="stylesheet" href="fixed-header\.css\?v=20260906-fixed-glass-header">/, `${name} must load the fixed header override`);
}

console.log('Main site fixed glass header contract passed.');
