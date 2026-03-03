import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/organizations
// @desc    Get all organizations
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(organizations)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/organizations/:id
// @desc    Get single organization with stats
// @access  Private/Admin
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !organization) {
      return res.status(404).json({ message: 'Organization not found' })
    }

    // Get stats
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)

    const { count: ticketCount } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)

    const { count: openTicketCount } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'open')

    res.json({
      ...organization,
      stats: {
        users: userCount,
        tickets: ticketCount,
        openTickets: openTicketCount,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/organizations
// @desc    Create new organization
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, domain, description, status, settings } = req.body

    const { data: orgExists } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', name)
      .single()

    if (orgExists) {
      return res.status(400).json({ message: 'Organization with this name already exists' })
    }

    if (domain) {
      const { data: domainExists } = await supabase
        .from('organizations')
        .select('id')
        .eq('domain', domain)
        .single()

      if (domainExists) {
        return res.status(400).json({ message: 'Organization with this domain already exists' })
      }
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .insert([
        {
          name,
          domain: domain || null,
          description: description || '',
          status: status || 'active',
          allow_self_registration: settings?.allowSelfRegistration || false,
          default_role: settings?.defaultRole || 'user',
        }
      ])
      .select()
      .single()

    if (error) throw error

    res.status(201).json(organization)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   PUT /api/organizations/:id
// @desc    Update organization
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { data: organization, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !organization) {
      return res.status(404).json({ message: 'Organization not found' })
    }

    const { name, domain, description, status, settings } = req.body

    const updates = {}

    if (name && name !== organization.name) {
      const { data: orgExists } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', name)
        .single()

      if (orgExists) {
        return res.status(400).json({ message: 'Organization with this name already exists' })
      }
      updates.name = name
    }

    if (domain && domain !== organization.domain) {
      const { data: domainExists } = await supabase
        .from('organizations')
        .select('id')
        .eq('domain', domain)
        .single()

      if (domainExists) {
        return res.status(400).json({ message: 'Organization with this domain already exists' })
      }
      updates.domain = domain
    }

    if (description !== undefined) updates.description = description
    if (status) updates.status = status
    if (settings) {
      if (settings.allowSelfRegistration !== undefined) updates.allow_self_registration = settings.allowSelfRegistration
      if (settings.defaultRole) updates.default_role = settings.defaultRole
    }

    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (updateError) throw updateError
    res.json(updatedOrg)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   DELETE /api/organizations/:id
// @desc    Delete organization
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    // Check if organization has users or tickets
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', req.params.id)

    const { count: ticketCount } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', req.params.id)

    if (userCount > 0 || ticketCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete organization with existing users or tickets. Please remove them first.'
      })
    }

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'Organization deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

