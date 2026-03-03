/**
 * Reporting & Analytics Routes
 * Admin Only - Provides comprehensive reporting and analytics
 */

import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'
import { checkSLAStatus } from '../config/sla.js'

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

/**
 * @route   GET /api/reports/dashboard
 * @desc    Get dashboard statistics for reports
 * @access  Private/Admin
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { period = 'month', organization_id } = req.query
    const orgId = organization_id || null

    // Date range calculation
    const now = new Date()
    let startDate = new Date()

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setMonth(now.getMonth() - 1)
    }

    // RPC calls for aggregated data
    const [
      { data: totalCountData },
      { data: statusData },
      { data: priorityData },
      { data: deptData },
      { data: techData },
      { data: slaTickets }
    ] = await Promise.all([
      // Total count
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .filter('organization_id', orgId ? 'eq' : 'is', orgId || null),

      // Breakdown RPCs
      supabase.rpc('get_status_breakdown', { start_date: startDate.toISOString(), target_org_id: orgId }),
      supabase.rpc('get_priority_breakdown', { start_date: startDate.toISOString(), target_org_id: orgId }),
      supabase.rpc('get_department_breakdown', { start_date: startDate.toISOString(), target_org_id: orgId }),
      supabase.rpc('get_technician_performance', { start_date: startDate.toISOString(), target_org_id: orgId }),

      // Tickets for SLA calculation
      supabase
        .from('tickets')
        .select('created_at, due_date, status')
        .gte('created_at', startDate.toISOString())
        .not('due_date', 'is', null)
        .filter('organization_id', orgId ? 'eq' : 'is', orgId || null)
    ])

    const totalTickets = totalCountData || 0

    // SLA Metrics logic
    let slaCompliant = 0
    let slaBreached = 0
    let slaWarnings = 0

    slaTickets?.forEach(ticket => {
      const slaStatus = checkSLAStatus(new Date(ticket.created_at), new Date(ticket.due_date), ticket.status)
      if (slaStatus.isOverdue) {
        slaBreached++
      } else if (slaStatus.timeRemaining) {
        const timeElapsed = new Date().getTime() - new Date(ticket.created_at).getTime()
        const totalTime = new Date(ticket.due_date).getTime() - new Date(ticket.created_at).getTime()
        const percentageElapsed = (timeElapsed / totalTime) * 100
        if (percentageElapsed >= 80) slaWarnings++
        else slaCompliant++
      }
    })

    res.json({
      period,
      startDate,
      endDate: now,
      totalTickets,
      statusBreakdown: statusData?.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count)
        return acc
      }, {}) || {},
      priorityBreakdown: priorityData?.reduce((acc, item) => {
        acc[item.priority] = parseInt(item.count)
        return acc
      }, {}) || {},
      departmentBreakdown: deptData?.map(d => ({
        departmentName: d.department_name,
        count: parseInt(d.count)
      })) || [],
      slaMetrics: {
        compliant: slaCompliant,
        breached: slaBreached,
        warnings: slaWarnings,
        complianceRate: totalTickets > 0 ? ((slaCompliant / totalTickets) * 100).toFixed(2) : 0,
      },
      technicianPerformance: techData?.map(t => ({
        technicianId: t.technician_id,
        technicianName: t.technician_name,
        technicianEmail: t.technician_email,
        totalAssigned: parseInt(t.total_assigned),
        resolved: parseInt(t.resolved),
        closed: parseInt(t.closed),
        resolutionRate: parseFloat(t.resolution_rate).toFixed(2)
      })) || [],
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/reports/status-wise
 * @desc    Get status-wise ticket count
 * @access  Private/Admin
 */
