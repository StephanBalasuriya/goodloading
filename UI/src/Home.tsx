import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import heroImg from './assets/hero.png'
import PlannerSection from './components/PlannerSection'
import VehicleSection from './components/VehicleSection'
import { useLoadsContext } from './context/LoadsContext'
import { useLoadSpace } from './context/LoadSpace'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const { loads } = useLoadsContext()
  const { selectedVehicles } = useLoadSpace()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const scrollToPlanner = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const plannerSection = document.getElementById('start-button')
    if (!plannerSection) return

    const top = plannerSection.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top, behavior: 'smooth' })
  }

  const handleUpload = () => {
    setErrorMessage(null)

    // Check if there's at least one load with data
    const hasValidLoads = loads.length > 0 && loads.some((load) => load.name.trim() !== '')
    if (!hasValidLoads) {
      setErrorMessage('Error: Please add at least one load with a name.')
      return
    }

    // Check if there's at least one vehicle selected
    if (selectedVehicles.length === 0) {
      setErrorMessage('Error: Please select at least one vehicle.')
      return
    }

    // All validations passed, navigate to optimize page
    navigate('/optimize')
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Goodloading Platform</p>
          <h1>Plan Every Load Like It Already Happened</h1>
          <p className="hero-text">
            A logistics planning interface for teams that need precision, speed,
            and fewer surprises in the loading bay.
          </p>
          {errorMessage && (
            <p className="error-message" style={{ color: '#d32f2f', marginTop: '0.8rem', fontSize: '0.9rem' }}>
              {errorMessage}
            </p>
          )}
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={scrollToPlanner}>
              Start Planning
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleUpload}>
              Upload
            </button>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit" />
          <img src={heroImg} alt="Goodloading visual" />
        </div>
      </header>

      <main>
        <PlannerSection id="start-button" />
        <VehicleSection/>
      </main>
    </div>
  )
}

export default Home
