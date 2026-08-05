import { normalizeProject } from './domain.js';

const PLACEHOLDER_PARTS = ['YOUR_', '<', '>'];

export function isSupabaseConfigured(config = {}) {
  const supabaseUrl = String(config.supabaseUrl || '').trim();
  const supabaseAnonKey = String(config.supabaseAnonKey || '').trim();
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (PLACEHOLDER_PARTS.some(part => supabaseUrl.includes(part) || supabaseAnonKey.includes(part))) return false;
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl);
}

export function hasOwnerEmailConfigured(config = {}) {
  const allowedEmail = String(config.allowedEmail || '').trim();
  if (!allowedEmail) return false;
  if (PLACEHOLDER_PARTS.some(part => allowedEmail.includes(part))) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(allowedEmail);
}

export function isAuthorizedUser(user, config = {}) {
  if (!user) return false;
  if (!hasOwnerEmailConfigured(config)) return false;
  const allowedEmail = String(config.allowedEmail || '').trim().toLowerCase();
  return String(user.email || '').trim().toLowerCase() === allowedEmail;
}

export function toProjectRow(project, ownerId) {
  const normalized = normalizeProject(project);
  return {
    id: normalized.id,
    owner_id: ownerId,
    name: normalized.name,
    url: normalized.url,
    github_url: normalized.githubUrl,
    deploy_status: normalized.deployStatus,
    adsense_status: normalized.adsenseStatus,
    today_revenue: normalized.todayRevenue,
    month_revenue: normalized.monthRevenue,
    next_action: normalized.nextAction,
    next_action_due_date: normalized.nextActionDueDate || null,
    next_action_note: normalized.nextActionNote,
    note: normalized.note,
    updated_at: normalized.updatedAt
  };
}

export function fromProjectRow(row = {}) {
  return normalizeProject({
    id: row.id,
    name: row.name,
    url: row.url,
    githubUrl: row.github_url,
    deployStatus: row.deploy_status,
    adsenseStatus: row.adsense_status,
    todayRevenue: row.today_revenue,
    monthRevenue: row.month_revenue,
    nextAction: row.next_action,
    nextActionDueDate: row.next_action_due_date,
    nextActionNote: row.next_action_note,
    note: row.note,
    updatedAt: row.updated_at
  });
}

export function createSupabaseProjectStore(client, ownerId) {
  if (!client) throw new Error('Supabase client is required.');
  if (!ownerId) throw new Error('Signed-in user id is required.');

  return {
    async list() {
      const { data, error } = await client
        .from('projects')
        .select('*')
        .eq('owner_id', ownerId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(fromProjectRow);
    },

    async save(project) {
      const row = toProjectRow({
        ...project,
        updatedAt: new Date().toISOString()
      }, ownerId);
      const { data, error } = await client
        .from('projects')
        .upsert(row)
        .select()
        .single();
      if (error) throw error;
      return fromProjectRow(data || row);
    },

    async remove(id) {
      const { error } = await client
        .from('projects')
        .delete()
        .eq('owner_id', ownerId)
        .eq('id', id);
      if (error) throw error;
    }
  };
}
