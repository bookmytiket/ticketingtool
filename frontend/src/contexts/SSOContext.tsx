import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { adminAPI } from '../services/api'

interface SSOSettings {
  azureEnabled: boolean;
  googleEnabled: boolean;
}

interface SSOContextType {
  ssoSettings: SSOSettings;
  updateSSOSettings: (newSettings: Partial<SSOSettings>) => Promise<void>;
  loading: boolean;
}

const SSOContext = createContext<SSOContextType | undefined>(undefined)

export const useSSO = () => {
  const context = useContext(SSOContext)
  if (context === undefined) {
    throw new Error('useSSO must be used within SSOProvider')
  }
  return context
}

interface SSOProviderProps {
  children: ReactNode;
}

export const SSOProvider = ({ children }: SSOProviderProps) => {
  const [ssoSettings, setSsoSettings] = useState<SSOSettings>({
    azureEnabled: false,
    googleEnabled: false,
  })
  const [loading, setLoading] = useState(true)

  const loadSSOSettings = async () => {
    try {
      const configs = await adminAPI.getSSOConfig()
      const settings = {
        azureEnabled: configs.find((c: any) => c.provider === 'azure')?.enabled || false,
        googleEnabled: configs.find((c: any) => c.provider === 'google')?.enabled || false,
      }
      setSsoSettings(settings)
    } catch (error: any) {
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

  useEffect(() => {
    // Load SSO settings from API
    loadSSOSettings()
  }, [])

  const updateSSOSettings = async (newSettings: Partial<SSOSettings>) => {
    try {
      // Update each provider config
      for (const [provider, enabled] of Object.entries(newSettings)) {
        if (provider === 'azureEnabled' || provider === 'googleEnabled') {
          const providerName = provider.replace('Enabled', '')
          await adminAPI.updateSSOConfig({
            provider: providerName,
            enabled: enabled as boolean,
            config: {},
          })
        }
      }
      const updated = { ...ssoSettings, ...newSettings } as SSOSettings
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

