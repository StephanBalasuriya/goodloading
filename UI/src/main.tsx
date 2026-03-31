import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LoadsProvider } from './context/LoadsContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoadsProvider>
      <App />
    </LoadsProvider>
  </StrictMode>,
)
