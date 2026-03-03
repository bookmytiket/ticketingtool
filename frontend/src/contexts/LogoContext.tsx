import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { adminAPI } from '../services/api'

interface LogoContextType {
  logo: string;
  showOnLogin: boolean;
  loginTitle: string | null;
  loading: boolean;
  updateLogo: (newLogo: string) => void;
  updateShowOnLogin: (value: boolean) => void;
  updateLoginTitle: (value: string | null) => void;
  reloadLogo: () => Promise<void>;
}

const LogoContext = createContext<LogoContextType | undefined>(undefined)

export const useLogo = () => {
  const context = useContext(LogoContext)
  if (context === undefined) {
    throw new Error('useLogo must be used within LogoProvider')
  }
  return context
}

interface LogoProviderProps {
  children: ReactNode;
}

export const LogoProvider = ({ children }: LogoProviderProps) => {
  const [logo, setLogo] = useState('/logo.svg') // Default fallback
  const [showOnLogin, setShowOnLogin] = useState(true) // Default to showing on login
  const [loginTitle, setLoginTitle] = useState<string | null>(null) // Welcome title for login page
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    loadLogo()
  }, [])

  const updateLogo = (newLogo: string) => {
    setLogo(newLogo)
  }

  const updateShowOnLogin = (value: boolean) => {
    setShowOnLogin(value)
  }

  const updateLoginTitle = (value: string | null) => {
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

