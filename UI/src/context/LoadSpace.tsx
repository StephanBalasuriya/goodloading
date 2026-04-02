import { createContext, useContext, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

export type SelectedVehicle = {
	name: string
	length_cm: number
	width_cm: number
	height_cm: number
	max_weight_kg: number
	selected_quantity: number
}

type LoadSpaceContextValue = {
	selectedVehicles: SelectedVehicle[]
	setSelectedVehicles: Dispatch<SetStateAction<SelectedVehicle[]>>
	addSelectedVehicle: (vehicle: SelectedVehicle) => void
	removeSelectedVehicle: (index: number) => void
	clearSelectedVehicles: () => void
}

const LoadSpaceContext = createContext<LoadSpaceContextValue | null>(null)

type LoadSpaceProviderProps = {
	children: ReactNode
}

export function LoadSpaceProvider({ children }: LoadSpaceProviderProps) {
	const [selectedVehicles, setSelectedVehicles] = useState<SelectedVehicle[]>([])

	const addSelectedVehicle = (vehicle: SelectedVehicle) => {
		setSelectedVehicles((previous) => [...previous, vehicle])
	}

	const removeSelectedVehicle = (index: number) => {
		setSelectedVehicles((previous) => previous.filter((_, i) => i !== index))
	}

	const clearSelectedVehicles = () => {
		setSelectedVehicles([])
	}

	return (
		<LoadSpaceContext.Provider
			value={{
				selectedVehicles,
				setSelectedVehicles,
				addSelectedVehicle,
				removeSelectedVehicle,
				clearSelectedVehicles,
			}}
		>
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
