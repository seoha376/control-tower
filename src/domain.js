const STATUS_LABELS = {
  not_applied: '신청 전',
  reviewing: '심사 중',
  approved: '승인',
  rejected: '심사 실패'
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? '알 수 없음';
}

export function normalizeProject(input = {}) {
  return {
    id: input.id || globalThis.crypto?.randomUUID?.() || `project-${Date.now()}-${Math.random()}`,
    name: String(input.name || '새 서비스').trim(),
    url: String(input.url || '').trim(),
    githubUrl: String(input.githubUrl || '').trim(),
    deployStatus: input.deployStatus || 'unknown',
    adsenseStatus: input.adsenseStatus || 'not_applied',
    todayRevenue: Number(input.todayRevenue) || 0,
    monthRevenue: Number(input.monthRevenue) || 0,
    note: String(input.note || '').trim(),
    updatedAt: input.updatedAt || new Date().toISOString()
  };
}

export function calculateSummary(projects = []) {
  return projects.reduce((summary, project) => {
    summary.projectCount += 1;
    summary.todayRevenue += Number(project.todayRevenue) || 0;
    summary.monthRevenue += Number(project.monthRevenue) || 0;
    if (project.adsenseStatus === 'approved') summary.approvedCount += 1;
    if (project.adsenseStatus === 'reviewing') summary.reviewingCount += 1;
    if (project.adsenseStatus === 'rejected') summary.rejectedCount += 1;
    return summary;
  }, {
    projectCount: 0,
    approvedCount: 0,
    reviewingCount: 0,
    rejectedCount: 0,
    todayRevenue: 0,
    monthRevenue: 0
  });
}
