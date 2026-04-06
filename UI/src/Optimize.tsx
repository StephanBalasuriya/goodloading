import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLoadsContext } from './context/LoadsContext'
import { useLoadSpace } from './context/LoadSpace'
import './Optimize.css'

const toVolumeM3 = (lengthCm: number, widthCm: number, heightCm: number) =>
  (lengthCm * widthCm * heightCm) / 1_000_000

const formatNumber = (value: number, maximumFractionDigits = 2) =>
  value.toLocaleString(undefined, { maximumFractionDigits })

function Optimize() {
  const { loads } = useLoadsContext()
  const { selectedVehicles } = useLoadSpace()

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
      </main>
    </div>
  )
}

export default Optimize
