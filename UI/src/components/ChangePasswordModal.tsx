import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Eye, EyeOff } from 'lucide-react'
import { apiHandleUrl } from '../config/api'
import './ChangePasswordModal.css'

type ChangePasswordModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.')
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('stack360_token')
      const response = await fetch(apiHandleUrl('/api/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to update password')
      }

      setSuccess('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="password-modal-overlay" role="dialog" aria-modal="true">
      <div className="password-modal-container">
        <button
          onClick={onClose}
          className="password-modal-close"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        <h2>Change Password</h2>
        
        {error && <div className="password-alert-error">{error}</div>}
        {success && <div className="password-alert-success">{success}</div>}

        <form onSubmit={handlePasswordSubmit} className="password-form">
          <div className="password-form-field">
            <label htmlFor="current-pwd">Current Password</label>
            <div className="password-input-wrapper">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="current-pwd"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="password-form-field">
            <label htmlFor="new-pwd">New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="new-pwd"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="password-form-field">
            <label htmlFor="confirm-pwd">Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirm-pwd"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
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

          <div className="password-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="password-btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="password-btn-submit"
            >
              {submitting ? 'Updating...' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
