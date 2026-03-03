import nodemailer from 'nodemailer'
import supabase from '../config/supabase.js'

// Get email settings from Supabase
const getEmailSettings = async () => {
  const { data: settings, error } = await supabase
    .from('email_settings')
    .select('*')
    .limit(1)
    .single()

  if (error || !settings) {
    // Return default empty settings structure to avoid crashes
    return {
      smtp_config: { enabled: false, auth: {} },
      imap_config: { enabled: false, auth: {} }
    }
  }
  return settings
}

// Refresh OAuth2 access token
const refreshOAuth2Token = async (clientId, clientSecret, refreshToken) => {
  try {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://outlook.office.com/SMTP.Send https://outlook.office.com/IMAP.AccessAsUser.All offline_access',
      }),
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      refreshToken: data.refresh_token || refreshToken,
    }
  } catch (error) {
    console.error('OAuth2 token refresh error:', error)
    throw error
  }
}

// Get valid OAuth2 access token (refresh if needed)
const getValidAccessToken = async (settings, type = 'smtp') => {
  const config = type === 'smtp' ? settings.smtp_config : settings.imap_config
  const auth = config?.auth

  if (!auth?.oauth2?.enabled) {
    return null
  }

  const oauth2 = auth.oauth2
  const now = new Date()

  if (!oauth2.accessToken || !oauth2.expiresAt || new Date(oauth2.expiresAt) <= new Date(now.getTime() + 5 * 60 * 1000)) {
    console.log('Refreshing OAuth2 access token...')
    const tokenData = await refreshOAuth2Token(
      oauth2.clientId,
      oauth2.clientSecret,
      oauth2.refreshToken
    )

    // Update settings in Supabase
    oauth2.accessToken = tokenData.accessToken
    oauth2.expiresAt = tokenData.expiresAt.toISOString()
    oauth2.refreshToken = tokenData.refreshToken

    if (type === 'smtp') {
      settings.smtp_config.auth.oauth2 = oauth2
    } else {
      settings.imap_config.auth.oauth2 = oauth2
    }

    await supabase
      .from('email_settings')
      .update({
        smtp_config: settings.smtp_config,
        imap_config: settings.imap_config
      })
      .eq('id', settings.id)

    return tokenData.accessToken
  }

  return oauth2.accessToken
}

// Create SMTP transporter
const createTransporter = async () => {
  const settings = await getEmailSettings()
  const smtp = settings.smtp_config

  if (!smtp.enabled) {
    throw new Error('SMTP is not enabled. Please configure email settings.')
  }

  const isOffice365 = smtp.host && (
    smtp.host.includes('office365.com') ||
    smtp.host.includes('outlook.com') ||
    smtp.host.includes('office.com')
  )

  const transporterConfig = {
    host: smtp.host,
    port: parseInt(smtp.port),
    secure: false,
    pool: false,
    maxConnections: 1,
    maxMessages: 1,
  }

  if (smtp.auth?.oauth2?.enabled) {
    const accessToken = await getValidAccessToken(settings, 'smtp')
    transporterConfig.auth = {
      type: 'OAuth2',
      user: smtp.auth.user?.trim(),
      clientId: smtp.auth.oauth2.clientId,
      clientSecret: smtp.auth.oauth2.clientSecret,
      refreshToken: smtp.auth.oauth2.refreshToken,
      accessToken: accessToken,
    }
  } else {
    transporterConfig.auth = {
      user: smtp.auth.user?.trim(),
      pass: smtp.auth.pass?.trim(),
    }
  }

  if (isOffice365) {
    transporterConfig.requireTLS = true
    transporterConfig.tls = {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    }
    if (!smtp.auth?.oauth2?.enabled) {
      transporterConfig.authMethod = 'LOGIN'
    }
    transporterConfig.service = 'smtp.office365.com'
  } else {
    transporterConfig.secure = smtp.secure === true || smtp.port === 465
  }

  return nodemailer.createTransport(transporterConfig)
}

