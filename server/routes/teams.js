/**
 * Microsoft Teams Integration Routes
 * Admin Only
 */

import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'
import { testTeamsWebhook } from '../services/teamsService.js'

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

/**
 * @route   GET /api/teams/config
 * @desc    Get Teams configuration
 * @access  Private/Admin
 */
router.get('/config', async (req, res) => {
  try {
    const { organization_id } = req.query
    const targetOrgId = organization_id || null

    const { data: config, error } = await supabase
      .from('teams_config')
      .select('*, organization:organizations(name), creator:users!created_by_id(name, email)')
      .filter('organization_id', targetOrgId ? 'eq' : 'is', targetOrgId)
      .maybeSingle()

    if (error) throw error

    if (!config) {
      // Return default config
      return res.json({
        is_enabled: false,
        webhook_url: '',
        bot_id: '',
        tenant_id: '',
        channel_id: '',
        channel_name: '',
        notifications: {
          ticketCreated: true,
          ticketUpdated: true,
          ticketResolved: true,
          ticketClosed: true,
          slaBreach: true,
          ticketAssigned: true,
          ticketCommented: false,
        },
        working_hours: {
          enabled: false,
          startTime: '09:00',
          endTime: '17:00',
          timezone: 'UTC',
          daysOfWeek: [1, 2, 3, 4, 5],
        },
        department_routing: [],
      })
    }

    res.json(config)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/teams/config
 * @desc    Create or update Teams configuration
 * @access  Private/Admin
 */
router.post('/config', async (req, res) => {
  try {
    const {
      organization_id,
      is_enabled,
      webhook_url,
      bot_id,
      tenant_id,
      channel_id,
      channel_name,
      notifications,
      working_hours,
      department_routing,
    } = req.body

    const targetOrgId = organization_id || null

    const configData = {
      organization_id: targetOrgId,
      is_enabled: is_enabled !== undefined ? is_enabled : false,
      webhook_url: webhook_url || null,
      bot_id: bot_id || null,
      tenant_id: tenant_id || null,
      channel_id: channel_id || null,
      channel_name: channel_name || null,
      notifications: notifications || {
        ticketCreated: true,
        ticketUpdated: true,
        ticketResolved: true,
        ticketClosed: true,
        slaBreach: true,
        ticketAssigned: true,
        ticketCommented: false,
      },
      working_hours: working_hours || {
        enabled: false,
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'UTC',
        daysOfWeek: [1, 2, 3, 4, 5],
      },
      department_routing: department_routing || [],
      created_by_id: req.user.id,
      updated_at: new Date().toISOString()
    }

    const { data: config, error } = await supabase
      .from('teams_config')
      .upsert(configData, { onConflict: 'organization_id' })
      .select('*, organization:organizations(name)')
      .single()

    if (error) throw error

    res.json(config)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/teams/config/:id
 * @desc    Update Teams configuration
 * @access  Private/Admin
 */
router.put('/config/:id', async (req, res) => {
  try {
    const {
      is_enabled,
      webhook_url,
      bot_id,
      tenant_id,
      channel_id,
      channel_name,
      notifications,
      working_hours,
      department_routing,
    } = req.body

    const updates = {}
    if (is_enabled !== undefined) updates.is_enabled = is_enabled
    if (webhook_url !== undefined) updates.webhook_url = webhook_url
    if (bot_id !== undefined) updates.bot_id = bot_id
    if (tenant_id !== undefined) updates.tenant_id = tenant_id
    if (channel_id !== undefined) updates.channel_id = channel_id
    if (channel_name !== undefined) updates.channel_name = channel_name
    if (notifications) updates.notifications = notifications
    if (working_hours) updates.working_hours = working_hours
    if (department_routing) updates.department_routing = department_routing

    const { data: config, error } = await supabase
      .from('teams_config')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, organization:organizations(name)')
      .single()

    if (error || !config) {
      return res.status(404).json({ message: 'Configuration not found' })
    }

    res.json(config)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/teams/test
 * @desc    Test Teams webhook
 * @access  Private/Admin
 */
router.post('/test', async (req, res) => {
  try {
    const { webhook_url } = req.body

    if (!webhook_url) {
      return res.status(400).json({ message: 'Webhook URL is required' })
    }

    await testTeamsWebhook(webhook_url)

    // Update last tested time if config exists
    const { organization_id } = req.query
    const targetOrgId = organization_id || null

    await supabase
      .from('teams_config')
      .update({ last_tested: new Date().toISOString() })
      .filter('organization_id', targetOrgId ? 'eq' : 'is', targetOrgId)

    res.json({ success: true, message: 'Test message sent successfully' })
  } catch (error) {
    console.error('Teams webhook test error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test message to Teams'
    })
  }
})

/**
 * @route   DELETE /api/teams/config/:id
 * @desc    Delete Teams configuration
 * @access  Private/Admin
 */
router.delete('/config/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('teams_config')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error

    res.json({ message: 'Teams configuration deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/teams/webhook
 * @desc    Receive webhook from Teams (for bot interactions)
 * @access  Public (Teams will call this)
 */
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const { type, value } = req.body

    if (type === 'ping') {
      return res.json({ type: 'pong' })
    }

    if (type === 'message') {
      console.log('Teams webhook received:', value)
      return res.json({ type: 'message', text: 'Message received' })
    }

    res.json({ status: 'ok' })
  } catch (error) {
    console.error('Teams webhook handler error:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router

