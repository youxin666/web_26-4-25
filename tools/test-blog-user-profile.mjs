import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateProfileInput, detectAvatarType, privateProfileDto, publicProfileDto } from '../blog-user-profiles.js';

const migration = readFileSync(new URL('../migrations/blog_0008_user_profiles.sql', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../blog-worker.js', import.meta.url), 'utf8');
assert.match(migration, /ALTER TABLE blog_users ADD COLUMN avatar_key TEXT/);
assert.match(migration, /ALTER TABLE blog_users ADD COLUMN avatar_mime_type TEXT/);
assert.match(migration, /ALTER TABLE blog_users ADD COLUMN bio TEXT/);
assert.match(migration, /ALTER TABLE blog_users ADD COLUMN updated_at TEXT/);
assert.deepEqual(validateProfileInput({ displayName: ' Rowan ', bio: ' Notes ' }), { ok: true, displayName: 'Rowan', bio: 'Notes' });
assert.equal(validateProfileInput({ displayName: '', bio: '' }).error, 'DISPLAY_NAME_REQUIRED');
assert.equal(validateProfileInput({ displayName: 'x'.repeat(41), bio: '' }).error, 'DISPLAY_NAME_TOO_LONG');
assert.equal(validateProfileInput({ displayName: 'Rowan', bio: 'x'.repeat(301) }).error, 'BIO_TOO_LONG');
assert.equal(detectAvatarType(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), 'image/png');
const row = { id: 'u1', email: 'reader@example.com', display_name: 'Reader', password_hash: 'secret', bio: 'Bio', created_at: '2026-01-01', published_count: 2 };
assert.equal(privateProfileDto(row).email, 'reader@example.com');
assert.equal(Object.hasOwn(publicProfileDto(row), 'email'), false);
assert.equal(Object.hasOwn(publicProfileDto(row), 'password_hash'), false);

assert.match(worker, /pathname === '\/api\/user\/profile'/);
assert.match(worker, /handleGetUserProfile\(request, env\)/);
assert.match(worker, /handleUpdateUserProfile\(request, env\)/);
assert.match(worker, /pathname === '\/api\/user\/avatar'/);
assert.match(worker, /handleUploadUserAvatar\(request, env\)/);
assert.match(worker, /\/api\\\/users\\\/\(\[\^\/\]\+\)\\\/profile/);
assert.match(worker, /publicProfileDto\(row\)/);
assert.match(worker, /\/media\\\/user-avatar\\\/\(\[\^\/\]\+\)/);
assert.match(worker, /requireSameOrigin\(request\)/);
assert.match(worker, /user-avatars\/\$\{auth\.user\.id\}/);
assert.match(worker, /Cache-Control': 'public, max-age=300'/);

console.log('user profile contracts passed');