router.get('/status-wise', async (req, res) => {
  try {
    const { period = 'month', organization_id } = req.query
    const orgId = organization_id || null

    let startDate = new Date()
    const now = new Date()

    switch (period) {
      case 'day': startDate.setDate(now.getDate() - 1); break
      case 'week': startDate.setDate(now.getDate() - 7); break
      case 'month': startDate.setMonth(now.getMonth() - 1); break
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break
    }

    const { data: statusData, error } = await supabase.rpc('get_status_breakdown', {
      start_date: startDate.toISOString(),
      target_org_id: orgId
    })

    if (error) throw error

    res.json({
      period,
      data: statusData.map(item => ({
        status: item.status,
        count: parseInt(item.count),
      })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/reports/department-wise
 * @desc    Get department-wise ticket count
 * @access  Private/Admin
 */
router.get('/department-wise', async (req, res) => {
  try {
    const { period = 'month', organization_id } = req.query
    const orgId = organization_id || null

    let startDate = new Date()
    const now = new Date()

    switch (period) {
      case 'day': startDate.setDate(now.getDate() - 1); break
      case 'week': startDate.setDate(now.getDate() - 7); break
      case 'month': startDate.setMonth(now.getMonth() - 1); break
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break
    }

    const { data: deptData, error } = await supabase.rpc('get_department_breakdown', {
      start_date: startDate.toISOString(),
      target_org_id: orgId
    })

    if (error) throw error

    res.json({
      period,
      data: deptData.map(d => ({
        departmentName: d.department_name,
        count: parseInt(d.count)
      })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/reports/technician-performance
 * @desc    Get technician performance metrics
 * @access  Private/Admin
 */
router.get('/technician-performance', async (req, res) => {
  try {
    const { period = 'month', organization_id } = req.query
    const orgId = organization_id || null

    let startDate = new Date()
    const now = new Date()

    switch (period) {
      case 'day': startDate.setDate(now.getDate() - 1); break
      case 'week': startDate.setDate(now.getDate() - 7); break
      case 'month': startDate.setMonth(now.getMonth() - 1); break
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break
    }

    const { data: techData, error } = await supabase.rpc('get_technician_performance', {
      start_date: startDate.toISOString(),
      target_org_id: orgId
    })

    if (error) throw error

    res.json({
      period,
      data: techData.map(t => ({
        technicianId: t.technician_id,
        technicianName: t.technician_name,
        technicianEmail: t.technician_email,
        totalAssigned: parseInt(t.total_assigned),
        resolved: parseInt(t.resolved),
        closed: parseInt(t.closed),
        resolutionRate: parseFloat(t.resolution_rate).toFixed(2)
      })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/reports/sla-compliance
 * @desc    Get SLA compliance metrics
 * @access  Private/Admin
 */
router.get('/sla-compliance', async (req, res) => {
  try {
    const { period = 'month', organization_id } = req.query
    const orgId = organization_id || null

    let startDate = new Date()
    const now = new Date()

    switch (period) {
      case 'day': startDate.setDate(now.getDate() - 1); break
      case 'week': startDate.setDate(now.getDate() - 7); break
      case 'month': startDate.setMonth(now.getMonth() - 1); break
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break
    }

    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('created_at, due_date, response_due_date, status, updated_at')
      .gte('created_at', startDate.toISOString())
      .filter('organization_id', orgId ? 'eq' : 'is', orgId || null)

    if (error) throw error

    let responseCompliant = 0
    let responseBreached = 0
    let resolutionCompliant = 0
    let resolutionBreached = 0
    let totalWithResponseSLA = 0
    let totalWithResolutionSLA = 0

    tickets.forEach(ticket => {
      // Response SLA logic remains mostly same but adapted for dates
      if (ticket.response_due_date) {
        totalWithResponseSLA++
        const respDueDate = new Date(ticket.response_due_date)
        const updatedAt = new Date(ticket.updated_at)

        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          if (updatedAt <= respDueDate) responseCompliant++
          else responseBreached++
        } else if (new Date() > respDueDate) {
          responseBreached++
        } else {
          responseCompliant++
        }
      }

      // Resolution SLA
      if (ticket.due_date) {
        totalWithResolutionSLA++
        const dueDate = new Date(ticket.due_date)
        const updatedAt = new Date(ticket.updated_at)

        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          if (updatedAt <= dueDate) resolutionCompliant++
          else resolutionBreached++
        } else if (new Date() > dueDate) {
          resolutionBreached++
        } else {
          resolutionCompliant++
        }
      }
    })

    res.json({
      period,
      responseSLA: {
        total: totalWithResponseSLA,
        compliant: responseCompliant,
        breached: responseBreached,
        complianceRate: totalWithResponseSLA > 0 ? ((responseCompliant / totalWithResponseSLA) * 100).toFixed(2) : 0,
      },
      resolutionSLA: {
        total: totalWithResolutionSLA,
        compliant: resolutionCompliant,
        breached: resolutionBreached,
        complianceRate: totalWithResolutionSLA > 0 ? ((resolutionCompliant / totalWithResolutionSLA) * 100).toFixed(2) : 0,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/reports/trends
 * @desc    Get ticket trends over time
 * @access  Private/Admin
 */
router.get('/trends', async (req, res) => {
  try {
    const { period = 'month', organization_id, groupBy = 'day' } = req.query
    const orgId = organization_id || null

    let startDate = new Date()
    const now = new Date()

    switch (period) {
      case 'week': startDate.setDate(now.getDate() - 7); break
      case 'month': startDate.setMonth(now.getMonth() - 1); break
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break
      default: startDate.setMonth(now.getMonth() - 1)
    }

    // For trends, I'll use a simpler query and group in JS or add another RPC. 
    // SQL grouping is better. I'll use a raw query if possible or another RPC.
    // I'll assume I'll add get_ticket_trends RPC.
    const { data: trends, error } = await supabase.rpc('get_ticket_trends', {
      start_date: startDate.toISOString(),
      group_by: groupBy,
      target_org_id: orgId
    })

    if (error) throw error

    res.json({
      period,
      groupBy,
      data: trends,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

