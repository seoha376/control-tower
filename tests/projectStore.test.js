import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSupabaseProjectStore,
  fromProjectRow,
  hasOwnerEmailConfigured,
  isAuthorizedUser,
  isSupabaseConfigured,
  toProjectRow
} from '../src/projectStore.js';

test('isSupabaseConfigured rejects missing and placeholder settings', () => {
  assert.equal(isSupabaseConfigured({}), false);
  assert.equal(isSupabaseConfigured({
    supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
    supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY'
  }), false);
  assert.equal(isSupabaseConfigured({
    supabaseUrl: 'https://imy-control.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example'
  }), true);
});

test('isAuthorizedUser allows any signed-in user in multi-user mode', () => {
  assert.equal(isAuthorizedUser({ id: 'user-1', email: 'owner@example.com' }, {}), true);
  assert.equal(isAuthorizedUser({ id: 'user-2', email: 'other@example.com' }, { allowedEmail: 'owner@example.com' }), true);
  assert.equal(isAuthorizedUser(null, { allowedEmail: 'owner@example.com' }), false);
});

test('hasOwnerEmailConfigured requires a real owner email for personal mode', () => {
  assert.equal(hasOwnerEmailConfigured({}), false);
  assert.equal(hasOwnerEmailConfigured({ allowedEmail: '' }), false);
  assert.equal(hasOwnerEmailConfigured({ allowedEmail: 'YOUR_EMAIL@example.com' }), false);
  assert.equal(hasOwnerEmailConfigured({ allowedEmail: 'owner@example.com' }), true);
});

test('project rows keep the browser model and Supabase columns in sync', () => {
  const row = toProjectRow({
    id: 'project-1',
    name: 'Hot Appearance',
    url: 'https://hot.example',
    githubUrl: 'https://github.com/lg/hot',
    deployStatus: 'healthy',
    adsenseStatus: 'approved',
    todayRevenue: '1200',
    monthRevenue: '22000',
    nextAction: 'check_adsense',
    nextActionDueDate: '2026-08-12',
    nextActionNote: 'Check policy center',
    note: 'Ready',
    updatedAt: '2026-08-05T00:00:00.000Z'
  }, 'user-1');

  assert.deepEqual(row, {
    id: 'project-1',
    owner_id: 'user-1',
    name: 'Hot Appearance',
    url: 'https://hot.example',
    github_url: 'https://github.com/lg/hot',
    deploy_status: 'healthy',
    adsense_status: 'approved',
    today_revenue: 1200,
    month_revenue: 22000,
    next_action: 'check_adsense',
    next_action_due_date: '2026-08-12',
    next_action_note: 'Check policy center',
    note: 'Ready',
    updated_at: '2026-08-05T00:00:00.000Z'
  });

  assert.deepEqual(fromProjectRow(row), {
    id: 'project-1',
    name: 'Hot Appearance',
    url: 'https://hot.example',
    githubUrl: 'https://github.com/lg/hot',
    deployStatus: 'healthy',
    adsenseStatus: 'approved',
    todayRevenue: 1200,
    monthRevenue: 22000,
    nextAction: 'check_adsense',
    nextActionDueDate: '2026-08-12',
    nextActionNote: 'Check policy center',
    note: 'Ready',
    updatedAt: '2026-08-05T00:00:00.000Z'
  });
});

test('createSupabaseProjectStore reads, saves, and deletes only the signed-in user rows', async () => {
  const client = createMemorySupabaseClient([
    { id: 'mine', owner_id: 'user-1', name: 'Mine', updated_at: '2026-08-05T00:00:00.000Z' },
    { id: 'theirs', owner_id: 'user-2', name: 'Theirs', updated_at: '2026-08-05T00:00:00.000Z' }
  ]);
  const store = createSupabaseProjectStore(client, 'user-1');

  assert.deepEqual((await store.list()).map(project => project.id), ['mine']);

  await store.save({ id: 'new-one', name: 'New One', todayRevenue: 7 });
  assert.deepEqual((await store.list()).map(project => project.id), ['mine', 'new-one']);

  await store.remove('mine');
  assert.deepEqual((await store.list()).map(project => project.id), ['new-one']);
  assert.deepEqual(client.rows.map(row => row.id).sort(), ['new-one', 'theirs']);
});

function createMemorySupabaseClient(initialRows = []) {
  const client = {
    rows: initialRows.map(row => ({ ...row })),
    from(tableName) {
      assert.equal(tableName, 'projects');
      return new MemoryQuery(client);
    }
  };
  return client;
}

class MemoryQuery {
  constructor(client) {
    this.client = client;
    this.filters = [];
    this.pendingUpsert = null;
    this.operation = 'select';
  }

  select() {
    this.operation = this.pendingUpsert ? 'upsert' : 'select';
    return this;
  }

  upsert(row) {
    this.pendingUpsert = { ...row };
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, value });
    return this;
  }

  order() {
    return this;
  }

  async single() {
    const existingIndex = this.client.rows.findIndex(row => row.id === this.pendingUpsert.id);
    if (existingIndex >= 0) this.client.rows[existingIndex] = this.pendingUpsert;
    else this.client.rows.push(this.pendingUpsert);
    return { data: this.pendingUpsert, error: null };
  }

  then(resolve, reject) {
    try {
      const matches = row => this.filters.every(filter => row[filter.column] === filter.value);
      if (this.operation === 'delete') {
        this.client.rows = this.client.rows.filter(row => !matches(row));
        return Promise.resolve({ error: null }).then(resolve, reject);
      }
      const data = this.client.rows.filter(matches).map(row => ({ ...row }));
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    } catch (error) {
      return Promise.reject(error).then(resolve, reject);
    }
  }
}
