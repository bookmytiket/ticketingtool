/**
 * Microsoft Teams Service
 * Handles sending notifications and messages to Microsoft Teams
 */

import supabase from '../config/supabase.js'

/**
 * Send message to Teams channel via webhook
 */
export const sendTeamsMessage = async (webhookUrl, message, options = {}) => {
  try {
    const card = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: options.summary || message.title || 'Ticket Notification',
      themeColor: options.themeColor || getThemeColor(options.type),
      title: message.title || 'Ticket Notification',
      text: message.text || '',
      sections: message.sections || [],
      potentialAction: message.actions || [],
    }

    if (message.facts) {
      card.sections = card.sections || []
      card.sections.push({
        facts: message.facts,
      })
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(card),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Teams webhook failed: ${response.status} ${errorText}`)
    }

    let responseData = {}
    try {
      responseData = await response.json()
    } catch (e) {
      // Teams webhook sometimes returns plain text success response
    }
    return { success: true, response: responseData }
  } catch (error) {
    console.error('Teams webhook error:', error.message)
    throw error
  }
}

/**
 * Get theme color based on notification type
 */
const getThemeColor = (type) => {
  const colors = {
    ticketCreated: '0078D4',
    ticketUpdated: 'FF8C00',
    ticketResolved: '107C10',
    ticketClosed: '6B7280',
    slaBreach: 'DC2626',
    ticketAssigned: '2563EB',
    ticketCommented: '8B5CF6',
  }
  return colors[type] || '0078D4'
}

/**
 * Send ticket created notification
 */
export const notifyTicketCreated = async (ticket, organizationId = null) => {
  try {
    const config = await getTeamsConfig(organizationId)
    if (!config || !config.is_enabled || !config.webhook_url || !config.notifications?.ticketCreated) {
      return { sent: false, message: 'Teams notification not enabled' }
    }

    if (!isWithinWorkingHours(config)) {
      return { sent: false, message: 'Outside working hours' }
    }

    const ticketIdString = ticket.ticket_id_int ? `#${ticket.ticket_id_int}` : (ticket.ticket_id ? `#${ticket.ticket_id}` : `#${ticket.id}`)

    const message = {
      title: `🎫 New Ticket Created: ${ticketIdString}`,
      text: ticket.title,
      facts: [
        { name: 'Ticket ID', value: ticketIdString },
        { name: 'Title', value: ticket.title },
        { name: 'Priority', value: (ticket.priority || 'medium').toUpperCase() },
        { name: 'Category', value: ticket.category || 'General' },
        { name: 'Created By', value: ticket.creator?.name || 'Unknown' },
        { name: 'Department', value: ticket.department?.name || 'N/A' },
      ],
      actions: [
        {
          '@type': 'OpenUri',
          name: 'View Ticket',
          targets: [
            {
              os: 'default',
              uri: `${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.id || ticket._id}`,
            },
          ],
        },
      ],
    }

    const webhookUrl = getWebhookUrlForDepartment(config, ticket.department_id || ticket.department)
    await sendTeamsMessage(webhookUrl, message, {
      type: 'ticketCreated',
      summary: `New ticket ${ticketIdString} created`,
    })

    return { sent: true }
  } catch (error) {
    console.error('Teams ticket created notification error:', error)
    return { sent: false, error: error.message }
  }
}

/**
 * Send ticket updated notification
 */
