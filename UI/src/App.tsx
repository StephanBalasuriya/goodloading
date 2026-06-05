import { Outlet, Navigate } from 'react-router-dom'
import HeaderBar from './components/HeaderBar'
import Sidebar from './components/Sidebar'
import { useAuth } from './context/AuthContext'
import './App.css'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
        color: '#122038',
        fontWeight: 'bold',
        fontSize: '1.2rem'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(11, 99, 246, 0.1)',
            borderTop: '4px solid #0b63f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></span>
          Loading Stack360...
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

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
