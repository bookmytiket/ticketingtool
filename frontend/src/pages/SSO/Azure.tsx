import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateCSRFToken, setCSRFToken } from '../../services/securityService'

export const AzureLogin = () => {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Generate CSRF token for secure authentication
    const csrfToken = generateCSRFToken()
    setCSRFToken(csrfToken)
  }, [])

  const handleAzureAuth = async () => {
    setLoading(true)

    try {
      // In production, this would redirect to Azure AD
      // For demo purposes, we'll simulate the authentication flow
      
      // Simulate Azure AD OAuth redirect
      const azureAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${encodeURIComponent('your-azure-client-id')}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(window.location.origin + '/sso/azure/callback')}&` +
        `response_mode=query&` +
        `scope=${encodeURIComponent('openid profile email')}&` +
        `state=${generateCSRFToken()}`

      // In production, redirect to Azure AD:
      // window.location.href = azureAuthUrl

      // For demo, simulate successful authentication
      setTimeout(() => {
        login({
          id: 1,
          name: 'Azure User',
          email: 'user@microsoft.com',
          role: 'user',
          mfaEnabled: false,
          authProvider: 'azure',
        })
        toast.success('Azure Entra ID authentication successful!')
        navigate('/dashboard')
        setLoading(false)
      }, 1500)
    } catch (error) {
      toast.error('Azure AD authentication failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-md">
        <Button
          variant="outline"
          onClick={() => navigate('/login')}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Login
        </Button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-lg">
            <svg className="w-10 h-10" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.5 0L0 4.5V11.5C0 17.3 4.2 22.5 11.5 23C18.8 22.5 23 17.3 23 11.5V4.5L11.5 0Z" fill="#F25022"/>
              <path d="M11.5 0L23 4.5V11.5C23 17.3 18.8 22.5 11.5 23V0Z" fill="#7FBA00"/>
              <path d="M11.5 0L0 4.5V11.5C0 17.3 4.2 22.5 11.5 23V0Z" fill="#00A4EF"/>
              <path d="M11.5 0L0 4.5L11.5 11.5L23 4.5L11.5 0Z" fill="#FFB900"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Azure Entra ID</h1>
          <p className="text-gray-600">Sign in with your Microsoft account</p>
        </div>

        <Card>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
              <p className="font-medium mb-2">Azure Entra ID Authentication:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Secure OAuth 2.0 / OpenID Connect</li>
                <li>Enterprise Single Sign-On (SSO)</li>
                <li>Conditional Access policies</li>
                <li>Multi-factor authentication support</li>
              </ul>
            </div>

            <Button 
              onClick={handleAzureAuth} 
              className="w-full bg-[#0078D4] text-white hover:bg-[#0064B8]"
              disabled={loading}
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.5 0L0 4.5V11.5C0 17.3 4.2 22.5 11.5 23C18.8 22.5 23 17.3 23 11.5V4.5L11.5 0Z" fill="white"/>
                  </svg>
                  <span>Continue with Microsoft</span>
                </div>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
