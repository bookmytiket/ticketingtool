import { User, Ticket, Organization, Category, Department } from '../types'

// API service for all backend calls
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token')
}

interface ApiOptions extends RequestInit {
  headers?: Record<string, string>;
}

// Helper function for API calls
const apiCall = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        const error = await response.json().catch(() => ({ message: 'Session expired. Please login again.' }))
        throw new Error(error.message || 'Session expired. Please login again.')
      }

      const error = await response.json().catch(() => ({ message: 'An error occurred' }))
      throw new Error(error.message || 'Request failed')
    }

    return response.json()
  } catch (error) {
    // Handle network errors (fetch failures)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your connection and try again.')
    }
    // Re-throw other errors
    throw error
  }
}

// Auth API types
interface LoginResponse {
  token: string;
  user: User;
  mfaRequired?: boolean;
  tempToken?: string;
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    return apiCall<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  register: async (userData: any): Promise<any> => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },
  getMe: async (): Promise<User> => {
    return apiCall<User>('/auth/me')
  },
}

// Tickets API types
interface TicketFilters {
  status?: string;
  priority?: string;
  search?: string;
  organization?: string;
}

// Tickets API
export const ticketsAPI = {
  getAll: async (filters: TicketFilters = {}): Promise<Ticket[]> => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.priority) params.append('priority', filters.priority)
    if (filters.search) params.append('search', filters.search)
    if (filters.organization) params.append('organization', filters.organization)

    const query = params.toString()
    return apiCall<Ticket[]>(`/tickets${query ? `?${query}` : ''}`)
  },
  getById: async (id: string): Promise<Ticket> => {
    return apiCall<Ticket>(`/tickets/${id}`)
  },
  create: async (ticketData: any): Promise<Ticket> => {
    return apiCall<Ticket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    })
  },
  createWithFiles: async (formData: FormData): Promise<Ticket> => {
    const token = localStorage.getItem('token')

    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error occurred' }))
      throw new Error(error.message || 'Failed to create ticket')
    }

    return response.json()
  },
  update: async (id: string, ticketData: any): Promise<Ticket> => {
    return apiCall<Ticket>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ticketData),
    })
  },
  addComment: async (id: string, comment: any): Promise<any> => {
    return apiCall(`/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    })
  },
  approveTicket: async (id: string): Promise<any> => {
    return apiCall(`/tickets/${id}/approve`, {
      method: 'POST',
    })
  },
  rejectTicket: async (id: string, rejectionReason: string): Promise<any> => {
    return apiCall(`/tickets/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    })
  },
  getDashboardStats: async (organization: string | null = null): Promise<any> => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    const query = params.toString()
    return apiCall(`/tickets/stats/dashboard${query ? `?${query}` : ''}`)
  },
  importTickets: async (ticketsData: any[]): Promise<any> => {
    return apiCall('/tickets/import', {
      method: 'POST',
      body: JSON.stringify({ tickets: ticketsData }),
    })
  },
}

// Users API
export const usersAPI = {
  getAll: async (organization: string | null = null): Promise<User[]> => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    const query = params.toString()
    return apiCall<User[]>(`/users${query ? `?${query}` : ''}`)
  },
  getMentions: async (): Promise<User[]> => {
    return apiCall<User[]>('/users/mentions')
  },
  getById: async (id: string): Promise<User> => {
    return apiCall<User>(`/users/${id}`)
  },
  create: async (userData: any): Promise<User> => {
    return apiCall<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },
  update: async (id: string, userData: any): Promise<User> => {
    return apiCall<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  },
  delete: async (id: string): Promise<any> => {
    return apiCall(`/users/${id}`, {
      method: 'DELETE',
    })
  },
}

