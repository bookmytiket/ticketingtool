import Imap from 'imap'
import { simpleParser } from 'mailparser'
import supabase from '../config/supabase.js'
import { sendTicketAcknowledgment, sendEmail } from './emailService.js'

// Refresh OAuth2 access token for IMAP
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
        scope: 'https://outlook.office.com/IMAP.AccessAsUser.All offline_access',
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

// Get valid OAuth2 access token for IMAP
const getValidIMAPAccessToken = async (settings) => {
  const auth = settings.imap_config?.auth

  if (!auth?.oauth2?.enabled) {
    return null
  }

  const oauth2 = auth.oauth2
  const now = new Date()

  // Check if token is expired or will expire soon (within 5 minutes)
  const expiresAtDate = oauth2.expiresAt ? new Date(oauth2.expiresAt) : null
  if (!oauth2.accessToken || !expiresAtDate || expiresAtDate <= new Date(now.getTime() + 5 * 60 * 1000)) {
    console.log('Refreshing OAuth2 access token for IMAP...')
    const tokenData = await refreshOAuth2Token(
      oauth2.clientId,
      oauth2.clientSecret,
      oauth2.refreshToken
    )

    // Update settings with new token
    oauth2.accessToken = tokenData.accessToken
    oauth2.expiresAt = tokenData.expiresAt.toISOString()
    oauth2.refreshToken = tokenData.refreshToken

    const { error: updateError } = await supabase
      .from('email_settings')
      .update({
        imap_config: {
          ...settings.imap_config,
          auth: {
            ...settings.imap_config.auth,
            oauth2: oauth2
          }
        }
      })
      .eq('id', settings.id)

    if (updateError) {
      console.error('Failed to update refreshed IMAP token in DB:', updateError)
    }

    return tokenData.accessToken
  }

  return oauth2.accessToken
}

// Parse email to extract ticket information
const parseEmailToTicket = (emailData) => {
  const subject = emailData.subject || 'No Subject'
  const from = emailData.from?.value?.[0] || emailData.from?.text || 'unknown@example.com'
  const fromEmail = emailData.from?.value?.[0]?.address || from
  const fromName = emailData.from?.value?.[0]?.name || fromEmail.split('@')[0]

  // Extract description from email body
  let description = ''
  if (emailData.text) {
    description = emailData.text
  } else if (emailData.html) {
    // Strip HTML tags for description
    description = emailData.html.replace(/<[^>]*>/g, '').trim()
  }

  // Extract priority from subject (if mentioned)
  let priority = 'medium'
  const subjectLower = subject.toLowerCase()
  if (subjectLower.includes('urgent') || subjectLower.includes('critical')) {
    priority = 'urgent'
  } else if (subjectLower.includes('high')) {
    priority = 'high'
  } else if (subjectLower.includes('low')) {
    priority = 'low'
  }

  // Extract category from subject or body
  let category = 'General'
  const categoryKeywords = {
    'Hardware': ['hardware', 'computer', 'laptop', 'printer', 'device'],
    'Software': ['software', 'application', 'app', 'program'],
    'Network': ['network', 'internet', 'connection', 'wifi', 'vpn'],
    'Account': ['account', 'login', 'password', 'access'],
  }

  const searchText = (subject + ' ' + description).toLowerCase()
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      category = cat
      break
    }
  }

  return {
    title: subject.length > 100 ? subject.substring(0, 100) : subject,
    description: description || 'No description provided',
    category,
    priority,
    fromEmail,
    fromName,
    emailMessageId: emailData.messageId,
  }
}

// Check for existing user or create guest user
const getOrCreateUser = async (email, name) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (!user) {
    // Create a guest user (role: user, status: active)
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        name: name || email.split('@')[0],
        email,
        role: 'user',
        status: 'active',
      }])
      .select()
      .single()

    if (createError) throw createError
    console.log(`✅ Created guest user: ${email}`)
    return newUser
  }

  return user
}

const normalizeDomain = (email) => {
  if (!email || typeof email !== 'string') return ''
  const atIndex = email.indexOf('@')
  if (atIndex === -1) return ''
  return email.slice(atIndex + 1).trim().toLowerCase()
}

const evaluateDomainRules = (email, domainRules) => {
  const domain = normalizeDomain(email)
  if (!domain) return { allowed: false, reason: 'Invalid sender domain' }

  const whitelist = (domainRules?.whitelist || []).map(d => d.toLowerCase())
  const blacklist = (domainRules?.blacklist || []).map(d => d.toLowerCase())

  if (blacklist.includes(domain)) {
    return { allowed: false, reason: `Domain ${domain} is blocked` }
  }

  if (whitelist.length > 0 && !whitelist.includes(domain)) {
    return { allowed: false, reason: `Domain ${domain} is not whitelisted` }
  }

  return { allowed: true }
}

const sendDomainRejectionEmail = async (to, reason) => {
  try {
    await sendEmail(
      to,
      'Ticket Submission Rejected',
      `<p>Your email could not be processed because: ${reason}.</p><p>If you believe this is an error, please contact the administrator.</p>`
    )
  } catch (error) {
    console.error('Failed to send domain rejection email:', error.message || error)
  }
}

