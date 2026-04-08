import { createContext, useEffect, useContext, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

export type LoadItem = {
  id: number
  name: string
  length: number
  height: number
  width: number
  weight: number
  quantity: number
  stack: boolean
  max_stack_weight: number
  arrange_on_floor: boolean
  destination: string
}

const createEmptyLoad = (id: number): LoadItem => ({
  id,
  name: '',
  length: 0,
  height: 0,
  width: 0,
  weight: 0,
  quantity: 1,
  stack: false,
  max_stack_weight: 0,
  arrange_on_floor: false,
  destination: '',
})

const LOADS_STORAGE_KEY = 'goodloading.loads'

const createInitialLoads = () => {
  if (typeof window === 'undefined') return [createEmptyLoad(1)]

  const storedLoads = window.localStorage.getItem(LOADS_STORAGE_KEY)
  if (!storedLoads) return [createEmptyLoad(1)]

  try {
    const parsedLoads = JSON.parse(storedLoads) as LoadItem[]
    return Array.isArray(parsedLoads) && parsedLoads.length > 0
      ? parsedLoads
      : [createEmptyLoad(1)]
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