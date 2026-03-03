/**
 * Email Automation Service
 * Handles scheduled email automation for daily open tickets and reports
 */

import supabase from '../config/supabase.js'
import { sendEmail } from './emailService.js'
import { checkSLAStatus } from '../config/sla.js'

// Helper function to format dates
const formatDate = (date, formatStr = 'MMMM dd, yyyy') => {
  const d = new Date(date)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  if (formatStr === 'MMMM dd, yyyy') {
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`
  } else if (formatStr === 'MMM dd, yyyy') {
    return `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`
  } else if (formatStr === 'MMM dd') {
    return `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`
  } else if (formatStr === 'MMMM yyyy') {
    return `${months[d.getMonth()]} ${d.getFullYear()}`
  } else if (formatStr === 'MMM dd, yyyy HH:mm') {
    return `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return d.toLocaleDateString()
}

/**
 * Get priority color
 */
const getPriorityColor = (priority) => {
  const colors = {
    urgent: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#10b981',
  }
  return colors[priority] || '#6b7280'
}

/**
 * Render template with variables
 */
const renderTemplate = (template, data) => {
  let rendered = template

  rendered = rendered.replace(/\{\{tickets\}\}/g, JSON.stringify(data.tickets || []))
  rendered = rendered.replace(/\{\{totalTickets\}\}/g, data.totalTickets || data.totalCreated || 0)
  rendered = rendered.replace(/\{\{date\}\}/g, data.date || formatDate(new Date(), 'MMMM dd, yyyy'))
  rendered = rendered.replace(/\{\{period\}\}/g, data.period || '')

  if (typeof data === 'object') {
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      rendered = rendered.replace(regex, typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key])
    })
  }

  return rendered
}

/**
 * Generate open tickets email HTML
 */
