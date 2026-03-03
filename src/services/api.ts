/**
 * API service — tries Supabase first, falls back to in-memory demo data.
 * This keeps the same export surface as the original api.ts so all pages work unchanged.
 */
import { supabase } from '../lib/supabase'
import {
  demoTickets, demoUsers, demoOrganizations, demoCategories, demoDepartments,
  demoRoles, demoSLAPolicies, demoEmailTemplates,
  getDemoDashboardStats, nextTicketId,
} from './demoData'
import { User, Ticket, Organization, Category, Department } from '../types'

// ─── Helper: detect demo session ──────────────────────────────────────────────
const isDemoSession = () => localStorage.getItem('token') === 'demo-session-token'

// ─── Helper: try Supabase, fall back to demo ──────────────────────────────────
async function trySupabase<T>(
  supabaseFn: () => Promise<{ data: T | null; error: any }>,
  fallback: () => T
): Promise<T> {
  if (isDemoSession()) return fallback()
  try {
    const { data, error } = await supabaseFn()
    if (error || data === null) return fallback()
    return data
  } catch {
    return fallback()
  }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
interface LoginResponse { token: string; user: User; mfaRequired?: boolean; tempToken?: string }

export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    if (!data.session) throw new Error('Login failed')
    const user = demoUsers.find(u => u.email === email) || {
      id: data.user.id, email: data.user.email || email,
      name: data.user.user_metadata?.name || email.split('@')[0],
      role: data.user.user_metadata?.role || 'admin', status: 'active' as const,
      created_at: new Date().toISOString(),
    }
    return { token: data.session.access_token, user, mfaRequired: false }
  },
  register: async (userData: any) => ({ success: true }),
  getMe: async (): Promise<User> => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) return JSON.parse(storedUser)
    throw new Error('Not authenticated')
  },
}

// ─── Tickets API ──────────────────────────────────────────────────────────────
interface TicketFilters { status?: string; priority?: string; search?: string; organization?: string }

