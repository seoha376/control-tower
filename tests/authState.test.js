import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthViewState, getAuthProviders, getOAuthRedirectTo } from '../src/authState.js';

test('createAuthViewState asks for Supabase setup before login when config is missing', () => {
  assert.deepEqual(createAuthViewState({ configured: false }), {
    mode: 'setup',
    canEdit: false,
    title: 'Supabase setup required',
    message: 'Add your Supabase URL and anon key in src/config.js to enable login and data storage.'
  });
});

test('createAuthViewState does not require owner email setup for multi-user login', () => {
  const viewState = createAuthViewState({
    configured: true,
    ownerConfigured: false,
    user: null
  });

  assert.equal(viewState.mode, 'signed-out');
  assert.equal(viewState.canEdit, false);
});

test('createAuthViewState shows login actions when Supabase is configured without a session', () => {
  assert.deepEqual(createAuthViewState({ configured: true, user: null }), {
    mode: 'signed-out',
    canEdit: false,
    title: 'Sign in required',
    message: 'Sign in with GitHub. Each user only sees records linked to their Supabase user id.'
  });
});

test('getAuthProviders uses GitHub login', () => {
  assert.deepEqual(getAuthProviders(), [
    { provider: 'github', label: 'Sign in with GitHub' }
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

test('createAuthViewState allows editing for any verified signed-in user', () => {
  assert.deepEqual(createAuthViewState({
    configured: true,
    user: { email: 'other@example.com' },
    authorized: true
  }), {
    mode: 'signed-in',
    canEdit: true,
    title: 'other@example.com',
    message: 'Connected to Supabase. Your dashboard data is scoped to your own account.'
  });
});

test('createAuthViewState blocks users that fail verification', () => {
  assert.deepEqual(createAuthViewState({
    configured: true,
    user: { email: 'other@example.com' },
    authorized: false
  }), {
    mode: 'blocked',
    canEdit: false,
    title: 'Access unavailable',
    message: 'This account could not be verified for Control Tower.'
  });
});
