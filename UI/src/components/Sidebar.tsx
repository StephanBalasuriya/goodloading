import { Link } from 'react-router-dom'
import './Sidebar.css'

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <Link to="/" className="sidebar-link">
        Home
      </Link>
      <Link to="/optimize" className="sidebar-link">
        Optimize
      </Link>
    </aside>
  )
}

export default Sidebar
