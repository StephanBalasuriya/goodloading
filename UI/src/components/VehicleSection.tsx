import { useState } from 'react'

import './VehicleSection.css'
import { useLoadsContext } from '../context/LoadsContext'
import { useLoadSpace } from '../context/LoadSpace'
import type { LoadItem } from '../context/LoadsContext'
import VehicleForm from './VehicleForm'

const parseNumber = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function VehicleSection() {
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const { loads, setLoads, removeLoadRow } = useLoadsContext()
  const { selectedVehicle } = useLoadSpace()

  const openVehicleModal = () => {
    setIsVehicleModalOpen(true)
  }

  const closeVehicleModal = () => {
    setIsVehicleModalOpen(false)
  }

  const handleSelectVehicle = (vehicleNcontextame: string) => {
    // Vehicle is already saved in  by VehicleForm
    // Just close the modal and display will update from context
  }

  const updateLoad = (
    id: number,
    field: keyof Omit<LoadItem, 'id'>,
    value: string | boolean,
  ) => {
    setLoads((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item
        if (field === 'name') {
          return { ...item, [field]: String(value) }
        }
        if (field === 'stack' || field === 'arrange_on_floor') {
          return { ...item, [field]: Boolean(value) }
        }
        return { ...item, [field]: parseNumber(String(value)) }
      }),
    )
  }

  return (
    <section className="vehicle-section">
      <div className="VehicleSection-header">
        <div>
          <p className="eyebrow VehicleSection-eyebrow">Vehicle Details</p>
          <h2>Select the Vehicle</h2>
          {selectedVehicle ? (
            <p className="VehicleSection-selected">Selected: {selectedVehicle.name}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="VehicleSection-NewVehicleBtn btn btn-primary"
          onClick={openVehicleModal}
        >
          Add Vehicle
        </button>
      </div>

      <div className="table-wrap">
        <table className="loads-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Length (cm)</th>
              <th>Height (cm)</th>
              <th>Width (cm)</th>
              <th>Weight (kg)</th>
              <th>Quantity</th>
              <th>Stack</th>
              {loads.some((load) => load.stack) && <th>Max Stack Weight</th>}
              {loads.some((load) => load.stack) && <th>Arrange on Floor</th>}
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => {
              const rowTotal = load.weight * load.quantity
              return (
                <tr key={load.id}>
                  <td>
                    <input
                      value={load.name}
                      onChange={(event) => updateLoad(load.id, 'name', event.target.value)}
                      placeholder="Load name"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={load.length}
                      onChange={(event) => updateLoad(load.id, 'length', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={load.height}
                      onChange={(event) => updateLoad(load.id, 'height', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={load.width}
                      onChange={(event) => updateLoad(load.id, 'width', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={load.weight}
                      onChange={(event) => updateLoad(load.id, 'weight', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={load.quantity}
                      onChange={(event) => updateLoad(load.id, 'quantity', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={load.stack}
                      onChange={(event) => updateLoad(load.id, 'stack', event.target.checked)}
                    />
                  </td>
                  {load.stack && (
                    <>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={load.max_stack_weight}
                          onChange={(event) => updateLoad(load.id, 'max_stack_weight', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={load.arrange_on_floor}
                          onChange={(event) => updateLoad(load.id, 'arrange_on_floor', event.target.checked)}
                        />
                      </td>
                    </>
                  )}

                  <td className="row-total">{rowTotal.toFixed(2)} kg</td>
                  <td>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeLoadRow(load.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isVehicleModalOpen && (
        <VehicleForm
          onClose={closeVehicleModal}
          onSelectVehicle={handleSelectVehicle}
        />
      )}
    </section>
  )
}

export default VehicleSection
