'use client'

import { useState } from 'react'
import { Crosshair, Package, Sparkles, X, Wrench } from 'lucide-react'
import { Button, cn, ic } from '../components/primitives'
import GoongBentoMap from '../components/GoongBentoMap'
import { DEMO_ID, getTicket } from '../data/tickets'
import DispatcherShell, { type ToastState } from './DispatcherShell'

type Status = 'idle' | 'moving' | 'working'
type Unit = {
  id: string
  name: string
  status: Status
  lngLat: [number, number]
  crew: number
  note: string
  mats: { label: string; qty: number; low?: boolean }[]
}
const demo = getTicket(DEMO_ID)!
const incident = {
  lngLat: [108.2185, 16.0678] as [number, number],
  title: demo.title,
  code: demo.id,
}
const units: Unit[] = [
  { id: 'u1', name: 'Đội CTĐT Hải Châu', status: 'idle', lngLat: [108.2145, 16.0565], crew: 5, note: 'Trạm Hải Châu', mats: [{ label: 'Máy bơm', qty: 2 }, { label: 'Bao cát', qty: 80 }] },
  { id: 'u2', name: 'Đội Thoát nước 2', status: 'idle', lngLat: [108.1965, 16.0655], crew: 4, note: 'Trạm Thanh Khê', mats: [{ label: 'Máy bơm', qty: 1, low: true }, { label: 'Ống hút', qty: 6 }] },
  { id: 'u3', name: 'Đội Cầu đường 1', status: 'moving', lngLat: [108.154, 16.082], crew: 6, note: 'Đang tới Liên Chiểu', mats: [{ label: 'Nhựa nguội', qty: 12 }, { label: 'Cọc tiêu', qty: 30 }] },
  { id: 'u4', name: 'Đội Cây xanh Thanh Khê', status: 'moving', lngLat: [108.203, 16.071], crew: 4, note: 'Đang tới Điện Biên Phủ', mats: [{ label: 'Cưa máy', qty: 2 }, { label: 'Xe cẩu', qty: 1 }] },
  { id: 'u5', name: 'Đội Điện lực Sơn Trà', status: 'working', lngLat: [108.239, 16.076], crew: 3, note: 'Đang thi công Ngô Quyền', mats: [{ label: 'Dây cáp', qty: 40 }, { label: 'Cầu dao', qty: 2, low: true }] },
  { id: 'u6', name: 'Đội Vệ sinh 3', status: 'working', lngLat: [108.248, 16.032], crew: 7, note: 'Đang thi công Trường Sa', mats: [{ label: 'Xe ép rác', qty: 1 }, { label: 'Găng tay', qty: 50 }] },
  { id: 'u7', name: 'Đội Cầu đường 2', status: 'idle', lngLat: [108.194, 16.024], crew: 5, note: 'Trạm Cẩm Lệ', mats: [{ label: 'Nhựa nguội', qty: 20 }, { label: 'Biển báo', qty: 8 }] },
]
const meta: Record<Status, { label: string; pin: string; dot: string }> = {
  idle: { label: 'Rảnh', pin: 'bg-done text-white', dot: 'bg-done' },
  moving: { label: 'Di chuyển', pin: 'bg-high text-white', dot: 'bg-high' },
  working: { label: 'Thi công', pin: 'bg-ink text-white', dot: 'bg-ink' },
}
// Khoảng cách km xấp xỉ theo tọa độ địa lý Đà Nẵng
const dist = (u: Unit) =>
  Math.hypot((u.lngLat[0] - incident.lngLat[0]) * 106, (u.lngLat[1] - incident.lngLat[1]) * 111)
const nearest = units.filter((u) => u.status === 'idle').sort((a, b) => dist(a) - dist(b))[0]

