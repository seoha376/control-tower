import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSummary, getStatusLabel, normalizeProject } from '../src/domain.js';

test('calculateSummary totals revenue and status counts', () => {
  const summary = calculateSummary([
    { adsenseStatus: 'approved', todayRevenue: 3.5, monthRevenue: 50 },
    { adsenseStatus: 'reviewing', todayRevenue: 0, monthRevenue: 0 },
    { adsenseStatus: 'rejected', todayRevenue: 1.25, monthRevenue: 7 }
  ]);

  assert.deepEqual(summary, {
    projectCount: 3,
    approvedCount: 1,
    reviewingCount: 1,
    rejectedCount: 1,
    todayRevenue: 4.75,
    monthRevenue: 57
  });
});

test('normalizeProject supplies safe defaults and numeric revenue', () => {
  const project = normalizeProject({ name: 'Hot Appearance', todayRevenue: '2.4' });

  assert.equal(project.name, 'Hot Appearance');
  assert.equal(project.adsenseStatus, 'not_applied');
  assert.equal(project.deployStatus, 'unknown');
  assert.equal(project.todayRevenue, 2.4);
  assert.equal(project.monthRevenue, 0);
  assert.ok(project.id);
});

test('getStatusLabel returns Korean labels', () => {
  assert.equal(getStatusLabel('approved'), '승인');
  assert.equal(getStatusLabel('reviewing'), '심사 중');
  assert.equal(getStatusLabel('rejected'), '심사 실패');
  assert.equal(getStatusLabel('not_applied'), '신청 전');
});
