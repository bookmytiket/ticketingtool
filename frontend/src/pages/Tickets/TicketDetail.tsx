import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../contexts/AuthContext'
import { ticketsAPI, usersAPI } from '../../services/api'
import { sendTicketUpdatedEmail, sendTicketCommentEmail } from '../../services/emailService'
import { ArrowLeft, User, Clock, MessageSquare, Paperclip, Calendar } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export const TicketDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [mentionUsers, setMentionUsers] = useState([])
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState([])
  const [mentionIndex, setMentionIndex] = useState(-1)
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [assignees, setAssignees] = useState([])
  const [assigneeLoading, setAssigneeLoading] = useState(false)
  const textareaRef = useRef(null)
  const mentionListRef = useRef(null)

  const formatStatus = (status) => {
    const statusMap = {
      'open': 'Open',
      'approval-pending': 'Approval Pending',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'in-progress': 'In Progress',
      'resolved': 'Resolved',
      'closed': 'Closed'
    }
    return statusMap[status] || status
  }

  useEffect(() => {
    loadTicket()
    loadMentionUsers()
    if (user?.role === 'admin' || user?.role === 'technician') {
      loadAssignees()
    }
  }, [id, user])

  const loadMentionUsers = async () => {
    try {
      const users = await usersAPI.getMentions()
      setMentionUsers(users)
    } catch (error) {
      console.error('Failed to load users for mentions:', error)
    }
  }

  const loadAssignees = async () => {
    try {
      setAssigneeLoading(true)
      const users = await usersAPI.getAll()
      console.log('All users loaded for assignees:', users?.length || 0, users)
      
      if (!users || users.length === 0) {
        console.warn('No users returned from API. User may not have access or no users exist.')
        setAssignees([])
        return
      }
      
      const assignable = (users || []).filter(u => {
        const hasValidRole = u.role === 'admin' || u.role === 'technician'
        const isActive = u.status === 'active' || u.is_active === true || u.isActive === true
        const result = hasValidRole && isActive
        if (!result && hasValidRole) {
          console.log('User filtered out (inactive):', u.name, u.email, 'status:', u.status, 'is_active:', u.is_active, 'isActive:', u.isActive)
        }
        return result
      })
      
      console.log('Assignable users found:', assignable.length, assignable.map(u => ({ name: u.name, role: u.role, status: u.status })))
      setAssignees(assignable)
      
      if (assignable.length === 0) {
        console.warn('No assignable users found. Check user roles and status.')
        // Don't show error toast - just log it, as empty list is valid
      }
    } catch (error) {
      console.error('Failed to load assignees:', error)
      // Handle 403 (Access Denied) silently - user doesn't have permission
      if (error.message && error.message.includes('403')) {
        console.log('User does not have permission to view users list. This is expected for some roles.')
        setAssignees([])
      } else if (error.message && error.message.includes('Access denied')) {
        console.log('Access denied to users endpoint. User may not have required permissions.')
        setAssignees([])
      } else {
        // Only show error for unexpected errors
        console.error('Unexpected error loading assignees:', error)
        // Don't show toast for permission errors, only for unexpected errors
        if (!error.message || (!error.message.includes('403') && !error.message.includes('Access denied'))) {
          toast.error('Failed to load assignees. Please check your permissions or contact admin.')
        }
        setAssignees([])
      }
    } finally {
      setAssigneeLoading(false)
    }
  }

  const loadTicket = async () => {
    try {
      setLoading(true)
      const data = await ticketsAPI.getById(id)
      setTicket(data)
    } catch (error) {
      toast.error('Failed to load ticket')
      navigate('/tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleCommentChange = (e) => {
    const value = e.target.value
    setNewComment(value)
    
    // Check for @ mentions
    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = value.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Check if there's a space after @ (meaning mention is complete)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        const searchTerm = textAfterAt.toLowerCase()
        const filtered = mentionUsers.filter(u => 
          u.name.toLowerCase().includes(searchTerm) || 
          u.email.toLowerCase().includes(searchTerm)
        )
        setMentionSuggestions(filtered)
        setMentionIndex(lastAtIndex)
        setShowMentionSuggestions(true)
        setSelectedMentionIndex(0)
        return
      }
    }
    
    setShowMentionSuggestions(false)
    setMentionIndex(-1)
  }

  const handleMentionSelect = (selectedUser) => {
    if (mentionIndex === -1) return
    
    const textBefore = newComment.substring(0, mentionIndex)
    const textAfter = newComment.substring(mentionIndex)
    const textAfterAt = textAfter.substring(1).split(/[\s\n]/)[0]
    const remainingText = textAfter.substring(textAfterAt.length + 1)
    
    const newText = `${textBefore}@${selectedUser.name}${remainingText}`
    setNewComment(newText)
    setShowMentionSuggestions(false)
    setMentionIndex(-1)
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const cursorPos = textBefore.length + selectedUser.name.length + 1
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(cursorPos, cursorPos)
      }
    }, 0)
  }

  const handleKeyDown = (e) => {
    if (showMentionSuggestions && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex(prev => 
          prev < mentionSuggestions.length - 1 ? prev + 1 : prev
        )
        if (mentionListRef.current) {
          const selectedElement = mentionListRef.current.children[selectedMentionIndex + 1]
          if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' })
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0)
        if (mentionListRef.current) {
          const selectedElement = mentionListRef.current.children[selectedMentionIndex - 1]
          if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' })
          }
        }
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        handleMentionSelect(mentionSuggestions[selectedMentionIndex])
      } else if (e.key === 'Escape') {
        setShowMentionSuggestions(false)
      }
    }
  }

  const renderCommentWithMentions = (content, mentions = []) => {
    if (!mentions || mentions.length === 0) {
      return <span>{content}</span>
    }
    
    const parts = []
    let lastIndex = 0
    const mentionMap = new Map(mentions.map(m => [m.name.toLowerCase(), m]))
    
    // Find all @mentions in the content
    const mentionRegex = /@(\w+)/g
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>)
      }
      
      const mentionedName = match[1]
      const mentionedUser = mentionMap.get(mentionedName.toLowerCase())
      
      if (mentionedUser) {
        parts.push(
          <span 
            key={`mention-${match.index}`}
            className="bg-cyber-neon-cyan/20 text-cyber-neon-cyan px-1 rounded font-semibold"
          >
            @{mentionedUser.name}
          </span>
        )
      } else {
        parts.push(<span key={`mention-${match.index}`}>@{mentionedName}</span>)
      }
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>)
    }
    
    return <>{parts}</>
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setCommentLoading(true)
    try {
      const updatedTicket = await ticketsAPI.addComment(id, {
        content: newComment,
        attachments: [],
      })
      
      setTicket(updatedTicket)
      setNewComment('')
      setShowMentionSuggestions(false)
      
      // Send email notification about new comment
      try {
        const creatorEmail = ticket?.creator?.email
        if (creatorEmail) {
          const comment = updatedTicket.comments[updatedTicket.comments.length - 1]
        await sendTicketCommentEmail(ticket, creatorEmail, comment)
        toast.success('Comment added successfully! Email notification sent.')
        } else {
          toast.success('Comment added successfully!')
        }
      } catch (error) {
        toast.success('Comment added successfully!')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add comment. Please try again.')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    const oldStatus = ticket.status
    
    try {
      const updatedTicket = await ticketsAPI.update(id, { status: newStatus })
      setTicket(updatedTicket)
    
    // Send email notification about status change
    try {
      const changes = {
        Status: `${oldStatus} → ${newStatus}`
      }
        const creatorEmail = ticket?.creator?.email
        if (creatorEmail) {
          await sendTicketUpdatedEmail(updatedTicket, creatorEmail, changes)
      toast.success(`Ticket status updated to ${newStatus}. Email notification sent.`)
        } else {
          toast.success(`Ticket status updated to ${newStatus}`)
        }
      } catch (error) {
        toast.success(`Ticket status updated to ${newStatus}`)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update ticket status')
      // Revert status on error
      e.target.value = oldStatus
    }
  }

  const handleAssigneeChange = async (e) => {
    const newAssignee = e.target.value || null
    try {
      const updatedTicket = await ticketsAPI.update(id, { assignee: newAssignee })
      setTicket(updatedTicket)
      toast.success(newAssignee ? 'Ticket assigned successfully' : 'Ticket unassigned')
    } catch (error) {
      toast.error(error.message || 'Failed to update assignee')
    }
  }

  const canAssign = user?.role === 'admin' || user?.role === 'technician'

  if (loading || !ticket) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  const getPriorityVariant = (priority) => {
    if (priority === 'urgent' || priority === 'high') return 'danger'
    if (priority === 'medium') return 'warning'
    return 'info'
  }

  const getStatusVariant = (status) => {
    if (status === 'resolved') return 'success'
    if (status === 'in-progress') return 'info'
    if (status === 'approved') return 'success'
    if (status === 'rejected') return 'danger'
    if (status === 'approval-pending') return 'warning'
    return 'warning'
  }

  const handleApprove = async () => {
    try {
      const updatedTicket = await ticketsAPI.approveTicket(id)
      setTicket(updatedTicket)
      toast.success('Ticket approved successfully!')
    } catch (error) {
      toast.error(error.message || 'Failed to approve ticket')
    }
  }

  const handleReject = async () => {
    const reason = window.prompt('Please provide a reason for rejection:')
    if (reason === null || !reason.trim()) {
      if (reason !== null) toast.error('Rejection reason is required')
      return
    }

    try {
      const updatedTicket = await ticketsAPI.rejectTicket(id, reason)
      setTicket(updatedTicket)
      toast.success('Ticket rejected')
    } catch (error) {
      toast.error(error.message || 'Failed to reject ticket')
    }
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/tickets')}>
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ticket #{ticket.ticketId}</h1>
              <p className="text-gray-600 mt-1">{ticket.title}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                </div>
              </div>
            </Card>

            {/* Comments Section */}
            <Card title="Comments">
              <div className="space-y-6">
                {ticket.comments && ticket.comments.map((comment) => (
                  <div key={comment._id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                        {comment.author?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">{comment.author?.name || 'Unknown'}</span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(comment.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {renderCommentWithMentions(comment.content, comment.mentions)}
                        </p>
                        {comment.mentions && comment.mentions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {comment.mentions.map((mention, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-cyber-neon-cyan/10 text-cyber-neon-cyan border border-cyber-neon-cyan/30"
                              >
                                @{mention.name || mention.email}
                              </span>
                            ))}
                          </div>
                        )}
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {comment.attachments.map((att, idx) => (
                              <button
                                key={idx}
                                className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700"
                              >
                                <Paperclip size={16} />
                                <span>{att.filename}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="pt-4 border-t border-gray-200">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      label="Add a comment"
                      placeholder="Type your comment here... Use @ to mention users"
                      value={newComment}
                      onChange={handleCommentChange}
                      onKeyDown={handleKeyDown}
                      rows={4}
                      required
                    />
                    {showMentionSuggestions && mentionSuggestions.length > 0 && (
                      <div 
                        ref={mentionListRef}
                        className="absolute z-10 mt-1 w-full bg-cyber-darker border-2 border-cyber-neon-cyan/50 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      >
                        {mentionSuggestions.map((user, idx) => (
                          <button
                            key={user._id || user.id}
                            type="button"
                            onClick={() => handleMentionSelect(user)}
                            className={`w-full text-left px-4 py-2 hover:bg-cyber-neon-cyan/20 transition-colors ${
                              idx === selectedMentionIndex ? 'bg-cyber-neon-cyan/30' : ''
                            }`}
                          >
                            <div className="font-medium text-cyber-neon-cyan">{user.name}</div>
                            <div className="text-xs text-cyber-neon-cyan/70">{user.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-2 text-sm text-cyber-neon-cyan/70">
                      <span>Tip: Type @ to mention users</span>
                    </div>
                    <Button type="submit" disabled={commentLoading || !newComment.trim()}>
                      {commentLoading ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card title="Details">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Status</label>
                  {/* Regular users can only view status, not edit */}
                  {user?.role === 'admin' || user?.role === 'technician' ? (
                    <select
                      value={ticket.status}
                      onChange={handleStatusChange}
                      className="input w-full"
                    >
                      <option value="open">Open</option>
                      <option value="approval-pending">Approval Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  ) : (
                    <Badge variant={getStatusVariant(ticket.status)}>
                      {formatStatus(ticket.status)}
                    </Badge>
                  )}
                  {/* Approval Actions for Department Head */}
                  {user?.role === 'department-head' && ticket.status === 'approval-pending' && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        transparent
                        onClick={handleApprove}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                      >
                        Approve
                      </Button>
                      <Button
                        transparent
                        onClick={handleReject}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {/* Approved By Info */}
                  {ticket.approvedBy && (
                    <div className="mt-2 text-xs text-gray-500">
                      {ticket.status === 'approved' ? 'Approved' : ticket.status === 'rejected' ? 'Rejected' : ''} by {ticket.approvedBy?.name || 'Unknown'}
                      {ticket.approvedAt && ` on ${format(new Date(ticket.approvedAt), 'MMM dd, yyyy HH:mm')}`}
                    </div>
                  )}
                  {ticket.rejectionReason && (
                    <div className="mt-2 text-xs text-red-600">
                      Reason: {ticket.rejectionReason}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Priority</label>
                  <Badge variant={getPriorityVariant(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Category</label>
                  <p className="text-gray-900">{ticket.category}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Assignee</label>
                  {canAssign ? (
                    <div className="space-y-2">
                      <select
                        value={ticket.assignee?._id || ticket.assignee || ''}
                        onChange={handleAssigneeChange}
                        className="input w-full"
                        disabled={assigneeLoading}
                      >
                        <option value="">Unassigned</option>
                        {assignees.map((assignee) => (
                          <option key={assignee._id || assignee.id} value={assignee._id || assignee.id}>
                            {assignee.name} {assignee.role ? `(${assignee.role})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500">
                        {assignees.length === 0 
                          ? 'No assignable users found. Please ensure there are active technicians in the system.'
                          : `Admins/Technicians can assign tickets. Current: ${ticket.assignee?.name || 'Unassigned'}`
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <User size={16} className="text-gray-400" />
                      <p className="text-gray-900">{ticket.assignee?.name || 'Unassigned'}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Due Date</label>
                  {user?.role === 'admin' || user?.role === 'technician' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(ticket.dueDate ? new Date(ticket.dueDate).toISOString().slice(0, 10) : '')
                          setIsDateModalOpen(true)
                        }}
                        className="w-full flex items-center justify-between px-4 py-2 bg-cyber-darker/50 border-2 border-cyber-neon-cyan/30 rounded-lg text-cyber-neon-cyan hover:border-cyber-neon-cyan transition-all duration-300"
                      >
                        <span className="flex items-center space-x-2">
                          <Calendar size={16} />
                          <span>{ticket.dueDate ? format(new Date(ticket.dueDate), 'MMM dd, yyyy') : 'Select Due Date'}</span>
                        </span>
                        <Calendar size={16} className="opacity-50" />
                      </button>
                      
                      <Modal
                        isOpen={isDateModalOpen}
                        onClose={() => setIsDateModalOpen(false)}
                        title="Select Due Date"
                        size="sm"
                        footer={
                          <div className="flex space-x-3">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedDate('')
                                setIsDateModalOpen(false)
                              }}
                            >
                              Clear
                            </Button>
                            <Button
                              onClick={async () => {
                                const newDueDate = selectedDate ? new Date(selectedDate + 'T00:00:00').toISOString() : null
                                try {
                                  const updatedTicket = await ticketsAPI.update(ticket.ticketId, { dueDate: newDueDate })
                                  setTicket(updatedTicket)
                                  setIsDateModalOpen(false)
                                  toast.success('Due date updated')
                                } catch (error) {
                                  console.error('Due date update error:', error)
                                  toast.error(error.message || 'Failed to update due date')
                                }
                              }}
                            >
                              Set Date
                            </Button>
                          </div>
                        }
                      >
                        <div className="py-4">
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="input w-full text-center text-lg"
                            min={new Date().toISOString().slice(0, 10)}
                          />
                        </div>
                      </Modal>
                    </>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-gray-400" />
                      <p className="text-gray-900">
                        {ticket.dueDate ? format(new Date(ticket.dueDate), 'MMM dd, yyyy') : 'Not set'}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Created</label>
                  <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-gray-400" />
                    <p className="text-gray-900">{format(new Date(ticket.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Last Updated</label>
                  <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-gray-400" />
                    <p className="text-gray-900">{format(new Date(ticket.updatedAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Created By</label>
                  <p className="text-gray-900">{ticket.creator?.name || 'Unknown'}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

