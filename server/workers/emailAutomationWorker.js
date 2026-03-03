/**
 * Email Automation Worker
 * Runs scheduled email automation tasks
 */

import supabase from '../config/supabase.js'
import {
  sendDailyOpenTicketsEmail,
  sendDailyReport,
  sendWeeklyReport,
  sendMonthlyReport,
} from '../services/emailAutomation.js'

let intervalId = null
let scheduledJobs = new Map()

/**
 * Start email automation worker
 * Checks every minute for scheduled tasks
 */
export const startEmailAutomationWorker = () => {
  if (intervalId) {
    console.log('Email automation worker already running')
    return
  }

  console.log('Starting email automation worker...')

  // Load all automations and schedule them
  loadAndScheduleAutomations()

  // Check every minute for scheduled tasks
  intervalId = setInterval(() => {
    checkAndRunScheduledTasks()
  }, 60 * 1000) // 1 minute

  // Also reload automations every hour in case of changes
  setInterval(() => {
    loadAndScheduleAutomations()
  }, 60 * 60 * 1000) // 1 hour

  console.log('Email automation worker started')
}

/**
 * Stop email automation worker
 */
export const stopEmailAutomationWorker = () => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    scheduledJobs.clear()
    console.log('Email automation worker stopped')
  }
}

/**
 * Load all automations and schedule them
 */
const loadAndScheduleAutomations = async () => {
  try {
    const { data: automations, error } = await supabase
      .from('email_automations')
      .select('*, organization:organizations(id, name)')
      .eq('is_enabled', true)

    if (error) throw error

    scheduledJobs.clear()

    for (const automation of automations) {
      scheduleAutomation(automation)
    }

    console.log(`Scheduled ${automations.length} email automations`)
  } catch (error) {
    console.error('Error loading automations:', error)
  }
}

/**
 * Schedule an automation
 */
const scheduleAutomation = (automation) => {
  const now = new Date()
  const scheduleConfig = automation.schedule || {}
  const [hours, minutes] = (scheduleConfig.time || '08:00').split(':').map(Number)

  let nextRun = new Date()
  nextRun.setHours(hours, minutes, 0, 0)

  // If time has passed today, schedule for tomorrow
  if (nextRun < now) {
    nextRun.setDate(nextRun.getDate() + 1)
  }

  // Adjust for weekly/monthly schedules
  if (automation.type === 'weekly-report' && scheduleConfig.day_of_week != null) {
    const targetDay = scheduleConfig.day_of_week
    const currentDay = now.getDay()
    const daysUntilTarget = (targetDay - currentDay + 7) % 7

    if (daysUntilTarget === 0 && nextRun < now) {
      nextRun.setDate(nextRun.getDate() + 7)
    } else {
      nextRun.setDate(nextRun.getDate() + daysUntilTarget)
    }
  }

  if (automation.type === 'monthly-report' && scheduleConfig.day_of_month != null) {
    const targetDay = scheduleConfig.day_of_month
    const currentDay = now.getDate()

    if (targetDay >= currentDay) {
      nextRun.setDate(targetDay)
    } else {
      // Next month
      nextRun.setMonth(nextRun.getMonth() + 1)
      nextRun.setDate(targetDay)
    }
  }

  // Persist next_run to Supabase
  supabase
    .from('email_automations')
    .update({ next_run: nextRun.toISOString() })
    .eq('id', automation.id)
    .then(({ error }) => {
      if (error) console.error('Error saving next run:', error)
    })

  const jobKey = `${automation.id}_${automation.type}`
  scheduledJobs.set(jobKey, {
    automation,
    nextRun,
  })

  console.log(`Scheduled ${automation.type} for ${automation.organization?.name || 'Global'} at ${nextRun.toISOString()}`)
}

/**
 * Check and run scheduled tasks
 */
const checkAndRunScheduledTasks = async () => {
  const now = new Date()

  for (const [key, job] of scheduledJobs.entries()) {
    if (job.nextRun <= now) {
      try {
        console.log(`Running ${job.automation.type} for ${job.automation.organization?.name || 'Global'}`)

        const organizationId = job.automation.organization_id || null

        let result
        switch (job.automation.type) {
          case 'daily-open-tickets':
            result = await sendDailyOpenTicketsEmail(organizationId)
            break
          case 'daily-report':
            result = await sendDailyReport(organizationId)
            break
          case 'weekly-report':
            result = await sendWeeklyReport(organizationId)
            break
          case 'monthly-report':
            result = await sendMonthlyReport(organizationId)
            break
        }

        console.log(`Completed ${job.automation.type}:`, result)

        // Reschedule for next run
        scheduleAutomation(job.automation)
      } catch (error) {
        console.error(`Error running ${job.automation.type}:`, error)
        // Still reschedule to retry later
        scheduleAutomation(job.automation)
      }
    }
  }
}

/**
 * Run automation manually (for testing)
 */
export const runAutomationManually = async (automationId) => {
  try {
    const { data: automation, error } = await supabase
      .from('email_automations')
      .select('*, organization:organizations(id, name)')
      .eq('id', automationId)
      .single()

    if (error || !automation) {
      throw new Error('Automation not found')
    }

    const organizationId = automation.organization_id || null

    let result
    switch (automation.type) {
      case 'daily-open-tickets':
        result = await sendDailyOpenTicketsEmail(organizationId)
        break
      case 'daily-report':
        result = await sendDailyReport(organizationId)
        break
      case 'weekly-report':
        result = await sendWeeklyReport(organizationId)
        break
      case 'monthly-report':
        result = await sendMonthlyReport(organizationId)
        break
      default:
        throw new Error('Unknown automation type')
    }

    return result
  } catch (error) {
    console.error('Error running automation manually:', error)
    throw error
  }
}

export default {
  startEmailAutomationWorker,
  stopEmailAutomationWorker,
  runAutomationManually,
}
