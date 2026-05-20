export const LOAD_COLORS = [
  '#FF6B6B',
  '#d4a849',
  '#c4ce37',
  '#FFA07A',
  '#98D8C8',
  '#986ff7',
  '#ce8fce',
  '#2c8383',
  '#9ef1a9',
  '#093950',
]

export const getLoadColor = (loadId: number) => {
  const index = Math.abs(Math.trunc(loadId)) % LOAD_COLORS.length
  return LOAD_COLORS[index]
}