export const notifyTicketUpdated = async (ticket, changes, organizationId = null) => {
  try {
    const config = await getTeamsConfig(organizationId)
    if (!config || !config.is_enabled || !config.webhook_url || !config.notifications?.ticketUpdated) {
      return { sent: false }
    }

    if (!isWithinWorkingHours(config)) {
      return { sent: false, message: 'Outside working hours' }
    }

    const changeFacts = Object.entries(changes).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: String(value),
    }))

    const ticketIdString = ticket.ticket_id_int ? `#${ticket.ticket_id_int}` : (ticket.ticket_id ? `#${ticket.ticket_id}` : `#${ticket.id}`)

    const message = {
      title: `📝 Ticket Updated: ${ticketIdString}`,
      text: ticket.title,
      facts: [
        { name: 'Ticket ID', value: ticketIdString },
        ...changeFacts,
      ],
      actions: [
        {
          '@type': 'OpenUri',
          name: 'View Ticket',
          targets: [
            {
              os: 'default',
              uri: `${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.id || ticket._id}`,
            },
          ],
        },
      ],
    }

    const webhookUrl = getWebhookUrlForDepartment(config, ticket.department_id || ticket.department)
    await sendTeamsMessage(webhookUrl, message, {
      type: 'ticketUpdated',
      summary: `Ticket ${ticketIdString} updated`,
    })

    return { sent: true }
  } catch (error) {
    console.error('Teams ticket updated notification error:', error)
    return { sent: false }
  }
}

/**
 * Send ticket resolved notification
 */
export const notifyTicketResolved = async (ticket, organizationId = null) => {
  try {
    const config = await getTeamsConfig(organizationId)
    if (!config || !config.is_enabled || !config.webhook_url || !config.notifications?.ticketResolved) {
      return { sent: false }
    }

    const ticketIdString = ticket.ticket_id_int ? `#${ticket.ticket_id_int}` : (ticket.ticket_id ? `#${ticket.ticket_id}` : `#${ticket.id}`)

    const message = {
      title: `✅ Ticket Resolved: ${ticketIdString}`,
      text: ticket.title,
      facts: [
        { name: 'Ticket ID', value: ticketIdString },
        { name: 'Resolved By', value: ticket.assignee?.name || 'System' },
        { name: 'Priority', value: (ticket.priority || 'medium').toUpperCase() },
      ],
      actions: [
        {
          '@type': 'OpenUri',
          name: 'View Ticket',
          targets: [
            {
              os: 'default',
              uri: `${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.id || ticket._id}`,
            },
          ],
        },
      ],
    }

    const webhookUrl = getWebhookUrlForDepartment(config, ticket.department_id || ticket.department)
    await sendTeamsMessage(webhookUrl, message, {
      type: 'ticketResolved',
      summary: `Ticket ${ticketIdString} resolved`,
      themeColor: '107C10',
    })

    return { sent: true }
  } catch (error) {
    console.error('Teams ticket resolved notification error:', error)
    return { sent: false }
  }
}

/**
 * Send SLA breach notification
 */
export const notifySLABreach = async (ticket, breachType, organizationId = null) => {
  try {
    const config = await getTeamsConfig(organizationId)
    if (!config || !config.is_enabled || !config.webhook_url || !config.notifications?.slaBreach) {
      return { sent: false }
    }

    const ticketIdString = ticket.ticket_id_int ? `#${ticket.ticket_id_int}` : (ticket.ticket_id ? `#${ticket.ticket_id}` : `#${ticket.id}`)

    const message = {
      title: `🚨 SLA BREACH: ${ticketIdString}`,
      text: `${breachType} SLA has been breached for ticket ${ticketIdString}`,
      facts: [
        { name: 'Ticket ID', value: ticketIdString },
        { name: 'Title', value: ticket.title },
        { name: 'Priority', value: (ticket.priority || 'medium').toUpperCase() },
        { name: 'Breach Type', value: breachType },
        { name: 'Department', value: ticket.department?.name || 'N/A' },
      ],
      actions: [
        {
          '@type': 'OpenUri',
          name: 'View Ticket',
          targets: [
            {
              os: 'default',
              uri: `${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.id || ticket._id}`,
            },
          ],
        },
      ],
    }

    const webhookUrl = getWebhookUrlForDepartment(config, ticket.department_id || ticket.department)
    await sendTeamsMessage(webhookUrl, message, {
      type: 'slaBreach',
      summary: `SLA breach for ticket ${ticketIdString}`,
      themeColor: 'DC2626',
    })

    return { sent: true }
  } catch (error) {
    console.error('Teams SLA breach notification error:', error)
    return { sent: false }
  }
}

/**
 * Send ticket assigned notification
 */
