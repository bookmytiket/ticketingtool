/**
 * SLA Engine - Automated SLA monitoring and escalation
 * Handles:
 * - SLA breach detection
 * - Escalation emails
 * - Auto status updates
 * - Notifications to department heads
 */

import supabase from '../config/supabase.js'
import { sendEmail } from '../services/emailService.js'
import { checkSLAStatus } from '../config/sla.js'

/**
 * Check all tickets for SLA breaches and escalate
 */
export const checkSLACompliance = async () => {
  try {
    const now = new Date()

    // Find all active tickets via Supabase
    const { data: activeTickets, error: ticketError } = await supabase
      .from('tickets')
      .select('*, creator:users!creator_id(name, email), assignee:users!assignee_id(name, email), department:departments(name, head_id), organization:organizations(name)')
      .in('status', ['open', 'approval-pending', 'approved', 'in-progress'])

    if (ticketError) throw ticketError

    const breaches = []
    const warnings = []

    for (const ticket of activeTickets) {
      const updates = {}
      let needsUpdate = false

      // Check response SLA
      if (ticket.response_due_date) {
        const responseStatus = checkSLAStatus(
          new Date(ticket.created_at),
          new Date(ticket.response_due_date),
          ticket.status
        )

        // Check if response is overdue
        if (responseStatus.isOverdue && !ticket.sla_response_breached) {
          updates.sla_response_breached = true
          updates.sla_response_breached_at = now.toISOString()
          needsUpdate = true
          breaches.push({
            ticket,
            type: 'response',
            dueDate: new Date(ticket.response_due_date),
          })
        }

        // Check if response is approaching deadline (80% of time elapsed)
        const createdAt = new Date(ticket.created_at).getTime()
        const responseDueDate = new Date(ticket.response_due_date).getTime()
        const timeElapsed = now.getTime() - createdAt
        const totalTime = responseDueDate - createdAt
        const percentageElapsed = (timeElapsed / totalTime) * 100

        if (percentageElapsed >= 80 && !ticket.sla_response_warning_sent) {
          updates.sla_response_warning_sent = true
          needsUpdate = true
          warnings.push({
            ticket,
            type: 'response',
            percentageElapsed,
          })
        }
      }

      // Check resolution SLA
      if (ticket.due_date) {
        const resolutionStatus = checkSLAStatus(
          new Date(ticket.created_at),
          new Date(ticket.due_date),
          ticket.status
        )

        // Check if resolution is overdue
        if (resolutionStatus.isOverdue && !ticket.sla_resolution_breached) {
          updates.sla_resolution_breached = true
          updates.sla_resolution_breached_at = now.toISOString()
          needsUpdate = true
          breaches.push({
            ticket,
            type: 'resolution',
            dueDate: new Date(ticket.due_date),
          })
        }

        // Check if resolution is approaching deadline (80% of time elapsed)
        const createdAt = new Date(ticket.created_at).getTime()
        const dueDate = new Date(ticket.due_date).getTime()
        const timeElapsed = now.getTime() - createdAt
        const totalTime = dueDate - createdAt
        const percentageElapsed = (timeElapsed / totalTime) * 100

        if (percentageElapsed >= 80 && !ticket.sla_resolution_warning_sent) {
          updates.sla_resolution_warning_sent = true
          needsUpdate = true
          warnings.push({
            ticket,
            type: 'resolution',
            percentageElapsed,
          })
        }
      }

      if (needsUpdate) {
        await supabase
          .from('tickets')
          .update(updates)
          .eq('id', ticket.id)
      }
    }

    // Send escalation emails for breaches
    for (const breach of breaches) {
      await sendSLAEscalationEmail(breach)

      // Send Teams notification (async)
      import('./teamsService.js').then(({ notifySLABreach }) => {
        const ticketOrg = breach.ticket.organization_id
        notifySLABreach(breach.ticket, breach.type === 'response' ? 'Response' : 'Resolution', ticketOrg)
          .catch(err => console.error('Teams SLA breach notification error:', err))
      })
    }

    // Send warning emails
    for (const warning of warnings) {
      await sendSLAWarningEmail(warning)
    }

    return {
      checked: activeTickets.length,
      breaches: breaches.length,
      warnings: warnings.length,
    }
  } catch (error) {
    console.error('SLA compliance check error:', error)
    throw error
  }
}

/**
 * Send escalation email for SLA breach
 */
