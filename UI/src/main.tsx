import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import Home from './Home.tsx'
import Optimize from './Optimize.tsx'
import OptimizeResponse from './OptimizeResponse.tsx'
import Login from './Login.tsx'
import OrgSignup from './OrgSignup.tsx'
import UserSignup from './UserSignup.tsx'
import VehiclesPage from './VehiclesPage.tsx'
import UsersActivityPage from './UsersActivityPage.tsx'
import { LoadsProvider } from './context/LoadsContext.tsx'
import { LoadSpaceProvider } from './context/LoadSpace.tsx'
import { AuthProvider } from './context/AuthContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <LoadSpaceProvider>
          <LoadsProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/organization-signup" element={<OrgSignup />} />
              <Route path="/user-signup" element={<UserSignup />} />
              <Route element={<App />}>
                <Route path="/" element={<Home />} />
                <Route path="/optimize" element={<Optimize />} />
                <Route path="/optimize-response" element={<OptimizeResponse />} />
                <Route path="/vehicles" element={<VehiclesPage />} />
                <Route path="/users-activity" element={<UsersActivityPage />} />
              </Route>
            </Routes>
          </LoadsProvider>
        </LoadSpaceProvider>
      </AuthProvider>
    </Router>
  </StrictMode>,
)
