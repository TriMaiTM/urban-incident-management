'use client'

import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Box, Minus, Navigation, Plus } from 'lucide-react'
import { EmptyState, ErrorState, cn, ic, type DataState, type Level } from './primitives'
import { MapPin } from 'lucide-react'
import districtsGeoJsonRaw from '../data/danang_districts_boundary.json'
import { apiListZones, type ApiZoneOut } from '../lib/backend-api'

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs')
}

const GOONG_MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY?.trim() || ''
const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() || ''

const DANANG_CENTER: [number, number] = [108.212, 16.062]
const DANANG_ZONES_CENTER: [number, number] = [108.115, 16.055]
const DANANG_MAX_BOUNDS: [[number, number], [number, number]] = [
  [107.72, 15.82],
  [108.48, 16.32],
]

/**
 * Convert legacy 0-100 (x, y) urban coordinates to real WGS84 [lng, lat] in Da Nang.
 */
export function xyToLngLat(x: number, y: number): [number, number] {
  const lng = +(108.12 + (x / 100) * 0.18).toFixed(6)
  const lat = +(16.13 - (y / 100) * 0.12).toFixed(6)
  return [lng, lat]
}

/**
 * Convert real WGS84 [lng, lat] to legacy 0-100 (x, y) coordinates.
 */
export function lngLatToXY(lng: number, lat: number): { x: number; y: number } {
  const x = +(((lng - 108.12) / 0.18) * 100).toFixed(2)
  const y = +(((16.13 - lat) / 0.12) * 100).toFixed(2)
  return { x, y }
}

/**
 * Ray-casting point-in-polygon check for GeoJSON Polygon / MultiPolygon in [lng, lat].
 */
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

let cachedLiveZones: ApiZoneOut[] | null = null
let liveZonesPromise: Promise<ApiZoneOut[] | null> | null = null
export const ZONES_UPDATED_EVENT = 'urbana-zones-updated'

export async function ensureLiveZonesLoaded(force = false): Promise<ApiZoneOut[] | null> {
  if (!force && cachedLiveZones) return cachedLiveZones
  if (!force && liveZonesPromise) return liveZonesPromise
  liveZonesPromise = apiListZones()
    .then((zs) => {
      cachedLiveZones = zs
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(ZONES_UPDATED_EVENT))
      }
      return zs
    })
    .catch(() => cachedLiveZones)
    .finally(() => {
      liveZonesPromise = null
    })
  return liveZonesPromise
}

export function invalidateLiveZonesCache(nextZones?: ApiZoneOut[]): void {
  if (nextZones) {
    cachedLiveZones = nextZones
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(ZONES_UPDATED_EVENT))
    }
    return
  }
  cachedLiveZones = null
  void ensureLiveZonesLoaded(true)
}

export function findDistrictAtLngLat(
  lng: number,
  lat: number,
  customZones?: { id: string; name: string; on: boolean; geometry: GeoJSON.Geometry }[],
): { id: string; name: string; on: boolean } | null {
  const list =
    customZones ??
    (districtsGeoJsonRaw.features as unknown as Array<{
      properties: { zone_id: string; name: string; is_active?: boolean }
      geometry: GeoJSON.Geometry
    }>).map((f) => {
      const zid = String(f.properties.zone_id ?? '').toUpperCase()
      const live = cachedLiveZones?.find((lz) => lz.id.toUpperCase() === zid)
      return {
        id: zid.toLowerCase(),
        name: live?.name ?? f.properties.name,
        on: live ? live.is_active : f.properties.is_active !== false,
        geometry: (live?.geojson_geometry as unknown as GeoJSON.Geometry) ?? f.geometry,
      }
    })

  for (const z of list) {
    const g = z.geometry
    if (!g) continue
    if (g.type === 'Polygon') {
      if (pointInRing(lng, lat, g.coordinates[0])) return { id: z.id, name: z.name, on: z.on }
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) {
        if (pointInRing(lng, lat, poly[0])) return { id: z.id, name: z.name, on: z.on }
      }
    }
  }
  return null
}

