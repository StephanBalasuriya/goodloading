import { Outlet } from 'react-router-dom'
import HeaderBar from './components/HeaderBar'
import Sidebar from './components/Sidebar'
import './App.css'

function App() {
  return (
    <>
      <HeaderBar />
      <div className="app-layout">
        <Sidebar />
        <Outlet />
      </div>
    </>
  )
}

export default App
