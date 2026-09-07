import fs from 'node:fs';
import assert from 'node:assert/strict';

const cssUrl = new URL('../public/fixed-header.css', import.meta.url);
assert.equal(fs.existsSync(cssUrl), true, 'the fixed header stylesheet must exist');
const css = fs.readFileSync(cssUrl, 'utf8');

assert.match(css, /\.site-header\s*\{[^}]*position:\s*fixed;[^}]*top:\s*0;[^}]*left:\s*50%;[^}]*translate:\s*-50% 0;[^}]*background:\s*transparent;[^}]*border-color:\s*transparent;[^}]*box-shadow:\s*none;/s);
assert.match(css, /\.site-header::before\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0 auto auto 50%;[^}]*width:\s*100vw;[^}]*height:\s*100%;[^}]*transform:\s*translateX\(-50%\);[^}]*background:\s*linear-gradient\(180deg, rgba\(255, 255, 255, 0\.34\), rgba\(248, 246, 252, 0\.16\)\);[^}]*backdrop-filter:\s*blur\(28px\) saturate\(185%\);[^}]*-webkit-backdrop-filter:\s*blur\(28px\) saturate\(185%\);/s, 'the main header must use the same full-width glass treatment as the blog');
assert.match(css, /:root\[data-theme="dark"\] \.site-header::before\s*\{[^}]*background:\s*linear-gradient\(180deg, rgba\(22, 22, 28, 0\.42\), rgba\(14, 14, 20, 0\.24\)\);[^}]*backdrop-filter:\s*blur\(28px\) saturate\(175%\);/s, 'dark mode must match the blog glass treatment');
assert.match(css, /main\s*\{[^}]*padding-top:\s*112px;/s);
assert.match(css, /@media \(max-width:\s*860px\)[\s\S]*?main\s*\{[^}]*padding-top:\s*82px;/s);
assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*?main\s*\{[^}]*padding-top:\s*74px;/s);

for (const name of fs.readdirSync(new URL('../public/', import.meta.url)).filter((file) => file.endsWith('.html'))) {
  const html = fs.readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8');
  if (!html.includes('styles.css?v=')) continue;
  assert.match(html, /<link rel="stylesheet" href="fixed-header\.css\?v=20260907-blog-glass">/, `${name} must load the fixed header override`);
}

console.log('Main site fixed glass header contract passed.');
