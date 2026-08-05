import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdSenseProjectPatch,
  findMatchingAdSenseSite,
  getHostname
} from '../src/adsenseSync.js';

test('getHostname normalizes service URLs and plain domains', () => {
  assert.equal(getHostname('https://www.example.com/path'), 'www.example.com');
  assert.equal(getHostname('example.com'), 'example.com');
  assert.equal(getHostname(''), '');
});

test('findMatchingAdSenseSite matches projects by hostname or bare domain', () => {
  const sites = [
    { domain: 'example.com', state: 'READY' },
    { domain: 'blog.other.com', state: 'GETTING_READY' }
  ];

  assert.deepEqual(findMatchingAdSenseSite({ url: 'https://www.example.com' }, sites), sites[0]);
  assert.deepEqual(findMatchingAdSenseSite({ url: 'https://blog.other.com/post' }, sites), sites[1]);
  assert.equal(findMatchingAdSenseSite({ url: 'https://missing.com' }, sites), null);
});

test('createAdSenseProjectPatch maps AdSense site states to project status and next actions', () => {
  assert.deepEqual(createAdSenseProjectPatch({ state: 'READY', domain: 'example.com' }), {
    adsenseStatus: 'approved',
    nextAction: 'check_revenue',
    nextActionNote: 'AdSense READY: example.com'
  });

  assert.deepEqual(createAdSenseProjectPatch({ state: 'GETTING_READY', domain: 'example.com' }), {
    adsenseStatus: 'reviewing',
    nextAction: 'check_adsense',
    nextActionNote: 'AdSense GETTING_READY: example.com'
  });

  assert.deepEqual(createAdSenseProjectPatch({ state: 'NEEDS_ATTENTION', domain: 'example.com' }), {
    adsenseStatus: 'rejected',
    nextAction: 'check_adsense',
    nextActionNote: 'AdSense NEEDS_ATTENTION: example.com'
  });
});
