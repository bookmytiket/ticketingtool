/**
 * FAQ Management Routes
 * Admin Only
 */

import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

/**
 * @route   GET /api/faq
 * @desc    Get all FAQs (public endpoint for chatbot, admin endpoint for management)
 * @access  Public for GET, Private/Admin for POST/PUT/DELETE
 */
router.get('/', async (req, res) => {
  try {
    const { organization_id, category, search } = req.query

    let query = supabase
      .from('faqs')
      .select('*, organization:organizations(name), department:departments(name), creator:users!created_by_id(name)')
      .eq('is_active', true)

    if (organization_id) {
      query = query.or(`organization_id.eq.${organization_id},organization_id.is.null`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.textSearch('question', search, {
        config: 'english',
        type: 'plain'
      })
    }

    const { data: faqs, error } = await query.order('priority', { ascending: false }).order('view_count', { ascending: false })
    if (error) throw error

    res.json(faqs)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/faq/:id
 * @desc    Get FAQ by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { data: faq, error } = await supabase
      .from('faqs')
      .select('*, organization:organizations(name), department:departments(name)')
      .eq('id', req.params.id)
      .single()

    if (error || !faq) {
      return res.status(404).json({ message: 'FAQ not found' })
    }

    res.json(faq)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/faq
 * @desc    Create FAQ
 * @access  Private/Admin
 */
router.post('/', protect, admin, async (req, res) => {
  try {
    const { question, answer, keywords, category, organization_id, department_id, priority } = req.body

    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required' })
    }

    const { data: faq, error } = await supabase
      .from('faqs')
      .insert([{
        question,
        answer,
        keywords: keywords || [],
        category: category || 'general',
        organization_id: organization_id || null,
        department_id: department_id || null,
        priority: priority || 0,
        created_by_id: req.user.id,
      }])
      .select('*')
      .single()

    if (error) throw error
    res.status(201).json(faq)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/faq/:id
 * @desc    Update FAQ
 * @access  Private/Admin
 */
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { question, answer, keywords, category, is_active, priority } = req.body

    const updates = {}
    if (question) updates.question = question
    if (answer) updates.answer = answer
    if (keywords) updates.keywords = keywords
    if (category) updates.category = category
    if (is_active !== undefined) updates.is_active = is_active
    if (priority !== undefined) updates.priority = priority

    const { data: faq, error } = await supabase
      .from('faqs')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error || !faq) {
      return res.status(404).json({ message: 'FAQ not found' })
    }

    res.json(faq)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   DELETE /api/faq/:id
 * @desc    Delete FAQ
 * @access  Private/Admin
 */
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('faqs')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'FAQ deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/faq/:id/helpful
 * @desc    Mark FAQ as helpful
 * @access  Public
 */
router.post('/:id/helpful', async (req, res) => {
  try {
    // Increment helpful count
    const { data, error } = await supabase.rpc('increment_faq_helpful', { faq_id: req.params.id })

    if (error) {
      // Fallback if RPC not available
      const { data: faq } = await supabase.from('faqs').select('helpful_count').eq('id', req.params.id).single()
      if (faq) {
        const { data: updatedFaq } = await supabase
          .from('faqs')
          .update({ helpful_count: (faq.helpful_count || 0) + 1 })
          .eq('id', req.params.id)
          .select('helpful_count')
          .single()
        return res.json({ helpfulCount: updatedFaq.helpful_count })
      }
      return res.status(404).json({ message: 'FAQ not found' })
    }

    res.json({ helpfulCount: data })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

