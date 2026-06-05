import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import './Login.css' // Import shared auth styles
import './OrgSignup.css'

const OrgSignup: React.FC = () => {
  const { requestOrgSignupOtp, verifyOrgSignupOtp } = useAuth()
  const navigate = useNavigate()

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')

  // Flow states
  const [step, setStep] = useState<1 | 2>(1) // 1 = Details, 2 = OTP
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Timer states
  const [secondsLeft, setSecondsLeft] = useState(180) // 3 minutes

  useEffect(() => {
    if (step !== 2 || secondsLeft <= 0) return

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [step, secondsLeft])

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await requestOrgSignupOtp({
        name,
        email,
        password,
        confirm_password: confirmPassword,
        phone_number: phoneNumber || null
      })
      setSuccess('Verification code sent! Please check your email.')
      setSecondsLeft(180) // Reset timer
      setStep(2)
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration request.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (secondsLeft <= 0) {
      setError('OTP has expired. Please go back and request a new code.')
      return
    }

    setLoading(true)
    try {
      await verifyOrgSignupOtp(email, otpCode)
      setSuccess('Organization registered successfully! Redirecting to login...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Invalid or incorrect OTP code.')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">Stack360</h1>
          <p className="auth-subtitle">Register your organization workspace</p>
        </div>

        {error && <div className="error-alert">⚠️ {error}</div>}
        {success && <div className="success-alert">✅ {success}</div>}

        {step === 1 ? (
          <form className="auth-form" onSubmit={handleRequestOtp}>
            <div className="form-group">
              <label htmlFor="name">Organization Name</label>
              <input
                id="name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Logistics"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Organization Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., admin@acme.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                id="phoneNumber"
                type="tel"
                className="form-input"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g., +1234567890"
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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Submitting...' : 'Register Organization'}
            </button>
          </form>
        ) : (
          <div className="otp-card">
            <p className="otp-instruction">
              We sent a 6-digit verification code to <strong>{email}</strong>. Please enter the code to complete registration.
            </p>

            <form className="auth-form" onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label htmlFor="otpCode">Verification Code</label>
                <input
                  id="otpCode"
                  type="text"
                  className="form-input"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="e.g., 123456"
                  maxLength={6}
                  required
                />
              </div>

              <div className="timer-display">
                {secondsLeft > 0 ? (
                  <span>
                    Code expires in:{' '}
                    <span className="timer-active">{formatTime(secondsLeft)}</span>
                  </span>
                ) : (
                  <span className="timer-expired">Code expired. Please request a new one.</span>
                )}
              </div>

              <button type="submit" className="auth-button" disabled={loading || secondsLeft <= 0}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>

            <div className="resend-container">
              <button
                type="button"
                className="resend-button"
                onClick={() => setStep(1)}
              >
                ← Back to Details
              </button>
            </div>
          </div>
        )}

        <div className="auth-footer">
          <p>
            Already registered?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default OrgSignup
