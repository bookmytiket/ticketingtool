import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ticketsAPI, departmentsAPI, usersAPI, categoriesAPI } from '../../services/api'
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
  const [users, setUsers] = useState([])
  const [categories, setCategories] = useState([])
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin' || user?.role === 'technician'

  useEffect(() => {
    console.log('TicketList: useNavigate initialized')
  }, [])

  // Update status filter when URL query parameter changes
  useEffect(() => {
    const statusFromUrl = searchParams.get('status')
    if (statusFromUrl) {
      setStatusFilter(statusFromUrl)
    }
  }, [searchParams])

  // Load departments, users, and categories
  useEffect(() => {
    loadDepartments()
    loadUsers()
    loadCategories()
  }, [])

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

  const loadUsers = async () => {
    try {
      const data = await usersAPI.getAll()
      setUsers(data || [])
    } catch (error) {
      console.error('Failed to load users', error)
      toast.error('Failed to load user directory for names. Please refresh.')
    }
  }

  const loadCategories = async () => {
    try {
      const data = await categoriesAPI.getAll()
      setCategories(data || [])
    } catch (error) {
      console.error('Failed to load categories', error)
      toast.error('Failed to load categories. Please refresh.')
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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
                  Tickets
                </h1>
                <p className="text-xs text-gray-600">Manage and track all support tickets</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  transparent
                  variant="outline"
                  onClick={loadTickets}
                  className="flex items-center gap-2 py-1 px-3 h-8 text-xs"
                  disabled={loading}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </Button>
                <Button
                  transparent
                  onClick={() => navigate('/tickets/new')}
                  className="flex items-center gap-2 py-1 px-3 h-8 text-xs animate-scale-in"
                >
                  <Plus size={16} />
                  New Ticket
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="p-3 animate-slide-down" style={{ animationDelay: '0.1s' }}>
              <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 items-end`}>
                <div className="relative md:col-span-2 lg:col-span-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full h-8 text-xs"
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
                    className="text-xs"
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
                    className="text-xs"
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
                      className="text-xs"
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
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-tighter whitespace-nowrap">ID</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-tighter max-w-[150px]">Title</th>
                      <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-tighter whitespace-nowrap">Cat.</th>
                      <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-700 uppercase tracking-tighter whitespace-nowrap">Pri.</th>
                      <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-700 uppercase tracking-tighter whitespace-nowrap">Stat.</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-tighter whitespace-nowrap">Assignee</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-tighter whitespace-nowrap">Created</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-tighter whitespace-nowrap">Due</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-tighter whitespace-nowrap">Approver</th>
                      <th className="px-2 py-2 text-right text-[10px] font-bold text-gray-700 uppercase tracking-tighter whitespace-nowrap">Act.</th>
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
                            className="hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent transition-all duration-300 border-l-2 border-transparent hover:border-primary-500 relative"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <td className="px-3 py-2 whitespace-nowrap align-middle">
                              <Link to={`/tickets/${ticket.ticketId}`} className="text-[11px] font-bold text-gray-900 hover:text-primary-600 block">
                                #{ticket.ticketId}
                              </Link>
                            </td>
                            <td className="px-3 py-2 align-middle max-w-[150px]">
                              <Link
                                to={`/tickets/${ticket.ticketId}`}
                                className="text-[11px] font-bold text-primary-600 hover:text-primary-700 truncate text-left w-full block"
                                title={ticket.title}
                              >
                                {ticket.title}
                              </Link>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap align-middle">
                              <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                {ticket.categoryDetails?.name || categories.find(c => (c._id || c.id) === ticket.categoryId)?.name || ticket.category || '—'}
                              </span>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-center align-middle">
                              <div className="flex justify-center scale-75 origin-center">
                                <Badge variant={getPriorityVariant(ticket.priority)}>
                                  {ticket.priority}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-center align-middle">
                              <div className="flex justify-center scale-75 origin-center">
                                <Badge variant={getStatusVariant(ticket.status)}>
                                  {formatStatus(ticket.status)}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-900 align-middle">
                              <div className="max-w-[100px] truncate" title={ticket.assignee?.name || users.find(u => (u._id || u.id) === ticket.assignedTo)?.name || ticket.assignedTo || 'Unassigned'}>
                                {ticket.assignee?.name || users.find(u => (u._id || u.id) === ticket.assignedTo)?.name || ticket.assignedTo || <span className="text-gray-400">Unassigned</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-700 align-middle leading-tight">
                              <div>{format(new Date(ticket.createdAt), 'MMM dd')}</div>
                              <div className="text-[9px] text-gray-400">{format(new Date(ticket.createdAt), 'HH:mm')}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-700 align-middle leading-tight">
                              {ticket.dueDate ? (
                                <div>
                                  <div className={isOverdue ? 'text-red-600' : 'text-gray-700'}>
                                    {format(new Date(ticket.dueDate), 'MMM dd')}
                                    {isOverdue && <span className="ml-0.5 text-red-600 font-bold">!</span>}
                                  </div>
                                  <div className="text-[9px] text-gray-400">{format(new Date(ticket.dueDate), 'HH:mm')}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-700 align-middle">
                              <div className="max-w-[80px] truncate" title={ticket.approvedBy?.name || users.find(u => (u._id || u.id) === ticket.approvedBy)?.name || '-'}>
                                {ticket.approvedBy?.name || users.find(u => (u._id || u.id) === ticket.approvedBy)?.name || <span className="text-gray-400">-</span>}
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-right text-[10px] font-medium align-middle">
                              <Link
                                to={`/tickets/${ticket.ticketId}`}
                                className="text-primary-600 hover:text-primary-700 font-bold px-1.5 py-0.5 rounded hover:bg-primary-50"
                              >
                                View
                              </Link>
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