export default function FieldUnitsScreen() {
  const [suggest, setSuggest] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [assigned, setAssigned] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const counts = (s: Status) => units.filter((u) => u.status === s).length
  const best = units.find((u) => u.id === assigned) ?? (suggest ? nearest : null)
  const dispatch = (u: Unit) => {
    setAssigned(u.id)
    setSel(u.id)
    setToast({
      kind: u.status === 'idle' ? 'success' : 'info',
      text: u.status === 'idle' ? `Đã điều động ${u.name}` : `Đã điều ${u.name} sang sự cố mới, việc hiện tại tạm hoãn`,
    })
    setTimeout(() => setToast(null), 2400)
  }

  const unitMarkers = units.map((u0) => {
    const u = u0.id === assigned ? { ...u0, status: 'moving' as Status } : u0
    const on = best?.id === u.id
    return {
      id: u.id,
      name: u.name,
      status: u.status,
      lngLat: u.lngLat,
      selected: sel === u.id,
      highlighted: on,
      dimmed: !!best && !on,
    }
  })

  return (
    <DispatcherShell
      title="Điều động đội"
      subtitle={`${units.length} đội ngoài hiện trường · sự cố ${incident.code}`}
      toast={toast}
      actions={
        <div className="flex items-center gap-2">
          {(suggest || assigned) && (
            <Button
              size="lg"
              variant="subtle"
              icon={X}
              onClick={() => {
                setSuggest(false)
                setAssigned(null)
              }}
            >
              Bỏ gợi ý
            </Button>
          )}
          <Button
            size="lg"
            variant="hero"
            icon={Sparkles}
            onClick={() => {
              setSuggest(true)
              setSel(nearest.id)
            }}
          >
            Gợi ý đội gần nhất
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-[1fr_380px] gap-4">
        <section className="relative h-[calc(100dvh-104px)] min-h-[480px] overflow-hidden rounded-card shadow-card">
          <GoongBentoMap
            fill
            controls="bottom"
            initialCenter={[108.21, 16.058]}
            initialZoom={12.8}
            userPin={{
              x: 45,
              y: 62,
              lng: incident.lngLat[0],
              lat: incident.lngLat[1],
              level: 'urgent',
              bad: true,
              radius: 50,
            }}
            fieldUnits={unitMarkers}
            onSelectFieldUnit={setSel}
            dispatchRoute={best ? { from: best.lngLat, to: incident.lngLat } : null}
          />
          <div className="absolute bottom-4 left-4 z-10 flex gap-3 rounded-full bg-card px-4 py-2 shadow-card">
            {(Object.keys(meta) as Status[]).map((s) => (
              <span key={s} className="flex items-center gap-2 text-[12px] font-semibold">
                <span className={cn('size-2.5 rounded-full', meta[s].dot)} />
                {meta[s].label} {counts(s)}
              </span>
            ))}
          </div>
          {best && (
            <div className="absolute top-4 left-4 z-10 flex animate-rise items-center gap-3 rounded-card bg-ink p-4 text-white shadow-card">
              <Crosshair size={20} {...ic} />
              <div>
                <p className="text-[12px] text-white/70">Đội gần nhất</p>
                <p className="text-[14px] font-semibold">
                  {best.name} · {dist(best).toFixed(1)} km · ~{Math.max(3, Math.round(dist(best) * 3))} phút
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="flex h-[calc(100dvh-104px)] min-h-[480px] flex-col gap-3 overflow-auto rounded-card bg-surface p-3">
          <div className="flex items-center justify-between px-2 pt-1">
            <h2 className="text-[16px] font-semibold">Danh sách đội</h2>
            <span className="text-[12px] text-muted">Sắp theo khoảng cách</span>
          </div>
          {[...units]
            .sort((a, b) => dist(a) - dist(b))
            .map((u0) => {
              const u = u0.id === assigned ? { ...u0, status: 'moving' as Status, note: `Đang tới ${incident.code}` } : u0
              const on = best?.id === u.id
              const done = assigned === u.id
              return (
                <article
                  key={u.id}
                  onClick={() => setSel(u.id)}
                  className={cn(
                    'cursor-pointer rounded-card bg-card p-4 shadow-card transition',
                    on ? 'ring-2 ring-done' : sel === u.id && 'ring-2 ring-ink',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-[14px] font-semibold">{u.name}</h3>
                      <p className="mt-0.5 truncate text-[12px] text-muted">
                        {u.note} · {u.crew} người
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold">
                      <span className={cn('size-2 rounded-full', meta[u.status].dot)} />
                      {meta[u.status].label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {u.mats.map((m) => (
                      <span
                        key={m.label}
                        className={cn(
                          'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium',
                          m.low ? 'bg-urgent/10 text-urgent' : 'bg-surface',
                        )}
                      >
                        <Package size={12} {...ic} />
                        {m.label} {m.qty}
                        {m.low && ' · sắp hết'}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[12px] text-muted tabular-nums">{dist(u).toFixed(1)} km tới sự cố</span>
                    {on && !done && suggest && (
                      <span className="mr-2 inline-flex h-6 items-center rounded-full bg-done/10 px-2.5 text-[12px] font-semibold text-done">
                        Gần nhất
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant={done ? 'subtle' : u.status === 'idle' ? 'primary' : 'secondary'}
                      icon={Wrench}
                      disabled={done}
                      onClick={() => dispatch(u0)}
                    >
                      {done ? 'Đã điều động' : u.status === 'idle' ? 'Điều động' : 'Điều sang'}
                    </Button>
                  </div>
                </article>
              )
            })}
        </aside>
      </div>
    </DispatcherShell>
  )
}
