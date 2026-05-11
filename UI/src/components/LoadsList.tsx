import type { LoadItem } from './loadingTypes'
import './LoadsList.css'

interface LoadsListProps {
  loads: LoadItem[]
  title?: string
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
]

export function LoadsList({ loads, title = 'Loaded Items' }: LoadsListProps) {
  if (loads.length === 0) {
    return (
      <div className="loads-list">
        <h3>{title}</h3>
        <p className="loads-list-empty">No loads to display</p>
      </div>
    )
  }

  return (
    <div className="loads-list">
      <h3>{title}</h3>
      <div className="loads-list-stack">
        {loads.map((load, index) => (
          <div key={`load-${load.id}-${index}`} className="loads-list-card">
            <div className="loads-list-head">
              <div className="loads-list-name">
                <span
                  className="loads-list-dot"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                {load.name}
              </div>
              <span className="loads-list-id">ID: {load.id}</span>
            </div>

            <div className="loads-list-meta">
              <div>
                Size: {load.length} × {load.width} × {load.height} cm
              </div>
              <div>Weight: {load.weight} kg</div>
              <div>Qty: {load.quantity}</div>
              <div>
                Placed: {load.placement.length}
              </div>
            </div>

            {load.placement.length > 0 && (
              <div className="loads-list-positions">
                <p>Positions:</p>
                <div className="loads-list-position-chips">
                  {load.placement.slice(0, 3).map((p, placementIdx) => (
                    <span key={`pos-${load.id}-${index}-${placementIdx}`} className="loads-list-position-chip">
                      ({p.position.x}, {p.position.y}, {p.position.z})
                    </span>
                  ))}
                  {load.placement.length > 3 && (
                    <span className="loads-list-position-chip">
                      +{load.placement.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="loads-list-badges">
              {load.allowToRotate && (
                <span className="loads-list-badge loads-list-badge-rotate">
                  Rotatable
                </span>
              )}
              {load.stacking && (
                <span className="loads-list-badge loads-list-badge-stack">
                  Stackable
                </span>
              )}
              {load.priority > 0 && (
                <span className="loads-list-badge loads-list-badge-priority">
                  Priority: {load.priority}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
