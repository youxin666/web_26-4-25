import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../blog-public/styles.css', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../blog-worker.js', import.meta.url), 'utf8');

assert.match(css, /\.admin-authenticated \.admin-shell\s*\{[^}]*box-sizing:border-box[^}]*width:100%[^}]*max-width:none[^}]*padding-inline:clamp\(1\.5rem,2vw,2rem\)/s, 'authenticated admin workspaces should use the available desktop width');
assert.match(css, /@media\(max-width:760px\)\{\.admin-authenticated \.admin-shell\{padding-inline:\.75rem\}\}/, 'authenticated admin workspaces should keep compact mobile spacing');
assert.match(css, /\.admin-shell\s*\{width:min\(1180px,100%\)/, 'the unauthenticated admin login should retain its readable width cap');
assert.match(worker, /styles\.css\?v=20260906-account-textarea-boundary/, 'the shared stylesheet cache key should expose the latest visual update');

console.log('Admin dashboard and submissions fluid width contract passed.');
