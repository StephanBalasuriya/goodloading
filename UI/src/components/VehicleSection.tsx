import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'

import './PlannerSection.css'
import { useLoadsContext } from '../context/LoadsContext'
import type { LoadItem } from '../context/LoadsContext'
const parseNumber = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

type PlannerSectionProps = {
  id?: string
}

function VehicleSection({ id = 'start' }: PlannerSectionProps) {
    const [csvMessage, setCsvMessage] = useState('')
  const [csvMessageType, setCsvMessageType] = useState<'success' | 'error' | null>(null)
  const { loads, setLoads, addLoadRow, removeLoadRow } = useLoadsContext()


const importCsvLoads = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 2) {
      setCsvMessage('CSV must include a header row and at least one load row.')
      setCsvMessageType('error')
      return
    }

    const headers = lines[0].toLowerCase().split(',').map((value) => value.trim())
    console.log('CSV Headers:', headers)
    const requiredHeaders = ['donumber', 'length', 'height', 'width', 'weight', 'quantity', 'stack', 'max_stack_weight', 'arrange_on_floor']
    const hasAllHeaders = requiredHeaders.every((header) => headers.includes(header))

    // Support common typo from user input files: "hight".
    const heightAliasIndex = headers.indexOf('hight')

    if (!hasAllHeaders && heightAliasIndex === -1) {
      setCsvMessage('CSV headers must include: doNumber,length,height,width,weight,quantity,stack,max_stack_weight,arrange_on_floor')
      setCsvMessageType('error')
      return
    }

    const getFieldIndex = (field: string) => {
    //   if (field === 'height' && heightAliasIndex !== -1) return heightAliasIndex
      return headers.indexOf(field)
    }

    const parsedLoads: LoadItem[] = []
    for (let index = 1; index < lines.length; index += 1) {
      const cols = lines[index].split(',').map((value) => value.trim())
      if (cols.every((value) => value.length === 0)) continue

      const parsedLoad: LoadItem = {
        id: Date.now() + index,
        name: cols[getFieldIndex('donumber')] ?? '',
        length: parseNumber(cols[getFieldIndex('length')] ?? '0'),
        height: parseNumber(cols[getFieldIndex('height')] ?? '0'),
        width: parseNumber(cols[getFieldIndex('width')] ?? '0'),
        weight: parseNumber(cols[getFieldIndex('weight')] ?? '0'),
        quantity: parseNumber(cols[getFieldIndex('quantity')] ?? '0'),
        stack: cols[getFieldIndex('stack')]?.toLowerCase() === 'true',
        max_stack_weight: parseNumber(cols[getFieldIndex('max_stack_weight')] ?? '0'),
        arrange_on_floor: cols[getFieldIndex('arrange_on_floor')]?.toLowerCase() === 'true',
      }

      if (!parsedLoad.stack && (parsedLoad.max_stack_weight !== 0 || parsedLoad.arrange_on_floor)) {
        setCsvMessage(`Row ${index }: Non-stackable load cannot have max_stack_weight or arrange_on_floor values.`)
        setCsvMessageType('error')
        event.target.value = ''
        return
      }

      parsedLoads.push(parsedLoad)
    }

    if (parsedLoads.length === 0) {
      setCsvMessage('No valid load rows found in CSV.')
      setCsvMessageType('error')
      return
    }

    setLoads(parsedLoads)
    setCsvMessage(`Imported ${parsedLoads.length} load rows from CSV.`)
    setCsvMessageType('success')
    event.target.value = ''
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
  const totalWeight = useMemo(
    () => loads.reduce((sum, item) => sum + item.weight * item.quantity, 0),
    [loads],
  )
  return (
    <section id={id} className="planner">
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

      {csvMessage ? (
        <p className={`csv-message ${csvMessageType === 'success' ? 'csv-message-success' : 'csv-message-error'}`}>
          {csvMessage}
        </p>
      ) : null}

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
              {loads.some((load) => load.stack) && <th>Arrange on Floor</th>} {/* .some() → checks if at least one item matches a condition */}
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
    </section>
  )
}

export default PlannerSection
