/**
 * Demo data store — used when Supabase tables don't exist or network is unavailable.
 * All mutations (create/update/delete) are applied to this in-memory store for the session.
 */
import { User, Ticket, Organization, Category, Department } from '../types'

const now = new Date().toISOString()
const yesterday = new Date(Date.now() - 86400000).toISOString()
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString()

// ─── Organizations ────────────────────────────────────────────────────────────
export let demoOrganizations: Organization[] = [
    { id: 'org-1', name: 'Acme Corp', domain: 'acme.com', description: 'Main client organization', status: 'active', created_at: lastWeek },
    { id: 'org-2', name: 'Tech Solutions', domain: 'techsol.io', description: 'Software partner', status: 'active', created_at: lastWeek },
    { id: 'org-3', name: 'Global Retail', domain: 'globalretail.com', description: 'Retail chain client', status: 'inactive', created_at: lastWeek },
]

// ─── Departments ──────────────────────────────────────────────────────────────
export let demoDepartments: Department[] = [
    { id: 'dept-1', name: 'IT Support', organization_id: 'org-1', is_active: true, created_at: lastWeek },
    { id: 'dept-2', name: 'HR', organization_id: 'org-1', is_active: true, created_at: lastWeek },
    { id: 'dept-3', name: 'Finance', organization_id: 'org-1', is_active: true, created_at: lastWeek },
    { id: 'dept-4', name: 'Engineering', organization_id: 'org-2', is_active: true, created_at: lastWeek },
]

// ─── Categories ───────────────────────────────────────────────────────────────
export let demoCategories: Category[] = [
    { id: 'cat-1', name: 'Hardware', organization_id: 'org-1', description: 'Physical device issues', status: 'active', created_at: lastWeek },
    { id: 'cat-2', name: 'Software', organization_id: 'org-1', description: 'Application & OS issues', status: 'active', created_at: lastWeek },
    { id: 'cat-3', name: 'Network', organization_id: 'org-1', description: 'Connectivity issues', status: 'active', created_at: lastWeek },
    { id: 'cat-4', name: 'Account Access', organization_id: 'org-1', description: 'Login & permissions', status: 'active', created_at: lastWeek },
    { id: 'cat-5', name: 'General', description: 'General requests', status: 'active', created_at: lastWeek },
]

// ─── Users ────────────────────────────────────────────────────────────────────
export let demoUsers: User[] = [
    { id: 'demo-admin-001', name: 'Admin User', email: 'admin@example.com', role: 'admin', status: 'active', created_at: lastWeek },
    { id: 'demo-agent-001', name: 'Support Agent', email: 'agent@example.com', role: 'technician', status: 'active', organization_id: 'org-1', department_id: 'dept-1', created_at: lastWeek },
    { id: 'demo-user-001', name: 'Demo User', email: 'user@example.com', role: 'user', status: 'active', organization_id: 'org-1', created_at: lastWeek },
    { id: 'user-4', name: 'Alice Johnson', email: 'alice@acme.com', role: 'user', status: 'active', organization_id: 'org-1', department_id: 'dept-2', created_at: lastWeek },
    { id: 'user-5', name: 'Bob Smith', email: 'bob@acme.com', role: 'technician', status: 'active', organization_id: 'org-1', department_id: 'dept-1', created_at: lastWeek },
    { id: 'user-6', name: 'Carol White', email: 'carol@techsol.io', role: 'user', status: 'active', organization_id: 'org-2', department_id: 'dept-4', created_at: lastWeek },
]

