import { createContext, useContext, useState, useEffect } from 'react'
import { adminAPI } from '../services/api'

const LogoContext = createContext(null)

export const useLogo = () => {
  const context = useContext(LogoContext)
  if (!context) {
    throw new Error('useLogo must be used within LogoProvider')
  }
  return context
}

export const LogoProvider = ({ children }) => {
  const [logo, setLogo] = useState('/logo.svg') // Default fallback
  const [showOnLogin, setShowOnLogin] = useState(true) // Default to showing on login
  const [loginTitle, setLoginTitle] = useState(null) // Welcome title for login page
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogo()
  }, [])

  const loadLogo = async () => {
    try {
      const response = await adminAPI.getLogo()
      if (response.logo) {
        setLogo(response.logo)
      } else {
        // Use default logo if no logo in database
        setLogo('/logo.svg')
      }
      if (response.showOnLogin !== undefined) {
        setShowOnLogin(response.showOnLogin)
      }
      if (response.loginTitle !== undefined) {
        setLoginTitle(response.loginTitle)
      }
    } catch (error) {
      console.error('Failed to load logo:', error)
      // Keep default logo on error
      setLogo('/logo.svg')
    } finally {
      setLoading(false)
    }
  }

  const updateLogo = (newLogo) => {
    setLogo(newLogo)
  }

  const updateShowOnLogin = (value) => {
    setShowOnLogin(value)
  }

  const updateLoginTitle = (value) => {
    setLoginTitle(value)
  }

  return (
    <LogoContext.Provider value={{ 
      logo, 
      showOnLogin, 
      loginTitle,
      loading, 
      updateLogo, 
      updateShowOnLogin,
      updateLoginTitle,
      reloadLogo: loadLogo 
    }}>
      {children}
    </LogoContext.Provider>
  )
}

