'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronUp, Plus, Search, Siren, Users, Wrench, X } from 'lucide-react'
import { Button, EmptyState, ErrorState, IconChip, StatusPill, Toast, cn, ic, type Level } from '../components/primitives'
import { IncidentListItem, InputField, MapBentoViewport, MetricBentoCard } from '../components/data'
import { CitizenTabBar, TopPillNav } from '../components/nav'
import { agoText, getTickets, levelOf, useTicketVersion, type Ticket } from '../data/tickets'

export type Kind = 'road' | 'flood' | 'tree' | 'trash' | 'light'
export type Incident = {
  code: string; title: string; address: string; district: string; time: string
  kind: Kind; level: Level; x: number; y: number; supporters: number
}
export const kindLabel: Record<Kind, string> = { road: 'Đường', flood: 'Ngập úng', tree: 'Cây đổ', trash: 'Rác', light: 'Đèn' }

// Tọa độ ghim tính theo % trên ảnh bản đồ placeholder.
const toIncident = (t: Ticket): Incident => ({
  code: t.id, title: t.title, address: `${t.district}, Đà Nẵng`, district: t.district, time: agoText(t.submittedAt), kind: t.kind,
  level: levelOf(t), x: t.x, y: t.y, supporters: t.supporters,
})
/** Sự cố công khai (không gồm phiếu bị từ chối), đọc từ nguồn dữ liệu chung. */
export const getIncidents = (): Incident[] => getTickets().filter((t) => t.status !== 'REJECTED').map(toIncident)
export const incidents: Incident[] = getIncidents()

export const districts = ['Tất cả quận', 'Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang']
export const kinds = ['Tất cả loại', ...Object.values(kindLabel)]
export const statuses = ['Mọi tình trạng', 'Đang xử lý', 'Hoàn tất']

function useMedia(q: string) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(q)
    const f = () => setM(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [q])
  return m
}

