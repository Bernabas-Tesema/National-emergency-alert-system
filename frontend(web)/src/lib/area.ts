import type { AreaSelection } from '@/types/area'

export const EMPTY_AREA: AreaSelection = { regionId: null, points: [] }

// An area counts as chosen if a sub-city is picked or a polygon has 3+ corners.
export function isAreaSelected(area: AreaSelection): boolean {
  return area.regionId !== null || area.points.length >= 3
}