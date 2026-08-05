import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthViewState, getAuthProviders, getOAuthRedirectTo } from '../src/authState.js';

test('createAuthViewState asks for Supabase setup before login when config is missing', () => {
  assert.deepEqual(createAuthViewState({ configured: false }), {
    mode: 'setup',
    canEdit: false,
    title: 'Supabase 연결 필요',
    message: 'src/config.js에 Supabase URL과 anon key를 입력하면 로그인과 DB 저장을 사용할 수 있습니다.'
  });
});

test('createAuthViewState asks for owner email setup before showing login actions', () => {
  assert.deepEqual(createAuthViewState({ configured: true, ownerConfigured: false }), {
    mode: 'setup',
    canEdit: false,
    title: '소유자 이메일 설정 필요',
    message: '개인용 Control Tower로 잠그려면 src/config.js의 allowedEmail에 내 로그인 이메일을 입력하세요.'
  });
});

test('createAuthViewState shows login actions when Supabase is configured without a session', () => {
  assert.deepEqual(createAuthViewState({ configured: true, user: null }), {
    mode: 'signed-out',
    canEdit: false,
    title: '로그인이 필요합니다',
    message: 'GitHub 계정으로 로그인하면 내 운영 데이터가 Supabase에 저장됩니다.'
  });
});

test('getAuthProviders keeps personal Control Tower on GitHub login only', () => {
  assert.deepEqual(getAuthProviders(), [
    { provider: 'github', label: 'GitHub로 로그인' }
  ]);
});

test('getOAuthRedirectTo prefers the configured Vercel URL without trailing slash drift', () => {
  assert.equal(
    getOAuthRedirectTo(
      { redirectTo: 'https://control-tower-wheat.vercel.app/' },
      'http://localhost:4173/#access_token=old'
    ),
    'https://control-tower-wheat.vercel.app/'
  );
});

test('getOAuthRedirectTo falls back to the current page without hash data', () => {
  assert.equal(
    getOAuthRedirectTo({}, 'http://localhost:4173/#access_token=old'),
    'http://localhost:4173/'
  );
});

test('createAuthViewState allows editing for the configured owner', () => {
  assert.deepEqual(createAuthViewState({
    configured: true,
    user: { email: 'owner@example.com' },
    authorized: true
  }), {
    mode: 'signed-in',
    canEdit: true,
    title: 'owner@example.com',
    message: 'Supabase에 연결되어 여러 기기에서 같은 데이터를 사용합니다.'
  });
});

test('createAuthViewState blocks users outside the owner allowlist', () => {
  assert.deepEqual(createAuthViewState({
    configured: true,
    user: { email: 'other@example.com' },
    authorized: false
  }), {
    mode: 'blocked',
    canEdit: false,
    title: '접근 권한 없음',
    message: '이 계정은 Control Tower 소유자 이메일과 일치하지 않습니다.'
  });
});
