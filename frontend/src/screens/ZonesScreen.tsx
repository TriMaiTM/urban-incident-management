'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, MapPin } from 'lucide-react'
import { Button, Skeleton, cn, ic } from '../components/primitives'
import GoongBentoMap, { type InteractiveZoneItem } from '../components/GoongBentoMap'
import AdminShell from './AdminShell'
import districtsGeoJsonRaw from '../data/danang_districts_boundary.json'
import { apiListZones, apiUpdateZone, type ApiZoneOut } from '../lib/backend-api'

export type Zone = InteractiveZoneItem

const LABEL_LNG_LAT: Record<string, [number, number]> = {
  hc: [108.216, 16.058],
  tk: [108.191, 16.068],
  st: [108.258, 16.098],
  cl: [108.193, 16.015],
  nhs: [108.252, 16.002],
  lc: [108.14, 16.115],
  hv: [108.015, 16.035],
}

const DEFAULT_OPEN: Record<string, number> = {
  hc: 24,
  tk: 18,
  st: 11,
  cl: 9,
  nhs: 6,
  lc: 7,
  hv: 3,
}

export const zoneSeed: Zone[] = (
  districtsGeoJsonRaw.features as unknown as Array<{
    properties: { zone_id: string; name: string; is_active?: boolean }
    geometry: GeoJSON.Geometry
  }>
).map((f) => {
  const id = f.properties.zone_id.toLowerCase()
  return {
    id,
    backendId: f.properties.zone_id,
    name: f.properties.name,
    open: DEFAULT_OPEN[id] ?? 5,
    on: f.properties.is_active !== false,
    labelLngLat: LABEL_LNG_LAT[id] ?? [108.2, 16.06],
    geometry: f.geometry,
  }
})

export function zonesGeoJson(zones: Zone[]) {
  return {
    type: 'FeatureCollection',
    features: zones.map((z) => ({
      type: 'Feature',
      properties: {
        id: (z.backendId ?? z.id).toUpperCase(),
        name: z.name,
        accepting: z.on,
        open_incident_count: z.open,
      },
      geometry: z.geometry,
    })),
  }
}

function mergeApiZones(apiZones: ApiZoneOut[]): Zone[] {
  const districts = apiZones.filter((z) => z.id.toUpperCase() !== 'DANANG_CORE')
  if (districts.length === 0) return zoneSeed

  return zoneSeed.map((seed) => {
    const match = districts.find((d) => d.id.toLowerCase() === seed.id)
    if (!match) return seed
    return {
      ...seed,
      backendId: match.id,
      name: match.name || seed.name,
      open: match.open_incident_count ?? seed.open,
      on: match.is_active,
      geometry: (match.geojson_geometry as unknown as GeoJSON.Geometry) ?? seed.geometry,
    }
  })
}

export default function ZonesScreen() {
  const [zones, setZones] = useState<Zone[]>(zoneSeed)
  const [sel, setSel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<null | { kind: 'success' | 'info'; text: string }>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let active = true
    const t = setTimeout(() => {
      if (active) setLoading(false)
    }, 500)
    apiListZones()
      .then((list) => {
        if (!active) return
        setZones(mergeApiZones(list))
        setLoading(false)
      })
      .catch(() => {})
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [])

  const say = (kind: 'success' | 'info', text: string) => {
    setToast({ kind, text })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const flip = (z: Zone) => {
    const nextOn = !z.on
    setZones((l) => l.map((x) => (x.id === z.id ? { ...x, on: nextOn } : x)))
    say(z.on ? 'info' : 'success', z.on ? `Đã ngừng tiếp nhận tại ${z.name}` : `Đã mở tiếp nhận tại ${z.name}`)
    apiUpdateZone(z.backendId ?? z.id.toUpperCase(), { is_active: nextOn }).catch(() => {})
  }

  const download = () => {
    const geo = zonesGeoJson(zones)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(geo, null, 2)], { type: 'application/geo+json' }))
    a.download = 'phan-vung-da-nang.geojson'
    a.click()
    say('success', 'Đã tải GeoJSON')
  }

  return (
    <AdminShell
      title="Phân vùng GIS"
      subtitle={`${zones.filter((z) => z.on).length}/${zones.length} vùng đang tiếp nhận phản ánh`}
      toast={toast}
      actions={
        <Button size="lg" icon={Download} onClick={download}>
          Tải GeoJSON
        </Button>
      }
    >
      <div className="grid grid-cols-[1fr_380px] gap-4">
        <section className="relative h-[760px] overflow-hidden rounded-card shadow-card">
          {loading ? (
            <Skeleton className="size-full" />
          ) : (
            <>
              <GoongBentoMap
                fill
                controls="bottom"
                interactiveZones={zones}
                selectedZoneId={sel}
                onSelectZone={setSel}
              />
              <div className="absolute bottom-4 left-4 z-10 flex gap-4 rounded-full bg-card px-4 py-2 text-[12px] font-semibold shadow-card">
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-sm border-2 border-accent bg-accent/20" />
                  Đang tiếp nhận
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-sm border-2 border-dashed border-muted bg-low/40" />
                  Tạm dừng
                </span>
              </div>
            </>
          )}
        </section>

        <aside className="flex h-[760px] flex-col gap-3 overflow-auto rounded-card bg-surface p-3">
          <div className="flex items-center justify-between px-2 pt-1">
            <h2 className="text-[16px] font-semibold">Danh sách vùng</h2>
            <span className="text-[12px] text-muted">Tiếp nhận phản ánh</span>
          </div>
          {zones.map((z) => (
            <article
              key={z.id}
              onClick={() => setSel(z.id)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-card bg-card p-4 shadow-card transition',
                sel === z.id && 'ring-2 ring-ink',
              )}
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  z.on ? 'bg-accent/10 text-accent' : 'bg-surface text-muted',
                )}
              >
                <MapPin size={18} {...ic} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[14px] font-semibold">{z.name}</h3>
                <p className="text-[12px] text-muted">
                  {z.open} phiếu đang mở · {z.on ? 'Đang tiếp nhận' : 'Tạm dừng'}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={z.on}
                aria-label={`Tiếp nhận ${z.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  flip(z)
                }}
                className={cn(
                  'flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors',
                  z.on ? 'bg-ink' : 'bg-low',
                )}
              >
                <span
                  className={cn('size-5 rounded-full bg-white shadow-card transition-transform', z.on && 'translate-x-5')}
                />
              </button>
            </article>
          ))}
        </aside>
      </div>
    </AdminShell>
  )
}
