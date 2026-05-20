import { createContext, useEffect, useContext, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

const LOAD_TYPE_BOX = 0
const LOAD_TYPE_BARREL = 1
const LOAD_TYPE_PIPE = 2

type LoadType = typeof LOAD_TYPE_BOX | typeof LOAD_TYPE_BARREL | typeof LOAD_TYPE_PIPE

export type LoadItem = {
  id: number
  name: string
  load_type: LoadType
  length: number
  height: number
  width: number
  diameter: number
  weight: number
  quantity: number
  rotate_freely: boolean
  stack: boolean
  max_stack_weight: number
  arrange_on_floor: boolean
  // destination: string
}

const parseNumber = (value: unknown, defaultValue = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : defaultValue
  }
  return defaultValue
}

const parseBoolean = (value: unknown, defaultValue = false): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true
    if (['false', '0', 'no', 'n'].includes(normalized)) return false
  }
  return defaultValue
}

const normalizeLoadType = (value: unknown): LoadType => {
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
    return { ...load, length: 0, width: 0 }
  }
  if (load.load_type === LOAD_TYPE_PIPE) {
    return { ...load, height: 0, width: 0 }
  }
  return { ...load, diameter: 0 }
}

const createEmptyLoad = (id: number): LoadItem => ({
  id,
  name: '',
  load_type: LOAD_TYPE_BOX,
  length: 0,
  height: 0,
  width: 0,
  diameter: 0,
  weight: 0,
  quantity: 1,
  rotate_freely: false,
  stack: false,
  max_stack_weight: 0,
  arrange_on_floor: false,
  // destination: '',
})

const LOADS_STORAGE_KEY = 'goodloading.loads'

const createInitialLoads = () => {
  if (typeof window === 'undefined') return [createEmptyLoad(1)]

  const storedLoads = window.localStorage.getItem(LOADS_STORAGE_KEY)
  if (!storedLoads) return [createEmptyLoad(1)]

  try {
    const parsedLoads = JSON.parse(storedLoads) as unknown
    if (!Array.isArray(parsedLoads) || parsedLoads.length === 0) {
      return [createEmptyLoad(1)]
    }

    const normalizedLoads = parsedLoads
      .map((item, index) => {
        if (typeof item !== 'object' || item === null) {
          return createEmptyLoad(Date.now() + index)
        }

        const record = item as Record<string, unknown>
        const normalized: LoadItem = {
          id: parseNumber(record.id, Date.now() + index),
          name: String(record.name ?? ''),
          load_type: normalizeLoadType(record.load_type),
          length: parseNumber(record.length),
          height: parseNumber(record.height),
          width: parseNumber(record.width),
          diameter: parseNumber(record.diameter),
          weight: parseNumber(record.weight),
          quantity: Math.max(1, parseNumber(record.quantity, 1)),
          rotate_freely: parseBoolean(record.rotate_freely, false),
          stack: parseBoolean(record.stack, false),
          max_stack_weight: parseNumber(record.max_stack_weight),
          arrange_on_floor: parseBoolean(record.arrange_on_floor, false),
        }

        return sanitizeLoadByType(normalized)
      })
      .filter((load) => Number.isFinite(load.id))

    return normalizedLoads.length > 0 ? normalizedLoads : [createEmptyLoad(1)]
  } catch {
    return [createEmptyLoad(1)]
  }
}

type LoadsContextValue = {
  loads: LoadItem[]
  setLoads: Dispatch<SetStateAction<LoadItem[]>>
  addLoadRow: () => void
  removeLoadRow: (id: number) => void
}

const LoadsContext = createContext<LoadsContextValue | null>(null)

type LoadsProviderProps = {
  children: ReactNode
}

export function LoadsProvider({ children }: LoadsProviderProps) {
  const [loads, setLoads] = useState<LoadItem[]>(createInitialLoads)

  useEffect(() => {
    window.localStorage.setItem(LOADS_STORAGE_KEY, JSON.stringify(loads))
  }, [loads])

  const addLoadRow = () => {
    setLoads((previous) => [...previous, createEmptyLoad(Date.now())])
  }

  const removeLoadRow = (id: number) => {
    setLoads((previous) => {
      // if (previous.length === 1) return previous
      return previous.filter((item) => item.id !== id)
    })
  }

  return (
    <LoadsContext.Provider value={{ loads, setLoads, addLoadRow, removeLoadRow }}>
      {children}
    </LoadsContext.Provider>
  )
}

export function useLoadsContext() {
  const context = useContext(LoadsContext)
  if (!context) {
    throw new Error('useLoadsContext must be used within LoadsProvider')
  }
  return context
}
