import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConnectedAccountRow,
  decryptToken,
  encryptToken,
  getBearerToken,
  mapConnectedAccountRow,
  signOAuthState,
  verifyOAuthState
} from '../api/adsense/accountStore.js';

test('getBearerToken extracts Supabase access tokens from authorization headers', () => {
  assert.equal(getBearerToken({ authorization: 'Bearer user-token' }), 'user-token');
  assert.equal(getBearerToken({ Authorization: 'Bearer upper-token' }), 'upper-token');
  assert.equal(getBearerToken({ authorization: 'Basic nope' }), '');
  assert.equal(getBearerToken({}), '');
});

test('createConnectedAccountRow stores provider tokens under the signed-in owner', () => {
  assert.deepEqual(createConnectedAccountRow({
    ownerId: 'user-1',
    provider: 'google_adsense',
    accountName: 'accounts/pub-123',
    refreshTokenCiphertext: 'encrypted-refresh',
    accessTokenCiphertext: 'encrypted-access',
    expiresAt: '2026-08-06T01:00:00.000Z',
    now: '2026-08-06T00:00:00.000Z'
  }), {
    owner_id: 'user-1',
    provider: 'google_adsense',
    provider_account_id: 'accounts/pub-123',
    refresh_token_ciphertext: 'encrypted-refresh',
    access_token_ciphertext: 'encrypted-access',
    access_token_expires_at: '2026-08-06T01:00:00.000Z',
    connection_status: 'connected',
    last_error: '',
    updated_at: '2026-08-06T00:00:00.000Z'
  });
});

test('mapConnectedAccountRow hides token ciphertext from browser-facing status', () => {
  assert.deepEqual(mapConnectedAccountRow({
    provider: 'google_adsense',
    provider_account_id: 'accounts/pub-123',
    refresh_token_ciphertext: 'secret',
    access_token_ciphertext: 'secret',
    connection_status: 'connected',
    last_synced_at: '2026-08-06T01:00:00.000Z',
    last_error: ''
  }), {
    provider: 'google_adsense',
    providerAccountId: 'accounts/pub-123',
    connectionStatus: 'connected',
    lastSyncedAt: '2026-08-06T01:00:00.000Z',
    lastError: ''
  });
});

test('encryptToken and decryptToken round-trip without exposing plaintext', () => {
  const secret = '0123456789abcdef0123456789abcdef';
  const encrypted = encryptToken('refresh-token', secret, {
    iv: Buffer.alloc(12, 1)
  });

  assert.notEqual(encrypted, 'refresh-token');
  assert.equal(decryptToken(encrypted, secret), 'refresh-token');
});

test('signOAuthState and verifyOAuthState protect callback ownership state', () => {
  const state = signOAuthState({ ownerId: 'user-1', returnTo: 'https://control.example/' }, 'state-secret');

  assert.deepEqual(verifyOAuthState(state, 'state-secret'), {
    ownerId: 'user-1',
    returnTo: 'https://control.example/'
  });
  assert.throws(() => verifyOAuthState(`${state}tampered`, 'state-secret'), /Invalid OAuth state/);
});