// Send email
export const sendEmail = async (to, subject, html, text = null) => {
  try {
    const settings = await getEmailSettings()
    const transporter = await createTransporter()

    const smtp = settings.smtp_config
    const fromEmail = smtp.fromEmail || smtp.auth.user
    const fromName = smtp.fromName || 'Ticketing Tool'

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

// Render template with variables
const renderEmailTemplate = (template, data) => {
  let rendered = template
  Object.keys(data).forEach(key => {
    const value = data[key]
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    rendered = rendered.replace(regex, value !== null && value !== undefined ? String(value) : '')
  })
  return rendered
}

// Send ticket acknowledgment email
export const sendTicketAcknowledgment = async (ticket, customerEmail) => {
  // Check for custom template
  let customTemplate = null
  try {
    const { data: templates } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', 'ticket-created')
      .eq('is_active', true)
      .or(`organization_id.eq.${ticket.organization_id},organization_id.is.null`)
      .order('organization_id', { ascending: false, nullsFirst: false })

    if (templates && templates.length > 0) {
      customTemplate = templates[0]
    }
  } catch (error) {
    console.error('Error fetching custom template:', error)
  }

  let subject = `Ticket #${ticket.ticketId} Created - ${ticket.title}`
  let html = ''

  // Get priority badge color
  const getPriorityColor = (priority) => {
    const colors = {
      'low': '#6b7280',
      'medium': '#3b82f6',
      'high': '#f59e0b',
      'urgent': '#ef4444',
    }
    return colors[priority] || '#3b82f6'
  }

  const priorityColor = getPriorityColor(ticket.priority)

  html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          background-color: #f5f5f5;
          padding: 20px;
        }
        .email-container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header-banner { 
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header-banner h1 {
          font-size: 28px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .content { 
          padding: 30px 20px; 
          background: #ffffff;
        }
        .greeting {
          font-size: 16px;
          color: #1f2937;
          margin-bottom: 15px;
        }
        .intro-text {
          font-size: 15px;
          color: #4b5563;
          margin-bottom: 25px;
          line-height: 1.7;
        }
        .ticket-details { 
          background: #f9fafb; 
          padding: 20px; 
          margin: 25px 0; 
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .ticket-details h3 {
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 15px;
          font-weight: 600;
        }
        .detail-row {
          margin-bottom: 12px;
          font-size: 14px;
        }
        .detail-row:last-child {
          margin-bottom: 0;
        }
        .detail-label {
          font-weight: 600;
          color: #374151;
          display: inline-block;
          min-width: 120px;
        }
        .detail-value {
          color: #1f2937;
        }
        .priority-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          background-color: ${priorityColor}20;
          color: ${priorityColor};
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          background-color: #10b98120;
          color: #10b981;
        }
        .description-box {
          background: #ffffff;
          padding: 15px;
          border-radius: 4px;
          border-left: 3px solid #3b82f6;
          margin-top: 10px;
          font-size: 14px;
          color: #4b5563;
          line-height: 1.6;
        }
        .footer-text {
          font-size: 14px;
          color: #6b7280;
          margin-top: 25px;
          line-height: 1.6;
        }
        .signature {
          margin-top: 20px;
          font-size: 14px;
          color: #1f2937;
        }
        .signature strong {
          color: #111827;
        }
        .footer-note {
          text-align: center;
          padding: 20px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #9ca3af;
        }
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
          }
          .content {
            padding: 20px 15px !important;
          }
          .header-banner {
            padding: 25px 15px !important;
          }
          .header-banner h1 {
            font-size: 24px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header-banner">
          <h1>Ticket Created Successfully</h1>
        </div>
        <div class="content">
          <p class="greeting">Dear Customer,</p>
          <p class="intro-text">Thank you for contacting us. We have received your request and created a support ticket for you.</p>
          
          <div class="ticket-details">
            <h3>Ticket Details:</h3>
            <div class="detail-row">
              <span class="detail-label">Ticket ID:</span>
              <span class="detail-value">#${ticket.ticketId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Title:</span>
              <span class="detail-value">${ticket.title}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Category:</span>
              <span class="detail-value">${ticket.category}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Priority:</span>
              <span class="detail-value"><span class="priority-badge">${ticket.priority}</span></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value"><span class="status-badge">${ticket.status}</span></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description:</span>
            </div>
            <div class="description-box">
              ${ticket.description.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <p class="footer-text">Our support team will review your ticket and respond as soon as possible. You will receive email notifications when there are updates to your ticket.</p>
          
          <p class="footer-text">If you have any additional information, please reply to this email and it will be added to your ticket.</p>
          
          <div class="signature">
            <strong>Best regards,</strong><br>
            Support Team
          </div>
        </div>
        <div class="footer-note">
          <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail(customerEmail, subject, html)
}

// Send ticket update email
export const sendTicketUpdateEmail = async (ticket, customerEmail, changes) => {
  // Check for custom template
  let customTemplate = null
  try {
    const { data: templates } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', 'ticket-updated')
      .eq('is_active', true)
      .or(`organization_id.eq.${ticket.organization_id},organization_id.is.null`)
      .order('organization_id', { ascending: false, nullsFirst: false })

    if (templates && templates.length > 0) {
      customTemplate = templates[0]
    }
  } catch (error) {
    console.error('Error fetching custom template:', error)
  }

  let subject = `Ticket #${ticket.ticketId} Updated - ${ticket.title}`
  let html = ''

  // If custom template exists, use it
  if (customTemplate) {
    const templateData = {
      ticketId: ticket.ticketId,
      ticketTitle: ticket.title,
      ticketCategory: ticket.category,
      ticketPriority: ticket.priority,
      ticketStatus: ticket.status,
      customerName: ticket.creator?.name || 'Customer',
      assigneeName: ticket.assignee?.name || 'Unassigned',
      changes: changes ? Object.entries(changes).map(([k, v]) => `${k}: ${v}`).join(', ') : '',
    }
    subject = renderEmailTemplate(customTemplate.subject, templateData)
    html = renderEmailTemplate(customTemplate.htmlBody, templateData)
  } else {
    // Use default template
    const changesHtml = Object.entries(changes || {})
      .map(([key, value]) => `<li style="margin-bottom: 8px;"><strong>${key}:</strong> ${value}</li>`)
      .join('')

    // Get status color
    const getStatusColor = (status) => {
      const colors = {
        'open': '#3b82f6',
        'approval-pending': '#f59e0b',
        'approved': '#10b981',
        'rejected': '#ef4444',
        'in-progress': '#8b5cf6',
        'resolved': '#10b981',
        'closed': '#6b7280',
      }
      return colors[status] || '#3b82f6'
    }

    // Get priority color
    const getPriorityColor = (priority) => {
      const colors = {
        'low': '#6b7280',
        'medium': '#3b82f6',
        'high': '#f59e0b',
        'urgent': '#ef4444',
      }
      return colors[priority] || '#3b82f6'
    }

    const statusColor = getStatusColor(ticket.status)
    const priorityColor = getPriorityColor(ticket.priority)

    html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          background-color: #f5f5f5;
          padding: 20px;
        }
        .email-container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header-banner { 
          background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); 
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header-banner h1 {
          font-size: 28px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .content { 
          padding: 30px 20px; 
          background: #ffffff;
        }
        .greeting {
          font-size: 16px;
          color: #1f2937;
          margin-bottom: 15px;
        }
        .intro-text {
          font-size: 15px;
          color: #4b5563;
          margin-bottom: 25px;
          line-height: 1.7;
        }
        .ticket-details { 
          background: #f9fafb; 
          padding: 20px; 
          margin: 25px 0; 
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .ticket-details h3 {
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 15px;
          font-weight: 600;
        }
        .detail-row {
          margin-bottom: 12px;
          font-size: 14px;
        }
        .detail-row:last-child {
          margin-bottom: 0;
        }
        .detail-label {
          font-weight: 600;
          color: #374151;
          display: inline-block;
          min-width: 120px;
        }
        .detail-value {
          color: #1f2937;
        }
        .priority-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          background-color: ${priorityColor}20;
          color: ${priorityColor};
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          background-color: ${statusColor}20;
          color: ${statusColor};
        }
        .changes-box {
          background: #f0fdf4;
          padding: 20px;
          border-radius: 6px;
          border-left: 3px solid #10b981;
          margin: 25px 0;
        }
        .changes-box h3 {
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 15px;
          font-weight: 600;
        }
        .changes-box ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .changes-box li {
          font-size: 14px;
          color: #4b5563;
          margin-bottom: 8px;
        }
        .view-button {
          display: inline-block;
          padding: 12px 24px;
          background: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
          font-size: 14px;
        }
        .view-button:hover {
          background: #2563eb;
        }
        .footer-text {
          font-size: 14px;
          color: #6b7280;
          margin-top: 25px;
          line-height: 1.6;
        }
        .signature {
          margin-top: 20px;
          font-size: 14px;
          color: #1f2937;
        }
        .signature strong {
          color: #111827;
        }
        .footer-note {
          text-align: center;
          padding: 20px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #9ca3af;
        }
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
          }
          .content {
            padding: 20px 15px !important;
          }
          .header-banner {
            padding: 25px 15px !important;
          }
          .header-banner h1 {
            font-size: 24px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header-banner">
          <h1>Ticket Updated</h1>
        </div>
        <div class="content">
          <p class="greeting">Dear Customer,</p>
          <p class="intro-text">Your ticket #${ticket.ticketId} has been updated.</p>
          
          <div class="ticket-details">
            <h3>Current Ticket Status:</h3>
            <div class="detail-row">
              <span class="detail-label">Ticket ID:</span>
              <span class="detail-value">#${ticket.ticketId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Title:</span>
              <span class="detail-value">${ticket.title}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value"><span class="status-badge">${ticket.status.toUpperCase().replace('-', ' ')}</span></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Priority:</span>
              <span class="detail-value"><span class="priority-badge">${ticket.priority}</span></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Assignee:</span>
              <span class="detail-value">${ticket.assignee?.name || 'Unassigned'}</span>
            </div>
            ${ticket.dueDate ? `
            <div class="detail-row">
              <span class="detail-label">Due Date:</span>
              <span class="detail-value">${new Date(ticket.dueDate).toLocaleString()}</span>
            </div>
            ` : ''}
          </div>
          
          ${changesHtml ? `
          <div class="changes-box">
            <h3>Recent Changes:</h3>
            <ul>${changesHtml}</ul>
          </div>
          ` : ''}
          
          <p class="footer-text">You will receive email notifications for all status updates on this ticket.</p>
          
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.ticketId}" class="view-button">View Ticket</a></p>
          
          <div class="signature">
            <strong>Best regards,</strong><br>
            Support Team
          </div>
        </div>
        <div class="footer-note">
          <p>This is an automated message.</p>
        </div>
      </div>
    </body>
    </html>
    `
  }

  return await sendEmail(customerEmail, subject, html)
}

