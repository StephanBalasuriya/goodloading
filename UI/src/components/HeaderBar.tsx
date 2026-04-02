import heroImg from '../assets/hero.png'
import './HeaderBar.css'

function HeaderBar() {
  return (
    <header className="header-bar">
      <div className="header-brand">
        <img src={heroImg} alt="Goodloading logo" className="header-logo" />
        <div className="header-text">
          <h1>Goodloading</h1>
          <p>Smart load planning workspace</p>
        </div>
      </div>
    </header>
  )
}

export default HeaderBar
