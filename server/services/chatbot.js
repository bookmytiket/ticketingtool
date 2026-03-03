/**
 * Chatbot Service
 * Handles chatbot logic, intent detection, and responses
 */

import supabase from '../config/supabase.js'
import { SLA_POLICIES } from '../config/sla.js'

/**
 * Detect intent from user message
 */
export const detectIntent = async (message, userId, organizationId, session = null) => {
  const lowerMessage = message.toLowerCase().trim()

  // If in ticket creation flow, handle it as ticket creation step
  const conversationState = session?.metadata?.conversationState

  if (conversationState === 'creating_ticket') {
    return { intent: 'ticket_creation_step', confidence: 1.0, session }
  }

  // Check for ticket status queries
  if (lowerMessage.match(/status|where is|show.*ticket|ticket.*status/i)) {
    return { intent: 'check_status', confidence: 0.9 }
  }

  // Check for ticket creation
  if (lowerMessage.match(/create|new ticket|raise|report.*issue|need help/i)) {
    return { intent: 'create_ticket', confidence: 0.85 }
  }

  // Check for greeting
  if (lowerMessage.match(/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)/i)) {
    return { intent: 'greeting', confidence: 0.95 }
  }

  // Check for escalation
  if (lowerMessage.match(/speak.*human|talk.*agent|escalate|transfer|connect.*support/i)) {
    return { intent: 'escalate', confidence: 0.9 }
  }

  // Check FAQ
  const faqMatch = await matchFAQ(lowerMessage, organizationId)
  if (faqMatch) {
    return { intent: 'faq', confidence: faqMatch.confidence, faq: faqMatch.faq }
  }

  return { intent: 'unknown', confidence: 0.3 }
}

/**
 * Match message against FAQs
 */
