const ADSENSE_STATE_PATCHES = {
  REQUIRES_REVIEW: {
    adsenseStatus: 'reviewing',
    nextAction: 'check_adsense'
  },
  GETTING_READY: {
    adsenseStatus: 'reviewing',
    nextAction: 'check_adsense'
  },
  READY: {
    adsenseStatus: 'approved',
    nextAction: 'check_revenue'
  },
  NEEDS_ATTENTION: {
    adsenseStatus: 'rejected',
    nextAction: 'check_adsense'
  }
};

export function getHostname(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase();
  } catch {
    return '';
  }
}

function withoutWww(hostname) {
  return hostname.replace(/^www\./, '');
}

export function findMatchingAdSenseSite(project, sites = []) {
  const projectHost = getHostname(project?.url);
  if (!projectHost) return null;
  const projectDomain = withoutWww(projectHost);

  return sites.find(site => {
    const siteHost = getHostname(site.domain);
    if (!siteHost) return false;
    const siteDomain = withoutWww(siteHost);
    return siteHost === projectHost || siteDomain === projectDomain;
  }) || null;
}

export function createAdSenseProjectPatch(site = {}) {
  const state = String(site.state || 'STATE_UNSPECIFIED').toUpperCase();
  const patch = ADSENSE_STATE_PATCHES[state] || {
    adsenseStatus: 'not_applied',
    nextAction: 'check_adsense'
  };

  return {
    ...patch,
    nextActionNote: `AdSense ${state}: ${site.domain || 'domain unknown'}`
  };
}
