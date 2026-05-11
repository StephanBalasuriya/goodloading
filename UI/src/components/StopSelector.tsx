import type { Stop } from './loadingTypes'
import './StopSelector.css'

interface StopSelectorProps {
  stops: Stop[]
  selectedStopId: number | undefined
  onSelectStop: (stopId: number | undefined) => void
}

export function StopSelector({ stops, selectedStopId, onSelectStop }: StopSelectorProps) {
  if (!stops || stops.length === 0) {
    return null
  }

  return (
    <div className="stop-selector">
      <h3>Route Stops</h3>
      <div className="stop-selector-buttons">
        <button
          onClick={() => onSelectStop(undefined)}
          className={`stop-selector-btn ${
            selectedStopId === undefined ? 'stop-selector-btn-active' : ''
          }`}
        >
          All Stops
        </button>
        {stops.map((stop) => (
          <button
            key={stop.id}
            onClick={() => onSelectStop(stop.id)}
            className={`stop-selector-btn ${
              selectedStopId === stop.id ? 'stop-selector-btn-active' : ''
            }`}
          >
            Stop {stop.name}
            <span className="stop-selector-count">
              {stop.loads.length}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