const matchFAQ = async (message, organizationId) => {
  try {
    // Search in organization-specific FAQs first, then global
    const { data: faqs, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .order('priority', { ascending: false })

    if (error) throw error

    let bestMatch = null
    let bestScore = 0

    for (const faq of faqs || []) {
      let score = 0

      // Check keywords
      for (const keyword of faq.keywords || []) {
        if (message.includes(keyword.toLowerCase())) {
          score += 2
        }
      }

      // Check question similarity (simple word matching)
      const questionWords = faq.question.toLowerCase().split(/\s+/)
      const messageWords = message.split(/\s+/)
      const commonWords = questionWords.filter(word => messageWords.includes(word))
      score += commonWords.length * 0.5

      // Exact question match
      if (message.includes(faq.question.toLowerCase())) {
        score += 10
      }

      if (score > bestScore) {
        bestScore = score
        bestMatch = faq
      }
    }

    if (bestMatch && bestScore >= 2) {
      // Increment view count
      await supabase
        .from('faqs')
        .update({ view_count: (bestMatch.view_count || 0) + 1 })
        .eq('id', bestMatch.id)

      return {
        faq: bestMatch,
        confidence: Math.min(bestScore / 10, 0.95),
      }
    }

    return null
  } catch (error) {
    console.error('FAQ matching error:', error)
    return null
  }
}

/**
 * Generate bot response based on intent
 */
export const generateResponse = async (intent, session, message, userId) => {
  try {
    switch (intent.intent) {
      case 'greeting':
        return {
          content: "Hello! I'm here to help you with your support needs. You can:\n• Create a new ticket\n• Check ticket status\n• Ask common questions\n• Get help with IT issues\n\nHow can I assist you today?",
          quickActions: ['Create Ticket', 'Check Status', 'FAQ'],
        }

      case 'check_status':
        return await handleCheckStatus(userId, message)

      case 'create_ticket':
        return await handleStartTicketCreation(session, userId)

      case 'ticket_creation_step':
        return await handleTicketCreationStep(session, message, userId)

      case 'faq':
        return {
          content: intent.faq.answer,
          faqId: intent.faq.id,
        }

      case 'escalate':
        return await handleEscalation(session)

      default:
        return {
          content: "I'm not sure I understand. Could you please rephrase? You can:\n• Create a ticket\n• Check ticket status\n• Ask a question\n• Request to speak with a technician",
          quickActions: ['Create Ticket', 'Check Status', 'Contact Support'],
        }
    }
  } catch (error) {
    console.error('Response generation error:', error)
    return {
      content: "I'm sorry, I encountered an error. Please try again or contact support.",
    }
  }
}

/**
 * Handle ticket status check
 */
const handleCheckStatus = async (userId, message) => {
  try {
    // Extract ticket ID if mentioned
    const ticketIdMatch = message.match(/#?(\d+)/)
    let tickets = []

    if (ticketIdMatch) {
      const ticketIdNum = parseInt(ticketIdMatch[1])
      const { data: ticket } = await supabase
        .from('tickets')
        .select(`
          *,
          assignee:users!assignee_id(name),
          department:departments(name)
        `)
        .eq('ticket_id', ticketIdNum)
        .eq('creator_id', userId)
        .single()

      if (ticket) {
        tickets = [ticket]
      }
    } else {
      // Get all user's open tickets
      const { data } = await supabase
        .from('tickets')
        .select(`
          *,
          assignee:users!assignee_id(name),
          department:departments(name)
        `)
        .eq('creator_id', userId)
        .in('status', ['open', 'approval-pending', 'approved', 'in-progress'])
        .order('created_at', { ascending: false })
        .limit(5)

      tickets = data || []
    }

    if (tickets.length === 0) {
      return {
        content: "I couldn't find any open tickets. Would you like to create a new ticket?",
        quickActions: ['Create Ticket'],
      }
    }

    const ticketsList = tickets.map(ticket => {
      const status = ticket.status.replace('-', ' ').toUpperCase()
      const assignee = ticket.assignee?.name || 'Unassigned'
      const departmentName = ticket.department?.name || 'N/A'
      return `• Ticket #${ticket.ticket_id}: ${ticket.title}\n  Status: ${status}\n  Assigned to: ${assignee}\n  Department: ${departmentName}`
    }).join('\n\n')

    return {
      content: `Here are your tickets:\n\n${ticketsList}\n\nWould you like more details on any ticket?`,
      metadata: { tickets: tickets.map(t => t.ticket_id) },
    }
  } catch (error) {
    console.error('Check status error:', error)
    return {
      content: "I couldn't retrieve your ticket status. Please try again or contact support.",
    }
  }
}

/**
 * Handle escalation to human agent
 */
const handleEscalation = async (session) => {
  try {
    // Update session status in Supabase
    await supabase
      .from('chat_sessions')
      .update({
        status: 'escalated',
        escalated_at: new Date().toISOString()
      })
      .eq('id', session.id)

    // Find available technician
    const { data: technician } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'technician')
      .eq('organization_id', session.organization_id)
      .limit(1)
      .maybeSingle()

    if (technician) {
      await supabase
        .from('chat_sessions')
        .update({ assigned_to_id: technician.id })
        .eq('id', session.id)

      return {
        content: `I've escalated your conversation to ${technician.name}. They will respond shortly.`,
        metadata: { escalated: true, technicianId: technician.id },
      }
    }

    return {
      content: "I've noted your request to speak with a technician. A support agent will contact you soon. In the meantime, would you like to create a ticket?",
      quickActions: ['Create Ticket'],
    }
  } catch (error) {
    console.error('Escalation error:', error)
    return {
      content: "I've noted your request. A technician will be with you shortly.",
    }
  }
}

/**
 * Start ticket creation flow
 */
const handleStartTicketCreation = async (session, userId) => {
  try {
    // Update metadata for ticket creation
    const newMetadata = {
      ...(session.metadata || {}),
      conversationState: 'creating_ticket',
      ticketDraft: {},
      currentStep: 1,
    }

    await supabase
      .from('chat_sessions')
      .update({ metadata: newMetadata })
      .eq('id', session.id)

    return {
      content: "Great! I'll help you create a ticket. Let's start with the basics.\n\n**Title**\n\nPlease provide a brief title for your ticket (e.g., 'Unable to login to system'):",
      quickActions: [],
      metadata: { step: 1, totalSteps: 4 },
    }
  } catch (error) {
    console.error('Start ticket creation error:', error)
    return {
      content: "I encountered an error starting ticket creation. Please try again.",
    }
  }
}

/**
 * Handle ticket creation step-by-step
 */
const handleTicketCreationStep = async (session, message, userId) => {
  try {
    // Reload session to ensure we have latest metadata
    const { data: freshSession } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', session.id)
      .single()

    if (!freshSession) throw new Error('Session not found')

    const metadata = freshSession.metadata || {}
    const currentStep = metadata.currentStep || 1
    const draft = metadata.ticketDraft || {}

    switch (currentStep) {
      case 1: // Title
        if (!message || message.trim().length < 3) {
          return {
            content: "Please provide a valid title (at least 3 characters). What would you like to name this ticket?",
            metadata: { step: 1, totalSteps: 4 },
          }
        }
        draft.title = message.trim()
        metadata.currentStep = 2
        metadata.ticketDraft = draft
        await supabase.from('chat_sessions').update({ metadata }).eq('id', freshSession.id)

        return {
          content: `**Description**\n\nTitle: "${draft.title}" ✓\n\nNow, please provide a detailed description of the issue:`,
          metadata: { step: 2, totalSteps: 4 },
        }

      case 2: // Description
        if (!message || message.trim().length < 10) {
          return {
            content: "Please provide a more detailed description (at least 10 characters). What details can you share about the issue?",
            metadata: { step: 2, totalSteps: 4 },
          }
        }
        draft.description = message.trim()
        metadata.currentStep = 3
        metadata.ticketDraft = draft
        await supabase.from('chat_sessions').update({ metadata }).eq('id', freshSession.id)

        // Get available categories
        const { data: categories } = await supabase
          .from('categories')
          .select('name')
          .eq('status', 'active')
          .or(`organization_id.eq.${freshSession.organization_id},organization_id.is.null`)
          .order('name', { ascending: true })
          .limit(10)

        const categoryOptions = (categories || []).map((cat, idx) => `${idx + 1}. ${cat.name}`).join('\n')
        const categoryList = (categories || []).map(cat => cat.name)

        return {
          content: `**Category**\n\nTitle: "${draft.title}" ✓\nDescription: "${draft.description.substring(0, 50)}..." ✓\n\nPlease select a category by typing the number or name:\n\n${categoryOptions}\n\nOr type a custom category name:`,
          quickActions: categoryList.slice(0, 5),
          metadata: { step: 3, totalSteps: 4, categories: categoryList },
        }

      case 3: // Category
        let selectedCategory = message.trim()
        const { data: availCats } = await supabase
          .from('categories')
          .select('name')
          .eq('status', 'active')
          .or(`organization_id.eq.${freshSession.organization_id},organization_id.is.null`)
          .order('name', { ascending: true })
          .limit(10)

        const categoryNum = parseInt(selectedCategory)
        if (!isNaN(categoryNum) && categoryNum > 0 && categoryNum <= (availCats?.length || 0)) {
          selectedCategory = availCats[categoryNum - 1].name
        } else {
          const matched = availCats?.find(cat => cat.name.toLowerCase() === selectedCategory.toLowerCase())
          if (matched) selectedCategory = matched.name
        }

        draft.category = selectedCategory
        metadata.currentStep = 4
        metadata.ticketDraft = draft
        await supabase.from('chat_sessions').update({ metadata }).eq('id', freshSession.id)

        return {
          content: `**Priority**\n\nTitle: "${draft.title}" ✓\nDescription: "${draft.description.substring(0, 50)}..." ✓\nCategory: "${draft.category}" ✓\n\nPlease select a priority level:\n\n1. Low\n2. Medium\n3. High\n4. Urgent\n\nType the number or name:`,
          quickActions: ['Low', 'Medium', 'High', 'Urgent'],
          metadata: { step: 4, totalSteps: 4 },
        }

      case 4: // Priority
        let priority = message.trim().toLowerCase()
        const priorityMap = {
          '1': 'low', '2': 'medium', '3': 'high', '4': 'urgent',
          'low': 'low', 'medium': 'medium', 'high': 'high', 'urgent': 'urgent',
        }

        priority = priorityMap[priority] || 'medium'
        draft.priority = priority

        // Create the ticket
        const ticket = await createTicketFromChat(freshSession, {
          title: draft.title,
          description: draft.description,
          category: draft.category,
          priority: priority,
        }, userId)

        // Reset metadata
        metadata.currentStep = 0
        metadata.conversationState = 'idle'
        metadata.ticketDraft = {}
        await supabase.from('chat_sessions').update({ metadata }).eq('id', freshSession.id)

        return {
          content: `✅ **Ticket Created Successfully!**\n\nTicket #${ticket.ticket_id} has been created with the following details:\n\n• **Title:** ${draft.title}\n• **Category:** ${draft.category}\n• **Priority:** ${priority.toUpperCase()}\n• **Status:** Open\n\nYou can track this ticket's status anytime by asking me or visiting the tickets page. Is there anything else I can help you with?`,
          messageType: 'ticket_created',
          metadata: { ticketId: ticket.ticket_id },
          quickActions: ['Check Status', 'Create Another Ticket'],
        }

      default:
        return {
          content: "I'm not sure what step we're on. Let's start over. Would you like to create a ticket?",
          quickActions: ['Create Ticket'],
        }
    }
  } catch (error) {
    console.error('Ticket creation step error:', error)
    return {
      content: "I encountered an error processing your ticket information. Would you like to start over?",
      quickActions: ['Create Ticket'],
    }
  }
}

/**
 * Create ticket from chat
 */
export const createTicketFromChat = async (session, ticketData, userId) => {
  try {
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single()
    const priority = ticketData.priority || 'medium'
    const createdAt = new Date()

    // Get SLA policy
    let { data: slaPolicy } = await supabase
      .from('sla_policies')
      .select('*')
      .eq('organization_id', user.organization_id)
      .eq('priority', priority)
      .eq('is_active', true)
      .maybeSingle()

    if (!slaPolicy) {
      const { data: globalPolicy } = await supabase
        .from('sla_policies')
        .select('*')
        .is('organization_id', null)
        .eq('priority', priority)
        .eq('is_active', true)
        .maybeSingle()
      slaPolicy = globalPolicy
    }

    const resTime = slaPolicy?.response_time || SLA_POLICIES[priority]?.responseTime || 24
    const resDay = slaPolicy?.resolution_time || SLA_POLICIES[priority]?.resolutionTime || 72

    const dueDate = new Date(createdAt.getTime() + resDay * 60 * 60 * 1000)
    const responseDueDate = new Date(createdAt.getTime() + resTime * 60 * 60 * 1000)

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert([{
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category || 'General',
        priority: priority,
        status: 'open',
        department_id: ticketData.department_id || user.department_id || null,
        creator_id: userId,
        organization_id: user.organization_id,
        due_date: dueDate.toISOString(),
        response_due_date: responseDueDate.toISOString(),
        sla_response_time: resTime,
        sla_resolution_time: resDay,
      }])
      .select('*')
      .single()

    if (error) throw error

    // Update session with ticket info
    await supabase
      .from('chat_sessions')
      .update({
        ticket_id_int: ticket.ticket_id,
        ticket_uuid: ticket.id
      })
      .eq('id', session.id)

    return ticket
  } catch (error) {
    console.error('Create ticket from chat error:', error)
    throw error
  }
}

export default {
  detectIntent,
  generateResponse,
  createTicketFromChat,
}

