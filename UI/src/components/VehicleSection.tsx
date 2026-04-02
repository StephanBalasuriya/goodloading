import { useState } from 'react'
import { XLg } from 'react-bootstrap-icons'

import './VehicleSection.css'
import { useLoadsContext } from '../context/LoadsContext'
import type { LoadItem } from '../context/LoadsContext'

const parseNumber = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

type Vehicle = {
  id: number
  name: string
  length_m: number
  height_cm: number
  width_cm: number
  weight_kg: number
  max_weight_kg: number
  created_at: string
  updated_at: string
}

type VehicleForm = {
  name: string
  length_m: string
  width_cm: string
  height_cm: string
  weight_kg: string
  max_weight_kg: string
}

const emptyVehicleForm: VehicleForm = {
  name: '',
  length_m: '',
  width_cm: '',
  height_cm: '',
  weight_kg: '',
  max_weight_kg: '',
}

function VehicleSection() {
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
    const [isVehiclesLoading, setIsVehiclesLoading] = useState(false)
    const [vehiclesError, setVehiclesError] = useState('')
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [vehicleForm, setVehicleForm] = useState<VehicleForm>(emptyVehicleForm)
    const [isVehicleForm, setIsVehicleForm] = useState(false)



  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false)
  const [vehicleFormError, setVehicleFormError] = useState('')
  const [vehicleFormMessage, setVehicleFormMessage] = useState('')

  const [selectedVehicleName, setSelectedVehicleName] = useState('')
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null)

  const { loads, setLoads, removeLoadRow } = useLoadsContext()

  const openVehicleModal = async () => {
    setIsVehicleModalOpen(true)
    await fetchVehicles()
  }

  const fetchVehicles = async () => {
    setIsVehiclesLoading(true)
    setVehiclesError('')

    try {
      const response = await fetch('http://127.0.0.1:8000/vehicles/')

      if (!response.ok) {
        throw new Error(`Failed to fetch vehicles (${response.status})`)
      }
      
      const data = (await response.json()) as Vehicle[]
    //   console.log('Fetched vehicles:', data)
      setVehicles(data)
      if (data.length === 0) {
        setVehiclesError('No vehicles found in the database yet. Add one below.')
      }
    } catch {
      setVehiclesError('Could not load vehicles. Check if Vehicles API is running on port 8000.')
    } finally {
      setIsVehiclesLoading(false)
    }
  }

  const closeVehicleModal = () => {
    setIsVehicleModalOpen(false)
    setEditingVehicleId(null)
    setVehicleForm(emptyVehicleForm)
    setVehicleFormError('')
    setVehicleFormMessage('')
  }
    const startAddVehicle = () => {
    setEditingVehicleId(null)
    setVehicleForm(emptyVehicleForm)
    setIsVehicleForm(true)
    setVehicleFormError('')
    setVehicleFormMessage('')
  }

  const selectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicleName(vehicle.name)
    closeVehicleModal()
  }



  const startEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id)
    setVehicleForm({
      name: vehicle.name,
      length_m: String(vehicle.length_m),
      width_cm: String(vehicle.width_cm),
      height_cm: String(vehicle.height_cm),
      weight_kg: String(vehicle.weight_kg),
      max_weight_kg: String(vehicle.max_weight_kg),
    })
    setVehicleFormError('')
    setVehicleFormMessage('')
  }

  const updateVehicleForm = (field: keyof VehicleForm, value: string) => {
    setVehicleForm((previous) => ({ ...previous, [field]: value }))
  }

  const submitVehicle = async () => {
    setVehicleFormError('')
    setVehicleFormMessage('')

    const payload = {
      name: vehicleForm.name.trim(),
      length_m: Number(vehicleForm.length_m),
      width_cm: Number(vehicleForm.width_cm),
      height_cm: Number(vehicleForm.height_cm),
      weight_kg: Number(vehicleForm.weight_kg),
      max_weight_kg: Number(vehicleForm.max_weight_kg),
    }

    if (!payload.name) {
      setVehicleFormError('Vehicle name is required.')
      return
    }

    const allNumbers = [
      payload.length_m,
      payload.width_cm,
      payload.height_cm,
      payload.weight_kg,
      payload.max_weight_kg,
    ]
    const hasInvalidNumber = allNumbers.some((value) => !Number.isFinite(value) || value < 0)
    if (hasInvalidNumber) {
      setVehicleFormError('All numeric fields must be valid positive numbers.')
      return
    }

    setIsSubmittingVehicle(true)

    try {
      const isUpdate = editingVehicleId !== null
      const url = isUpdate
        ? `http://127.0.0.1:8000/vehicles/${editingVehicleId}`
        : 'http://127.0.0.1:8000/vehicles/'

      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(isUpdate ? 'Failed to update vehicle' : 'Failed to add vehicle')
      }

      setVehicleFormMessage(isUpdate ? 'Vehicle updated successfully.' : 'Vehicle added successfully.')
      startAddVehicle()
      await fetchVehicles()
    } catch {
      setVehicleFormError('Unable to save vehicle. Check API status and try again.')
    } finally {
      setIsSubmittingVehicle(false)
    }
  }

  const deleteVehicle = async (vehicleId: number) => {
    setVehicleFormError('')
    setVehicleFormMessage('')

    try {
      const response = await fetch(`http://127.0.0.1:8000/vehicles/${vehicleId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete vehicle')
      }

      if (editingVehicleId === vehicleId) {
        startAddVehicle()
      }

      await fetchVehicles()
      setVehicleFormMessage('Vehicle deleted successfully.')
    } catch {
      setVehicleFormError('Unable to delete vehicle. Check API status and try again.')
    }
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
          {selectedVehicleName ? (
            <p className="VehicleSection-selected">Selected: {selectedVehicleName}</p>
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

      {isVehicleModalOpen ? (
        <div className="vehicle-modal-backdrop" role="dialog" aria-modal="true" aria-label="Vehicle manager">
          <div className="vehicle-modal">
            <div className="vehicle-modal-head">
              <h3>Manage vehicles from database</h3>
              <button
                type="button"
                className="vehicle-modal-close"
                onClick={closeVehicleModal}
                aria-label="Close vehicle modal"
              >
                <XLg aria-hidden="true" focusable="false" />
              </button>
            </div>

            <div className="vehicle-modal-toolbar">
              <button type="button" className="vehicle-modal-new" onClick={startAddVehicle}>
                + New Vehicle
              </button>
            </div>
            {isVehicleForm ? (
              <>
                <div className="vehicle-form-grid">
                  <input
                    value={vehicleForm.name}
                    onChange={(event) => updateVehicleForm('name', event.target.value)}
                    placeholder="Vehicle name"
                  />
                  <input
                    type="number"
                    min="0"
                    value={vehicleForm.length_m}
                    onChange={(event) => updateVehicleForm('length_m', event.target.value)}
                    placeholder="Length (m)"
                  />
                  <input
                    type="number"
                    min="0"
                    value={vehicleForm.width_cm}
                    onChange={(event) => updateVehicleForm('width_cm', event.target.value)}
                    placeholder="Width (cm)"
                  />
                  <input
                    type="number"
                    min="0"
                    value={vehicleForm.height_cm}
                    onChange={(event) => updateVehicleForm('height_cm', event.target.value)}
                    placeholder="Height (cm)"
                  />
                  <input
                    type="number"
                    min="0"
                    value={vehicleForm.weight_kg}
                    onChange={(event) => updateVehicleForm('weight_kg', event.target.value)}
                    placeholder="Weight (kg)"
                  />
                  <input
                    type="number"
                    min="0"
                    value={vehicleForm.max_weight_kg}
                    onChange={(event) => updateVehicleForm('max_weight_kg', event.target.value)}
                    placeholder="Max payload (kg)"
                  />
                </div>

                <div className="vehicle-form-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={submitVehicle}
                    disabled={isSubmittingVehicle}
                  >
                    {editingVehicleId === null ? 'Add Vehicle' : 'Update Vehicle'}
                  </button>
                  {editingVehicleId !== null ? (
                    <button type="button" className="vehicle-modal-close" onClick={startAddVehicle}>
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}

            {vehicleFormError ? <p className="vehicle-modal-error">{vehicleFormError}</p> : null}
            {vehicleFormMessage ? <p className="vehicle-modal-status">{vehicleFormMessage}</p> : null}
            {isVehiclesLoading ? <p className="vehicle-modal-status">Loading vehicles...</p> : null}
            {vehiclesError ? <p className="vehicle-modal-error">{vehiclesError}</p> : null}

            {!isVehiclesLoading && vehicles.length > 0 ? (
              <div className="vehicle-list">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="vehicle-card">
                    <h4>{vehicle.name}</h4>
                    <p>Length: {vehicle.length_m} m</p>
                    <p>Width: {vehicle.width_cm} cm</p>
                    <p>Height: {vehicle.height_cm} cm</p>
                    <p>Weight: {vehicle.weight_kg} kg</p>
                    <p>Max Payload: {vehicle.max_weight_kg} kg</p>

                    <div className="vehicle-card-actions">
                      <button type="button" onClick={() => selectVehicle(vehicle)}>
                        Select
                      </button>
                      <button type="button" onClick={() => startEditVehicle(vehicle)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => deleteVehicle(vehicle.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default VehicleSection