const LOCAL_DANANG_STREETS: { lng: number; lat: number; street: string; ward: string; district: string }[] = [
  { lng: 108.2208, lat: 16.0712, street: '124 Lê Duẩn', ward: 'Thạch Thang', district: 'Hải Châu' },
  { lng: 108.2242, lat: 16.0685, street: '36 Bạch Đằng', ward: 'Hải Châu 1', district: 'Hải Châu' },
  { lng: 108.2165, lat: 16.0605, street: '254 Nguyễn Văn Linh', ward: 'Thạc Gián', district: 'Hải Châu' },
  { lng: 108.2215, lat: 16.0468, street: '180 Đường 2 Tháng 9', ward: 'Hòa Cường Bắc', district: 'Hải Châu' },
  { lng: 108.2145, lat: 16.0365, street: '85 Núi Thành', ward: 'Hòa Thuận Đông', district: 'Hải Châu' },
  { lng: 108.1985, lat: 16.0658, street: '120 Điện Biên Phủ', ward: 'Chính Gián', district: 'Thanh Khê' },
  { lng: 108.1855, lat: 16.0732, street: '450 Nguyễn Tất Thành', ward: 'Xuân Hà', district: 'Thanh Khê' },
  { lng: 108.1912, lat: 16.0615, street: '72 Hà Huy Tập', ward: 'Thanh Khê Đông', district: 'Thanh Khê' },
  { lng: 108.2345, lat: 16.0725, street: '412 Ngô Quyền', ward: 'An Hải Bắc', district: 'Sơn Trà' },
  { lng: 108.2455, lat: 16.0688, street: '168 Võ Nguyên Giáp', ward: 'Phước Mỹ', district: 'Sơn Trà' },
  { lng: 108.2395, lat: 16.0885, street: '92 Lê Đức Thọ', ward: 'Thọ Quang', district: 'Sơn Trà' },
  { lng: 108.1985, lat: 16.0185, street: '56 Nguyễn Hữu Thọ', ward: 'Hòa Thọ Đông', district: 'Cẩm Lệ' },
  { lng: 108.1845, lat: 16.0245, street: '210 Cách Mạng Tháng 8', ward: 'Khuê Trung', district: 'Cẩm Lệ' },
  { lng: 108.2125, lat: 16.0125, street: 'KĐT Hòa Xuân', ward: 'Hòa Xuân', district: 'Cẩm Lệ' },
  { lng: 108.2515, lat: 16.0345, street: '12 Trường Sa', ward: 'Khuê Mỹ', district: 'Ngũ Hành Sơn' },
  { lng: 108.2615, lat: 16.0045, street: '145 Lê Văn Hiến', ward: 'Hòa Hải', district: 'Ngũ Hành Sơn' },
  { lng: 108.1525, lat: 16.0745, street: '301 Tôn Đức Thắng', ward: 'Hòa Minh', district: 'Liên Chiểu' },
  { lng: 108.1385, lat: 16.0925, street: '68 Nguyễn Lương Bằng', ward: 'Hòa Khánh Bắc', district: 'Liên Chiểu' },
  { lng: 108.0825, lat: 16.0155, street: 'Quốc lộ 14B', ward: 'Hòa Phong', district: 'Hòa Vang' },
  { lng: 108.1245, lat: 15.9965, street: 'Đường Phạm Hùng', ward: 'Hòa Phước', district: 'Hòa Vang' },
]

export function fallbackStreetAddress(lng: number, lat: number, districtName: string): string {
  const inDistrict = LOCAL_DANANG_STREETS.filter((s) => s.district === districtName)
  const pool = inDistrict.length > 0 ? inDistrict : LOCAL_DANANG_STREETS
  let best = pool[0]
  let bestDist = Infinity
  for (const item of pool) {
    const d = Math.hypot(item.lng - lng, item.lat - lat)
    if (d < bestDist) {
      bestDist = d
      best = item
    }
  }
  return `${best.street}, ${best.ward}, ${districtName}`
}

