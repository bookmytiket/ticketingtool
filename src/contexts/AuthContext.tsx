import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types'

// ─── Demo credentials (local bypass when Supabase doesn't have these users) ───
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'admin@example.com': {
    password: 'admin123',
    user: {
      id: 'demo-admin-001',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      status: 'active',
      created_at: new Date().toISOString(),
    },
  },
  'agent@example.com': {
    password: 'agent123',
    user: {
      id: 'demo-agent-001',
      email: 'agent@example.com',
      name: 'Support Agent',
      role: 'technician',
      status: 'active',
      created_at: new Date().toISOString(),
    },
  },
  'user@example.com': {
    password: 'user123',
    user: {
      id: 'demo-user-001',
      email: 'user@example.com',
      name: 'Demo User',
      role: 'user',
      status: 'active',
      created_at: new Date().toISOString(),
    },
  },
}

// ─── Context types ─────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode;
}

// Map Supabase user to our internal User type
const mapSupabaseUser = (supabaseUser: any): User => {
  const meta = supabaseUser.user_metadata || {}
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: meta.name || meta.full_name || supabaseUser.email?.split('@')[0] || 'User',
    role: meta.role || 'admin',
    status: 'active',
    organization_id: meta.organization_id || undefined,
    department_id: meta.department_id || undefined,
    avatar: meta.avatar_url || meta.avatar || undefined,
    created_at: supabaseUser.created_at || new Date().toISOString(),
  }
}

const DEMO_TOKEN = 'demo-session-token'

// ─── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for a demo session first
        const storedToken = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')
        if (storedToken === DEMO_TOKEN && storedUser) {
          setUser(JSON.parse(storedUser))
          setLoading(false)
          return
        }

        // Otherwise restore from Supabase session
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('Supabase session error:', error.message)
          setLoading(false)
          return
        }
        if (session?.user) {
          const mappedUser = mapSupabaseUser(session.user)
          setUser(mappedUser)
          localStorage.setItem('user', JSON.stringify(mappedUser))
          localStorage.setItem('token', session.access_token)
        }
      } catch (err) {
        console.warn('Auth init error:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const isDemoSession = localStorage.getItem('token') === DEMO_TOKEN
        if (isDemoSession) return  // don't override a demo session

        if (session?.user) {
          const mappedUser = mapSupabaseUser(session.user)
          setUser(mappedUser)
          localStorage.setItem('user', JSON.stringify(mappedUser))
          localStorage.setItem('token', session.access_token)
        } else if (!session) {
          setUser(null)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
    )

    return () => { subscription.unsubscribe() }
  }, [])

  const login = async (email: string, password: string) => {
    // ── 1. Try Supabase first ──────────────────────────────────────────────────
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error && data.session && data.user) {
      const mappedUser = mapSupabaseUser(data.user)
      setUser(mappedUser)
      localStorage.setItem('token', data.session.access_token)
      localStorage.setItem('user', JSON.stringify(mappedUser))
      return { token: data.session.access_token, user: mappedUser, mfaRequired: false }
    }

    // ── 2. Fall back to demo credentials ──────────────────────────────────────
    const normalizedEmail = email.toLowerCase().trim()
    const demo = DEMO_USERS[normalizedEmail]

    if (demo && demo.password === password) {
      const demoUser = { ...demo.user, created_at: new Date().toISOString() }
      setUser(demoUser)
      localStorage.setItem('token', DEMO_TOKEN)
      localStorage.setItem('user', JSON.stringify(demoUser))
      return { token: DEMO_TOKEN, user: demoUser, mfaRequired: false }
    }

    // ── 3. Nothing matched — surface the original Supabase error ──────────────
    throw new Error(error?.message || 'Invalid email or password')
  }

  const logout = async () => {
    const isDemoSession = localStorage.getItem('token') === DEMO_TOKEN
    if (!isDemoSession) {
      await supabase.auth.signOut()
    }
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const updateUser = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