// Admin API
export const adminAPI = {
  // SSO Config
  getSSOConfig: async (): Promise<any> => {
    return apiCall('/admin/sso')
  },
  updateSSOConfig: async (config: any): Promise<any> => {
    return apiCall('/admin/sso', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  },

  // Email Settings
  getEmailSettings: async (): Promise<any> => {
    return apiCall('/admin/email')
  },
  updateEmailSettings: async (settings: any): Promise<any> => {
    return apiCall('/admin/email', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },
  testSMTP: async (to: string, settings: any): Promise<any> => {
    return apiCall('/email/test-smtp', {
      method: 'POST',
      body: JSON.stringify({ to, settings }),
    })
  },
  testIMAP: async (settings: any): Promise<any> => {
    return apiCall('/email/test-imap', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    })
  },
  sendTestEmail: async (to: string, subject: string, html: string): Promise<any> => {
    return apiCall('/email/send', {
      method: 'POST',
      body: JSON.stringify({ to, subject, html }),
    })
  },

  // Logo
  getLogo: async (): Promise<any> => {
    return apiCall('/admin/logo')
  },
  updateLogo: async (logo: string, filename: string, showOnLogin: boolean, loginTitle: string | null = null): Promise<any> => {
    return apiCall('/admin/logo', {
      method: 'POST',
      body: JSON.stringify({ logo, filename, showOnLogin, loginTitle }),
    })
  },

  // Roles
  getRoles: async (): Promise<any[]> => {
    return apiCall('/admin/roles')
  },
  createRole: async (roleData: any): Promise<any> => {
    return apiCall('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    })
  },
  updateRole: async (id: string, roleData: any): Promise<any> => {
    return apiCall(`/admin/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    })
  },
  deleteRole: async (id: string): Promise<any> => {
    return apiCall(`/admin/roles/${id}`, {
      method: 'DELETE',
    })
  },

  // SLA Policies
  getSLAPolicies: async (organization: string): Promise<any[]> => {
    const url = organization ? `/admin/sla?organization=${organization}` : '/admin/sla'
    return apiCall(url)
  },
  createSLAPolicy: async (policyData: any): Promise<any> => {
    return apiCall('/admin/sla', {
      method: 'POST',
      body: JSON.stringify(policyData),
    })
  },
  updateSLAPolicy: async (id: string, policyData: any): Promise<any> => {
    return apiCall(`/admin/sla/${id}`, {
      method: 'PUT',
      body: JSON.stringify(policyData),
    })
  },
  deleteSLAPolicy: async (id: string): Promise<any> => {
    return apiCall(`/admin/sla/${id}`, {
      method: 'DELETE',
    })
  },

  // Email Templates
  getEmailTemplates: async (): Promise<any[]> => {
    return apiCall('/email-templates')
  },
  getEmailTemplate: async (id: string): Promise<any> => {
    return apiCall(`/email-templates/${id}`)
  },
  createEmailTemplate: async (templateData: any): Promise<any> => {
    return apiCall('/email-templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    })
  },
  updateEmailTemplate: async (id: string, templateData: any): Promise<any> => {
    return apiCall(`/email-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    })
  },
  deleteEmailTemplate: async (id: string): Promise<any> => {
    return apiCall(`/email-templates/${id}`, {
      method: 'DELETE',
    })
  },
  previewEmailTemplate: async (id: string): Promise<any> => {
    return apiCall(`/email-templates/${id}/preview`, {
      method: 'POST',
    })
  },

  // Backup & Restore
  createBackup: async (): Promise<any> => {
    return apiCall('/backup/create', {
      method: 'POST',
    })
  },
  listBackups: async (): Promise<any[]> => {
    return apiCall('/backup/list')
  },
  downloadBackup: async (backupName: string): Promise<any> => {
    const token = getAuthToken()
    const response = await fetch(`${API_BASE_URL}/backup/download/${backupName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Download failed' }))
      throw new Error(error.message || 'Download failed')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${backupName}.json`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    return { success: true }
  },
  deleteBackup: async (backupName: string): Promise<any> => {
    return apiCall(`/backup/${backupName}`, {
      method: 'DELETE',
    })
  },
  restoreBackup: async (backupName: string, clearExisting = false): Promise<any> => {
    return apiCall('/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ backupName, clearExisting }),
    })
  },
  uploadBackup: async (file: File, clearExisting = false): Promise<any> => {
    const token = getAuthToken()
    const formData = new FormData()
    formData.append('backupFile', file)
    formData.append('clearExisting', clearExisting ? 'true' : 'false')

    const response = await fetch(`${API_BASE_URL}/backup/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }))
      throw new Error(error.message || 'Upload failed')
    }

    return response.json()
  },
}

// Organizations API
export const organizationsAPI = {
  getAll: async (): Promise<Organization[]> => {
    return apiCall<Organization[]>('/organizations')
  },
  getById: async (id: string): Promise<Organization> => {
    return apiCall<Organization>(`/organizations/${id}`)
  },
  create: async (orgData: any): Promise<Organization> => {
    return apiCall<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify(orgData),
    })
  },
  update: async (id: string, orgData: any): Promise<Organization> => {
    return apiCall<Organization>(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orgData),
    })
  },
  delete: async (id: string): Promise<any> => {
    return apiCall(`/organizations/${id}`, {
      method: 'DELETE',
    })
  },
}

// Categories API
export const categoriesAPI = {
  getAll: async (): Promise<Category[]> => {
    return apiCall<Category[]>('/categories')
  },
  getAllAdmin: async (organization: string | null = null): Promise<Category[]> => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    const query = params.toString()
    return apiCall<Category[]>(`/categories/all${query ? `?${query}` : ''}`)
  },
  getById: async (id: string): Promise<Category> => {
    return apiCall<Category>(`/categories/${id}`)
  },
  create: async (categoryData: any): Promise<Category> => {
    return apiCall<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
  },
  update: async (id: string, categoryData: any): Promise<Category> => {
    return apiCall<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    })
  },
  delete: async (id: string): Promise<any> => {
    return apiCall(`/categories/${id}`, {
      method: 'DELETE',
    })
  },
}

// Departments API
export const departmentsAPI = {
  getAll: async (): Promise<Department[]> => {
    return apiCall<Department[]>('/departments')
  },
  getById: async (id: string): Promise<Department> => {
    return apiCall<Department>(`/departments/${id}`)
  },
  create: async (departmentData: any): Promise<Department> => {
    return apiCall<Department>('/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    })
  },
  update: async (id: string, departmentData: any): Promise<Department> => {
    return apiCall<Department>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData),
    })
  },
  delete: async (id: string): Promise<any> => {
    return apiCall(`/departments/${id}`, {
      method: 'DELETE',
    })
  },
}

// MFA API
export const mfaAPI = {
  getSetup: async (): Promise<any> => {
    return apiCall('/mfa/setup')
  },
  verify: async (token: string): Promise<any> => {
    return apiCall('/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },
  verifyLogin: async (tempToken: string, code: string): Promise<any> => {
    return apiCall('/mfa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    })
  },
  disable: async (): Promise<any> => {
    return apiCall('/mfa/disable', {
      method: 'POST',
    })
  },
}

// Reports API (Admin only)
export const reportsAPI = {
  getDashboard: async (period = 'month', organization: string | null = null): Promise<any> => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    return apiCall(`/reports/dashboard?${params.toString()}`)
  },
  getStatusWise: async (period = 'month', organization: string | null = null): Promise<any> => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    return apiCall(`/reports/status-wise?${params.toString()}`)
  },
  getDepartmentWise: async (period = 'month', organization: string | null = null): Promise<any> => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    return apiCall(`/reports/department-wise?${params.toString()}`)
  },
  getTechnicianPerformance: async (period = 'month', organization: string | null = null): Promise<any> => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    return apiCall(`/reports/technician-performance?${params.toString()}`)
  },
  getSLACompliance: async (period = 'month', organization: string | null = null): Promise<any> => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    return apiCall(`/reports/sla-compliance?${params.toString()}`)
  },
  getTrends: async (period = 'month', organization: string | null = null, groupBy = 'day'): Promise<any> => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    if (groupBy) params.append('groupBy', groupBy)
    return apiCall(`/reports/trends?${params.toString()}`)
  },
}

// External Integrations API (Admin only)
export const integrationsAPI = {
  getAll: async (organization: string | null = null, type: string | null = null): Promise<any[]> => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    if (type) params.append('type', type)
    return apiCall<any[]>(`/integrations?${params.toString()}`)
  },
  getById: async (id: string): Promise<any> => {
    return apiCall(`/integrations/${id}`)
  },
  create: async (integrationData: any): Promise<any> => {
    return apiCall('/integrations', {
      method: 'POST',
      body: JSON.stringify(integrationData),
    })
  },
  update: async (id: string, integrationData: any): Promise<any> => {
    return apiCall(`/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(integrationData),
    })
  },
  delete: async (id: string): Promise<any> => {
    return apiCall(`/integrations/${id}`, {
      method: 'DELETE',
    })
  },
}

