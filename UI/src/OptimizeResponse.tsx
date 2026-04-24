import { Link, useLocation } from 'react-router-dom'
import './Optimize.css'

type OptimizeResponseLocationState = {
  apiError?: string | null
  apiResponse?: unknown
}

const formatApiResult = (value: unknown) => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function OptimizeResponse() {
  const location = useLocation()
  const locationState = (location.state ?? null) as OptimizeResponseLocationState | null

  const apiError = typeof locationState?.apiError === 'string' ? locationState.apiError : null
  const apiResponse = locationState?.apiResponse ?? null
  const apiResponseText = apiResponse === null ? '' : formatApiResult(apiResponse)

  return (
    <div className="page">
      <header className="hero optimize-hero">
        <div className="hero-copy">
          <p className="eyebrow">Optimization Result</p>
          <h1>Optimize Response</h1>
          <p className="hero-text">
            View the backend response generated after Upload and Optimize.
          </p>
          <Link to="/optimize" className="btn btn-primary optimize-back-btn">
            Back To Optimize
          </Link>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit" />
        </div>
      </header>

      <main className="optimize-main">
        <section className="optimize-panel optimize-response-panel">
          <div className="optimize-panel-head">
            <h2>Optimized Response</h2>
          </div>

          {apiError ? <p className="optimize-api-error">{apiError}</p> : null}
          {!apiError && apiResponse === null ? (
            <p className="optimize-response-placeholder">
              Click "Upload & Optimize" on the Optimize page to see the response here.
            </p>
          ) : null}
          {apiResponse !== null ? (
            <pre className="optimize-response-json">{apiResponseText}</pre>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default OptimizeResponse
