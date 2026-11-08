import { useEffect, useRef, useState } from 'react'
import { Download, MapPin } from 'lucide-react'
import { Button, Skeleton, cn, ic } from '../components/primitives'
import { MapCanvas } from '../components/MapArt'
import AdminShell from './AdminShell'

export type Zone = { id: string; name: string; open: number; pts: [number, number][]; on: boolean }
export const zoneSeed: Zone[] = [
  { id: 'hc', name: 'Hải Châu', open: 24, on: true, pts: [[720, 336], [800, 329], [850, 364], [840, 434], [740, 434]] },
  { id: 'tk', name: 'Thanh Khê', open: 18, on: true, pts: [[640, 315], [700, 210], [780, 245], [800, 329], [720, 336]] },
  { id: 'st', name: 'Sơn Trà', open: 11, on: true, pts: [[800, 252], [840, 182], [970, 154], [990, 252], [900, 308], [820, 322]] },
  { id: 'cl', name: 'Cẩm Lệ', open: 9, on: true, pts: [[640, 315], [720, 336], [740, 434], [720, 504], [620, 476]] },
  { id: 'nhs', name: 'Ngũ Hành Sơn', open: 6, on: true, pts: [[740, 434], [840, 434], [870, 504], [840, 588], [760, 574], [720, 504]] },
  { id: 'lc', name: 'Liên Chiểu', open: 7, on: true, pts: [[540, 126], [700, 14], [760, 70], [700, 210], [640, 315], [560, 224]] },
  { id: 'hv', name: 'Hòa Vang', open: 3, on: false, pts: [[0, 0], [540, 0], [540, 126], [560, 224], [640, 315], [620, 476], [560, 700], [0, 700]] },
]
const centroid = (p: [number, number][]) => [p.reduce((a, b) => a + b[0], 0) / p.length / 10, p.reduce((a, b) => a + b[1], 0) / p.length / 7]

export function zonesGeoJson(zones: Zone[]) {
  return {
    type: 'FeatureCollection',
    features: zones.map((z) => {
      const ring = [...z.pts, z.pts[0]].map(([x, y]) => [+(108.1 + (x / 1000) * 0.2).toFixed(5), +(16.15 - (y / 700) * 0.15).toFixed(5)])
      return { type: 'Feature', properties: { id: z.id, name: z.name, accepting: z.on }, geometry: { type: 'Polygon', coordinates: [ring] } }
    }),
  }
}

export default function ZonesScreen() {
  const [zones, setZones] = useState(zoneSeed)
  const [sel, setSel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<null | { kind: 'success' | 'info'; text: string }>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t) }, [])
  const say = (kind: 'success' | 'info', text: string) => { setToast({ kind, text }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(null), 2200) }

  const flip = (z: Zone) => { setZones((l) => l.map((x) => (x.id === z.id ? { ...x, on: !x.on } : x))); say(z.on ? 'info' : 'success', z.on ? `Đã ngừng tiếp nhận tại ${z.name}` : `Đã mở tiếp nhận tại ${z.name}`) }
  const download = () => {
    const geo = zonesGeoJson(zones)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(geo, null, 2)], { type: 'application/geo+json' }))
    a.download = 'phan-vung-da-nang.geojson'
    a.click()
    say('success', 'Đã tải GeoJSON')
  }

  return (
    <AdminShell title="Phân vùng GIS" subtitle={`${zones.filter((z) => z.on).length}/${zones.length} vùng đang tiếp nhận phản ánh`} toast={toast} actions={<Button size="lg" icon={Download} onClick={download}>Tải GeoJSON</Button>}>
      <div className="grid grid-cols-[1fr_380px] gap-4">
        <section className="relative h-[760px] overflow-hidden rounded-card shadow-card">
          {loading ? <Skeleton className="size-full" /> : (
            <>
              <MapCanvas>
              <svg viewBox="0 0 1000 700" preserveAspectRatio="none" className="absolute inset-0 size-full">
                {zones.map((z) => {
                  const pts = z.pts.map((p) => p.join(',')).join(' ')
                  const on = sel === z.id
                  return (
                    <polygon key={z.id} points={pts} onClick={() => setSel(z.id)} className="cursor-pointer transition-all duration-300" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                      fill={z.on ? '#e5251b' : '#9ca3af'} fillOpacity={!z.on ? 0.3 : on ? 0.28 : 0.14}
                      stroke={z.on ? '#e5251b' : '#6b6b70'} strokeWidth={on ? 4 : 2} strokeDasharray={z.on ? undefined : '8 6'} />
                  )
                })}
              </svg>
              {zones.map((z) => { const [x, y] = centroid(z.pts); return (
                <button key={z.id} onClick={() => setSel(z.id)} className={cn('absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[12px] font-semibold whitespace-nowrap shadow-card transition', sel === z.id ? 'bg-ink text-white' : 'bg-card', !z.on && 'opacity-60')} style={{ left: `${x}%`, top: `${y}%` }}>{z.name}</button>
              ) })}
              </MapCanvas>
              <div className="absolute bottom-4 left-4 flex gap-4 rounded-full bg-card px-4 py-2 text-[12px] font-semibold shadow-card">
                <span className="flex items-center gap-2"><span className="size-3 rounded-sm border-2 border-accent bg-accent/20" />Đang tiếp nhận</span>
                <span className="flex items-center gap-2"><span className="size-3 rounded-sm border-2 border-dashed border-muted bg-low/40" />Tạm dừng</span>
              </div>
            </>
          )}
        </section>

        <aside className="flex h-[760px] flex-col gap-3 overflow-auto rounded-card bg-surface p-3">
          <div className="flex items-center justify-between px-2 pt-1"><h2 className="text-[16px] font-semibold">Danh sách vùng</h2><span className="text-[12px] text-muted">Tiếp nhận phản ánh</span></div>
          {zones.map((z) => (
            <article key={z.id} onClick={() => setSel(z.id)} className={cn('flex cursor-pointer items-center gap-3 rounded-card bg-card p-4 shadow-card transition', sel === z.id && 'ring-2 ring-ink')}>
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', z.on ? 'bg-accent/10 text-accent' : 'bg-surface text-muted')}><MapPin size={18} {...ic} /></span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[14px] font-semibold">{z.name}</h3>
                <p className="text-[12px] text-muted">{z.open} phiếu đang mở · {z.on ? 'Đang tiếp nhận' : 'Tạm dừng'}</p>
              </div>
              <button role="switch" aria-checked={z.on} aria-label={`Tiếp nhận ${z.name}`} onClick={(e) => { e.stopPropagation(); flip(z) }} className={cn('flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors', z.on ? 'bg-ink' : 'bg-low')}>
                <span className={cn('size-5 rounded-full bg-white shadow-card transition-transform', z.on && 'translate-x-5')} />
              </button>
            </article>
          ))}
        </aside>
      </div>
    </AdminShell>
  )
}
