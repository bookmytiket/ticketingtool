import { createContext, useContext, useState, useEffect } from 'react'
import { adminAPI } from '../services/api'

const SSOContext = createContext(null)

export const useSSO = () => {
  const context = useContext(SSOContext)
  if (!context) {
    throw new Error('useSSO must be used within SSOProvider')
  }
  return context
}

export const SSOProvider = ({ children }) => {
  const [ssoSettings, setSsoSettings] = useState({
    azureEnabled: false,
    googleEnabled: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load SSO settings from API
    loadSSOSettings()
  }, [])

  const loadSSOSettings = async () => {
    try {
      const configs = await adminAPI.getSSOConfig()
      const settings = {
        azureEnabled: configs.find(c => c.provider === 'azure')?.enabled || false,
        googleEnabled: configs.find(c => c.provider === 'google')?.enabled || false,
      }
      setSsoSettings(settings)
    } catch (error) {
      // Silently fail - SSO settings are optional
      console.warn('SSO settings not available:', error.message)
      // Set defaults
      setSsoSettings({
        azureEnabled: false,
        googleEnabled: false,
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSSOSettings = async (newSettings) => {
    try {
      // Update each provider config
      for (const [provider, enabled] of Object.entries(newSettings)) {
        if (provider === 'azureEnabled' || provider === 'googleEnabled') {
          const providerName = provider.replace('Enabled', '')
          await adminAPI.updateSSOConfig({
            provider: providerName,
            enabled,
            config: {},
          })
        }
      }
    const updated = { ...ssoSettings, ...newSettings }
    setSsoSettings(updated)
    } catch (error) {
      console.error('Failed to update SSO settings:', error)
      throw error
    }
  }

  return (
    <SSOContext.Provider value={{ ssoSettings, updateSSOSettings, loading }}>
      {children}
    </SSOContext.Provider>
  )
}

