import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LoadsProvider } from './context/LoadsContext.tsx'
import { LoadSpaceProvider } from './context/LoadSpace.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoadSpaceProvider>
      <LoadsProvider>
        <App />
      </LoadsProvider>
    </LoadSpaceProvider>
  </StrictMode>,
)
