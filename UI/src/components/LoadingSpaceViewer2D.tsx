import { useMemo, useState } from 'react'
import type { LoadPlacement, LoadingSpace } from './loadingTypes'
import './LoadingSpaceViewer2D.css'

interface LoadingSpaceViewer2DProps {
  loadingSpace: LoadingSpace
  selectedStopId?: number
}

const COLORS = [
  '#FF6B6B', '#d4a849', '#c4ce37', '#FFA07A', '#98D8C8',
  '#986ff7', '#ce8fce', '#2c8383', '#9ef1a9', '#093950'
]

type ViewType = 'top' | 'side' | 'front'

export function LoadingSpaceViewer2D({ loadingSpace, selectedStopId }: LoadingSpaceViewer2DProps) {
  const [view, setView] = useState<ViewType>('top')
  const [zoom, setZoom] = useState(1)

  const part = loadingSpace.parts[0]
  if (!part) {
    return <div className="lsv2d-root">No loading space part available.</div>
  }

  const loadsToRender =
    selectedStopId !== undefined
      ? part.stops?.find((s) => s.id === selectedStopId)?.loads ?? []
      : part.stops
        ? part.stops.flatMap((s) => s.loads)
        : part.loads ?? []

  const scale = 0.5
  const containerWidth = part.width * scale
  const containerLength = part.length * scale
  const containerHeight = part.height * scale

  const getViewDimensions = () => {
    switch (view) {
      case 'top':
        return { width: containerWidth, height: containerLength }
      case 'side':
        return { width: containerLength, height: containerHeight }
      case 'front':
        return { width: containerWidth, height: containerHeight }
    }
  }

  const getBoxPosition = (placement: LoadPlacement) => {
    const { x, y, z } = placement.position
    const { width, length, height } = placement

    switch (view) {
      case 'top':
        return {
          left: x * scale,
          top: z * scale,
          width: width * scale,
          height: length * scale,
        }
      case 'side':
        return {
          left: z * scale,
          top: containerHeight - (y + height) * scale,
          width: length * scale,
          height: height * scale,
        }
      case 'front':
        return {
          left: x * scale,
          top: containerHeight - (y + height) * scale,
          width: width * scale,
          height: height * scale,
        }
    }
  }

  const totalBoxes = useMemo(
    () => loadsToRender.reduce((sum, load) => sum + load.placement.length, 0),
    [loadsToRender],
  )

  const viewDimensions = getViewDimensions()
  const coordinateChart = useMemo(() => {
    switch (view) {
      case 'top':
        return { yAxisLabel: 'Z (Length)', xAxisLabel: 'X (Width)', yAxisKey: 'Z', xAxisKey: 'X' }
      case 'side':
        return { xAxisLabel: 'Z (Length)', yAxisLabel: 'Y (Height)', xAxisKey: 'Z', yAxisKey: 'Y' }
      case 'front':
        return { xAxisLabel: 'X (Width)', yAxisLabel: 'Y (Height)', xAxisKey: 'X', yAxisKey: 'Y' }
    }
  }, [view])

  return (
    <div className="lsv2d-root">
      <div className="lsv2d-toolbar">
        <div className="lsv2d-view-group">
          <button
            onClick={() => setView('top')}
            className={`lsv2d-btn ${
              view === 'top' ? 'lsv2d-btn-active' : ''
            }`}
          >
            Top View
          </button>
          <button
            onClick={() => setView('side')}
            className={`lsv2d-btn ${
              view === 'side' ? 'lsv2d-btn-active' : ''
            }`}
          >
            Side View
          </button>
          <button
            onClick={() => setView('front')}
            className={`lsv2d-btn ${
              view === 'front' ? 'lsv2d-btn-active' : ''
            }`}
          >
            Front View
          </button>
        </div>

        <div className="lsv2d-zoom-group">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="lsv2d-btn"
            title="Zoom Out"
          >
            -
          </button>
          <span className="lsv2d-zoom-value">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="lsv2d-btn"
            title="Zoom In"
          >
            +
          </button>
        </div>
      </div>

      <div className="lsv2d-canvas-shell">
        <div className="lsv2d-canvas-wrap">
          <div className="lsv2d-center">
            <div
              className="lsv2d-container"
              style={{
                width: `${viewDimensions.width * zoom+4}px`,
                height: `${viewDimensions.height * zoom+4}px`,
              }}
            >
              {loadsToRender.map((load, loadIndex) =>
                load.placement.map((placement, placementIndex) => {
                  const boxStyle = getBoxPosition(placement)
                  return (
                    <div
                      key={`${load.id}-${placementIndex}`}
                      className="lsv2d-box"
                      style={{
                        left: `${boxStyle.left * zoom}px`,
                        top: `${boxStyle.top * zoom}px`,
                        width: `${boxStyle.width * zoom}px`,
                        height: `${boxStyle.height * zoom}px`,
                        backgroundColor: COLORS[loadIndex % COLORS.length],
                        opacity: 0.8,
                      }}
                      title={`${load.name} - ${placement.width}×${placement.length}×${placement.height} cm`}
                    >
                      <span className="lsv2d-box-label">
                        {load.name}
                      </span>
                    </div>
                  )
                })
              )}

              <div className="lsv2d-dimensions">
                {view === 'top' && `${part.width} × ${part.length} cm`}
                {view === 'side' && `${part.length} × ${part.height} cm`}
                {view === 'front' && `${part.width} × ${part.height} cm`}
              </div>
            </div>
          </div>
        </div>

        <div className="lsv2d-coordinate-chart" aria-hidden="true">
          <svg
            className="lsv2d-coordinate-svg"
            viewBox="0 0 170 95"
            role="presentation"
          >
            <line x1="34" y1="75" x2="34" y2="20" className="lsv2d-coordinate-axis" />
            <line x1="34" y1="75" x2="89" y2="75" className="lsv2d-coordinate-axis" />

            <circle cx="34" cy="20" r="10" className="lsv2d-coordinate-node" />
            <circle cx="89" cy="75" r="10" className="lsv2d-coordinate-node" />

            <text x="34" y="24" textAnchor="middle" className="lsv2d-coordinate-node-text">
              {coordinateChart.yAxisKey}
            </text>
            <text x="89" y="79" textAnchor="middle" className="lsv2d-coordinate-node-text">
              {coordinateChart.xAxisKey}
            </text>

            <text x="16" y="4" className="lsv2d-coordinate-text">
              {coordinateChart.yAxisLabel}
            </text>
            <text x="110" y="77" className="lsv2d-coordinate-text">
              {coordinateChart.xAxisLabel}
            </text>
          </svg>
        </div>
      </div>

      <div className="lsv2d-footer">
        <span>
          View: <strong>{view}</strong>
        </span>
          <span>•</span>
          <span>
            Loads: <strong>{loadsToRender.length}</strong>
          </span>
          <span>•</span>
        <span>
          Total Boxes: <strong>{totalBoxes}</strong>
        </span>
      </div>
    </div>
  )
}
