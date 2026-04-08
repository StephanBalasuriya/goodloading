import { useEffect, useState } from 'react'
import { XLg } from 'react-bootstrap-icons'
import { vehiclesApiUrl } from '../config/api'

type Vehicle = {
  id: number
  name: string
  length_cm: number
  height_cm: number
  width_cm: number
  max_weight_kg: number
  quantity: number
  created_at: string
  updated_at: string
}

type VehicleFormData = {
  name: string
  length_cm: string
  width_cm: string
  height_cm: string
  max_weight_kg: string
  quantity: string
}

type VehicleFormProps = {
  onClose: () => void
  onSelectVehicle: (vehicle: SelectedVehiclePayload) => void
}

export type SelectedVehiclePayload = Vehicle & {
  selected_quantity: number
}

const emptyVehicleForm: VehicleFormData = {
  name: '',
  length_cm: '',
  width_cm: '',
  height_cm: '',
  max_weight_kg: '',
  quantity: '',
}

function VehicleForm({ onClose, onSelectVehicle }: VehicleFormProps) {
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false)
  const [vehiclesError, setVehiclesError] = useState('')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  const [vehicleForm, setVehicleForm] = useState<VehicleFormData>(emptyVehicleForm)
  const [isVehicleForm, setIsVehicleForm] = useState(false)
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false)
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null)
  const [vehicleFormError, setVehicleFormError] = useState('')
  const [vehicleFormMessage, setVehicleFormMessage] = useState('')
  const [selectingVehicle, setSelectingVehicle] = useState<Vehicle | null>(null)
  const [vehicleQuantity, setVehicleQuantity] = useState<string>('1')
  const [quantityError, setQuantityError] = useState<string>('')
 

  const fetchVehicles = async () => {
    setIsVehiclesLoading(true)
    setVehiclesError('')

    try {
      const response = await fetch(vehiclesApiUrl('/vehicles/'))
      if (!response.ok) {
        throw new Error(`Failed to fetch vehicles (${response.status})`)
      }

      const data = (await response.json()) as Vehicle[]
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

  useEffect(() => {
    void fetchVehicles()
  }, [])

  const startAddVehicle = () => {
    setEditingVehicleId(null)
    setVehicleForm(emptyVehicleForm)
    setIsVehicleForm(true)
    setVehicleFormError('')
    setVehicleFormMessage('')
  }

  const startEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id)
    setVehicleForm({
      name: vehicle.name,
      length_cm: String(vehicle.length_cm),
      width_cm: String(vehicle.width_cm),
      height_cm: String(vehicle.height_cm),
      max_weight_kg: String(vehicle.max_weight_kg),
      quantity: String(vehicle.quantity),
    })
    setIsVehicleForm(true)
    setVehicleFormError('')
    setVehicleFormMessage('')
  }

  const updateVehicleForm = (field: keyof VehicleFormData, value: string) => {
    setVehicleForm((previous) => ({ ...previous, [field]: value }))
  }

  const submitVehicle = async () => {
    setVehicleFormError('')
    setVehicleFormMessage('')

    const payload = {
      name: vehicleForm.name.trim(),
      length_cm: Number(vehicleForm.length_cm),
      width_cm: Number(vehicleForm.width_cm),
      height_cm: Number(vehicleForm.height_cm),
      max_weight_kg: Number(vehicleForm.max_weight_kg),
      quantity: Number(vehicleForm.quantity),
    }

    if (!payload.name) {
      setVehicleFormError('Vehicle name is required.')
      return
    }

    const allNumbers = [
      payload.length_cm,
      payload.width_cm,
      payload.height_cm,
      payload.max_weight_kg,
      payload.quantity,
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
        ? vehiclesApiUrl(`/vehicles/${editingVehicleId}`)
        : vehiclesApiUrl('/vehicles/')

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
      setIsVehicleForm(false)
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
      const response = await fetch(vehiclesApiUrl(`/vehicles/${vehicleId}`), {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete vehicle')
      }

      if (editingVehicleId === vehicleId) {
        setIsVehicleForm(false)
        setEditingVehicleId(null)
      }

      await fetchVehicles()
      setVehicleFormMessage('Vehicle deleted successfully.')
    } catch {
      setVehicleFormError('Unable to delete vehicle. Check API status and try again.')
    }
  }

  const selectVehicle = (vehicle: Vehicle) => {
    setSelectingVehicle(vehicle)
    setVehicleQuantity('1')
    setQuantityError('')
  }

  const confirmVehicleSelection = () => {
    if (!selectingVehicle) return

    const quantity = Number(vehicleQuantity)
    if (!Number.isFinite(quantity) || quantity < 1) {
      return
    }

    const selected: SelectedVehiclePayload = {
      ...selectingVehicle,
      selected_quantity: quantity,
    }
    onSelectVehicle(selected)
    setSelectingVehicle(null)
    setVehicleQuantity('1')
    onClose()
  }

  const cancelQuantitySelection = () => {
    setSelectingVehicle(null)
    setVehicleQuantity('1')
    setQuantityError('')
  }

  return (
    <div className="vehicle-modal-backdrop" role="dialog" aria-modal="true" aria-label="Vehicle manager">
      <div className="vehicle-modal">
        <div className="vehicle-modal-head">
          <h3>Manage vehicles from database</h3>
          <button
            type="button"
            className="vehicle-modal-close"
            onClick={onClose}
            aria-label="Close vehicle modal"
          >
            <XLg aria-hidden="true" focusable="false" />
          </button>
        </div>

        {!selectingVehicle ? (
          <div className="vehicle-modal-toolbar">
            <button type="button" className="vehicle-modal-new" onClick={startAddVehicle}>
              + New Vehicle
            </button>
          </div>
        ) : null}

        {!selectingVehicle && isVehicleForm ? (
          <>
            <div className="vehicle-form-grid">
              <label htmlFor="vehicle-name-input">
                Vehicle Name
                <input
                  id="vehicle-name-input"
                  value={vehicleForm.name}
                  onChange={(event) => updateVehicleForm('name', event.target.value)}
                  placeholder="Vehicle name"
                />
              </label>
              <label htmlFor="vehicle-length-input">
                Length in cm
                <input
                  id="vehicle-length-input"
                  type="number"
                  min="0"
                  value={vehicleForm.length_cm}
                  onChange={(event) => updateVehicleForm('length_cm', event.target.value)}
                  placeholder="Length (cm)"
                />
              </label>
              <label htmlFor="vehicle-width-input">
                Width in cm
                <input
                  id="vehicle-width-input"
                  type="number"
                  min="0"
                  value={vehicleForm.width_cm}
                  onChange={(event) => updateVehicleForm('width_cm', event.target.value)}
                  placeholder="Width (cm)"
                />
              </label>
              <label htmlFor="vehicle-height-input">
                Height in cm
                <input
                  id="vehicle-height-input"
                  type="number"
                  min="0"
                  value={vehicleForm.height_cm}
                  onChange={(event) => updateVehicleForm('height_cm', event.target.value)}
                  placeholder="Height (cm)"
                />
              </label>
              <label htmlFor="vehicle-quantity-input">
                Quantity
                <input
                  id="vehicle-quantity-input"
                  type="number"
                  min="1"
                  value={vehicleForm.quantity}
                  onChange={(event) => updateVehicleForm('quantity', event.target.value)}
                  placeholder="Quantity"
                />
              </label>
              <label htmlFor="vehicle-max-payload-input">
                Max Payload
                <input
                  id="vehicle-max-payload-input"
                  type="number"
                  min="0"
                  value={vehicleForm.max_weight_kg}
                  onChange={(event) => updateVehicleForm('max_weight_kg', event.target.value)}
                  placeholder="Max payload (kg)"
                />
              </label>
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

              <button type="button" className="vehicle-modal-close" onClick={() => setIsVehicleForm(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : null}

        {vehicleFormError ? <p className="vehicle-modal-error">{vehicleFormError}</p> : null}
        {vehicleFormMessage ? <p className="vehicle-modal-status">{vehicleFormMessage}</p> : null}
        {isVehiclesLoading ? <p className="vehicle-modal-status">Loading vehicles...</p> : null}
        {vehiclesError ? <p className="vehicle-modal-error">{vehiclesError}</p> : null}

        {selectingVehicle ? (
          <div className="vehicle-quantity-selector">
            <h4>How many {selectingVehicle.name} vehicles do you want to use?</h4>
            <div className="vehicle-quantity-input-group">
              <input
                type="number"
                min="1"
                value={vehicleQuantity}
                onChange={(event) => {
                  const value = event.target.value
                  setVehicleQuantity(value)
                  const quantity = Number(value)
                  if (selectingVehicle && Number.isFinite(quantity) && quantity > selectingVehicle.quantity) {
                    setQuantityError(`Cannot exceed available quantity (${selectingVehicle.quantity})`)
                  } else {
                    setQuantityError('')
                  }
                }}
                placeholder="Number of vehicles"
                autoFocus
              />
              {quantityError ? <p className="vehicle-modal-error">{quantityError}</p> : null}
            </div>
            <div className="vehicle-quantity-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmVehicleSelection}
                disabled={Boolean(quantityError)}
              >
                Confirm ({vehicleQuantity})
              </button>
              <button
                type="button"
                className="vehicle-modal-close"
                onClick={cancelQuantitySelection}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {!isVehiclesLoading && vehicles.length > 0 && !selectingVehicle ? (
          <div className="vehicle-list">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="vehicle-card">
                <h4>{vehicle.name}</h4>
                <p>Length: {vehicle.length_cm} cm</p>
                <p>Width: {vehicle.width_cm} cm</p>
                <p>Height: {vehicle.height_cm} cm</p>
                <p>Max Payload: {vehicle.max_weight_kg} kg</p>
                <p>Quantity in fleet: {vehicle.quantity}</p>

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
  )
}

export default VehicleForm