function FilterBar({ onDistrict, onKind, onStatus }: { onDistrict: (v: string) => void; onKind: (v: string) => void; onStatus: (v: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto md:overflow-visible">
      <div className="w-[150px] shrink-0 rounded-full shadow-card"><InputField pill kind="select" placeholder="Quận" value="Tất cả quận" options={districts} onChange={onDistrict} /></div>
      <div className="w-[140px] shrink-0 rounded-full shadow-card"><InputField pill kind="select" placeholder="Loại" value="Tất cả loại" options={kinds} onChange={onKind} /></div>
      <div className="w-[160px] shrink-0 rounded-full shadow-card"><InputField pill kind="select" placeholder="Tình trạng" value="Mọi tình trạng" options={statuses} onChange={onStatus} /></div>
    </div>
  )
}

function PinDetailCard({ item, supporters, onJoin, onClose }: { item: Incident; supporters: number; onJoin: () => void; onClose: () => void }) {
  return (
    <section key={item.code} className="animate-rise rounded-card bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold tabular-nums">{item.code}</h2>
        <Button size="sm" variant="subtle" icon={X} onClick={onClose} />
      </div>
      <IncidentListItem layout="card" kind={item.kind} title={item.title} address={item.address} time={item.time} level={item.level} />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[14px] font-semibold"><IconChip icon={Users} size={32} />{supporters}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="subtle" onClick={onJoin}>Tôi cũng gặp</Button>
          <Button size="sm" onClick={() => { window.location.href = `/tracking/${item.code}` }}>Xem tiến độ</Button>
        </div>
      </div>
    </section>
  )
}

export default function HomeScreen() {
  const desktop = useMedia('(min-width: 768px)')
  const forced = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(forced === 'error')
  const [district, setDistrict] = useState('Tất cả quận')
  const [kind, setKind] = useState('Tất cả loại')
  const [status, setStatus] = useState('Mọi tình trạng')
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [joined, setJoined] = useState<Record<string, number>>({})
  const [toast, setToast] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900)
    return () => clearTimeout(t)
  }, [])

  const version = useTicketVersion()
  const all = useMemo(getIncidents, [version])
  const stat = useMemo(() => {
    const ts = getTickets()
    return { fresh: ts.filter((t) => Date.now() - t.submittedAt < 86_400_000).length, working: ts.filter((t) => t.status === 'IN_PROGRESS').length, closed: ts.filter((t) => t.status === 'CLOSED').length }
  }, [version])
  const list = useMemo(() => {
    if (forced === 'empty') return []
    return all.filter(
      (i) =>
        (district === 'Tất cả quận' || i.district === district) &&
        (kind === 'Tất cả loại' || kindLabel[i.kind] === kind) &&
        (status === 'Mọi tình trạng' || (status === 'Hoàn tất' ? i.level === 'done' : i.level !== 'done')),
    )
  }, [all, district, kind, status, forced])

  const code = query.trim().toUpperCase()
  const match = all.find((i) => i.code === code)
  const notFound = code.length >= 14 && !match
  useEffect(() => {
    if (match) setSel(match.code)
  }, [match])

  const selected = list.find((i) => i.code === sel) ?? null
  const clearFilters = () => { setDistrict('Tất cả quận'); setKind('Tất cả loại'); setStatus('Mọi tình trạng'); setResetKey((k) => k + 1) }
  const choose = (c: string) => { setSel(c); setSheetOpen(false) }
  const join = () => { if (!selected) return; setJoined((j) => ({ ...j, [selected.code]: (j[selected.code] ?? 0) + 1 })); setToast(true); setTimeout(() => setToast(false), 2000) }
  const goReport = () => { window.location.href = '/report' }

  const search = (
    <div className="rounded-full shadow-card md:w-[300px]">
      <InputField kind="search" placeholder="Tìm mã phiếu" onChange={setQuery} error={notFound ? 'Mã không tồn tại' : undefined} />
    </div>
  )
  const filters = <FilterBar key={resetKey} onDistrict={setDistrict} onKind={setKind} onStatus={setStatus} />
  const metrics = (
    <div className="grid grid-cols-3 gap-2 md:w-[640px] md:gap-4">
      <MetricBentoCard compact dark title="Tiếp nhận" value={stat.fresh} icon={Plus} chart="bars" series={[3, 5, 4, 7, 6, 9, 12]} />
      <MetricBentoCard compact title="Đang xử lý" value={stat.working} icon={Wrench} tone="high" chart="spark" series={[4, 6, 5, 8, 7, 9, 10]} />
      <MetricBentoCard compact title="Đã hoàn tất" value={stat.closed} icon={CheckCircle2} tone="done" chart="bars" series={[2, 3, 5, 4, 6, 7, 9]} />
    </div>
  )

  const emptyBlock = !loading && !failed && list.length === 0 && (
    <div className="animate-rise absolute top-1/2 left-1/2 z-20 w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-card bg-card p-6 text-center shadow-card">
      <EmptyState icon={Search} text="Không có sự cố" />
      <div className="mt-2 flex justify-center"><Button variant="subtle" onClick={clearFilters}>Xóa lọc</Button></div>
    </div>
  )
  const errorBlock = failed && (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/70 backdrop-blur-sm">
      <div className="animate-rise rounded-card bg-card p-6 text-center shadow-card">
        <ErrorState text="Không tải được bản đồ" />
        <Button onClick={() => setFailed(false)}>Thử lại</Button>
      </div>
    </div>
  )
  const loadingBlock = loading && (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/50 backdrop-blur-sm">
      <div className="size-12 animate-spin rounded-full border-4 border-card border-t-ink" />
    </div>
  )

  const hero = (
    <span className="relative inline-flex">
      <span className="pointer-events-none absolute inset-0 animate-pulse-soft rounded-full bg-accent" />
      <Button variant="hero" size="lg" icon={Siren} onClick={goReport}>Báo sự cố ngay</Button>
    </span>
  )

  return (
    <div className="fixed inset-0 overflow-hidden bg-page">
      <div className="absolute inset-0 [&>div]:rounded-none">
        <MapBentoViewport
          fill
          image="/danang-map.png"
          controls={desktop ? 'bottom-left' : 'top'}
          pins={list}
          selectedPin={selected ? list.indexOf(selected) : undefined}
          onPinClick={(i) => setSel(list[i].code)}
          zoom={zoom}
          onZoom={(d) => setZoom((z) => (d === 0 ? 1 : Math.min(2, Math.max(1, z + d * 0.3))))}
          onPick={() => setSel(null)}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-page/80 to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-3 p-4 md:p-6 [&>*]:pointer-events-auto">
        {desktop && <TopPillNav active={0} />}
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-3">
          {search}
          {filters}
        </div>
        {metrics}
      </div>

      {loadingBlock}
      {errorBlock}
      {emptyBlock}

      {selected && (
        <div className={cn('absolute z-30', desktop ? 'top-[210px] right-6 w-[380px]' : 'inset-x-4 bottom-[262px]')}>
          <PinDetailCard item={selected} supporters={selected.supporters + (joined[selected.code] ?? 0)} onJoin={join} onClose={() => setSel(null)} />
        </div>
      )}
      {toast && <div className="absolute top-24 left-1/2 z-40 -translate-x-1/2 animate-rise md:top-28"><Toast kind="success" text="Đã cộng +1" /></div>}

      {desktop ? (
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">{hero}</div>
      ) : (
        <>
          <div className={cn('absolute bottom-[262px] left-1/2 z-20 -translate-x-1/2 transition duration-300', (sheetOpen || !!selected) && 'pointer-events-none translate-y-4 opacity-0')}>{hero}</div>
          <div
            className="fixed inset-x-0 bottom-[96px] z-30 flex flex-col rounded-t-[20px] bg-page shadow-[0_-8px_32px_rgba(0,0,0,0.12)] transition-[height] duration-500 ease-out"
            style={{ height: sheetOpen ? 'calc(100dvh - 96px - 120px)' : 150 }}
          >
            <button onClick={() => setSheetOpen(!sheetOpen)} aria-label="Mở danh sách" className="flex shrink-0 items-center justify-between px-4 py-3">
              <span className="text-[16px] font-semibold">Sự cố gần đây</span>
              <span className="flex h-6 items-center gap-2 rounded-full bg-card px-3 text-[12px] font-semibold shadow-card">
                {list.length}
                <ChevronUp size={14} {...ic} className={cn('transition duration-500', sheetOpen && 'rotate-180')} />
              </span>
            </button>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
              {loading && [0, 1, 2].map((i) => <IncidentListItem key={i} state="loading" kind="road" title="" address="" time="" level="low" />)}
              {!loading && failed && <IncidentListItem state="error" kind="road" title="" address="" time="" level="low" />}
              {!loading && !failed && list.length === 0 && (
                <div className="rounded-card bg-card"><EmptyState icon={Search} text="Không có sự cố" /><div className="flex justify-center pb-4"><Button variant="subtle" onClick={clearFilters}>Xóa lọc</Button></div></div>
              )}
              {!loading && !failed && list.map((i) => (
                <div key={i.code} role="button" onClick={() => choose(i.code)} className="animate-rise">
                  <IncidentListItem kind={i.kind} title={i.title} address={i.address} time={i.time} level={i.level} status={sel === i.code ? 'selected' : 'default'} />
                </div>
              ))}
            </div>
          </div>
          <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-4"><CitizenTabBar /></div>
        </>
      )}
    </div>
  )
}
