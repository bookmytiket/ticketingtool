// API service for all backend calls
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token')
}

// Helper function for API calls
const apiCall = async (endpoint, options = {}, timeoutMs = 15000) => {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

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
    clearTimeout(timeoutId)
    // Handle request timeout (AbortError)
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. The server is taking too long to respond.')
    }
    // Handle network errors (fetch failures)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your connection and try again.')
    }
    // Re-throw other errors
    throw error
  }
}

// Auth API
export const authAPI = {
  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  register: async (userData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },
  getMe: async () => {
    return apiCall('/auth/me')
  },
}

// Tickets API
export const ticketsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.priority) params.append('priority', filters.priority)
    if (filters.search) params.append('search', filters.search)
    if (filters.organization) params.append('organization', filters.organization)

    const query = params.toString()
    // Use original tickets endpoint expected by the Node/Express backend
    return apiCall(`/tickets${query ? `?${query}` : ''}`)
  },
  getById: async (id) => {
    return apiCall(`/tickets/${id}`)
  },
  create: async (ticketData) => {
    return apiCall('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    })
  },
  createWithFiles: async (formData) => {
    const token = localStorage.getItem('token')

    // Log FormData contents for debugging
    console.log('FormData entries:')
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    }

    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - browser will set it with boundary for multipart/form-data
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error occurred' }))
      console.error('Ticket creation error:', error)
      throw new Error(error.message || 'Failed to create ticket')
    }

    return response.json()
  },
  update: async (id, ticketData) => {
    return apiCall(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ticketData),
    })
  },
  addComment: async (id, comment) => {
    return apiCall(`/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    })
  },
  approveTicket: async (id) => {
    return apiCall(`/tickets/${id}/approve`, {
      method: 'POST',
    })
  },
  rejectTicket: async (id, rejectionReason) => {
    return apiCall(`/tickets/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    })
  },
  getDashboardStats: async (organization = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    const query = params.toString()
    return apiCall(`/tickets/stats/dashboard${query ? `?${query}` : ''}`)
  },
  importTickets: async (ticketsData) => {
    return apiCall('/tickets/import', {
      method: 'POST',
      body: JSON.stringify({ tickets: ticketsData }),
    })
  },
}

