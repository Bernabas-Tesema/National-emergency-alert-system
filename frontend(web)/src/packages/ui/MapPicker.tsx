import { useEffect, useState, useId } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polygon,
  Rectangle,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Layers, Square, Circle as CircleIcon, Hexagon, Compass, Satellite, Map } from 'lucide-react'

// Fix default leaflet marker icon issue in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export interface RegionReference {
  region: string
  zone?: string
  subcity?: string
}

export interface GeoJsonFeature {
  type: 'Feature'
  geometry: {
    type: 'Polygon' | 'Point'
    coordinates: any
  }
  properties: {
    shape: 'polygon' | 'circle' | 'rectangle' | 'administrative'
    regionRef: RegionReference
    radiusMeters?: number
    severity?: 'low' | 'medium' | 'high' | 'critical'
  }
}

export interface MapLayer {
  id: string
  name: string
  feature: GeoJsonFeature
  color?: string
}

export interface MapPickerProps {
  value?: GeoJsonFeature | null
  onChange?: (val: GeoJsonFeature) => void
  readOnly?: boolean
  layers?: MapLayer[]
  height?: string | number
  className?: string
  defaultTileMode?: MapTileMode
}

export type MapTileMode = 'dark' | 'satellite' | 'streets'

export const BASEMAP_TILES: Record<
  MapTileMode,
  {
    name: string
    url: string
    attribution: string
    maxZoom?: number
    maxNativeZoom?: number
    overlayUrl?: string
    overlayAttribution?: string
  }
> = {
  dark: {
    name: 'Dark Ops',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 19,
    maxNativeZoom: 16,
    overlayUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  },
  satellite: {
    name: 'Satellite Aerial',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    maxNativeZoom: 18,
    overlayUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
  streets: {
    name: 'Streets / Admin',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
}

// Ethiopian Regional and Subcity hierarchy
const REGIONS_DATA: Record<
  string,
  { center: [number, number]; zones: Record<string, { center: [number, number]; subcities: string[] }> }
> = {
  'Addis Ababa': {
    center: [9.02, 38.76],
    zones: {
      'Addis Ababa Metro': {
        center: [9.02, 38.76],
        subcities: [
          'Bole',
          'Yeka',
          'Kirkos',
          'Arada',
          'Addis Ketema',
          'Lideta',
          'Gulele',
          'Akaky Kaliti',
          'Nifas Silk-Lafto',
          'Kolfe Keranio',
          'Lemi Kura',
        ],
      },
    },
  },
  'Oromia': {
    center: [8.54, 39.27],
    zones: {
      'East Shewa': { center: [8.55, 39.28], subcities: ['Adama', 'Bishoftu', 'Mojo'] },
      'Finfinne Special': { center: [9.05, 38.65], subcities: ['Burayu', 'Sululta', 'Sebeta'] },
      'Jimma Zone': { center: [7.67, 36.83], subcities: ['Jimma City'] },
    },
  },
  'Amhara': {
    center: [11.59, 37.39],
    zones: {
      'South Gondar': { center: [11.85, 38.0], subcities: ['Debre Tabor'] },
      'Bahir Dar Special': { center: [11.59, 37.39], subcities: ['Bahir Dar City'] },
      'North Gondar': { center: [12.6, 37.47], subcities: ['Gondar City'] },
      'South Wollo': { center: [11.13, 39.63], subcities: ['Dessie City'] },
    },
  },
  'Tigray': {
    center: [13.49, 39.47],
    zones: {
      'Mekelle Special': { center: [13.49, 39.47], subcities: ['Mekelle City'] },
      'North Western': { center: [14.1, 38.29], subcities: ['Shire (Inda Selassie)'] },
    },
  },
  'Sidama': {
    center: [7.05, 38.47],
    zones: {
      'Hawassa Metro': { center: [7.05, 38.47], subcities: ['Hawassa City', 'Menaheria', 'Tabor'] },
    },
  },
  'Dire Dawa': {
    center: [9.59, 41.86],
    zones: {
      'Dire Dawa City Admin': { center: [9.59, 41.86], subcities: ['Sabian', 'Gende Kore', 'Megala'] },
    },
  },
  'Somali': {
    center: [9.35, 42.8],
    zones: {
      'Jigjiga': { center: [9.35, 42.8], subcities: ['Jigjiga City'] },
    },
  },
  'Afar': {
    center: [11.79, 41.0],
    zones: {
      'Zone 1 (Awsi Rasu)': { center: [11.79, 41.0], subcities: ['Semera City', 'Asaita'] },
    },
  },
  'Harari': {
    center: [9.31, 42.13],
    zones: {
      'Harar Jugol & Metro': { center: [9.31, 42.13], subcities: ['Harar Old City', 'Amir Nur'] },
    },
  },
  'Benishangul-Gumuz': {
    center: [10.07, 34.54],
    zones: {
      'Asosa Zone': { center: [10.07, 34.54], subcities: ['Asosa City'] },
    },
  },
  'Gambela': {
    center: [8.25, 34.59],
    zones: {
      'Gambela Special': { center: [8.25, 34.59], subcities: ['Gambela Town'] },
    },
  },
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, 12, { duration: 1.2 })
  }, [center, map])
  return null
}

