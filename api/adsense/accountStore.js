import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ADSENSE_PROVIDER = 'google_adsense';
const TOKEN_PREFIX = 'v1';

export function getBearerToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || '';
  const match = String(authorization).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export function createConnectedAccountRow({
  ownerId,
  provider = ADSENSE_PROVIDER,
  accountName,
  refreshTokenCiphertext,
  accessTokenCiphertext = '',
  expiresAt = null,
  status = 'connected',
  lastError = '',
  now = new Date().toISOString()
} = {}) {
  if (!ownerId) throw new Error('ownerId is required');
  if (!accountName) throw new Error('accountName is required');
  if (!refreshTokenCiphertext) throw new Error('refreshTokenCiphertext is required');

  return {
    owner_id: ownerId,
    provider,
    provider_account_id: accountName,
    refresh_token_ciphertext: refreshTokenCiphertext,
    access_token_ciphertext: accessTokenCiphertext,
    access_token_expires_at: expiresAt,
    connection_status: status,
    last_error: lastError,
    updated_at: now
  };
}

export function mapConnectedAccountRow(row = {}) {
  return {
    provider: row.provider || ADSENSE_PROVIDER,
    providerAccountId: row.provider_account_id || '',
    connectionStatus: row.connection_status || 'needs_connection',
    lastSyncedAt: row.last_synced_at || '',
    lastError: row.last_error || ''
  };
}

function getEncryptionKey(secret) {
  const value = String(secret || '');
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length === 32) return decoded;
  const utf8 = Buffer.from(value, 'utf8');
  if (utf8.length === 32) return utf8;
  throw new Error('Token encryption key must be 32 bytes or base64-encoded 32 bytes');
}

export function encryptToken(plaintext, secret, options = {}) {
  if (!plaintext) return '';
  const key = getEncryptionKey(secret);
  const iv = options.iv || randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return [
    TOKEN_PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url')
  ].join('.');
}

export function decryptToken(encrypted, secret) {
  if (!encrypted) return '';
  const [version, ivText, tagText, ciphertextText] = String(encrypted).split('.');
  if (version !== TOKEN_PREFIX || !ivText || !tagText || !ciphertextText) {
    throw new Error('Unsupported encrypted token format');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(secret),
    Buffer.from(ivText, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final()
  ]);
  return plaintext.toString('utf8');
}

export function signOAuthState(payload = {}, secret) {
  if (!secret) throw new Error('OAuth state secret is required');
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyOAuthState(state, secret) {
  if (!secret) throw new Error('OAuth state secret is required');
  const [body, signature] = String(state || '').split('.');
  if (!body || !signature) throw new Error('Invalid OAuth state');
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const signatureBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (
    signatureBytes.length !== expectedBytes.length
    || !timingSafeEqual(signatureBytes, expectedBytes)
  ) {
    throw new Error('Invalid OAuth state');
  }
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}
