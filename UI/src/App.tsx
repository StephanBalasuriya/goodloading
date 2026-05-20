import { Outlet } from 'react-router-dom'
import HeaderBar from './components/HeaderBar'
import Sidebar from './components/Sidebar'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <HeaderBar />
      <div className="app-layout">
        <Sidebar />
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default App
