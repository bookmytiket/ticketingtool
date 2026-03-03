/**
 * API Key Management Routes
 * Admin Only - Manage API keys for external integrations
 */

import express from 'express'
import crypto from 'crypto'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

// Helpers
const generateKey = () => `tk_${crypto.randomBytes(32).toString('hex')}`
const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex')

/**
 * @route   GET /api/api-keys
 * @desc    Get all API keys
 * @access  Private/Admin
 */
router.get('/', async (req, res) => {
  try {
    const { organization_id } = req.query

    let query = supabase
      .from('api_keys')
      .select('*, organization:organizations(name), creator:users!created_by_id(name, email)')

    if (organization_id) {
      query = query.eq('organization_id', organization_id)
    }

    const { data: apiKeys, error } = await query.order('created_at', { ascending: false })
    if (error) throw error

    // Don't send the actual key, only metadata
    const safeKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.key ? (key.key.substring(0, 10) + '...') : '',
      organization: key.organization,
      permissions: key.permissions,
      is_active: key.is_active,
      last_used: key.last_used,
      expires_at: key.expires_at,
      creator: key.creator,
      usage_count: key.usage_count,
      rate_limit: key.rate_limit,
      created_at: key.created_at,
      updated_at: key.updated_at,
    }))

    res.json(safeKeys)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/api-keys
 * @desc    Create new API key
 * @access  Private/Admin
 */
router.post('/', async (req, res) => {
  try {
    const { name, organization_id, permissions, expiresAt, rateLimit } = req.body

    if (!name) {
      return res.status(400).json({ message: 'API key name is required' })
    }

    const key = generateKey()
    const key_hash = hashKey(key)

    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert([{
        name,
        key,
        key_hash,
        organization_id: organization_id || null,
        permissions: permissions || ['read'],
        created_by_id: req.user.id,
        expires_at: expiresAt ? new Date(expiresAt) : null,
        rate_limit: rateLimit || 1000,
      }])
      .select('*')
      .single()

    if (error) throw error

    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      key, // Only returned on creation
      organization_id: apiKey.organization_id,
      permissions: apiKey.permissions,
      expires_at: apiKey.expires_at,
      rate_limit: apiKey.rate_limit,
      created_at: apiKey.created_at,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/api-keys/:id
 * @desc    Update API key
 * @access  Private/Admin
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, permissions, is_active, expiresAt, rateLimit } = req.body

    const updates = {}
    if (name) updates.name = name
    if (permissions) updates.permissions = permissions
    if (is_active !== undefined) updates.is_active = is_active
    if (expiresAt !== undefined) updates.expires_at = expiresAt ? new Date(expiresAt) : null
    if (rateLimit !== undefined) updates.rate_limit = rateLimit

    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error || !apiKey) {
      return res.status(404).json({ message: 'API key not found' })
    }

    res.json({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.key.substring(0, 10) + '...',
      organization_id: apiKey.organization_id,
      permissions: apiKey.permissions,
      is_active: apiKey.is_active,
      expires_at: apiKey.expires_at,
      rate_limit: apiKey.rate_limit,
      updated_at: apiKey.updated_at,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   DELETE /api/api-keys/:id
 * @desc    Delete API key
 * @access  Private/Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'API key deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/api-keys/:id/revoke
 * @desc    Revoke API key (deactivate)
 * @access  Private/Admin
 */
router.post('/:id/revoke', async (req, res) => {
  try {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'API key revoked successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/api-keys/:id/activate
 * @desc    Activate API key
 * @access  Private/Admin
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: true })
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'API key activated successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

