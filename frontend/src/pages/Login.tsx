import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSSO } from '../contexts/SSOContext'
import { useLogo } from '../contexts/LogoContext'
import { useTheme } from '../contexts/ThemeContext'
import { useSound } from '../utils/soundEffects'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Mail, Lock, Shield, Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { generateCSRFToken, setCSRFToken, validateEmail } from '../services/securityService'
import toast from 'react-hot-toast'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const { login } = useAuth()
  const { ssoSettings } = useSSO()
  const { logo, showOnLogin, loginTitle } = useLogo()
  const { playClick, playConfirm } = useSound()
  const navigate = useNavigate()

  useEffect(() => {
    const csrfToken = generateCSRFToken()
    setCSRFToken(csrfToken)
    
    // Clear any existing rate limit data (rate limiting is disabled)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('rate_limit_')) {
        localStorage.removeItem(key)
      }
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    playConfirm()

    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' })
      setLoading(false)
      return
    }

    // Rate limiting disabled
    // const rateLimit = checkRateLimit(`login_${email}`, 5, 15 * 60 * 1000)
    // if (!rateLimit.allowed) {
    //   toast.error('Too many login attempts. Please try again in 15 minutes.')
    //   setLoading(false)
    //   return
    // }

    try {
      const response = await login(email, password)
      
      if (response.mfaRequired && response.tempToken) {
        navigate('/mfa-login', { 
          state: { 
            tempToken: response.tempToken,
            email: email 
          } 
        })
      } else {
        toast.success('Login successful!')
        navigate('/dashboard')
      }
    } catch (error) {
      setErrors({ password: error.message || 'Invalid email or password' })
      toast.error(error.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const bgColor = isDarkMode ? '#0a0a0a' : '#ffffff'
  const textColor = isDarkMode ? '#ffffff' : '#000000'
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  const cardBg = isDarkMode ? 'rgba(20, 20, 20, 0.8)' : 'rgba(255, 255, 255, 0.9)'

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-8 relative transition-colors duration-500"
      style={{ backgroundColor: bgColor }}
    >

      {/* Dark Mode Toggle */}
      <button
        onClick={() => {
          setIsDarkMode(!isDarkMode)
          playClick()
        }}
        className="absolute top-8 right-8 z-20 p-3 rounded-full backdrop-blur-md border transition-all duration-300 hover:scale-110"
        style={{
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderColor: borderColor,
          color: textColor
        }}
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Login Card with 3D Effect */}
      <div className="w-full max-w-md relative z-10">
        <div 
          className="rounded-3xl overflow-hidden backdrop-blur-2xl border transition-all duration-500 hover:scale-[1.02]"
          style={{
            background: cardBg,
            borderColor: borderColor,
            boxShadow: isDarkMode
              ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 20px 60px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            transform: 'perspective(1000px) rotateX(0deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          <div className="p-8 sm:p-10">
            {/* Logo */}
            {logo && showOnLogin && (
              <div className="text-center mb-8 animate-slide-down">
                <div 
                  className="inline-block backdrop-blur-md p-4 rounded-xl border transition-all duration-300 hover:scale-105"
                  style={{
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    borderColor: borderColor,
                    boxShadow: isDarkMode
                      ? '0 4px 15px rgba(0, 0, 0, 0.3)'
                      : '0 4px 15px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <img 
                    src={logo} 
                    alt="Logo" 
                    className="h-14 w-auto max-w-xs"
                    style={{
                      filter: isDarkMode ? 'brightness(1.2)' : 'none',
                      maxHeight: '56px',
                      display: 'block',
                    }}
                    onError={(e) => {
                      e.target.src = '/logo.svg'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Title */}
            {loginTitle && (
              <div className="text-center mb-8 animate-slide-down" style={{ animationDelay: '0.1s' }}>
                <h1 
                  className="text-4xl font-bold mb-2 tracking-tight"
                  style={{ color: textColor }}
                >
                  {loginTitle}
                </h1>
                <p 
                  className="text-sm font-medium tracking-wide uppercase"
                  style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' }}
                >
                  Secure Access Portal
                </p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6 animate-slide-down" style={{ animationDelay: '0.2s' }}>
              {/* Email Field */}
              <div>
                <label 
                  className="block text-sm font-semibold mb-2 tracking-wide uppercase"
                  style={{ color: textColor }}
                >
                  Email Address
                </label>
                <div className="relative">
                  <div 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 transition-all duration-300"
                    style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}
                  >
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setErrors({ ...errors, email: '' })
                      if (e.target.value) playClick()
                    }}
                    className="w-full px-4 py-4 pl-12 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-0"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: errors.email 
                        ? (isDarkMode ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 0, 0, 0.3)')
                        : borderColor,
                      color: textColor,
                      focusRingColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'
                    }}
                    required
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm animate-slide-down" style={{ color: '#ef4444' }}>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label 
                  className="block text-sm font-semibold mb-2 tracking-wide uppercase"
                  style={{ color: textColor }}
                >
                  Password
                </label>
                <div className="relative">
                  <div 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 transition-all duration-300"
                    style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}
                  >
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setErrors({ ...errors, password: '' })
                      if (e.target.value) playClick()
                    }}
                    className="w-full px-4 py-4 pl-12 pr-12 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-0"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: errors.password 
                        ? (isDarkMode ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 0, 0, 0.3)')
                        : borderColor,
                      color: textColor,
                      focusRingColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword(!showPassword)
                      playClick()
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 transition-colors"
                    style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm animate-slide-down" style={{ color: '#ef4444' }}>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border transition-all duration-200 cursor-pointer group-hover:scale-110" 
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      borderColor: borderColor
                    }}
                    onChange={() => playClick()}
                  />
                  <span 
                    className="ml-2 text-sm font-medium transition-colors"
                    style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)' }}
                  >
                    Remember me
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.9)',
                  color: isDarkMode ? '#000000' : '#ffffff',
                  border: `1px solid ${borderColor}`,
                  boxShadow: isDarkMode
                    ? '0 4px 15px rgba(0, 0, 0, 0.3)'
                    : '0 4px 15px rgba(0, 0, 0, 0.2)'
                }}
              >
                {/* Button glow effect */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                  style={{ backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)' }}
                />
                
                {/* Button content */}
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Shield size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                      Log in
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* SSO Options */}
            {(ssoSettings.azureEnabled || ssoSettings.googleEnabled) && (
              <div className="mt-8 pt-8 animate-slide-down" style={{ animationDelay: '0.3s', borderTop: `1px solid ${borderColor}` }}>
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div style={{ borderTop: `1px solid ${borderColor}`, width: '100%' }}></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span 
                      className="px-3 font-medium uppercase tracking-wide"
                      style={{ 
                        backgroundColor: cardBg,
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'
                      }}
                    >
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {ssoSettings.googleEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        playClick()
                        navigate('/sso/google')
                      }}
                      className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] group"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                        borderColor: borderColor
                      }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span 
                        className="text-sm font-medium transition-colors"
                        style={{ color: textColor }}
                      >
                        Google Workspace
                      </span>
                    </button>
                  )}
                  
                  {ssoSettings.azureEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        playClick()
                        navigate('/sso/azure')
                      }}
                      className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] group"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                        borderColor: borderColor
                      }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0h11.5v11.5H0V0z" fill="#F25022"/>
                        <path d="M11.5 0H23v11.5H11.5V0z" fill="#7FBA00"/>
                        <path d="M0 11.5h11.5V23H0V11.5z" fill="#00A4EF"/>
                        <path d="M11.5 11.5H23V23H11.5V11.5z" fill="#FFB900"/>
                      </svg>
                      <span 
                        className="text-sm font-medium transition-colors"
                        style={{ color: textColor }}
                      >
                        Microsoft
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.5s ease-out forwards;
        }
        .animate-pulse {
          animation: pulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