// Users API
export const usersAPI = {
  getAll: async (organization = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    const query = params.toString()
    return apiCall(`/users${query ? `?${query}` : ''}`)
  },
  getMentions: async () => {
    return apiCall('/users/mentions')
  },
  getById: async (id) => {
    return apiCall(`/users/${id}`)
  },
  create: async (userData) => {
    return apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },
  update: async (id, userData) => {
    return apiCall(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  },
  delete: async (id) => {
    return apiCall(`/users/${id}`, {
      method: 'DELETE',
    })
  },
}

// Admin API
export const adminAPI = {
  // SSO Config
  getSSOConfig: async () => {
    return apiCall('/admin/sso')
  },
  updateSSOConfig: async (config) => {
    return apiCall('/admin/sso', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  },

  // Email Settings
  getEmailSettings: async () => {
    return apiCall('/admin/email')
  },
  updateEmailSettings: async (settings) => {
    return apiCall('/admin/email', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },
  testSMTP: async (to, settings) => {
    return apiCall('/email/test-smtp', {
      method: 'POST',
      body: JSON.stringify({ to, settings }),
    })
  },
  testIMAP: async (settings) => {
    return apiCall('/email/test-imap', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    })
  },
  sendTestEmail: async (to, subject, html) => {
    return apiCall('/email/send', {
      method: 'POST',
      body: JSON.stringify({ to, subject, html }),
    })
  },

  // Logo
  getLogo: async () => {
    return apiCall('/admin/logo')
  },
  updateLogo: async (logo, filename, showOnLogin, loginTitle = null) => {
    return apiCall('/admin/logo', {
      method: 'POST',
      body: JSON.stringify({ logo, filename, showOnLogin, loginTitle }),
    })
  },

  // Roles
  getRoles: async () => {
    return apiCall('/admin/roles')
  },
  createRole: async (roleData) => {
    return apiCall('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    })
  },
  updateRole: async (id, roleData) => {
    return apiCall(`/admin/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    })
  },
  deleteRole: async (id) => {
    return apiCall(`/admin/roles/${id}`, {
      method: 'DELETE',
    })
  },

  // SLA Policies
  getSLAPolicies: async (organization) => {
    const url = organization ? `/admin/sla?organization=${organization}` : '/admin/sla'
    return apiCall(url)
  },
  createSLAPolicy: async (policyData) => {
    return apiCall('/admin/sla', {
      method: 'POST',
      body: JSON.stringify(policyData),
    })
  },
  updateSLAPolicy: async (id, policyData) => {
    return apiCall(`/admin/sla/${id}`, {
      method: 'PUT',
      body: JSON.stringify(policyData),
    })
  },
  deleteSLAPolicy: async (id) => {
    return apiCall(`/admin/sla/${id}`, {
      method: 'DELETE',
    })
  },

  // Email Templates
  getEmailTemplates: async () => {
    return apiCall('/email-templates')
  },
  getEmailTemplate: async (id) => {
    return apiCall(`/email-templates/${id}`)
  },
  createEmailTemplate: async (templateData) => {
    return apiCall('/email-templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    })
  },
  updateEmailTemplate: async (id, templateData) => {
    return apiCall(`/email-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    })
  },
  deleteEmailTemplate: async (id) => {
    return apiCall(`/email-templates/${id}`, {
      method: 'DELETE',
    })
  },
  previewEmailTemplate: async (id) => {
    return apiCall(`/email-templates/${id}/preview`, {
      method: 'POST',
    })
  },

  // Backup & Restore
  createBackup: async () => {
    return apiCall('/backup/create', {
      method: 'POST',
    })
  },
  listBackups: async () => {
    return apiCall('/backup/list')
  },
  downloadBackup: async (backupName) => {
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
  deleteBackup: async (backupName) => {
    return apiCall(`/backup/${backupName}`, {
      method: 'DELETE',
    })
  },
  restoreBackup: async (backupName, clearExisting = false) => {
    return apiCall('/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ backupName, clearExisting }),
    })
  },
  uploadBackup: async (file, clearExisting = false) => {
    const token = getAuthToken()
    const formData = new FormData()
    formData.append('backupFile', file)
    formData.append('clearExisting', clearExisting ? 'true' : 'false')

    const response = await fetch(`${API_BASE_URL}/backup/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type - let browser set it with boundary for multipart/form-data
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
  getAll: async () => {
    return apiCall('/organizations')
  },
  getById: async (id) => {
    return apiCall(`/organizations/${id}`)
  },
  create: async (orgData) => {
    return apiCall('/organizations', {
      method: 'POST',
      body: JSON.stringify(orgData),
    })
  },
  update: async (id, orgData) => {
    return apiCall(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orgData),
    })
  },
  delete: async (id) => {
    return apiCall(`/organizations/${id}`, {
      method: 'DELETE',
    })
  },
}

// Categories API
export const categoriesAPI = {
  getAll: async () => {
    return apiCall('/categories')
  },
  getAllAdmin: async (organization = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    const query = params.toString()
    return apiCall(`/categories/all${query ? `?${query}` : ''}`)
  },
  getById: async (id) => {
    return apiCall(`/categories/${id}`)
  },
  create: async (categoryData) => {
    return apiCall('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
  },
  update: async (id, categoryData) => {
    return apiCall(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    })
  },
  delete: async (id) => {
    return apiCall(`/categories/${id}`, {
      method: 'DELETE',
    })
  },
}

// Departments API
export const departmentsAPI = {
  getAll: async () => {
    return apiCall('/departments')
  },
  getById: async (id) => {
    return apiCall(`/departments/${id}`)
  },
  create: async (departmentData) => {
    return apiCall('/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    })
  },
  update: async (id, departmentData) => {
    return apiCall(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData),
    })
  },
  delete: async (id) => {
    return apiCall(`/departments/${id}`, {
      method: 'DELETE',
    })
  },
}

// MFA API
export const mfaAPI = {
  getSetup: async () => {
    return apiCall('/mfa/setup')
  },
  verify: async (token) => {
    return apiCall('/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },
  verifyLogin: async (tempToken, code) => {
    return apiCall('/mfa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    })
  },
  disable: async () => {
    return apiCall('/mfa/disable', {
      method: 'POST',
    })
  },
}

// Reports API (Admin only)
export const reportsAPI = {
  getDashboard: async (period = 'month', organization = null) => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    return apiCall(`/reports/dashboard?${params.toString()}`)
  },
  getStatusWise: async (period = 'month', organization = null) => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    return apiCall(`/reports/status-wise?${params.toString()}`)
  },
  getDepartmentWise: async (period = 'month', organization = null) => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    return apiCall(`/reports/department-wise?${params.toString()}`)
  },
  getTechnicianPerformance: async (period = 'month', organization = null) => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    return apiCall(`/reports/technician-performance?${params.toString()}`)
  },
  getSLACompliance: async (period = 'month', organization = null) => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    return apiCall(`/reports/sla-compliance?${params.toString()}`)
  },
  getTrends: async (period = 'month', organization = null, groupBy = 'day') => {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (organization) params.append('organization', organization)
    if (groupBy) params.append('groupBy', groupBy)
    return apiCall(`/reports/trends?${params.toString()}`)
  },
}

// External Integrations API (Admin only)
export const integrationsAPI = {
  getAll: async (organization = null, type = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    if (type) params.append('type', type)
    return apiCall(`/integrations?${params.toString()}`)
  },
  getById: async (id) => {
    return apiCall(`/integrations/${id}`)
  },
  create: async (integrationData) => {
    return apiCall('/integrations', {
      method: 'POST',
      body: JSON.stringify(integrationData),
    })
  },
  update: async (id, integrationData) => {
    return apiCall(`/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(integrationData),
    })
  },
  delete: async (id) => {
    return apiCall(`/integrations/${id}`, {
      method: 'DELETE',
    })
  },
}

// API Keys API (Admin only)
export const apiKeysAPI = {
  getAll: async (organization = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    return apiCall(`/api-keys?${params.toString()}`)
  },
  create: async (apiKeyData) => {
    return apiCall('/api-keys', {
      method: 'POST',
      body: JSON.stringify(apiKeyData),
    })
  },
  update: async (id, apiKeyData) => {
    return apiCall(`/api-keys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiKeyData),
    })
  },
  delete: async (id) => {
    return apiCall(`/api-keys/${id}`, {
      method: 'DELETE',
    })
  },
  revoke: async (id) => {
    return apiCall(`/api-keys/${id}/revoke`, {
      method: 'POST',
    })
  },
  activate: async (id) => {
    return apiCall(`/api-keys/${id}/activate`, {
      method: 'POST',
    })
  },
}

// Email Templates API (Admin only)
export const emailTemplatesAPI = {
  getAll: async (organization = null, type = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    if (type) params.append('type', type)
    return apiCall(`/email-templates?${params.toString()}`)
  },
  getById: async (id) => {
    return apiCall(`/email-templates/${id}`)
  },
  create: async (templateData) => {
    return apiCall('/email-templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    })
  },
  update: async (id, templateData) => {
    return apiCall(`/email-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    })
  },
  delete: async (id) => {
    return apiCall(`/email-templates/${id}`, {
      method: 'DELETE',
    })
  },
  preview: async (id) => {
    return apiCall(`/email-templates/${id}/preview`, {
      method: 'POST',
    })
  },
}

