import type { LatLngTuple } from '@/types/area'

export interface Region {
  id: string
  name: string
  center: LatLngTuple
}

// PLACEHOLDER DATA: approximate centers of Addis Ababa sub-cities, not
// official boundaries. Replace with real region/zone/sub-city data from
// the backend or the National ID registry when available.
export const REGIONS: Region[] = [
  { id: 'addis-ketema', name: 'Addis Ketema', center: [9.03, 38.73] },
  { id: 'akaky-kaliti', name: 'Akaky Kaliti', center: [8.88, 38.76] },
  { id: 'arada', name: 'Arada', center: [9.04, 38.75] },
  { id: 'bole', name: 'Bole', center: [8.98, 38.76] },
  { id: 'gulele', name: 'Gulele', center: [9.06, 38.72] },
  { id: 'kirkos', name: 'Kirkos', center: [9.0, 38.76] },
  { id: 'kality', name: 'Kality', center: [8.9, 38.77] },
  { id: 'lideta', name: 'Lideta', center: [9.0, 38.73] },
  { id: 'nifas-silk-lafto', name: 'Nifas Silk-Lafto', center: [8.95, 38.73] },
  { id: 'yeka', name: 'Yeka', center: [9.04, 38.8] },
]

// Roughly the middle of Addis Ababa.
export const DEFAULT_CENTER: LatLngTuple = [9.02, 38.76]

export function getRegion(id: string | null): Region | undefined {
  return REGIONS.find((r) => r.id === id)
}