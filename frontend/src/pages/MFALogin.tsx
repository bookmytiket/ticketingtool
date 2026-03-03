import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLogo } from '../contexts/LogoContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Shield, ArrowLeft } from 'lucide-react'
import { mfaAPI } from '../services/api'
import toast from 'react-hot-toast'

export const MFALogin = () => {
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { updateUser } = useAuth()
  const { logo } = useLogo()
  
  // Get tempToken from location state (passed from login)
  const tempToken = location.state?.tempToken
  const email = location.state?.email

  useEffect(() => {
    // If no tempToken, redirect back to login
    if (!tempToken) {
      toast.error('Session expired. Please login again.')
      navigate('/login')
    }
  }, [tempToken, navigate])

  const handleVerify = async (e) => {
    e.preventDefault()
    
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }

    try {
      setLoading(true)
      // Verify MFA code with tempToken
      const response = await mfaAPI.verifyLogin(tempToken, verificationCode)
      
      // Store the final token and user
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      // Update auth context
      updateUser(response.user)
      
      toast.success('MFA verification successful!')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      toast.error(error.message || 'Invalid verification code')
      setVerificationCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    // Clear tempToken and go back to login
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <img 
              src={logo} 
              alt="Rezilyens" 
              className="h-24 w-auto"
              onError={(e) => {
                e.target.src = '/logo.svg'
              }}
            />
          </div>
          <p className="text-gray-600">Multi-Factor Authentication Required</p>
        </div>

        <Card>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Shield className="text-primary-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Enter Verification Code</h2>
            <p className="text-sm text-gray-600">
              {email ? `Please enter the 6-digit code from your authenticator app for ${email}` : 'Please enter the 6-digit code from your authenticator app'}
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              label="Verification Code"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              autoFocus
              className="text-center text-2xl tracking-widest font-mono"
            />

            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={verificationCode.length !== 6 || loading}
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
              
              <Button 
                type="button"
                variant="outline" 
                onClick={handleBack}
                className="w-full"
                disabled={loading}
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Login
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Open your authenticator app (Google Authenticator, Microsoft Authenticator, or Authy) and enter the 6-digit code shown.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