// Email Automation API (Admin only)
export const emailAutomationAPI = {
  getAll: async (organization = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    return apiCall(`/email-automation?${params.toString()}`)
  },
  getById: async (id) => {
    return apiCall(`/email-automation/${id}`)
  },
  create: async (automationData) => {
    return apiCall('/email-automation', {
      method: 'POST',
      body: JSON.stringify(automationData),
    })
  },
  update: async (id, automationData) => {
    return apiCall(`/email-automation/${id}`, {
      method: 'PUT',
      body: JSON.stringify(automationData),
    })
  },
  delete: async (id) => {
    return apiCall(`/email-automation/${id}`, {
      method: 'DELETE',
    })
  },
  run: async (id) => {
    return apiCall(`/email-automation/${id}/run`, {
      method: 'POST',
    })
  },
}

// Chatbot API
export const chatbotAPI = {
  createSession: async (platform = 'web') => {
    return apiCall('/chatbot/session', {
      method: 'POST',
      body: JSON.stringify({ platform }),
    })
  },
  sendMessage: async (message, sessionId, attachments = []) => {
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
  createTicket: async (sessionId, ticketData) => {
    return apiCall('/chatbot/create-ticket', {
      method: 'POST',
      body: JSON.stringify({ sessionId, ...ticketData }),
    })
  },
  getHistory: async (userId = null, limit = 50) => {
    const params = new URLSearchParams()
    if (userId) params.append('userId', userId)
    params.append('limit', limit)
    return apiCall(`/chatbot/history?${params.toString()}`)
  },
  getSession: async (sessionId) => {
    return apiCall(`/chatbot/session/${sessionId}`)
  },
  escalate: async (sessionId, departmentId = null) => {
    return apiCall('/chatbot/escalate', {
      method: 'POST',
      body: JSON.stringify({ sessionId, departmentId }),
    })
  },
}

// FAQ API
export const faqAPI = {
  getAll: async (organization = null, category = null, search = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    if (category) params.append('category', category)
    if (search) params.append('search', search)
    return apiCall(`/faq?${params.toString()}`)
  },
  getById: async (id) => {
    return apiCall(`/faq/${id}`)
  },
  create: async (faqData) => {
    return apiCall('/faq', {
      method: 'POST',
      body: JSON.stringify(faqData),
    })
  },
  update: async (id, faqData) => {
    return apiCall(`/faq/${id}`, {
      method: 'PUT',
      body: JSON.stringify(faqData),
    })
  },
  delete: async (id) => {
    return apiCall(`/faq/${id}`, {
      method: 'DELETE',
    })
  },
  markHelpful: async (id) => {
    return apiCall(`/faq/${id}/helpful`, {
      method: 'POST',
    })
  },
}

// Microsoft Teams API (Admin only)
export const teamsAPI = {
  getConfig: async (organization = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    return apiCall(`/teams/config?${params.toString()}`)
  },
  saveConfig: async (configData, organization = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    return apiCall(`/teams/config?${params.toString()}`, {
      method: 'POST',
      body: JSON.stringify(configData),
    })
  },
  updateConfig: async (id, configData) => {
    return apiCall(`/teams/config/${id}`, {
      method: 'PUT',
      body: JSON.stringify(configData),
    })
  },
  deleteConfig: async (id) => {
    return apiCall(`/teams/config/${id}`, {
      method: 'DELETE',
    })
  },
  testWebhook: async (webhookUrl, organization = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    return apiCall(`/teams/test?${params.toString()}`, {
      method: 'POST',
      body: JSON.stringify({ webhookUrl }),
    })
  },
}

