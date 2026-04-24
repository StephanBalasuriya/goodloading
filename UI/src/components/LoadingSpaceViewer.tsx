import { LoadingSpaceViewer2D } from './LoadingSpaceViewer2D'
import type { LoadingSpace } from './loadingTypes'
import './LoadingSpaceViewer.css'

interface LoadingSpaceViewerProps {
  loadingSpace: LoadingSpace
  selectedStopId?: number
}

export function LoadingSpaceViewer({ loadingSpace, selectedStopId }: LoadingSpaceViewerProps) {
  return (
    <div className="loading-space-viewer">
      <h3 className="loading-space-viewer-title">Loading Space Preview</h3>
      <LoadingSpaceViewer2D loadingSpace={loadingSpace} selectedStopId={selectedStopId} />
      <p className="loading-space-viewer-note">
        2D layout view based on placement coordinates (x, y, z).
      </p>
    </div>
  )
}