const sendSLAEscalationEmail = async ({ ticket, type, dueDate }) => {
  try {
    const recipients = []

    // Add ticket creator
    if (ticket.creator?.email) {
      recipients.push(ticket.creator.email)
    }

    // Add assignee
    if (ticket.assignee?.email) {
      recipients.push(ticket.assignee.email)
    }

    // Add department head
    if (ticket.department?.head_id) {
      const { data: deptHead } = await supabase
        .from('users')
        .select('email')
        .eq('id', ticket.department.head_id)
        .single()
      if (deptHead?.email) {
        recipients.push(deptHead.email)
      }
    }

    // Add all admins
    const { data: admins } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'admin')

    admins?.forEach(admin => {
      if (admin.email) {
        recipients.push(admin.email)
      }
    })

    const uniqueRecipients = [...new Set(recipients)]
    const slaType = type === 'response' ? 'Response' : 'Resolution'
    const hoursOverdue = Math.abs((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60))
    const ticketIdString = ticket.ticket_id_int ? `#${ticket.ticket_id_int}` : `#${ticket.id}`

    const subject = `🚨 SLA BREACH: Ticket ${ticketIdString} - ${slaType} Time Exceeded`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">SLA Breach Alert</h2>
        <p><strong>Ticket ${ticketIdString}</strong> has exceeded its ${slaType.toLowerCase()} SLA.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <p><strong>Ticket Details:</strong></p>
          <ul>
            <li><strong>Title:</strong> ${ticket.title}</li>
            <li><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${ticket.status}</li>
            <li><strong>Department:</strong> ${ticket.department?.name || 'N/A'}</li>
            <li><strong>${slaType} Due Date:</strong> ${new Date(dueDate).toLocaleString()}</li>
            <li><strong>Time Overdue:</strong> ${hoursOverdue.toFixed(1)} hours</li>
          </ul>
        </div>

        <p>Please take immediate action to resolve this ticket.</p>
        
        <p style="margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.id}" 
             style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Ticket
          </a>
        </p>
      </div>
    `

    for (const recipient of uniqueRecipients) {
      await sendEmail(recipient, subject, html)
    }
  } catch (error) {
    console.error('SLA escalation email error:', error)
  }
}

/**
 * Send warning email for approaching SLA deadline
 */
const sendSLAWarningEmail = async ({ ticket, type, percentageElapsed }) => {
  try {
    const recipients = []

    // Add assignee
    if (ticket.assignee?.email) {
      recipients.push(ticket.assignee.email)
    }

    // Add department head
    if (ticket.department?.head_id) {
      const { data: deptHead } = await supabase
        .from('users')
        .select('email')
        .eq('id', ticket.department.head_id)
        .single()
      if (deptHead?.email) {
        recipients.push(deptHead.email)
      }
    }

    const uniqueRecipients = [...new Set(recipients)]
    if (uniqueRecipients.length === 0) return

    const slaType = type === 'response' ? 'Response' : 'Resolution'
    const dueDateString = type === 'response' ? ticket.response_due_date : ticket.due_date
    const dueDate = new Date(dueDateString)
    const timeRemaining = dueDate.getTime() - new Date().getTime()
    const hoursRemaining = timeRemaining / (1000 * 60 * 60)
    const ticketIdString = ticket.ticket_id_int ? `#${ticket.ticket_id_int}` : `#${ticket.id}`

    const subject = `⚠️ SLA Warning: Ticket ${ticketIdString} - ${slaType} Deadline Approaching`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">SLA Warning</h2>
        <p><strong>Ticket ${ticketIdString}</strong> is approaching its ${slaType.toLowerCase()} SLA deadline.</p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <p><strong>Ticket Details:</strong></p>
          <ul>
            <li><strong>Title:</strong> ${ticket.title}</li>
            <li><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${ticket.status}</li>
            <li><strong>${slaType} Due Date:</strong> ${new Date(dueDate).toLocaleString()}</li>
            <li><strong>Time Remaining:</strong> ${hoursRemaining.toFixed(1)} hours</li>
            <li><strong>Progress:</strong> ${percentageElapsed.toFixed(1)}% of SLA time elapsed</li>
          </ul>
        </div>

        <p>Please ensure this ticket is addressed before the deadline.</p>
        
        <p style="margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.id}" 
             style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Ticket
          </a>
        </p>
      </div>
    `

    for (const recipient of uniqueRecipients) {
      await sendEmail(recipient, subject, html)
    }
  } catch (error) {
    console.error('SLA warning email error:', error)
  }
}

/**
 * Auto-update ticket status based on SLA
 */
export const autoUpdateTicketStatus = async () => {
  try {
    const now = new Date().toISOString()

    // Find tickets that are overdue and still open via Supabase
    const { data: overdueTickets, error } = await supabase
      .from('tickets')
      .select('*, department:departments(name, head_id)')
      .in('status', ['open', 'approved'])
      .lt('due_date', now)

    if (error) throw error

    for (const ticket of overdueTickets) {
      // Auto-escalate to department head if not already assigned
      if (!ticket.assignee_id && ticket.department?.head_id) {
        const { error: updateError } = await supabase
          .from('tickets')
          .update({
            assignee_id: ticket.department.head_id,
            status: 'in-progress'
          })
          .eq('id', ticket.id)

        if (updateError) throw updateError

        // Notify department head
        const { data: deptHead } = await supabase
          .from('users')
          .select('email')
          .eq('id', ticket.department.head_id)
          .single()

        if (deptHead?.email) {
          const ticketIdString = ticket.ticket_id_int ? `#${ticket.ticket_id_int}` : `#${ticket.id}`
          await sendEmail(
            deptHead.email,
            `Ticket ${ticketIdString} Auto-Assigned - SLA Overdue`,
            `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Ticket Auto-Assigned</h2>
                <p>Ticket ${ticketIdString} has been automatically assigned to you due to SLA breach.</p>
                <p><strong>Title:</strong> ${ticket.title}</p>
                <p><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.id}">View Ticket</a></p>
              </div>
            `
          )
        }
      }
    }

    return { updated: overdueTickets.length }
  } catch (error) {
    console.error('Auto-update ticket status error:', error)
    throw error
  }
}

export default {
  checkSLACompliance,
  autoUpdateTicketStatus,
}
