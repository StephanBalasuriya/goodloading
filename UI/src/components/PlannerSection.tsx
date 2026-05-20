import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'

import './PlannerSection.css'
import { useLoadsContext } from '../context/LoadsContext'
import type { LoadItem } from '../context/LoadsContext'

const LOAD_TYPE_BOX = 0
const LOAD_TYPE_BARREL = 1
const LOAD_TYPE_PIPE = 2

const parseNumber = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeLoadType = (value: unknown): LoadItem['load_type'] => {
  if (value === LOAD_TYPE_BOX || value === LOAD_TYPE_BARREL || value === LOAD_TYPE_PIPE) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === '0' || normalized === 'box') return LOAD_TYPE_BOX
    if (normalized === '1' || normalized === 'barrel') return LOAD_TYPE_BARREL
    if (normalized === '2' || normalized === 'pipe') return LOAD_TYPE_PIPE
  }

  if (typeof value === 'number') {
    if (value === 0) return LOAD_TYPE_BOX
    if (value === 1) return LOAD_TYPE_BARREL
    if (value === 2) return LOAD_TYPE_PIPE
  }

  return LOAD_TYPE_BOX
}

const sanitizeLoadByType = (load: LoadItem): LoadItem => {
  if (load.load_type === LOAD_TYPE_BARREL) {
    return { ...load, length: 0, width: 0, rotate_freely: false }
  }
  if (load.load_type === LOAD_TYPE_PIPE) {
    return { ...load, height: 0, width: 0, rotate_freely: false }
  }
  return { ...load, diameter: 0 }
}

const parseBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (!value) return defaultValue
  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true
  if (['false', '0', 'no', 'n'].includes(normalized)) return false
  return defaultValue
}


type PlannerSectionProps = {
  id?: string
}

