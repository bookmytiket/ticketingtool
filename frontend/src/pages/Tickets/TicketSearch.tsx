import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { Search, Filter, X, Calendar, User, Tag } from 'lucide-react'
import { format } from 'date-fns'
import { ticketsAPI, organizationsAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export const TicketSearch = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    category: 'all',
    organization: 'all',
    dateFrom: '',
    dateTo: '',
    assignee: 'all',
  })
  const [organizations, setOrganizations] = useState([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (user?.role === 'admin') {
      loadOrganizations()
    }
    loadTickets()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets()
    }, 500)
    return () => clearTimeout(timer)
  }, [filters])

  const loadOrganizations = async () => {
    try {
      const data = await organizationsAPI.getAll()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations:', error)
    }
  }

  const loadTickets = async () => {
    try {
      setLoading(true)
      const queryParams = {
        status: filters.status !== 'all' ? filters.status : undefined,
        priority: filters.priority !== 'all' ? filters.priority : undefined,
        search: filters.search || undefined,
        organization: filters.organization !== 'all' ? filters.organization : undefined,
      }

      const data = await ticketsAPI.getAll(queryParams)
      let filteredData = data || []

      // Client-side filtering for category, date range, assignee
      if (filters.category !== 'all') {
        filteredData = filteredData.filter(t => t.category === filters.category)
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom)
        filteredData = filteredData.filter(t => new Date(t.createdAt) >= fromDate)
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59)
        filteredData = filteredData.filter(t => new Date(t.createdAt) <= toDate)
      }

      if (filters.assignee !== 'all') {
        if (filters.assignee === 'unassigned') {
          filteredData = filteredData.filter(t => !t.assignee)
        } else {
          filteredData = filteredData.filter(t => t.assignee?._id === filters.assignee)
        }
      }

      setTickets(filteredData)
    } catch (error) {
      console.error('Error loading tickets:', error)
      toast.error('Failed to load tickets')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      priority: 'all',
      category: 'all',
      organization: 'all',
      dateFrom: '',
      dateTo: '',
      assignee: 'all',
    })
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

  const hasActiveFilters = Object.values(filters).some(v => v !== 'all' && v !== '')

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              Ticket Search
            </h1>
            <p className="text-sm text-gray-600">Search and filter tickets with advanced options</p>
          </div>
        </div>

        {/* Search and Filters Card */}
        <Card className="animate-slide-down">
          <div className="space-y-4">
            {/* Main Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={20} />
              <Input
                placeholder="Search by ticket ID, title, or description..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-12 pr-12"
              />
              {filters.search && (
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
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
              <Select
                label="Priority"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                options={[
                  { value: 'all', label: 'All Priorities' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
              />
              {user?.role === 'admin' && (
                <Select
                  label="Organization"
                  value={filters.organization}
                  onChange={(e) => handleFilterChange('organization', e.target.value)}
                  options={[
                    { value: 'all', label: 'All Organizations' },
                    ...organizations.map(org => ({ value: org._id, label: org.name }))
                  ]}
                />
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                transparent
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2"
              >
                <Filter size={18} />
                {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  transparent
                  onClick={clearFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  <X size={18} className="mr-2" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Calendar size={16} className="inline mr-1" />
                    Date From
                  </label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Calendar size={16} className="inline mr-1" />
                    Date To
                  </label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Tag size={16} className="inline mr-1" />
                    Category
                  </label>
                  <Select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    options={[
                      { value: 'all', label: 'All Categories' },
                      { value: 'IT Support', label: 'IT Support' },
                      { value: 'Hardware', label: 'Hardware' },
                      { value: 'Software', label: 'Software' },
                      { value: 'Network', label: 'Network' },
                      { value: 'General', label: 'General' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Results */}
        <Card className="animate-slide-down" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results ({tickets.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
              <p className="text-gray-600">Searching tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <Search className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 font-medium">No tickets found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assignee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket._id}
                      className="hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent cursor-pointer transition-all duration-300"
                      onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">#{ticket.ticketId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{ticket.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{ticket.category}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getPriorityVariant(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusVariant(ticket.status)}>
                          {formatStatus(ticket.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ticket.assignee?.name || <span className="text-gray-400">Unassigned</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-medium">{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</div>
                        <div className="text-xs text-gray-500">{format(new Date(ticket.createdAt), 'HH:mm')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/tickets/${ticket.ticketId}`)
                          }}
                          className="text-primary-600 hover:text-primary-700 transition-colors font-semibold"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}

