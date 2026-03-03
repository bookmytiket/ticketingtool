import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ticketsAPI, departmentsAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export const TicketList = () => {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [departments, setDepartments] = useState([])
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin' || user?.role === 'technician'

  // Update status filter when URL query parameter changes
  useEffect(() => {
    const statusFromUrl = searchParams.get('status')
    if (statusFromUrl) {
      setStatusFilter(statusFromUrl)
    }
  }, [searchParams])

  // Load departments for admins/agents
  useEffect(() => {
    if (isAdmin) {
      loadDepartments()
    }
  }, [isAdmin])

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Load tickets on initial mount and when filters change
  useEffect(() => {
    loadTickets()
  }, [statusFilter, priorityFilter, departmentFilter, debouncedSearchTerm]) // Reload when filters change

  const loadDepartments = async () => {
    try {
      const data = await departmentsAPI.getAll()
      setDepartments(data || [])
    } catch (error) {
      console.error('Failed to load departments', error)
    }
  }

  const loadTickets = async () => {
    try {
      setLoading(true)
      const filters = {}
      if (statusFilter && statusFilter !== 'all') {
        filters.status = statusFilter
      }
      if (priorityFilter && priorityFilter !== 'all') {
        filters.priority = priorityFilter
      }
      if (departmentFilter && departmentFilter !== 'all') {
        filters.department = departmentFilter
      }
      if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
        filters.search = debouncedSearchTerm.trim()
      }
      
      console.log('Loading tickets with filters:', filters) // Debug log
      const data = await ticketsAPI.getAll(filters)
      console.log('Tickets received:', data?.length || 0, data) // Debug log
      
      // Ensure we have an array
      const ticketsArray = Array.isArray(data) ? data : []
      setTickets(ticketsArray)
      
      // Log approved tickets specifically
      const approvedTickets = ticketsArray.filter(t => t.status === 'approved')
      if (approvedTickets.length > 0) {
        console.log('Approved tickets found:', approvedTickets.length, approvedTickets)
      } else if (statusFilter === 'all' || !statusFilter) {
        console.log('No approved tickets found in results')
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
      // Only show error if it's not a network error or if tickets array is empty
      if (tickets.length === 0) {
        toast.error(error.message || 'Failed to load tickets')
      }
      // Set empty array on error to prevent UI issues
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  // No need for client-side filtering since search is handled by API
  const filteredTickets = tickets

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
    if (status === 'open') return 'info'
    if (status === 'closed') return 'secondary'
    return 'warning'
  }

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

  return (
    <Layout>
      <div className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
              <p className="text-gray-600">Loading tickets...</p>
            </div>
          </div>
        )}
        {!loading && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-down">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
                  Tickets
                </h1>
                <p className="text-sm text-gray-600">Manage and track all support tickets</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  transparent
                  variant="outline"
                  onClick={loadTickets}
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </Button>
                <Button 
                  transparent
                  onClick={() => navigate('/tickets/new')}
                  className="animate-scale-in"
                >
                  <Plus size={20} className="mr-2" />
                  New Ticket
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="animate-slide-down" style={{ animationDelay: '0.1s' }}>
              <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 items-end`}>
                <div className="relative md:col-span-2 lg:col-span-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={20} />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <div className="w-full">
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Statuses' },
                      { value: 'open', label: 'Open' },
                      { value: 'approval-pending', label: 'Approval Pending' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' },
                      { value: 'in-progress', label: 'In Progress' },
                      { value: 'resolved', label: 'Resolved' },
                      { value: 'closed', label: 'Closed' },
                    ]}
                  />
                </div>
                <div className="w-full">
                  <Select
                    label="Priority"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Priorities' },
                      { value: 'urgent', label: 'Urgent' },
                      { value: 'high', label: 'High' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'low', label: 'Low' },
                    ]}
                  />
                </div>
                {isAdmin && departments.length > 0 && (
                  <div className="w-full">
                    <Select
                      label="Department"
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'All Departments' },
                        ...departments.map(dept => ({
                          value: dept._id || dept.id,
                          label: dept.name,
                        })),
                      ]}
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Tickets Table */}
            <Card className="animate-slide-down" style={{ animationDelay: '0.2s' }}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[200px]">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Category</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Priority</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Assignee</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Due</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Approved By</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Approved Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <p className="text-sm font-medium">No tickets found matching your criteria.</p>
                            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or create a new ticket.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((ticket, index) => {
                        const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && (ticket.status === 'open' || ticket.status === 'in-progress')
                        return (
                          <tr 
                            key={ticket._id} 
                            className="hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent cursor-pointer transition-all duration-300 border-l-4 border-transparent hover:border-primary-500 hover:shadow-sm"
                            style={{ animationDelay: `${index * 0.05}s` }}
                            onClick={(e) => {
                              // Only navigate if clicking on the row itself, not on buttons or interactive elements
                              const target = e.target
                              if (target.tagName === 'BUTTON' || 
                                  target.closest('button') || 
                                  target.closest('a') ||
                                  target.closest('.badge') ||
                                  target.closest('td:first-child + td button')) {
                                return
                              }
                              navigate(`/tickets/${ticket.ticketId}`)
                            }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap align-middle">
                              <div className="text-sm font-semibold text-gray-900">#{ticket.ticketId}</div>
                            </td>
                            <td className="px-6 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  navigate(`/tickets/${ticket.ticketId}`)
                                }}
                                className="text-sm font-medium text-primary-600 hover:text-primary-700 max-w-xs truncate text-left hover:underline transition-colors cursor-pointer relative z-20 block w-full bg-transparent border-0 p-0"
                                title={ticket.title}
                              >
                                {ticket.title}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle">
                              <span className="inline-block text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                {ticket.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                              <div className="flex justify-center">
                                <Badge variant={getPriorityVariant(ticket.priority)}>
                                  {ticket.priority}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                              <div className="flex justify-center">
                                <Badge variant={getStatusVariant(ticket.status)}>
                                  {formatStatus(ticket.status)}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-middle">
                              <div className="max-w-[140px] truncate" title={ticket.assignee?.name || 'Unassigned'}>
                                {ticket.assignee?.name || <span className="text-gray-400">Unassigned</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 align-middle">
                              <div className="font-medium">{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</div>
                              <div className="text-xs text-gray-500">{format(new Date(ticket.createdAt), 'HH:mm')}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 align-middle">
                              {ticket.dueDate ? (
                                <div>
                                  <div className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}>
                                    {format(new Date(ticket.dueDate), 'MMM dd, yyyy')}
                                    {isOverdue && <span className="ml-1 text-red-600">⚠</span>}
                                  </div>
                                  <div className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                                    {format(new Date(ticket.dueDate), 'HH:mm')}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 align-middle">
                              {ticket.approvedBy ? (
                                <div>
                                  <div className="font-medium text-green-600 max-w-[150px] truncate" title={ticket.approvedBy?.name || 'Unknown'}>
                                    {ticket.approvedBy?.name || 'Unknown'}
                                  </div>
                                  {ticket.approvedAt && (
                                    <div className="text-xs text-gray-500">
                                      {format(new Date(ticket.approvedAt), 'MMM dd, yyyy HH:mm')}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 align-middle">
                              {ticket.status === 'approved' ? (
                                <Badge variant="success">Approved</Badge>
                              ) : ticket.status === 'rejected' ? (
                                <Badge variant="danger">Rejected</Badge>
                              ) : ticket.status === 'approval-pending' ? (
                                <Badge variant="warning">Pending</Badge>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-middle">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  navigate(`/tickets/${ticket.ticketId}`)
                                }}
                                className="text-primary-600 hover:text-primary-700 transition-colors font-semibold px-2 py-1 rounded hover:bg-primary-50 relative z-10"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </Layout>
  )
}
