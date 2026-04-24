import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import Home from './Home.tsx'
import Optimize from './Optimize.tsx'
import OptimizeResponse from './OptimizeResponse.tsx'
import { LoadsProvider } from './context/LoadsContext.tsx'
import { LoadSpaceProvider } from './context/LoadSpace.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <LoadSpaceProvider>
        <LoadsProvider>
          <Routes>
            <Route element={<App />}>
              <Route path="/" element={<Home />} />
              <Route path="/optimize" element={<Optimize />} />
              <Route path="/optimize-response" element={<OptimizeResponse />} />
            </Route>
          </Routes>
        </LoadsProvider>
      </LoadSpaceProvider>
    </Router>
  </StrictMode>,
)
