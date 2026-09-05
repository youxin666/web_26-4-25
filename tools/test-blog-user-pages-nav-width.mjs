import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const styles = await readFile(new URL('../blog-public/styles.css', import.meta.url), 'utf8');
const worker = await readFile(new URL('../blog-worker.js', import.meta.url), 'utf8');
const desktopWidth = 'width: min(calc(100% - clamp(2rem, 3.2vw, 4rem)), 116rem)';

assert.match(styles, new RegExp(`\\.publish-shell,\\s*\\n\\.my-articles-shell \\{ ${desktopWidth.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
assert.match(styles, new RegExp(`\\.notifications-shell \\{ ${desktopWidth.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
assert.match(styles, new RegExp(`\\.bookmarks-shell \\{ ${desktopWidth.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
assert.match(styles, /\.bookmarks-shell \{ width: min\(100% - 1rem, 44rem\); \}/);
assert.match(worker, /<div class="bookmarks-shell">/);
assert.doesNotMatch(worker, /<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">/);
assert.match(worker, /styles\.css\?v=20260905-centered-side-arc/);

console.log('user page navigation-width checks passed');
