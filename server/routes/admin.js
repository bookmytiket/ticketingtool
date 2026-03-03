import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

const normalizeDomainList = (value) => {
  if (!value) return []
  const items = Array.isArray(value) ? value : String(value).split(/[,\\n]/)
  const trimmed = items
    .map(d => d && String(d).trim().replace(/^@/, '').toLowerCase())
    .filter(Boolean)
  return Array.from(new Set(trimmed))
}

// SSO Configuration Routes
router.get('/sso', protect, admin, async (req, res) => {
  try {
    const { data: configs, error } = await supabase.from('sso_config').select('*')
    if (error) throw error
    res.json(configs)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/sso', protect, admin, async (req, res) => {
  try {
    const { provider, enabled, config } = req.body

    const { data: existing, error: fetchError } = await supabase
      .from('sso_config')
      .select('*')
      .eq('provider', provider)
      .maybeSingle()

    let result
    if (existing) {
      const { data, error: updateError } = await supabase
        .from('sso_config')
        .update({
          enabled: enabled !== undefined ? enabled : existing.enabled,
          config: { ...existing.config, ...config }
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (updateError) throw updateError
      result = data
    } else {
      const { data, error: insertError } = await supabase
        .from('sso_config')
        .insert([{ provider, enabled, config }])
        .select()
        .single()
      if (insertError) throw insertError
      result = data
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Email Settings Routes
router.get('/email', protect, admin, async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('email_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!settings) {
      // Create default
      const { data: newSettings, error: createError } = await supabase
        .from('email_settings')
        .insert([{}])
        .select()
        .single()
      if (createError) throw createError
      return res.json(newSettings)
    }

    res.json(settings)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/email', protect, admin, async (req, res) => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('email_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let settings = existing || {}
    const { smtp, imap, domainRules } = req.body

    if (smtp) {
      const trimmedUsername = smtp.username ? smtp.username.trim() : ''
      const trimmedPassword = smtp.password ? smtp.password.trim() : ''
      const isOffice365 = smtp.host && (smtp.host.includes('office365.com') || smtp.host.includes('outlook.com'))
      let secure = false
      if (!isOffice365) {
        secure = smtp.encryption === 'ssl' || (smtp.encryption === 'tls' && smtp.port === '465')
      }

      const authConfig = {}
      if (smtp.auth?.oauth2?.enabled || smtp.useOAuth2) {
        authConfig.user = trimmedUsername
        authConfig.oauth2 = {
          enabled: true,
          clientId: smtp.auth?.oauth2?.clientId || smtp.oauth2?.clientId || '',
          clientSecret: smtp.auth?.oauth2?.clientSecret || smtp.oauth2?.clientSecret || '',
          refreshToken: smtp.auth?.oauth2?.refreshToken || smtp.oauth2?.refreshToken || '',
        }
      } else {
        authConfig.user = trimmedUsername
        authConfig.pass = trimmedPassword
        authConfig.oauth2 = { enabled: false }
      }

      settings.smtp_config = {
        ...settings.smtp_config,
        host: smtp.host ? smtp.host.trim() : '',
        port: parseInt(smtp.port) || 587,
        secure: secure,
        auth: authConfig,
        fromEmail: smtp.fromEmail ? smtp.fromEmail.trim() : '',
        fromName: smtp.fromName ? smtp.fromName.trim() : '',
        enabled: true,
      }
    }

    if (imap) {
      const secure = imap.encryption === 'ssl' || imap.encryption === 'tls'
      const trimmedUsername = imap.username ? imap.username.trim() : ''
      const trimmedPassword = imap.password ? imap.password.trim() : ''

      const authConfig = {}
      if (imap.auth?.oauth2?.enabled || imap.useOAuth2) {
        authConfig.user = trimmedUsername
        authConfig.oauth2 = {
          enabled: true,
          clientId: imap.auth?.oauth2?.clientId || imap.oauth2?.clientId || '',
          clientSecret: imap.auth?.oauth2?.clientSecret || imap.oauth2?.clientSecret || '',
          refreshToken: imap.auth?.oauth2?.refreshToken || imap.oauth2?.refreshToken || '',
        }
      } else {
        authConfig.user = trimmedUsername
        authConfig.pass = trimmedPassword
        authConfig.oauth2 = { enabled: false }
      }

      settings.imap_config = {
        ...settings.imap_config,
        host: imap.host ? imap.host.trim() : '',
        port: imap.port,
        secure: secure,
        auth: authConfig,
        folder: imap.folder || 'INBOX',
        enabled: true,
      }
    }

    if (domainRules) {
      const whitelist = normalizeDomainList(domainRules.whitelist || domainRules.allowlist)
      const blacklist = normalizeDomainList(domainRules.blacklist || domainRules.blocklist)
      const enabled = domainRules.enabled !== undefined ? Boolean(domainRules.enabled) : (settings.domain_rules?.enabled ?? false)

      settings.domain_rules = { enabled, whitelist, blacklist }
    }

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('email_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('email_settings')
        .insert([settings])
        .select()
        .single()
      if (error) throw error
      result = data
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Logo Routes
router.get('/logo', async (req, res) => {
  try {
    const { data: logo, error } = await supabase
      .from('logos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!logo) {
      return res.json({ logo: null, filename: null, showOnLogin: true, loginTitle: null })
    }
    res.json({
      logo: logo.logo,
      filename: logo.filename,
      showOnLogin: logo.show_on_login !== undefined ? logo.show_on_login : true,
      loginTitle: logo.login_title || null,
      createdAt: logo.created_at,
      updatedAt: logo.updated_at,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/logo', protect, admin, async (req, res) => {
  try {
    const { logo, filename, showOnLogin, loginTitle } = req.body

    // Find existing logo
    const { data: existingLogo, error: fetchError } = await supabase
      .from('logos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingLogo) {
      const updates = {}
      if (logo !== undefined) updates.logo = logo
      if (filename) updates.filename = filename
      if (showOnLogin !== undefined) updates.show_on_login = showOnLogin
      if (loginTitle !== undefined) updates.login_title = loginTitle || null

      const { data: updated, error } = await supabase
        .from('logos')
        .update(updates)
        .eq('id', existingLogo.id)
        .select()
        .single()
      if (error) throw error

      res.json({
        logo: updated.logo,
        showOnLogin: updated.show_on_login !== undefined ? updated.show_on_login : true,
        loginTitle: updated.login_title || null
      })
    } else {
      const { data: newLogo, error } = await supabase
        .from('logos')
        .insert({
          logo,
          filename: filename || 'logo',
          show_on_login: showOnLogin !== undefined ? showOnLogin : true,
          login_title: loginTitle || null
        })
        .select()
        .single()
      if (error) throw error
      res.json({
        logo: newLogo.logo,
        showOnLogin: newLogo.show_on_login,
        loginTitle: newLogo.login_title || null
      })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/logo', protect, admin, async (req, res) => {
  try {
    const { error } = await supabase.from('logos').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    if (error) throw error
    res.json({ message: 'Logo deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Roles Routes
router.get('/roles', protect, admin, async (req, res) => {
  try {
    const { data: roles, error } = await supabase.from('roles').select('*')
    if (error) throw error
    res.json(roles)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/roles', protect, admin, async (req, res) => {
  try {
    const { data: role, error } = await supabase
      .from('roles')
      .insert([req.body])
      .select()
      .single()
    if (error) throw error
    res.status(201).json(role)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/roles/:id', protect, admin, async (req, res) => {
  try {
    const { data: role, error } = await supabase
      .from('roles')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    res.json(role)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/roles/:id', protect, admin, async (req, res) => {
  try {
    const { error } = await supabase.from('roles').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ message: 'Role deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// SLA Policy Routes
router.get('/sla', protect, admin, async (req, res) => {
  try {
    const { organization } = req.query
    let query = supabase.from('sla_policies').select('*, organization:organizations(name)')

    if (organization) {
      query = query.or(`organization_id.eq.${organization},organization_id.is.null`)
    } else {
      query = query.is('organization_id', null)
    }

    const { data: policies, error } = await query.order('priority', { ascending: true })
    if (error) throw error
    res.json(policies)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/sla', protect, admin, async (req, res) => {
  try {
    const { name, organization, priority, responseTime, resolutionTime, description, isActive } = req.body

    const { data: existing, error: fetchError } = await supabase
      .from('sla_policies')
      .select('*')
      .eq('priority', priority)
      .or(`organization_id.eq.${organization || null},organization_id.is.null`) // Careful here
      .maybeSingle()

    // Simpler check for existing
    const { data: reallyExisting } = await supabase
      .from('sla_policies')
      .select('id')
      .eq('priority', priority)
      .eq('organization_id', organization || null)
      .maybeSingle()

    if (reallyExisting) {
      const { data: updated, error } = await supabase
        .from('sla_policies')
        .update({
          name,
          response_time: responseTime,
          resolution_time: resolutionTime,
          description,
          is_active: isActive !== undefined ? isActive : true
        })
        .eq('id', reallyExisting.id)
        .select('*, organization:organizations(name)')
        .single()
      if (error) throw error
      res.json(updated)
    } else {
      const { data: created, error } = await supabase
        .from('sla_policies')
        .insert({
          name,
          organization_id: organization || null,
          priority,
          response_time: responseTime,
          resolution_time: resolutionTime,
          description,
          is_active: isActive !== undefined ? isActive : true
        })
        .select('*, organization:organizations(name)')
        .single()
      if (error) throw error
      res.status(201).json(created)
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/sla/:id', protect, admin, async (req, res) => {
  try {
    const { name, responseTime, resolutionTime, description, isActive } = req.body
    const updates = {}
    if (name) updates.name = name
    if (responseTime !== undefined) updates.response_time = responseTime
    if (resolutionTime !== undefined) updates.resolution_time = resolutionTime
    if (description !== undefined) updates.description = description
    if (isActive !== undefined) updates.is_active = isActive

    const { data: updated, error } = await supabase
      .from('sla_policies')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, organization:organizations(name)')
      .single()

    if (error) throw error
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/sla/:id', protect, admin, async (req, res) => {
  try {
    const { error } = await supabase.from('sla_policies').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ message: 'SLA Policy deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

