import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLoadsContext } from './context/LoadsContext'
import { apiHandleUrl } from './config/api'
import './Optimize.css'

const API_HANDLE_GMPRO_RESPONSE_ENDPOINT = apiHandleUrl('/GMPROResponse')
const API_HANDLE_USED_VEHICLES_ENDPOINT = apiHandleUrl('/vehicles/used')
const API_HANDLE_CALCULATE_ENDPOINT = apiHandleUrl('/calculate')

const toVolumeM3 = (lengthCm: number, widthCm: number, heightCm: number) =>
  (lengthCm * widthCm * heightCm) / 1_000_000

const formatNumber = (value: number, maximumFractionDigits = 2) =>
  value.toLocaleString(undefined, { maximumFractionDigits })

type GmproUsedVehicle = {
  gmpro_vehicle_label: string
  gmpro_vehicle_type: string
  type_id: number
  type_name: string
  count: number
  is_active: boolean
  length_cm: number
  width_cm: number
  height_cm: number
  max_weight_kg: number
  max_cbm: number
}

type GmproVisit = {
  shipmentLabel?: string
  isPickup?: boolean
  loadDemands?: {
    weight?: {
      amount?: string
    }
    stop_count?: {
      amount?: string
    }
  }
}

type GmproRoute = {
  vehicleLabel?: string
  visits?: GmproVisit[]
}

type GmproPayload = {
  routes?: GmproRoute[]
}

type RouteStep = {
  order: number
  shipmentLabel: string
  action: 'Pickup' | 'Delivery'
  matchedLoadName: string | null
}

type RouteChart = {
  vehicleLabel: string
  steps: RouteStep[]
}

type StopRef = {
  id: number
  name: string
}

type ShipmentStopMap = {
  origin?: StopRef
  destination?: StopRef
}

