/**
 * SLA Worker - Runs periodic SLA checks
 * Checks for SLA breaches and sends escalation emails
 */

import { checkSLACompliance, autoUpdateTicketStatus } from '../services/slaEngine.js'

let intervalId = null

/**
 * Start SLA worker
 * Runs every 15 minutes
 */
export const startSLAWorker = () => {
  if (intervalId) {
    console.log('SLA worker already running')
    return
  }

  console.log('Starting SLA worker...')

  // Run immediately on start
  runSLACheck()

  // Then run every 15 minutes
  intervalId = setInterval(() => {
    runSLACheck()
  }, 15 * 60 * 1000) // 15 minutes

  console.log('SLA worker started (runs every 15 minutes)')
}

/**
 * Stop SLA worker
 */
export const stopSLAWorker = () => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log('SLA worker stopped')
  }
}

/**
 * Run SLA check
 */
const runSLACheck = async () => {
  try {
    console.log('Running SLA compliance check...')
    
    // Check SLA compliance and send escalation emails
    const complianceResult = await checkSLACompliance()
    console.log('SLA compliance check completed:', complianceResult)

    // Auto-update ticket statuses
    const updateResult = await autoUpdateTicketStatus()
    console.log('Auto-update completed:', updateResult)
  } catch (error) {
    console.error('SLA worker error:', error)
  }
}

export default {
  startSLAWorker,
  stopSLAWorker,
}

