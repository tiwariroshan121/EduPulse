import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useApp } from './AppProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { StudentPage } from '../features/student/StudentPage'
import { TeacherPage } from '../features/teacher/TeacherPage'
import { AdminPage } from '../features/admin/AdminPage'
import { Toast } from '../components/feedback/Toast'
import type { Role } from '../types/domain'

/** Full-screen loading spinner shown while Firebase resolves auth state */
function AuthLoadingScreen() {
  return (
    <div className="auth-loading-screen" role="status" aria-label="Loading EduPulse">
      <div className="auth-loading-screen__inner">
        <span className="brand__mark">E</span>
        <p>Loading EduPulse…</p>
      </div>
    </div>
  )
}

/** Error Boundary prevents blank screens on unhandled component errors */
interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('EduPulse runtime error caught by boundary:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-fallback" role="alert">
          <div className="brand__mark">E</div>
          <h2>Something went wrong</h2>
          <p>EduPulse encountered an unexpected interface error. Your account data remains secure.</p>
          <div className="error-fallback__actions">
            <button className="button button--primary" onClick={this.handleReload}>
              Reload page
            </button>
            <a className="button button--ghost" href="/">
              Return to dashboard
            </a>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

/** Offline status notification banner */
function OfflineBanner() {
  const { isOnline } = useApp()
  if (isOnline) return null

  return (
    <aside className="offline-banner" role="status" aria-live="polite">
      <span>Offline mode · Working with cached data.</span>
    </aside>
  )
}

function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const { currentUser, authState } = useApp()
  const location = useLocation()

  // While Firebase is still resolving, show a loading screen instead of redirecting
  if (authState.loading) return <AuthLoadingScreen />

  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (currentUser.role !== role) return <Navigate to={`/${currentUser.role}/dashboard`} replace />
  return <>{children}</>
}

function HomeRedirect() {
  const { currentUser, authState } = useApp()

  if (authState.loading) return <AuthLoadingScreen />
  return <Navigate to={currentUser ? `/${currentUser.role}/dashboard` : '/login'} replace />
}

function ProfileRedirect() {
  const { currentUser, authState } = useApp()
  if (authState.loading) return <AuthLoadingScreen />
  return <Navigate to={currentUser ? `/${currentUser.role}/profile` : '/login'} replace />
}

function SettingsRedirect() {
  const { currentUser, authState } = useApp()
  if (authState.loading) return <AuthLoadingScreen />
  return <Navigate to={currentUser ? `/${currentUser.role}/settings` : '/login'} replace />
}

function NotFound() {
  return (
    <main className="not-found">
      <div className="brand__mark">E</div>
      <h1>Page not found</h1>
      <p>The page you are looking for is not available in EduPulse.</p>
      <a className="button button--primary" href="/">Return to EduPulse</a>
    </main>
  )
}

export function App() {
  const { toast } = useApp()
  return (
    <ErrorBoundary>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<ProfileRedirect />} />
        <Route path="/settings" element={<SettingsRedirect />} />
        <Route path="/preferences" element={<SettingsRedirect />} />
        <Route path="/student/*" element={<Guard role="student"><StudentPage /></Guard>} />
        <Route path="/teacher/*" element={<Guard role="teacher"><TeacherPage /></Guard>} />
        <Route path="/admin/*" element={<Guard role="admin"><AdminPage /></Guard>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} />}
    </ErrorBoundary>
  )
}
