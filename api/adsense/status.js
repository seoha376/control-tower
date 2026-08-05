const REQUIRED_ENV = [
  'GOOGLE_ADSENSE_CLIENT_ID',
  'GOOGLE_ADSENSE_CLIENT_SECRET',
  'GOOGLE_ADSENSE_REFRESH_TOKEN'
];

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const missing = REQUIRED_ENV.filter(key => !process.env[key]);
  if (missing.length > 0) {
    response.status(500).json({
      error: `Missing Vercel env: ${missing.join(', ')}`
    });
    return;
  }

  try {
    const accessToken = await getAccessToken();
    const accountName = process.env.GOOGLE_ADSENSE_ACCOUNT_NAME || await getFirstAccountName(accessToken);
    const sites = await getAdSenseSites(accessToken, accountName);

    response.status(200).json({
      account: accountName,
      sites
    });
  } catch (error) {
    response.status(500).json({
      error: error.message || 'Failed to load AdSense status'
    });
  }
}

async function getAccessToken() {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADSENSE_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADSENSE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_ADSENSE_REFRESH_TOKEN,
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
