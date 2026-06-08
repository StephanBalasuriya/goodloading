import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { vehiclesApiUrl } from './config/api'
import { useAuth } from './context/AuthContext'
import './VehiclesPage.css'

type Vehicle = {
  id: number
  name: string
  length_cm: number
  height_cm: number
  width_cm: number
  max_weight_kg: number
  quantity: number
  created_at?: string
  updated_at?: string
}

type VehicleFormData = {
  name: string
  length_cm: string
  width_cm: string
  height_cm: string
  max_weight_kg: string
  quantity: string
}

const emptyForm: VehicleFormData = {
  name: '',
  length_cm: '',
  width_cm: '',
  height_cm: '',
  max_weight_kg: '',
  quantity: '1',
}

function VehiclesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'organization'
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<VehicleFormData>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchVehicles = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('stack360_token')
      const response = await fetch(vehiclesApiUrl('/vehicles/'), {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) {
        throw new Error(`Failed to load vehicles (${response.status})`)
      }
      const data = await response.json()
      setVehicles(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchVehicles()
  }, [])

  const openAddModal = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (vehicle: Vehicle) => {
    setEditingId(vehicle.id)
    setFormData({
      name: vehicle.name,
      length_cm: String(vehicle.length_cm),
      width_cm: String(vehicle.width_cm),
      height_cm: String(vehicle.height_cm),
      max_weight_kg: String(vehicle.max_weight_kg),
      quantity: String(vehicle.quantity),
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleInputChange = (field: keyof VehicleFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const payload = {
      name: formData.name.trim(),
      length_cm: Number(formData.length_cm),
      width_cm: Number(formData.width_cm),
      height_cm: Number(formData.height_cm),
      max_weight_kg: Number(formData.max_weight_kg),
      quantity: Number(formData.quantity),
    }

    if (!payload.name) {
      setFormError('Vehicle name is required.')
      return
    }

    const numericFields = [
      payload.length_cm,
      payload.width_cm,
      payload.height_cm,
      payload.max_weight_kg,
      payload.quantity,
    ]

    if (numericFields.some((val) => !Number.isFinite(val) || val <= 0)) {
      setFormError('All dimensions, weight, and quantity must be positive numbers.')
      return
    }

    setSubmitting(true)
    try {
      const isUpdate = editingId !== null
      const url = isUpdate
        ? vehiclesApiUrl(`/vehicles/${editingId}`)
        : vehiclesApiUrl('/vehicles/')

      const token = localStorage.getItem('stack360_token')
      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to save vehicle')
      }

      setIsModalOpen(false)
      await fetchVehicles()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred while saving.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return
    }

    try {
      const token = localStorage.getItem('stack360_token')
      const response = await fetch(vehiclesApiUrl(`/vehicles/${id}`), {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to delete vehicle')
      }

      await fetchVehicles()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred while deleting.')
    }
  }

  return (
    <div className="vehicles-page">
      <header className="vehicles-hero">
        <div className="hero-content">
          <p className="eyebrow">Fleet Management</p>
          <h1>Vehicle Fleet Database</h1>
          <p className="hero-description">
            Add, update, or remove vehicles from your organization's active logistics fleet. These dimensions will be available for quick load space optimization.
          </p>
          {isAdmin && (
            <button onClick={openAddModal} className="btn-add-vehicle">
              <Plus className="icon" /> Add New Vehicle
            </button>
          )}
        </div>
      </header>

      <main className="vehicles-main">
        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading vehicle database...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state">
            <h3>No Vehicles Configured</h3>
            <p>Your fleet database is empty. Click "Add New Vehicle" to get started.</p>
          </div>
        ) : (
          <div className="vehicles-grid">
            {vehicles.map((v) => (
              <div key={v.id} className="vehicle-card-premium">
                <div className="card-header">
                  <h3>{v.name}</h3>
                  <span className="qty-tag">{v.quantity} in fleet</span>
                </div>
                <div className="specs-body">
                  <div className="spec-item">
                    <span className="label">Length</span>
                    <span className="value">{v.length_cm} cm</span>
                  </div>
                  <div className="spec-item">
                    <span className="label">Width</span>
                    <span className="value">{v.width_cm} cm</span>
                  </div>
                  <div className="spec-item">
                    <span className="label">Height</span>
                    <span className="value">{v.height_cm} cm</span>
                  </div>
                  <div className="spec-item">
                    <span className="label">Max Payload</span>
                    <span className="value highlighted">{v.max_weight_kg} kg</span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="card-actions">
                    <button onClick={() => openEditModal(v)} className="btn-action edit" aria-label="Edit vehicle">
                      <Pencil className="icon" /> Edit
                    </button>
                    <button onClick={() => handleDelete(v.id)} className="btn-action delete" aria-label="Delete vehicle">
                      <Trash2 className="icon" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-container-premium">
            <button onClick={() => setIsModalOpen(false)} className="btn-close-modal" aria-label="Close modal">
              <X />
            </button>
            <h2>{editingId ? 'Edit Vehicle Spec' : 'Add Vehicle to Fleet'}</h2>
            {formError && <p className="form-error-msg">{formError}</p>}
            <form onSubmit={handleSubmit} className="modal-form-grid">
              <div className="form-field full-width">
                <label htmlFor="name">Vehicle Name / Label</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Standard 40ft Container, Box Truck A"
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="length">Length (cm)</label>
                <input
                  type="number"
                  id="length"
                  value={formData.length_cm}
                  onChange={(e) => handleInputChange('length_cm', e.target.value)}
                  placeholder="e.g. 1200"
                  required
                  min="1"
                />
              </div>
              <div className="form-field">
                <label htmlFor="width">Width (cm)</label>
                <input
                  type="number"
                  id="width"
                  value={formData.width_cm}
                  onChange={(e) => handleInputChange('width_cm', e.target.value)}
                  placeholder="e.g. 235"
                  required
                  min="1"
                />
              </div>
              <div className="form-field">
                <label htmlFor="height">Height (cm)</label>
                <input
                  type="number"
                  id="height"
                  value={formData.height_cm}
                  onChange={(e) => handleInputChange('height_cm', e.target.value)}
                  placeholder="e.g. 269"
                  required
                  min="1"
                />
              </div>
              <div className="form-field">
                <label htmlFor="payload">Max Payload Capacity (kg)</label>
                <input
                  type="number"
                  id="payload"
                  value={formData.max_weight_kg}
                  onChange={(e) => handleInputChange('max_weight_kg', e.target.value)}
                  placeholder="e.g. 24000"
                  required
                  min="1"
                />
              </div>
              <div className="form-field full-width">
                <label htmlFor="quantity">Quantity in Fleet</label>
                <input
                  type="number"
                  id="quantity"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  required
                  min="1"
                />
              </div>
              <div className="form-actions-full">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary-modal">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary-modal">
                  {submitting ? 'Saving...' : editingId ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default VehiclesPage
