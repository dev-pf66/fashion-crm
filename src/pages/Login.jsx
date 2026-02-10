import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'forgot') {
        await resetPassword(email)
        setResetSent(true)
      } else if (mode === 'signup') {
        await signUp(email, password)
        setError('')
        alert('Check your email for a confirmation link!')
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(newMode) {
    setMode(newMode)
    setError('')
    setResetSent(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>
          {mode === 'forgot' ? 'Reset Password' : mode === 'signup' ? 'Create Account' : 'Sign In'}
        </h1>
        <p className="subtitle">Fashion Sourcing CRM</p>

        {error && <div className="error">{error}</div>}

        {mode === 'forgot' && resetSent ? (
          <div className="reset-sent">
            <div className="reset-sent-icon">&#9993;</div>
            <p>Password reset link sent to <strong>{email}</strong></p>
            <p className="text-muted text-sm">Check your inbox and click the link to reset your password.</p>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={() => switchMode('login')}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>

            {mode !== 'forgot' && (
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>
            )}

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                <button type="button" className="link-btn" onClick={() => switchMode('forgot')}>
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Loading...' : (
                mode === 'forgot' ? 'Send Reset Link' :
                mode === 'signup' ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>
        )}

        <div className="toggle">
          {mode === 'forgot' && !resetSent ? (
            <>
              Remember your password?{' '}
              <button onClick={() => switchMode('login')}>Sign In</button>
            </>
          ) : mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button onClick={() => switchMode('login')}>Sign In</button>
            </>
          ) : mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => switchMode('signup')}>Sign Up</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
