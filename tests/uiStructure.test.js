import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('AdSense connection controls live with website operations after the dashboard summary', () => {
  const html = read('index.html');

  assert.ok(html.indexOf('id="projects"') < html.indexOf('adsense-connection-panel'));
  assert.ok(html.indexOf('summary-grid') < html.indexOf('id="projects"'));
});

test('summary cards show reviewing before approved to match the AdSense workflow', () => {
  const html = read('index.html');

  assert.ok(html.indexOf('id="reviewingCount"') < html.indexOf('id="approvedCount"'));
});

test('AdSense sync is presented as a prominent manual refresh action', () => {
  const html = read('index.html');

  assert.match(html, /id="syncAdsenseButton" class="primary-button sync-adsense-button"/);
  assert.match(html, /id="adsenseSyncHint"/);
});

test('signed-in account work is grouped behind the topbar profile menu', () => {
  const html = read('index.html');

  assert.match(html, /class="topbar-actions"/);
  assert.match(html, /id="profileMenu"/);
  assert.match(html, /id="profileAvatar"/);
  assert.match(html, /id="profileProjectCount"/);
  assert.match(html, /id="profileAdsenseStatus"/);
  assert.match(html, /id="profileLogoutButton"/);
});

test('public guide opens from navigation without occupying the main dashboard flow', () => {
  const html = read('index.html');

  assert.match(html, /id="openGuideButton"/);
  assert.match(html, /<dialog id="guideDialog"/);
  assert.equal(/<section class="panel public-guide"/.test(html), false);
});
