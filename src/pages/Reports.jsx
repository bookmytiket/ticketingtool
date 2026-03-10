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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              Reports
            </h1>
            <p className="text-xs text-gray-600">Generate and download ticket reports</p>
          </div>
        </div>

        {/* Report Filters */}
        <Card className="p-3 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Period</label>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'custom', label: 'Custom' },
                ]}
                className="text-xs py-1"
              />
            </div>

            {reportType === 'custom' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">From</label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => {
                      setCustomFrom(e.target.value)
                      if (e.target.value && customTo && new Date(e.target.value) > new Date(customTo)) {
                        toast.error('From date cannot be after To date')
                      }
                    }}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">To</label>
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
                    className="text-xs h-8"
                  />
                </div>
              </>
            )}

            {user?.role === 'admin' && (
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Org.</label>
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
                  className="text-xs py-1"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'open', label: 'Open' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'resolved', label: 'Resolved' },
                ]}
                className="text-xs py-1"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Priority</label>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Med.' },
                  { value: 'low', label: 'Low' },
                ]}
                className="text-xs py-1"
              />
            </div>
          </div>

          {dateRange && (
            <div className="mt-2 p-2 bg-primary-50 rounded-lg border border-primary-200 flex items-center justify-between">
              <p className="text-[11px] text-gray-700">
                <strong>Range:</strong> {dateRangeText} | <strong>Total:</strong> {tickets.length}
              </p>
              <div className="flex gap-2">
                <Button
                  transparent
                  onClick={exportToPDF}
                  disabled={loading || tickets.length === 0}
                  className="flex items-center gap-1.5 py-1 px-3 h-7 text-[10px]"
                >
                  <FileText size={12} />
                  PDF
                </Button>
                <Button
                  transparent
                  onClick={exportToCSV}
                  disabled={loading || tickets.length === 0}
                  className="flex items-center gap-1.5 py-1 px-3 h-7 text-[10px]"
                >
                  <Download size={12} />
                  CSV
                </Button>
              </div>
            </div>
          )}
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
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">Title</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">Cat.</th>
                    <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider">Pri.</th>
                    <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider">Stat.</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">Assignee</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">Created</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">Due</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket, index) => {
                    const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && (ticket.status === 'open' || ticket.status === 'in-progress')
                    return (
                      <tr
                        key={ticket._id}
                        className="hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent transition-all duration-300 border-l-2 border-transparent hover:border-primary-500"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-[11px] font-bold text-gray-900">#{ticket.ticketId}</div>
                        </td>
                        <td className="px-3 py-2 max-w-[150px] truncate">
                          <div className="text-[11px] font-medium text-gray-900 truncate" title={ticket.title}>{ticket.title}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{ticket.category || '—'}</span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-center">
                          <div className="flex justify-center scale-75 origin-center">
                            <Badge variant={getPriorityVariant(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-center">
                          <div className="flex justify-center scale-75 origin-center">
                            <Badge variant={getStatusVariant(ticket.status)}>
                              {ticket.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-900 truncate max-w-[100px]" title={ticket.assignee?.name}>
                          {ticket.assignee?.name || <span className="text-gray-400">Unassigned</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-700 leading-tight">
                          <div className="font-medium">{format(new Date(ticket.createdAt), 'MMM dd')}</div>
                          <div className="text-[9px] text-gray-500">{format(new Date(ticket.createdAt), 'HH:mm')}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[10px] leading-tight">
                          {ticket.dueDate ? (
                            <div>
                              <div className={isOverdue ? 'text-red-600' : 'text-gray-700'}>
                                {format(new Date(ticket.dueDate), 'MMM dd')}
                                {isOverdue && <span className="ml-0.5 text-red-600 font-bold">!</span>}
                              </div>
                              <div className={`text-[9px] ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
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