// API Keys API (Admin only)
export const apiKeysAPI = {
  getAll: async (organization: string | null = null): Promise<any[]> => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    return apiCall<any[]>(`/api-keys?${params.toString()}`)
  },
  create: async (apiKeyData: any): Promise<any> => {
    return apiCall('/api-keys', {
      method: 'POST',
      body: JSON.stringify(apiKeyData),
    })
  },
  update: async (id: string, apiKeyData: any): Promise<any> => {
    return apiCall(`/api-keys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiKeyData),
    })
  },
  delete: async (id: string): Promise<any> => {
    return apiCall(`/api-keys/${id}`, {
      method: 'DELETE',
    })
  },
  revoke: async (id: string): Promise<any> => {
    return apiCall(`/api-keys/${id}/revoke`, {
      method: 'POST',
    })
  },
  activate: async (id: string): Promise<any> => {
    return apiCall(`/api-keys/${id}/activate`, {
      method: 'POST',
    })
  },
}

// Email Templates API (Admin only)
export const emailTemplatesAPI = {
  getAll: async (organization: string | null = null, type: string | null = null): Promise<any[]> => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    if (type) params.append('type', type)
    return apiCall<any[]>(`/email-templates?${params.toString()}`)
  },
  getById: async (id: string): Promise<any> => {
    return apiCall(`/email-templates/${id}`)
  },
  create: async (templateData: any): Promise<any> => {
    return apiCall('/email-templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    })
  },
  update: async (id: string, templateData: any): Promise<any> => {
    return apiCall(`/email-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    })
  },
  delete: async (id: string): Promise<any> => {
    return apiCall(`/email-templates/${id}`, {
      method: 'DELETE',
    })
  },
  preview: async (id: string): Promise<any> => {
    return apiCall(`/email-templates/${id}/preview`, {
      method: 'POST',
    })
  },
}