// Process a single email and create ticket
const processEmail = async (emailData, settingsFromCheck) => {
  try {
    const emailSettings = settingsFromCheck || await (async () => {
      const { data } = await supabase.from('email_settings').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()
      return data
    })()

    const ticketData = parseEmailToTicket(emailData)

    // Check if ticket already exists (by email message ID)
    if (ticketData.emailMessageId) {
      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('id')
        .eq('email_message_id', ticketData.emailMessageId)
        .maybeSingle()

      if (existingTicket) {
        console.log(`ℹ️  Ticket already exists for email: ${ticketData.emailMessageId}`)
        return null
      }
    }

    // Enforce domain rules if enabled
    if (emailSettings?.domain_rules?.enabled) {
      const result = evaluateDomainRules(ticketData.fromEmail, emailSettings.domain_rules)
      if (!result.allowed) {
        console.warn(`❌ Ticket creation blocked for ${ticketData.fromEmail}: ${result.reason}`)
        await sendDomainRejectionEmail(ticketData.fromEmail, result.reason)
        return null
      }
    }

    // Get or create user
    const creator = await getOrCreateUser(ticketData.fromEmail, ticketData.fromName)

    // Create ticket
    const { data: ticket, error: createError } = await supabase
      .from('tickets')
      .insert([{
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        priority: ticketData.priority,
        creator_id: creator.id,
        status: 'open',
        email_message_id: ticketData.emailMessageId,
        source_email: ticketData.fromEmail,
        metadata: {
          original_email: ticketData.fromEmail,
          message_id: ticketData.emailMessageId || 'N/A'
        }
      }])
      .select()
      .single()

    if (createError) throw createError

    // Add initial comment
    await supabase
      .from('comments')
      .insert([{
        ticket_id: ticket.id,
        author_id: creator.id,
        content: `Original email from: ${ticketData.fromEmail}\nMessage ID: ${ticketData.emailMessageId || 'N/A'}`,
      }])

    console.log(`✅ Created ticket #${ticket.ticket_id_int || ticket.id} from email: ${ticketData.fromEmail}`)

    // Send acknowledgment email
    try {
      await sendTicketAcknowledgment(ticket, ticketData.fromEmail)
      console.log(`✅ Sent acknowledgment email to: ${ticketData.fromEmail}`)
    } catch (emailError) {
      console.error(`❌ Failed to send acknowledgment email:`, emailError.message)
    }

    return ticket
  } catch (error) {
    console.error('Error processing email:', error)
    throw error
  }
}

// Connect to IMAP and check for new emails
export const checkEmails = async () => {
  try {
    const { data: settings, error: fetchError } = await supabase
      .from('email_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError || !settings || !settings.imap_config || !settings.imap_config.enabled) {
      console.log('ℹ️  IMAP is not enabled or settings not found. Skipping email check.')
      return []
    }

    return new Promise(async (resolve, reject) => {
      // Build IMAP config
      const imapConfig = {
        host: settings.imap_config.host,
        port: parseInt(settings.imap_config.port),
        tls: settings.imap_config.secure || false,
        tlsOptions: { rejectUnauthorized: false },
      }

      // Configure authentication (OAuth2 or password)
      if (settings.imap_config.auth?.oauth2?.enabled) {
        try {
          const accessToken = await getValidIMAPAccessToken(settings)
          imapConfig.user = settings.imap_config.auth.user
          imapConfig.xoauth2 = accessToken
          console.log('Using OAuth2 for IMAP authentication')
        } catch (error) {
          console.error('Failed to get OAuth2 token for IMAP:', error)
          return reject(new Error('OAuth2 authentication failed for IMAP'))
        }
      } else {
        // Password authentication
        imapConfig.user = settings.imap_config.auth.user
        imapConfig.password = settings.imap_config.auth.pass
      }

      const imap = new Imap(imapConfig)

      imap.once('ready', () => {
        imap.openBox(settings.imap_config.folder || 'INBOX', false, (err, box) => {
          if (err) {
            console.error('Error opening IMAP box:', err)
            imap.end()
            return reject(err)
          }

          // Search for unread emails
          imap.search(['UNSEEN'], (err, results) => {
            if (err) {
              console.error('Error searching emails:', err)
              imap.end()
              return reject(err)
            }

            if (!results || results.length === 0) {
              console.log('ℹ️  No new emails found.')
              imap.end()
              return resolve([])
            }

            console.log(`📧 Found ${results.length} new email(s)`)

            const fetch = imap.fetch(results, {
              bodies: '',
              struct: true,
            })

            const emails = []
            let completed = 0

            fetch.on('message', (msg, seqno) => {
              msg.on('body', (stream, info) => {
                simpleParser(stream, async (err, parsed) => {
                  completed++
                  if (err) {
                    console.error('Error parsing email:', err)
                  } else {
                    emails.push({
                      subject: parsed.subject,
                      from: parsed.from,
                      text: parsed.text,
                      html: parsed.html,
                      messageId: parsed.messageId,
                      date: parsed.date,
                    })
                  }

                  if (completed === results.length) {
                    imap.end()
                  }
                })
              })
            })

            imap.once('end', async () => {
              // Process each email after IMAP connection is closed
              const tickets = []
              for (const emailData of emails) {
                try {
                  const ticket = await processEmail(emailData, settings)
                  if (ticket) {
                    tickets.push(ticket)
                  }
                } catch (error) {
                  console.error('Error processing email:', error)
                }
              }

              console.log(`✅ Processed ${tickets.length} email(s) into tickets`)
              resolve(tickets)
            })
          })
        })
      })

      imap.once('error', (err) => {
        console.error('IMAP error:', err)
        reject(err)
      })

      imap.connect()
    })
  } catch (error) {
    console.error('Error checking emails:', error)
    throw error
  }
}

