const trimTrailingSlash = (value: string) => value.replace(/\/$/, '')

export const API_HANDLE_BASE_URL =
  import.meta.env.VITE_API_HANDLE_BASE_URL ?? 'https://stack360-be.l360.lk'

export const VEHICLES_API_BASE_URL =
  import.meta.env.VITE_VEHICLES_API_BASE_URL ?? API_HANDLE_BASE_URL

export const vehiclesApiUrl = (path: string) => `${trimTrailingSlash(VEHICLES_API_BASE_URL)}${path}`
export const apiHandleUrl = (path: string) => `${trimTrailingSlash(API_HANDLE_BASE_URL)}${path}`
