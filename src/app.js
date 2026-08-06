import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { createAuthViewState, getAuthProviders, getOAuthRedirectTo } from './authState.js';
import {
  createAdSenseProjectPatch,
  findMatchingAdSenseSite
} from './adsenseSync.js';
import {
  calculateOperationalInsights,
  calculateSummary,
  getNextActionLabel,
  getStatusLabel,
  normalizeProject
} from './domain.js';
import {
  parseGithubRepositoryUrl,
  suggestProjectNameFromRepository
} from './githubRepository.js';
import { CONTROL_TOWER_CONFIG } from './config.js';
import {
  createSupabaseProjectStore,
  isAuthorizedUser,
  isSupabaseConfigured
} from './projectStore.js';

const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0
});

const elements = {
  authPanel: document.querySelector('#authPanel'),
  authTitle: document.querySelector('#authTitle'),
  authMessage: document.querySelector('#authMessage'),
  loginGithub: document.querySelector('#loginGithub'),
  logoutButton: document.querySelector('#logoutButton'),
  syncStatus: document.querySelector('#syncStatus'),
  adsenseConnectionBadge: document.querySelector('#adsenseConnectionBadge'),
  adsenseConnectionMessage: document.querySelector('#adsenseConnectionMessage'),
  connectAdsenseButton: document.querySelector('#connectAdsenseButton'),
  disconnectAdsenseButton: document.querySelector('#disconnectAdsenseButton'),
  addButton: document.querySelector('#openProjectDialog'),
  syncAdsenseButton: document.querySelector('#syncAdsenseButton'),
  list: document.querySelector('#projectList'),
  empty: document.querySelector('#emptyState'),
  emptyTitle: document.querySelector('#emptyTitle'),
  emptyMessage: document.querySelector('#emptyMessage'),
  template: document.querySelector('#projectTemplate'),
  dialog: document.querySelector('#projectDialog'),
  form: document.querySelector('#projectForm'),
  nameInput: document.querySelector('#name'),
  githubUrlInput: document.querySelector('#githubUrl'),
  filter: document.querySelector('#statusFilter'),
  operationalStatusBadge: document.querySelector('#operationalStatusBadge'),
  operationalMessages: document.querySelector('#operationalMessages'),
  attentionServices: document.querySelector('#attentionServices'),
  reviewingServices: document.querySelector('#reviewingServices'),
  zeroRevenueServices: document.querySelector('#zeroRevenueServices')
};

let supabase = null;
let store = null;
let projects = [];
let canEdit = false;
let currentSession = null;

function deployLabel(status) {
  return ({
    healthy: '정상',
    warning: '확인 필요',
    down: '오류',
    unknown: '미확인'
  })[status] || '미확인';
}

function setSyncStatus(message, tone = 'neutral') {
  elements.syncStatus.textContent = message;
  elements.syncStatus.dataset.tone = tone;
}

function applyAuthState(viewState) {
  canEdit = viewState.canEdit;
  const [primaryProvider] = getAuthProviders();
  elements.authPanel.dataset.mode = viewState.mode;
  elements.authTitle.textContent = viewState.title;
  elements.authMessage.textContent = viewState.message;
  elements.loginGithub.hidden = viewState.mode !== 'signed-out';
  elements.loginGithub.textContent = primaryProvider.label;
  elements.loginGithub.dataset.provider = primaryProvider.provider;
  elements.logoutButton.hidden = viewState.mode !== 'signed-in' && viewState.mode !== 'blocked';
  elements.addButton.disabled = !canEdit;
  elements.syncAdsenseButton.disabled = !canEdit;
  elements.connectAdsenseButton.disabled = !canEdit;
  elements.disconnectAdsenseButton.disabled = !canEdit;
}

function getAuthHeaders() {
  return currentSession?.access_token
    ? { authorization: `Bearer ${currentSession.access_token}` }
    : {};
}

async function signIn(provider) {
  if (!supabase) return;
  const redirectTo = getOAuthRedirectTo(CONTROL_TOWER_CONFIG, window.location.href);
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo }
  });
  if (error) setSyncStatus(error.message, 'error');
}

async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

async function refreshProjects() {
  if (!store) {
    projects = [];
    render();
    return;
  }

  try {
    setSyncStatus('Supabase에서 데이터를 불러오는 중입니다...');
    projects = await store.list();
    setSyncStatus(`동기화 완료: ${projects.length}개 서비스`, 'success');
  } catch (error) {
    setSyncStatus(error.message || 'Supabase 동기화에 실패했습니다.', 'error');
    projects = [];
  }
  render();
}

