export type LoadPlacement = {
  height: number
  length: number
  width: number
  diameter?: number
  loadsPerAxis: { x: number; y: number; z: number }
  position: { x: number; y: number; z: number }
}

export type LoadItem = {
  id: number
  name: string
  placement: LoadPlacement[]
  width: number
  length: number
  height: number
  diameter?: number
  loadType?: number
  weight: number
  quantity: number
  priority: number
  allowToRotate: boolean
  stacking: boolean | number | null
}

export type Stop = {
  id: number
  name: string
  loads: LoadItem[]
  summary?: Summary
}

export type Axis = {
  distanceFromSpaceFront: number
  emptySpaceLoad: number
  maxLoad: number
  addedLoad: number
}

export type Summary = {
  freeLdm?: number
  occupiedLdm?: number
  freeSurface?: number
  occupiedSurface?: number
  freeVolume?: number
  occupiedVolume?: number
  percentLdmUsd?: number
  percentVolumeUsd?: number
  totalLoadsWeight?: number
}

export type LoadingSpacePart = {
  height: number
  length: number
  width: number
  limit: number
  loads?: LoadItem[]
  stops?: Stop[]
  summary?: Summary
  axis?: Axis[]
}

export type LoadingSpace = {
  id: number
  name: string
  type: string
  parts: LoadingSpacePart[]
}

export type NotFittedLoad = {
  id: number
  name: string
  width: number
  length: number
  height: number
  diameter?: number
  loadType?: number
  weight: number
  quantity: number
}

export type OptimizationResponse = {
  loadingSpaces: LoadingSpace[]
  notFittedLoads: NotFittedLoad[]
}
