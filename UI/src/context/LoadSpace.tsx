import { createContext, useContext, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'


export type LoadSpace = {
  id: number
  name: string
  length_cm: number
  height_cm: number
  width_cm: number
  max_weight_kg: number
  number_of_vehicles: number

}