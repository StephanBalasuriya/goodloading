import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}>
        Home
      </NavLink>
      <NavLink to="/optimize" className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}>
        Optimize
      </NavLink>
      <NavLink to="/vehicles" className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}>
        Vehicles
      </NavLink>
      <NavLink to="/users-activity" className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}>
        Users Activity
      </NavLink>
      <button onClick={logout} className="sidebar-logout-btn">
        Logout
      </button>
    </aside>
  )
}

export default Sidebar
