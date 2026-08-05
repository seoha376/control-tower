import { getBearerToken, mapConnectedAccountRow } from './accountStore.js';
import { getSupabaseUser } from './status.js';

export default async function handler(request, response) {
  if (!['GET', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'GET, DELETE');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const env = process.env;
    const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(key => !env[key]);
    if (missing.length) throw new Error(`Missing Vercel env: ${missing.join(', ')}`);

    const bearerToken = getBearerToken(request.headers || {});
    if (!bearerToken) throw new Error('Sign in before managing Google AdSense.');
    const user = await getSupabaseUser({
      supabaseUrl: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      bearerToken,
      fetchImpl: fetch
    });

    if (request.method === 'DELETE') {
      await deleteConnection({ supabaseUrl: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, ownerId: user.id });
      response.status(200).json({ connectionStatus: 'needs_connection' });
      return;
    }

    const account = await loadConnection({ supabaseUrl: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, ownerId: user.id });
    response.status(200).json(account ? mapConnectedAccountRow(account) : {
      provider: 'google_adsense',
      providerAccountId: '',
      connectionStatus: 'needs_connection',
      lastSyncedAt: '',
      lastError: ''
    });
  } catch (error) {
    response.status(400).json({ error: error.message || 'Failed to load AdSense connection' });
  }
}

async function loadConnection({ supabaseUrl, serviceRoleKey, ownerId }) {
  const url = new URL(`${supabaseUrl}/rest/v1/connected_accounts`);
  url.searchParams.set('select', 'provider,provider_account_id,connection_status,last_synced_at,last_error');
  url.searchParams.set('owner_id', `eq.${ownerId}`);
  url.searchParams.set('provider', 'eq.google_adsense');
  url.searchParams.set('limit', '1');
  const res = await fetch(url.toString(), {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` }
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.message || 'Failed to load AdSense connection');
  return (payload || [])[0] || null;
}

async function deleteConnection({ supabaseUrl, serviceRoleKey, ownerId }) {
  const url = new URL(`${supabaseUrl}/rest/v1/connected_accounts`);
  url.searchParams.set('owner_id', `eq.${ownerId}`);
  url.searchParams.set('provider', 'eq.google_adsense');
  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` }
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.message || 'Failed to disconnect AdSense');
  }
}