function PlannerSection({ id = 'start' }: PlannerSectionProps) {
  const [csvMessage, setCsvMessage] = useState('')
  const [csvMessageType, setCsvMessageType] = useState<'success' | 'error' | null>(null)
  const { loads, setLoads, addLoadRow, removeLoadRow } = useLoadsContext()
  const showStackColumns = loads.some((load) => load.stack)

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
    const requiredHeaders = [
      'donumber',
      'load_type',
      'length',
      'height',
      'width',
      'diameter',
      'weight',
      'quantity',
      'stack',
      'max_stack_weight',
      'arrange_on_floor',
      'rotate_freely',
    ]
  const hasAllHeaders = requiredHeaders.every((header) => headers.includes(header))

    // Support common typo from user input files: "hight".
    const heightAliasIndex = headers.indexOf('hight')

    if (!hasAllHeaders && heightAliasIndex === -1) {
      setCsvMessage(
        'CSV headers must include: doNumber,load_type,length,height,width,diameter,weight,quantity,stack,max_stack_weight,arrange_on_floor,rotate_freely',
      )
      setCsvMessageType('error')
      return
    }

    const getFieldIndex = (field: string) => {
     
      return headers.indexOf(field)
    }

    const parsedLoads: LoadItem[] = []
    for (let index = 1; index < lines.length; index += 1) {
      const cols = lines[index].split(',').map((value) => value.trim())
      if (cols.every((value) => value.length === 0)) continue

      const parsedLoad: LoadItem = {
        id: Date.now() + index,
        name: cols[getFieldIndex('donumber')] ?? '',
        load_type: normalizeLoadType(cols[getFieldIndex('load_type')] ?? LOAD_TYPE_BOX),
        length: parseNumber(cols[getFieldIndex('length')] ?? '0'),
        height: parseNumber(cols[getFieldIndex('height')] ?? '0'),
        width: parseNumber(cols[getFieldIndex('width')] ?? '0'),
        diameter: parseNumber(cols[getFieldIndex('diameter')] ?? '0'),
        weight: parseNumber(cols[getFieldIndex('weight')] ?? '0'),
        quantity: Math.max(1, parseNumber(cols[getFieldIndex('quantity')] ?? '1')),
        rotate_freely: parseBoolean(cols[getFieldIndex('rotate_freely')], false),
        stack: parseBoolean(cols[getFieldIndex('stack')], false),
        max_stack_weight: parseNumber(cols[getFieldIndex('max_stack_weight')] ?? '0'),
        arrange_on_floor: parseBoolean(cols[getFieldIndex('arrange_on_floor')], false),
        // destination: cols[getFieldIndex('destination')] ?? '',
      }

      if (!parsedLoad.stack && (parsedLoad.max_stack_weight !== 0 || parsedLoad.arrange_on_floor)) {
        setCsvMessage(`Row ${index }: Non-stackable load cannot have max_stack_weight or arrange_on_floor values.`)
        setCsvMessageType('error')
        event.target.value = ''
        return
      }

      parsedLoads.push(sanitizeLoadByType(parsedLoad))
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
        // if (field === 'destination') {
        //   return { ...item, [field]: String(value) }
        // }
        if (field === 'load_type') {
          const updated = { ...item, load_type: normalizeLoadType(value) }
          return sanitizeLoadByType(updated)
        }
        if (field === 'stack') {
          const nextStack = value === true
          if (!nextStack) {
            return { ...item, stack: false, max_stack_weight: 0, arrange_on_floor: false }
          }
          return { ...item, stack: true }
        }
        if (field === 'arrange_on_floor' || field === 'rotate_freely') {
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
              <th>Load Type</th>
              <th>Length (cm)</th>
              <th>Height (cm)</th>
              <th>Width (cm)</th>
              <th>Diameter (cm)</th>
              <th>Weight (kg)</th>
              <th>Quantity</th>
              <th>Rotate Freely</th>
              <th>Stack</th>
              {showStackColumns && <th>Max Stack Weight</th>}
              {showStackColumns && <th>Arrange on Floor</th>}
              {/* <th>Destination</th> */}
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loads.length === 0 && (
              <tr>
                <td colSpan={showStackColumns ? 14 : 12} className="text-center">
                  No load rows added yet.
                </td>
              </tr>
            )}
            {loads.map((load) => {
              const rowTotal = load.weight * load.quantity
              const isBarrel = load.load_type === LOAD_TYPE_BARREL
              const isPipe = load.load_type === LOAD_TYPE_PIPE
              const isBox = load.load_type === LOAD_TYPE_BOX
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
                    <select
                      value={load.load_type}
                      onChange={(event) => updateLoad(load.id, 'load_type', event.target.value)}
                    >
                      <option value={LOAD_TYPE_BOX}>box</option>
                      <option value={LOAD_TYPE_BARREL}>barrel</option>
                      <option value={LOAD_TYPE_PIPE}>pipe</option>
                    </select>
                  </td>
                  <td className={isBarrel ? 'stack-cell-disabled' : ''}>
                    <input
                      type="number"
                      min="0"
                      value={load.length}
                      disabled={isBarrel}
                      onChange={(event) => updateLoad(load.id, 'length', event.target.value)}
                    />
                  </td>
                  <td className={isPipe ? 'stack-cell-disabled' : ''}>
                    <input
                      type="number"
                      min="0"
                      value={load.height}
                      disabled={isPipe}
                      onChange={(event) => updateLoad(load.id, 'height', event.target.value)}
                    />
                  </td>
                  <td className={isBarrel || isPipe ? 'stack-cell-disabled' : ''}>
                    <input
                      type="number"
                      min="0"
                      value={load.width}
                      disabled={isBarrel || isPipe}
                      onChange={(event) => updateLoad(load.id, 'width', event.target.value)}
                    />
                  </td>
                  <td className={isBox ? 'stack-cell-disabled' : ''}>
                    <input
                      type="number"
                      min="0"
                      value={load.diameter}
                      disabled={isBox}
                      onChange={(event) => updateLoad(load.id, 'diameter', event.target.value)}
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
                      checked={load.rotate_freely}
                      disabled={isBarrel || isPipe}
                      onChange={(event) => updateLoad(load.id, 'rotate_freely', event.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={load.stack}
                      onChange={(event) => updateLoad(load.id, 'stack', event.target.checked)}
                    />
                  </td>
                  {showStackColumns ? (
                    <>
                      <td className={!load.stack ? 'stack-cell-disabled' : ''}>
                        <input
                          type="number"
                          min="0"
                          value={load.max_stack_weight}
                          disabled={!load.stack}
                          onChange={(event) => updateLoad(load.id, 'max_stack_weight', event.target.value)}
                        />
                      </td>
                      <td className={!load.stack ? 'stack-cell-disabled' : ''}>
                        <input
                          type="checkbox"
                          checked={load.arrange_on_floor}
                          disabled={!load.stack}
                          onChange={(event) => updateLoad(load.id, 'arrange_on_floor', event.target.checked)}
                        />
                      </td>
                    </>
                  ) : null}
                  {/* <td>
                        <input
                          type="text"
                          value={load.destination}
                          onChange={(event) => updateLoad(load.id, 'destination', event.target.value)}
                          onBlur={(event) => {
                            void normalizeDestination(load.id, event.target.value)
                          }}
                        />
                      </td> */}

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