// Email Automation API (Admin only)
export const emailAutomationAPI = {
  getAll: async (organization: string | null = null): Promise<any[]> => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    return apiCall<any[]>(`/email-automation?${params.toString()}`)
  },
  getById: async (id: string): Promise<any> => {
    return apiCall(`/email-automation/${id}`)
  },
  create: async (automationData: any): Promise<any> => {
    return apiCall('/email-automation', {
      method: 'POST',
      body: JSON.stringify(automationData),
    })
  },
  update: async (id: string, automationData: any): Promise<any> => {
    return apiCall(`/email-automation/${id}`, {
      method: 'PUT',
      body: JSON.stringify(automationData),
    })
  },
  delete: async (id: string): Promise<any> => {
    return apiCall(`/email-automation/${id}`, {
      method: 'DELETE',
    })
  },
  run: async (id: string): Promise<any> => {
    return apiCall(`/email-automation/${id}/run`, {
      method: 'POST',
    })
  },
}

// Chatbot API
export const chatbotAPI = {
  createSession: async (platform = 'web'): Promise<any> => {
    return apiCall('/chatbot/session', {
      method: 'POST',
      body: JSON.stringify({ platform }),
    })
  },
  sendMessage: async (message: string, sessionId: string, attachments: File[] = []): Promise<any> => {
    const formData = new FormData()
    if (message) formData.append('message', message)
    if (sessionId) formData.append('sessionId', sessionId)
    attachments.forEach(file => {
      formData.append('attachments', file)
    })

    const token = getAuthToken()
    const response = await fetch(`${API_BASE_URL}/chatbot/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }))
      throw new Error(error.message || 'Request failed')
    }

    return response.json()
  },
  createTicket: async (sessionId: string, ticketData: any): Promise<any> => {
    return apiCall('/chatbot/create-ticket', {
      method: 'POST',
      body: JSON.stringify({ sessionId, ...ticketData }),
    })
  },
  getHistory: async (userId: string | null = null, limit = 50): Promise<any[]> => {
    const params = new URLSearchParams()
    if (userId) params.append('userId', userId)
    params.append('limit', limit.toString())
    return apiCall<any[]>(`/chatbot/history?${params.toString()}`)
  },
  getSession: async (sessionId: string): Promise<any> => {
    return apiCall(`/chatbot/session/${sessionId}`)
  },
  escalate: async (sessionId: string, departmentId: string | null = null): Promise<any> => {
    return apiCall('/chatbot/escalate', {
      method: 'POST',
      body: JSON.stringify({ sessionId, departmentId }),
    })
  },
}

// FAQ API
export const faqAPI = {
  getAll: async (organization: string | null = null, category: string | null = null, search: string | null = null): Promise<any[]> => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    if (category) params.append('category', category)
    if (search) params.append('search', search)
    return apiCall<any[]>(`/faq?${params.toString()}`)
  },
  getById: async (id: string): Promise<any> => {
    return apiCall(`/faq/${id}`)
  },
  create: async (faqData: any): Promise<any> => {
    return apiCall('/faq', {
      method: 'POST',
      body: JSON.stringify(faqData),
    })
  },
  update: async (id: string, faqData: any): Promise<any> => {
    return apiCall(`/faq/${id}`, {
      method: 'PUT',
      body: JSON.stringify(faqData),
    })
  },
  delete: async (id: string): Promise<any> => {
    return apiCall(`/faq/${id}`, {
      method: 'DELETE',
    })
  },
  markHelpful: async (id: string): Promise<any> => {
    return apiCall(`/faq/${id}/helpful`, {
      method: 'POST',
    })
  },
}

// Microsoft Teams API (Admin only)
export const teamsAPI = {
  getConfig: async (organization: string | null = null): Promise<any[]> => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    return apiCall<any[]>(`/teams/config?${params.toString()}`)
  },
  saveConfig: async (configData: any, organization: string | null = null): Promise<any> => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    return apiCall(`/teams/config?${params.toString()}`, {
      method: 'POST',
      body: JSON.stringify(configData),
    })
  },
  updateConfig: async (id: string, configData: any): Promise<any> => {
    return apiCall(`/teams/config/${id}`, {
      method: 'PUT',
      body: JSON.stringify(configData),
    })
  },
  deleteConfig: async (id: string): Promise<any> => {
    return apiCall(`/teams/config/${id}`, {
      method: 'DELETE',
    })
  },
  testWebhook: async (webhookUrl: string, organization: string | null = null): Promise<any> => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    return apiCall(`/teams/test?${params.toString()}`, {
      method: 'POST',
      body: JSON.stringify({ webhookUrl }),
    })
  },
}


