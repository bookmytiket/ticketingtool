import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateCSRFToken, setCSRFToken } from '../../services/securityService'

export const GoogleWorkspaceLogin = () => {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Generate CSRF token for secure authentication
    const csrfToken = generateCSRFToken()
    setCSRFToken(csrfToken)
  }, [])

  const handleGoogleAuth = async () => {
    setLoading(true)

    try {
      // In production, this would redirect to Google OAuth
      // For demo purposes, we'll simulate the authentication flow
      
      // Simulate Google OAuth redirect
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent('your-google-client-id')}&` +
        `redirect_uri=${encodeURIComponent(window.location.origin + '/sso/google/callback')}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid email profile')}&` +
        `state=${generateCSRFToken()}`

      // In production, redirect to Google:
      // window.location.href = googleAuthUrl

      // For demo, simulate successful authentication
      setTimeout(() => {
        login({
          id: 1,
          name: 'Google User',
          email: 'user@gmail.com',
          role: 'user',
          mfaEnabled: false,
          authProvider: 'google',
        })
        toast.success('Google Workspace authentication successful!')
        navigate('/dashboard')
        setLoading(false)
      }, 1500)
    } catch (error) {
      toast.error('Google Workspace authentication failed')
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
            <svg className="w-10 h-10" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Google Workspace</h1>
          <p className="text-gray-600">Sign in with your Google Workspace account</p>
        </div>

        <Card>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
              <p className="font-medium mb-2">Google Workspace Authentication:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Secure OAuth 2.0 authentication</li>
                <li>Single Sign-On (SSO) support</li>
                <li>Organization-wide access control</li>
                <li>Multi-factor authentication support</li>
              </ul>
            </div>

            <Button 
              onClick={handleGoogleAuth} 
              className="w-full bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50"
              disabled={loading}
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google Workspace</span>
                </div>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

