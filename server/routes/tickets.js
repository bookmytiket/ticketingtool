import express from 'express'
import multer from 'multer'
import supabase from '../config/supabase.js'
import { protect } from '../middleware/auth.js'
import upload from '../middleware/upload.js'
import { SLA_POLICIES } from '../config/sla.js'

const router = express.Router()

// @route   GET /api/tickets
// @desc    Get all tickets (users only see their own, admins/agents see all)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, priority, search, organization, department } = req.query

    let query = supabase
      .from('tickets')
      .select(`
        *,
        creator:users!creator_id(id, name, email),
        assignee:users!assignee_id(id, name, email),
        department:departments(id, name),
        approvedBy:users!approved_by(id, name, email),
        organization:organizations(id, name)
      `)

    // Filter by organization
    if (req.user.role === 'admin') {
      if (organization) {
        query = query.eq('organization_id', organization)
      }
    } else {
      // Non-admins only see their own organization's tickets
      query = query.eq('organization_id', req.user.organization_id)
    }

    // Role-based filtering
    if (req.user.role === 'user') {
      query = query.eq('creator_id', req.user.id)
    } else if (req.user.role === 'technician') {
      query = query.eq('assignee_id', req.user.id)
    } else if (req.user.role === 'department-head') {
      if (req.user.department_id) {
        query = query.eq('department_id', req.user.department_id)
      } else {
        return res.json([])
      }
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }
    if (department) {
      query = query.eq('department_id', department)
    }

    // Search functionality
    if (search) {
      const searchNum = parseInt(search)
      if (!isNaN(searchNum)) {
        query = query.or(`title.ilike.%${search}%,ticket_id.eq.${searchNum}`)
      } else {
        query = query.ilike('title', `%${search}%`)
      }
    }

    const { data: tickets, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    res.json(tickets)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/tickets/:id
// @desc    Get single ticket
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        creator:users!creator_id(id, name, email),
        assignee:users!assignee_id(id, name, email),
        department:departments(id, name),
        approvedBy:users!approved_by(id, name, email),
        comments (
          id,
          content,
          created_at,
          author:users!author_id(id, name, email)
        )
      `)
      .eq('ticket_id', req.params.id)
      .single()

    if (error || !ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    // Role-based access control
    const userRole = req.user.role
    const userId = req.user.id
    const userOrgId = req.user.organization_id

    if (userRole === 'admin') {
      // Admin sees all
    } else if (userRole === 'department-head') {
      if (ticket.department_id !== req.user.department_id) {
        return res.status(403).json({ message: 'Access denied' })
      }
    } else if (userRole === 'technician') {
      if (ticket.assignee_id !== userId && ticket.organization_id !== userOrgId) {
        return res.status(403).json({ message: 'Access denied' })
      }
    } else if (userRole === 'user') {
      if (ticket.creator_id !== userId) {
        return res.status(403).json({ message: 'Access denied' })
      }
    }

    res.json(ticket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/tickets
// @desc    Create new ticket
// @access  Private
router.post('/', protect, upload.array('attachments', 10), async (req, res) => {
  try {
    const { title, description, category, priority, assignee_id } = req.body
    const ticketPriority = priority || 'medium'
    const userOrganizationId = req.user.organization_id

    // Fetch SLA Policy from Supabase
    let { data: slaPolicy } = await supabase
      .from('sla_policies')
      .select('*')
      .eq('organization_id', userOrganizationId)
      .eq('priority', ticketPriority)
      .eq('is_active', true)
      .single()

    if (!slaPolicy) {
      const { data: globalPolicy } = await supabase
        .from('sla_policies')
        .select('*')
        .is('organization_id', null)
        .eq('priority', ticketPriority)
        .eq('is_active', true)
        .single()
      slaPolicy = globalPolicy
    }

    const resTime = slaPolicy?.response_time || SLA_POLICIES[ticketPriority]?.responseTime || 24
    const resDay = slaPolicy?.resolution_time || SLA_POLICIES[ticketPriority]?.resolutionTime || 72

    const createdAt = new Date()
    const dueDate = new Date(createdAt.getTime() + resDay * 60 * 60 * 1000)
    const responseDueDate = new Date(createdAt.getTime() + resTime * 60 * 60 * 1000)

    const ticketData = {
      title,
      description,
      category,
      priority: ticketPriority,
      status: 'open',
      creator_id: req.user.id,
      assignee_id: assignee_id || null,
      department_id: req.user.department_id,
      organization_id: userOrganizationId,
      due_date: dueDate.toISOString(),
      response_due_date: responseDueDate.toISOString(),
      sla_response_time: resTime,
      sla_resolution_time: resDay,
    }

    // Handle attachments if any (Supabase Storage would be better, but keeping FS for now)
    if (req.files && req.files.length > 0) {
      ticketData.attachments = req.files.map(file => ({
        filename: file.originalname,
        path: `/api/uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
      }))
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert([ticketData])
      .select(`
        *,
        creator:users!creator_id(id, name, email),
        assignee:users!assignee_id(id, name, email),
        department:departments(id, name)
      `)
      .single()

    if (error) throw error

    // Notifications (Async)
    if (ticket.creator?.email) {
      import('../services/emailService.js').then(({ sendTicketAcknowledgment }) => {
        sendTicketAcknowledgment(ticket, ticket.creator.email).catch(console.error)
      })
    }

    // Send email notification to assignee if assigned (async, don't wait)
    if (ticket.assignee?.email) {
      import('../services/emailService.js').then(({ sendEmail }) => {
        const subject = `Ticket #${ticket.ticket_id} Assigned to You - ${ticket.title}`
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Ticket Assigned</h2>
            <p>You have been assigned to ticket #${ticket.ticket_id}.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Title:</strong> ${ticket.title}</p>
              <p><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</p>
              <p><strong>Category:</strong> ${ticket.category}</p>
              <p><strong>Created By:</strong> ${ticket.creator?.name || 'Unknown'}</p>
              <p><strong>Department:</strong> ${ticket.department?.name || 'N/A'}</p>
            </div>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.ticket_id}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a></p>
          </div>
        `
        sendEmail(ticket.assignee.email, subject, html).catch(err => {
          console.error('Assignee email notification error:', err)
        })
      })
    }

    // Send Teams notification (async, don't wait)
    import('../services/teamsService.js').then(({ notifyTicketCreated }) => {
      notifyTicketCreated(ticket, userOrganizationId).catch(err => {
        console.error('Teams notification error:', err)
      })
    })

    res.status(201).json(ticket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   PUT /api/tickets/:id
// @desc    Update ticket
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_id', req.params.id)
      .single()

    if (fetchError || !ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    // RBAC
    if (req.user.role !== 'admin' && req.user.role !== 'technician') {
      if (ticket.creator_id !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' })
      }
      const { status, priority, assignee_id } = req.body
      if (status !== undefined || priority !== undefined || assignee_id !== undefined) {
        return res.status(403).json({ message: 'Insufficient permissions to update status/priority/assignee' })
      }
    }

    const { title, description, status, priority, assignee_id } = req.body
    const updates = {}
    const changes = {} // For notifications

    if (title) updates.title = title
    if (description) updates.description = description

    const oldAssigneeId = ticket.assignee_id;

    if (req.user.role === 'admin' || req.user.role === 'technician') {
      if (status && status !== ticket.status) {
        updates.status = status
        changes.status = status
      }
      if (assignee_id !== undefined && assignee_id !== ticket.assignee_id) {
        updates.assignee_id = assignee_id
        changes.assignee = assignee_id // Will be populated later for email
      }

      if (priority && priority !== ticket.priority) {
        updates.priority = priority
        changes.priority = priority
        // Recalculate SLA
        let { data: slaPolicy } = await supabase
          .from('sla_policies')
          .select('*')
          .eq('organization_id', ticket.organization_id)
          .eq('priority', priority)
          .eq('is_active', true)
          .single()

        if (!slaPolicy) {
          const { data: globalPolicy } = await supabase
            .from('sla_policies')
            .select('*')
            .is('organization_id', null)
            .eq('priority', priority)
            .eq('is_active', true)
            .single()
          slaPolicy = globalPolicy
        }

        const resTime = slaPolicy?.response_time || SLA_POLICIES[priority]?.responseTime || 24
        const resDay = slaPolicy?.resolution_time || SLA_POLICIES[priority]?.resolutionTime || 72

        const createdAt = new Date(ticket.created_at)
        updates.due_date = new Date(createdAt.getTime() + resDay * 60 * 60 * 1000).toISOString()
        updates.response_due_date = new Date(createdAt.getTime() + resTime * 60 * 60 * 1000).toISOString()
        updates.sla_response_time = resTime
        updates.sla_resolution_time = resDay
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(200).json(ticket); // No changes to apply
    }

    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update(updates)
      .eq('ticket_id', req.params.id)
      .select(`
        *,
        creator:users!creator_id(id, name, email),
        assignee:users!assignee_id(id, name, email),
        department:departments(id, name),
        approvedBy:users!approved_by(id, name, email)
      `)
      .single()

    if (updateError) throw updateError

    // Notifications (Async)
    // Send email to ticket creator on any update
    if (Object.keys(changes).length > 0 && updatedTicket.creator?.email) {
      import('../services/emailService.js').then(({ sendTicketUpdateEmail }) => {
        sendTicketUpdateEmail(updatedTicket, updatedTicket.creator.email, changes).catch(err => {
          console.error('Email notification error:', err)
        })
      })
    }

    // If status changed to approval-pending, notify department head
    if (status && status === 'approval-pending' && updatedTicket.department?.id) {
      import('../services/emailService.js').then(async ({ sendEmail }) => {
        try {
          const { data: departmentData } = await supabase
            .from('departments')
            .select('name, head:users!head_id(id, name, email)')
            .eq('id', updatedTicket.department.id)
            .single()

          if (departmentData?.head?.email) {
            const subject = `Ticket #${updatedTicket.ticket_id} Pending Approval - ${updatedTicket.title}`
            const html = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">Ticket Pending Approval</h2>
                <p>Dear ${departmentData.head.name || 'Department Head'},</p>
                <p>A ticket has been moved to <strong style="color: #f59e0b;">Approval Pending</strong> status and requires your review.</p>
                <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #f59e0b;">Ticket Details:</h3>
                  <p><strong>Ticket ID:</strong> #${updatedTicket.ticket_id}</p>
                  <p><strong>Title:</strong> ${updatedTicket.title}</p>
                  <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">APPROVAL PENDING</span></p>
                  <p><strong>Priority:</strong> ${updatedTicket.priority.toUpperCase()}</p>
                  <p><strong>Category:</strong> ${updatedTicket.category}</p>
                  <p><strong>Created By:</strong> ${updatedTicket.creator?.name || 'Unknown'}</p>
                  <p><strong>Department:</strong> ${departmentData.name}</p>
                  <p><strong>Created:</strong> ${new Date(updatedTicket.created_at).toLocaleString()}</p>
                </div>
                <p>Please review and approve or reject this ticket.</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${updatedTicket.ticket_id}" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Review Ticket</a></p>
                <p>Best regards,<br>Support Team</p>
              </div>
            `
            await sendEmail(departmentData.head.email, subject, html)
          }
        } catch (err) {
          console.error('Department head notification error:', err)
        }
      })
    }

    // Send email to assignee if newly assigned
    if (assignee_id !== undefined && assignee_id !== oldAssigneeId && updatedTicket.assignee?.email) {
      import('../services/emailService.js').then(({ sendEmail }) => {
        const subject = `Ticket #${updatedTicket.ticket_id} Assigned to You - ${updatedTicket.title}`
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Ticket Assigned</h2>
            <p>You have been assigned to ticket #${updatedTicket.ticket_id}.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Title:</strong> ${updatedTicket.title}</p>
              <p><strong>Priority:</strong> ${updatedTicket.priority.toUpperCase()}</p>
              <p><strong>Status:</strong> ${updatedTicket.status}</p>
            </div>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${updatedTicket.ticket_id}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a></p>
          </div>
        `
        sendEmail(updatedTicket.assignee.email, subject, html).catch(err => {
          console.error('Assignee email notification error:', err)
        })
      })
    }

    // Send Teams notifications (async)
    const ticketOrgId = updatedTicket.organization_id
    import('../services/teamsService.js').then(({ notifyTicketUpdated, notifyTicketAssigned, notifyTicketResolved }) => {
      // Notify on status change
      if (status && status !== ticket.status) {
        if (status === 'resolved') {
          notifyTicketResolved(updatedTicket, ticketOrgId).catch(err => console.error('Teams notification error:', err))
        }
      }

      // Notify on assignment change
      if (assignee_id !== undefined && assignee_id !== oldAssigneeId && updatedTicket.assignee) {
        notifyTicketAssigned(updatedTicket, updatedTicket.assignee, ticketOrgId).catch(err => console.error('Teams notification error:', err))
      }

      // Notify on update
      if (Object.keys(changes).length > 0) {
        notifyTicketUpdated(updatedTicket, changes, ticketOrgId).catch(err => console.error('Teams notification error:', err))
      }
    })

    res.json(updatedTicket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/tickets/:id/comments
// @desc    Add comment to ticket
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, organization_id') // Select the internal 'id' for linking comments
      .eq('ticket_id', req.params.id)
      .single()

    if (ticketError || !ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    const { content } = req.body

    // Parse mentions from content (format: @username or @name)
    const mentionRegex = /@(\w+)/g
    const mentionedUsernames = []
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionedUsernames.push(match[1])
    }

    // Find mentioned users by name or email
    const mentionedUserIds = []
    if (mentionedUsernames.length > 0) {
      // Supabase doesn't have direct regex for `ilike` on multiple fields in `or` for `select`
      // We'll fetch users and filter in application for simplicity, or build complex `or` clauses
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('organization_id', ticket.organization_id) // Only users from same organization

      if (usersError) console.error("Error fetching users for mentions:", usersError);

      if (usersData) {
        for (const mention of mentionedUsernames) {
          const foundUser = usersData.find(user =>
            user.name.toLowerCase().includes(mention.toLowerCase()) ||
            user.email.toLowerCase().includes(mention.toLowerCase())
          );
          if (foundUser && !mentionedUserIds.includes(foundUser.id)) {
            mentionedUserIds.push(foundUser.id);
          }
        }
      }
    }

    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert([
        {
          ticket_id: ticket.id, // Use the internal ticket.id
          author_id: req.user.id,
          content,
          mentions: mentionedUserIds, // Store array of user IDs
          // attachments are not handled in this refactor, assuming they are not part of comments table for now
        }
      ])
      .select(`
        *,
        author:users!author_id(id, name, email),
        mentions:users!mentions(id, name, email)
      `)
      .single()

    if (commentError) throw commentError

    // Notifications for mentions (async)
    if (comment.mentions && comment.mentions.length > 0) {
      import('../services/emailService.js').then(({ sendEmail }) => {
        comment.mentions.forEach(mentionedUser => {
          if (mentionedUser.email && mentionedUser.id !== req.user.id) { // Don't notify self
            const subject = `You've been mentioned in Ticket #${req.params.id}`
            const html = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3b82f6;">You've been mentioned!</h2>
                <p>Hi ${mentionedUser.name},</p>
                <p>You were mentioned by ${comment.author?.name || 'Someone'} in a comment on ticket #${req.params.id}:</p>
                <div style="background: #e0f2fe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Comment:</strong> ${comment.content}</p>
                </div>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${req.params.id}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Ticket</a></p>
                <p>Best regards,<br>Support Team</p>
              </div>
            `
            sendEmail(mentionedUser.email, subject, html).catch(err => {
              console.error(`Mention email notification error for ${mentionedUser.email}:`, err)
            })
          }
        })
      })
    }

    res.status(201).json(comment)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/tickets/:id/approve
// @desc    Approve ticket (Department Head only)
// @access  Private
router.post('/:id/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'department-head' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only department heads or admins can approve tickets' })
    }

    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('*, department:departments(id, name, head_id)') // Select department and its head_id
      .eq('ticket_id', req.params.id)
      .single()

    if (fetchError || !ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    // Verify department head has access to this ticket's department
    if (req.user.role === 'department-head') {
      if (!ticket.department || ticket.department.head_id !== req.user.id) {
        return res.status(403).json({ message: 'You can only approve tickets from your department' })
      }
    }

    // Check if ticket is in approval-pending status
    if (ticket.status !== 'approval-pending') {
      return res.status(400).json({ message: 'Only tickets with approval-pending status can be approved' })
    }

    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'approved',
        approved_by: req.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('ticket_id', req.params.id)
      .select(`
        *,
        creator:users!creator_id(id, name, email),
        assignee:users!assignee_id(id, name, email),
        department:departments(id, name),
        approvedBy:users!approved_by(id, name, email)
      `)
      .single()

    if (updateError) throw updateError

    // Send email notification to ticket creator (async, don't wait)
    if (updatedTicket.creator?.email) {
      import('../services/emailService.js').then(({ sendEmail }) => {
        const subject = `Ticket #${updatedTicket.ticket_id} Approved - ${updatedTicket.title}`
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Ticket Approved</h2>
            <p>Dear ${updatedTicket.creator?.name || 'Customer'},</p>
            <p>Your ticket #${updatedTicket.ticket_id} has been <strong style="color: #10b981;">approved</strong> by ${updatedTicket.approvedBy?.name || 'Department Head'}.</p>
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #10b981;">Ticket Details:</h3>
              <p><strong>Ticket ID:</strong> #${updatedTicket.ticket_id}</p>
              <p><strong>Title:</strong> ${updatedTicket.title}</p>
              <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">APPROVED</span></p>
              <p><strong>Priority:</strong> ${updatedTicket.priority.toUpperCase()}</p>
              <p><strong>Category:</strong> ${updatedTicket.category}</p>
              <p><strong>Approved By:</strong> ${updatedTicket.approvedBy?.name || 'Department Head'}</p>
              <p><strong>Approved On:</strong> ${new Date(updatedTicket.approved_at).toLocaleString()}</p>
              ${updatedTicket.department ? `<p><strong>Department:</strong> ${updatedTicket.department.name}</p>` : ''}
            </div>
            <p>Your ticket is now approved and will be assigned to a technician for resolution.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${updatedTicket.ticket_id}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Ticket</a></p>
            <p>Best regards,<br>Support Team</p>
          </div>
        `
        sendEmail(updatedTicket.creator.email, subject, html).catch(err => {
          console.error('Approval email notification error:', err)
        })
      })
    }

    // Send Teams notification (async)
    const ticketOrgId = updatedTicket.organization_id
    import('../services/teamsService.js').then(({ notifyTicketUpdated }) => {
      notifyTicketUpdated(updatedTicket, { status: 'approved', approvedBy: updatedTicket.approvedBy?.name || 'Department Head' }, ticketOrgId).catch(err => {
        console.error('Teams notification error:', err)
      })
    })

    res.json(updatedTicket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/tickets/:id/reject
// @desc    Reject ticket (Department Head only)
// @access  Private
router.post('/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'department-head' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only department heads or admins can reject tickets' })
    }

    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('*, department:departments(id, name, head_id)') // Select department and its head_id
      .eq('ticket_id', req.params.id)
      .single()

    if (fetchError || !ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    // Verify department head has access to this ticket's department
    if (req.user.role === 'department-head') {
      if (!ticket.department || ticket.department.head_id !== req.user.id) {
        return res.status(403).json({ message: 'You can only reject tickets from your department' })
      }
    }

    // Check if ticket is in approval-pending status
    if (ticket.status !== 'approval-pending') {
      return res.status(400).json({ message: 'Only tickets with approval-pending status can be rejected' })
    }

    const { rejectionReason } = req.body

    // Reject ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'rejected',
        approved_by: req.user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectionReason || null
      })
      .eq('ticket_id', req.params.id)
      .select(`
        *,
        creator:users!creator_id(id, name, email),
        assignee:users!assignee_id(id, name, email),
        department:departments(id, name),
        approvedBy:users!approved_by(id, name, email)
      `)
      .single()

    if (updateError) throw updateError

    // Send email notification to ticket creator (async, don't wait)
    if (updatedTicket.creator?.email) {
      import('../services/emailService.js').then(({ sendEmail }) => {
        const subject = `Ticket #${updatedTicket.ticket_id} Rejected - ${updatedTicket.title}`
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Ticket Rejected</h2>
            <p>Dear ${updatedTicket.creator?.name || 'Customer'},</p>
            <p>We regret to inform you that your ticket #${updatedTicket.ticket_id} has been <strong style="color: #ef4444;">rejected</strong> by ${updatedTicket.approvedBy?.name || 'Department Head'}.</p>
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #ef4444;">Ticket Details:</h3>
              <p><strong>Ticket ID:</strong> #${updatedTicket.ticket_id}</p>
              <p><strong>Title:</strong> ${updatedTicket.title}</p>
              <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">REJECTED</span></p>
              <p><strong>Priority:</strong> ${(updatedTicket.priority || 'medium').toUpperCase()}</p>
              <p><strong>Category:</strong> ${updatedTicket.category}</p>
              <p><strong>Rejected By:</strong> ${updatedTicket.approvedBy?.name || 'Department Head'}</p>
              <p><strong>Rejected On:</strong> ${new Date(updatedTicket.approved_at).toLocaleString()}</p>
              ${updatedTicket.rejection_reason ? `<p><strong>Rejection Reason:</strong> ${updatedTicket.rejection_reason}</p>` : ''}
              ${updatedTicket.department ? `<p><strong>Department:</strong> ${updatedTicket.department.name}</p>` : ''}
            </div>
            <p>If you have any questions or concerns about this decision, please contact the department head or create a new ticket.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${updatedTicket.id}" style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Ticket</a></p>
            <p>Best regards,<br>Support Team</p>
          </div>
        `
        sendEmail(updatedTicket.creator.email, subject, html).catch(err => {
          console.error('Rejection email notification error:', err)
        })
      })
    }

    // Send Teams notification (async)
    const ticketOrgId = updatedTicket.organization_id
    import('../services/teamsService.js').then(({ notifyTicketUpdated }) => {
      notifyTicketUpdated(updatedTicket, { status: 'rejected', approvedBy: updatedTicket.approvedBy?.name || 'Department Head' }, ticketOrgId).catch(err => {
        console.error('Teams notification error:', err)
      })
    })

    res.json(updatedTicket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/tickets/stats/dashboard
// @desc    Get dashboard statistics (users only see their own stats)
// @access  Private
router.get('/stats/dashboard', protect, async (req, res) => {
  try {
    const { organization } = req.query

    let baseQuery = supabase.from('tickets').select('*', { count: 'exact', head: true })
    const userOrgId = req.user.organization_id

    // Filter by organization
    if (req.user.role === 'admin') {
      if (organization) {
        baseQuery = baseQuery.eq('organization_id', organization)
      }
    } else if (userOrgId) {
      baseQuery = baseQuery.eq('organization_id', userOrgId)
    }

    // Department Filtering
    if (req.user.role === 'department-head') {
      if (req.user.department_id) {
        baseQuery = baseQuery.eq('department_id', req.user.department_id)
      } else {
        return res.json({
          totalTickets: 0,
          openTickets: 0,
          approvalPendingTickets: 0,
          approvedTickets: 0,
          rejectedTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          overdueTickets: 0,
          recentTickets: [],
          statusDistribution: [],
          weeklyTrends: [],
          priorityDistribution: [],
          myOpenTickets: []
        })
      }
    }

    // Role-based filtering
    if (req.user.role === 'user') {
      baseQuery = baseQuery.eq('creator_id', req.user.id)
    } else if (req.user.role === 'technician') {
      baseQuery = baseQuery.eq('assignee_id', req.user.id)
    }

    const getCount = async (status) => {
      let q = baseQuery
      if (status) q = q.eq('status', status)
      const { count } = await q
      return count || 0
    }

    const totalTickets = await getCount()
    const openTickets = await getCount('open')
    const approvalPendingTickets = await getCount('approval-pending')
    const approvedTickets = await getCount('approved')
    const rejectedTickets = await getCount('rejected')
    const inProgressTickets = await getCount('in-progress')
    const resolvedTickets = await getCount('resolved')
    const closedTickets = await getCount('closed')

    // Due tickets
    const { count: overdueTickets } = await baseQuery
      .in('status', ['open', 'in-progress'])
      .lt('due_date', new Date().toISOString())

    // Recent Tickets
    const { data: recentTickets } = await supabase
      .from('tickets')
      .select(`
        *,
        creator:users!creator_id(id, name, email),
        assignee:users!assignee_id(id, name, email),
        department:departments(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    // Status Distribution
    const statusData = [
      { name: 'Open', value: openTickets, color: '#00ffff' },
      { name: 'In Progress', value: inProgressTickets, color: '#ff8800' },
      { name: 'Resolved', value: resolvedTickets, color: '#00ff80' },
      { name: 'Closed', value: closedTickets, color: '#888888' },
      { name: 'Approval Pending', value: approvalPendingTickets, color: '#ffaa00' },
      { name: 'Approved', value: approvedTickets, color: '#00aaff' },
      { name: 'Rejected', value: rejectedTickets, color: '#ff4444' }
    ].filter(item => item.value > 0)

    res.json({
      totalTickets,
      openTickets,
      approvalPendingTickets,
      approvedTickets,
      rejectedTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      overdueTickets,
      recentTickets: recentTickets || [],
      statusDistribution: statusData,
      weeklyTrends: [], // Placeholders for now
      priorityDistribution: [],
      myOpenTickets: []
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/tickets/import
// @desc    Import tickets from external system
// @access  Private/Admin
router.post('/import', protect, async (req, res) => {
  try {
    const { tickets } = req.body

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ message: 'Invalid tickets data. Expected an array.' })
    }

    const results = { success: 0, errors: [] }

    for (const ticketData of tickets) {
      try {
        const mappedTicket = {
          title: ticketData.title || 'Imported Ticket',
          description: ticketData.description || '',
          category: ticketData.category || 'General',
          priority: ticketData.priority || 'medium',
          status: ticketData.status || 'open',
          creator_id: req.user.id,
          organization_id: req.user.organization_id,
          created_at: ticketData.createdAt ? new Date(ticketData.createdAt).toISOString() : new Date().toISOString(),
        }

        const { error } = await supabase.from('tickets').insert([mappedTicket])
        if (error) throw error
        results.success++
      } catch (error) {
        results.errors.push({ title: ticketData.title, message: error.message })
      }
    }

    res.json(results)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

