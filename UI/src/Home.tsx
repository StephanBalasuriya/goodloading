import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import heroImg from './assets/hero.png'
import PlannerSection from './components/PlannerSection'
// import VehicleSection from './components/VehicleSection'
import { useLoadsContext } from './context/LoadsContext'
import { apiHandleUrl } from './config/api'
import './Home.css'

const GMPRO_RESPONSE_ENDPOINT = apiHandleUrl('/GMPROResponse')

type GmproInputMode = 'gmpro_system' | 'manual_json'

function Home() {
  const navigate = useNavigate()
  const { loads } = useLoadsContext()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [gmproInputMode, setGmproInputMode] = useState<GmproInputMode>('gmpro_system')
  const [gmproJsonInput, setGmproJsonInput] = useState('')
  const [gmproSubmitError, setGmproSubmitError] = useState<string | null>(null)
  const [gmproSubmitSuccess, setGmproSubmitSuccess] = useState<string | null>(null)
  const [isSubmittingGmproJson, setIsSubmittingGmproJson] = useState(false)

  const scrollToPlanner = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const plannerSection = document.getElementById('start-button')
    if (!plannerSection) return

    const top = plannerSection.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top, behavior: 'smooth' })
  }

  const handleUpload = () => {
    if (!gmproSubmitSuccess  && gmproInputMode === 'manual_json') {
      setErrorMessage('Please insert correct GMPRO response JSON before sending.')
      return
    }
    setErrorMessage(null)

    // Check if there's at least one load with data
    const hasValidLoads = loads.length > 0 && loads.some((load) => load.name.trim() !== '')
    if (!hasValidLoads) {
      setErrorMessage('Error: Please add at least one load with a name.')
      return
    }

    // // Check if there's at least one vehicle selected
    // if (selectedVehicles.length === 0) {
    //   setErrorMessage('Error: Please select at least one vehicle.')
    //   return
    // }

    // All validations passed, navigate to optimize page and mark upload flow
    navigate('/optimize', {
      state: {
        fromUpload: true,
        uploadRequestId: Date.now(),
      },
    })
  }

  const submitGmproJson = async () => {
    setGmproSubmitError(null)
    setGmproSubmitSuccess(null)

    if (gmproJsonInput.trim() === '') {
      setGmproSubmitError('Please paste GMPRO response JSON before sending.')
      return
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(gmproJsonInput)
    } catch {
      setGmproSubmitError('Invalid JSON. Please check the format and try again.')
      return
    }

    if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
      setGmproSubmitError('GMPRO response must be a JSON object.')
      return
    }

    setIsSubmittingGmproJson(true)
    try {
      const response = await fetch(GMPRO_RESPONSE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedJson),
      })
      console.log('GMPRO JSON submission response :', response)
      const rawBody = await response.text()
      let parsedBody: unknown = null

      if (rawBody.trim() !== '') {
        try {
          parsedBody = JSON.parse(rawBody) as unknown
        } catch {
          parsedBody = rawBody
        }
      }

      if (!response.ok) {
        const detail =
          parsedBody && typeof parsedBody === 'object' && 'detail' in parsedBody
            ? String((parsedBody as { detail?: unknown }).detail)
            : `Request failed with status ${response.status}.`
        throw new Error(detail)
      }

      setGmproSubmitSuccess('GMPRO response JSON saved successfully.')
    } catch (error) {
      setGmproSubmitError(
        error instanceof Error ? error.message : 'Unable to send JSON to backend.',
      )
    } finally {
      setIsSubmittingGmproJson(false)
    }
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
          <section className="gmpro-input-panel">
            <p className="gmpro-input-title">GMPRO Response Input</p>
            <div className="gmpro-input-options">
              <label>
                <input
                  type="radio"
                  name="gmpro-input-mode"
                  value="gmpro_system"
                  checked={gmproInputMode === 'gmpro_system'}
                  onChange={() => {
                    setGmproInputMode('gmpro_system')
                    setGmproSubmitError(null)
                    setGmproSubmitSuccess(null)
                  }}
                />
                Input using GMPRO system
              </label>
              <label>
                <input
                  type="radio"
                  name="gmpro-input-mode"
                  value="manual_json"
                  checked={gmproInputMode === 'manual_json'}
                  onChange={() => {
                    setGmproInputMode('manual_json')
                    setGmproSubmitError(null)
                    setGmproSubmitSuccess(null)
                  }}
                />
                Input GMPRO response JSON manually
              </label>
            </div>

            {gmproInputMode === 'manual_json' ? (
              <div className="gmpro-input-manual">
                <textarea
                  value={gmproJsonInput}
                  onChange={(event) => setGmproJsonInput(event.target.value)}
                  placeholder='Paste GMPRO response JSON here, for example: {"routes": []}'
                  rows={7}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    void submitGmproJson()
                  }}
                  disabled={isSubmittingGmproJson}
                >
                  {isSubmittingGmproJson ? 'Sending JSON...' : 'Send GMPRO JSON'}
                </button>
              </div>
            ) : (
              <p className="gmpro-system-note">
                Use the GMPRO system to send data directly to the backend endpoint
                /GMPROResponse.
              </p>
            )}

            {gmproSubmitError ? <p className="gmpro-submit-error">{gmproSubmitError}</p> : null}
            {gmproSubmitSuccess ? <p className="gmpro-submit-success">{gmproSubmitSuccess}</p> : null}
          </section>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit" />
          <img src={heroImg} alt="Goodloading visual" />
        </div>
      </header>

      <main>
        <PlannerSection id="start-button" />
        {/* <VehicleSection/> */}
      </main>
    </div>
  )
}

export default Home
