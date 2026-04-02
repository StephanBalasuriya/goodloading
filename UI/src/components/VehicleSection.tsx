import { useState } from 'react'

import './VehicleSection.css'
import VehicleForm from './VehicleForm'
import type { SelectedVehiclePayload } from './VehicleForm'

function VehicleSection() {
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehiclePayload | null>(null)

  const openVehicleModal = () => {
    setIsVehicleModalOpen(true)
  }

  const closeVehicleModal = () => {
    setIsVehicleModalOpen(false)
  }

  const handleSelectVehicle = (vehicle: SelectedVehiclePayload) => {
    setSelectedVehicle(vehicle)
    closeVehicleModal()
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
            </tr>
          </thead>
          <tbody>
            {selectedVehicle ? (
              <tr>
                <td>{selectedVehicle.name}</td>
                <td>{selectedVehicle.length_cm}</td>
                <td>{selectedVehicle.height_cm}</td>
                <td>{selectedVehicle.width_cm}</td>
                <td>{selectedVehicle.max_weight_kg}</td>
                <td>{selectedVehicle.selected_quantity}</td>
              </tr>
            ) : (
              <tr>
                <td colSpan={6} className="text-center">No vehicle selected</td>
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
