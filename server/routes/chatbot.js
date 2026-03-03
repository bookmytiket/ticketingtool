/**
 * Chatbot API Routes
 */

import express from 'express'
import supabase from '../config/supabase.js'
import { protect } from '../middleware/auth.js'
import { detectIntent, generateResponse, createTicketFromChat } from '../services/chatbot.js'
import upload from '../middleware/upload.js'

const router = express.Router()

// Helper to generate unique session ID
const generateSessionId = () => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

/**
 * @route   POST /api/chatbot/session
 * @desc    Create or get chat session
 * @access  Private
 */
router.post('/session', protect, async (req, res) => {
  try {
    // Find active session or create new one
    let { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*, assignedTo:users!assigned_to_id(name, email), department:departments(name)')
      .eq('user_id', req.user.id)
      .in('status', ['active', 'escalated'])
      .maybeSingle()

    if (sessionError) throw sessionError

    if (!session) {
      const sessionId = generateSessionId()
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .insert([{
          session_id: sessionId,
          user_id: req.user.id,
          organization_id: req.user.organization_id || null,
          metadata: {
            userAgent: req.headers['user-agent'] || 'unknown',
            ipAddress: req.ip || 'unknown',
            platform: req.body.platform || 'web',
            conversationState: 'idle',
            ticketDraft: {},
            currentStep: 0,
          }
        }])
        .select('*, assignedTo:users!assigned_to_id(name, email), department:departments(name)')
        .single()

      if (createError) throw createError
      session = newSession
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*, senderId:users!sender_id(name, email)')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    res.json({
      session: {
        id: session.id,
        sessionId: session.session_id,
        status: session.status,
        assignedTo: session.assignedTo,
        department: session.department,
        ticketId: session.ticket_id_int,
        createdAt: session.created_at,
      },
      messages,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/chatbot/message
 * @desc    Send message to chatbot
 * @access  Private
 */
router.post('/message', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    const { message, sessionId } = req.body

    if (!message && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Message or attachment is required' })
    }

    // Get or create session
    let { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .or(`session_id.eq.${sessionId},and(user_id.eq.${req.user.id},status.in.(active,escalated))`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError) throw sessionError

    if (!session) {
      const newSessionId = generateSessionId()
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .insert([{
          session_id: newSessionId,
          user_id: req.user.id,
          organization_id: req.user.organization_id || null,
          metadata: {
            userAgent: req.headers['user-agent'] || 'unknown',
            ipAddress: req.ip || 'unknown',
            platform: req.body.platform || 'web',
            conversationState: 'idle',
            ticketDraft: {},
            currentStep: 0,
          }
        }])
        .select('*')
        .single()

      if (createError) throw createError
      session = newSession
    }

    // Ensure metadata structure exists
    if (!session.metadata) {
      session.metadata = {
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || 'unknown',
        platform: req.body.platform || 'web',
        conversationState: 'idle',
        ticketDraft: {},
        currentStep: 0,
      }
    } else {
      if (!session.metadata.conversationState) session.metadata.conversationState = 'idle'
      if (!session.metadata.ticketDraft) session.metadata.ticketDraft = {}
      if (session.metadata.currentStep === undefined) session.metadata.currentStep = 0
    }

    // Handle attachments
    const attachments = (req.files || []).map(file => ({
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    }))

    // Create user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('chat_messages')
      .insert([{
        session_id: session.id,
        sender: 'user',
        sender_id: req.user.id,
        content: message || 'File attachment',
        message_type: attachments.length > 0 ? 'file' : 'text',
        attachments,
      }])
      .select('*')
      .single()

    if (userMsgError) throw userMsgError

    // Detect intent
    const intent = await detectIntent(message || 'file', req.user.id, req.user.organization_id, session)

    // Generate bot response
    const botResponse = await generateResponse(intent, session, message || 'file', req.user.id)

    // Create bot message
    const { data: botMessage, error: botMsgError } = await supabase
      .from('chat_messages')
      .insert([{
        session_id: session.id,
        sender: 'bot',
        content: botResponse.content,
        message_type: botResponse.messageType || 'text',
        intent: intent.intent,
        confidence: intent.confidence,
        metadata: botResponse.metadata || {},
      }])
      .select('*')
      .single()

    if (botMsgError) throw botMsgError

    res.json({
      userMessage,
      botMessage: {
        ...botMessage,
        quickActions: botResponse.quickActions,
        faqId: botResponse.faqId,
      },
    })
  } catch (error) {
    console.error('Chatbot message error:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/chatbot/create-ticket
 * @desc    Create ticket from chat
 * @access  Private
 */
router.post('/create-ticket', protect, async (req, res) => {
  try {
    const { sessionId, title, description, priority, category, department_id } = req.body

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' })
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .or(`session_id.eq.${sessionId},and(user_id.eq.${req.user.id},status.in.(active,escalated))`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError || !session) {
      return res.status(404).json({ message: 'Chat session not found' })
    }

    // Create ticket
    const ticket = await createTicketFromChat(session, {
      title,
      description,
      priority: priority || 'medium',
      category: category || 'General',
      department_id,
    }, req.user.id)

    // Create system message
    const { data: systemMessage, error: systemMsgError } = await supabase
      .from('chat_messages')
      .insert([{
        session_id: session.id,
        sender: 'bot',
        content: `Ticket #${ticket.ticket_id} has been created successfully! You can track its status here or ask me anytime.`,
        message_type: 'ticket_created',
        metadata: { ticketId: ticket.ticket_id },
      }])
      .select('*')
      .single()

    if (systemMsgError) throw systemMsgError

    res.json({
      ticket,
      message: systemMessage,
    })
  } catch (error) {
    console.error('Create ticket from chat error:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/chatbot/history
 * @desc    Get chat history (for admins/technicians)
 * @access  Private
 */
router.get('/history', protect, async (req, res) => {
  try {
    const { userId, sessionId, limit = 50 } = req.query
    let query = supabase
      .from('chat_sessions')
      .select('*, user:users!user_id(name, email), assignedTo:users!assigned_to_id(name, email), department:departments(name)')

    // Regular users can only see their own chats
    if (req.user.role === 'user') {
      query = query.eq('user_id', req.user.id)
    } else if (userId) {
      query = query.eq('user_id', userId)
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data: sessions, error } = await query
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) throw error
    res.json(sessions)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/chatbot/session/:sessionId
 * @desc    Get chat session details
 * @access  Private
 */
router.get('/session/:sessionId', protect, async (req, res) => {
  try {
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*, user:users!user_id(name, email), assignedTo:users!assigned_to_id(name, email), department:departments(name), ticket:tickets!ticket_uuid(ticket_id, title, status)')
      .eq('session_id', req.params.sessionId)
      .single()

    if (sessionError || !session) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Check access
    if (req.user.role === 'user' && session.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*, senderId:users!sender_id(name, email)')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    res.json({
      session,
      messages,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/chatbot/escalate
 * @desc    Escalate chat to technician
 * @access  Private
 */
router.post('/escalate', protect, async (req, res) => {
  try {
    const { sessionId, departmentId } = req.body

    let { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .or(`session_id.eq.${sessionId},and(user_id.eq.${req.user.id},status.eq.active)`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError || !session) {
      return res.status(404).json({ message: 'Session not found' })
    }

    const updates = {
      status: 'escalated',
      escalated_at: new Date().toISOString()
    }

    if (departmentId) {
      updates.department_id = departmentId
    }

    // Find available technician
    if (departmentId) {
      const { data: department } = await supabase
        .from('departments')
        .select('head_id')
        .eq('id', departmentId)
        .single()

      if (department?.head_id) {
        updates.assigned_to_id = department.head_id
      }
    } else {
      const { data: technician } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'technician')
        .eq('organization_id', session.organization_id)
        .limit(1)
        .maybeSingle()

      if (technician) {
        updates.assigned_to_id = technician.id
      }
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('chat_sessions')
      .update(updates)
      .eq('id', session.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Create system message
    const { data: systemMessage } = await supabase
      .from('chat_messages')
      .insert([{
        session_id: updatedSession.id,
        sender: 'system',
        content: 'Your conversation has been escalated to a technician. They will respond shortly.',
        message_type: 'system',
      }])
      .select('*')
      .single()

    res.json({
      session: updatedSession,
      message: systemMessage,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

