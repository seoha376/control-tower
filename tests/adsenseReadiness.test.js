import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('public pages required for AdSense review exist', () => {
  for (const path of ['about.html', 'privacy.html', 'contact.html', 'ads.txt']) {
    assert.equal(existsSync(new URL(path, root)), true, `${path} should exist`);
  }
});

test('index exposes AdSense ownership and public navigation', () => {
  const html = read('index.html');

  assert.match(html, /google-adsense-account/);
  assert.match(html, /ca-pub-6882848839362046/);
  assert.match(html, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
  assert.match(html, /href="\.\/about\.html"/);
  assert.match(html, /href="\.\/privacy\.html"/);
  assert.match(html, /href="\.\/contact\.html"/);
});

test('index includes enough public product content before login', () => {
  const html = read('index.html');

  assert.match(html, /Control Tower 사용 가이드/);
  assert.match(html, /AdSense 운영 대시보드/);
  assert.match(html, /승인 상태/);
  assert.match(html, /수익 메모/);
});

test('ads.txt declares the publisher account accurately', () => {
  assert.equal(
    read('ads.txt').trim(),
    'google.com, pub-6882848839362046, DIRECT, f08c47fec0942fa0'
  );
});
