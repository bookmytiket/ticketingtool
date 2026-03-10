/**
 * Analytics & Reporting Dashboard
 * Admin Only - Comprehensive reporting with graphs and metrics
 */

import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { reportsAPI, organizationsAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, Users, FileText } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export const Analytics = () => {
  const { user } = useAuth()
  const [period, setPeriod] = useState('month')
  const [organization, setOrganization] = useState('all')
  const [organizations, setOrganizations] = useState([])
  const [dashboardData, setDashboardData] = useState(null)
  const [statusData, setStatusData] = useState([])
  const [departmentData, setDepartmentData] = useState([])
  const [technicianData, setTechnicianData] = useState([])
  const [slaData, setSlaData] = useState(null)
  const [trendsData, setTrendsData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.role === 'admin') {
      loadOrganizations()
    }
  }, [user])

  useEffect(() => {
    loadAllData()
  }, [period, organization])

  const loadOrganizations = async () => {
    try {
      const data = await organizationsAPI.getAll()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations', error)
    }
  }

  const loadAllData = async () => {
    try {
      setLoading(true)
      const orgFilter = organization !== 'all' ? organization : null

      const [dashboard, status, department, technician, sla, trends] = await Promise.all([
        reportsAPI.getDashboard(period, orgFilter),
        reportsAPI.getStatusWise(period, orgFilter),
        reportsAPI.getDepartmentWise(period, orgFilter),
        reportsAPI.getTechnicianPerformance(period, orgFilter),
        reportsAPI.getSLACompliance(period, orgFilter),
        reportsAPI.getTrends(period, orgFilter, 'day'),
      ])

      setDashboardData(dashboard)
      setStatusData(status.data || [])
      setDepartmentData(department.data || [])
      setTechnicianData(technician.data || [])
      setSlaData(sla)
      setTrendsData(trends.data || [])
    } catch (error) {
      console.error('Failed to load analytics data', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-gray-600">Access denied. Admin access required.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              Analytics & Reports
            </h1>
            <p className="text-sm text-gray-600">Comprehensive reporting and analytics dashboard</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Period</label>
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                options={[
                  { value: 'day', label: 'Daily' },
                  { value: 'week', label: 'Weekly' },
                  { value: 'month', label: 'Monthly' },
                  { value: 'year', label: 'Yearly' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Organization</label>
              <Select
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                options={[
                  { value: 'all', label: 'All Organizations' },
                  ...organizations.map(org => ({
                    value: org._id || org.id,
                    label: org.name,
                  })),
                ]}
              />
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
            <p className="text-gray-600">Loading analytics data...</p>
          </div>
        ) : (
          <>
            {/* Dashboard Stats */}
            {dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Tickets</p>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData.totalTickets}</p>
                    </div>
                    <FileText className="h-8 w-8 text-primary-600" />
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">SLA Compliance</p>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData.slaMetrics?.complianceRate || 0}%</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">SLA Breaches</p>
                      <p className="text-2xl font-bold text-red-600">{dashboardData.slaMetrics?.breached || 0}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Technicians</p>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData.technicianPerformance?.length || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </Card>
              </div>
            )}

            {/* Status-wise Chart */}
            {statusData.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold mb-4">Status-wise Ticket Count</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Department-wise Chart */}
            {departmentData.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold mb-4">Department-wise Tickets</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ departmentName, count }) => `${departmentName}: ${count}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* SLA Compliance */}
            {slaData && (
              <Card>
                <h3 className="text-lg font-semibold mb-4">SLA Compliance Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Response SLA</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Compliant:</span>
                        <span className="font-semibold text-green-600">{slaData.responseSLA?.compliant || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Breached:</span>
                        <span className="font-semibold text-red-600">{slaData.responseSLA?.breached || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Compliance Rate:</span>
                        <span className="font-semibold">{slaData.responseSLA?.complianceRate || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Resolution SLA</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Compliant:</span>
                        <span className="font-semibold text-green-600">{slaData.resolutionSLA?.compliant || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Breached:</span>
                        <span className="font-semibold text-red-600">{slaData.resolutionSLA?.breached || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Compliance Rate:</span>
                        <span className="font-semibold">{slaData.resolutionSLA?.complianceRate || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Technician Performance */}
            {technicianData.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold mb-4">Technician Performance</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Assigned</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resolved</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resolution Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {technicianData.map((tech, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {tech.technicianName || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tech.totalAssigned}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tech.resolved}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tech.closed}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Badge variant={tech.resolutionRate >= 80 ? 'success' : tech.resolutionRate >= 60 ? 'warning' : 'danger'}>
                              {tech.resolutionRate?.toFixed(1) || 0}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Trends */}
            {trendsData.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold mb-4">Ticket Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Total" />
                    <Line type="monotone" dataKey="open" stroke="#f59e0b" name="Open" />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" />
                    <Line type="monotone" dataKey="closed" stroke="#6b7280" name="Closed" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

