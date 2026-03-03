/**
 * Chat History
 * Admin/Technician - View chat history and conversations
 */

import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { chatbotAPI, usersAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { MessageSquare, Search, Eye, User as UserIcon } from 'lucide-react'
import { format } from 'date-fns'

export const ChatHistory = () => {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [filters, setFilters] = useState({
    userId: '',
    status: '',
    search: '',
  })

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'technician')) {
      loadSessions()
      if (user.role === 'admin') {
        loadUsers()
      }
    }
  }, [user, filters])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const data = await chatbotAPI.getHistory(filters.userId || null)
      let filtered = data

      if (filters.status) {
        filtered = filtered.filter(s => s.status === filters.status)
      }

      if (filters.search) {
        const search = filters.search.toLowerCase()
        filtered = filtered.filter(s => 
          s.sessionId.toLowerCase().includes(search) ||
          s.user?.name?.toLowerCase().includes(search) ||
          s.user?.email?.toLowerCase().includes(search)
        )
      }

      setSessions(filtered)
    } catch (error) {
      console.error('Failed to load chat sessions', error)
      toast.error('Failed to load chat history')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await usersAPI.getAll()
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users', error)
    }
  }

  const loadSessionDetails = async (sessionId) => {
    try {
      setLoading(true)
      const data = await chatbotAPI.getSession(sessionId)
      if (data && data.session) {
        setSelectedSession(data.session)
        setMessages(data.messages || [])
      } else {
        // Fallback: try to get from sessions list
        const session = sessions.find(s => s.sessionId === sessionId)
        if (session) {
          setSelectedSession(session)
          // Try to load messages separately
          try {
            const messagesData = await chatbotAPI.getHistory(null, 100)
            const sessionMessages = messagesData
              .find(s => s.sessionId === sessionId)
              ?.messages || []
            setMessages(sessionMessages)
          } catch (e) {
            console.error('Failed to load messages', e)
            setMessages([])
          }
        }
      }
    } catch (error) {
      console.error('Failed to load session details', error)
      toast.error(error.message || 'Failed to load session details')
      // Try to at least set the session from the list
      const session = sessions.find(s => s.sessionId === sessionId)
      if (session) {
        setSelectedSession(session)
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status) => {
    const variants = {
      active: 'info',
      resolved: 'success',
      escalated: 'warning',
      closed: 'danger',
    }
    return variants[status] || 'info'
  }

  if (!user || (user.role !== 'admin' && user.role !== 'technician')) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Access denied. Admin or Technician access required.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
            Chat History
          </h1>
          <p className="text-sm text-gray-600">View and manage chat conversations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {user.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">User</label>
                    <Select
                      value={filters.userId}
                      onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                      options={[
                        { value: '', label: 'All Users' },
                        ...users.map(u => ({
                          value: u._id || u.id,
                          label: `${u.name} (${u.email})`,
                        })),
                      ]}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <Select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'active', label: 'Active' },
                      { value: 'escalated', label: 'Escalated' },
                      { value: 'resolved', label: 'Resolved' },
                      { value: 'closed', label: 'Closed' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                  <div className="flex items-center gap-2">
                    <Search className="text-gray-400" size={18} />
                    <Input
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      placeholder="Search sessions..."
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Sessions */}
            <Card>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
                  <p className="text-gray-600">Loading chat sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">No chat sessions found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session._id}
                      onClick={() => loadSessionDetails(session.sessionId)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedSession?._id === session._id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <UserIcon size={16} className="text-gray-400" />
                            <span className="font-semibold text-gray-900">
                              {session.user?.name || 'Unknown User'}
                            </span>
                            <Badge variant={getStatusVariant(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{session.user?.email}</p>
                          {session.ticketId && (
                            <p className="text-xs text-primary-600 mt-1">
                              Ticket #{session.ticketId}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(session.createdAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        <Eye className="text-gray-400" size={18} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Messages View */}
          <div className="lg:col-span-1">
            <Card>
              {loading && selectedSession ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
                  <p className="text-gray-600">Loading messages...</p>
                </div>
              ) : selectedSession ? (
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <h3 className="font-semibold text-gray-900 mb-3">Conversation Details</h3>
                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="flex items-center gap-2">
                        <UserIcon size={16} className="text-gray-400" />
                        <span><strong>User:</strong> {selectedSession.user?.name || 'Unknown'}</span>
                      </div>
                      <div>
                        <strong>Email:</strong> {selectedSession.user?.email || 'N/A'}
                      </div>
                      <div>
                        <strong>Status:</strong> <Badge variant={getStatusVariant(selectedSession.status)}>{selectedSession.status}</Badge>
                      </div>
                      {selectedSession.assignedTo && (
                        <div>
                          <strong>Assigned to:</strong> {selectedSession.assignedTo?.name || selectedSession.assignedTo?.email}
                        </div>
                      )}
                      {selectedSession.ticketId && (
                        <div>
                          <strong>Ticket:</strong> <span className="text-primary-600">#{selectedSession.ticketId}</span>
                        </div>
                      )}
                      <div>
                        <strong>Started:</strong> {format(new Date(selectedSession.createdAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Messages ({messages.length})</h4>
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No messages in this session</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {messages.map((message, idx) => (
                          <div
                            key={message._id || idx}
                            className={`p-3 rounded-lg ${
                              message.sender === 'user'
                                ? 'bg-primary-50 border border-primary-200'
                                : message.sender === 'technician'
                                ? 'bg-blue-50 border border-blue-200'
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-semibold ${
                                message.sender === 'user'
                                  ? 'text-primary-700'
                                  : message.sender === 'technician'
                                  ? 'text-blue-700'
                                  : 'text-gray-700'
                              }`}>
                                {message.sender === 'user' ? '👤 User' : message.sender === 'technician' ? '👨‍💼 Technician' : '🤖 Bot'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {format(new Date(message.createdAt || new Date()), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.content}</p>
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((att, attIdx) => (
                                  <a
                                    key={attIdx}
                                    href={`/api/uploads/${att.path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                                  >
                                    📎 {att.filename}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">Select a session to view messages</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

