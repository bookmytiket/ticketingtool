import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { useAuth } from '../contexts/AuthContext'
import { Ticket, Clock, CheckCircle, AlertCircle, TrendingUp, Users, AlertTriangle, CheckSquare, XSquare, RefreshCw, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ticketsAPI, organizationsAPI, departmentsAPI } from '../services/api'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'

export const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const isTechnician = user?.role === 'technician'
  const isDepartmentHead = user?.role === 'department-head'
  const isAgentOrTechnician = isTechnician

  // Map status labels to status values for navigation
  const getStatusFromLabel = (label) => {
    const statusMap = {
      'Total Tickets': null, // No filter for total
      'Open': 'open',
      'Approval Pending': 'approval-pending',
      'Approved': 'approved',
      'Rejected': 'rejected',
      'In Progress': 'in-progress',
      'Resolved': 'resolved',
      'Closed': 'closed',
      'Overdue': null, // Overdue is not a status, it's a condition
      'Pending Tickets': 'open', // For regular users
      'Closed Tickets': 'closed' // For regular users
    }
    return statusMap[label] || null
  }

  const handleStatusCardClick = (label) => {
    const status = getStatusFromLabel(label)
    if (status) {
      navigate(`/tickets?status=${status}`)
    } else if (label === 'Total Tickets') {
      navigate('/tickets')
    } else if (label === 'Overdue') {
      // For overdue, we could navigate to tickets with a special filter
      // For now, just navigate to all tickets
      navigate('/tickets')
    }
  }
  const [stats, setStats] = useState({
    totalTickets: 0,
    pendingTickets: 0,
    closedTickets: 0,
    overdueTickets: 0,
  })
  const [recentTickets, setRecentTickets] = useState([])
  const [myOpenTickets, setMyOpenTickets] = useState([])
  const [statusData, setStatusData] = useState([])
  const [priorityData, setPriorityData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrganization, setSelectedOrganization] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [departments, setDepartments] = useState([])
  const [approvalPendingTickets, setApprovalPendingTickets] = useState([])

  useEffect(() => {
    if (isAdmin) {
      loadOrganizations()
    }
    if (isAdmin || isDepartmentHead) {
      loadDepartments()
    }
    loadDashboardData()
  }, [selectedOrganization, selectedDepartment, user, isAdmin, isDepartmentHead, isAgentOrTechnician])

  const loadOrganizations = async () => {
    try {
      const { organizationsAPI } = await import('../services/api')
      const data = await organizationsAPI.getAll()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations', error)
    }
  }

  const loadDepartments = async () => {
    try {
      const { departmentsAPI } = await import('../services/api')
      const data = await departmentsAPI.getAll()
      setDepartments(data)
    } catch (error) {
      console.error('Failed to load departments', error)
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const data = await ticketsAPI.getDashboardStats(selectedOrganization)

      // Load approval pending tickets for department heads
      if (isDepartmentHead) {
        try {
          // Get approval pending tickets - backend will automatically filter by department
          const pendingTickets = await ticketsAPI.getAll({ status: 'approval-pending' })
          console.log('Department Head - Approval pending tickets loaded:', pendingTickets?.length || 0)
          console.log('Department Head - User department:', user?.department?._id || user?.department || 'None')
          console.log('Department Head - Tickets details:', pendingTickets?.map(t => ({
            id: t.ticketId,
            title: t.title,
            status: t.status,
            department: t.department?._id || t.department || 'None',
            departmentName: t.department?.name || 'None'
          })))

          // Backend already filters by department and organization, so just use the tickets as-is
          // But verify they have the correct status for safety
          const validPendingTickets = Array.isArray(pendingTickets)
            ? pendingTickets.filter(ticket => {
              const isValid = ticket.status === 'approval-pending'

              // Log for debugging
              if (!isValid) {
                console.log('Department Head - Ticket filtered out (wrong status):', {
                  ticketId: ticket.ticketId,
                  status: ticket.status,
                  expected: 'approval-pending'
                })
              }

              return isValid
            })
            : []

          console.log('Department Head - Final approval pending tickets:', validPendingTickets.length, validPendingTickets.map(t => ({
            id: t.ticketId,
            title: t.title,
            status: t.status,
            department: t.department?._id?.toString() || t.department?.toString() || 'None',
            organization: t.organization?._id?.toString() || t.organization?.toString() || 'None'
          })))

          console.log('Department Head - Valid approval pending tickets after filtering:', validPendingTickets.length)
          setApprovalPendingTickets(validPendingTickets)
        } catch (error) {
          console.error('Failed to load approval pending tickets', error)
          toast.error('Failed to load approval pending tickets: ' + (error.message || 'Unknown error'))
          setApprovalPendingTickets([])
        }
      }

      // For department heads, show department stats
      if (isDepartmentHead) {
        setStats({
          totalTickets: data.totalTickets || 0,
          openTickets: data.openTickets || 0,
          approvalPendingTickets: data.approvalPendingTickets || 0,
          approvedTickets: data.approvedTickets || 0,
          rejectedTickets: data.rejectedTickets || 0,
          inProgressTickets: data.inProgressTickets || 0,
          resolvedTickets: data.resolvedTickets || 0,
          closedTickets: data.closedTickets || 0,
          pendingTickets: data.pendingTickets || 0,
          overdueTickets: data.overdueTickets || 0,
        })
        setRecentTickets(data.recentTickets || [])
        setMyOpenTickets(data.myOpenTickets || [])
        setStatusData(data.statusDistribution || [])
        const totalPriorityTickets = (data.priorityDistribution || []).reduce((sum, item) => sum + item.value, 0)
        const priorityWithPercentages = (data.priorityDistribution || []).map(item => ({
          ...item,
          percentage: totalPriorityTickets > 0 ? Math.round((item.value / totalPriorityTickets) * 100) : 0
        }))
        setPriorityData(priorityWithPercentages)
      } else if (isAgentOrTechnician) {
        // For technicians: show ONLY tickets assigned to them (backend already filters)
        const myOpenTicketsList = data.myOpenTickets || []

        // Get all tickets assigned to technician (backend filters by assignee)
        const allMyTickets = await ticketsAPI.getAll()

        // Calculate stats for technician tickets (only assigned tickets)
        const myStats = {
          totalTickets: allMyTickets.length || 0,
          openTickets: allMyTickets.filter(t => t.status === 'open').length || 0,
          approvalPendingTickets: allMyTickets.filter(t => t.status === 'approval-pending').length || 0,
          approvedTickets: allMyTickets.filter(t => t.status === 'approved').length || 0,
          rejectedTickets: allMyTickets.filter(t => t.status === 'rejected').length || 0,
          inProgressTickets: allMyTickets.filter(t => t.status === 'in-progress').length || 0,
          resolvedTickets: allMyTickets.filter(t => t.status === 'resolved').length || 0,
          closedTickets: allMyTickets.filter(t => t.status === 'closed').length || 0,
          pendingTickets: allMyTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length || 0,
          overdueTickets: allMyTickets.filter(t => {
            if (!t.dueDate) return false
            const due = new Date(t.dueDate)
            const now = new Date()
            return (t.status === 'open' || t.status === 'in-progress') && due < now
          }).length || 0,
        }

        setStats(myStats)
        setMyOpenTickets(myOpenTicketsList)
        setRecentTickets(data.recentTickets || [])

        // Status distribution for technician tickets (only assigned tickets)
        const statusCounts = {}
        allMyTickets.forEach(ticket => {
          statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1
        })
        setStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })))

        // Priority distribution for technician tickets (only assigned tickets)
        const priorityCounts = {}
        allMyTickets.forEach(ticket => {
          priorityCounts[ticket.priority] = (priorityCounts[ticket.priority] || 0) + 1
        })
        const totalPriorityTickets = Object.values(priorityCounts).reduce((sum, val) => sum + val, 0)
        const priorityWithPercentages = Object.entries(priorityCounts).map(([name, value]) => ({
          name,
          value,
          percentage: totalPriorityTickets > 0 ? Math.round((value / totalPriorityTickets) * 100) : 0
        }))
        setPriorityData(priorityWithPercentages)
      } else if (!isAdmin && !isAgentOrTechnician) {
        // For regular users, only show recently created tickets
        // Get all user's tickets sorted by creation date (most recent first)
        const allMyTickets = await ticketsAPI.getAll()

        // Sort by creation date descending (most recent first) and limit to recent tickets
        const recentTicketsList = allMyTickets
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 20) // Show last 20 tickets

        setStats({
          totalTickets: 0,
          openTickets: 0,
          approvalPendingTickets: 0,
          approvedTickets: 0,
          rejectedTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          pendingTickets: 0,
          overdueTickets: 0,
        }) // Set default stats for regular users (not used but prevents errors)
        setMyOpenTickets([]) // Don't show my open tickets section
        setRecentTickets(recentTicketsList) // Show recent tickets
        setStatusData([]) // No charts for regular users
        setPriorityData([]) // No charts for regular users
      } else {
        // Admin/Technician view - show all data
        setStats({
          totalTickets: data.totalTickets || 0,
          openTickets: data.openTickets || 0,
          approvalPendingTickets: data.approvalPendingTickets || 0,
          approvedTickets: data.approvedTickets || 0,
          rejectedTickets: data.rejectedTickets || 0,
          inProgressTickets: data.inProgressTickets || 0,
          resolvedTickets: data.resolvedTickets || 0,
          closedTickets: data.closedTickets || 0,
          pendingTickets: data.pendingTickets || 0,
          overdueTickets: data.overdueTickets || 0,
        })
        setRecentTickets(data.recentTickets || [])

        let openTicketsToShow = data.myOpenTickets || []
        if (openTicketsToShow.length === 0 && data.recentTickets && data.recentTickets.length > 0) {
          const openFromRecent = data.recentTickets.filter(t =>
            t.status === 'open' || t.status === 'in-progress'
          )
          if (openFromRecent.length > 0) {
            openTicketsToShow = openFromRecent
          }
        }

        setMyOpenTickets(openTicketsToShow)
        setStatusData(data.statusDistribution || [])

        const totalPriorityTickets = (data.priorityDistribution || []).reduce((sum, item) => sum + item.value, 0)
        const priorityWithPercentages = (data.priorityDistribution || []).map(item => ({
          ...item,
          percentage: totalPriorityTickets > 0 ? Math.round((item.value / totalPriorityTickets) * 100) : 0
        }))
        setPriorityData(priorityWithPercentages)
      }
    } catch (error) {
      console.error('Dashboard data error:', error)
      toast.error('Failed to load dashboard data. Showing default view.')
      setStats({
        totalTickets: 0,
        pendingTickets: 0,
        closedTickets: 0,
        overdueTickets: 0,
      })
      setRecentTickets([])
      setMyOpenTickets([])
      setStatusData([])
      setPriorityData([])
    } finally {
      setLoading(false)
    }
  }

  // Compute stats data for the grid
  const statsData = stats.totalTickets !== undefined ? [
    {
      label: 'Total Tickets',
      value: stats.totalTickets,
      icon: Ticket,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      iconBg: 'bg-primary-100',
      border: 'border-primary-200',
      link: '/tickets'
    },
    {
      label: 'Open',
      value: stats.openTickets,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      border: 'border-blue-200',
      link: '/tickets?status=open'
    },
    {
      label: 'Approval Pending',
      value: stats.approvalPendingTickets,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      border: 'border-orange-200',
      link: '/tickets?status=approval-pending'
    },
    {
      label: 'Approved',
      value: stats.approvedTickets,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      border: 'border-green-200',
      link: '/tickets?status=approved'
    },
    {
      label: 'Rejected',
      value: stats.rejectedTickets,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      border: 'border-red-200',
      link: '/tickets?status=rejected'
    },
    {
      label: 'In Progress',
      value: stats.inProgressTickets,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
      border: 'border-yellow-200',
      link: '/tickets?status=in-progress'
    },
    {
      label: 'Resolved',
      value: stats.resolvedTickets,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      border: 'border-emerald-200',
      link: '/tickets?status=resolved'
    },
    {
      label: 'Closed',
      value: stats.closedTickets,
      icon: CheckCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      iconBg: 'bg-gray-100',
      border: 'border-gray-200',
      link: '/tickets?status=closed'
    },
    {
      label: 'Overdue',
      value: stats.overdueTickets,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      border: 'border-red-500',
      link: '/tickets?overdue=true'
    }
  ] : []

  const chartColors = {
    open: '#3b82f6',
    'in-progress': '#f59e0b',
    resolved: '#10b981',
    closed: '#6b7280',
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#10b981',
  }

  return (
    <Layout>
      <div className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        )}
        {!loading && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-down">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
                  Dashboard
                </h1>
                <p className="text-sm text-gray-600">System overview and statistics</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  transparent
                  variant="outline"
                  onClick={loadDashboardData}
                  className="flex items-center gap-2 py-1 px-3 h-9"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </Button>
                <Button
                  transparent
                  onClick={() => navigate('/tickets/new')}
                  className="flex items-center gap-2 py-1 px-3 h-9 animate-scale-in"
                >
                  <Plus size={16} />
                  New Ticket
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white/50 p-2 rounded-xl backdrop-blur-sm border border-white/20">
              {isAdmin && organizations.length > 0 && (
                <div className="w-full sm:w-64">
                  <Select
                    value={selectedOrganization}
                    onChange={(e) => setSelectedOrganization(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Organizations' },
                      ...organizations.map(org => ({
                        value: org._id || org.id,
                        label: org.name,
                      })),
                    ]}
                    className="py-1"
                  />
                </div>
              )}
              {(isAdmin || isDepartmentHead) && departments.length > 0 && (
                <div className="w-full sm:w-64">
                  <Select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Departments' },
                      ...departments.map(dept => ({
                        value: dept._id || dept.id,
                        label: dept.name,
                      })),
                    ]}
                    className="py-1"
                  />
                </div>
              )}
            </div>

            {/* Stats Grid - Only for Admin/Technician/Department Head */}
            {(isAdmin || isDepartmentHead || isAgentOrTechnician) && statsData && statsData.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {statsData.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <Card
                        key={stat.label}
                        className={`p-3 border-l-4 ${stat.border} hover:scale-105 transition-all duration-300 cursor-pointer animate-slide-down`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => navigate(stat.link)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`${stat.iconBg} p-2 rounded-lg shadow-sm`}>
                            <Icon size={18} className={stat.color} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
                              {stat.label}
                            </p>
                            <div className="flex items-baseline gap-1">
                              <p className="text-xl font-extrabold text-gray-900 leading-none">
                                {stat.value}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>

                {/* Charts Row - Only for Admin/Technician/Department Head */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card title="Tickets by Status">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={statusData.length > 0 ? statusData : [{ name: 'No Data', value: 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            color: '#111827'
                          }}
                        />
                        <Bar dataKey="value" name="Tickets" radius={[8, 8, 0, 0]}>
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[entry.name] || '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="Tickets by Priority">
                    <ResponsiveContainer width="100%" height={300}>
                      {priorityData.length > 0 ? (
                        <PieChart>
                          <Pie
                            data={priorityData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `${name} ${percentage}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {priorityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={chartColors[entry.name] || '#3b82f6'} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.5rem',
                              color: '#111827'
                            }}
                            formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]}
                          />
                        </PieChart>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-500">No priority data available</p>
                        </div>
                      )}
                    </ResponsiveContainer>
                  </Card>
                </div>
              </>
            )}

            {/* Approval Pending Tickets - Only for Department Heads */}
            {isDepartmentHead && (
              <Card title="Pending Approval" className="animate-slide-down">
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
                      <p className="text-gray-600">Loading pending tickets...</p>
                    </div>
                  ) : !user?.department ? (
                    <div className="text-center py-12">
                      <AlertCircle className="mx-auto h-12 w-12 text-orange-400 mb-4" />
                      <p className="text-gray-600">No department assigned</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Please contact an administrator to assign a department to your account.
                      </p>
                    </div>
                  ) : approvalPendingTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600">No tickets pending approval</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Tickets will appear here when they are moved to "Approval Pending" status and match your department ({user.department?.name || 'your department'}).
                      </p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ticket</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Creator</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {approvalPendingTickets.slice(0, 10).map((ticket) => (
                          <tr
                            key={ticket._id}
                            className="hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent transition-all duration-300"
                          >
                            <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-gray-900">#{ticket.ticketId}</div>
                              <div className="text-sm text-gray-500">{ticket.title}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  ticket.priority === 'urgent' || ticket.priority === 'high' ? 'danger' :
                                    ticket.priority === 'medium' ? 'warning' : 'info'
                                }
                              >
                                {ticket.priority}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {ticket.creator?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              <div className="font-medium">{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</div>
                              <div className="text-xs text-gray-500">{format(new Date(ticket.createdAt), 'HH:mm')}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  transparent
                                  variant="outline"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    navigate(`/tickets/${ticket.ticketId}`)
                                  }}
                                  className="text-xs"
                                  type="button"
                                >
                                  View
                                </Button>
                                <Button
                                  transparent
                                  onClick={async (e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    try {
                                      await ticketsAPI.approveTicket(ticket.ticketId)
                                      toast.success('Ticket approved successfully!')
                                      loadDashboardData()
                                    } catch (error) {
                                      console.error('Approve error:', error)
                                      toast.error(error.message || 'Failed to approve ticket')
                                    }
                                  }}
                                  className="text-xs bg-green-500 hover:bg-green-600 text-white border-0"
                                  type="button"
                                >
                                  <CheckSquare size={14} className="mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  transparent
                                  onClick={async (e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const reason = window.prompt('Please provide a reason for rejection:')
                                    if (reason === null) return
                                    if (!reason.trim()) {
                                      toast.error('Rejection reason is required')
                                      return
                                    }
                                    try {
                                      await ticketsAPI.rejectTicket(ticket.ticketId, reason)
                                      toast.success('Ticket rejected')
                                      loadDashboardData()
                                    } catch (error) {
                                      console.error('Reject error:', error)
                                      toast.error(error.message || 'Failed to reject ticket')
                                    }
                                  }}
                                  className="text-xs bg-red-500 hover:bg-red-600 text-white border-0"
                                  type="button"
                                >
                                  <XSquare size={14} className="mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            )}

            {/* Recent Tickets - Only for regular users */}
            {!isAdmin && !isDepartmentHead && !isAgentOrTechnician && (
              <Card title="My Recent Tickets">
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center text-gray-500 py-8">Loading...</div>
                  ) : recentTickets.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm font-medium mb-2">No tickets found</p>
                      <p className="text-xs text-gray-400">Create your first ticket to get started!</p>
                    </div>
                  ) : (
                    recentTickets.map((ticket) => (
                      <div
                        key={ticket._id}
                        className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-lg cursor-pointer transition-all duration-300 bg-white/80 backdrop-blur-sm hover:-translate-y-0.5"
                        onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">#{ticket.ticketId}</span>
                              <Badge
                                variant={
                                  ticket.priority === 'urgent' ? 'danger' :
                                    ticket.priority === 'high' ? 'danger' :
                                      ticket.priority === 'medium' ? 'warning' : 'info'
                                }
                              >
                                {ticket.priority}
                              </Badge>
                              <Badge
                                variant={
                                  ticket.status === 'resolved' ? 'success' :
                                    ticket.status === 'closed' ? 'secondary' :
                                      ticket.status === 'approved' ? 'success' :
                                        ticket.status === 'rejected' ? 'danger' :
                                          ticket.status === 'approval-pending' ? 'warning' :
                                            ticket.status === 'in-progress' ? 'info' : 'info'
                                }
                              >
                                {ticket.status === 'approval-pending' ? 'Approval Pending' :
                                  ticket.status === 'in-progress' ? 'In Progress' :
                                    ticket.status === 'open' ? 'Open' :
                                      ticket.status === 'closed' ? 'Closed' :
                                        ticket.status === 'resolved' ? 'Resolved' :
                                          ticket.status === 'approved' ? 'Approved' :
                                            ticket.status === 'rejected' ? 'Rejected' : ticket.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-900 font-medium mb-1">{ticket.title}</p>
                            <p className="text-xs text-gray-500">
                              Created: {format(new Date(ticket.createdAt), 'MMM dd, yyyy HH:mm')}
                              {ticket.dueDate && (
                                <> • Due: {format(new Date(ticket.dueDate), 'MMM dd, yyyy HH:mm')}</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}

            {/* My Open Tickets and Recent Activity Row - For Admin/Technician */}
            {(isAdmin || isDepartmentHead || isAgentOrTechnician) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title={isAgentOrTechnician ? "My Assigned Tickets" : "My Open Tickets"}>
                  <div className="space-y-3">
                    {loading ? (
                      <div className="text-center text-gray-500 py-8">Loading...</div>
                    ) : myOpenTickets.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">No open tickets</div>
                    ) : (
                      myOpenTickets.map((ticket) => (
                        <div
                          key={ticket._id}
                          className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-lg cursor-pointer transition-all duration-300 bg-white/80 backdrop-blur-sm hover:-translate-y-0.5"
                          onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-900">#{ticket.ticketId}</span>
                                <Badge
                                  variant={
                                    ticket.priority === 'urgent' ? 'danger' :
                                      ticket.priority === 'high' ? 'danger' :
                                        ticket.priority === 'medium' ? 'warning' : 'info'
                                  }
                                >
                                  {ticket.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-900 font-medium mb-1">{ticket.title}</p>
                              <p className="text-xs text-gray-500">
                                {ticket.organization?.name || 'No Organization'} • {format(new Date(ticket.createdAt), 'dd/MM/yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card title="Recent Activity">
                  <div className="space-y-3">
                    {loading ? (
                      <div className="text-center text-gray-500 py-8">Loading...</div>
                    ) : recentTickets.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">No recent activity</div>
                    ) : (
                      recentTickets.map((ticket) => (
                        <div
                          key={ticket._id}
                          className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-lg cursor-pointer transition-all duration-300 bg-white/80 backdrop-blur-sm hover:-translate-y-0.5"
                          onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-900">#{ticket.ticketId}</span>
                                <Badge
                                  variant={
                                    ticket.priority === 'urgent' ? 'danger' :
                                      ticket.priority === 'high' ? 'danger' :
                                        ticket.priority === 'medium' ? 'warning' : 'info'
                                  }
                                >
                                  {ticket.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-900 font-medium mb-1">{ticket.title}</p>
                              <p className="text-xs text-gray-500">
                                {ticket.organization?.name || 'No Organization'} • {format(new Date(ticket.createdAt), 'dd/MM/yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Recent Tickets Table - Only for Admin/Technician */}
            {isAdmin && (
              <Card title="Recent Tickets">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ticket</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assignee</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Due</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Approved By</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Approved Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                        </tr>
                      ) : recentTickets.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <p className="text-sm font-medium">No recent tickets</p>
                              <p className="text-xs text-gray-400 mt-1">Tickets will appear here as they are created.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        recentTickets.map((ticket, index) => {
                          const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && (ticket.status === 'open' || ticket.status === 'in-progress')
                          return (
                            <tr
                              key={ticket._id}
                              className="hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent cursor-pointer transition-all duration-300 border-l-4 border-transparent hover:border-primary-500 hover:shadow-sm"
                              style={{ animationDelay: `${index * 0.05}s` }}
                              onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">#{ticket.ticketId}</div>
                                <div className="text-sm text-gray-500">{ticket.title}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant={
                                    ticket.priority === 'urgent' ? 'danger' :
                                      ticket.priority === 'high' ? 'danger' :
                                        ticket.priority === 'medium' ? 'warning' : 'info'
                                  }
                                >
                                  {ticket.priority}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant={
                                    ticket.status === 'resolved' ? 'success' :
                                      ticket.status === 'in-progress' ? 'info' :
                                        ticket.status === 'approved' ? 'success' :
                                          ticket.status === 'rejected' ? 'danger' :
                                            ticket.status === 'approval-pending' ? 'warning' :
                                              ticket.status === 'open' ? 'info' :
                                                ticket.status === 'closed' ? 'secondary' : 'warning'
                                  }
                                >
                                  {ticket.status === 'approval-pending' ? 'Approval Pending' :
                                    ticket.status === 'in-progress' ? 'In Progress' :
                                      ticket.status === 'open' ? 'Open' :
                                        ticket.status === 'closed' ? 'Closed' :
                                          ticket.status === 'resolved' ? 'Resolved' :
                                            ticket.status === 'approved' ? 'Approved' :
                                              ticket.status === 'rejected' ? 'Rejected' : ticket.status}
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {ticket.approvedBy ? (
                                  <div>
                                    <div className="font-medium text-green-600">{ticket.approvedBy?.name || 'Unknown'}</div>
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
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
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
