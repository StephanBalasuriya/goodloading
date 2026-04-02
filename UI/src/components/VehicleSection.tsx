import { useState } from 'react'

import './VehicleSection.css'
import VehicleForm from './VehicleForm'
import type { SelectedVehiclePayload } from './VehicleForm'
import { useLoadSpace } from '../context/LoadSpace'

function VehicleSection() {
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const { selectedVehicles, addSelectedVehicle, removeSelectedVehicle } = useLoadSpace()

  const openVehicleModal = () => {
    setIsVehicleModalOpen(true)
  }

  const closeVehicleModal = () => {
    setIsVehicleModalOpen(false)
  }

  const handleSelectVehicle = (vehicle: SelectedVehiclePayload) => {
    const veh = {
      name: vehicle.name,
      length_cm: vehicle.length_cm,
      width_cm: vehicle.width_cm,
      height_cm: vehicle.height_cm,
      max_weight_kg: vehicle.max_weight_kg,
      selected_quantity: vehicle.selected_quantity,
    }
    addSelectedVehicle(veh)
    closeVehicleModal()
  }

  const removeVehicle = (index: number) => {
    removeSelectedVehicle(index)
  }

  return (
    <section className="vehicle-section">
      <div className="VehicleSection-header">
        <div>
          <p className="eyebrow VehicleSection-eyebrow">Vehicle Details</p>
          <h2>Select the Vehicle</h2>
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
              <th>Vehicle Name</th>
              <th>Length (cm)</th>
              <th>Height (cm)</th>
              <th>Width (cm)</th>
              <th>Max Weight (kg)</th>
              <th>Quantity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {selectedVehicles.length > 0 ? (
              selectedVehicles.map((vehicle, index) => (
                <tr key={index}>
                  <td>{vehicle.name}</td>
                  <td>{vehicle.length_cm}</td>
                  <td>{vehicle.height_cm}</td>
                  <td>{vehicle.width_cm}</td>
                  <td>{vehicle.max_weight_kg}</td>
                  <td>{vehicle.selected_quantity}</td>
                  <td>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeVehicle(index)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center">No vehicles selected</td>
              </tr>
            )}
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
