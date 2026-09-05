import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../blog-public/styles.css', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../blog-worker.js', import.meta.url), 'utf8');

assert.match(
  css,
  /\.auth-shell\s*\{[^}]*box-sizing:\s*border-box;[^}]*width:\s*100%;[^}]*max-width:\s*none;[^}]*padding-left:\s*clamp\(2rem,\s*4vw,\s*5rem\);[^}]*padding-right:\s*clamp\(5rem,\s*8vw,\s*10rem\);[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(440px,\s*30rem\);/s,
  'desktop login content should use the available width while keeping the form readable',
);
assert.match(
  css,
  /\.auth-shell\s*\{\s*grid-template-columns:\s*1fr;[^}]*width:\s*min\(100%\s*-\s*1rem,\s*34rem\);[^}]*padding-inline:\s*0;/s,
  'mobile login content should retain its compact single-column layout',
);
assert.match(worker, /styles\.css\?v=20260905-search-close-center/, 'login width update should retain a fresh stylesheet cache key');

console.log('Login fluid width contract passed.');
