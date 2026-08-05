const AUTH_PROVIDERS = [
  { provider: 'github', label: 'GitHub로 로그인' }
];

export function getAuthProviders() {
  return AUTH_PROVIDERS.map(provider => ({ ...provider }));
}

export function getOAuthRedirectTo(config = {}, currentHref = '') {
  const configuredRedirect = String(config.redirectTo || '').trim();
  if (configuredRedirect) return configuredRedirect;
  return String(currentHref || '').split('#')[0];
}

export function createAuthViewState({ configured, ownerConfigured = true, user, authorized } = {}) {
  if (!configured) {
    return {
      mode: 'setup',
      canEdit: false,
      title: 'Supabase 연결 필요',
      message: 'src/config.js에 Supabase URL과 anon key를 입력하면 로그인과 DB 저장을 사용할 수 있습니다.'
    };
  }

  if (!ownerConfigured) {
    return {
      mode: 'setup',
      canEdit: false,
      title: '소유자 이메일 설정 필요',
      message: '개인용 Control Tower로 잠그려면 src/config.js의 allowedEmail에 내 로그인 이메일을 입력하세요.'
    };
  }

  if (!user) {
    return {
      mode: 'signed-out',
      canEdit: false,
      title: '로그인이 필요합니다',
      message: 'GitHub 계정으로 로그인하면 내 운영 데이터가 Supabase에 저장됩니다.'
    };
  }

  if (!authorized) {
    return {
      mode: 'blocked',
      canEdit: false,
      title: '접근 권한 없음',
      message: '이 계정은 Control Tower 소유자 이메일과 일치하지 않습니다.'
    };
  }

  return {
    mode: 'signed-in',
    canEdit: true,
    title: user.email || '로그인됨',
    message: 'Supabase에 연결되어 여러 기기에서 같은 데이터를 사용합니다.'
  };
}
