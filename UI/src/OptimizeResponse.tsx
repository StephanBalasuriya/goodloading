import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'
import { LoadingSpaceViewer2D } from './components/LoadingSpaceViewer2D'
import { StatisticsPanel } from './components/StatisticsPanel'
import { LoadsList } from './components/LoadsList'
import { StopSelector } from './components/StopSelector'
import type {
  Axis,
  LoadItem,
  LoadPlacement,
  LoadingSpace,
  LoadingSpacePart,
  NotFittedLoad,
  OptimizationResponse,
  Stop,
  Summary,
} from './components/loadingTypes'
import './Optimize.css'
import './OptimizeResponse.css'

type OptimizeResponseLocationState = {
  apiError?: string | null
  apiResponse?: unknown
}

type VehicleResponseItem = {
  vehicleLabel: string
  response: unknown
}

const LOAD_TYPE_BOX = 0
const LOAD_TYPE_BARREL = 1
const LOAD_TYPE_PIPE = 2

const formatApiResult = (value: unknown) => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback

const asBoolean = (value: unknown, fallback = false) =>
  typeof value === 'boolean' ? value : fallback

const asOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const toPositiveNumber = (value: unknown): number => {
  const parsed = asOptionalNumber(value)
  return parsed !== undefined && parsed > 0 ? parsed : 0
}

const normalizeDimensionsByLoadType = (
  loadType: number | undefined,
  dimensions: {
    width: number
    length: number
    height: number
    diameter?: number
  },
) => {
  const width = toPositiveNumber(dimensions.width)
  const length = toPositiveNumber(dimensions.length)
  const height = toPositiveNumber(dimensions.height)
  const diameter = toPositiveNumber(dimensions.diameter)

  if (loadType === LOAD_TYPE_BOX) {
    return {
      width,
      length,
      height,
      diameter: undefined,
    }
  }

  if (loadType === LOAD_TYPE_BARREL) {
    return {
      width: 0,
      length: 0,
      height,
      diameter: diameter > 0 ? diameter : Math.max(width, length),
    }
  }

  if (loadType === LOAD_TYPE_PIPE) {
    return {
      width: 0,
      length,
      height: 0,
      diameter: diameter > 0 ? diameter : Math.max(width, height),
    }
  }

  return {
    width,
    length,
    height,
    diameter: diameter > 0 ? diameter : undefined,
  }
}

const formatLoadDimensionsByType = (load: {
  loadType?: number
  width: number
  length: number
  height: number
  diameter?: number
}) => {
  const diameter = toPositiveNumber(load.diameter)

  if (load.loadType === LOAD_TYPE_BOX) {
    return `${load.length} x ${load.width} x ${load.height} cm`
  }

  if (load.loadType === LOAD_TYPE_BARREL) {
    return `Height ${load.height} cm, Diameter ${diameter} cm`
  }

  if (load.loadType === LOAD_TYPE_PIPE) {
    return `Length ${load.length} cm, Diameter ${diameter} cm`
  }

  return `${load.length} x ${load.width} x ${load.height} cm`
}

