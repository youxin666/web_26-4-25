export const PROFILE_LIMITS = Object.freeze({
  displayName: 40,
  bio: 300,
  avatarBytes: 5 * 1024 * 1024
});

export function validateProfileInput(input) {
  const displayName = typeof input?.displayName === 'string' ? input.displayName.trim() : '';
  const bio = typeof input?.bio === 'string' ? input.bio.trim() : '';
  if (!displayName) return { ok: false, error: 'DISPLAY_NAME_REQUIRED', field: 'displayName' };
  if ([...displayName].length > PROFILE_LIMITS.displayName) return { ok: false, error: 'DISPLAY_NAME_TOO_LONG', field: 'displayName' };
  if ([...bio].length > PROFILE_LIMITS.bio) return { ok: false, error: 'BIO_TOO_LONG', field: 'bio' };
  return { ok: true, displayName, bio };
}

export function detectAvatarType(bytes) {
  if (!(bytes instanceof Uint8Array)) return null;
  if (bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => bytes[index] === value)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

function sharedProfileDto(row) {
  return {
    id: row.id,
    displayName: row.display_name || '',
    bio: row.bio || '',
    avatarUrl: row.avatar_key ? `/media/user-avatar/${encodeURIComponent(row.id)}` : null,
    publishedCount: Number(row.published_count || 0)
  };
}

export function publicProfileDto(row) {
  return sharedProfileDto(row);
}

export function privateProfileDto(row) {
  return {
    ...sharedProfileDto(row),
    email: row.email || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || row.created_at || ''
  };
}