const generateOpenTicketsEmail = (tickets, organizationId) => {
  const ticketsHtml = tickets.map(ticket => {
    const timeElapsed = Math.floor((new Date() - new Date(ticket.created_at)) / (1000 * 60 * 60))
    const isOverdue = ticket.due_date && new Date(ticket.due_date) < new Date()

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px;">#${ticket.ticket_id_int || ticket.id}</td>
        <td style="padding: 12px;">${ticket.title}</td>
        <td style="padding: 12px;"><span style="background: ${getPriorityColor(ticket.priority)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${ticket.priority}</span></td>
        <td style="padding: 12px;">${ticket.department?.name || 'N/A'}</td>
        <td style="padding: 12px;">${ticket.assignee?.name || 'Unassigned'}</td>
        <td style="padding: 12px;">${ticket.due_date ? formatDate(new Date(ticket.due_date), 'MMM dd, yyyy HH:mm') : 'N/A'}</td>
        <td style="padding: 12px; color: ${isOverdue ? '#ef4444' : '#6b7280'};">${timeElapsed}h ${isOverdue ? '⚠️' : ''}</td>
      </tr>
    `
  }).join('')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Daily Open Tickets Report</h2>
      <p>Total Open Tickets: <strong>${tickets.length}</strong></p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left;">Ticket ID</th>
            <th style="padding: 12px; text-align: left;">Title</th>
            <th style="padding: 12px; text-align: left;">Priority</th>
            <th style="padding: 12px; text-align: left;">Department</th>
            <th style="padding: 12px; text-align: left;">Assigned To</th>
            <th style="padding: 12px; text-align: left;">SLA Deadline</th>
            <th style="padding: 12px; text-align: left;">Time Elapsed</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.length > 0 ? ticketsHtml : '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #6b7280;">No open tickets</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

/**
 * Generate daily report email HTML
 */
const generateDailyReportEmail = (data) => {
  const deptSummary = data.departmentSummary.map(dept =>
    `<li>${dept.departmentName || 'Unassigned'}: ${dept.count} tickets</li>`
  ).join('')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Daily Report - ${data.date}</h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Summary</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 8px 0;"><strong>Total Tickets Created:</strong> ${data.totalCreated}</li>
          <li style="padding: 8px 0;"><strong>Total Open Tickets:</strong> ${data.totalOpen}</li>
          <li style="padding: 8px 0;"><strong>Tickets Resolved Today:</strong> ${data.totalResolved}</li>
          <li style="padding: 8px 0; color: ${data.slaBreached > 0 ? '#ef4444' : '#10b981'};"><strong>Tickets Breaching SLA:</strong> ${data.slaBreached}</li>
        </ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Department-wise Summary</h3>
        <ul>${deptSummary || '<li>No department data</li>'}</ul>
      </div>
    </div>
  `
}

/**
 * Generate weekly report email HTML
 */
const generateWeeklyReportEmail = (data) => {
  const techPerf = data.technicianPerformance.map(tech =>
    `<li>${tech.name || 'Unknown'}: ${tech.resolved}/${tech.total} resolved (${((tech.resolved / tech.total) * 100).toFixed(1)}%)</li>`
  ).join('')

  const topIssues = data.topIssues.map(issue =>
    `<li>${issue._id}: ${issue.count} tickets</li>`
  ).join('')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Weekly Report - ${data.startDate} to ${data.endDate}</h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Summary</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 8px 0;"><strong>Total Tickets Created:</strong> ${data.totalCreated}</li>
          <li style="padding: 8px 0;"><strong>Resolved:</strong> ${data.resolved}</li>
          <li style="padding: 8px 0;"><strong>Unresolved:</strong> ${data.unresolved}</li>
          <li style="padding: 8px 0;"><strong>SLA Compliant:</strong> ${data.slaCompliant}</li>
          <li style="padding: 8px 0; color: ${data.slaBreached > 0 ? '#ef4444' : '#10b981'};"><strong>SLA Breached:</strong> ${data.slaBreached}</li>
        </ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Technician Performance</h3>
        <ul>${techPerf || '<li>No data</li>'}</ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Top 10 Issues</h3>
        <ul>${topIssues || '<li>No data</li>'}</ul>
      </div>
    </div>
  `
}

/**
 * Generate monthly report email HTML
 */
const generateMonthlyReportEmail = (data) => {
  const deptTrends = data.departmentTrends.map(dept =>
    `<li>${dept.departmentName || 'Unassigned'}: ${dept.count} tickets</li>`
  ).join('')

  const techProd = data.technicianProductivity.map(tech =>
    `<li>${tech.name || 'Unknown'}: ${tech.resolved}/${tech.total} resolved (${tech.resolutionRate?.toFixed(1) || 0}%)</li>`
  ).join('')

  const recurring = data.recurringIssues.map(issue =>
    `<li>${issue._id}: ${issue.count} occurrences</li>`
  ).join('')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Monthly Report - ${data.month}</h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Summary</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 8px 0;"><strong>Total Tickets:</strong> ${data.totalCreated}</li>
          <li style="padding: 8px 0; color: ${data.slaViolations > 0 ? '#ef4444' : '#10b981'};"><strong>SLA Violations:</strong> ${data.slaViolations}</li>
          <li style="padding: 8px 0;"><strong>SLA Compliance Rate:</strong> ${data.slaComplianceRate}%</li>
        </ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Department-wise Trends</h3>
        <ul>${deptTrends || '<li>No data</li>'}</ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Technician Productivity</h3>
        <ul>${techProd || '<li>No data</li>'}</ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Recurring Issues</h3>
        <ul>${recurring || '<li>No recurring issues</li>'}</ul>
      </div>
    </div>
  `
}

/**
 * Get recipients based on automation config
 */
const getRecipients = async (recipientConfig, organizationId, includeTechnicians = false) => {
  const recipients = []

  if (recipientConfig.admins) {
    const { data } = await supabase.from('users').select('email').eq('role', 'admin')
    data?.forEach(u => u.email && recipients.push(u.email))
  }

  if (recipientConfig.organizationManagers && organizationId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('manager:users!manager_id(email)')
      .eq('id', organizationId)
      .single()
    if (org?.manager?.email) recipients.push(org.manager.email)
  }

  if (recipientConfig.departmentHeads) {
    const { data: heads } = await supabase.from('users').select('email, department_id').eq('role', 'department-head')

    if (organizationId) {
      const { data: depts } = await supabase.from('departments').select('id').eq('organization_id', organizationId)
      const deptIds = depts?.map(d => d.id) || []
      heads?.forEach(h => {
        if (h.department_id && deptIds.includes(h.department_id) && h.email) recipients.push(h.email)
      })
    } else {
      heads?.forEach(h => h.email && recipients.push(h.email))
    }
  }

  if (includeTechnicians && recipientConfig.technicians) {
    let techQuery = supabase.from('users').select('email').eq('role', 'technician')
    if (organizationId) techQuery = techQuery.eq('organization_id', organizationId)
    const { data } = await techQuery
    data?.forEach(u => u.email && recipients.push(u.email))
  }

  return [...new Set(recipients)]
}

/**
 * Send daily open ticket status email
 */
export const sendDailyOpenTicketsEmail = async (organizationId = null) => {
  try {
    let autoQuery = supabase
      .from('email_automations')
      .select('*')
      .eq('type', 'daily-open-tickets')
      .eq('is_enabled', true)

    if (organizationId) {
      autoQuery = autoQuery.eq('organization_id', organizationId)
    } else {
      autoQuery = autoQuery.is('organization_id', null)
    }

    const { data: automation } = await autoQuery.maybeSingle()

    if (!automation) {
      return { sent: false, message: 'Automation not enabled' }
    }

    const recipients = await getRecipients(automation.recipients, organizationId)

    if (recipients.length === 0) {
      return { sent: false, message: 'No recipients found' }
    }

    let ticketQuery = supabase
      .from('tickets')
      .select('*, creator:users!creator_id(name, email), assignee:users!assignee_id(name, email), department:departments(name), organization:organizations(name)')
      .in('status', ['open', 'approval-pending', 'approved', 'in-progress'])

    if (organizationId) {
      ticketQuery = ticketQuery.eq('organization_id', organizationId)
    }

    const { data: openTickets, error: ticketError } = await ticketQuery.order('created_at', { ascending: false })
    if (ticketError) throw ticketError

    if (openTickets.length === 0) {
      const subject = 'Daily Open Tickets Report - No Open Tickets'
      const html = generateOpenTicketsEmail([], organizationId)
      for (const recipient of recipients) {
        await sendEmail(recipient, subject, html)
      }
      await supabase.from('email_automations').update({ last_sent: new Date() }).eq('id', automation.id)
      return { sent: true, recipients: recipients.length, tickets: 0 }
    }

    let template = null
    if (automation.email_template_id) {
      const { data } = await supabase.from('email_templates').select('*').eq('id', automation.email_template_id).single()
      template = data
    }

    if (!template) {
      let tQuery = supabase.from('email_templates').select('*').eq('type', 'daily-open-tickets').eq('is_active', true)
      if (organizationId) tQuery = tQuery.eq('organization_id', organizationId)
      else tQuery = tQuery.is('organization_id', null)
      const { data } = await tQuery.maybeSingle()
      template = data
    }

    const subject = template?.subject || 'Daily Open Tickets Report'
    const html = template
      ? renderTemplate(template.html_body || template.htmlBody, { tickets: openTickets, organization: organizationId })
      : generateOpenTicketsEmail(openTickets, organizationId)

    for (const recipient of recipients) {
      await sendEmail(recipient, subject, html)
    }

    await supabase.from('email_automations').update({ last_sent: new Date() }).eq('id', automation.id)

    return { sent: true, recipients: recipients.length, tickets: openTickets.length }
  } catch (error) {
    console.error('Daily open tickets email error:', error)
    throw error
  }
}

/**
 * Send daily report
 */
export const sendDailyReport = async (organizationId = null) => {
  try {
    let autoQuery = supabase.from('email_automations').select('*').eq('type', 'daily-report').eq('is_enabled', true)
    if (organizationId) autoQuery = autoQuery.eq('organization_id', organizationId)
    else autoQuery = autoQuery.is('organization_id', null)

    const { data: automation } = await autoQuery.maybeSingle()
    if (!automation) return { sent: false, message: 'Automation not enabled' }

    const recipients = await getRecipients(automation.recipients, organizationId, false)
    if (recipients.length === 0) return { sent: false, message: 'No recipients found' }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

    let tQuery = supabase.from('tickets').select('*, department:departments(name)')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
    if (organizationId) tQuery = tQuery.eq('organization_id', organizationId)

    const { data: tickets, error } = await tQuery
    if (error) throw error

    const totalCreated = tickets.length
    const totalOpen = tickets.filter(t => ['open', 'approval-pending', 'approved', 'in-progress'].includes(t.status)).length
    const totalResolved = tickets.filter(t => t.status === 'resolved').length
    const slaBreached = tickets.filter(t =>
      t.due_date && new Date(t.due_date) < new Date() && ['open', 'in-progress'].includes(t.status)
    ).length

    const deptMap = {}
    tickets.forEach(t => {
      const name = t.department?.name || 'Unassigned'
      deptMap[name] = (deptMap[name] || 0) + 1
    })
    const departmentSummary = Object.keys(deptMap).map(name => ({ departmentName: name, count: deptMap[name] }))

    const reportData = {
      period: 'Daily',
      date: formatDate(now, 'MMMM dd, yyyy'),
      totalCreated,
      totalOpen,
      totalResolved,
      slaBreached,
      departmentSummary,
    }

    let templateQuery = supabase.from('email_templates').select('*').eq('type', 'daily-report').eq('is_active', true)
    if (organizationId) templateQuery = templateQuery.eq('organization_id', organizationId)
    else templateQuery = templateQuery.is('organization_id', null)
    const { data: template } = await templateQuery.maybeSingle()

    const subject = template?.subject || `Daily Report - ${formatDate(now, 'MMMM dd, yyyy')}`
    const html = template
      ? renderTemplate(template.html_body || template.htmlBody, reportData)
      : generateDailyReportEmail(reportData)

    for (const recipient of recipients) {
      await sendEmail(recipient, subject, html)
    }

    await supabase.from('email_automations').update({ last_sent: new Date() }).eq('id', automation.id)

    return { sent: true, recipients: recipients.length }
  } catch (error) {
    console.error('Daily report error:', error)
    throw error
  }
}

/**
 * Send weekly report
 */
export const sendWeeklyReport = async (organizationId = null) => {
  try {
    let autoQuery = supabase.from('email_automations').select('*').eq('type', 'weekly-report').eq('is_enabled', true)
    if (organizationId) autoQuery = autoQuery.eq('organization_id', organizationId)
    else autoQuery = autoQuery.is('organization_id', null)

    const { data: automation } = await autoQuery.maybeSingle()
    if (!automation) return { sent: false, message: 'Automation not enabled' }

    const recipients = await getRecipients(automation.recipients, organizationId, false)
    if (recipients.length === 0) return { sent: false, message: 'No recipients found' }

    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    let tQuery = supabase.from('tickets')
      .select('status, due_date, created_at, category, assignee:users!assignee_id(name)')
      .gte('created_at', startOfWeek.toISOString())
      .lte('created_at', endOfWeek.toISOString())
    if (organizationId) tQuery = tQuery.eq('organization_id', organizationId)

    const { data: allTickets, error } = await tQuery
    if (error) throw error

    const totalCreated = allTickets.length
    const resolved = allTickets.filter(t => t.status === 'resolved').length
    const unresolved = totalCreated - resolved

    let slaCompliant = 0
    let slaBreached = 0
    allTickets.forEach(ticket => {
      if (ticket.due_date) {
        const slaStatus = checkSLAStatus(new Date(ticket.created_at), new Date(ticket.due_date), ticket.status)
        if (slaStatus.isOverdue) slaBreached++
        else slaCompliant++
      }
    })

    const techMap = {}
    allTickets.forEach(t => {
      if (t.assignee) {
        const name = t.assignee.name || 'Unknown'
        if (!techMap[name]) techMap[name] = { total: 0, resolved: 0 }
        techMap[name].total++
        if (t.status === 'resolved') techMap[name].resolved++
      }
    })
    const technicianPerformance = Object.keys(techMap).map(name => ({
      name,
      total: techMap[name].total,
      resolved: techMap[name].resolved,
    })).sort((a, b) => b.resolved - a.resolved).slice(0, 10)

    const issueMap = {}
    allTickets.forEach(t => {
      const cat = t.category || 'General'
      issueMap[cat] = (issueMap[cat] || 0) + 1
    })
    const topIssues = Object.keys(issueMap)
      .map(cat => ({ _id: cat, count: issueMap[cat] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const reportData = {
      period: 'Weekly',
      startDate: formatDate(startOfWeek, 'MMMM dd, yyyy'),
      endDate: formatDate(endOfWeek, 'MMMM dd, yyyy'),
      totalCreated,
      resolved,
      unresolved,
      slaCompliant,
      slaBreached,
      technicianPerformance,
      topIssues,
    }

    let templateQuery = supabase.from('email_templates').select('*').eq('type', 'weekly-report').eq('is_active', true)
    if (organizationId) templateQuery = templateQuery.eq('organization_id', organizationId)
    else templateQuery = templateQuery.is('organization_id', null)
    const { data: template } = await templateQuery.maybeSingle()

    const subject = template?.subject || `Weekly Report - ${formatDate(startOfWeek, 'MMM dd')} to ${formatDate(endOfWeek, 'MMM dd, yyyy')}`
    const html = template
      ? renderTemplate(template.html_body || template.htmlBody, reportData)
      : generateWeeklyReportEmail(reportData)

    for (const recipient of recipients) {
      await sendEmail(recipient, subject, html)
    }

    await supabase.from('email_automations').update({ last_sent: new Date() }).eq('id', automation.id)

    return { sent: true, recipients: recipients.length }
  } catch (error) {
    console.error('Weekly report error:', error)
    throw error
  }
}

/**
 * Send monthly report
 */
export const sendMonthlyReport = async (organizationId = null) => {
  try {
    let autoQuery = supabase.from('email_automations').select('*').eq('type', 'monthly-report').eq('is_enabled', true)
    if (organizationId) autoQuery = autoQuery.eq('organization_id', organizationId)
    else autoQuery = autoQuery.is('organization_id', null)

    const { data: automation } = await autoQuery.maybeSingle()
    if (!automation) return { sent: false, message: 'Automation not enabled' }

    const recipients = await getRecipients(automation.recipients, organizationId, false)
    if (recipients.length === 0) return { sent: false, message: 'No recipients found' }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

    let tQuery = supabase.from('tickets')
      .select('status, due_date, created_at, updated_at, category, sla_response_breached, sla_resolution_breached, department:departments(name), assignee:users!assignee_id(name)')
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)
    if (organizationId) tQuery = tQuery.eq('organization_id', organizationId)

    const { data: tickets, error } = await tQuery
    if (error) throw error

    const totalCreated = tickets.length
    const slaViolations = tickets.filter(t => t.sla_response_breached || t.sla_resolution_breached).length
    const slaComplianceRate = totalCreated > 0 ? ((totalCreated - slaViolations) / totalCreated * 100).toFixed(2) : 100

    const deptMap = {}
    tickets.forEach(t => {
      const name = t.department?.name || 'Unassigned'
      deptMap[name] = (deptMap[name] || 0) + 1
    })
    const departmentTrends = Object.keys(deptMap)
      .map(name => ({ departmentName: name, count: deptMap[name] }))
      .sort((a, b) => b.count - a.count)

    const techMap = {}
    tickets.forEach(t => {
      if (t.assignee) {
        const name = t.assignee.name || 'Unknown'
        if (!techMap[name]) techMap[name] = { total: 0, resolved: 0, resolutionTime: 0 }
        techMap[name].total++
        if (['resolved', 'closed'].includes(t.status)) {
          techMap[name].resolved++
          techMap[name].resolutionTime += new Date(t.updated_at) - new Date(t.created_at)
        }
      }
    })
    const technicianProductivity = Object.keys(techMap).map(name => ({
      name,
      total: techMap[name].total,
      resolved: techMap[name].resolved,
      resolutionRate: (techMap[name].resolved / techMap[name].total) * 100,
      avgResolutionHours: techMap[name].resolved > 0
        ? (techMap[name].resolutionTime / techMap[name].resolved) / (1000 * 60 * 60)
        : 0,
    })).sort((a, b) => b.resolved - a.resolved)

    const issueMap = {}
    tickets.forEach(t => {
      const cat = t.category || 'General'
      issueMap[cat] = (issueMap[cat] || 0) + 1
    })
    const recurringIssues = Object.keys(issueMap)
      .map(cat => ({ _id: cat, count: issueMap[cat] }))
      .filter(i => i.count >= 5)
      .sort((a, b) => b.count - a.count)

    const reportData = {
      period: 'Monthly',
      month: formatDate(now, 'MMMM yyyy'),
      totalCreated,
      departmentTrends,
      slaViolations,
      slaComplianceRate,
      technicianProductivity,
      recurringIssues,
    }

    let templateQuery = supabase.from('email_templates').select('*').eq('type', 'monthly-report').eq('is_active', true)
    if (organizationId) templateQuery = templateQuery.eq('organization_id', organizationId)
    else templateQuery = templateQuery.is('organization_id', null)
    const { data: template } = await templateQuery.maybeSingle()

    const subject = template?.subject || `Monthly Report - ${formatDate(now, 'MMMM yyyy')}`
    const html = template
      ? renderTemplate(template.html_body || template.htmlBody, reportData)
      : generateMonthlyReportEmail(reportData)

    for (const recipient of recipients) {
      await sendEmail(recipient, subject, html)
    }

    await supabase.from('email_automations').update({ last_sent: new Date() }).eq('id', automation.id)

    return { sent: true, recipients: recipients.length }
  } catch (error) {
    console.error('Monthly report error:', error)
    throw error
  }
}

export default {
  sendDailyOpenTicketsEmail,
  sendDailyReport,
  sendWeeklyReport,
  sendMonthlyReport,
}
