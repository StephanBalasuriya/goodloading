import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import './Login.css'

const Login: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<'organization' | 'user'>('organization')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password, role)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">Stack360</h1>
          <p className="auth-subtitle">Smart load planning workspace</p>
        </div>

        <div className="role-toggle">
          <button
            type="button"
            className={`role-tab ${role === 'organization' ? 'active' : ''}`}
            onClick={() => {
              setRole('organization')
              setError('')
            }}
          >
            Organization
          </button>
          <button
            type="button"
            className={`role-tab ${role === 'user' ? 'active' : ''}`}
            onClick={() => {
              setRole('user')
              setError('')
            }}
          >
            User
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="error-alert">⚠️ {error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., mail@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          {role === 'organization' ? (
            <p>
              New tenant?{' '}
              <Link to="/organization-signup" className="auth-link">
                Register Organization
              </Link>
            </p>
          ) : (
            <p>
              Request access?{' '}
              <Link to="/user-signup" className="auth-link">
                Register User
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