async function syncAdSenseStatuses() {
  if (!canEdit || !store) return;

  elements.syncAdsenseButton.disabled = true;
  setSyncStatus('AdSense 현황을 불러오는 중입니다...');

  try {
    const response = await fetch('/api/adsense/status', {
      headers: getAuthHeaders()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'AdSense 현황을 불러오지 못했습니다.');
    }

    const sites = payload.sites || [];
    const updates = projects
      .map(project => ({
        project,
        site: findMatchingAdSenseSite(project, sites)
      }))
      .filter(match => match.site);

    for (const { project, site } of updates) {
      await store.save(normalizeProject({
        ...project,
        ...createAdSenseProjectPatch(site)
      }));
    }

    setSyncStatus(`AdSense 동기화 완료: ${updates.length}개 서비스`, 'success');
    await refreshProjects();
  } catch (error) {
    setSyncStatus(error.message || 'AdSense 동기화에 실패했습니다.', 'error');
  } finally {
    elements.syncAdsenseButton.disabled = !canEdit;
  }
}

function renderAdSenseConnection(connection) {
  const status = connection?.connectionStatus || 'needs_connection';
  const connected = status === 'connected';
  elements.adsenseConnectionBadge.textContent = connected ? '연결됨' : '연결 필요';
  elements.adsenseConnectionBadge.dataset.tone = connected ? 'success' : 'warning';
  elements.adsenseConnectionMessage.textContent = connected
    ? `연결된 계정: ${connection.providerAccountId || 'Google AdSense'}`
    : 'AdSense 계정을 연결하면 사이트 승인 상태를 로그인한 계정 기준으로 동기화할 수 있습니다.';
  elements.disconnectAdsenseButton.disabled = !canEdit || !connected;
}

