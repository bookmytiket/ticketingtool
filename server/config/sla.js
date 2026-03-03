/**
 * SLA (Service Level Agreement) Configuration
 * Defines Response and Resolution times based on ticket priority
 * Times are in hours
 */

export const SLA_POLICIES = {
  urgent: {
    responseTime: 1,      // 1 hour to respond
    resolutionTime: 4,   // 4 hours to resolve
    name: 'Urgent',
  },
  high: {
    responseTime: 4,      // 4 hours to respond
    resolutionTime: 24,   // 24 hours (1 day) to resolve
    name: 'High',
  },
  medium: {
    responseTime: 8,      // 8 hours to respond
    resolutionTime: 72,   // 72 hours (3 days) to resolve
    name: 'Medium',
  },
  low: {
    responseTime: 24,     // 24 hours (1 day) to respond
    resolutionTime: 168,  // 168 hours (7 days) to resolve
    name: 'Low',
  },
}

/**
 * Calculate due date based on SLA policy
 * @param {Date} createdAt - Ticket creation date
 * @param {string} priority - Ticket priority (urgent, high, medium, low)
 * @returns {Date} - Due date for ticket resolution
 */
export const calculateDueDate = (createdAt, priority) => {
  const policy = SLA_POLICIES[priority] || SLA_POLICIES.medium
  const dueDate = new Date(createdAt)
  dueDate.setHours(dueDate.getHours() + policy.resolutionTime)
  return dueDate
}

/**
 * Calculate response due date based on SLA policy
 * @param {Date} createdAt - Ticket creation date
 * @param {string} priority - Ticket priority (urgent, high, medium, low)
 * @returns {Date} - Due date for first response
 */
export const calculateResponseDueDate = (createdAt, priority) => {
  const policy = SLA_POLICIES[priority] || SLA_POLICIES.medium
  const responseDueDate = new Date(createdAt)
  responseDueDate.setHours(responseDueDate.getHours() + policy.responseTime)
  return responseDueDate
}

/**
 * Check if ticket is within SLA
 * @param {Date} createdAt - Ticket creation date
 * @param {Date} dueDate - Ticket due date
 * @param {string} status - Current ticket status
 * @returns {Object} - { isWithinSLA: boolean, timeRemaining: number, isOverdue: boolean }
 */
export const checkSLAStatus = (createdAt, dueDate, status) => {
  if (!dueDate) {
    return { isWithinSLA: true, timeRemaining: null, isOverdue: false }
  }

  const now = new Date()
  const timeRemaining = dueDate.getTime() - now.getTime()
  const isOverdue = timeRemaining < 0 && (status === 'open' || status === 'in-progress')
  const isWithinSLA = !isOverdue

  return {
    isWithinSLA,
    timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
    isOverdue,
  }
}

export default {
  SLA_POLICIES,
  calculateDueDate,
  calculateResponseDueDate,
  checkSLAStatus,
}