const normalizeText = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const parseAmount = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const resolveVisitAction = (visit: GmproVisit): 'Pickup' | 'Delivery' => {
  if (typeof visit.isPickup === 'boolean') {
    return visit.isPickup ? 'Pickup' : 'Delivery'
  }

  const weightAmount = parseAmount(visit.loadDemands?.weight?.amount)
  const stopCountAmount = parseAmount(visit.loadDemands?.stop_count?.amount)
  if (weightAmount < 0 || stopCountAmount < 0) return 'Delivery'
  return 'Pickup'
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const buildGoodloadingPayload = (
  validLoads: ReturnType<typeof useLoadsContext>['loads'],
  usedVehicles: GmproUsedVehicle[],
  gmproPayload: GmproPayload | null,
) => {
  const routes = Array.isArray(gmproPayload?.routes) ? gmproPayload.routes : []
  const detailedRoutes = routes.filter(
    (route): route is GmproRoute =>
      typeof route.vehicleLabel === 'string' &&
      route.vehicleLabel.trim() !== '' &&
      Array.isArray(route.visits) &&
      route.visits.length > 0,
  )

  const specsByLabel = new Map(usedVehicles.map((vehicle) => [vehicle.gmpro_vehicle_label, vehicle]))

  const shipmentStops = new Map<string, ShipmentStopMap>()

  const loadingSpaces = detailedRoutes
    .map((route, routeIndex) => {
      const label = route.vehicleLabel!
      const visits = route.visits ?? []
      const vehicleSpec = specsByLabel.get(label)

      if (!vehicleSpec) {
        return null
      }

      let stopId = 1
      const stops = visits
        .map((visit) => {
          const shipmentLabel = typeof visit.shipmentLabel === 'string' ? visit.shipmentLabel.trim() : ''
          if (!shipmentLabel) return null

          const action = resolveVisitAction(visit)
          const stop: StopRef = {
            id: stopId,
            name: `${action} ${shipmentLabel}`,
          }
          stopId += 1

          const shipmentKey = normalizeText(shipmentLabel)
          const previous = shipmentStops.get(shipmentKey) ?? {}
          if (action === 'Pickup' && !previous.origin) {
            previous.origin = stop
          }
          if (action === 'Delivery' && !previous.destination) {
            previous.destination = stop
          }
          shipmentStops.set(shipmentKey, previous)

          return {
            id: stop.id,
            name: stop.name,
          }
        })
        .filter((stop): stop is { id: number; name: string } => stop !== null)

      return {
        quantity: 1,
        name: label,
        type: 'vehicle',
        parts: [
          {
            length: vehicleSpec.length_cm,
            width: vehicleSpec.width_cm,
            height: vehicleSpec.height_cm,
            limit: vehicleSpec.max_weight_kg,
          },
        ],
        ...(stops.length > 0 ? { stops } : {}),
        _routeOrder: routeIndex,
      }
    })
    .filter((space): space is NonNullable<typeof space> => space !== null)
    .sort((a, b) => a._routeOrder - b._routeOrder)
    .map(({ _routeOrder, ...space }) => space)

  const loadsPayload = validLoads.map((load, index) => {
    const mappedLoad: Record<string, unknown> = {
      id: load.id || index + 1,
      quantity: Math.max(1, Math.floor(load.quantity || 1)),
      name: load.name.trim(),
      length: Math.max(0, load.length),
      width: Math.max(0, load.width),
      height: Math.max(0, load.height),
      weight: Math.max(0, load.weight),
      priority: 0,
      stacking: load.stack,
      allowToRotate: true,
    }

    if (load.stack) {
      mappedLoad.alongFloor = load.arrange_on_floor
      if (load.max_stack_weight > 0) {
        mappedLoad.maxWeightOnTop = load.max_stack_weight
      }
    }

    const shipmentKey = normalizeText(load.name)
    const stops = shipmentStops.get(shipmentKey)
    if (stops?.origin) {
      mappedLoad.origin = {
        id: stops.origin.id,
        name: stops.origin.name,
      }
    }
    if (stops?.destination) {
      mappedLoad.destination = {
        id: stops.destination.id,
        name: stops.destination.name,
      }
    }

    return mappedLoad
  })

  const hasMultiStops = loadsPayload.some(
    (load) => isObject(load.origin) && isObject(load.destination),
  )

  return {
    name: 'Generated from GMPRO Response',
    note: 'Auto-generated from GMPRO routes and planner loads',
    loads: loadsPayload,
    loadingSpaces,
    options: {
      allowOverweight: false,
      unit: 'cm',
      keepLoadsTogether: false,
      newAlgorithm: true,
      loadingOrder: 'default',
      multiStops: hasMultiStops,
      arrangeOptimally: false,
    },
  }
}

const formatApiResult = (value: unknown) => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function Optimize() {
  const { loads } = useLoadsContext()
  const [isSendingToApi, setIsSendingToApi] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiResponse, setApiResponse] = useState<unknown>(null)
  const [hasGmproResponse, setHasGmproResponse] = useState<boolean | null>(null)
  const [gmproStatusError, setGmproStatusError] = useState<string | null>(null)
  const [usedVehicles, setUsedVehicles] = useState<GmproUsedVehicle[]>([])
  const [isLoadingUsedVehicles, setIsLoadingUsedVehicles] = useState(false)
  const [usedVehiclesError, setUsedVehiclesError] = useState<string | null>(null)
  const [gmproPayload, setGmproPayload] = useState<GmproPayload | null>(null)

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
      totalVehicleUnits: usedVehicles.length,
      totalVehicleCapacityKg: usedVehicles.reduce(
        (sum, vehicle) => sum + vehicle.max_weight_kg ,
        0,
      ),
      totalVehicleVolumeM3: usedVehicles.reduce(
        (sum, vehicle) => sum + vehicle.max_cbm ,
        0,
      ),
    }),
    [usedVehicles],
  )

  const hasUploadData = validLoads.length > 0 
  

  const apiResponseText = useMemo(
    () => (apiResponse === null ? '' : formatApiResult(apiResponse)),
    [apiResponse],
  )

  const routeCharts = useMemo<RouteChart[]>(() => {
    if (!gmproPayload?.routes || !Array.isArray(gmproPayload.routes)) return []

    const loadNameSet = new Set(validLoads.map((load) => normalizeText(load.name)))

    return gmproPayload.routes
      .filter(
        (route): route is GmproRoute =>
          typeof route.vehicleLabel === 'string' &&
          route.vehicleLabel.trim() !== '' &&
          Array.isArray(route.visits) &&
          route.visits.length > 0,
      )
      .map((route) => {
        const steps = (route.visits ?? [])  
          .map((visit, index) => {
            const shipmentLabel = typeof visit.shipmentLabel === 'string' ? visit.shipmentLabel.trim() : ''
            if (!shipmentLabel) return null

            const action = resolveVisitAction(visit)
            const matched = loadNameSet.has(normalizeText(shipmentLabel))

            return {
              order: index + 1,
              shipmentLabel,
              action,
              matchedLoadName: matched ? shipmentLabel : null,
            }
          })
          .filter((step): step is RouteStep => step !== null)

        return {
          vehicleLabel: route.vehicleLabel!,
          steps,
        }
      })
      .filter((chart) => chart.steps.length > 0)
  }, [gmproPayload, validLoads])

  const generatedGoodloadingPayload = useMemo(
    () => buildGoodloadingPayload(validLoads, usedVehicles, gmproPayload),
    [validLoads, usedVehicles, gmproPayload],
  )

  const generatedGoodloadingPayloadText = useMemo(
    () => formatApiResult(generatedGoodloadingPayload),
    [generatedGoodloadingPayload],
  )

  const fetchUsedVehicles = useCallback(async () => {
    setIsLoadingUsedVehicles(true)
    setUsedVehiclesError(null)

    try {
      const response = await fetch(API_HANDLE_USED_VEHICLES_ENDPOINT)
      if (!response.ok) {
        throw new Error(`Failed to load vehicle load space (${response.status}).`)
      }

      const data = (await response.json()) as GmproUsedVehicle[]
      setUsedVehicles(Array.isArray(data) ? data : [])
    } catch (error) {
      setUsedVehicles([])
      setUsedVehiclesError(
        error instanceof Error
          ? error.message
          : 'Unable to load vehicle load space from backend.',
      )
    } finally {
      setIsLoadingUsedVehicles(false)
    }
  }, [])

  const checkGmproResponseAvailability = useCallback(async () => {
    setGmproStatusError(null)

    try {
      const response = await fetch(API_HANDLE_GMPRO_RESPONSE_ENDPOINT)
      if (!response.ok) {
        setHasGmproResponse(null)
        setGmproStatusError(`Unable to verify GMPRO response (status ${response.status}).`)
        return false
      }
      console.log('GMPRO response availability check response :', response)
      const responseData = (await response.json()) as {
        available?: boolean
        data?: unknown
      }

      const isAvailable = responseData.available === true
      setHasGmproResponse(isAvailable)
      setGmproPayload(isObject(responseData.data) ? (responseData.data as GmproPayload) : null)
      return isAvailable
    } catch {
      setHasGmproResponse(null)
      setGmproStatusError('Unable to connect to backend while checking GMPRO response.')
      setGmproPayload(null)
      return false
    }
  }, [])

  const sendPayloadToApiHandle = useCallback(async () => {
    setIsSendingToApi(true)
    setApiError(null)
    setApiResponse(null)

    try {
      const response = await fetch(API_HANDLE_CALCULATE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generatedGoodloadingPayload),
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
        const detail =
          parsedBody && isObject(parsedBody) && 'detail' in parsedBody
            ? String((parsedBody as { detail?: unknown }).detail)
            : `Request failed with status ${response.status}.`
        throw new Error(detail)
      }

      setApiResponse(parsedBody)
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to send payload to backend.')
    } finally {
      setIsSendingToApi(false)
    }
  }, [generatedGoodloadingPayload])


  useEffect(() => {
    void checkGmproResponseAvailability()
  }, [checkGmproResponseAvailability])

  useEffect(() => {
    if (hasGmproResponse !== true) {
      setUsedVehicles([])
      setUsedVehiclesError(null)
      setIsLoadingUsedVehicles(false)
      return
    }

    void fetchUsedVehicles()
  }, [fetchUsedVehicles, hasGmproResponse])



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
            <h2>GMPRO Response Status</h2>
          </div>
          {gmproStatusError ? <p className="optimize-api-error">{gmproStatusError}</p> : null}
          {!gmproStatusError && hasGmproResponse === true ? (
            <p className="optimize-response-placeholder">GMPRO response JSON is available.</p>
          ) : null}
          {!gmproStatusError && hasGmproResponse === false ? (
            <p className="optimize-api-error">
              GMPRO response JSON not found. Go to Home and submit JSON or send it from GMPRO system.
            </p>
          ) : null}
          {hasGmproResponse === null && !gmproStatusError ? (
            <p className="optimize-response-placeholder">Checking GMPRO response availability...</p>
          ) : null}
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
                  {/* <th>Destination</th> */}
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
                      {/* <td>{load.destination}</td> */}
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
            <p>{usedVehicles.length} rows</p>
          </div>
          <p className="optimize-response-note">
            Loaded from the latest GMPRO response and enriched with vehicle specs from the database.
          </p>
          {usedVehiclesError ? <p className="optimize-api-error">{usedVehiclesError}</p> : null}
          {!usedVehiclesError && isLoadingUsedVehicles ? (
            <p className="optimize-response-placeholder">Checking vehicle load space...</p>
          ) : null}
          {!usedVehiclesError && !isLoadingUsedVehicles && usedVehicles.length === 0 ? (
            <p className="optimize-response-placeholder">
              No used vehicles were found in the GMPRO response yet.
            </p>
          ) : null}
          {usedVehicles.length > 0 ? (
            <div className="table-wrap">
              <table className="loads-table optimize-vehicle-table">
                <thead>
                  <tr>
                    <th>Vehicle Name</th>
                    <th>Vehicle Type</th>
                    <th>Length (cm)</th>
                    <th>Width (cm)</th>
                    <th>Height (cm)</th>
                    <th>Max Weight (kg)</th>
                    {/*<th>Qty</th>*/}
                    {/* <th>Volume/Vehicle (m3)</th> */}
                    <th>Max CBM</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {usedVehicles.map((vehicle) => {
                    // const vehicleVolume = toVolumeM3(
                    //   vehicle.length_cm,
                    //   vehicle.width_cm,
                    //   vehicle.height_cm,
                    // )

                    return (
                      <tr key={`${vehicle.type_id}-${vehicle.gmpro_vehicle_label}`}>
                        <td>
                          <div className="optimize-vehicle-name">
                            <span>{vehicle.gmpro_vehicle_label}</span>
                            <span className="optimize-vehicle-subtitle">Type ID {vehicle.type_id}</span>
                          </div>
                        </td>
                        <td>{vehicle.type_name}</td>
                        <td>{formatNumber(vehicle.length_cm)}</td>
                        <td>{formatNumber(vehicle.width_cm)}</td>
                        <td>{formatNumber(vehicle.height_cm)}</td>
                        <td>{formatNumber(vehicle.max_weight_kg)}</td>
                        {/* <td>{formatNumber(vehicle.count, 0)}</td> */}
                        {/* <td>{formatNumber(vehicleVolume, 3)}</td> */}
                        <td>{formatNumber(vehicle.max_cbm, 3)}</td>
                        <td>
                          <span
                            className={
                              vehicle.is_active
                                ? 'optimize-vehicle-badge optimize-vehicle-badge-active'
                                : 'optimize-vehicle-badge optimize-vehicle-badge-inactive'
                            }
                          >
                            {vehicle.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="optimize-panel">
          <div className="optimize-panel-head">
            <h2>Vehicle Pickup And Delivery Sequence</h2>
            <p>{routeCharts.length} routes</p>
          </div>
          <p className="optimize-response-note">
            Sequence is generated from GMPRO route visits. Shipment label is matched with load name
            from CSV (doNumber).
          </p>
          {routeCharts.length === 0 ? (
            <p className="optimize-response-placeholder">
              No vehicle sequence found in GMPRO response yet.
            </p>
          ) : (
            <div className="optimize-sequence-stack">
              {routeCharts.map((chart) => (
                <article
                  key={chart.vehicleLabel}
                  className="optimize-sequence-card"
                >
                  <header className="optimize-sequence-head">
                    <h3>{chart.vehicleLabel}</h3>
                    <p>{chart.steps.length} visits</p>
                  </header>
                  <div className="optimize-sequence-steps">
                    {chart.steps.map((step) => (
                      <div key={`${chart.vehicleLabel}-${step.order}-${step.shipmentLabel}`} className="optimize-sequence-step">
                        <span className="optimize-sequence-order">#{step.order}</span>
                        <span
                          className={
                            step.action === 'Pickup'
                              ? 'optimize-sequence-badge optimize-sequence-badge-pickup'
                              : 'optimize-sequence-badge optimize-sequence-badge-delivery'
                          }
                        >
                          {step.action}
                        </span>
                        <span className="optimize-sequence-shipment">{step.shipmentLabel}</span>
                        <span
                          className={
                            step.matchedLoadName
                              ? 'optimize-sequence-match optimize-sequence-match-ok'
                              : 'optimize-sequence-match optimize-sequence-match-miss'
                          }
                        >
                          {step.matchedLoadName ? 'Mapped to load' : 'No matching load'}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="optimize-generated-json-block">
            <h3>Generated Goodloading Input JSON</h3>
            <pre className="optimize-response-json">{generatedGoodloadingPayloadText}</pre>
          </div>
        </section>

        {hasUploadData && (
          <section className="optimize-panel optimize-response-panel">
            <div className="optimize-panel-head">
              <h2>Optimized Response</h2>
              <button
                type="button"
                className="btn btn-primary optimize-send-btn"
                onClick={() => {
                  void sendPayloadToApiHandle()
                }}
                disabled={isSendingToApi || !hasUploadData}
            >
              {isSendingToApi ? 'Sending...' : 'Upload & Optimize'}
            </button>
          </div>
          
          
          {apiError ? <p className="optimize-api-error">{apiError}</p> : null}
          {!apiError && apiResponse === null ? (
            <p className="optimize-response-placeholder">
              {hasUploadData
                ? 'Click "Upload & Optimize" to see the response here.'
                : 'No backend call triggered yet.'}
            </p>
          ) : null}
          {apiResponse !== null ? (
            <pre className="optimize-response-json">{apiResponseText}</pre>
          ) : null}
        </section>)}
      </main>
    </div>
  )
}

export default Optimize
