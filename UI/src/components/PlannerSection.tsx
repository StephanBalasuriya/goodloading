import type { ChangeEvent } from 'react'

export type LoadItem = {
  id: number
  name: string
  length: number
  height: number
  width: number
  weight: number
  quantity: number
}

type PlannerSectionProps = {
  loads: LoadItem[]
  totalWeight: number
  csvMessage: string
  addLoadRow: () => void
  importCsvLoads: (event: ChangeEvent<HTMLInputElement>) => void
  updateLoad: (
    id: number,
    field: keyof Omit<LoadItem, 'id'>,
    value: string,
  ) => void
  removeLoadRow: (id: number) => void
}

function PlannerSection({
  loads,
  totalWeight,
  csvMessage,
  addLoadRow,
  importCsvLoads,
  updateLoad,
  removeLoadRow,
}: PlannerSectionProps) {
  return (
    <section id="start" className="planner">
      <div className="planner-head">
        <div>
          <p className="eyebrow planner-eyebrow">Load Details</p>
          <h2>Manual Entry + CSV Import</h2>
        </div>
        <p className="planner-total">Total Weight: {totalWeight.toFixed(2)} kg</p>
      </div>

      <div className="planner-actions">
        <button type="button" className="btn btn-primary" onClick={addLoadRow}>
          Add Load Row
        </button>
        <label className="csv-upload" htmlFor="csv-loads">
          Import CSV (loads)
          <input
            id="csv-loads"
            type="file"
            accept=".csv"
            onChange={importCsvLoads}
          />
        </label>
      </div>

      {csvMessage ? <p className="csv-message">{csvMessage}</p> : null}

      <div className="table-wrap">
        <table className="loads-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Length</th>
              <th>Height</th>
              <th>Width</th>
              <th>Weight</th>
              <th>Quantity</th>
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
    </section>
  )
}

export default PlannerSection
