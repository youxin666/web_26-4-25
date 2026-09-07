import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const profileModuleSource = readFileSync(new URL('../blog-user-profiles.js', import.meta.url), 'utf8');
const workerSource = readFileSync(new URL('../blog-worker.js', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../blog-public/script.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../blog-public/styles.css', import.meta.url), 'utf8');
const migrationUrl = new URL('../migrations/blog_0009_password_change.sql', import.meta.url);
assert.equal(existsSync(migrationUrl), true, 'password changes need a session-version migration');
const migration = readFileSync(migrationUrl, 'utf8');

assert.match(profileModuleSource, /export function validatePasswordChangeInput/);
const { validatePasswordChangeInput } = await import('../blog-user-profiles.js');

assert.equal(validatePasswordChangeInput({
  currentPassword: '',
  newPassword: 'new-password',
  confirmPassword: 'new-password'
}).error, 'CURRENT_PASSWORD_REQUIRED');
assert.equal(validatePasswordChangeInput({
  currentPassword: 'old-password',
  newPassword: 'short',
  confirmPassword: 'short'
}).error, 'PASSWORD_TOO_SHORT');
assert.equal(validatePasswordChangeInput({
  currentPassword: 'old-password',
  newPassword: 'new-password',
  confirmPassword: 'different-password'
}).error, 'PASSWORD_MISMATCH');
assert.equal(validatePasswordChangeInput({
  currentPassword: 'same-password',
  newPassword: 'same-password',
  confirmPassword: 'same-password'
}).error, 'PASSWORD_UNCHANGED');
assert.deepEqual(validatePasswordChangeInput({
  currentPassword: 'old-password',
  newPassword: 'new-password',
  confirmPassword: 'new-password'
}), { ok: true, currentPassword: 'old-password', newPassword: 'new-password' });

assert.match(migration, /ALTER TABLE blog_users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1/);
assert.match(workerSource, /pathname === '\/api\/user\/password'/);
assert.match(workerSource, /handleChangeUserPassword\(request, env\)/);
assert.match(workerSource, /UPDATE blog_users SET password_hash = \?, session_version = \?/);
assert.match(workerSource, /requireSameOrigin\(request\)/);
assert.match(workerSource, /verifyPassword\(validation\.currentPassword, user\.password_hash\)/);
assert.match(workerSource, /createUserToken\(updatedUser, env\)/);
assert.match(workerSource, /data-password-form/);
assert.match(workerSource, /styles\.css\?v=20260907-account-password/);
assert.match(workerSource, /script\.js\?v=20260907-account-password/);
assert.match(workerSource, /name="currentPassword"[^>]*autocomplete="current-password"/);
assert.match(workerSource, /name="newPassword"[^>]*autocomplete="new-password"/);
assert.match(workerSource, /name="confirmPassword"[^>]*autocomplete="new-password"/);
assert.match(clientSource, /profileRequest\('\/api\/user\/password'/);
assert.match(clientSource, /newPassword\.value !== confirmPassword\.value/);
assert.match(styles, /\.profile-security-card/);
assert.match(styles, /@media\(max-width:720px\)[\s\S]*?\.profile-security-card/);

class MemoryUserDb {
  constructor() {
    this.users = [];
  }

  prepare(sql) {
    return new MemoryUserStatement(this, sql);
  }
}

class MemoryUserStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, ' ').trim();
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async first() {
    if (/FROM blog_users WHERE email = \?/i.test(this.sql)) {
      return structuredClone(this.db.users.find(user => user.email === this.args[0]) || null);
    }
    if (/FROM blog_users WHERE id = \?/i.test(this.sql)) {
      return structuredClone(this.db.users.find(user => user.id === this.args[0]) || null);
    }
    throw new Error(`Unexpected first() SQL: ${this.sql}`);
  }

  async run() {
    if (/^INSERT INTO blog_users/i.test(this.sql)) {
      const [id, email, displayName, passwordHash, createdAt] = this.args;
      this.db.users.push({
        id,
        email,
        display_name: displayName,
        password_hash: passwordHash,
        created_at: createdAt,
        session_version: 1
      });
      return { meta: { changes: 1 } };
    }
    if (/^UPDATE blog_users SET password_hash = \?, session_version = \?/i.test(this.sql)) {
      const [passwordHash, sessionVersion, updatedAt, userId, expectedHash] = this.args;
      const user = this.db.users.find(candidate => candidate.id === userId && candidate.password_hash === expectedHash);
      if (!user) return { meta: { changes: 0 } };
      user.password_hash = passwordHash;
      user.session_version = sessionVersion;
      user.updated_at = updatedAt;
      return { meta: { changes: 1 } };
    }
    throw new Error(`Unexpected run() SQL: ${this.sql}`);
  }
}

const worker = (await import('../blog-worker.js')).default;
const env = { BLOG_DB: new MemoryUserDb(), USER_SESSION_SECRET: 'password-change-test-secret' };
const origin = 'https://blog.example';

async function requestJson(path, init = {}) {
  const response = await worker.fetch(new Request(`${origin}${path}`, init), env, {});
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function jsonInit(body, cookie = '') {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: JSON.stringify(body)
  };
}

const register = await requestJson('/api/auth/register', jsonInit({
  displayName: 'Password Tester',
  email: 'password-tester@example.test',
  password: 'old-password'
}));
assert.equal(register.response.status, 200);
const firstCookie = register.response.headers.get('set-cookie').split(';', 1)[0];

const wrongCurrent = await requestJson('/api/user/password', jsonInit({
  currentPassword: 'wrong-password',
  newPassword: 'new-password',
  confirmPassword: 'new-password'
}, firstCookie));
assert.equal(wrongCurrent.response.status, 401);
assert.equal(wrongCurrent.payload.error, 'CURRENT_PASSWORD_INCORRECT');

const mismatch = await requestJson('/api/user/password', jsonInit({
  currentPassword: 'old-password',
  newPassword: 'new-password',
  confirmPassword: 'different-password'
}, firstCookie));
assert.equal(mismatch.response.status, 400);
assert.equal(mismatch.payload.error, 'PASSWORD_MISMATCH');

const changed = await requestJson('/api/user/password', jsonInit({
  currentPassword: 'old-password',
  newPassword: 'new-password',
  confirmPassword: 'new-password'
}, firstCookie));
assert.equal(changed.response.status, 200);
assert.equal(changed.payload.ok, true);
const refreshedCookie = changed.response.headers.get('set-cookie').split(';', 1)[0];
assert.notEqual(refreshedCookie, firstCookie);

const staleSession = await requestJson('/api/auth/session', { headers: { Cookie: firstCookie } });
assert.equal(staleSession.payload.authenticated, false);

const currentSession = await requestJson('/api/auth/session', { headers: { Cookie: refreshedCookie } });
assert.equal(currentSession.payload.authenticated, true);

const oldLogin = await requestJson('/api/auth/login', jsonInit({
  email: 'password-tester@example.test',
  password: 'old-password'
}));
assert.equal(oldLogin.response.status, 401);

const newLogin = await requestJson('/api/auth/login', jsonInit({
  email: 'password-tester@example.test',
  password: 'new-password'
}));
assert.equal(newLogin.response.status, 200);

console.log('password change contracts passed');
