import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLoadsContext } from './context/LoadsContext'
import { useLoadSpace } from './context/LoadSpace'
import './Optimize.css'

const API_HANDLE_BASE_URL =
  import.meta.env.VITE_API_HANDLE_URL ?? 'http://127.0.0.1:8001'
const API_HANDLE_RECOMMEND_ENDPOINT = `${API_HANDLE_BASE_URL.replace(/\/$/, '')}/recommend`

const toVolumeM3 = (lengthCm: number, widthCm: number, heightCm: number) =>
  (lengthCm * widthCm * heightCm) / 1_000_000

const formatNumber = (value: number, maximumFractionDigits = 2) =>
  value.toLocaleString(undefined, { maximumFractionDigits })

type OptimizationRequestPayload = {
  loads: Array<{
    id: number
    name: string
    length_cm: number
    width_cm: number
    height_cm: number
    weight_kg: number
    quantity: number
    stack: boolean
    max_stack_weight: number
    arrange_on_floor: boolean
  }>
  loadspaces: Array<{
    name: string
    length_cm: number
    width_cm: number
    height_cm: number
    max_weight_kg: number
    quantity: number
    selected_quantity: number
  }>
}

type OptimizeNavigationState = {
  fromUpload?: boolean
  uploadRequestId?: number
}

const formatApiResult = (value: unknown) => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const extractErrorMessage = (value: unknown, fallback: string) => {
  if (typeof value === 'string' && value.trim() !== '') return value

  if (value && typeof value === 'object' && 'detail' in value) {
    const detail = (value as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.trim() !== '') return detail
    if (detail !== undefined) return formatApiResult(detail)
  }

  return fallback
}

