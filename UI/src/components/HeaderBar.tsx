import { useState, useEffect, useRef } from 'react'
import heroImg from '../assets/hero.png'
import { useAuth } from '../context/AuthContext'
import { ChevronDown, Key } from 'lucide-react'
import { ChangePasswordModal } from './ChangePasswordModal'
import './HeaderBar.css'

function HeaderBar() {
  const { user } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleChangePasswordClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDropdownOpen(false)
    setIsModalOpen(true)
  }

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
        <div className="profile-container" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="header-profile-btn"
            aria-expanded={isDropdownOpen}
            aria-haspopup="menu"
            aria-label="Profile menu"
          >
            <div className="profile-details">
              <span className="profile-name">{user.name}</span>
              <span className="profile-role">
                {user.role === 'organization' ? 'Org Admin' : `User (${user.organization_name || 'Member'})`}
              </span>
            </div>
            <div className="profile-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className={`chevron-icon ${isDropdownOpen ? 'open' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="profile-dropdown" role="menu">
              <button
                onClick={handleChangePasswordClick}
                className="dropdown-item"
                role="menuitem"
              >
                <Key size={16} />
                Change Password
              </button>
            </div>
          )}
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  )
}

export default HeaderBar
