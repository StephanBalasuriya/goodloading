import type { Summary } from './loadingTypes'
import './StatisticsPanel.css'

interface StatisticsPanelProps {
  summary: Summary
  spaceName: string
  spaceType: string
  dimensions: {
    length: number
    width: number
    height: number
    limit: number
  }
}

export function StatisticsPanel({ summary, spaceName, spaceType, dimensions }: StatisticsPanelProps) {
  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return 'N/A'
    if (num > 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num > 1000) return (num / 1000).toFixed(2) + 'K'
    return num.toFixed(2)
  }

  const calculatePercentage = (occupied: number | undefined, free: number | undefined) => {
    if (occupied === undefined || free === undefined) return '0'
    const total = occupied + free
    return total > 0 ? ((occupied / total) * 100).toFixed(1) : '0'
  }

  const volumePercent = calculatePercentage(summary.occupiedVolume, summary.freeVolume)
  const surfacePercent = calculatePercentage(summary.occupiedSurface, summary.freeSurface)

  return (
    <div className="statistics-panel">
      <div className="statistics-panel-head">
        <h2>{spaceName}</h2>
        <p>Type: {spaceType}</p>
        <p>
          Dimensions: {dimensions.length} × {dimensions.width} × {dimensions.height} cm
        </p>
        <p>Max Load: {formatNumber(dimensions.limit)} kg</p>
      </div>

      <div className="statistics-panel-grid">
        <div className="statistics-panel-card statistics-panel-card-volume">
          <h4>Volume</h4>
          <strong>{volumePercent}%</strong>
          <p>
            Occupied: {formatNumber(summary.occupiedVolume)} cm³
          </p>
          <p>
            Free: {formatNumber(summary.freeVolume)} cm³
          </p>
        </div>

        <div className="statistics-panel-card statistics-panel-card-surface">
          <h4>Surface</h4>
          <strong>{surfacePercent}%</strong>
          <p>
            Occupied: {formatNumber(summary.occupiedSurface)} cm²
          </p>
          <p>
            Free: {formatNumber(summary.freeSurface)} cm²
          </p>
        </div>

        <div className="statistics-panel-card statistics-panel-card-ldm">
          <h4>Loading Meter</h4>
          <p>
            Occupied: {formatNumber(summary.occupiedLdm)} cm
          </p>
          <p>
            Free: {formatNumber(summary.freeLdm)} cm
          </p>
        </div>

        <div className="statistics-panel-card statistics-panel-card-efficiency">
          <h4>Efficiency</h4>
          {summary.percentVolumeUsd !== undefined && (
            <p>
              Volume: {summary.percentVolumeUsd.toFixed(1)}%
            </p>
          )}
          {summary.percentLdmUsd !== undefined && (
            <p>
              LDM: {summary.percentLdmUsd.toFixed(1)}%
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
