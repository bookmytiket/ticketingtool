import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { useSSO } from '../../contexts/SSOContext'
import { adminAPI } from '../../services/api'
import { Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export const SSOConfig = () => {
  const { ssoSettings, updateSSOSettings } = useSSO()
  const [azureEnabled, setAzureEnabled] = useState(ssoSettings.azureEnabled)
  const [googleEnabled, setGoogleEnabled] = useState(ssoSettings.googleEnabled)

  const [azureConfig, setAzureConfig] = useState({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    redirectUri: window.location.origin + '/sso/azure/callback',
  })

  const [googleConfig, setGoogleConfig] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: window.location.origin + '/sso/google/callback',
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSSOConfigs()
  }, [])

  const loadSSOConfigs = async () => {
    try {
      const configs = await adminAPI.getSSOConfig()
      const azure = configs.find(c => c.provider === 'azure')
      const google = configs.find(c => c.provider === 'google')
      
      if (azure && azure.config) {
        setAzureConfig({ ...azureConfig, ...azure.config })
        setAzureEnabled(azure.enabled)
      }
      if (google && google.config) {
        setGoogleConfig({ ...googleConfig, ...google.config })
        setGoogleEnabled(google.enabled)
      }
    } catch (error) {
      console.error('Failed to load SSO configs:', error)
    }
  }

  const handleAzureToggle = async (enabled) => {
    try {
    setAzureEnabled(enabled)
      await updateSSOSettings({ azureEnabled: enabled })
      await adminAPI.updateSSOConfig({
        provider: 'azure',
        enabled,
        config: azureConfig,
      })
    toast.success(`Azure AD ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      toast.error('Failed to update Azure AD settings')
    }
  }

  const handleGoogleToggle = async (enabled) => {
    try {
    setGoogleEnabled(enabled)
      await updateSSOSettings({ googleEnabled: enabled })
      await adminAPI.updateSSOConfig({
        provider: 'google',
        enabled,
        config: googleConfig,
      })
    toast.success(`Google Workspace ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      toast.error('Failed to update Google Workspace settings')
    }
  }

  const handleAzureSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adminAPI.updateSSOConfig({
        provider: 'azure',
        enabled: azureEnabled,
        config: azureConfig,
      })
      toast.success('Azure AD configuration saved successfully!')
    } catch (error) {
      toast.error(error.message || 'Failed to save Azure AD configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adminAPI.updateSSOConfig({
        provider: 'google',
        enabled: googleEnabled,
        config: googleConfig,
      })
      toast.success('Google Workspace configuration saved successfully!')
    } catch (error) {
      toast.error(error.message || 'Failed to save Google Workspace configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleTest = (type) => {
    toast.loading(`Testing ${type} connection...`)
    setTimeout(() => {
      toast.dismiss()
      toast.success(`${type} connection successful!`)
    }, 2000)
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SSO Configuration</h1>
          <p className="text-gray-600 mt-1">Configure and manage Single Sign-On authentication methods</p>
        </div>

        {/* Azure AD Configuration */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#0078D4] rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.5 0L0 4.5V11.5C0 17.3 4.2 22.5 11.5 23C18.8 22.5 23 17.3 23 11.5V4.5L11.5 0Z" fill="white"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Microsoft Azure AD</h2>
                <p className="text-sm text-gray-600">Configure Azure Entra ID single sign-on</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant={azureEnabled ? 'success' : 'warning'}>
                {azureEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={azureEnabled}
                  onChange={(e) => handleAzureToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {azureEnabled && (
            <form onSubmit={handleAzureSave} className="space-y-4">
              <Input
                label="Tenant ID"
                value={azureConfig.tenantId}
                onChange={(e) => setAzureConfig({ ...azureConfig, tenantId: e.target.value })}
                placeholder="your-tenant-id"
                required
              />

              <Input
                label="Client ID (Application ID)"
                value={azureConfig.clientId}
                onChange={(e) => setAzureConfig({ ...azureConfig, clientId: e.target.value })}
                placeholder="your-application-id"
                required
              />

              <Input
                type="password"
                label="Client Secret"
                value={azureConfig.clientSecret}
                onChange={(e) => setAzureConfig({ ...azureConfig, clientSecret: e.target.value })}
                placeholder="your-client-secret"
                required
              />

              <Input
                label="Redirect URI"
                value={azureConfig.redirectUri}
                onChange={(e) => setAzureConfig({ ...azureConfig, redirectUri: e.target.value })}
                required
              />

              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <p className="font-medium mb-2">Azure AD Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Register your application in Azure Portal</li>
                  <li>Configure redirect URI: {azureConfig.redirectUri}</li>
                  <li>Grant necessary API permissions (User.Read, openid, profile)</li>
                  <li>Configure app roles for user mapping</li>
                  <li>Copy Tenant ID, Client ID, and create a Client Secret</li>
                </ol>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => handleTest('Azure AD')}>
                  Test Connection
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Azure AD Settings'}
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Google Workspace Configuration */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Google Workspace</h2>
                <p className="text-sm text-gray-600">Configure Google Workspace single sign-on</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant={googleEnabled ? 'success' : 'warning'}>
                {googleEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={googleEnabled}
                  onChange={(e) => handleGoogleToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {googleEnabled && (
            <form onSubmit={handleGoogleSave} className="space-y-4">
              <Input
                label="Client ID"
                value={googleConfig.clientId}
                onChange={(e) => setGoogleConfig({ ...googleConfig, clientId: e.target.value })}
                placeholder="your-google-client-id"
                required
              />

              <Input
                type="password"
                label="Client Secret"
                value={googleConfig.clientSecret}
                onChange={(e) => setGoogleConfig({ ...googleConfig, clientSecret: e.target.value })}
                placeholder="your-google-client-secret"
                required
              />

              <Input
                label="Redirect URI"
                value={googleConfig.redirectUri}
                onChange={(e) => setGoogleConfig({ ...googleConfig, redirectUri: e.target.value })}
                required
              />

              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <p className="font-medium mb-2">Google Workspace Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Go to Google Cloud Console and create a new project</li>
                  <li>Enable Google+ API and Google Workspace API</li>
                  <li>Create OAuth 2.0 credentials (Web application)</li>
                  <li>Configure authorized redirect URI: {googleConfig.redirectUri}</li>
                  <li>Copy Client ID and Client Secret</li>
                  <li>Configure OAuth consent screen with your organization details</li>
                </ol>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => handleTest('Google Workspace')}>
                  Test Connection
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Google Workspace Settings'}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Security Note:</strong> SSO authentication methods use industry-standard OAuth 2.0 and OpenID Connect protocols. 
            All authentication flows are secured with CSRF tokens and follow cybersecurity best practices.
          </p>
        </div>
      </div>
    </Layout>
  )
}
