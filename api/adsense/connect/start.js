import { getBearerToken, signOAuthState } from '../accountStore.js';
import { buildGoogleAdSenseAuthUrl } from '../oauth.js';
import { getSupabaseUser } from '../status.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const env = process.env;
    const missing = [
      'GOOGLE_ADSENSE_CLIENT_ID',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ADSENSE_OAUTH_STATE_SECRET'
    ].filter(key => !env[key]);
    if (missing.length) throw new Error(`Missing Vercel env: ${missing.join(', ')}`);

    const bearerToken = getBearerToken(request.headers || {});
    if (!bearerToken) throw new Error('Sign in before connecting Google AdSense.');

    const user = await getSupabaseUser({
      supabaseUrl: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      bearerToken,
      fetchImpl: fetch
    });
    const origin = getRequestOrigin(request);
    const returnTo = String(request.query?.returnTo || origin || '').trim() || origin;
    const redirectUri = `${origin}/api/adsense/connect/callback`;
    const state = signOAuthState({ ownerId: user.id, returnTo }, env.ADSENSE_OAUTH_STATE_SECRET);

    response.status(200).json({
      url: buildGoogleAdSenseAuthUrl({
        clientId: env.GOOGLE_ADSENSE_CLIENT_ID,
        redirectUri,
        state
      })
    });
  } catch (error) {
    response.status(400).json({ error: error.message || 'Failed to start AdSense connection' });
  }
}

function getRequestOrigin(request) {
  const host = request.headers?.['x-forwarded-host'] || request.headers?.host;
  const protocol = request.headers?.['x-forwarded-proto'] || 'https';
  return host ? `${protocol}://${host}` : '';
}
