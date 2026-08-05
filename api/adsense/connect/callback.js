import {
  ADSENSE_PROVIDER,
  createConnectedAccountRow,
  encryptToken,
  verifyOAuthState
} from '../accountStore.js';
import { exchangeAuthorizationCode } from '../oauth.js';

export default async function handler(request, response) {
  try {
    const env = process.env;
    const missing = [
      'GOOGLE_ADSENSE_CLIENT_ID',
      'GOOGLE_ADSENSE_CLIENT_SECRET',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'TOKEN_ENCRYPTION_KEY',
      'ADSENSE_OAUTH_STATE_SECRET'
    ].filter(key => !env[key]);
    if (missing.length) throw new Error(`Missing Vercel env: ${missing.join(', ')}`);

    const code = String(request.query?.code || '');
    const state = verifyOAuthState(request.query?.state, env.ADSENSE_OAUTH_STATE_SECRET);
    const origin = getRequestOrigin(request);
    const redirectUri = `${origin}/api/adsense/connect/callback`;
    const tokens = await exchangeAuthorizationCode({
      code,
      clientId: env.GOOGLE_ADSENSE_CLIENT_ID,
      clientSecret: env.GOOGLE_ADSENSE_CLIENT_SECRET,
      redirectUri
    });
    if (!tokens.refreshToken) {
      throw new Error('Google did not return a refresh token. Disconnect and try consent again.');
    }

    const accountName = await getFirstAccountName(tokens.accessToken);
    await upsertConnectedAccount({
      supabaseUrl: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      row: createConnectedAccountRow({
        ownerId: state.ownerId,
        provider: ADSENSE_PROVIDER,
        accountName,
        refreshTokenCiphertext: encryptToken(tokens.refreshToken, env.TOKEN_ENCRYPTION_KEY),
        accessTokenCiphertext: tokens.accessToken
          ? encryptToken(tokens.accessToken, env.TOKEN_ENCRYPTION_KEY)
          : '',
        expiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
          : null
      })
    });

    response.writeHead(302, { Location: `${state.returnTo || '/'}#adsense=connected` });
    response.end();
  } catch (error) {
    response.status(400).send(error.message || 'Failed to connect Google AdSense');
  }
}

async function getFirstAccountName(accessToken) {
  const accountsResponse = await fetch('https://adsense.googleapis.com/v2/accounts', {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  const accountsPayload = await accountsResponse.json();
  if (!accountsResponse.ok) {
    throw new Error(accountsPayload.error?.message || 'Failed to load AdSense accounts');
  }
  const [account] = accountsPayload.accounts || [];
  if (!account?.name) throw new Error('No AdSense account found for this Google user');
  return account.name;
}

async function upsertConnectedAccount({ supabaseUrl, serviceRoleKey, row }) {
  const url = new URL(`${supabaseUrl}/rest/v1/connected_accounts`);
  url.searchParams.set('on_conflict', 'owner_id,provider');
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(row)
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Failed to save connected AdSense account');
  }
}

function getRequestOrigin(request) {
  const host = request.headers?.['x-forwarded-host'] || request.headers?.host;
  const protocol = request.headers?.['x-forwarded-proto'] || 'https';
  return host ? `${protocol}://${host}` : '';
}
