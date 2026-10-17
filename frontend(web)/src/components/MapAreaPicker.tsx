import { useEffect } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { DEFAULT_CENTER, REGIONS, getRegion } from '@/lib/regions'
import type { AreaSelection, LatLngTuple } from '@/types/area'

// Adds a corner each time the user clicks on the map.
function ClickToAddPoints({ onAdd }: { onAdd: (point: LatLngTuple) => void }) {
  useMapEvents({
    click(e) {
      onAdd([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

// Moves the map when the selected sub-city changes.
function FlyTo({ center, zoom }: { center: LatLngTuple; zoom: number }) {
  const map = useMap()
  const [lat, lng] = center
  useEffect(() => {
    map.flyTo([lat, lng], zoom)
  }, [map, lat, lng, zoom])
  return null
}

interface MapAreaPickerProps {
  value: AreaSelection
  onChange: (value: AreaSelection) => void
  readOnly?: boolean // true = just display the area, no editing
}

export default function MapAreaPicker({
  value,
  onChange,
  readOnly = false,
}: MapAreaPickerProps) {
  const region = getRegion(value.regionId)
  const center = region ? region.center : DEFAULT_CENTER
  const zoom = region ? 13 : 11

  function addPoint(point: LatLngTuple) {
    onChange({ ...value, points: [...value.points, point] })
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-9 rounded-md border bg-white px-3 text-sm"
            value={value.regionId ?? ''}
            onChange={(e) =>
              onChange({ ...value, regionId: e.target.value || null })
            }
          >
            <option value="">Select a sub-city (optional)</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={value.points.length === 0}
            onClick={() =>
              onChange({ ...value, points: value.points.slice(0, -1) })
            }
          >
            Undo last point
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={value.points.length === 0}
            onClick={() => onChange({ ...value, points: [] })}
          >
            Clear drawing
          </Button>
        </div>
      )}

      <div className="h-96 overflow-hidden rounded-lg border">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={11}
          className="h-full w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyTo center={center} zoom={zoom} />
          {!readOnly && <ClickToAddPoints onAdd={addPoint} />}

          {value.points.length >= 3 && <Polygon positions={value.points} />}
          {value.points.length === 2 && <Polyline positions={value.points} />}
          {value.points.map((p, i) => (
            <CircleMarker key={i} center={p} radius={5} />
          ))}
        </MapContainer>
      </div>

      {!readOnly && (
        <p className="text-xs text-slate-500">
          {value.points.length === 0 &&
            'Click on the map to draw the affected area, one corner per click.'}
          {value.points.length > 0 &&
            value.points.length < 3 &&
            `${value.points.length} point(s). Add at least 3 corners to form an area.`}
          {value.points.length >= 3 &&
            `Area drawn with ${value.points.length} corners.`}
        </p>
      )}
    </div>
  )
}