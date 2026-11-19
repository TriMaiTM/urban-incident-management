'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, FilterX, Image as ImageIcon, LayoutGrid, Map as MapIcon, MapPin, Users, X } from 'lucide-react'
import { Button, Dropdown, EmptyState, ErrorState, Skeleton, StatusPill, cn, ic } from '../components/primitives'
import { MapBentoViewport } from '../components/data'
import CitizenShell from './CitizenShell'
import { districts, getIncidents, kindLabel, kinds, statuses, type Incident } from './HomeScreen'
import { getTicket, useTicketVersion } from '../data/tickets'

function Card({ i, top }: { i: Incident; top: boolean }) {
  const imgUrl = getTicket(i.code).imageUrl
  return (
    <a href={`/tracking/${i.code}`} className={cn('group animate-rise block overflow-hidden rounded-card p-2 shadow-card transition hover:-translate-y-1', top ? 'bg-ink text-white' : 'bg-card')}>
      <div className="relative h-40 overflow-hidden rounded-tile bg-surface">
        {imgUrl ? (
          <img src={imgUrl} alt={i.title} className="size-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted"><ImageIcon size={28} {...ic} /></div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5"><StatusPill level={i.level} /></div>
        <span className="absolute right-2 bottom-2 rounded-full bg-card px-2.5 py-1 text-[12px] font-semibold text-ink">{kindLabel[i.kind]}</span>
      </div>
      <div className="p-3">
        <p className={cn('text-[12px] font-semibold tabular-nums', top ? 'text-white/60' : 'text-muted')}>{i.code}</p>
        <h3 className="mt-0.5 text-[16px] leading-snug font-semibold">{i.title}</h3>
        <p className={cn('mt-2 flex items-center gap-1 text-[12px]', top ? 'text-white/70' : 'text-muted')}><MapPin size={12} {...ic} />{i.address}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className={cn('flex items-center gap-1 text-[12px]', top ? 'text-white/70' : 'text-muted')}><Clock size={12} {...ic} />{i.time} trước</span>
          <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold tabular-nums', top ? 'bg-accent text-white' : 'bg-surface')}><Users size={14} {...ic} />Cùng gặp {i.supporters}</span>
        </div>
        {top && <p className="mt-3 text-[12px] font-semibold text-white/70">Nhiều người xác nhận nhất</p>}
      </div>
    </a>
  )
}

export default function IncidentListScreen() {
  const forced = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(forced === 'error')
  const [view, setView] = useState<'grid' | 'map'>('grid')
  const [district, setDistrict] = useState(districts[0])
  const [kind, setKind] = useState(kinds[0])
  const [status, setStatus] = useState(statuses[0])
  const [sel, setSel] = useState<number | undefined>()
  const version = useTicketVersion()
  useEffect(() => { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t) }, [])

  const list = useMemo(() => forced === 'empty' ? [] : getIncidents().filter((i) =>
    (district === districts[0] || i.district === district) &&
    (kind === kinds[0] || kindLabel[i.kind] === kind) &&
    (status === statuses[0] || (status === 'Hoàn tất' ? i.level === 'done' : i.level !== 'done'))), [district, kind, status, forced, version])
  useEffect(() => setSel(undefined), [list, view])
  const topCode = list.length ? list.reduce((a, b) => (b.supporters > a.supporters ? b : a)).code : ''
  const clear = () => { setDistrict(districts[0]); setKind(kinds[0]); setStatus(statuses[0]) }
  const picked = sel !== undefined ? list[sel] : undefined

  const seg = (v: 'grid' | 'map', I: typeof MapIcon, label: string) => (
    <button onClick={() => setView(v)} className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition', view === v ? 'bg-ink text-white' : 'text-muted hover:text-ink')}><I size={14} {...ic} />{label}</button>
  )

  let body
  if (failed) body = <div className="rounded-card bg-card p-8 text-center shadow-card"><ErrorState text="Không tải được danh sách" /><Button variant="subtle" onClick={() => setFailed(false)}>Thử lại</Button></div>
  else if (loading) body = <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-[340px]" />)}</div>
  else if (list.length === 0) body = <div className="rounded-card bg-card p-8 text-center shadow-card"><EmptyState text="Không có sự cố phù hợp" /><Button variant="subtle" icon={FilterX} onClick={clear}>Xóa bộ lọc</Button></div>
  else if (view === 'grid') body = <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map((i) => <Card key={i.code} i={i} top={i.code === topCode && list.length > 1} />)}</div>
  else body = (
    <div className="relative h-[calc(100vh-300px)] min-h-[460px] overflow-hidden rounded-card shadow-card md:h-[640px]">
      <MapBentoViewport fill detailed controls="bottom" pins={list.map((i) => ({ x: i.x, y: i.y, level: i.level }))} selectedPin={sel} onPinClick={setSel} />
      {picked && (
        <div key={picked.code} className={cn('absolute inset-x-3 bottom-3 animate-rise rounded-card p-2 shadow-card md:inset-x-auto md:bottom-4 md:left-4 md:w-[360px]', picked.code === topCode && list.length > 1 ? 'bg-ink text-white' : 'bg-card')}>
          <div className="flex gap-3">
            <div className="h-24 w-28 shrink-0 overflow-hidden rounded-tile bg-surface">
              {getTicket(picked.code).imageUrl ? (
                <img src={getTicket(picked.code).imageUrl} alt={picked.title} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-muted"><ImageIcon size={22} {...ic} /></div>
              )}
            </div>
            <div className="min-w-0 flex-1 py-1 pr-1">
              <div className="flex items-start justify-between gap-2">
                <StatusPill level={picked.level} />
                <button onClick={() => setSel(undefined)} aria-label="Đóng" className={cn('flex size-6 items-center justify-center rounded-full', picked.code === topCode && list.length > 1 ? 'bg-white/15' : 'bg-surface')}><X size={14} {...ic} /></button>
              </div>
              <h3 className="mt-1 truncate text-[14px] font-semibold">{picked.title}</h3>
              <p className="flex items-center gap-1 truncate text-[12px] opacity-70"><MapPin size={12} {...ic} />{picked.address}</p>
              <p className="mt-1 flex items-center gap-3 text-[12px] opacity-70"><span className="flex items-center gap-1"><Clock size={12} {...ic} />{picked.time}</span><span className="flex items-center gap-1"><Users size={12} {...ic} />Cùng gặp {picked.supporters}</span></p>
            </div>
          </div>
          <div className="mt-2 px-1 pb-1 [&>button]:w-full"><Button size="sm" variant={picked.code === topCode && list.length > 1 ? 'hero' : 'primary'} onClick={() => { window.location.href = `/tracking/${picked.code}` }}>Xem tiến độ</Button></div>
        </div>
      )}
    </div>
  )

  return (
    <CitizenShell title="Danh sách sự cố" sub={`${list.length} sự cố quanh bạn`}>
      <div className="mb-4 flex flex-wrap items-center gap-2 md:gap-3">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 md:flex-none md:overflow-visible md:pb-0">
          <div className="w-[150px] shrink-0 rounded-full shadow-card"><Dropdown pill placeholder="Quận" value={district} options={districts} onChange={setDistrict} /></div>
          <div className="w-[140px] shrink-0 rounded-full shadow-card"><Dropdown pill placeholder="Loại" value={kind} options={kinds} onChange={setKind} /></div>
          <div className="w-[170px] shrink-0 rounded-full shadow-card"><Dropdown pill placeholder="Trạng thái" value={status} options={statuses} onChange={setStatus} /></div>
        </div>
        <div className="ml-auto inline-flex gap-1 rounded-full bg-card p-1 shadow-card">{seg('grid', LayoutGrid, 'Lưới')}{seg('map', MapIcon, 'Bản đồ')}</div>
      </div>
      {body}
    </CitizenShell>
  )
}