const toSummary = (value: unknown): Summary => {  //Converts summary object.
  if (!isObject(value)) return {}
  return {
    freeLdm: asOptionalNumber(value.freeLdm),
    occupiedLdm: asOptionalNumber(value.occupiedLdm),
    freeSurface: asOptionalNumber(value.freeSurface),
    occupiedSurface: asOptionalNumber(value.occupiedSurface),
    freeVolume: asOptionalNumber(value.freeVolume),
    occupiedVolume: asOptionalNumber(value.occupiedVolume),
    percentLdmUsd: asOptionalNumber(value.percentLdmUsd),
    percentVolumeUsd: asOptionalNumber(value.percentVolumeUsd),
    totalLoadsWeight: asOptionalNumber(value.totalLoadsWeight),
  }
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const MIN_SUMMARY_KEYS: Array<keyof Summary> = ['freeLdm', 'freeSurface', 'freeVolume']
const MAX_SUMMARY_KEYS: Array<keyof Summary> = [
  'occupiedLdm',
  'occupiedSurface',
  'occupiedVolume',
  'percentLdmUsd',
  'percentVolumeUsd',
  'totalLoadsWeight',
]

const pickBestStopSummary = (part: LoadingSpacePart | null): Summary => {
  if (!part?.stops || part.stops.length === 0) return part?.summary ?? {}

  const stopSummaries = part.stops
    .map((stop) => stop.summary)
    .filter((summary): summary is Summary => summary !== undefined)

  if (stopSummaries.length === 0) return part.summary ?? {}

  const bestSummary: Summary = {}

  for (const key of MIN_SUMMARY_KEYS) {
    const values = stopSummaries
      .map((summary) => summary[key])
      .filter(isFiniteNumber)

    if (values.length > 0) {
      bestSummary[key] = Math.min(...values)
    }
  }

  for (const key of MAX_SUMMARY_KEYS) {
    const values = stopSummaries
      .map((summary) => summary[key])
      .filter(isFiniteNumber)

    if (values.length > 0) {
      bestSummary[key] = Math.max(...values)
    }
  }

  return Object.keys(bestSummary).length > 0 ? bestSummary : part.summary ?? {}
}

const buildLoadSignature = (load: LoadItem): string => {
  const placementSignature = load.placement
    .map(
      (placement) =>
        `${placement.position.x},${placement.position.y},${placement.position.z}:${placement.width},${placement.length},${placement.height},${placement.diameter ?? 0}`,
    )
    .sort()
    .join('|')

  return [
    load.name,
    load.width,
    load.length,
    load.height,
    load.diameter ?? 0,
    load.loadType ?? -1,
    load.weight,
    load.quantity,
    load.priority,
    load.allowToRotate ? 1 : 0,
    String(load.stacking),
    placementSignature,
  ].join('::')
}

const dedupeLoads = (loads: LoadItem[]): LoadItem[] => {
  const seen = new Set<string>()
  const uniqueLoads: LoadItem[] = []

  for (const load of loads) {
    const signature = buildLoadSignature(load)
    if (seen.has(signature)) continue
    seen.add(signature)
    uniqueLoads.push(load)
  }

  return uniqueLoads
}

const toPlacement = (value: unknown): LoadPlacement | null => { //Converts cargo placement.
  if (!isObject(value) || !isObject(value.position)) return null
  return {
    height: asNumber(value.height, 0),
    length: asNumber(value.length, 0),
    width: asNumber(value.width, 0),
    diameter: asOptionalNumber(value.diameter),
    loadsPerAxis: isObject(value.loadsPerAxis)
      ? {
          x: asNumber(value.loadsPerAxis.x, 1),
          y: asNumber(value.loadsPerAxis.y, 1),
          z: asNumber(value.loadsPerAxis.z, 1),
        }
      : { x: 1, y: 1, z: 1 },
    position: {
      x: asNumber(value.position.x, 0),
      y: asNumber(value.position.y, 0),
      z: asNumber(value.position.z, 0),
    },
  }
}

const toLoad = (value: unknown, index: number): LoadItem | null => {
  if (!isObject(value)) return null

  const loadTypeRaw = asOptionalNumber(value.loadType)
  const loadType = loadTypeRaw !== undefined ? Math.trunc(loadTypeRaw) : undefined

  const normalizedDimensions = normalizeDimensionsByLoadType(loadType, {
    width: asNumber(value.width, 0),
    length: asNumber(value.length, 0),
    height: asNumber(value.height, 0),
    diameter: asOptionalNumber(value.diameter),
  })

  const placement = Array.isArray(value.placement)
    ? value.placement
        .map((p) => toPlacement(p))
        .filter((p): p is LoadPlacement => p !== null)
    : []

  return {
    id: asNumber(value.id, index + 1),
    name: asString(value.name, `Load ${index + 1}`),
    width: normalizedDimensions.width,
    length: normalizedDimensions.length,
    height: normalizedDimensions.height,
    diameter: normalizedDimensions.diameter,
    loadType,
    weight: asNumber(value.weight, 0),
    quantity: asNumber(value.quantity, 1),
    priority: asNumber(value.priority, 0),
    allowToRotate: asBoolean(value.allowToRotate, false),
    stacking:
      typeof value.stacking === 'number' || typeof value.stacking === 'boolean'
        ? value.stacking
        : null,
    placement,
  }
}

const toStop = (value: unknown, index: number): Stop | null => {
  if (!isObject(value)) return null
  const loads = Array.isArray(value.loads)
    ? value.loads.map((load, loadIndex) => toLoad(load, loadIndex)).filter((load): load is LoadItem => load !== null)
    : []

  return {
    id: asNumber(value.id ?? value.stopId, index + 1),
    name: asString(value.name, `Stop ${index + 1}`),
    loads,
    summary: toSummary(value.summary),
  }
}

const toAxis = (value: unknown): Axis | null => {
  if (!isObject(value)) return null
  return {
    distanceFromSpaceFront: asNumber(value.distanceFromSpaceFront, 0),
    emptySpaceLoad: asNumber(value.emptySpaceLoad, 0),
    maxLoad: asNumber(value.maxLoad, 0),
    addedLoad: asNumber(value.addedLoad, 0),
  }
}

const toPart = (value: unknown): LoadingSpacePart | null => {
  if (!isObject(value)) return null
  return {
    height: asNumber(value.height, 0),
    length: asNumber(value.length, 0),
    width: asNumber(value.width, 0),
    limit: asNumber(value.limit, 0),
    loads: Array.isArray(value.loads)
      ? value.loads.map((load, loadIndex) => toLoad(load, loadIndex)).filter((load): load is LoadItem => load !== null)
      : [],
    stops: Array.isArray(value.stops)
      ? value.stops.map((stop, stopIndex) => toStop(stop, stopIndex)).filter((stop): stop is Stop => stop !== null)
      : [],
    summary: toSummary(value.summary),
    axis: Array.isArray(value.axis)
      ? value.axis.map((axis) => toAxis(axis)).filter((axis): axis is Axis => axis !== null)
      : [],
  }
}

const toLoadingSpace = (value: unknown, index: number): LoadingSpace | null => {
  if (!isObject(value)) return null
  return {
    id: asNumber(value.id, index + 1),
    name: asString(value.name, `Loading Space ${index + 1}`),
    type: asString(value.type, 'vehicle'),
    parts: Array.isArray(value.parts)
      ? value.parts.map((part) => toPart(part)).filter((part): part is LoadingSpacePart => part !== null)
      : [],
  }
}

const toNotFittedLoad = (value: unknown, index: number): NotFittedLoad | null => { //Converts items that could not fit.
  if (!isObject(value)) return null

  const loadTypeRaw = asOptionalNumber(value.loadType)
  const loadType = loadTypeRaw !== undefined ? Math.trunc(loadTypeRaw) : undefined
  const normalizedDimensions = normalizeDimensionsByLoadType(loadType, {
    width: asNumber(value.width, 0),
    length: asNumber(value.length, 0),
    height: asNumber(value.height, 0),
    diameter: asOptionalNumber(value.diameter),
  })

  return {
    id: asNumber(value.id, index + 1),
    name: asString(value.name, `Load ${index + 1}`),
    width: normalizedDimensions.width,
    length: normalizedDimensions.length,
    height: normalizedDimensions.height,
    diameter: normalizedDimensions.diameter,
    loadType,
    weight: asNumber(value.weight, 0),
    quantity: asNumber(value.quantity, 1),
  }
}

const toOptimizationResponse = (value: unknown): OptimizationResponse | null => { //Converts full API response into:loadingSpaces, notFittedLoads
  if (!isObject(value)) return null

  const loadingSpaces = Array.isArray(value.loadingSpaces)
    ? value.loadingSpaces
        .map((loadingSpace, index) => toLoadingSpace(loadingSpace, index))
        .filter((loadingSpace): loadingSpace is LoadingSpace => loadingSpace !== null)
    : []

  const notFittedLoads = Array.isArray(value.notFittedLoads)
    ? value.notFittedLoads
        .map((load, index) => toNotFittedLoad(load, index))
        .filter((load): load is NotFittedLoad => load !== null)
    : []

  return {
    loadingSpaces,
    notFittedLoads,
  }
}

const toVehicleResponses = (value: unknown): VehicleResponseItem[] => { //Parses multi-vehicle response.
  if (!isObject(value) || !Array.isArray(value.vehicleResponses)) return []

  return value.vehicleResponses
    .map((entry, index): VehicleResponseItem | null => {
      if (!isObject(entry)) return null

      const vehicleLabel =
        typeof entry.vehicleLabel === 'string' && entry.vehicleLabel.trim() !== ''
          ? entry.vehicleLabel
          : `Vehicle ${index + 1}`

      return {
        vehicleLabel,
        response: 'response' in entry ? entry.response : null,
      }
    })
    .filter((entry): entry is VehicleResponseItem => entry !== null)
}

function OptimizeResponse() {
  const location = useLocation()

  const locationState = (location.state ?? null) as OptimizeResponseLocationState | null
  const apiError = typeof locationState?.apiError === 'string' ? locationState.apiError : null
  const apiResponse = locationState?.apiResponse ?? null
  const vehicleResponses = useMemo(() => toVehicleResponses(apiResponse), [apiResponse])
  const hasSeparateVehicleResponses = vehicleResponses.length > 0
  const [selectedVehicleResponseIndex, setSelectedVehicleResponseIndex] = useState(0)
  const [copiedVehicleResponseIndex, setCopiedVehicleResponseIndex] = useState<number | null>(null)

  const effectiveSelectedVehicleResponseIndex =
    selectedVehicleResponseIndex >= 0 && selectedVehicleResponseIndex < vehicleResponses.length
      ? selectedVehicleResponseIndex
      : 0

  const selectedVehicleResponse =
    hasSeparateVehicleResponses
      ? vehicleResponses[effectiveSelectedVehicleResponseIndex] ?? null
      : null

  const selectedApiResponse = selectedVehicleResponse?.response ?? apiResponse
  const apiResponseText = selectedApiResponse === null ? '' : formatApiResult(selectedApiResponse)
  const [selectedStopId, setSelectedStopId] = useState<number | undefined>(undefined)
  const parsedResponse = useMemo(
    () => toOptimizationResponse(selectedApiResponse),
    [selectedApiResponse],
  )
  const loadingSpaces = parsedResponse?.loadingSpaces ?? []
  const loadingSpace = loadingSpaces[0] ?? null
  const part = loadingSpace?.parts[0] ?? null
  const hasStops = (part?.stops?.length ?? 0) > 0
  const effectiveSelectedStopId =
    hasStops &&
    selectedStopId !== undefined &&
    part?.stops?.some((stop) => stop.id === selectedStopId)
      ? selectedStopId
      : undefined

  const currentLoads = useMemo(() => {
    if (!part) return []

    if (hasStops && effectiveSelectedStopId !== undefined) {
      return dedupeLoads(part.stops?.find((s) => s.id === effectiveSelectedStopId)?.loads ?? [])
    }

    if (hasStops) {
      return dedupeLoads(part.stops?.flatMap((s) => s.loads) ?? [])
    }

    return dedupeLoads(part.loads ?? [])
  }, [effectiveSelectedStopId, hasStops, part])

  const selectedStopName = useMemo(() => {
    if (!hasStops || effectiveSelectedStopId === undefined || !part?.stops) return null
    return part.stops.find((s) => s.id === effectiveSelectedStopId)?.name ?? null
  }, [effectiveSelectedStopId, hasStops, part])

  const bestStopSummary = useMemo(() => pickBestStopSummary(part), [part])

  return (
    <div className="page">
      <header className="hero optimize-hero">
        <div className="hero-copy">
          <p className="eyebrow">Optimization Result</p>
          <h1>Optimize Response</h1>
          <p className="hero-text">
            View the Optimized results generated from the Goodloading System.
          </p>
          <Link to="/optimize" className="btn btn-primary optimize-back-btn">
            Back To Optimize
          </Link>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit" />
        </div>
      </header>

      <main className="optimize-main optimize-response-main-grid">
        <section className="optimize-response-left">
          <section className="optimize-panel">
            <h2 className="optimize-response-page-title">Loading Space Optimizer</h2>
            <p className="optimize-response-page-subtitle">
              Interactive layout visualization generated from the optimization response.
            </p>

            {hasSeparateVehicleResponses && vehicleResponses.length > 1 ? (
              <div className="optimize-response-space-selector">
                <p className="optimize-response-selector-label">Select Vehicle:</p>
                <div className="optimize-response-vehicle-tabs">
                  {vehicleResponses.map((vehicleResponse, index) => (
                    <button
                      key={`vehicle-tab-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedVehicleResponseIndex(index)
                        setSelectedStopId(undefined)
                      }}
                      className={`optimize-response-space-btn ${
                        effectiveSelectedVehicleResponseIndex === index
                          ? 'optimize-response-space-btn-active'
                          : ''
                      }`}
                      aria-pressed={effectiveSelectedVehicleResponseIndex === index}
                    >
                      <span>{vehicleResponse.vehicleLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {loadingSpace && part ? (
              <div className="optimize-response-layout-grid">
                <div className="optimize-response-canvas-wrap">
                  <h3>Cargo Layout View</h3>
                  {hasStops && part.stops ? (
                    <StopSelector
                      stops={part.stops}
                      selectedStopId={effectiveSelectedStopId}
                      onSelectStop={setSelectedStopId}
                    />
                  ) : null}

                  <div className="optimize-response-canvas">
                    <LoadingSpaceViewer2D
                      loadingSpace={loadingSpace}
                      selectedStopId={effectiveSelectedStopId}
                    />
                  </div>
                </div>

                <div>
                  <StatisticsPanel
                    summary={bestStopSummary}
                    spaceName={loadingSpace.name}
                    spaceType={loadingSpace.type}
                    loads={currentLoads}
                    dimensions={{
                      length: part.length,
                      width: part.width,
                      height: part.height,
                      limit: part.limit,
                    }}
                  />

                  <LoadsList
                    loads={currentLoads}
                    title={
                      selectedStopName
                        ? `Loads at ${selectedStopName}`
                        : 'All Loaded Items'
                    }
                  />
                </div>
              </div>
            ) : (
              !apiError && (
                <p className="optimize-response-placeholder">
                  No loading space details were found in the response yet.
                </p>
              )
            )}

            {parsedResponse && parsedResponse.notFittedLoads.length > 0 ? (
              <div className="optimize-response-notfitted">
                <h3>Items That Did Not Fit</h3>
                <div className="optimize-response-notfitted-list">
                  {parsedResponse.notFittedLoads.map((load, loadIdx) => (
                    <div key={`notfitted-${effectiveSelectedVehicleResponseIndex}-${load.id}-${loadIdx}`} className="optimize-response-notfitted-item">
                      <p>{load.name}</p>
                      <p>
                        {formatLoadDimensionsByType(load)}, {load.weight} kg,
                        Qty: {load.quantity}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {part?.axis && part.axis.length > 0 ? (
              <section>
                <h3 className="optimize-response-page-title">Axle Load Distribution</h3>
                <div className="optimize-response-axis-grid">
                  {part.axis.map((axis, axisIdx) => {
                    const totalLoad = axis.emptySpaceLoad + axis.addedLoad
                    const maxLoad = axis.maxLoad <= 0 ? 1 : axis.maxLoad
                    const usedPercent = Math.min(100, (totalLoad / maxLoad) * 100)

                    return (
                      <article key={`axis-${effectiveSelectedVehicleResponseIndex}-${axisIdx}-${axis.distanceFromSpaceFront}`} className="optimize-response-axis-card">
                        <p>
                          Axle {axisIdx + 1} (Distance: {axis.distanceFromSpaceFront} cm)
                        </p>
                        <p>Empty Load: {axis.emptySpaceLoad.toFixed(2)} kg</p>
                        <p>Added Load: {axis.addedLoad.toFixed(2)} kg</p>
                        <p>Max Load: {axis.maxLoad.toFixed(2)} kg</p>
                        <div className="optimize-response-axis-bar">
                          <div
                            className="optimize-response-axis-bar-fill"
                            style={{ width: `${usedPercent.toFixed(1)}%` }}
                          />
                        </div>
                        <p>{usedPercent.toFixed(1)}% of max</p>
                      </article>
                    )
                  })}
                </div>
              </section>
            ) : null}
          </section>
        </section>

        <section className="optimize-panel optimize-response-panel optimize-response-right">
          <div className="optimize-panel-head">
            <h2>Optimized Response</h2>
          </div>

          {apiError ? <p className="optimize-api-error">{apiError}</p> : null}
          {!apiError && selectedApiResponse === null ? (
            <p className="optimize-response-placeholder">
              Click "Upload & Optimize" on the Optimize page to see the response here.
            </p>
          ) : null}
          {!apiError && hasSeparateVehicleResponses ? (
            <div className="optimize-response-vehicle-json-list">
              {vehicleResponses.map((vehicleResponse, index) => {
                const vehicleResponseText = formatApiResult(vehicleResponse.response)

                return (
                  <article key={`${vehicleResponse.vehicleLabel}-${index}`} className="optimize-generated-json-item">
                    <div className="optimize-panel-head">
                      <h3>{vehicleResponse.vehicleLabel}</h3>
                      <button
                        type="button"
                        className="btn btn-primary"
                        aria-label={`Copy ${vehicleResponse.vehicleLabel} response`}
                        title={`Copy ${vehicleResponse.vehicleLabel} response`}
                        onClick={async () => {
                          setSelectedVehicleResponseIndex(index)
                          setSelectedStopId(undefined)

                          try {
                            await navigator.clipboard.writeText(vehicleResponseText)
                            setCopiedVehicleResponseIndex(index)
                            window.setTimeout(() => {
                              setCopiedVehicleResponseIndex((current) =>
                                current === index ? null : current,
                              )
                            }, 1500)
                          } catch {
                            setCopiedVehicleResponseIndex(null)
                          }
                        }}
                      >
                        {copiedVehicleResponseIndex === index ? (
                          <Check size={16} strokeWidth={2.25} />
                        ) : (
                          <Copy size={16} strokeWidth={2.25} />
                        )}
                      </button>
                    </div>
                    <pre className="optimize-response-json">{vehicleResponseText}</pre>
                  </article>
                )
              })}
            </div>
          ) : null}
          {!apiError && !hasSeparateVehicleResponses && selectedApiResponse !== null ? (
            <pre className="optimize-response-json">{apiResponseText}</pre>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default OptimizeResponse
