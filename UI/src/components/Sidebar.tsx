import { NavLink } from 'react-router-dom'
import './Sidebar.css'

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}>
        Home
      </NavLink>
      <NavLink to="/optimize" className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}>
        Optimize
      </NavLink>
    </aside>
  )
}

export default Sidebar