// ─── Tickets ──────────────────────────────────────────────────────────────────
export let demoTickets: Ticket[] = [
    {
        id: 'ticket-1', ticket_id: 1001, title: 'Cannot connect to VPN', description: 'VPN client throws error 800 on Windows 11', status: 'open', priority: 'high',
        category: 'Network', creator_id: 'user-4', assignee_id: 'demo-agent-001', organization_id: 'org-1', department_id: 'dept-1',
        created_at: yesterday, updated_at: yesterday,
        creator: { id: 'user-4', name: 'Alice Johnson', email: 'alice@acme.com' },
        assignee: { id: 'demo-agent-001', name: 'Support Agent', email: 'agent@example.com' },
    },
    {
        id: 'ticket-2', ticket_id: 1002, title: 'Laptop screen flickering', description: 'Screen flickers every few minutes, especially on battery', status: 'in-progress', priority: 'medium',
        category: 'Hardware', creator_id: 'demo-user-001', assignee_id: 'user-5', organization_id: 'org-1', department_id: 'dept-1',
        created_at: yesterday, updated_at: yesterday,
        creator: { id: 'demo-user-001', name: 'Demo User', email: 'user@example.com' },
        assignee: { id: 'user-5', name: 'Bob Smith', email: 'bob@acme.com' },
    },
    {
        id: 'ticket-3', ticket_id: 1003, title: 'Password reset not working', description: 'Reset email never arrives even after multiple attempts', status: 'approval-pending', priority: 'urgent',
        category: 'Account Access', creator_id: 'user-6', organization_id: 'org-2', department_id: 'dept-4',
        created_at: lastWeek, updated_at: yesterday,
        creator: { id: 'user-6', name: 'Carol White', email: 'carol@techsol.io' },
    },
    {
        id: 'ticket-4', ticket_id: 1004, title: 'MS Office installation failed', description: 'Installation stops at 60% with error code 30015-4', status: 'resolved', priority: 'medium',
        category: 'Software', creator_id: 'user-4', assignee_id: 'demo-agent-001', organization_id: 'org-1', department_id: 'dept-1',
        created_at: lastWeek, updated_at: yesterday,
        creator: { id: 'user-4', name: 'Alice Johnson', email: 'alice@acme.com' },
        assignee: { id: 'demo-agent-001', name: 'Support Agent', email: 'agent@example.com' },
    },
    {
        id: 'ticket-5', ticket_id: 1005, title: 'Printer not detected on network', description: 'HP LaserJet not visible from any workstation after router replacement', status: 'open', priority: 'low',
        category: 'Network', creator_id: 'user-5', organization_id: 'org-1', department_id: 'dept-1',
        created_at: lastWeek, updated_at: lastWeek,
        creator: { id: 'user-5', name: 'Bob Smith', email: 'bob@acme.com' },
    },
    {
        id: 'ticket-6', ticket_id: 1006, title: 'Payroll software crashes on export', description: 'PDF export crashes the entire application', status: 'closed', priority: 'high',
        category: 'Software', creator_id: 'user-4', assignee_id: 'user-5', organization_id: 'org-1', department_id: 'dept-3',
        created_at: lastWeek, updated_at: lastWeek,
        creator: { id: 'user-4', name: 'Alice Johnson', email: 'alice@acme.com' },
        assignee: { id: 'user-5', name: 'Bob Smith', email: 'bob@acme.com' },
    },
    {
        id: 'ticket-7', ticket_id: 1007, title: 'New employee laptop setup', description: 'Need laptop configured for new hire starting Monday', status: 'approved', priority: 'medium',
        category: 'Hardware', creator_id: 'demo-admin-001', organization_id: 'org-1', department_id: 'dept-2',
        created_at: yesterday, updated_at: now,
        creator: { id: 'demo-admin-001', name: 'Admin User', email: 'admin@example.com' },
    },
    {
        id: 'ticket-8', ticket_id: 1008, title: 'Email client not syncing', description: 'Outlook stops syncing after Windows update KB5034441', status: 'in-progress', priority: 'high',
        category: 'Software', creator_id: 'user-6', assignee_id: 'demo-agent-001', organization_id: 'org-2', department_id: 'dept-4',
        created_at: yesterday, updated_at: now,
        creator: { id: 'user-6', name: 'Carol White', email: 'carol@techsol.io' },
        assignee: { id: 'demo-agent-001', name: 'Support Agent', email: 'agent@example.com' },
    },
]

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const getDemoDashboardStats = (organizationFilter: string | null = null) => {
    const tickets = organizationFilter
        ? demoTickets.filter(t => t.organization_id === organizationFilter)
        : demoTickets

    const statusDistribution = Object.entries(
        tickets.reduce((acc, t) => ({ ...acc, [t.status]: (acc[t.status] || 0) + 1 }), {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }))

    const priorityDistribution = Object.entries(
        tickets.reduce((acc, t) => ({ ...acc, [t.priority]: (acc[t.priority] || 0) + 1 }), {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }))

    return {
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'open').length,
        approvalPendingTickets: tickets.filter(t => t.status === 'approval-pending').length,
        approvedTickets: tickets.filter(t => t.status === 'approved').length,
        rejectedTickets: tickets.filter(t => t.status === 'rejected').length,
        inProgressTickets: tickets.filter(t => t.status === 'in-progress').length,
        resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
        closedTickets: tickets.filter(t => t.status === 'closed').length,
        pendingTickets: tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length,
        overdueTickets: 1,
        recentTickets: [...tickets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
        myOpenTickets: tickets.filter(t => t.status === 'open').slice(0, 5),
        statusDistribution,
        priorityDistribution,
    }
}

