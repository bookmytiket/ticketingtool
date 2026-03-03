import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { Download, FileText } from 'lucide-react'
import { ticketsAPI, organizationsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import toast from 'react-hot-toast'

export const Reports = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'technician'
  const [reportType, setReportType] = useState('daily')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [tickets, setTickets] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [organizationFilter, setOrganizationFilter] = useState('all')

  useEffect(() => {
    if (user?.role === 'admin') {
      loadOrganizations()
    }
  }, [user])

  useEffect(() => {
    loadReportData()
  }, [reportType, statusFilter, priorityFilter, organizationFilter, customFrom, customTo])

  const loadOrganizations = async () => {
    try {
      const data = await organizationsAPI.getAll()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations', error)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    let from, to

    switch (reportType) {
      case 'daily':
        from = startOfDay(now)
        to = endOfDay(now)
        break
      case 'weekly':
        from = startOfWeek(now, { weekStartsOn: 1 })
        to = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'monthly':
        from = startOfMonth(now)
        to = endOfMonth(now)
        break
      case 'custom':
        if (customFrom && customTo) {
          from = startOfDay(new Date(customFrom))
          to = endOfDay(new Date(customTo))
        } else {
          return null
        }
        break
      default:
        from = startOfDay(now)
        to = endOfDay(now)
    }

    return { from, to }
  }

  const loadReportData = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRange()
      
      if (reportType === 'custom' && !dateRange) {
        setTickets([])
        return
      }

      const filters = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        organization: (isAdmin && organizationFilter !== 'all') ? organizationFilter : undefined,
      }

      const allTickets = await ticketsAPI.getAll(filters)
      
      if (dateRange) {
        const filtered = allTickets.filter(ticket => {
          const ticketDate = new Date(ticket.createdAt)
          return ticketDate >= dateRange.from && ticketDate <= dateRange.to
        })
        setTickets(filtered)
      } else {
        setTickets(allTickets)
      }
    } catch (error) {
      toast.error('Failed to load report data')
      console.error(error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Ticket ID', 'Title', 'Category', 'Priority', 'Status', 'Assignee', 'Created', 'Due Date', 'Organization']
    const rows = tickets.map(ticket => [
      ticket.ticketId,
      ticket.title,
      ticket.category,
      ticket.priority,
      ticket.status,
      ticket.assignee?.name || 'Unassigned',
      format(new Date(ticket.createdAt), 'yyyy-MM-dd HH:mm'),
      ticket.dueDate ? format(new Date(ticket.dueDate), 'yyyy-MM-dd HH:mm') : 'N/A',
      ticket.organization?.name || 'N/A',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `tickets-report-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV report downloaded successfully!')
  }


  const exportToPDF = async () => {
    try {
      // Create a simple HTML table for PDF
      const tableRows = tickets.map(ticket => `
        <tr>
          <td>#${ticket.ticketId}</td>
          <td>${ticket.title}</td>
          <td>${ticket.category}</td>
          <td>${ticket.priority}</td>
          <td>${ticket.status}</td>
          <td>${ticket.assignee?.name || 'Unassigned'}</td>
          <td>${format(new Date(ticket.createdAt), 'MMM dd, yyyy HH:mm')}</td>
          <td>${ticket.dueDate ? format(new Date(ticket.dueDate), 'MMM dd, yyyy HH:mm') : 'N/A'}</td>
        </tr>
      `).join('')

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Tickets Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Tickets Report</h1>
            <p>Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
            <p>Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}</p>
            <table>
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Created</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `

      const printWindow = window.open('', '_blank')
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.print()
      toast.success('PDF report opened for printing!')
    } catch (error) {
      toast.error('Failed to generate PDF report')
      console.error(error)
    }
  }

  const getPriorityVariant = (priority) => {
    if (priority === 'urgent' || priority === 'high') return 'danger'
    if (priority === 'medium') return 'warning'
    return 'info'
  }

  const getStatusVariant = (status) => {
    if (status === 'resolved') return 'success'
    if (status === 'in-progress') return 'info'
    return 'warning'
  }

  const dateRange = getDateRange()
  const dateRangeText = dateRange 
    ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
    : 'Select date range'

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              Reports
            </h1>
            <p className="text-sm text-gray-600">Generate and download ticket reports</p>
          </div>
        </div>

        {/* Report Filters */}
        <Card className="animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Report Period</label>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'custom', label: 'Custom Date Range' },
                ]}
              />
            </div>

            {reportType === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => {
                      setCustomFrom(e.target.value)
                      if (e.target.value && customTo && new Date(e.target.value) > new Date(customTo)) {
                        toast.error('From date cannot be after To date')
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => {
                      setCustomTo(e.target.value)
                      if (customFrom && e.target.value && new Date(customFrom) > new Date(e.target.value)) {
                        toast.error('To date cannot be before From date')
                      }
                    }}
                    min={customFrom}
                  />
                </div>
              </>
            )}

            {user?.role === 'admin' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Organization</label>
                <Select
                  value={organizationFilter}
                  onChange={(e) => setOrganizationFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Organizations' },
                    ...organizations.map(org => ({
                      value: org._id || org.id,
                      label: org.name,
                    })),
                  ]}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'open', label: 'Open' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'resolved', label: 'Resolved' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
              <Select
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
          </div>

          {dateRange && (
            <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-sm text-gray-700">
                <strong>Date Range:</strong> {dateRangeText}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Total Tickets:</strong> {tickets.length}
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button
              transparent
              onClick={exportToPDF}
              disabled={loading || tickets.length === 0}
              className="flex items-center gap-2"
            >
              <FileText size={18} />
              Export PDF
            </Button>
            <Button
              transparent
              onClick={exportToCSV}
              disabled={loading || tickets.length === 0}
              className="flex items-center gap-2"
            >
              <Download size={18} />
              Export CSV
            </Button>
          </div>
        </Card>

        {/* Report Table */}
        <Card className="animate-slide-down" style={{ animationDelay: '0.1s' }}>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
                <p className="text-gray-600">Loading report data...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">No tickets found for the selected criteria</p>
              </div>
            ) : (
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Due</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket, index) => {
                    const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && (ticket.status === 'open' || ticket.status === 'in-progress')
                    return (
                      <tr 
                        key={ticket._id}
                        className="hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent transition-all duration-300 border-l-4 border-transparent hover:border-primary-500 hover:shadow-sm"
                        style={{ animationDelay: `${index * 0.05}s` }}
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
                            {ticket.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {ticket.assignee?.name || <span className="text-gray-400">Unassigned</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <div className="font-medium">{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</div>
                          <div className="text-xs text-gray-500">{format(new Date(ticket.createdAt), 'HH:mm')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  )
}