export const ticketsAPI = {
  getAll: async (filters: TicketFilters = {}): Promise<Ticket[]> => {
    return trySupabase(
      async () => {
        let q = supabase.from('tickets').select('*')
        if (filters.status) q = q.eq('status', filters.status)
        if (filters.priority) q = q.eq('priority', filters.priority)
        if (filters.organization) q = q.eq('organization_id', filters.organization)
        if (filters.search) q = q.ilike('title', `%${filters.search}%`)
        return q
      },
      () => {
        let list = [...demoTickets]
        if (filters.status) list = list.filter(t => t.status === filters.status)
        if (filters.priority) list = list.filter(t => t.priority === filters.priority)
        if (filters.organization) list = list.filter(t => t.organization_id === filters.organization)
        if (filters.search) list = list.filter(t => t.title.toLowerCase().includes(filters.search!.toLowerCase()))
        return list
      }
    )
  },

  getById: async (id: string): Promise<Ticket> => {
    return trySupabase(
      async () => supabase.from('tickets').select('*').eq('id', id).single(),
      () => {
        const t = demoTickets.find(t => t.id === id || String(t.ticket_id) === String(id))
        if (!t) throw new Error('Ticket not found')
        return t
      }
    )
  },

  create: async (ticketData: any): Promise<Ticket> => {
    if (isDemoSession()) {
      const newTicket: Ticket = {
        id: `ticket-${Date.now()}`,
        ticket_id: nextTicketId(),
        title: ticketData.title,
        description: ticketData.description || '',
        status: 'open',
        priority: ticketData.priority || 'medium',
        category: ticketData.category || 'General',
        creator_id: ticketData.creator_id || 'demo-admin-001',
        organization_id: ticketData.organization_id || 'org-1',
        department_id: ticketData.department_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: { id: 'demo-admin-001', name: 'Admin User', email: 'admin@example.com' },
      }
      demoTickets.unshift(newTicket)
      return newTicket
    }
    const { data, error } = await supabase.from('tickets').insert(ticketData).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  createWithFiles: async (formData: FormData): Promise<Ticket> => {
    const ticketData = {
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority') || 'medium',
      category: formData.get('category'),
      organization_id: formData.get('organization_id') || 'org-1',
    }
    return ticketsAPI.create(ticketData)
  },

  update: async (id: string, ticketData: any): Promise<Ticket> => {
    if (isDemoSession()) {
      const idx = demoTickets.findIndex(t => t.id === id || String(t.ticket_id) === String(id))
      if (idx !== -1) {
        demoTickets[idx] = { ...demoTickets[idx], ...ticketData, updated_at: new Date().toISOString() }
        return demoTickets[idx]
      }
      throw new Error('Ticket not found')
    }
    const { data, error } = await supabase.from('tickets').update(ticketData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  addComment: async (id: string, comment: any) => {
    return { success: true, comment: { ...comment, id: `comment-${Date.now()}`, created_at: new Date().toISOString() } }
  },

  approveTicket: async (id: string) => {
    return ticketsAPI.update(id, { status: 'approved' })
  },

  rejectTicket: async (id: string, rejectionReason: string) => {
    return ticketsAPI.update(id, { status: 'rejected', rejectionReason })
  },

  getDashboardStats: async (organization: string | null = null) => {
    return trySupabase(
      async () => {
        // If Supabase tables exist, query them
        const { data, error } = await supabase.from('tickets').select('*')
        if (error || !data) return { data: null, error }
        const tickets = organization ? data.filter((t: any) => t.organization_id === organization) : data
        const stats = {
          totalTickets: tickets.length,
          openTickets: tickets.filter((t: any) => t.status === 'open').length,
          approvalPendingTickets: tickets.filter((t: any) => t.status === 'approval-pending').length,
          approvedTickets: tickets.filter((t: any) => t.status === 'approved').length,
          rejectedTickets: tickets.filter((t: any) => t.status === 'rejected').length,
          inProgressTickets: tickets.filter((t: any) => t.status === 'in-progress').length,
          resolvedTickets: tickets.filter((t: any) => t.status === 'resolved').length,
          closedTickets: tickets.filter((t: any) => t.status === 'closed').length,
          pendingTickets: tickets.filter((t: any) => ['open', 'in-progress'].includes(t.status)).length,
          overdueTickets: 0,
          recentTickets: tickets.slice(0, 5),
          myOpenTickets: tickets.filter((t: any) => t.status === 'open').slice(0, 5),
          statusDistribution: Object.entries(tickets.reduce((a: any, t: any) => ({ ...a, [t.status]: (a[t.status] || 0) + 1 }), {})).map(([name, value]) => ({ name, value })),
          priorityDistribution: Object.entries(tickets.reduce((a: any, t: any) => ({ ...a, [t.priority]: (a[t.priority] || 0) + 1 }), {})).map(([name, value]) => ({ name, value })),
        }
        return { data: stats, error: null }
      },
      () => getDemoDashboardStats(organization)
    )
  },

  importTickets: async (ticketsData: any[]) => {
    if (isDemoSession()) {
      ticketsData.forEach(td => demoTickets.unshift({ ...td, id: `ticket-${Date.now()}-${Math.random()}`, ticket_id: nextTicketId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }))
      return { imported: ticketsData.length }
    }
    const { data, error } = await supabase.from('tickets').insert(ticketsData)
    if (error) throw new Error(error.message)
    return { imported: ticketsData.length }
  },
}

// ─── Users API ────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: async (organization: string | null = null): Promise<User[]> => {
    return trySupabase(
      async () => {
        let q = supabase.from('profiles').select('*')
        if (organization) q = q.eq('organization_id', organization)
        return q
      },
      () => organization ? demoUsers.filter(u => u.organization_id === organization) : [...demoUsers]
    )
  },
  getMentions: async (): Promise<User[]> => [...demoUsers],
  getById: async (id: string): Promise<User> => {
    return trySupabase(
      async () => supabase.from('profiles').select('*').eq('id', id).single(),
      () => {
        const u = demoUsers.find(u => u.id === id)
        if (!u) throw new Error('User not found')
        return u
      }
    )
  },
  create: async (userData: any): Promise<User> => {
    if (isDemoSession()) {
      const newUser: User = { id: `user-${Date.now()}`, ...userData, status: 'active', created_at: new Date().toISOString() }
      demoUsers.push(newUser)
      return newUser
    }
    const { data, error } = await supabase.from('profiles').insert(userData).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  update: async (id: string, userData: any): Promise<User> => {
    if (isDemoSession()) {
      const idx = demoUsers.findIndex(u => u.id === id)
      if (idx !== -1) { demoUsers[idx] = { ...demoUsers[idx], ...userData }; return demoUsers[idx] }
      throw new Error('User not found')
    }
    const { data, error } = await supabase.from('profiles').update(userData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  delete: async (id: string) => {
    if (isDemoSession()) { const idx = demoUsers.findIndex(u => u.id === id); if (idx !== -1) demoUsers.splice(idx, 1); return { success: true } }
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  },
}

// ─── Organizations API ────────────────────────────────────────────────────────
export const organizationsAPI = {
  getAll: async (): Promise<Organization[]> => {
    return trySupabase(
      async () => supabase.from('organizations').select('*'),
      () => [...demoOrganizations]
    )
  },
  getById: async (id: string): Promise<Organization> => {
    return trySupabase(
      async () => supabase.from('organizations').select('*').eq('id', id).single(),
      () => { const o = demoOrganizations.find(o => o.id === id); if (!o) throw new Error('Not found'); return o }
    )
  },
  create: async (orgData: any): Promise<Organization> => {
    if (isDemoSession()) {
      const newOrg: Organization = { id: `org-${Date.now()}`, ...orgData, status: 'active', created_at: new Date().toISOString() }
      demoOrganizations.push(newOrg)
      return newOrg
    }
    const { data, error } = await supabase.from('organizations').insert(orgData).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  update: async (id: string, orgData: any): Promise<Organization> => {
    if (isDemoSession()) {
      const idx = demoOrganizations.findIndex(o => o.id === id); if (idx !== -1) { demoOrganizations[idx] = { ...demoOrganizations[idx], ...orgData }; return demoOrganizations[idx] }
      throw new Error('Not found')
    }
    const { data, error } = await supabase.from('organizations').update(orgData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  delete: async (id: string) => {
    if (isDemoSession()) { const idx = demoOrganizations.findIndex(o => o.id === id); if (idx !== -1) demoOrganizations.splice(idx, 1); return { success: true } }
    const { error } = await supabase.from('organizations').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  },
}

// ─── Categories API ───────────────────────────────────────────────────────────
export const categoriesAPI = {
  getAll: async (): Promise<Category[]> => {
    return trySupabase(async () => supabase.from('categories').select('*'), () => [...demoCategories])
  },
  getAllAdmin: async (organization: string | null = null): Promise<Category[]> => {
    return trySupabase(
      async () => { let q = supabase.from('categories').select('*'); if (organization) q = q.eq('organization_id', organization); return q },
      () => organization ? demoCategories.filter(c => c.organization_id === organization || !c.organization_id) : [...demoCategories]
    )
  },
  getById: async (id: string): Promise<Category> => {
    return trySupabase(
      async () => supabase.from('categories').select('*').eq('id', id).single(),
      () => { const c = demoCategories.find(c => c.id === id); if (!c) throw new Error('Not found'); return c }
    )
  },
  create: async (data: any): Promise<Category> => {
    if (isDemoSession()) { const n: Category = { id: `cat-${Date.now()}`, ...data, status: 'active', created_at: new Date().toISOString() }; demoCategories.push(n); return n }
    const { data: d, error } = await supabase.from('categories').insert(data).select().single(); if (error) throw new Error(error.message); return d
  },
  update: async (id: string, data: any): Promise<Category> => {
    if (isDemoSession()) { const idx = demoCategories.findIndex(c => c.id === id); if (idx !== -1) { demoCategories[idx] = { ...demoCategories[idx], ...data }; return demoCategories[idx] } throw new Error('Not found') }
    const { data: d, error } = await supabase.from('categories').update(data).eq('id', id).select().single(); if (error) throw new Error(error.message); return d
  },
  delete: async (id: string) => {
    if (isDemoSession()) { const idx = demoCategories.findIndex(c => c.id === id); if (idx !== -1) demoCategories.splice(idx, 1); return { success: true } }
    const { error } = await supabase.from('categories').delete().eq('id', id); if (error) throw new Error(error.message); return { success: true }
  },
}

// ─── Departments API ──────────────────────────────────────────────────────────
export const departmentsAPI = {
  getAll: async (): Promise<Department[]> => {
    return trySupabase(async () => supabase.from('departments').select('*'), () => [...demoDepartments])
  },
  getById: async (id: string): Promise<Department> => {
    return trySupabase(
      async () => supabase.from('departments').select('*').eq('id', id).single(),
      () => { const d = demoDepartments.find(d => d.id === id); if (!d) throw new Error('Not found'); return d }
    )
  },
  create: async (data: any): Promise<Department> => {
    if (isDemoSession()) { const n: Department = { id: `dept-${Date.now()}`, ...data, is_active: true, created_at: new Date().toISOString() }; demoDepartments.push(n); return n }
    const { data: d, error } = await supabase.from('departments').insert(data).select().single(); if (error) throw new Error(error.message); return d
  },
  update: async (id: string, data: any): Promise<Department> => {
    if (isDemoSession()) { const idx = demoDepartments.findIndex(d => d.id === id); if (idx !== -1) { demoDepartments[idx] = { ...demoDepartments[idx], ...data }; return demoDepartments[idx] } throw new Error('Not found') }
    const { data: d, error } = await supabase.from('departments').update(data).eq('id', id).select().single(); if (error) throw new Error(error.message); return d
  },
  delete: async (id: string) => {
    if (isDemoSession()) { const idx = demoDepartments.findIndex(d => d.id === id); if (idx !== -1) demoDepartments.splice(idx, 1); return { success: true } }
    const { error } = await supabase.from('departments').delete().eq('id', id); if (error) throw new Error(error.message); return { success: true }
  },
}

// ─── Admin API ────────────────────────────────────────────────────────────────
export const adminAPI = {
  getSSOConfig: async () => ({ enabled: false, provider: null }),
  updateSSOConfig: async (config: any) => ({ success: true }),
  getEmailSettings: async () => ({ smtp: { host: '', port: 587, user: '', from: '' }, imap: { host: '', port: 993 } }),
  updateEmailSettings: async (s: any) => ({ success: true }),
  testSMTP: async (to: string, s: any) => ({ success: true, message: 'Test email sent (demo mode)' }),
  testIMAP: async (s: any) => ({ success: true }),
  sendTestEmail: async (to: string, subject: string, html: string) => ({ success: true }),
  getLogo: async () => ({ logo: null, showOnLogin: false, loginTitle: 'Ticketing Tool' }),
  updateLogo: async (logo: string, filename: string, showOnLogin: boolean, loginTitle: string | null = null) => ({ success: true, logo, showOnLogin, loginTitle }),
  getRoles: async () => [...demoRoles],
  createRole: async (data: any) => { const n = { id: `role-${Date.now()}`, ...data, created_at: new Date().toISOString() }; demoRoles.push(n); return n },
  updateRole: async (id: string, data: any) => { const idx = demoRoles.findIndex(r => r.id === id); if (idx !== -1) { demoRoles[idx] = { ...demoRoles[idx], ...data }; return demoRoles[idx] } throw new Error('Not found') },
  deleteRole: async (id: string) => { const idx = demoRoles.findIndex(r => r.id === id); if (idx !== -1) demoRoles.splice(idx, 1); return { success: true } },
  getSLAPolicies: async (organization: string) => demoSLAPolicies.filter(s => !organization || s.organization_id === organization),
  createSLAPolicy: async (data: any) => { const n = { id: `sla-${Date.now()}`, ...data, created_at: new Date().toISOString() }; demoSLAPolicies.push(n); return n },
  updateSLAPolicy: async (id: string, data: any) => { const idx = demoSLAPolicies.findIndex(s => s.id === id); if (idx !== -1) { demoSLAPolicies[idx] = { ...demoSLAPolicies[idx], ...data }; return demoSLAPolicies[idx] } throw new Error('Not found') },
  deleteSLAPolicy: async (id: string) => { const idx = demoSLAPolicies.findIndex(s => s.id === id); if (idx !== -1) demoSLAPolicies.splice(idx, 1); return { success: true } },
  getEmailTemplates: async () => [...demoEmailTemplates],
  getEmailTemplate: async (id: string) => demoEmailTemplates.find(t => t.id === id) || null,
  createEmailTemplate: async (data: any) => { const n = { id: `tpl-${Date.now()}`, ...data, created_at: new Date().toISOString() }; demoEmailTemplates.push(n); return n },
  updateEmailTemplate: async (id: string, data: any) => { const idx = demoEmailTemplates.findIndex(t => t.id === id); if (idx !== -1) { demoEmailTemplates[idx] = { ...demoEmailTemplates[idx], ...data }; return demoEmailTemplates[idx] } throw new Error('Not found') },
  deleteEmailTemplate: async (id: string) => { const idx = demoEmailTemplates.findIndex(t => t.id === id); if (idx !== -1) demoEmailTemplates.splice(idx, 1); return { success: true } },
  previewEmailTemplate: async (id: string) => ({ html: '<p>Preview</p>' }),
  createBackup: async () => ({ success: true, name: `backup-${Date.now()}` }),
  listBackups: async () => [],
  downloadBackup: async (name: string) => ({ success: true }),
  deleteBackup: async (name: string) => ({ success: true }),
  restoreBackup: async (name: string, clear = false) => ({ success: true }),
  uploadBackup: async (file: File, clear = false) => ({ success: true }),
}

// ─── MFA API ──────────────────────────────────────────────────────────────────
export const mfaAPI = {
  getSetup: async () => ({ qrCode: '', secret: '' }),
  verify: async (token: string) => ({ success: true }),
  verifyLogin: async (tempToken: string, code: string) => ({ success: true, token: 'demo-token' }),
  disable: async () => ({ success: true }),
}

// ─── Reports API ──────────────────────────────────────────────────────────────
const buildReportData = (period = 'month', organization: string | null = null) => {
  const tickets = organization ? demoTickets.filter(t => t.organization_id === organization) : demoTickets
  return {
    totalTickets: tickets.length,
    resolvedTickets: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    avgResolutionTime: 4.2,
    slaCompliance: 87,
    tickets,
    byStatus: Object.entries(tickets.reduce((a, t) => ({ ...a, [t.status]: (a[t.status as any] || 0) + 1 }), {} as any)).map(([name, value]) => ({ name, value })),
    byPriority: Object.entries(tickets.reduce((a, t) => ({ ...a, [t.priority]: (a[t.priority as any] || 0) + 1 }), {} as any)).map(([name, value]) => ({ name, value })),
    trends: Array.from({ length: 7 }).map((_, i) => ({ date: new Date(Date.now() - i * 86400000).toLocaleDateString(), count: Math.floor(Math.random() * 10) + 1 })).reverse(),
  }
}
export const reportsAPI = {
  getDashboard: async (period = 'month', organization: string | null = null) => buildReportData(period, organization),
  getStatusWise: async (period = 'month', organization: string | null = null) => buildReportData(period, organization),
  getDepartmentWise: async (period = 'month', organization: string | null = null) => buildReportData(period, organization),
  getTechnicianPerformance: async (period = 'month', organization: string | null = null) => buildReportData(period, organization),
  getSLACompliance: async (period = 'month', organization: string | null = null) => buildReportData(period, organization),
  getTrends: async (period = 'month', organization: string | null = null, groupBy = 'day') => buildReportData(period, organization),
}

// ─── Integrations API ─────────────────────────────────────────────────────────
export const integrationsAPI = {
  getAll: async () => [],
  getById: async (id: string) => null,
  create: async (data: any) => ({ id: `int-${Date.now()}`, ...data }),
  update: async (id: string, data: any) => ({ id, ...data }),
  delete: async (id: string) => ({ success: true }),
}

// ─── API Keys API ─────────────────────────────────────────────────────────────
export const apiKeysAPI = {
  getAll: async () => [],
  create: async (data: any) => ({ id: `key-${Date.now()}`, key: `sk_demo_${Math.random().toString(36).slice(2)}`, ...data, status: 'active' }),
  update: async (id: string, data: any) => ({ id, ...data }),
  delete: async (id: string) => ({ success: true }),
  revoke: async (id: string) => ({ success: true }),
  activate: async (id: string) => ({ success: true }),
}

// ─── Email Templates API (duplicate export kept for compat) ───────────────────
export const emailTemplatesAPI = {
  getAll: async () => [...demoEmailTemplates],
  getById: async (id: string) => demoEmailTemplates.find(t => t.id === id) || null,
  create: async (data: any) => adminAPI.createEmailTemplate(data),
  update: async (id: string, data: any) => adminAPI.updateEmailTemplate(id, data),
  delete: async (id: string) => adminAPI.deleteEmailTemplate(id),
  preview: async (id: string) => ({ html: '<p>Preview</p>' }),
}

// ─── Email Automation API ─────────────────────────────────────────────────────
export const emailAutomationAPI = {
  getAll: async () => [],
  getById: async (id: string) => null,
  create: async (data: any) => ({ id: `auto-${Date.now()}`, ...data }),
  update: async (id: string, data: any) => ({ id, ...data }),
  delete: async (id: string) => ({ success: true }),
  run: async (id: string) => ({ success: true }),
}

// ─── Chatbot API ──────────────────────────────────────────────────────────────
export const chatbotAPI = {
  createSession: async (platform = 'web') => ({ sessionId: `session-${Date.now()}`, platform }),
  sendMessage: async (message: string, sessionId: string, attachments: File[] = []) => ({
    response: 'Thank you for your message. How can I help you today?',
    sessionId,
    options: ['Create a ticket', 'Check ticket status', 'Talk to an agent'],
  }),
  createTicket: async (sessionId: string, ticketData: any) => ticketsAPI.create(ticketData),
  getHistory: async (userId: string | null = null, limit = 50) => [],
  getSession: async (sessionId: string) => ({ sessionId, messages: [] }),
  escalate: async (sessionId: string, departmentId: string | null = null) => ({ success: true }),
}

// ─── FAQ API ──────────────────────────────────────────────────────────────────
const demoFAQs: any[] = [
  { id: 'faq-1', question: 'How do I reset my password?', answer: 'Click "Forgot Password" on the login page and follow the instructions.', category: 'Account', helpful: 42, created_at: new Date().toISOString() },
  { id: 'faq-2', question: 'How do I create a ticket?', answer: 'Click "New Ticket" in the sidebar and fill in the required details.', category: 'Tickets', helpful: 38, created_at: new Date().toISOString() },
  { id: 'faq-3', question: 'What is the SLA for urgent tickets?', answer: 'Urgent tickets have a 1-hour response time and 4-hour resolution target.', category: 'SLA', helpful: 25, created_at: new Date().toISOString() },
]
export const faqAPI = {
  getAll: async () => [...demoFAQs],
  getById: async (id: string) => demoFAQs.find(f => f.id === id) || null,
  create: async (data: any) => { const n = { id: `faq-${Date.now()}`, ...data, helpful: 0, created_at: new Date().toISOString() }; demoFAQs.push(n); return n },
  update: async (id: string, data: any) => { const idx = demoFAQs.findIndex(f => f.id === id); if (idx !== -1) { demoFAQs[idx] = { ...demoFAQs[idx], ...data }; return demoFAQs[idx] } throw new Error('Not found') },
  delete: async (id: string) => { const idx = demoFAQs.findIndex(f => f.id === id); if (idx !== -1) demoFAQs.splice(idx, 1); return { success: true } },
  markHelpful: async (id: string) => { const f = demoFAQs.find(f => f.id === id); if (f) f.helpful++; return f },
}

// ─── Teams API ────────────────────────────────────────────────────────────────
export const teamsAPI = {
  getConfig: async () => [],
  saveConfig: async (data: any) => ({ success: true }),
  updateConfig: async (id: string, data: any) => ({ id, ...data }),
  deleteConfig: async (id: string) => ({ success: true }),
  testWebhook: async (id: string) => ({ success: true }),
  sendNotification: async (data: any) => ({ success: true }),
}

// ─── Domain Rules API ─────────────────────────────────────────────────────────
export const domainRulesAPI = {
  getAll: async () => [],
  create: async (data: any) => ({ id: `dr-${Date.now()}`, ...data }),
  update: async (id: string, data: any) => ({ id, ...data }),
  delete: async (id: string) => ({ success: true }),
}
