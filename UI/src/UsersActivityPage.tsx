import React, { useEffect, useState } from 'react'
import { UserPlus, Trash2, Calendar, Activity, Key, ShieldAlert } from 'lucide-react'
import { apiHandleUrl } from './config/api'
import { useAuth } from './context/AuthContext'
import './UsersActivityPage.css'

type ActivityLog = {
  id: number
  created_at: string
}

type UserActivityInfo = {
  id: string
  name: string
  email: string
  created_at: string
  activity_count: number
  recent_activities: ActivityLog[]
}

function UsersActivityPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserActivityInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Creation form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchUsersAndActivities = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('stack360_token')
      const response = await fetch(apiHandleUrl('/api/organization/users'), {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) {
        throw new Error(`Failed to load users activity (${response.status})`)
      }
      const data = await response.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users and activities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchUsersAndActivities()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!name.trim() || !email.trim()) {
      setFormError('All fields are required.')
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('stack360_token')
      const response = await fetch(apiHandleUrl('/api/organization/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name, email })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to create user')
      }

      setFormSuccess(`User ${name} created successfully! Credentials emailed to ${email}.`)
      setName('')
      setEmail('')
      await fetchUsersAndActivities()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error creating user.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      return
    }

    try {
      const token = localStorage.getItem('stack360_token')
      const response = await fetch(apiHandleUrl(`/api/organization/users/${userId}`), {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to delete user')
      }

      await fetchUsersAndActivities()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting user.')
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const isAdmin = user?.role === 'organization'

  return (
    <div className="activity-page">
      <header className="activity-hero">
        <div className="hero-content">
          <p className="eyebrow">Organization Dashboard</p>
          <h1>Users & Activity Logs</h1>
          <p className="hero-description">
            Monitor optimization calculations, audit system logs, and manage user access credentials for your organization.
          </p>
        </div>
      </header>

      <main className="activity-main">
        {error && <div className="error-banner">{error}</div>}

        <div className="activity-layout">
          {/* User List and Activity Timeline */}
          <section className="users-section">
            <div className="section-header">
              <h2>Active Members</h2>
              <span className="count-badge">{users.length} Users</span>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Retrieving organization activities...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="empty-state">
                <h3>No Users Found</h3>
                <p>No active team members have registered or been created yet.</p>
              </div>
            ) : (
              <div className="users-stack">
                {users.map((u) => (
                  <div key={u.id} className="user-activity-card">
                    <div className="user-meta-info">
                      <div className="user-primary">
                        <h3>{u.name}</h3>
                        <p className="email">{u.email}</p>
                      </div>
                      <div className="user-joined">
                        <Calendar className="icon-small" />
                        <span>Joined: {formatDate(u.created_at)}</span>
                      </div>
                    </div>

                    <div className="user-activity-details">
                      <div className="stat-summary">
                        <Activity className="icon-blue" />
                        <span className="stat-count">{u.activity_count}</span>
                        <span className="stat-label">Total Calculations</span>
                      </div>

                      {u.recent_activities.length > 0 ? (
                        <div className="timeline-block">
                          <h4>Recent Activity</h4>
                          <ul className="timeline-list">
                            {u.recent_activities.map((act) => (
                              <li key={act.id} className="timeline-item">
                                <span className="timeline-dot"></span>
                                <span className="timeline-text">Performed calculation</span>
                                <span className="timeline-time">{formatDate(act.created_at)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="no-activity-note">No recent calculation activity logged.</p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="user-actions-bar">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="btn-delete-user"
                          aria-label={`Delete user ${u.name}`}
                        >
                          <Trash2 className="icon" /> Delete User
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* User Creation Section */}
          <section className="control-section">
            {isAdmin ? (
              <div className="admin-card-premium">
                <div className="card-header-admin">
                  <UserPlus className="icon-admin" />
                  <h2>Create New User</h2>
                </div>
                <p className="card-sub">
                  Create credentials directly. The user can log in immediately without OTP verification.
                </p>

                {formError && <div className="error-alert">{formError}</div>}
                {formSuccess && <div className="success-alert">{formSuccess}</div>}

                <form onSubmit={handleCreateUser} className="admin-form">
                  <div className="input-group">
                    <label htmlFor="user-name">Full Name</label>
                    <input
                      type="text"
                      id="user-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="user-email">Email Address</label>
                    <input
                      type="email"
                      id="user-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john.doe@company.com"
                      required
                    />
                  </div>

                  <button type="submit" disabled={submitting} className="btn-submit-admin">
                    {submitting ? 'Creating...' : 'Create Team User'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="member-info-card">
                <ShieldAlert className="icon-warn" />
                <h3>Administrator Access Required</h3>
                <p>
                  You are logged in as a team member. Only the organization administrator accounts can create, delete, or manage team credentials.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default UsersActivityPage
