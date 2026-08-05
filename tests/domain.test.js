import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOperationalInsights,
  calculateSummary,
  getStatusLabel,
  normalizeProject
} from '../src/domain.js';
import {
  parseGithubRepositoryUrl,
  suggestProjectNameFromRepository
} from '../src/githubRepository.js';

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

test('calculateOperationalInsights groups services that need operator attention', () => {
  const insights = calculateOperationalInsights([
    {
      id: 'healthy-approved',
      name: 'Healthy Approved',
      deployStatus: 'healthy',
      adsenseStatus: 'approved',
      todayRevenue: 1200,
      monthRevenue: 9000
    },
    {
      id: 'deploy-warning',
      name: 'Deploy Warning',
      deployStatus: 'warning',
      adsenseStatus: 'not_applied',
      todayRevenue: 0,
      monthRevenue: 0
    },
    {
      id: 'adsense-rejected',
      name: 'AdSense Rejected',
      deployStatus: 'healthy',
      adsenseStatus: 'rejected',
      todayRevenue: 0,
      monthRevenue: 0
    },
    {
      id: 'reviewing-site',
      name: 'Reviewing Site',
      deployStatus: 'healthy',
      adsenseStatus: 'reviewing',
      todayRevenue: 0,
      monthRevenue: 0
    },
    {
      id: 'approved-no-revenue',
      name: 'Approved No Revenue',
      deployStatus: 'healthy',
      adsenseStatus: 'approved',
      todayRevenue: 0,
      monthRevenue: 5000
    }
  ]);

  assert.deepEqual(insights.attentionServices.map(service => service.id), [
    'deploy-warning',
    'adsense-rejected'
  ]);
  assert.deepEqual(insights.reviewingServices.map(service => service.id), ['reviewing-site']);
  assert.deepEqual(insights.zeroRevenueServices.map(service => service.id), ['approved-no-revenue']);
  assert.deepEqual(insights.messages, [
    '확인 필요한 서비스가 2개 있습니다.',
    'AdSense 심사 중인 서비스가 1개 있습니다.',
    '승인된 사이트 중 오늘 또는 이번 달 수익이 없는 서비스가 1개 있습니다.'
  ]);
  assert.equal(insights.allClear, false);
});

test('calculateOperationalInsights reports all clear when no service needs action', () => {
  const insights = calculateOperationalInsights([
    {
      id: 'earning-site',
      name: 'Earning Site',
      deployStatus: 'healthy',
      adsenseStatus: 'approved',
      todayRevenue: 500,
      monthRevenue: 5000
    },
    {
      id: 'not-applied-site',
      name: 'Not Applied Site',
      deployStatus: 'unknown',
      adsenseStatus: 'not_applied',
      todayRevenue: 0,
      monthRevenue: 0
    }
  ]);

  assert.deepEqual(insights.attentionServices, []);
  assert.deepEqual(insights.reviewingServices, []);
  assert.deepEqual(insights.zeroRevenueServices, []);
  assert.deepEqual(insights.messages, ['모든 서비스가 정상입니다.']);
  assert.equal(insights.allClear, true);
});

test('parseGithubRepositoryUrl extracts owner and repo from GitHub URLs', () => {
  assert.deepEqual(parseGithubRepositoryUrl('https://github.com/seoha376/control-tower'), {
    owner: 'seoha376',
    repo: 'control-tower',
    fullName: 'seoha376/control-tower',
    normalizedUrl: 'https://github.com/seoha376/control-tower'
  });

  assert.deepEqual(parseGithubRepositoryUrl('https://github.com/seoha376/control-tower.git/tree/master'), {
    owner: 'seoha376',
    repo: 'control-tower',
    fullName: 'seoha376/control-tower',
    normalizedUrl: 'https://github.com/seoha376/control-tower'
  });
});

test('parseGithubRepositoryUrl rejects non-repository URLs', () => {
  assert.equal(parseGithubRepositoryUrl('https://example.com/seoha376/control-tower'), null);
  assert.equal(parseGithubRepositoryUrl('https://github.com/seoha376'), null);
  assert.equal(parseGithubRepositoryUrl('not a url'), null);
});

test('suggestProjectNameFromRepository turns repo slugs into readable names', () => {
  assert.equal(suggestProjectNameFromRepository('hot-appearance'), 'Hot Appearance');
  assert.equal(suggestProjectNameFromRepository('ai_archive'), 'AI Archive');
  assert.equal(suggestProjectNameFromRepository('control.tower'), 'Control Tower');
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