// ─── Roles ────────────────────────────────────────────────────────────────────
export let demoRoles = [
    { id: 'role-1', name: 'Admin', description: 'Full system access', permissions: ['all'], created_at: lastWeek },
    { id: 'role-2', name: 'Technician', description: 'Handle and resolve tickets', permissions: ['tickets.read', 'tickets.update'], created_at: lastWeek },
    { id: 'role-3', name: 'Department Head', description: 'Approve tickets in department', permissions: ['tickets.read', 'tickets.approve'], created_at: lastWeek },
    { id: 'role-4', name: 'User', description: 'Submit and view own tickets', permissions: ['tickets.create', 'tickets.read.own'], created_at: lastWeek },
]

// ─── SLA Policies ─────────────────────────────────────────────────────────────
export let demoSLAPolicies = [
    { id: 'sla-1', name: 'Critical Response', priority: 'urgent', responseTime: 1, resolutionTime: 4, organization_id: 'org-1', created_at: lastWeek },
    { id: 'sla-2', name: 'High Priority', priority: 'high', responseTime: 4, resolutionTime: 24, organization_id: 'org-1', created_at: lastWeek },
    { id: 'sla-3', name: 'Standard', priority: 'medium', responseTime: 8, resolutionTime: 48, organization_id: 'org-1', created_at: lastWeek },
    { id: 'sla-4', name: 'Low Priority', priority: 'low', responseTime: 24, resolutionTime: 72, organization_id: 'org-1', created_at: lastWeek },
]

// ─── Email Templates ──────────────────────────────────────────────────────────
export let demoEmailTemplates = [
    { id: 'tpl-1', name: 'Ticket Created', type: 'ticket_created', subject: 'Your ticket #{{ticketId}} has been created', body: 'Dear {{userName}}, your ticket has been received.', created_at: lastWeek },
    { id: 'tpl-2', name: 'Ticket Resolved', type: 'ticket_resolved', subject: 'Ticket #{{ticketId}} has been resolved', body: 'Dear {{userName}}, your ticket has been resolved.', created_at: lastWeek },
    { id: 'tpl-3', name: 'Ticket Assigned', type: 'ticket_assigned', subject: 'Ticket #{{ticketId}} assigned to you', body: 'A ticket has been assigned to you.', created_at: lastWeek },
]

// ─── Misc counters ─────────────────────────────────────────────────────────────
let _ticketIdCounter = 1009

export const nextTicketId = () => _ticketIdCounter++
