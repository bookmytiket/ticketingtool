// Security service for implementing cybersecurity best practices

// Generate CSRF token
export const generateCSRFToken = () => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Store CSRF token
export const setCSRFToken = (token) => {
  sessionStorage.setItem('csrf_token', token)
}

// Get CSRF token
export const getCSRFToken = () => {
  return sessionStorage.getItem('csrf_token')
}

// Validate CSRF token
export const validateCSRFToken = (token) => {
  const storedToken = getCSRFToken()
  return storedToken && storedToken === token
}

// Generate secure session ID
export const generateSessionId = () => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Rate limiting helper (client-side check)
export const checkRateLimit = (key, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now()
  const attempts = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '[]')
  const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs)
  
  if (recentAttempts.length >= maxAttempts) {
    return { allowed: false, remaining: 0 }
  }
  
  recentAttempts.push(now)
  localStorage.setItem(`rate_limit_${key}`, JSON.stringify(recentAttempts))
  
  return { allowed: true, remaining: maxAttempts - recentAttempts.length }
}

// Sanitize input to prevent XSS
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  const div = document.createElement('div')
  div.textContent = input
  return div.innerHTML
}

// Validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password strength validation
export const validatePasswordStrength = (password) => {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  const strength = {
    length: password.length >= minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
  }
  
  const score = Object.values(strength).filter(Boolean).length
  const strengthLevel = score <= 2 ? 'weak' : score <= 3 ? 'medium' : 'strong'
  
  return {
    ...strength,
    score,
    strengthLevel,
    isValid: score >= 3 && password.length >= minLength,
  }
}

// Secure logout - clear all sensitive data
export const secureLogout = () => {
  sessionStorage.clear()
  localStorage.removeItem('user')
  localStorage.removeItem('csrf_token')
  // Clear rate limit data
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('rate_limit_')) {
      localStorage.removeItem(key)
    }
  })
}

