const AUTH_PROVIDERS = [
  { provider: 'github', label: 'Sign in with GitHub' }
];

export function getAuthProviders() {
  return AUTH_PROVIDERS.map(provider => ({ ...provider }));
}

export function getOAuthRedirectTo(config = {}, currentHref = '') {
  const configuredRedirect = String(config.redirectTo || '').trim();
  if (configuredRedirect) return configuredRedirect;
  return String(currentHref || '').split('#')[0];
}

export function createAuthViewState({ configured, user, authorized } = {}) {
  if (!configured) {
    return {
      mode: 'setup',
      canEdit: false,
      title: 'Supabase setup required',
      message: 'Add your Supabase URL and anon key in src/config.js to enable login and data storage.'
    };
  }

  if (!user) {
    return {
      mode: 'signed-out',
      canEdit: false,
      title: 'Sign in required',
      message: 'Sign in with GitHub. Each user only sees records linked to their Supabase user id.'
    };
  }

  if (!authorized) {
    return {
      mode: 'blocked',
      canEdit: false,
      title: 'Access unavailable',
      message: 'This account could not be verified for Control Tower.'
    };
  }

  return {
    mode: 'signed-in',
    canEdit: true,
    title: user.email || 'Signed in',
    message: 'Connected to Supabase. Your dashboard data is scoped to your own account.'
  };
}
