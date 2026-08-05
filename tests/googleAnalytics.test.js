import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isGoogleAnalyticsMeasurementId,
  loadGoogleAnalytics
} from '../src/googleAnalytics.js';

test('isGoogleAnalyticsMeasurementId accepts GA4 measurement IDs only', () => {
  assert.equal(isGoogleAnalyticsMeasurementId('G-ABC1234567'), true);
  assert.equal(isGoogleAnalyticsMeasurementId(' G-ABC1234567 '), true);
  assert.equal(isGoogleAnalyticsMeasurementId('UA-123456-1'), false);
  assert.equal(isGoogleAnalyticsMeasurementId(''), false);
});

test('loadGoogleAnalytics skips loading when the measurement ID is missing', () => {
  const documentRef = createDocumentRef();

  assert.equal(loadGoogleAnalytics({ googleAnalyticsMeasurementId: '' }, {
    documentRef,
    windowRef: {}
  }), false);
  assert.equal(documentRef.scripts.length, 0);
});

test('loadGoogleAnalytics injects gtag once for a valid measurement ID', () => {
  const documentRef = createDocumentRef();
  const windowRef = {};
  const config = { googleAnalyticsMeasurementId: 'G-ABC1234567' };

  assert.equal(loadGoogleAnalytics(config, { documentRef, windowRef }), true);
  assert.equal(loadGoogleAnalytics(config, { documentRef, windowRef }), true);

  assert.equal(documentRef.scripts.length, 1);
  assert.equal(
    documentRef.scripts[0].src,
    'https://www.googletagmanager.com/gtag/js?id=G-ABC1234567'
  );
  assert.equal(windowRef.dataLayer.length, 4);
});

function createDocumentRef() {
  const scripts = [];
  return {
    scripts,
    head: {
      append(script) {
        scripts.push(script);
      }
    },
    createElement(tagName) {
      assert.equal(tagName, 'script');
      return {};
    },
    querySelector(selector) {
      return scripts.find(script => selector === `script[src="${script.src}"]`) || null;
    }
  };
}
