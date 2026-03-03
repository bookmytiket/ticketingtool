import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Ticket, CheckCircle, Clock, AlertCircle, XCircle, CheckSquare, XSquare, AlertTriangle, RefreshCw } from 'lucide-react'
import { ticketsAPI } from '../../services/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export const DepartmentHeadDashboard = () => {
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    approvalPendingTickets: 0,
    approvedTickets: 0,
    rejectedTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
  })
  const [pendingTickets, setPendingTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const data = await ticketsAPI.getDashboardStats()
      
      setStats({
        totalTickets: data.totalTickets || 0,
        openTickets: data.openTickets || 0,
        approvalPendingTickets: data.approvalPendingTickets || 0,
        approvedTickets: data.approvedTickets || 0,
        rejectedTickets: data.rejectedTickets || 0,
        inProgressTickets: data.inProgressTickets || 0,
        resolvedTickets: data.resolvedTickets || 0,
        closedTickets: data.closedTickets || 0,
      })

      // Load pending tickets for approval - filter by approval-pending status
      const allTickets = await ticketsAPI.getAll({ status: 'approval-pending' })
      console.log('Approval pending tickets found:', allTickets.length, allTickets) // Debug log
      
      // Filter tickets that have a department (department heads only see tickets from their department)
      const ticketsWithDepartment = allTickets.filter(ticket => ticket.department)
      console.log('Tickets with department:', ticketsWithDepartment.length) // Debug log
      
      setPendingTickets(ticketsWithDepartment.slice(0, 10))
    } catch (error) {
      console.error('Dashboard data error:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (ticketId, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    try {
      await ticketsAPI.approveTicket(ticketId)
      toast.success('Ticket approved successfully!')
      loadDashboardData()
    } catch (error) {
      console.error('Approve error:', error)
      toast.error(error.message || 'Failed to approve ticket')
    }
  }

  const handleReject = async (ticketId, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const reason = window.prompt('Please provide a reason for rejection:')
    if (reason === null) return // User cancelled
    
    if (!reason.trim()) {
      toast.error('Rejection reason is required')
      return
    }

    try {
      await ticketsAPI.rejectTicket(ticketId, reason)
      toast.success('Ticket rejected')
      loadDashboardData()
    } catch (error) {
      console.error('Reject error:', error)
      toast.error(error.message || 'Failed to reject ticket')
    }
  }

  const statsData = [
    { 
      label: 'Total Tickets', 
      value: stats.totalTickets.toLocaleString(), 
      icon: Ticket, 
      color: 'text-primary-600', 
      bgGradient: 'from-primary-50 to-primary-100/50',
      iconBg: 'bg-gradient-to-br from-primary-500 to-primary-600',
    },
    { 
      label: 'Open', 
      value: (stats.openTickets || 0).toLocaleString(), 
      icon: Ticket, 
      color: 'text-blue-600', 
      bgGradient: 'from-blue-50 to-blue-100/50',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
    { 
      label: 'Approval Pending', 
      value: stats.approvalPendingTickets.toLocaleString(), 
      icon: Clock, 
      color: 'text-orange-600', 
      bgGradient: 'from-orange-50 to-orange-100/50',
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    },
    { 
      label: 'Approved', 
      value: stats.approvedTickets.toLocaleString(), 
      icon: CheckCircle, 
      color: 'text-green-600', 
      bgGradient: 'from-green-50 to-green-100/50',
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
    },
    { 
      label: 'Rejected', 
      value: (stats.rejectedTickets || 0).toLocaleString(), 
      icon: AlertCircle, 
      color: 'text-red-600', 
      bgGradient: 'from-red-50 to-red-100/50',
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
    },
    { 
      label: 'In Progress', 
      value: (stats.inProgressTickets || 0).toLocaleString(), 
      icon: Clock, 
      color: 'text-yellow-600', 
      bgGradient: 'from-yellow-50 to-yellow-100/50',
      iconBg: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
    },
    { 
      label: 'Resolved', 
      value: stats.resolvedTickets.toLocaleString(), 
      icon: CheckSquare, 
      color: 'text-emerald-600', 
      bgGradient: 'from-emerald-50 to-emerald-100/50',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    },
    { 
      label: 'Closed', 
      value: stats.closedTickets.toLocaleString(), 
      icon: XCircle, 
      color: 'text-gray-600', 
      bgGradient: 'from-gray-50 to-gray-100/50',
      iconBg: 'bg-gradient-to-br from-gray-500 to-gray-600',
    },
  ]

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
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
                  Department Dashboard
                </h1>
                <p className="text-sm text-gray-600">Manage and approve tickets for your department</p>
              </div>
              <Button
                transparent
                variant="outline"
                onClick={loadDashboardData}
                className="flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {statsData.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <Card 
                    key={stat.label}
                    className="p-6 animate-slide-down"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${stat.iconBg} shadow-lg`}>
                        <Icon size={24} className="text-white" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Pending Tickets for Approval */}
            <Card title="Pending Approval" className="animate-slide-down" style={{ animationDelay: '0.5s' }}>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
                    <p className="text-gray-600">Loading pending tickets...</p>
                  </div>
                ) : pendingTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">No tickets pending approval</p>
                    {stats.approvalPendingTickets > 0 ? (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> There are {stats.approvalPendingTickets} approval pending tickets in the system, but they may:
                        </p>
                        <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside text-left">
                          <li>Be from a different department</li>
                          <li>Not have a department assigned</li>
                        </ul>
                        <p className="text-xs text-yellow-600 mt-2">
                          Ensure tickets have a department assigned when created or when moved to approval-pending status.
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">
                        Tickets will appear here when they are moved to "Approval Pending" status and match your department.
                      </p>
                    )}
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ticket</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Creator</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assignee</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingTickets.map((ticket, index) => (
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ticket.assignee?.name || <span className="text-gray-400">Unassigned</span>}
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
                                className="text-xs relative z-10"
                                type="button"
                              >
                                View
                              </Button>
                              <Button
                                transparent
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleApprove(ticket.ticketId, e)
                                }}
                                className="text-xs bg-green-500 hover:bg-green-600 text-white border-0 relative z-10"
                                type="button"
                              >
                                <CheckSquare size={14} className="mr-1" />
                                Approve
                              </Button>
                              <Button
                                transparent
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleReject(ticket.ticketId, e)
                                }}
                                className="text-xs bg-red-500 hover:bg-red-600 text-white border-0 relative z-10"
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
          </>
        )}
      </div>
    </Layout>
  )
}

