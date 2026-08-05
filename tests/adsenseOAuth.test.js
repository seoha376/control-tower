import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleAdSenseAuthUrl,
  exchangeAuthorizationCode
} from '../api/adsense/oauth.js';

test('buildGoogleAdSenseAuthUrl requests offline AdSense access with state', () => {
  const url = new URL(buildGoogleAdSenseAuthUrl({
    clientId: 'client-id',
    redirectUri: 'https://control.example/api/adsense/connect/callback',
    state: 'state-token'
  }));

  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('client_id'), 'client-id');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://control.example/api/adsense/connect/callback');
  assert.equal(url.searchParams.get('scope'), 'https://www.googleapis.com/auth/adsense.readonly');
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('prompt'), 'consent');
  assert.equal(url.searchParams.get('state'), 'state-token');
});

test('exchangeAuthorizationCode posts the code to Google token endpoint', async () => {
  const calls = [];
  const tokens = await exchangeAuthorizationCode({
    code: 'code-1',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'https://control.example/api/adsense/connect/callback',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600
        })
      };
    }
  });

  assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.body.get('grant_type'), 'authorization_code');
  assert.equal(calls[0].options.body.get('code'), 'code-1');
  assert.deepEqual(tokens, {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600
  });
});
