import { useState } from 'react'
import type { LoadItem } from './loadingTypes'
import { getLoadColor } from './loadColors'
import './LoadsList.css'

interface LoadsListProps {
  loads: LoadItem[]
  title?: string
}

const LOAD_TYPE_BARREL = 1
const LOAD_TYPE_PIPE = 2

const toPositiveNumber = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0

const getLoadSizeText = (load: LoadItem) => {
  const diameter = toPositiveNumber(load.diameter)

  if (load.loadType === LOAD_TYPE_PIPE) {
    const size = (Math.PI * diameter * diameter * load.length) / 4
    return `Size: π × ${load.diameter}² / 4 × ${load.length}  cm³`
  }

  if (load.loadType === LOAD_TYPE_BARREL) {
    const size = (Math.PI * diameter * diameter * load.height) / 4
    return `Size: π × ${load.diameter}² / 4 × ${load.height} cm³`
  }

  return `Size: ${load.length} × ${load.width} × ${load.height} cm³`
}

// const COLORS = [
//   '#FF6B6B', '#d4a849', '#c4ce37', '#FFA07A', '#98D8C8',
//   '#986ff7', '#ce8fce', '#2c8383', '#9ef1a9', '#093950'
// ]

export function LoadsList({ loads, title = 'Loaded Items' }: LoadsListProps) {
  const [expandedLoads, setExpandedLoads] = useState<Set<number>>(new Set())

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
        {loads.map((load, index) => {
          const isExpanded = expandedLoads.has(load.id)
          const visiblePlacements = isExpanded ? load.placement : load.placement.slice(0, 3)

          return (
          <div key={`load-${load.id}-${index}`} className="loads-list-card">
            <div className="loads-list-head">
              <div className="loads-list-name">
                <span
                  className="loads-list-dot"
                  style={{ backgroundColor: getLoadColor(load.id) }}
                />
                {load.name}
              </div>
              <span className="loads-list-id">ID: {load.id}</span>
            </div>

            <div className="loads-list-meta">
              <div>{getLoadSizeText(load)}</div>
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
                  {visiblePlacements.map((p, placementIdx) => (
                    <span key={`pos-${load.id}-${index}-${placementIdx}`} className="loads-list-position-chip">
                      ({p.position.x}, {p.position.y}, {p.position.z})
                    </span>
                  ))}
                  {load.placement.length > 3 && !isExpanded && (
                    <span
                      className="loads-list-position-chip"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setExpandedLoads((previous) => {
                          const next = new Set(previous)
                          next.add(load.id)
                          return next
                        })
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setExpandedLoads((previous) => {
                            const next = new Set(previous)
                            next.add(load.id)
                            return next
                          })
                        }
                      }}
                    >
                      +{load.placement.length - 3} more
                    </span>
                  )}
                  {load.placement.length > 3 && isExpanded && (
                    <span
                      className="loads-list-position-chip"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setExpandedLoads((previous) => {
                          const next = new Set(previous)
                          next.delete(load.id)
                          return next
                        })
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setExpandedLoads((previous) => {
                            const next = new Set(previous)
                            next.delete(load.id)
                            return next
                          })
                        }
                      }}
                    >
                      Show less
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
          )
        })}
      </div>
    </div>
  )
}