async function refreshAdSenseConnection() {
  if (!canEdit) {
    renderAdSenseConnection(null);
    return;
  }

  try {
    const response = await fetch('/api/adsense/connection', {
      headers: getAuthHeaders()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'AdSense connection status unavailable.');
    renderAdSenseConnection(payload);
  } catch (error) {
    elements.adsenseConnectionBadge.textContent = '연결 확인 필요';
    elements.adsenseConnectionBadge.dataset.tone = 'warning';
    elements.adsenseConnectionMessage.textContent = error.message || 'AdSense 연결 상태를 확인하지 못했습니다.';
  }
}

async function connectAdSense() {
  if (!canEdit) return;

  try {
    const returnTo = encodeURIComponent(window.location.href.split('#')[0]);
    const response = await fetch(`/api/adsense/connect/start?returnTo=${returnTo}`, {
      headers: getAuthHeaders()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not start Google AdSense connection.');
    window.location.href = payload.url;
  } catch (error) {
    setSyncStatus(error.message || 'AdSense connection failed.', 'error');
  }
}

async function disconnectAdSense() {
  if (!canEdit || !confirm('Disconnect Google AdSense from this Control Tower account?')) return;

  try {
    const response = await fetch('/api/adsense/connection', {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not disconnect Google AdSense.');
    renderAdSenseConnection(payload);
  } catch (error) {
    setSyncStatus(error.message || 'AdSense disconnect failed.', 'error');
  }
}

async function handleSession(session) {
  currentSession = session || null;
  const user = session?.user || null;
  const authorized = isAuthorizedUser(user, CONTROL_TOWER_CONFIG);
  const viewState = createAuthViewState({
    configured: true,
    user,
    authorized
  });
  applyAuthState(viewState);

  if (!user) {
    store = null;
    renderAdSenseConnection(null);
    setSyncStatus('로그인 후 데이터를 불러옵니다.');
    await refreshProjects();
    return;
  }

  if (!authorized) {
    store = null;
    setSyncStatus('허용된 소유자 이메일로 다시 로그인하세요.', 'error');
    await refreshProjects();
    return;
  }

  store = createSupabaseProjectStore(supabase, user.id);
  await refreshAdSenseConnection();
  await refreshProjects();
}

function renderSummary() {
  const summary = calculateSummary(projects);
  document.querySelector('#projectCount').textContent = summary.projectCount;
  document.querySelector('#approvedCount').textContent = summary.approvedCount;
  document.querySelector('#reviewingCount').textContent = summary.reviewingCount;
  document.querySelector('#todayRevenue').textContent = currency.format(summary.todayRevenue);
  document.querySelector('#monthRevenue').textContent = currency.format(summary.monthRevenue);
}

function getAttentionReason(project) {
  if (project.deployStatus === 'down') return '배포 오류';
  if (project.deployStatus === 'warning') return '배포 확인 필요';
  if (project.adsenseStatus === 'rejected') return 'AdSense 심사 실패';
  return '확인 필요';
}

function formatNextActionMeta(project) {
  const parts = [];
  if (project.nextActionDueDate) parts.push(`기한 ${project.nextActionDueDate}`);
  if (project.nextActionNote) parts.push(project.nextActionNote);
  return parts.join(' · ');
}

function renderInsightList(list, services, getMeta) {
  list.replaceChildren();

  if (services.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'insight-empty';
    empty.textContent = '대상 없음';
    list.append(empty);
    return;
  }

  services.forEach(service => {
    const item = document.createElement('li');
    const name = document.createElement('strong');
    const meta = document.createElement('span');
    name.textContent = service.name || '이름 없는 서비스';
    meta.textContent = getMeta(service);
    item.append(name, meta);
    list.append(item);
  });
}

function renderOperationalInsights() {
  const insights = calculateOperationalInsights(projects);
  elements.operationalStatusBadge.textContent = insights.allClear ? '정상' : '확인 필요';
  elements.operationalStatusBadge.dataset.tone = insights.allClear ? 'success' : 'warning';
  elements.operationalMessages.replaceChildren(...insights.messages.map(message => {
    const item = document.createElement('li');
    item.textContent = message;
    return item;
  }));
  renderInsightList(elements.attentionServices, insights.attentionServices, getAttentionReason);
  renderInsightList(elements.reviewingServices, insights.reviewingServices, () => '심사 진행 중');
  renderInsightList(elements.zeroRevenueServices, insights.zeroRevenueServices, service => {
    const hasTodayRevenue = (Number(service.todayRevenue) || 0) > 0;
    const hasMonthRevenue = (Number(service.monthRevenue) || 0) > 0;
    if (!hasTodayRevenue && !hasMonthRevenue) return '오늘/이번 달 수익 0원';
    if (!hasTodayRevenue) return '오늘 수익 0원';
    if (!hasMonthRevenue) return '이번 달 수익 0원';
    return '수익 확인 필요';
  });
}

function renderEmptyState(visibleCount) {
  const isEmpty = visibleCount === 0;
  elements.empty.hidden = !isEmpty;
  if (!isEmpty) return;

  if (!canEdit) {
    elements.emptyTitle.textContent = '표시할 서비스가 없습니다.';
    elements.emptyMessage.textContent = 'Supabase 설정과 로그인이 완료되면 서비스 목록을 관리할 수 있습니다.';
    return;
  }

  elements.emptyTitle.textContent = '등록된 서비스가 없습니다.';
  elements.emptyMessage.textContent = '첫 서비스를 추가하면 배포, AdSense 상태, 수익을 한 곳에서 추적합니다.';
}

function render() {
  renderSummary();
  renderOperationalInsights();

  const filter = elements.filter.value;
  const visible = filter === 'all' ? projects : projects.filter(project => project.adsenseStatus === filter);
  elements.list.replaceChildren();
  renderEmptyState(visible.length);

  visible.forEach(project => {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    card.dataset.deploy = project.deployStatus;
    card.dataset.adsense = project.adsenseStatus;
    card.dataset.nextAction = project.nextAction || 'none';
    card.querySelector('h3').textContent = project.name;

    const siteLink = card.querySelector('.site-link');
    siteLink.textContent = project.url || '사이트 주소 미등록';
    siteLink.href = project.url || '#';
    if (!project.url) siteLink.removeAttribute('target');

    card.querySelector('.note').textContent = project.note || '메모 없음';
    card.querySelector('.next-action-label').textContent = getNextActionLabel(project.nextAction);
    card.querySelector('.next-action-meta').textContent = formatNextActionMeta(project);
    card.querySelector('.adsense-badge').textContent = getStatusLabel(project.adsenseStatus);
    card.querySelector('.deploy-label').textContent = deployLabel(project.deployStatus);
    card.querySelector('.today-value').textContent = currency.format(project.todayRevenue);
    card.querySelector('.month-value').textContent = currency.format(project.monthRevenue);

    const github = card.querySelector('.github-button');
    github.href = project.githubUrl || '#';
    github.classList.toggle('disabled', !project.githubUrl);

    card.querySelector('.edit-button').disabled = !canEdit;
    card.querySelector('.delete-button').disabled = !canEdit;
    card.querySelector('.edit-button').addEventListener('click', () => openDialog(project));
    card.querySelector('.delete-button').addEventListener('click', async () => {
      if (!canEdit || !confirm(`${project.name}을 삭제하시겠습니까?`)) return;
      try {
        await store.remove(project.id);
        await refreshProjects();
      } catch (error) {
        setSyncStatus(error.message || '삭제에 실패했습니다.', 'error');
      }
    });

    elements.list.append(card);
  });
}

function openDialog(project = null) {
  if (!canEdit) return;
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
  document.querySelector('#nextAction').value = project?.nextAction || 'none';
  document.querySelector('#nextActionDueDate').value = project?.nextActionDueDate || '';
  document.querySelector('#nextActionNote').value = project?.nextActionNote || '';
  document.querySelector('#note').value = project?.note || '';
  elements.dialog.showModal();
}

function closeDialog() {
  elements.dialog.close();
}

function applyGithubUrlSuggestion() {
  const githubRepository = parseGithubRepositoryUrl(elements.githubUrlInput.value);
  elements.githubUrlInput.setCustomValidity('');

  if (!elements.githubUrlInput.value.trim() || !githubRepository) return githubRepository;
  if (!elements.nameInput.value.trim()) {
    elements.nameInput.value = suggestProjectNameFromRepository(githubRepository.repo);
  }
  return githubRepository;
}

async function saveForm(event) {
  event.preventDefault();
  if (!canEdit || !store) return;

  const githubUrl = elements.githubUrlInput.value.trim();
  const githubRepository = applyGithubUrlSuggestion();
  if (githubUrl && !githubRepository) {
    elements.githubUrlInput.setCustomValidity('GitHub 저장소 주소를 입력하세요. 예: https://github.com/owner/repo');
    elements.githubUrlInput.reportValidity();
    setSyncStatus('GitHub 저장소 주소를 확인해주세요.', 'error');
    return;
  }

  const id = document.querySelector('#projectId').value;
  const record = normalizeProject({
    id: id || undefined,
    name: elements.nameInput.value,
    url: document.querySelector('#url').value,
    githubUrl: githubRepository?.normalizedUrl || githubUrl,
    deployStatus: document.querySelector('#deployStatus').value,
    adsenseStatus: document.querySelector('#adsenseStatus').value,
    todayRevenue: document.querySelector('#todayRevenueInput').value,
    monthRevenue: document.querySelector('#monthRevenueInput').value,
    nextAction: document.querySelector('#nextAction').value,
    nextActionDueDate: document.querySelector('#nextActionDueDate').value,
    nextActionNote: document.querySelector('#nextActionNote').value,
    note: document.querySelector('#note').value
  });

  try {
    await store.save(record);
    closeDialog();
    await refreshProjects();
  } catch (error) {
    setSyncStatus(error.message || '저장에 실패했습니다.', 'error');
  }
}

async function init() {
  const configured = isSupabaseConfigured(CONTROL_TOWER_CONFIG);
  if (!configured) {
    applyAuthState(createAuthViewState({ configured: false }));
    setSyncStatus('Supabase 설정 대기 중');
    render();
    return;
  }

  supabase = createClient(CONTROL_TOWER_CONFIG.supabaseUrl, CONTROL_TOWER_CONFIG.supabaseAnonKey);
  supabase.auth.onAuthStateChange((_event, session) => {
    void handleSession(session);
  });

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    setSyncStatus(error.message, 'error');
    return;
  }
  await handleSession(data.session);
}

elements.addButton.addEventListener('click', () => openDialog());
elements.loginGithub.addEventListener('click', () => signIn(elements.loginGithub.dataset.provider || 'github'));
elements.logoutButton.addEventListener('click', signOut);
elements.syncAdsenseButton.addEventListener('click', syncAdSenseStatuses);
elements.connectAdsenseButton.addEventListener('click', connectAdSense);
elements.disconnectAdsenseButton.addEventListener('click', disconnectAdSense);
document.querySelector('#closeDialog').addEventListener('click', closeDialog);
document.querySelector('#cancelDialog').addEventListener('click', closeDialog);
elements.githubUrlInput.addEventListener('input', applyGithubUrlSuggestion);
elements.githubUrlInput.addEventListener('blur', applyGithubUrlSuggestion);
elements.filter.addEventListener('change', render);
elements.form.addEventListener('submit', saveForm);

void init();
