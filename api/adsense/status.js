import { ADSENSE_PROVIDER, decryptToken, getBearerToken } from './accountStore.js';

const REQUIRED_GOOGLE_ENV = [
  'GOOGLE_ADSENSE_CLIENT_ID',
  'GOOGLE_ADSENSE_CLIENT_SECRET'
];

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const missing = REQUIRED_GOOGLE_ENV.filter(key => !process.env[key]);
  if (missing.length > 0) {
    response.status(500).json({
      error: `Missing Vercel env: ${missing.join(', ')}`
    });
    return;
  }

  try {
    const credential = await resolveAdSenseRefreshToken({
      bearerToken: getBearerToken(request.headers || {}),
      env: process.env
    });
    const accessToken = await getAccessToken(credential.refreshToken);
    const accountName = credential.accountName || process.env.GOOGLE_ADSENSE_ACCOUNT_NAME || await getFirstAccountName(accessToken);
    const sites = await getAdSenseSites(accessToken, accountName);

    response.status(200).json({
      account: accountName,
      source: credential.source,
      sites
    });
  } catch (error) {
    response.status(500).json({
      error: error.message || 'Failed to load AdSense status'
    });
  }
}

export async function resolveAdSenseRefreshToken({
  bearerToken = '',
  env = process.env,
  fetchImpl = fetch
} = {}) {
  if (bearerToken && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.TOKEN_ENCRYPTION_KEY) {
    const user = await getSupabaseUser({
      supabaseUrl: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      bearerToken,
      fetchImpl
    });
    const account = await getConnectedAdSenseAccount({
      supabaseUrl: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      ownerId: user.id,
      fetchImpl
    });

    if (account?.refresh_token_ciphertext) {
      return {
        source: 'connected_account',
        refreshToken: decryptToken(account.refresh_token_ciphertext, env.TOKEN_ENCRYPTION_KEY),
        accountName: account.provider_account_id || '',
        ownerId: user.id
      };
    }
  }

  if (env.GOOGLE_ADSENSE_REFRESH_TOKEN) {
    return {
      source: 'env',
      refreshToken: env.GOOGLE_ADSENSE_REFRESH_TOKEN,
      accountName: env.GOOGLE_ADSENSE_ACCOUNT_NAME || '',
      ownerId: ''
    };
  }

  throw new Error('Connect Google AdSense before syncing.');
}

export async function getSupabaseUser({ supabaseUrl, serviceRoleKey, bearerToken, fetchImpl }) {
  const userResponse = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${bearerToken}`
    }
  });
  const userPayload = await userResponse.json();
  if (!userResponse.ok || !userPayload.id) {
    throw new Error(userPayload.msg || userPayload.error_description || 'Supabase session verification failed');
  }
  return userPayload;
}

async function getConnectedAdSenseAccount({ supabaseUrl, serviceRoleKey, ownerId, fetchImpl }) {
  const url = new URL(`${supabaseUrl}/rest/v1/connected_accounts`);
  url.searchParams.set('select', 'provider_account_id,refresh_token_ciphertext');
  url.searchParams.set('owner_id', `eq.${ownerId}`);
  url.searchParams.set('provider', `eq.${ADSENSE_PROVIDER}`);
  url.searchParams.set('connection_status', 'eq.connected');
  url.searchParams.set('limit', '1');

  const accountResponse = await fetchImpl(url.toString(), {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`
    }
  });
  const accountPayload = await accountResponse.json();
  if (!accountResponse.ok) {
    throw new Error(accountPayload.message || 'Failed to load connected AdSense account');
  }
  return (accountPayload || [])[0] || null;
}

async function getAccessToken(refreshToken) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADSENSE_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADSENSE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(tokenPayload.error_description || tokenPayload.error || 'Google token refresh failed');
  }
  return tokenPayload.access_token;
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

async function getAdSenseSites(accessToken, accountName) {
  const sitesResponse = await fetch(`https://adsense.googleapis.com/v2/${accountName}/sites`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  const sitesPayload = await sitesResponse.json();
  if (!sitesResponse.ok) {
    throw new Error(sitesPayload.error?.message || 'Failed to load AdSense sites');
  }

  return (sitesPayload.sites || []).map(site => ({
    name: site.name,
    domain: site.domain,
    state: site.state,
    autoAdsEnabled: Boolean(site.autoAdsEnabled)
  }));
}