export const notifyTicketAssigned = async (ticket, assignee, organizationId = null) => {
  try {
    const config = await getTeamsConfig(organizationId)
    if (!config || !config.is_enabled || !config.webhook_url || !config.notifications?.ticketAssigned) {
      return { sent: false }
    }

    const ticketIdString = ticket.ticket_id_int ? `#${ticket.ticket_id_int}` : (ticket.ticket_id ? `#${ticket.ticket_id}` : `#${ticket.id}`)

    const message = {
      title: `👤 Ticket Assigned: ${ticketIdString}`,
      text: `Ticket ${ticketIdString} has been assigned to ${assignee?.name || 'Unassigned'}`,
      facts: [
        { name: 'Ticket ID', value: ticketIdString },
        { name: 'Title', value: ticket.title },
        { name: 'Assigned To', value: assignee?.name || 'Unassigned' },
        { name: 'Priority', value: (ticket.priority || 'medium').toUpperCase() },
      ],
      actions: [
        {
          '@type': 'OpenUri',
          name: 'View Ticket',
          targets: [
            {
              os: 'default',
              uri: `${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.id || ticket._id}`,
            },
          ],
        },
      ],
    }

    const webhookUrl = getWebhookUrlForDepartment(config, ticket.department_id || ticket.department)
    await sendTeamsMessage(webhookUrl, message, {
      type: 'ticketAssigned',
      summary: `Ticket ${ticketIdString} assigned`,
    })

    return { sent: true }
  } catch (error) {
    console.error('Teams ticket assigned notification error:', error)
    return { sent: false }
  }
}

/**
 * Test Teams webhook
 */
export const testTeamsWebhook = async (webhookUrl) => {
  try {
    const message = {
      title: '✅ Teams Integration Test',
      text: 'This is a test message from the Ticketing Tool. If you receive this, your Teams integration is working correctly!',
      facts: [
        { name: 'Status', value: 'Connected' },
        { name: 'Time', value: new Date().toLocaleString() },
      ],
    }

    await sendTeamsMessage(webhookUrl, message, {
      type: 'test',
      summary: 'Teams integration test',
      themeColor: '107C10',
    })

    return { success: true }
  } catch (error) {
    console.error('Teams webhook test error:', error)
    throw error
  }
}

/**
 * Get Teams config for organization
 */
const getTeamsConfig = async (organizationId) => {
  let query = supabase.from('teams_config').select('*')
  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  } else {
    query = query.is('organization_id', null)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('Error fetching Teams config:', error)
    return null
  }
  return data
}

/**
 * Get webhook URL for department (if department routing is configured)
 */
const getWebhookUrlForDepartment = (config, department) => {
  if (!department || !config.department_routing || config.department_routing.length === 0) {
    return config.webhook_url
  }

  // Handle both ID and object
  const deptId = typeof department === 'object' ? (department.id || department._id) : department

  const deptRoute = config.department_routing.find(
    route => (route.department_id || route.department)?.toString() === deptId?.toString()
  )

  // If department has specific webhook, use it; otherwise use default
  // For now, return the main webhook URL as per original logic
  return config.webhook_url
}

/**
 * Check if current time is within working hours
 */
const isWithinWorkingHours = (config) => {
  const workingHours = config.working_hours || {}
  if (!workingHours.enabled) {
    return true // Always send if working hours not configured
  }

  const now = new Date()
  const currentDay = now.getDay()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  // Check if current day is in allowed days
  if (workingHours.daysOfWeek && workingHours.daysOfWeek.length > 0) {
    if (!workingHours.daysOfWeek.includes(currentDay)) {
      return false
    }
  }

  // Check if current time is within working hours
  const startTime = workingHours.startTime || '09:00'
  const endTime = workingHours.endTime || '17:00'

  return currentTime >= startTime && currentTime <= endTime
}

export default {
  sendTeamsMessage,
  notifyTicketCreated,
  notifyTicketUpdated,
  notifyTicketResolved,
  notifySLABreach,
  notifyTicketAssigned,
  testTeamsWebhook,
}
