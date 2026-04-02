import { createContext, useContext, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

export type LoadSpaceVehicle = {
  id: number
  name: string
  length_cm: number
  height_cm: number
  width_cm: number
  max_weight_kg: number
  quantity: number
  selected_quantity: number
  created_at: string
  updated_at: string
}

type LoadSpaceContextValue = {
  selectedVehicle: LoadSpaceVehicle | null
  setSelectedVehicle: Dispatch<SetStateAction<LoadSpaceVehicle | null>>
}

const LoadSpaceContext = createContext<LoadSpaceContextValue | null>(null)

type LoadSpaceProviderProps = {
  children: ReactNode
}

export function LoadSpaceProvider({ children }: LoadSpaceProviderProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<LoadSpaceVehicle | null>(null)

  return (
    <LoadSpaceContext.Provider value={{ selectedVehicle, setSelectedVehicle }}>
      {children}
    </LoadSpaceContext.Provider>
  )
}

export function useLoadSpace() {
  const context = useContext(LoadSpaceContext)
  if (!context) {
    throw new Error('useLoadSpace must be used within LoadSpaceProvider')
  }
  return context
}