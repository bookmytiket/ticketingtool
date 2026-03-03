/**
 * External API Integration Routes
 * Manage external integrations, webhooks, and Azure Sentinel
 */

import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// All routes require authentication
router.use(protect)

/**
 * @route   GET /api/integrations
 * @desc    Get all integrations
 * @access  Private/Admin
 */
router.get('/', admin, async (req, res) => {
  try {
    const { organization, type } = req.query
    let query = supabase
      .from('external_integrations')
      .select('*, organization:organizations(name), createdBy:users!created_by_id(name, email)')

    if (organization) {
      query = query.eq('organization_id', organization)
    }
    if (type) {
      query = query.eq('type', type)
    }

    const { data: integrations, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    res.json(integrations)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/integrations/:id
 * @desc    Get integration by ID
 * @access  Private/Admin
 */
router.get('/:id', admin, async (req, res) => {
  try {
    const { data: integration, error } = await supabase
      .from('external_integrations')
      .select('*, organization:organizations(name), createdBy:users!created_by_id(name, email)')
      .eq('id', req.params.id)
      .single()

    if (error || !integration) {
      return res.status(404).json({ message: 'Integration not found' })
    }

    res.json(integration)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/integrations
 * @desc    Create new integration
 * @access  Private/Admin
 */
router.post('/', admin, async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      config,
      organization,
      isActive,
    } = req.body

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' })
    }

    const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const webhookUrl = `/api/integrations/webhook/${webhookId}`;

    const { data: integration, error } = await supabase
      .from('external_integrations')
      .insert([{
        name,
        type,
        description: description || '',
        config: config || {},
        webhook_url: webhookUrl,
        organization_id: organization || null,
        is_active: isActive !== undefined ? isActive : true,
        created_by_id: req.user.id,
      }])
      .select('*, organization:organizations(name), createdBy:users!created_by_id(name, email)')
      .single()

    if (error) throw error

    res.status(201).json(integration)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/integrations/:id
 * @desc    Update integration
 * @access  Private/Admin
 */
router.put('/:id', admin, async (req, res) => {
  try {
    const { data: integration, error: fetchError } = await supabase
      .from('external_integrations')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !integration) {
      return res.status(404).json({ message: 'Integration not found' })
    }

    const {
      name,
      description,
      config,
      isActive,
    } = req.body

    const updates = {}
    if (name) updates.name = name
    if (description !== undefined) updates.description = description
    if (config) updates.config = { ...integration.config, ...config }
    if (isActive !== undefined) updates.is_active = isActive

    const { data: updated, error: updateError } = await supabase
      .from('external_integrations')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, organization:organizations(name), createdBy:users!created_by_id(name, email)')
      .single()

    if (updateError) throw updateError

    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   DELETE /api/integrations/:id
 * @desc    Delete integration
 * @access  Private/Admin
 */
router.delete('/:id', admin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('external_integrations')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'Integration deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/integrations/webhook/:webhookId
 * @desc    Webhook endpoint for external integrations (Azure Sentinel, etc.)
 * @access  Public (authenticated via webhook URL)
 */
router.post('/webhook/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params
    const webhookUrl = `/api/integrations/webhook/${webhookId}`

    const { data: integration, error } = await supabase
      .from('external_integrations')
      .select('*')
      .eq('webhook_url', webhookUrl)
      .eq('is_active', true)
      .single()

    if (error || !integration) {
      return res.status(404).json({ message: 'Webhook not found or inactive' })
    }

    // Update trigger stats
    await supabase
      .from('external_integrations')
      .update({
        last_triggered: new Date().toISOString(),
        trigger_count: (integration.trigger_count || 0) + 1
      })
      .eq('id', integration.id)

    // Process based on integration type
    if (integration.type === 'azure-sentinel') {
      await processAzureSentinelAlert(req.body, integration)
    } else {
      await processGenericWebhook(req.body, integration)
    }

    res.json({ success: true, message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * Process Azure Sentinel alert and create ticket
 */
const processAzureSentinelAlert = async (alertData, integration) => {
  try {
    // Map Azure Sentinel alert to ticket fields
    const mapping = integration.config?.fieldMapping || {}

    // Default Azure Sentinel alert structure
    const alert = alertData.data || alertData

    // Extract ticket information
    const title = alert[mapping.title] || alert.AlertDisplayName || alert.Title || 'Azure Sentinel Alert'
    const description = alert[mapping.description] || alert.Description || JSON.stringify(alert, null, 2)
    const severity = alert[mapping.severity] || alert.Severity || alert.SeverityName || 'medium'
    const categoryName = alert[mapping.category] || alert.Category || 'Security'
    const alertId = alert[mapping.alertId] || alert.AlertId || alert.SystemAlertId || null

    // Map severity to priority
    const priorityMap = {
      'Critical': 'urgent',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
      'Informational': 'low',
    }
    const priority = priorityMap[severity] || 'medium'

    // Check if ticket already exists for this alert
    if (alertId) {
      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('id, ticket_id')
        .contains('metadata', { azureSentinelAlertId: alertId })
        .maybeSingle()

      if (existingTicket) {
        console.log(`Ticket already exists for Azure Sentinel alert: ${alertId}`)
        return existingTicket
      }
    }

    // Get or create system user for Azure Sentinel
    let { data: systemUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'azure-sentinel@system.local')
      .maybeSingle()

    if (!systemUser) {
      const { data: newUser } = await supabase
        .from('users')
        .insert([{
          name: 'Azure Sentinel',
          email: 'azure-sentinel@system.local',
          password: null,
          role: 'user',
          status: 'active',
          organization_id: integration.organization_id || null,
        }])
        .select('id')
        .single()
      systemUser = newUser
    }

    // Create ticket
    const ticketData = {
      title: title.length > 100 ? title.substring(0, 100) : title,
      description: `**Azure Sentinel Alert**\n\n${description}\n\n**Alert Details:**\n\`\`\`json\n${JSON.stringify(alert, null, 2)}\n\`\`\``,
      category: categoryName,
      priority: priority,
      creator_id: systemUser.id,
      status: 'open',
      organization_id: integration.organization_id || null,
      metadata: {
        source: 'azure-sentinel',
        azureSentinelAlertId: alertId,
        integrationId: integration.id,
        rawAlert: alert,
      }
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert([ticketData])
      .select('*')
      .single()

    if (ticketError) throw ticketError

    // Add initial comment
    await supabase
      .from('comments')
      .insert([{
        ticket_id: ticket.id,
        author_id: systemUser.id,
        content: `Alert received from Azure Sentinel integration: ${integration.name}`
      }])

    console.log(`✅ Created ticket #${ticket.ticket_id} from Azure Sentinel alert: ${alertId || 'N/A'}`)

    return ticket
  } catch (error) {
    console.error('Error processing Azure Sentinel alert:', error)
    throw error
  }
}

/**
 * Process generic webhook and create ticket
 */
const processGenericWebhook = async (webhookData, integration) => {
  try {
    const mapping = integration.config?.fieldMapping || {}

    const title = webhookData[mapping.title] || webhookData.title || 'Webhook Alert'
    const description = webhookData[mapping.description] || webhookData.description || JSON.stringify(webhookData, null, 2)
    const priority = webhookData[mapping.priority] || webhookData.priority || 'medium'
    const categoryName = webhookData[mapping.category] || webhookData.category || 'General'

    // Get or create system user
    let { data: systemUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'webhook@system.local')
      .maybeSingle()

    if (!systemUser) {
      const { data: newUser } = await supabase
        .from('users')
        .insert([{
          name: 'Webhook System',
          email: 'webhook@system.local',
          password: null,
          role: 'user',
          status: 'active',
          organization_id: integration.organization_id || null,
        }])
        .select('id')
        .single()
      systemUser = newUser
    }

    const ticketData = {
      title: title.length > 100 ? title.substring(0, 100) : title,
      description: `**Webhook Alert from ${integration.name}**\n\n${description}`,
      category: categoryName,
      priority: priority,
      creator_id: systemUser.id,
      status: 'open',
      organization_id: integration.organization_id || null,
      metadata: {
        source: 'webhook',
        integrationId: integration.id,
        rawData: webhookData,
      }
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert([ticketData])
      .select('*')
      .single()

    if (ticketError) throw ticketError

    // Add initial comment
    await supabase
      .from('comments')
      .insert([{
        ticket_id: ticket.id,
        author_id: systemUser.id,
        content: `Alert received from webhook integration: ${integration.name}`
      }])

    console.log(`✅ Created ticket #${ticket.ticket_id} from webhook: ${integration.name}`)

    return ticket
  } catch (error) {
    console.error('Error processing webhook:', error)
    throw error
  }
}

export default router

