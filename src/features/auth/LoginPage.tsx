import { AlertCircle, ArrowRight, Check, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppProvider'
import type { Role } from '../../types/domain'
import { AmbientBackground } from '../../components/common/AmbientBackground'

const roles: Role[] = ['student', 'teacher', 'admin']
const roleLabels: Record<Role, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Principal / Admin',
}

export function LoginPage() {
  const { login, loginWithGoogle, resetPassword, authState, currentUser, isFirebaseMode, notify } = useApp()
  const devEmails: Record<Role, string> = {
    student: 'aarav@edupulse.dev',
    teacher: 'meera@edupulse.dev',
    admin: 'principal@edupulse.dev',
  }

  const [devRole, setDevRole] = useState<Role>('student')
  const [email, setEmail] = useState(!isFirebaseMode ? 'aarav@edupulse.dev' : '')
  const [password, setPassword] = useState(!isFirebaseMode ? 'password123' : '')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // When Firebase auth resolves and we have a user, navigate reactively.
  // This handles the race condition where authState.user isn't set yet at submit time.
  useEffect(() => {
    if (currentUser) {
      navigate(`/${currentUser.role}/dashboard`, { replace: true })
    }
  }, [currentUser, navigate])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid college email address.')
      return
    }
    if (!password) {
      setError('Enter your password to continue.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(email, password, devRole)
      // In dev mode (no Firebase), navigate immediately since there's no async auth listener
      if (!isFirebaseMode) {
        const role = devRole
        navigate(`/${role}/dashboard`, { replace: true })
      }
      // In Firebase mode, navigation happens via the useEffect above when currentUser updates
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await loginWithGoogle()
      // Navigation handled reactively by useEffect above
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google Sign-In failed.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      notify('Enter your email address first, then click Forgot password.', 'info')
      return
    }
    try {
      await resetPassword(email)
    } catch {
      // Error already shown via notify in AppProvider
    }
  }

  const isDevMode = !isFirebaseMode

  return (
    <main className="login-page">
      <AmbientBackground />
      <section className="login-panel login-panel--intro">
        <div className="login-brand"><span className="brand__mark">E</span><span>EduPulse</span></div>
        <div className="login-hero">
          <span className="eyebrow"><Sparkles size={15} /> CAMPUS CONNECT</span>
          <h1>Everything your campus needs, in one thoughtful place.</h1>
          <p>Follow classes, share learning resources, and keep academic conversations moving.</p>
        </div>
        <div className="login-benefits">
          {['Stay on top of your daily schedule', 'Keep assignments and materials organised', 'Communicate with the right people'].map((benefit) => (
            <div key={benefit}><span><Check size={16} /></span>{benefit}</div>
          ))}
        </div>
        <p className="login-footer">EduPulse · Built for better campus rhythm</p>
      </section>

      <section className="login-panel login-panel--form">
        <div className="login-form-wrap">
          <div>
            <span className="eyebrow">WELCOME BACK</span>
            <h2>Sign in to EduPulse</h2>
            <p>Use your college account to continue.</p>
          </div>
          <form className="form-stack" onSubmit={submit} noValidate>
            <label className="field">
              <span>College email</span>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@college.edu"
                  autoComplete="email"
                />
              </div>
            </label>
            <label className="field">
              <span>Password</span>
              <div className="input-with-icon">
                <LockKeyhole size={18} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((show) => !show)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && <p className="form-error"><AlertCircle size={16} />{error}</p>}
            {authState.error && !error && (
              <p className="form-error"><AlertCircle size={16} />{authState.error}</p>
            )}
            <div className="form-inline">
              <label className="checkbox">
                <input
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  type="checkbox"
                />
                {' '}<span>Remember me</span>
              </label>
              <button type="button" className="link-button" onClick={handleForgotPassword}>
                Forgot password?
              </button>
            </div>
            <button
              className="button button--primary button--large"
              disabled={loading || authState.loading}
            >
              {loading || authState.loading
                ? 'Signing in…'
                : <><span>Sign in</span> <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="or-divider"><span>or</span></div>
          <button
            className="button button--google"
            onClick={handleGoogleLogin}
            disabled={loading || authState.loading || isDevMode}
          >
            <span className="google-g">G</span> Continue with Google
          </button>

          {isDevMode && (
            <div className="dev-login">
              <div><GraduationCap size={18} /><strong>Development access</strong></div>
              <p>Connect Firebase credentials in <code>.env</code> to enable real authentication.</p>
              <label className="field">
                <span>Open workspace as</span>
                <select
                  value={devRole}
                  onChange={(event) => {
                    const newRole = event.target.value as Role
                    setDevRole(newRole)
                    setEmail(devEmails[newRole])
                    setPassword('password123')
                  }}
                >
                  {roles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}