export function MapPicker({
  value,
  onChange,
  readOnly = false,
  layers = [],
  height = '360px',
  className = '',
  defaultTileMode = 'dark',
}: MapPickerProps) {
  const [selectedRegion, setSelectedRegion] = useState(value?.properties.regionRef.region || 'Addis Ababa')
  const [selectedZone, setSelectedZone] = useState(value?.properties.regionRef.zone || 'Addis Ababa Metro')
  const [selectedSubcity, setSelectedSubcity] = useState(value?.properties.regionRef.subcity || 'Bole')
  const [drawMode, setDrawMode] = useState<'administrative' | 'circle' | 'rectangle' | 'polygon'>('administrative')
  const [tileMode, setTileMode] = useState<MapTileMode>(defaultTileMode)
  const [center, setCenter] = useState<[number, number]>(
    value?.geometry.type === 'Point'
      ? (value.geometry.coordinates as [number, number])
      : [9.02, 38.76],
  )
  const radius = value?.properties.radiusMeters || 2500

  // Update center when selections change
  useEffect(() => {
    const regData = REGIONS_DATA[selectedRegion]
    if (regData) {
      const zoneData = regData.zones[selectedZone] || Object.values(regData.zones)[0]
      if (zoneData) {
        setCenter(zoneData.center)
      }
    }
  }, [selectedRegion, selectedZone])

  // Emit updated GeoJSON when state changes in interactive mode
  const triggerChange = (
    shape: 'administrative' | 'circle' | 'rectangle' | 'polygon',
    customCenter = center,
    customRadius = radius,
  ) => {
    if (readOnly || !onChange) return

    const [lat, lng] = customCenter
    let coordinates: any = [lat, lng]

    if (shape === 'circle' || shape === 'administrative') {
      coordinates = [lat, lng]
    } else if (shape === 'rectangle') {
      const delta = customRadius / 111320
      coordinates = [
        [
          [lat - delta, lng - delta],
          [lat + delta, lng - delta],
          [lat + delta, lng + delta],
          [lat - delta, lng + delta],
          [lat - delta, lng - delta],
        ],
      ]
    } else if (shape === 'polygon') {
      const delta = customRadius / 111320
      coordinates = [
        [
          [lat, lng + delta * 1.2],
          [lat + delta, lng + delta * 0.6],
          [lat + delta * 0.8, lng - delta * 0.8],
          [lat - delta * 0.8, lng - delta * 0.8],
          [lat - delta, lng + delta * 0.6],
          [lat, lng + delta * 1.2],
        ],
      ]
    }

    const feature: GeoJsonFeature = {
      type: 'Feature',
      geometry: {
        type: shape === 'circle' || shape === 'administrative' ? 'Point' : 'Polygon',
        coordinates,
      },
      properties: {
        shape,
        regionRef: {
          region: selectedRegion,
          zone: selectedZone,
          subcity: selectedSubcity,
        },
        radiusMeters: customRadius,
      },
    }

    onChange(feature)
  }

  const regionId = useId()
  const zoneId = useId()
  const subcityId = useId()

  const availableZones = Object.keys(REGIONS_DATA[selectedRegion]?.zones || {})
  const availableSubcities = REGIONS_DATA[selectedRegion]?.zones[selectedZone]?.subcities || []

  return (
    <div className={`flex flex-col rounded-lg border border-[#1b2e34] bg-[#111d21] overflow-hidden ${className}`}>
      {/* Controls Bar (shown when not strictly read-only) */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2e34] bg-[#0c1417]/80 p-3">
          {/* Cascading dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-teal-400 font-semibold tracking-wider uppercase">
              <Compass className="w-3.5 h-3.5" />
              Area Target
            </div>

            <select
              id={regionId}
              aria-label="Target Region"
              value={selectedRegion}
              onChange={(e) => {
                const reg = e.target.value
                setSelectedRegion(reg)
                const zones = Object.keys(REGIONS_DATA[reg]?.zones || {})
                const firstZone = zones[0] || ''
                setSelectedZone(firstZone)
                const subs = REGIONS_DATA[reg]?.zones[firstZone]?.subcities || []
                setSelectedSubcity(subs[0] || '')
                triggerChange(drawMode)
              }}
              className="rounded bg-[#162327] border border-[#1b2e34] px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {Object.keys(REGIONS_DATA).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              id={zoneId}
              aria-label="Target Zone"
              value={selectedZone}
              onChange={(e) => {
                setSelectedZone(e.target.value)
                const subs = REGIONS_DATA[selectedRegion]?.zones[e.target.value]?.subcities || []
                setSelectedSubcity(subs[0] || '')
                triggerChange(drawMode)
              }}
              className="rounded bg-[#162327] border border-[#1b2e34] px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {availableZones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>

            {availableSubcities.length > 0 && (
              <select
                id={subcityId}
                aria-label="Target Sub-city / Woreda"
                value={selectedSubcity}
                onChange={(e) => {
                  setSelectedSubcity(e.target.value)
                  triggerChange(drawMode)
                }}
                className="rounded bg-[#162327] border border-[#1b2e34] px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              >
                {availableSubcities.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Shape tools */}
          <div className="flex items-center gap-1 bg-[#162327] p-0.5 rounded border border-[#1b2e34]">
            <button
              type="button"
              onClick={() => {
                setDrawMode('administrative')
                triggerChange('administrative')
              }}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                drawMode === 'administrative' ? 'bg-[#133e42] text-teal-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Administrative Boundary"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawMode('circle')
                triggerChange('circle')
              }}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                drawMode === 'circle' ? 'bg-[#133e42] text-teal-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Broadcast Circle Buffer"
            >
              <CircleIcon className="w-3.5 h-3.5" />
              <span>Circle</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawMode('rectangle')
                triggerChange('rectangle')
              }}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                drawMode === 'rectangle' ? 'bg-[#133e42] text-teal-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Bounding Box"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Box</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawMode('polygon')
                triggerChange('polygon')
              }}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                drawMode === 'polygon' ? 'bg-[#133e42] text-teal-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Hazard Polygon"
            >
              <Hexagon className="w-3.5 h-3.5" />
              <span>Polygon</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Map Viewport */}
      <div style={{ height }} className="relative w-full bg-[#0a0f12]">
        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom={!readOnly}
          style={{ height: '100%', width: '100%', background: '#09181b' }}
        >
          <RecenterMap center={center} />
          
          {/* Multi-layer Basemaps (ESRI Dark Gray Canvas, ESRI Satellite Aerial, OpenStreetMap) */}
          <TileLayer
            key={tileMode}
            attribution={BASEMAP_TILES[tileMode].attribution}
            url={BASEMAP_TILES[tileMode].url}
            maxZoom={BASEMAP_TILES[tileMode].maxZoom}
            maxNativeZoom={BASEMAP_TILES[tileMode].maxNativeZoom}
          />
          {BASEMAP_TILES[tileMode].overlayUrl && (
            <TileLayer
              key={`${tileMode}-overlay`}
              attribution={BASEMAP_TILES[tileMode].overlayAttribution || ''}
              url={BASEMAP_TILES[tileMode].overlayUrl!}
              maxZoom={BASEMAP_TILES[tileMode].maxZoom}
              maxNativeZoom={BASEMAP_TILES[tileMode].maxNativeZoom}
            />
          )}

          {/* Active Shape Geometry */}
          <Marker position={center} />

          {drawMode === 'circle' && (
            <Circle
              center={center}
              radius={radius}
              pathOptions={{
                color: '#2dd4bf',
                fillColor: '#133e42',
                fillOpacity: 0.35,
                weight: 2,
              }}
            />
          )}

          {drawMode === 'rectangle' && (
            <Rectangle
              bounds={[
                [center[0] - radius / 111320, center[1] - radius / 111320],
                [center[0] + radius / 111320, center[1] + radius / 111320],
              ]}
              pathOptions={{
                color: '#f97316',
                fillColor: '#3d2614',
                fillOpacity: 0.35,
                weight: 2,
              }}
            />
          )}

          {drawMode === 'polygon' && (
            <Polygon
              positions={[
                [center[0], center[1] + (radius / 111320) * 1.2],
                [center[0] + radius / 111320, center[1] + (radius / 111320) * 0.6],
                [center[0] + (radius / 111320) * 0.8, center[1] - (radius / 111320) * 0.8],
                [center[0] - (radius / 111320) * 0.8, center[1] - (radius / 111320) * 0.8],
                [center[0] - radius / 111320, center[1] + (radius / 111320) * 0.6],
              ]}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#3b1418',
                fillOpacity: 0.35,
                weight: 2,
              }}
            />
          )}

          {/* Additional Multi-layer Rendering (e.g. for situational awareness) */}
          {layers.map((layer) => {
            const feat = layer.feature
            const layerColor = layer.color || '#3b82f6'
            if (feat.geometry.type === 'Point') {
              return (
                <Circle
                  key={layer.id}
                  center={feat.geometry.coordinates as [number, number]}
                  radius={feat.properties.radiusMeters || 1500}
                  pathOptions={{ color: layerColor, fillOpacity: 0.25 }}
                />
              )
            }
            return (
              <Polygon
                key={layer.id}
                positions={feat.geometry.coordinates[0]}
                pathOptions={{ color: layerColor, fillOpacity: 0.25 }}
              />
            )
          })}
        </MapContainer>

        {/* Floating Basemap Layer Switcher (Top Right) */}
        <div className="absolute top-2 right-2 z-[400] flex items-center bg-[#0c1417]/90 backdrop-blur-md border border-[#1b2e34] rounded-md p-1 shadow-xl">
          <button
            type="button"
            onClick={() => setTileMode('dark')}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
              tileMode === 'dark'
                ? 'bg-[#133e42] text-teal-300 font-semibold shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#162327]'
            }`}
            title="Dark Ops Basemap (Crisis Command Console)"
            aria-label="Dark Ops Basemap"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dark Ops</span>
          </button>
          <button
            type="button"
            onClick={() => setTileMode('satellite')}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
              tileMode === 'satellite'
                ? 'bg-[#133e42] text-teal-300 font-semibold shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#162327]'
            }`}
            title="High-Resolution ESRI Satellite Aerial with City & Street Labels"
            aria-label="Satellite Aerial Basemap"
          >
            <Satellite className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Satellite</span>
          </button>
          <button
            type="button"
            onClick={() => setTileMode('streets')}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
              tileMode === 'streets'
                ? 'bg-[#133e42] text-teal-300 font-semibold shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#162327]'
            }`}
            title="OpenStreetMap Streets and Administrative Boundaries"
            aria-label="Streets Basemap"
          >
            <Map className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Streets</span>
          </button>
        </div>

        {/* Read-only overlay badge */}
        {readOnly && (
          <div className="absolute top-2 left-2 z-[400] bg-[#0c1417]/90 border border-[#1b2e34] px-2.5 py-1 rounded text-xs text-teal-300 font-medium flex items-center gap-1.5 shadow-md">
            <Compass className="w-3.5 h-3.5 text-teal-400" />
            <span>
              {selectedRegion} &bull; {selectedZone} {selectedSubcity ? `(${selectedSubcity})` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default MapPicker
