import heroImg from './assets/hero.png'
import PlannerSection from './components/PlannerSection'
import './App.css'


function App() {

  const scrollToPlanner = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const plannerSection = document.getElementById('start-button')
    if (!plannerSection) return

    const top = plannerSection.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top, behavior: 'smooth' })
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
          <div className="hero-actions" id='start-button'>
            <button type="button" className="btn btn-primary" onClick={scrollToPlanner}>
              Start Planning
            </button>
            {/* <a className="btn btn-ghost" href="#workflow">
              View Workflow
            </a> */}
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit" />
          <img src={heroImg} alt="Goodloading visual" />
        </div>
      </header>

      <main>
        <PlannerSection />

      </main>
    </div>
  )
}

export default App
