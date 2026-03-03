import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { SSOProvider } from './contexts/SSOContext'
import { LogoProvider } from './contexts/LogoContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'

// Auth Pages
import { Login } from './pages/Login'
import { AzureLogin } from './pages/SSO/Azure'
import { GoogleWorkspaceLogin } from './pages/SSO/GoogleWorkspace'
import { MFASetup } from './pages/MFASetup'
import { MFALogin } from './pages/MFALogin'

// Main Pages
import { Dashboard } from './pages/Dashboard'
import { TicketList } from './pages/Tickets/TicketList'
import { TicketSearch } from './pages/Tickets/TicketSearch'
import { NewTicket } from './pages/Tickets/NewTicket'
import { TicketDetail } from './pages/Tickets/TicketDetail'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'

// Admin Pages
import { Users } from './pages/Admin/Users'
import { Roles } from './pages/Admin/Roles'
import { EmailSettings } from './pages/Admin/EmailSettings'
import { EmailTemplates } from './pages/Admin/EmailTemplates'
import { SSOConfig } from './pages/Admin/SSOConfig'
import { LogoManagement } from './pages/Admin/LogoManagement'
import { Organizations } from './pages/Admin/Organizations'
import { Categories } from './pages/Admin/Categories'
import { SLAPolicies } from './pages/Admin/SLAPolicies'
import { Departments } from './pages/Admin/Departments'
import { TicketImport } from './pages/Admin/TicketImport'
import { Analytics } from './pages/Admin/Analytics'
import { ApiKeys } from './pages/Admin/ApiKeys'
import { ExternalIntegrations } from './pages/Admin/ExternalIntegrations'
import { EmailAutomation } from './pages/Admin/EmailAutomation'
import { TeamsIntegration } from './pages/Admin/TeamsIntegration'
import { FAQ } from './pages/Admin/FAQ'
import { ChatHistory } from './pages/Admin/ChatHistory'
import { BackupRestore } from './pages/Admin/BackupRestore'
import { DomainRules } from './pages/Admin/DomainRules'

// Reports Page
import { Reports } from './pages/Reports'

// Components
import { ChatWidget } from './components/ChatWidget'

function App() {
  return (
    <AuthProvider>
      <SSOProvider>
        <LogoProvider>
          <Router>
          <ErrorBoundary>
          <div className="App">
            <ChatWidget />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#ffffff',
                  color: '#111827',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#ffffff',
                  },
                  style: {
                    border: '1px solid #d1fae5',
                    background: '#f0fdf4',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#ffffff',
                  },
                  style: {
                    border: '1px solid #fee2e2',
                    background: '#fef2f2',
                  },
                },
              }}
            />
            <Routes>
              {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/mfa-login" element={<MFALogin />} />
            <Route path="/sso/azure" element={<AzureLogin />} />
            <Route path="/sso/google" element={<GoogleWorkspaceLogin />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <TicketList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/search"
              element={
                <ProtectedRoute>
                  <TicketSearch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/new"
              element={
                <ProtectedRoute>
                  <NewTicket />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/:id"
              element={
                <ProtectedRoute>
                  <TicketDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mfa-setup"
              element={
                <ProtectedRoute>
                  <MFASetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/organizations"
              element={
                <ProtectedRoute requireAdmin>
                  <Organizations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute requireAdmin>
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <ProtectedRoute requireAdmin>
                  <Roles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sla"
              element={
                <ProtectedRoute requireAdmin>
                  <SLAPolicies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/departments"
              element={
                <ProtectedRoute>
                  <Departments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/email"
              element={
                <ProtectedRoute requireAdmin>
                  <EmailSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/domain-rules"
              element={
                <ProtectedRoute requireAdmin>
                  <DomainRules />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/email-templates"
              element={
                <ProtectedRoute requireAdmin>
                  <EmailTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sso"
              element={
                <ProtectedRoute requireAdmin>
                  <SSOConfig />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/logo"
              element={
                <ProtectedRoute requireAdmin>
                  <LogoManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tickets/import"
              element={
                <ProtectedRoute requireAdmin>
                  <TicketImport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute requireAdmin>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/api-keys"
              element={
                <ProtectedRoute requireAdmin>
                  <ApiKeys />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/integrations"
              element={
                <ProtectedRoute requireAdmin>
                  <ExternalIntegrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/email-automation"
              element={
                <ProtectedRoute requireAdmin>
                  <EmailAutomation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/faq"
              element={
                <ProtectedRoute requireAdmin>
                  <FAQ />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/chat-history"
              element={
                <ProtectedRoute>
                  <ChatHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teams-integration"
              element={
                <ProtectedRoute requireAdmin>
                  <TeamsIntegration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backup-restore"
              element={
                <ProtectedRoute requireAdmin>
                  <BackupRestore />
                </ProtectedRoute>
              }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
        </ErrorBoundary>
      </Router>
        </LogoProvider>
      </SSOProvider>
    </AuthProvider>
  )
}

export default App

