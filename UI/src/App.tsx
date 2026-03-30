import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import heroImg from './assets/hero.png'
import './App.css'

type LoadItem = {
  id: number
  name: string
  length: number
  height: number
  width: number
  weight: number
  quantity: number
}

const createEmptyLoad = (id: number): LoadItem => ({
  id,
  name: '',
  length: 0,
  height: 0,
  width: 0,
  weight: 0,
  quantity: 1,
})

const parseNumber = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function App() {
  const [loads, setLoads] = useState<LoadItem[]>([createEmptyLoad(1)])
  const [csvMessage, setCsvMessage] = useState('')

  const totalWeight = useMemo(
    () => loads.reduce((sum, item) => sum + item.weight * item.quantity, 0),
    [loads],
  )

  const addLoadRow = () => {
    setLoads((previous) => [...previous, createEmptyLoad(Date.now())])
  }

  const removeLoadRow = (id: number) => {
    setLoads((previous) => {
      if (previous.length === 1) return previous
      return previous.filter((item) => item.id !== id)
    })
  }

  const updateLoad = (
    id: number,
    field: keyof Omit<LoadItem, 'id'>,
    value: string,
  ) => {
    setLoads((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item
        if (field === 'name') {
          return { ...item, [field]: value }
        }
        return { ...item, [field]: parseNumber(value) }
      }),
    )
  }

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
      return
    }

    const headers = lines[0].toLowerCase().split(',').map((value) => value.trim())
    const requiredHeaders = ['name', 'length', 'height', 'width', 'weight', 'quantity']
    const hasAllHeaders = requiredHeaders.every((header) => headers.includes(header))

    // Support common typo from user input files: "hight".
    const heightAliasIndex = headers.indexOf('hight')

    if (!hasAllHeaders && heightAliasIndex === -1) {
      setCsvMessage('CSV headers must include: name,length,height,width,weight,quantity')
      return
    }

    const getFieldIndex = (field: string) => {
      if (field === 'height' && heightAliasIndex !== -1) return heightAliasIndex
      return headers.indexOf(field)
    }

    const parsedLoads: LoadItem[] = []
    for (let index = 1; index < lines.length; index += 1) {
      const cols = lines[index].split(',').map((value) => value.trim())
      if (cols.every((value) => value.length === 0)) continue

      parsedLoads.push({
        id: Date.now() + index,
        name: cols[getFieldIndex('name')] ?? '',
        length: parseNumber(cols[getFieldIndex('length')] ?? '0'),
        height: parseNumber(cols[getFieldIndex('height')] ?? '0'),
        width: parseNumber(cols[getFieldIndex('width')] ?? '0'),
        weight: parseNumber(cols[getFieldIndex('weight')] ?? '0'),
        quantity: parseNumber(cols[getFieldIndex('quantity')] ?? '0'),
      })
    }

    if (parsedLoads.length === 0) {
      setCsvMessage('No valid load rows found in CSV.')
      return
    }

    setLoads(parsedLoads)
    setCsvMessage(`Imported ${parsedLoads.length} load rows from CSV.`)
    event.target.value = ''
  }

  const scrollToPlanner = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    document.getElementById('start')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Goodloading Platform</p>
          <h1>Plan Every Load Like It Already Happened</h1>
          <p className="hero-text">
            A logistics planning interface for teams that need precision, speed,
            and fewer surprises in the loading bay.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" onClick={scrollToPlanner}>
              Start Planning
            </a>
            {/* <a className="btn btn-ghost" href="#workflow">
              View Workflow
            </a> */}
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit" />
          <img src={heroImg} alt="Goodloading visual" />
        </div>
      </header>

      <main>
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

      </main>
    </div>
  )
}

export default App
