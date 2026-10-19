// [latitude, longitude]
export type LatLngTuple = [number, number]

export interface AreaSelection {
  regionId: string | null // a named sub-city, or null
  points: LatLngTuple[] // corners of a drawn polygon (needs 3+ to be an area)
}