export async function reverseGeocodeDaNang(
  lng: number,
  lat: number,
): Promise<{ address: string; district: string | null; inside: boolean }> {
  await ensureLiveZonesLoaded()
  const dist = findDistrictAtLngLat(lng, lat)
  if (!dist || !dist.on) {
    return { address: '', district: null, inside: false }
  }
  const fallback = fallbackStreetAddress(lng, lat, dist.name)
  try {
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), 3200)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&accept-language=vi&zoom=18`,
      { signal: ctrl.signal },
    )
    window.clearTimeout(timer)
    if (res.ok) {
      const data = (await res.json()) as {
        name?: string
        address?: Record<string, string | undefined>
      }
      const a = data.address ?? {}
      const house = a.house_number ? `${a.house_number} ` : ''
      const road = a.road || a.pedestrian || a.residential || data.name || ''
      const ward = a.suburb || a.quarter || a.neighbourhood || a.village || a.town || ''
      const parts = [
        road ? `${house}${road}`.trim() : '',
        ward && !ward.includes(dist.name) ? ward : '',
        dist.name,
      ].filter(Boolean)
      if (parts.length >= 2) {
        return { address: parts.join(', '), district: dist.name, inside: true }
      }
    }
  } catch {
    // Fallback to local street database
  }
  return { address: fallback, district: dist.name, inside: true }
}

/**
 * Request the browser's real GPS position via Web Geolocation API.
 * If inside Da Nang's active districts, returns the exact GPS position.
 * Otherwise falls back to 124 Lê Duẩn, Hải Châu (108.2208, 16.0712).
 */
export async function requestBrowserGpsInDaNang(): Promise<{
  lng: number
  lat: number
  x: number
  y: number
  isRealGps: boolean
}> {
  await ensureLiveZonesLoaded()
  // Pick the first street in LOCAL_DANANG_STREETS that belongs to an active zone; fall back to 124 Lê Duẩn
  const activeStreet =
    LOCAL_DANANG_STREETS.find((s) => {
      const d = findDistrictAtLngLat(s.lng, s.lat)
      return d && d.on
    }) ?? LOCAL_DANANG_STREETS[0]
  const defaultLng = activeStreet.lng
  const defaultLat = activeStreet.lat
  const defXY = lngLatToXY(defaultLng, defaultLat)

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve({ lng: defaultLng, lat: defaultLat, x: defXY.x, y: defXY.y, isRealGps: false })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude: lng, latitude: lat } = pos.coords
        const dist = findDistrictAtLngLat(lng, lat)
        if (dist && dist.on) {
          const xy = lngLatToXY(lng, lat)
          resolve({ lng: +lng.toFixed(6), lat: +lat.toFixed(6), x: xy.x, y: xy.y, isRealGps: true })
        } else {
          resolve({ lng: defaultLng, lat: defaultLat, x: defXY.x, y: defXY.y, isRealGps: false })
        }
      },
      () => {
        resolve({ lng: defaultLng, lat: defaultLat, x: defXY.x, y: defXY.y, isRealGps: false })
      },
      { enableHighAccuracy: true, timeout: 4500, maximumAge: 30000 },
    )
  })
}

function createFallbackRasterStyle(): maplibregl.StyleSpecification {
  const qp = CARTO_API_KEY ? `?key=${encodeURIComponent(CARTO_API_KEY)}` : ''
  return {
    version: 8,
    sources: {
      'carto-voyager': {
        type: 'raster',
        tiles: [
          `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${qp}`,
          `https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${qp}`,
          `https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${qp}`,
        ],
        tileSize: 256,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'carto-voyager-layer',
        type: 'raster',
        source: 'carto-voyager',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  }
}

function getGoongOrFallbackStyle(): string | maplibregl.StyleSpecification {
  if (GOONG_MAPTILES_KEY) {
    return `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodeURIComponent(GOONG_MAPTILES_KEY)}`
  }
  return createFallbackRasterStyle()
}

function createCircleGeoJSON(centerLat: number, centerLng: number, radiusMeters = 50, points = 64): GeoJSON.FeatureCollection {
  const coords: [number, number][] = []
  const earthRadius = 6378137
  const angularDistance = radiusMeters / earthRadius
  const latRad = (centerLat * Math.PI) / 180
  const lngRad = (centerLng * Math.PI) / 180

  for (let i = 0; i <= points; i++) {
    const bearing = (2 * Math.PI * i) / points
    const pointLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
    )
    const pointLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pointLat),
      )
    coords.push([(pointLng * 180) / Math.PI, (pointLat * 180) / Math.PI])
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [coords] },
      },
    ],
  }
}

const LEVEL_HEX: Record<Level, string> = {
  urgent: '#e5251b',
  high: '#f97316',
  normal: '#f5b400',
  low: '#9ca3af',
  done: '#16a34a',
}

export interface InteractiveZoneItem {
  id: string
  backendId?: string
  name: string
  open: number
  on: boolean
  labelLngLat: [number, number]
  geometry: GeoJSON.Geometry
}

export interface FieldUnitMarkerItem {
  id: string
  name: string
  status: 'idle' | 'moving' | 'working'
  lngLat: [number, number]
  selected?: boolean
  highlighted?: boolean
  dimmed?: boolean
}

export interface GoongBentoMapProps {
  pins?: { x: number; y: number; lat?: number; lng?: number; level: Level; label?: string }[]
  state?: DataState
  compact?: boolean
  fill?: boolean
  controls?: 'top' | 'bottom' | 'bottom-left'
  userPin?: { x: number; y: number; lat?: number; lng?: number; level: Level; bad?: boolean; radius?: number; label?: string }
  onPick?: (x: number, y: number, lngLat?: { lng: number; lat: number; district: string | null }) => void
  onZoom?: (dir: -1 | 0 | 1) => void
  onPinClick?: (i: number) => void
  selectedPin?: number
  route?: { x: number; y: number; lat?: number; lng?: number }[]
  heat?: { x: number; y: number; lat?: number; lng?: number; size: number; alpha: number }[]
  /** Optional interactive 7-district mode for /admin/zones */
  interactiveZones?: InteractiveZoneItem[]
  selectedZoneId?: string | null
  onSelectZone?: (id: string) => void
  /** Optional field unit dispatch mode for /dispatcher/field-units */
  fieldUnits?: FieldUnitMarkerItem[]
  onSelectFieldUnit?: (id: string) => void
  dispatchRoute?: { from: [number, number]; to: [number, number] } | null
  /** Optional interactive GIS Polygon Studio mode for /admin/system-settings */
  polygonPoints?: [number, number][]
  polygonMode?: 'view' | 'draw' | 'edit'
  onPolygonMapClick?: (pt: [number, number]) => void
  onPolygonMoveVertex?: (index: number, pt: [number, number]) => void
  onPolygonRemoveVertex?: (index: number) => void
  onPolygonInsertVertex?: (afterIndex: number, pt: [number, number]) => void
  initialZoom?: number
  initialCenter?: [number, number]
}

const SOURCE_DISTRICTS = 'bento-gadm-districts'
const LAYER_DISTRICTS_FILL = 'bento-gadm-districts-fill'
const LAYER_DISTRICTS_ACTIVE_LINE = 'bento-gadm-districts-active-line'
const LAYER_DISTRICTS_PAUSED_LINE = 'bento-gadm-districts-paused-line'

const SOURCE_EDITOR_POLY = 'bento-editor-poly'
const LAYER_EDITOR_FILL = 'bento-editor-poly-fill'
const LAYER_EDITOR_LINE = 'bento-editor-poly-line'

const SOURCE_RADIUS = 'bento-user-radius'
const LAYER_RADIUS_FILL = 'bento-user-radius-fill'
const LAYER_RADIUS_LINE = 'bento-user-radius-line'

const SOURCE_ROUTE = 'bento-route-line'
const LAYER_ROUTE_CASING = 'bento-route-casing'
const LAYER_ROUTE_MAIN = 'bento-route-main'

export default function GoongBentoMap({
  pins = [],
  state = 'normal',
  compact,
  fill,
  controls = 'top',
  userPin,
  onPick,
  onZoom,
  onPinClick,
  selectedPin,
  route,
  heat,
  interactiveZones,
  selectedZoneId,
  onSelectZone,
  fieldUnits,
  onSelectFieldUnit,
  dispatchRoute,
  polygonPoints,
  polygonMode = 'view',
  onPolygonMapClick,
  onPolygonMoveVertex,
  onPolygonRemoveVertex,
  onPolygonInsertVertex,
  initialZoom,
  initialCenter,
}: GoongBentoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [is3D, setIs3D] = useState(false)
  const [liveZones, setLiveZones] = useState<ApiZoneOut[] | null>(cachedLiveZones)
  const fallbackAppliedRef = useRef(false)

  const markersRef = useRef<maplibregl.Marker[]>([])
  const editorMarkersRef = useRef<maplibregl.Marker[]>([])
  const onPickRef = useRef(onPick)
  const onSelectZoneRef = useRef(onSelectZone)
  const onPinClickRef = useRef(onPinClick)
  const onSelectFieldUnitRef = useRef(onSelectFieldUnit)
  const polygonModeRef = useRef(polygonMode)
  const onPolygonMapClickRef = useRef(onPolygonMapClick)
  const onPolygonMoveVertexRef = useRef(onPolygonMoveVertex)
  const onPolygonRemoveVertexRef = useRef(onPolygonRemoveVertex)
  const onPolygonInsertVertexRef = useRef(onPolygonInsertVertex)

  useEffect(() => {
    onPickRef.current = onPick
    onSelectZoneRef.current = onSelectZone
    onPinClickRef.current = onPinClick
    onSelectFieldUnitRef.current = onSelectFieldUnit
    polygonModeRef.current = polygonMode
    onPolygonMapClickRef.current = onPolygonMapClick
    onPolygonMoveVertexRef.current = onPolygonMoveVertex
    onPolygonRemoveVertexRef.current = onPolygonRemoveVertex
    onPolygonInsertVertexRef.current = onPolygonInsertVertex
  }, [
    onPick,
    onSelectZone,
    onPinClick,
    onSelectFieldUnit,
    polygonMode,
    onPolygonMapClick,
    onPolygonMoveVertex,
    onPolygonRemoveVertex,
    onPolygonInsertVertex,
  ])

  useEffect(() => {
    const onUpdated = () => {
      setLiveZones(cachedLiveZones)
    }
    window.addEventListener(ZONES_UPDATED_EVENT, onUpdated)
    if (!interactiveZones && !cachedLiveZones) {
      void ensureLiveZonesLoaded()
    }
    return () => {
      window.removeEventListener(ZONES_UPDATED_EVENT, onUpdated)
    }
  }, [interactiveZones])

  const buildDistrictsFeatureCollection = (): GeoJSON.FeatureCollection => {
    if (interactiveZones && interactiveZones.length > 0) {
      return {
        type: 'FeatureCollection',
        features: interactiveZones.map((z) => ({
          type: 'Feature',
          properties: {
            id: z.id,
            name: z.name,
            on: z.on,
            selected: selectedZoneId === z.id,
            interactive: true,
          },
          geometry: z.geometry,
        })),
      }
    }

    const rawFeatures = (districtsGeoJsonRaw as unknown as GeoJSON.FeatureCollection).features
    return {
      type: 'FeatureCollection',
      features: rawFeatures.map((f) => {
        const zid = String(f.properties?.zone_id ?? '').toUpperCase()
        const live = liveZones?.find((lz) => lz.id.toUpperCase() === zid)
        const isActive = live ? live.is_active : f.properties?.is_active !== false
        return {
          type: 'Feature',
          properties: {
            id: zid.toLowerCase(),
            name: live?.name ?? f.properties?.name ?? zid,
            on: isActive,
            selected: false,
            interactive: false,
          },
          geometry: (live?.geojson_geometry as unknown as GeoJSON.Geometry) ?? f.geometry,
        }
      }),
    }
  }

  // Initialize MapLibre + Goong Map
  useEffect(() => {
    if (!containerRef.current) return

    const defaultCenter: [number, number] =
      initialCenter ??
      (interactiveZones
        ? DANANG_ZONES_CENTER
        : userPin
          ? userPin.lng !== undefined && userPin.lat !== undefined
            ? [userPin.lng, userPin.lat]
            : xyToLngLat(userPin.x, userPin.y)
          : DANANG_CENTER)

    const defaultZoom = initialZoom ?? (interactiveZones ? 10.4 : compact ? 12.2 : 12.6)

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getGoongOrFallbackStyle(),
      center: defaultCenter,
      zoom: defaultZoom,
      maxBounds: DANANG_MAX_BOUNDS,
      attributionControl: false,
    })

    mapRef.current = map

    map.on('error', (e) => {
      const msg = String(e.error?.message || e || '')
      if (!fallbackAppliedRef.current && (msg.includes('goong') || msg.includes('401') || msg.includes('403') || msg.includes('Failed to fetch'))) {
        fallbackAppliedRef.current = true
        try {
          map.setStyle(createFallbackRasterStyle())
        } catch {
          // ignore
        }
      }
    })

    map.on('pitch', () => {
      setIs3D(map.getPitch() > 20)
    })

    const setupLayers = () => {
      const layers = map.getStyle()?.layers
      let firstSymbolId: string | undefined
      if (layers) {
        for (const layer of layers) {
          if (layer.type === 'symbol') {
            firstSymbolId = layer.id
            break
          }
        }
      }

      if (!map.getSource(SOURCE_DISTRICTS)) {
        map.addSource(SOURCE_DISTRICTS, {
          type: 'geojson',
          data: buildDistrictsFeatureCollection(),
        })

        map.addLayer(
          {
            id: LAYER_DISTRICTS_FILL,
            type: 'fill',
            source: SOURCE_DISTRICTS,
            paint: {
              'fill-color': [
                'case',
                ['!', ['boolean', ['get', 'on'], true]],
                '#9ca3af',
                '#e5251b',
              ],
              'fill-opacity': [
                'case',
                ['boolean', ['get', 'interactive'], false],
                [
                  'case',
                  ['!', ['boolean', ['get', 'on'], true]],
                  0.26,
                  ['boolean', ['get', 'selected'], false],
                  0.32,
                  0.14,
                ],
                0,
              ],
            },
          },
          firstSymbolId,
        )

        map.addLayer(
          {
            id: LAYER_DISTRICTS_ACTIVE_LINE,
            type: 'line',
            source: SOURCE_DISTRICTS,
            filter: ['==', ['boolean', ['get', 'on'], true], true],
            paint: {
              'line-color': '#e5251b',
              'line-width': [
                'case',
                ['boolean', ['get', 'selected'], false],
                3.5,
                2,
              ],
              'line-opacity': [
                'case',
                ['boolean', ['get', 'interactive'], false],
                0.9,
                0,
              ],
            },
          },
          firstSymbolId,
        )

        map.addLayer(
          {
            id: LAYER_DISTRICTS_PAUSED_LINE,
            type: 'line',
            source: SOURCE_DISTRICTS,
            filter: ['==', ['boolean', ['get', 'on'], true], false],
            paint: {
              'line-color': '#6b6b70',
              'line-width': [
                'case',
                ['boolean', ['get', 'selected'], false],
                3.5,
                2,
              ],
              'line-dasharray': [3, 2],
              'line-opacity': [
                'case',
                ['boolean', ['get', 'interactive'], false],
                0.85,
                0,
              ],
            },
          },
          firstSymbolId,
        )
      }

      if (!map.getSource(SOURCE_EDITOR_POLY)) {
        map.addSource(SOURCE_EDITOR_POLY, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: LAYER_EDITOR_FILL,
          type: 'fill',
          source: SOURCE_EDITOR_POLY,
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': '#e5251b',
            'fill-opacity': 0.25,
          },
        })
        map.addLayer({
          id: LAYER_EDITOR_LINE,
          type: 'line',
          source: SOURCE_EDITOR_POLY,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#111111',
            'line-width': 3,
          },
        })
      }

      if (!map.getSource(SOURCE_RADIUS)) {
        map.addSource(SOURCE_RADIUS, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: LAYER_RADIUS_FILL,
          type: 'fill',
          source: SOURCE_RADIUS,
          paint: {
            'fill-color': '#111111',
            'fill-opacity': 0.08,
          },
        })
        map.addLayer({
          id: LAYER_RADIUS_LINE,
          type: 'line',
          source: SOURCE_RADIUS,
          paint: {
            'line-color': '#111111',
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        })
      }

      if (!map.getSource(SOURCE_ROUTE)) {
        map.addSource(SOURCE_ROUTE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: LAYER_ROUTE_CASING,
          type: 'line',
          source: SOURCE_ROUTE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 8 },
        })
        map.addLayer({
          id: LAYER_ROUTE_MAIN,
          type: 'line',
          source: SOURCE_ROUTE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#e5251b', 'line-width': 4 },
        })
      }

      if (map.getLayer('building')) {
        try {
          map.setLayerZoomRange('building', 14.5, 24)
        } catch {
          // ignore
        }
      }

      setLoaded(true)
    }

    map.on('load', setupLayers)
    map.on('styledata', () => {
      if (map.isStyleLoaded() && !map.getSource(SOURCE_DISTRICTS)) {
        setupLayers()
      }
    })

    map.on('click', (e) => {
      if (polygonModeRef.current === 'draw' && onPolygonMapClickRef.current) {
        onPolygonMapClickRef.current([+e.lngLat.lng.toFixed(6), +e.lngLat.lat.toFixed(6)])
        return
      }
      if (polygonModeRef.current === 'edit') {
        return
      }
      if (onSelectZoneRef.current && map.getLayer(LAYER_DISTRICTS_FILL)) {
        const feats = map.queryRenderedFeatures(e.point, { layers: [LAYER_DISTRICTS_FILL] })
        if (feats.length > 0) {
          const zid = feats[0].properties?.id
          if (zid) {
            onSelectZoneRef.current(String(zid))
            return
          }
        }
      }
      if (onPickRef.current) {
        const { lng, lat } = e.lngLat
        const xy = lngLatToXY(lng, lat)
        const dist = findDistrictAtLngLat(lng, lat)
        onPickRef.current(xy.x, xy.y, {
          lng,
          lat,
          district: dist && dist.on ? dist.name : null,
        })
      }
    })

    return () => {
      setLoaded(false)
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      editorMarkersRef.current.forEach((m) => m.remove())
      editorMarkersRef.current = []
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ResizeObserver for responsive containers
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(() => {
      mapRef.current?.resize()
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Update GADM district polygons when interactiveZones, selectedZoneId, or liveZones change
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return
    const src = map.getSource(SOURCE_DISTRICTS) as maplibregl.GeoJSONSource | undefined
    if (src) {
      src.setData(buildDistrictsFeatureCollection())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, interactiveZones, selectedZoneId, liveZones])

  // Update interactive Polygon Editor layer & draggable vertex handles (GIS Polygon Studio)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return
    const src = map.getSource(SOURCE_EDITOR_POLY) as maplibregl.GeoJSONSource | undefined

    editorMarkersRef.current.forEach((m) => m.remove())
    editorMarkersRef.current = []

    const pts = polygonPoints ?? []
    if (polygonMode === 'view' || pts.length === 0) {
      src?.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    const features: GeoJSON.Feature[] = []
    if (pts.length >= 3) {
      const closed = [...pts, pts[0]]
      features.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [closed],
        },
      })
    } else if (pts.length === 2) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: pts,
        },
      })
    }
    src?.setData({ type: 'FeatureCollection', features })

    // Midpoint '+' handles to insert a new vertex on any edge when >= 2 vertices exist
    // IMPORTANT: Never put CSS `transition` or `hover:scale-*` on the Marker root element, because MapLibre uses inline `transform: translate(...)` on the root!
    if (pts.length >= 2 && onPolygonInsertVertexRef.current) {
      const edgeCount = pts.length >= 3 ? pts.length : pts.length - 1
      for (let i = 0; i < edgeCount; i++) {
        const a = pts[i]
        const b = pts[(i + 1) % pts.length]
        const mid: [number, number] = [
          +((a[0] + b[0]) / 2).toFixed(6),
          +((a[1] + b[1]) / 2).toFixed(6),
        ]
        const midWrap = document.createElement('div')
        midWrap.className = 'flex items-center justify-center'
        const midEl = document.createElement('button')
        midEl.type = 'button'
        midEl.title = 'Chèn thêm điểm đỉnh tại cạnh này'
        midEl.className =
          'flex size-5 items-center justify-center rounded-full bg-white text-[12px] font-bold text-ink shadow-card ring-2 ring-ink/70 transition-transform duration-150 hover:scale-125 hover:bg-ink hover:text-white cursor-pointer'
        midEl.textContent = '+'
        midEl.addEventListener('mousedown', (ev) => {
          ev.stopPropagation()
        })
        midEl.addEventListener('click', (ev) => {
          ev.stopPropagation()
          onPolygonInsertVertexRef.current?.(i, mid)
        })
        midWrap.appendChild(midEl)
        const midMarker = new maplibregl.Marker({ element: midWrap, anchor: 'center' })
          .setLngLat(mid)
          .addTo(map)
        editorMarkersRef.current.push(midMarker)
      }
    }

    // Draggable vertex handles (wrapper stays transform-free for MapLibre; inner badge handles hover scale)
    pts.forEach((pt, idx) => {
      const wrap = document.createElement('div')
      wrap.className = 'flex items-center justify-center'
      const el = document.createElement('div')
      el.title = `Đỉnh #${idx + 1} (${pt[1].toFixed(4)}, ${pt[0].toFixed(4)}) · Kéo để di chuyển, nhấp đúp/chuột phải để xóa`
      el.className =
        'flex size-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-card ring-2 ring-white transition-transform duration-150 hover:scale-125 cursor-grab active:cursor-grabbing'
      el.textContent = String(idx + 1)

      el.addEventListener('contextmenu', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        onPolygonRemoveVertexRef.current?.(idx)
      })
      el.addEventListener('dblclick', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        onPolygonRemoveVertexRef.current?.(idx)
      })

      wrap.appendChild(el)
      const m = new maplibregl.Marker({
        element: wrap,
        anchor: 'center',
        draggable: true,
      })
        .setLngLat(pt)
        .addTo(map)

      m.on('dragend', () => {
        const p = m.getLngLat()
        onPolygonMoveVertexRef.current?.(idx, [+p.lng.toFixed(6), +p.lat.toFixed(6)])
      })

      editorMarkersRef.current.push(m)
    })
  }, [loaded, polygonPoints, polygonMode])

  // Update route / dispatchRoute line
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return
    const src = map.getSource(SOURCE_ROUTE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    if (dispatchRoute) {
      src.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [dispatchRoute.from, dispatchRoute.to],
            },
          },
        ],
      })
      return
    }

    if (route && route.length > 1) {
      const coords = route.map((r) => (r.lng !== undefined && r.lat !== undefined ? [r.lng, r.lat] : xyToLngLat(r.x, r.y)))
      src.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
          },
        ],
      })
    } else {
      src.setData({ type: 'FeatureCollection', features: [] })
    }
  }, [loaded, route, dispatchRoute])

  // Update 50m radius circle around userPin
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return
    const src = map.getSource(SOURCE_RADIUS) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    if (userPin && userPin.radius) {
      const [lng, lat] =
        userPin.lng !== undefined && userPin.lat !== undefined
          ? [userPin.lng, userPin.lat]
          : xyToLngLat(userPin.x, userPin.y)
      src.setData(createCircleGeoJSON(lat, lng, 50))
      const color = userPin.bad ? '#e5251b' : '#111111'
      if (map.getLayer(LAYER_RADIUS_FILL)) map.setPaintProperty(LAYER_RADIUS_FILL, 'fill-color', color)
      if (map.getLayer(LAYER_RADIUS_LINE)) map.setPaintProperty(LAYER_RADIUS_LINE, 'line-color', color)
    } else {
      src.setData({ type: 'FeatureCollection', features: [] })
    }
  }, [loaded, userPin])

  // Render HTML markers (pins, userPin, heat, interactiveZone labels, fieldUnits)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    if (state !== 'normal') return

    // 1. Heat blobs (for AnalyticsScreen)
    if (heat && heat.length > 0) {
      for (const h of heat) {
        const [lng, lat] = h.lng !== undefined && h.lat !== undefined ? [h.lng, h.lat] : xyToLngLat(h.x, h.y)
        const el = document.createElement('div')
        el.style.width = `${Math.round(h.size * 0.75)}px`
        el.style.height = `${Math.round(h.size * 0.75)}px`
        el.style.borderRadius = '9999px'
        el.style.pointerEvents = 'none'
        el.style.background = `radial-gradient(circle, rgba(229,37,27,${h.alpha}) 0%, rgba(229,37,27,${h.alpha * 0.45}) 40%, rgba(229,37,27,0) 70%)`
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map)
        markersRef.current.push(marker)
      }
    }

    // 2. Interactive Zone label pills (for ZonesScreen /admin/zones)
    if (interactiveZones && interactiveZones.length > 0) {
      for (const z of interactiveZones) {
        const btn = document.createElement('button')
        btn.type = 'button'
        const isSel = selectedZoneId === z.id
        btn.className = [
          'rounded-full px-3 py-1 text-[12px] font-semibold whitespace-nowrap shadow-card transition cursor-pointer',
          isSel ? 'bg-ink text-white ring-2 ring-white' : 'bg-card text-ink hover:bg-surface',
          !z.on ? 'opacity-65' : '',
        ].join(' ')
        btn.textContent = z.name
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation()
          onSelectZoneRef.current?.(z.id)
        })
        const marker = new maplibregl.Marker({ element: btn, anchor: 'center' }).setLngLat(z.labelLngLat).addTo(map)
        markersRef.current.push(marker)
      }
    }

    // 3. Field units markers (for FieldUnitsScreen /dispatcher/field-units)
    if (fieldUnits && fieldUnits.length > 0) {
      const statusColor: Record<FieldUnitMarkerItem['status'], string> = {
        idle: '#16a34a',
        moving: '#f97316',
        working: '#111111',
      }
      for (const u of fieldUnits) {
        const wrap = document.createElement('button')
        wrap.type = 'button'
        wrap.setAttribute('aria-label', u.name)
        wrap.style.opacity = u.dimmed ? '0.45' : '1'
        wrap.className = 'group relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110'
        const badge = document.createElement('span')
        badge.style.backgroundColor = statusColor[u.status]
        badge.className = [
          'flex size-9 items-center justify-center rounded-full text-white shadow-card ring-4',
          u.highlighted ? 'ring-done scale-115' : u.selected ? 'ring-accent' : 'ring-white',
        ].join(' ')
        badge.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`

        const tip = document.createElement('span')
        tip.className = 'pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-card'
        tip.textContent = u.name

        wrap.appendChild(badge)
        wrap.appendChild(tip)
        wrap.addEventListener('click', (ev) => {
          ev.stopPropagation()
          onSelectFieldUnitRef.current?.(u.id)
        })
        const marker = new maplibregl.Marker({ element: wrap, anchor: 'center' }).setLngLat(u.lngLat).addTo(map)
        markersRef.current.push(marker)
      }
    }

    // 4. Incident pins
    pins.forEach((p, idx) => {
      const [lng, lat] = p.lng !== undefined && p.lat !== undefined ? [p.lng, p.lat] : xyToLngLat(p.x, p.y)
      const isSel = selectedPin === idx
      const el = document.createElement('button')
      el.type = 'button'
      el.setAttribute('aria-label', p.label || 'Ghim sự cố')
      el.className = 'relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125'

      if (p.label) {
        const badge = document.createElement('span')
        badge.style.backgroundColor = LEVEL_HEX[p.level] ?? '#111111'
        badge.className = 'flex size-7 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-card ring-4 ring-white'
        badge.textContent = p.label
        el.appendChild(badge)
      } else {
        const dot = document.createElement('span')
        dot.style.backgroundColor = LEVEL_HEX[p.level] ?? '#e5251b'
        dot.className = isSel
          ? 'block size-6 rounded-full shadow-card ring-4 ring-ink transition-all'
          : 'block size-4 rounded-full shadow-card ring-4 ring-white transition-all'
        el.appendChild(dot)
      }

      if (onPinClickRef.current) {
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          onPinClickRef.current?.(idx)
        })
      }

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map)
      markersRef.current.push(marker)
    })

    // 5. User / Selected Incident pin (draggable when onPick is provided)
    if (userPin) {
      const [lng, lat] =
        userPin.lng !== undefined && userPin.lat !== undefined
          ? [userPin.lng, userPin.lat]
          : xyToLngLat(userPin.x, userPin.y)
      const el = document.createElement('div')
      el.className = 'relative flex items-center justify-center'
      const badge = document.createElement('span')
      badge.style.backgroundColor = userPin.bad ? '#e5251b' : '#111111'
      badge.className = 'relative flex size-9 items-center justify-center rounded-full text-white shadow-card ring-4 ring-white'
      if (userPin.label) {
        badge.innerHTML = `<span class="text-[13px] font-bold">${userPin.label}</span>`
      } else {
        badge.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`
      }
      el.appendChild(badge)
      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        draggable: Boolean(onPickRef.current),
      })
        .setLngLat([lng, lat])
        .addTo(map)

      if (onPickRef.current) {
        marker.on('dragend', () => {
          const pos = marker.getLngLat()
          const xy = lngLatToXY(pos.lng, pos.lat)
          const dist = findDistrictAtLngLat(pos.lng, pos.lat)
          onPickRef.current?.(xy.x, xy.y, {
            lng: +pos.lng.toFixed(6),
            lat: +pos.lat.toFixed(6),
            district: dist && dist.on ? dist.name : null,
          })
        })
      }

      markersRef.current.push(marker)

      map.easeTo({ center: [lng, lat], duration: 500 })
    }
  }, [loaded, state, pins, selectedPin, userPin, heat, interactiveZones, selectedZoneId, fieldUnits])

  const handleZoom = (dir: -1 | 0 | 1) => {
    onZoom?.(dir)
    const map = mapRef.current
    if (!map) return
    if (dir === 1) map.zoomIn({ duration: 300 })
    else if (dir === -1) map.zoomOut({ duration: 300 })
    else {
      if (onPickRef.current) {
        requestBrowserGpsInDaNang().then((gps) => {
          const dist = findDistrictAtLngLat(gps.lng, gps.lat)
          onPickRef.current?.(gps.x, gps.y, {
            lng: gps.lng,
            lat: gps.lat,
            district: dist && dist.on ? dist.name : null,
          })
          map.easeTo({
            center: [gps.lng, gps.lat],
            zoom: 15.2,
            pitch: 0,
            bearing: 0,
            duration: 600,
          })
        })
        return
      }
      map.easeTo({
        center: interactiveZones ? DANANG_ZONES_CENTER : DANANG_CENTER,
        zoom: interactiveZones ? 10.4 : 12.6,
        pitch: 0,
        bearing: 0,
        duration: 500,
      })
    }
  }

  const toggle3D = () => {
    const map = mapRef.current
    if (!map) return
    const next = !is3D
    setIs3D(next)
    map.easeTo({
      pitch: next ? 55 : 0,
      bearing: next ? -15 : 0,
      duration: 600,
    })
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-card bg-surface',
        fill ? 'absolute inset-0' : cn('relative', compact ? 'h-[200px]' : 'h-[320px]'),
        (onPick || polygonMode === 'draw') && 'cursor-crosshair',
      )}
    >
      <div ref={containerRef} className="absolute inset-0 size-full" />

      {state === 'normal' && (
        <div
          className={cn(
            'absolute z-10 flex flex-col gap-2',
            controls === 'top' ? 'top-3 right-3' : controls === 'bottom' ? 'right-3 bottom-3' : 'bottom-3 left-3',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {([Plus, Minus, Navigation] as const).map((I, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleZoom(([1, -1, 0] as const)[i])}
              className="flex size-10 items-center justify-center rounded-full bg-card text-ink shadow-card transition hover:-translate-y-0.5"
            >
              <I size={16} {...ic} />
            </button>
          ))}
          {!compact && (
            <button
              type="button"
              onClick={toggle3D}
              title="Bật/tắt góc nhìn 3D Goong Map"
              className={cn(
                'flex size-10 items-center justify-center rounded-full text-[11px] font-bold shadow-card transition hover:-translate-y-0.5',
                is3D ? 'bg-ink text-white' : 'bg-card text-ink',
              )}
            >
              <Box size={15} {...ic} />
            </button>
          )}
        </div>
      )}

      {state !== 'normal' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          {state === 'loading' && <div className="size-10 animate-spin rounded-full border-4 border-surface border-t-ink" />}
          {state === 'empty' && <EmptyState icon={MapPin} text="Chưa có sự cố" />}
          {state === 'error' && <ErrorState text="Không tải bản đồ" />}
        </div>
      )}
    </div>
  )
}
