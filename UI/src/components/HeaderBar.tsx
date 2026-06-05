import heroImg from '../assets/hero.png'
import { useAuth } from '../context/AuthContext'
import './HeaderBar.css'

function HeaderBar() {
  const { user } = useAuth()

  return (
    <header className="header-bar">
      <div className="header-brand">
        <img src={heroImg} alt="Goodloading logo" className="header-logo" />
        <div className="header-text">
          <h1>Stack360</h1>
          <p>Smart load planning workspace</p>
        </div>
      </div>
      {user && (
        <div className="header-profile">
          <div className="profile-details">
            <span className="profile-name">{user.name}</span>
            <span className="profile-role">
              {user.role === 'organization' ? 'Org Admin' : `User (${user.organization_name || 'Member'})`}
            </span>
          </div>
          <div className="profile-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </header>
  )
}

export default HeaderBar
