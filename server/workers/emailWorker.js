import { checkEmails } from '../services/emailReceiver.js'

// Email check interval (in milliseconds)
// Default: Check every 5 minutes
const CHECK_INTERVAL = process.env.EMAIL_CHECK_INTERVAL 
  ? parseInt(process.env.EMAIL_CHECK_INTERVAL) 
  : 5 * 60 * 1000 // 5 minutes

let emailCheckInterval = null
let isRunning = false

// Start email worker
export const startEmailWorker = () => {
  if (isRunning) {
    console.log('ℹ️  Email worker is already running')
    return
  }
  
  console.log(`🚀 Starting email worker (checking every ${CHECK_INTERVAL / 1000} seconds)`)
  
  // Check immediately on start
  checkEmails().catch(err => {
    console.error('Error in initial email check:', err)
  })
  
  // Then check at intervals
  emailCheckInterval = setInterval(() => {
    checkEmails().catch(err => {
      console.error('Error checking emails:', err)
    })
  }, CHECK_INTERVAL)
  
  isRunning = true
}

// Stop email worker
export const stopEmailWorker = () => {
  if (emailCheckInterval) {
    clearInterval(emailCheckInterval)
    emailCheckInterval = null
    isRunning = false
    console.log('⏹️  Email worker stopped')
  }
}

// Manual email check (for testing)
export const manualEmailCheck = async () => {
  try {
    console.log('📧 Manual email check triggered')
    const tickets = await checkEmails()
    return tickets
  } catch (error) {
    console.error('Error in manual email check:', error)
    throw error
  }
}

