import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'
import { manualEmailCheck } from '../workers/emailWorker.js'
import { sendEmail } from '../services/emailService.js'
import nodemailer from 'nodemailer'
import Imap from 'imap'

const router = express.Router()

// @route   POST /api/email/check
// @desc    Manually trigger email check (Admin only)
// @access  Private/Admin
router.post('/check', protect, admin, async (req, res) => {
  try {
    const tickets = await manualEmailCheck()
    res.json({
      message: 'Email check completed',
      ticketsCreated: tickets.length,
      tickets,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/email/send
// @desc    Send test email (Admin only)
// @access  Private/Admin
router.post('/send', protect, admin, async (req, res) => {
  try {
    const { to, subject, html, text } = req.body

    if (!to || !subject || !html) {
      return res.status(400).json({ message: 'to, subject, and html are required' })
    }

    const result = await sendEmail(to, subject, html, text)
    res.json({
      message: 'Email sent successfully',
      messageId: result.messageId,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/email/test-smtp
// @desc    Test SMTP connection and send test email
// @access  Private/Admin
router.post('/test-smtp', protect, admin, async (req, res) => {
  try {
    const { to, settings } = req.body

    if (!to) {
      return res.status(400).json({ message: 'Email address (to) is required' })
    }

    // Use provided settings or get from database
    let smtpSettings
    if (settings && settings.host && settings.auth && settings.auth.user) {
      smtpSettings = settings
    } else {
      const { data: emailSettings, error } = await supabase
        .from('email_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !emailSettings || !emailSettings.smtp_config || !emailSettings.smtp_config.enabled || !emailSettings.smtp_config.host) {
        return res.status(400).json({ message: 'SMTP is not configured. Please save SMTP settings first or provide settings in the request.' })
      }
      smtpSettings = emailSettings.smtp_config
    }

    // Create transporter with test settings
    const isOffice365 = smtpSettings.host && (
      smtpSettings.host.includes('office365.com') ||
      smtpSettings.host.includes('outlook.com') ||
      smtpSettings.host.includes('office.com')
    )

    const trimmedPassword = smtpSettings.auth?.pass ? smtpSettings.auth.pass.trim() : ''
    const trimmedUser = smtpSettings.auth?.user ? smtpSettings.auth.user.trim() : ''

    const transporterConfig = {
      host: smtpSettings.host,
      port: parseInt(smtpSettings.port),
      secure: false, // Office365 uses STARTTLS, not direct SSL
      auth: {
        user: trimmedUser,
        pass: trimmedPassword,
      },
      pool: false,
      maxConnections: 1,
      maxMessages: 1,
    }

    // Add Office365-specific settings
    if (isOffice365) {
      transporterConfig.requireTLS = true
      transporterConfig.tls = {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      }
      transporterConfig.authMethod = 'LOGIN'
      transporterConfig.service = 'smtp.office365.com'
      transporterConfig.connectionTimeout = 60000
      transporterConfig.greetingTimeout = 30000
      transporterConfig.socketTimeout = 60000
    }

    const transporter = nodemailer.createTransport(transporterConfig)

    // Verify connection
    try {
      await transporter.verify()
    } catch (verifyError) {
      if (isOffice365) {
        let errorMsg = 'Office365 Authentication Error: '
        if (verifyError.code === 'EAUTH' || verifyError.message.includes('535') || verifyError.message.includes('Authentication unsuccessful')) {
          errorMsg += '\n\nTroubleshooting steps:\n1. Verify App Password\n2. Check SMTP AUTH enabled\n3. Try new App Password\n4. Verify username\n'
        }
        throw new Error(errorMsg + verifyError.message)
      }
      throw verifyError
    }

    // Send test email
    const fromEmail = smtpSettings.fromEmail || smtpSettings.auth.user
    const fromName = smtpSettings.fromName || 'Ticketing Tool'

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: 'Test Email from Ticketing Tool',
      html: `<h1>✅ Test Email Successful</h1><p>SMTP Host: ${smtpSettings.host}</p>`,
      text: 'This is a test email from your Ticketing Tool system.',
    })

    res.json({
      message: 'Test email sent successfully! Please check your inbox.',
      messageId: info.messageId,
      connectionVerified: true,
    })
  } catch (error) {
    res.status(500).json({
      message: error.message || 'Failed to send test email',
      error: error.code || 'UNKNOWN_ERROR',
    })
  }
})

// @route   POST /api/email/test-imap
// @desc    Test IMAP connection
// @access  Private/Admin
router.post('/test-imap', protect, admin, async (req, res) => {
  try {
    const { settings } = req.body

    // Use provided settings or get from database
    let imapSettings
    if (settings) {
      imapSettings = settings
    } else {
      const { data: emailSettings, error } = await supabase
        .from('email_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !emailSettings || !emailSettings.imap_config || !emailSettings.imap_config.enabled) {
        return res.status(400).json({ message: 'IMAP is not enabled. Please save IMAP settings first.' })
      }
      imapSettings = emailSettings.imap_config
    }

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: imapSettings.auth.user,
        password: imapSettings.auth.pass,
        host: imapSettings.host,
        port: parseInt(imapSettings.port),
        tls: imapSettings.secure === true || imapSettings.port === 993,
        tlsOptions: { rejectUnauthorized: false },
      })

      imap.once('ready', () => {
        imap.openBox(imapSettings.folder || 'INBOX', false, (err, box) => {
          imap.end()
          if (err) return reject(err)
          resolve({
            message: 'IMAP connection successful!',
            mailbox: box.name,
            totalMessages: box.messages.total,
          })
        })
      })

      imap.once('error', (err) => reject(err))
      imap.connect()
    }).then((result) => {
      res.json(result)
    }).catch((error) => {
      res.status(500).json({
        message: error.message || 'Failed to connect to IMAP server',
        error: error.code || 'UNKNOWN_ERROR',
      })
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
