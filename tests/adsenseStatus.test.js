import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAdSenseRefreshToken } from '../api/adsense/status.js';
import { encryptToken } from '../api/adsense/accountStore.js';

test('resolveAdSenseRefreshToken prefers the signed-in user connected account', async () => {
  const encryptionKey = '0123456789abcdef0123456789abcdef';
  const encryptedRefreshToken = encryptToken('user-refresh-token', encryptionKey, {
    iv: Buffer.alloc(12, 2)
  });

  const credential = await resolveAdSenseRefreshToken({
    bearerToken: 'supabase-token',
    env: {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      TOKEN_ENCRYPTION_KEY: encryptionKey,
      GOOGLE_ADSENSE_REFRESH_TOKEN: 'fallback-refresh-token'
    },
    fetchImpl: async (url) => {
      if (String(url).endsWith('/auth/v1/user')) {
        return {
          ok: true,
          json: async () => ({ id: 'user-1', email: 'user@example.com' })
        };
      }
      return {
        ok: true,
        json: async () => ([{
          refresh_token_ciphertext: encryptedRefreshToken,
          provider_account_id: 'accounts/pub-123'
        }])
      };
    }
  });

  assert.deepEqual(credential, {
    source: 'connected_account',
    refreshToken: 'user-refresh-token',
    accountName: 'accounts/pub-123',
    ownerId: 'user-1'
  });
});

test('resolveAdSenseRefreshToken falls back to Vercel env refresh token', async () => {
  const credential = await resolveAdSenseRefreshToken({
    bearerToken: '',
    env: {
      GOOGLE_ADSENSE_REFRESH_TOKEN: 'fallback-refresh-token'
    }
  });

  assert.deepEqual(credential, {
    source: 'env',
    refreshToken: 'fallback-refresh-token',
    accountName: '',
    ownerId: ''
  });
});