function Optimize() {
  const { loads } = useLoadsContext()
  const { selectedVehicles } = useLoadSpace()
  const location = useLocation()
  const navigationState = location.state as OptimizeNavigationState | null
  const isFromUploadButton = Boolean(navigationState?.fromUpload)
  const uploadRequestId = navigationState?.uploadRequestId ?? null
  const [isSendingToApi, setIsSendingToApi] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiResponse, setApiResponse] = useState<unknown>(null)

  const validLoads = useMemo(
    () => loads.filter((load) => load.name.trim() !== ''),
    [loads],
  )

  const loadSummary = useMemo(
    () => ({
      totalLoadUnits: validLoads.reduce((sum, load) => sum + load.quantity, 0),
      totalLoadWeightKg: validLoads.reduce(
        (sum, load) => sum + load.weight * load.quantity,
        0,
      ),
      totalLoadVolumeM3: validLoads.reduce(
        (sum, load) =>
          sum + toVolumeM3(load.length, load.width, load.height) * load.quantity,
        0,
      ),
    }),
    [validLoads],
  )

  const vehicleSummary = useMemo(
    () => ({
      totalVehicleUnits: selectedVehicles.reduce(
        (sum, vehicle) => sum + vehicle.selected_quantity,
        0,
      ),
      totalVehicleCapacityKg: selectedVehicles.reduce(
        (sum, vehicle) => sum + vehicle.max_weight_kg * vehicle.selected_quantity,
        0,
      ),
      totalVehicleVolumeM3: selectedVehicles.reduce(
        (sum, vehicle) =>
          sum +
          toVolumeM3(vehicle.length_cm, vehicle.width_cm, vehicle.height_cm) *
            vehicle.selected_quantity,
        0,
      ),
    }),
    [selectedVehicles],
  )

  const hasUploadData = validLoads.length > 0 && selectedVehicles.length > 0

  const optimizationPayload = useMemo<OptimizationRequestPayload>(
    () => ({
      loads: validLoads.map((load) => ({
        id: load.id,
        name: load.name.trim(),
        length_cm: load.length,
        width_cm: load.width,
        height_cm: load.height,
        weight_kg: load.weight,
        quantity: load.quantity,
        stack: load.stack,
        max_stack_weight: load.max_stack_weight,
        arrange_on_floor: load.arrange_on_floor,
      })),
      loadspaces: selectedVehicles.map((vehicle) => ({
        name: vehicle.name,
        length_cm: vehicle.length_cm,
        width_cm: vehicle.width_cm,
        height_cm: vehicle.height_cm,
        max_weight_kg: vehicle.max_weight_kg,
        quantity: vehicle.selected_quantity,
        selected_quantity: vehicle.selected_quantity,
      })),
    }),
    [validLoads, selectedVehicles],
  )

  const apiResponseText = useMemo(
    () => (apiResponse === null ? '' : formatApiResult(apiResponse)),
    [apiResponse],
  )

  const sendPayloadToApiHandle = useCallback(async () => {
    setApiError(null)
    setApiResponse(null)

    if (!hasUploadData) {
      setApiError('Add at least one valid load and one vehicle before upload.')
      return
    }

    setIsSendingToApi(true)

    try {
      const response = await fetch(API_HANDLE_RECOMMEND_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(optimizationPayload),
      })

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
        throw new Error(
          extractErrorMessage(
            parsedBody,
            `Request failed with status ${response.status}.`,
          ),
        )
      }

      setApiResponse(parsedBody ?? { message: 'Request succeeded with empty body.' })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to connect to backend.'
      setApiError(message)
    } finally {
      setIsSendingToApi(false)
    }
  }, [hasUploadData, isFromUploadButton, optimizationPayload])

  useEffect(() => {
    if (!isFromUploadButton || uploadRequestId === null) return

    const requestKey = `optimize-upload-${uploadRequestId}`
    const alreadyTriggered = sessionStorage.getItem(requestKey)
    if (alreadyTriggered === 'sent') return

    sessionStorage.setItem(requestKey, 'sent')
    void sendPayloadToApiHandle()
  }, [isFromUploadButton, sendPayloadToApiHandle, uploadRequestId])

  return (
    <div className="page">
      <header className="hero optimize-hero">
        <div className="hero-copy">
          <p className="eyebrow">Uploaded Data</p>
          <h1>Loads And Vehicle Load Space</h1>
          <p className="hero-text">
            Review everything you uploaded before running optimization.
          </p>
          {!hasUploadData && (
            <p className="optimize-empty-note">
              No uploaded data found. Add load and vehicle details from the
              planner, then click Upload.
            </p>
          )}
          <Link to="/" className="btn btn-primary optimize-back-btn">
            Back To Planner
          </Link>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit" />
        </div>
      </header>

      <main className="optimize-main">
        <section className="optimize-summary-grid">
          <article className="optimize-stat-card">
            <p className="optimize-stat-value">{loadSummary.totalLoadUnits}</p>
            <p className="optimize-stat-label">Total Load Units</p>
          </article>
          <article className="optimize-stat-card">
            <p className="optimize-stat-value">
              {formatNumber(loadSummary.totalLoadWeightKg)} kg
            </p>
            <p className="optimize-stat-label">Total Load Weight</p>
          </article>
          <article className="optimize-stat-card">
            <p className="optimize-stat-value">
              {formatNumber(loadSummary.totalLoadVolumeM3, 3)} m3
            </p>
            <p className="optimize-stat-label">Total Load Volume</p>
          </article>
          <article className="optimize-stat-card">
            <p className="optimize-stat-value">{vehicleSummary.totalVehicleUnits}</p>
            <p className="optimize-stat-label">Selected Vehicle Units</p>
          </article>
          <article className="optimize-stat-card">
            <p className="optimize-stat-value">
              {formatNumber(vehicleSummary.totalVehicleCapacityKg)} kg
            </p>
            <p className="optimize-stat-label">Vehicle Weight Capacity</p>
          </article>
          <article className="optimize-stat-card">
            <p className="optimize-stat-value">
              {formatNumber(vehicleSummary.totalVehicleVolumeM3, 3)} m3
            </p>
            <p className="optimize-stat-label">Vehicle Space Capacity</p>
          </article>
        </section>

     

        <section className="optimize-panel">
          <div className="optimize-panel-head">
            <h2>Loads List</h2>
            <p>{validLoads.length} rows</p>
          </div>
          <div className="table-wrap">
            <table className="loads-table">
              <thead>
                <tr>
                  <th>Load Name</th>
                  <th>Length (cm)</th>
                  <th>Width (cm)</th>
                  <th>Height (cm)</th>
                  <th>Weight (kg)</th>
                  <th>Qty</th>
                  <th>Stack</th>
                  <th>Max Stack Weight (kg)</th>
                  <th>Arrange On Floor</th>
                </tr>
              </thead>
              <tbody>
                {validLoads.length > 0 ? (
                  validLoads.map((load) => (
                    <tr key={load.id}>
                      <td>{load.name}</td>
                      <td>{formatNumber(load.length)}</td>
                      <td>{formatNumber(load.width)}</td>
                      <td>{formatNumber(load.height)}</td>
                      <td>{formatNumber(load.weight)}</td>
                      <td>{formatNumber(load.quantity, 0)}</td>
                      <td>{load.stack ? 'Yes' : 'No'}</td>
                      <td>{load.stack ? formatNumber(load.max_stack_weight) : '-'}</td>
                      <td>{load.stack ? (load.arrange_on_floor ? 'Yes' : 'No') : '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="optimize-empty-row">
                      No loads uploaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="optimize-panel">
          <div className="optimize-panel-head">
            <h2>Vehicle Load Space</h2>
            <p>{selectedVehicles.length} rows</p>
          </div>
          <div className="table-wrap">
            <table className="loads-table">
              <thead>
                <tr>
                  <th>Vehicle Name</th>
                  <th>Length (cm)</th>
                  <th>Width (cm)</th>
                  <th>Height (cm)</th>
                  <th>Max Weight (kg)</th>
                  <th>Qty</th>
                  <th>Volume/Vehicle (m3)</th>
                </tr>
              </thead>
              <tbody>
                {selectedVehicles.length > 0 ? (
                  selectedVehicles.map((vehicle, index) => (
                    <tr key={`${vehicle.name}-${index}`}>
                      <td>{vehicle.name}</td>
                      <td>{formatNumber(vehicle.length_cm)}</td>
                      <td>{formatNumber(vehicle.width_cm)}</td>
                      <td>{formatNumber(vehicle.height_cm)}</td>
                      <td>{formatNumber(vehicle.max_weight_kg)}</td>
                      <td>{formatNumber(vehicle.selected_quantity, 0)}</td>
                      <td>
                        {formatNumber(
                          toVolumeM3(
                            vehicle.length_cm,
                            vehicle.width_cm,
                            vehicle.height_cm,
                          ),
                          3,
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="optimize-empty-row">
                      No vehicles uploaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
           <section className="optimize-panel optimize-response-panel">
          <div className="optimize-panel-head">
            <h2>Optimization API Response</h2>
            <button
              type="button"
              className="btn btn-primary optimize-send-btn"
              onClick={() => {
                void sendPayloadToApiHandle()
              }}
              disabled={isSendingToApi || !hasUploadData || !isFromUploadButton}
            >
              {isSendingToApi ? 'Sending...' : 'Resend Payload'}
            </button>
          </div>
          <p className="optimize-response-note">
            Endpoint: <code>/recommend</code> on <code>api_handle</code>
          </p>
          {!isFromUploadButton ? (
            <p className="optimize-api-block-note">
              Open this page through Home Upload button to trigger payload send.
            </p>
          ) : null}
          {apiError ? <p className="optimize-api-error">{apiError}</p> : null}
          {!apiError && apiResponse === null ? (
            <p className="optimize-response-placeholder">
              {isFromUploadButton
                ? 'Waiting for backend response...'
                : 'No backend call triggered yet.'}
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

export default Optimize
