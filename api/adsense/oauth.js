export const ADSENSE_SCOPE = 'https://www.googleapis.com/auth/adsense.readonly';

export function buildGoogleAdSenseAuthUrl({
  clientId,
  redirectUri,
  state,
  scope = ADSENSE_SCOPE
} = {}) {
  if (!clientId) throw new Error('clientId is required');
  if (!redirectUri) throw new Error('redirectUri is required');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  if (state) url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeAuthorizationCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
  fetchImpl = fetch
} = {}) {
  if (!code) throw new Error('code is required');
  if (!clientId) throw new Error('clientId is required');
  if (!clientSecret) throw new Error('clientSecret is required');
  if (!redirectUri) throw new Error('redirectUri is required');

  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Google authorization code exchange failed');
  }

  return {
    accessToken: payload.access_token || '',
    refreshToken: payload.refresh_token || '',
    expiresIn: Number(payload.expires_in) || 0
  };
}
