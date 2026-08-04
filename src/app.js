import { calculateSummary, getStatusLabel, normalizeProject } from './domain.js';

const STORAGE_KEY = 'control-tower-projects-v1';
const currency = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });
const sampleProjects = [
  normalizeProject({ name: 'Hot Appearance', url: 'https://example.com', githubUrl: 'https://github.com/', deployStatus: 'healthy', adsenseStatus: 'not_applied', note: '도메인 연결 후 AdSense 신청 예정' })
];

const elements = {
  list: document.querySelector('#projectList'), empty: document.querySelector('#emptyState'), template: document.querySelector('#projectTemplate'),
  dialog: document.querySelector('#projectDialog'), form: document.querySelector('#projectForm'), filter: document.querySelector('#statusFilter')
};

let projects = loadProjects();

function loadProjects() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(value) ? value.map(normalizeProject) : sampleProjects;
  } catch {
    return sampleProjects;
  }
}

function saveProjects() { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); }
function deployLabel(status) { return ({ healthy: '정상', warning: '확인 필요', down: '오류', unknown: '미확인' })[status] || '미확인'; }

function render() {
  const summary = calculateSummary(projects);
  document.querySelector('#projectCount').textContent = summary.projectCount;
  document.querySelector('#approvedCount').textContent = summary.approvedCount;
  document.querySelector('#reviewingCount').textContent = summary.reviewingCount;
  document.querySelector('#todayRevenue').textContent = currency.format(summary.todayRevenue);
  document.querySelector('#monthRevenue').textContent = currency.format(summary.monthRevenue);

  const filter = elements.filter.value;
  const visible = filter === 'all' ? projects : projects.filter(project => project.adsenseStatus === filter);
  elements.list.replaceChildren();
  elements.empty.hidden = visible.length > 0;

  visible.forEach(project => {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    card.dataset.deploy = project.deployStatus;
    card.dataset.adsense = project.adsenseStatus;
    card.querySelector('h3').textContent = project.name;
    const siteLink = card.querySelector('.site-link');
    siteLink.textContent = project.url || '사이트 주소 미등록';
    siteLink.href = project.url || '#';
    if (!project.url) siteLink.removeAttribute('target');
    card.querySelector('.note').textContent = project.note || '메모 없음';
    card.querySelector('.adsense-badge').textContent = getStatusLabel(project.adsenseStatus);
    card.querySelector('.deploy-label').textContent = deployLabel(project.deployStatus);
    card.querySelector('.today-value').textContent = currency.format(project.todayRevenue);
    card.querySelector('.month-value').textContent = currency.format(project.monthRevenue);
    const github = card.querySelector('.github-button');
    github.href = project.githubUrl || '#';
    github.classList.toggle('disabled', !project.githubUrl);
    card.querySelector('.edit-button').addEventListener('click', () => openDialog(project));
    card.querySelector('.delete-button').addEventListener('click', () => {
      if (confirm(`${project.name}을(를) 삭제하시겠습니까?`)) {
        projects = projects.filter(item => item.id !== project.id); saveProjects(); render();
      }
    });
    elements.list.append(card);
  });
}

function openDialog(project = null) {
  elements.form.reset();
  document.querySelector('#dialogTitle').textContent = project ? '서비스 수정' : '서비스 추가';
  document.querySelector('#projectId').value = project?.id || '';
  document.querySelector('#name').value = project?.name || '';
  document.querySelector('#url').value = project?.url || '';
  document.querySelector('#githubUrl').value = project?.githubUrl || '';
  document.querySelector('#deployStatus').value = project?.deployStatus || 'unknown';
  document.querySelector('#adsenseStatus').value = project?.adsenseStatus || 'not_applied';
  document.querySelector('#todayRevenueInput').value = project?.todayRevenue || 0;
  document.querySelector('#monthRevenueInput').value = project?.monthRevenue || 0;
  document.querySelector('#note').value = project?.note || '';
  elements.dialog.showModal();
}

function closeDialog() { elements.dialog.close(); }

document.querySelector('#openProjectDialog').addEventListener('click', () => openDialog());
document.querySelector('#closeDialog').addEventListener('click', closeDialog);
document.querySelector('#cancelDialog').addEventListener('click', closeDialog);
elements.filter.addEventListener('change', render);
elements.form.addEventListener('submit', event => {
  event.preventDefault();
  const id = document.querySelector('#projectId').value;
  const record = normalizeProject({
    id: id || undefined,
    name: document.querySelector('#name').value,
    url: document.querySelector('#url').value,
    githubUrl: document.querySelector('#githubUrl').value,
    deployStatus: document.querySelector('#deployStatus').value,
    adsenseStatus: document.querySelector('#adsenseStatus').value,
    todayRevenue: document.querySelector('#todayRevenueInput').value,
    monthRevenue: document.querySelector('#monthRevenueInput').value,
    note: document.querySelector('#note').value
  });
  projects = id ? projects.map(project => project.id === id ? record : project) : [record, ...projects];
  saveProjects(); closeDialog(); render();
});

render();
