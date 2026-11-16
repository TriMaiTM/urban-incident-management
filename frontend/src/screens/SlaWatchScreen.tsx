'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, BellRing, Clock, MapPin, Repeat, Check } from 'lucide-react'
import { Button, HeaderStat, StatusPill, cn, ic, type Level } from '../components/primitives'
import { SLA_HOURS, deadlineOf, getTickets, isOpen, useTicketVersion } from '../data/tickets'
import DispatcherShell, { type ToastState } from './DispatcherShell'

type Ticket = { code: string; title: string; street: string; level: Level; hours: number; deadline: number; unit: string }
// Phiếu đang mở lấy từ nguồn dữ liệu chung; hạn SLA tính từ lúc gửi + mức ưu tiên.
const buildSeed = (): Ticket[] =>
  getTickets().filter((t) => isOpen(t) && t.priority !== 'low').map((t) => ({
    code: t.id, title: t.title, street: `${t.address.replace(/^\d+ /, '')}`, level: t.priority, hours: SLA_HOURS[t.priority], deadline: deadlineOf(t), unit: t.unit,
  }))
const units = ['Đội CTĐT Hải Châu', 'Đội Thoát nước 2', 'Đội Cầu đường 1', 'Đội Cầu đường 2', 'Đội Cây xanh Thanh Khê', 'Đội Vệ sinh 3']
const columns: { level: Level; label: string; hours: number }[] = [
  { level: 'urgent', label: 'Khẩn cấp', hours: 4 },
  { level: 'high', label: 'Cao', hours: 12 },
  { level: 'normal', label: 'Trung bình', hours: 24 },
]
const dot = { urgent: 'bg-urgent', high: 'bg-high', normal: 'bg-normal' } as Record<string, string>

const fmt = (s: number) => {
  const a = Math.abs(s)
  const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), x = a % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`
}

function TicketCard({ t, remain, nudged, onNudge, onTransfer }: { t: Ticket; remain: number; nudged: boolean; onNudge: () => void; onTransfer: (u: string) => void }) {
  const [pick, setPick] = useState(false)
  const total = t.hours * 3600
  const late = remain < 0
  const p = Math.min(1, Math.max(0, 1 - remain / total))
  const bar = late ? 'bg-white' : p >= 0.85 ? 'bg-urgent' : p >= 0.6 ? 'bg-high' : 'bg-done'
  return (
    <article className={cn('relative animate-rise rounded-card p-4 shadow-card transition', late ? 'bg-urgent text-white' : 'bg-card')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn('text-[12px] font-semibold tabular-nums', late ? 'text-white/80' : 'text-muted')}>{t.code}</p>
          <h3 className="mt-0.5 truncate text-[16px] font-semibold">{t.title}</h3>
        </div>
        {late ? <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white px-3 text-[12px] font-semibold text-urgent"><AlertTriangle size={12} {...ic} />Trễ hạn</span> : <StatusPill level={t.level} />}
      </div>
      <p className={cn('mt-2 flex items-center gap-1 text-[12px]', late ? 'text-white/85' : 'text-muted')}><MapPin size={12} {...ic} />{t.street}</p>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className={cn('text-[12px]', late ? 'text-white/80' : 'text-muted')}>{late ? 'Đã trễ' : 'Còn lại'}</p>
          <p className={cn('flex items-center gap-2 text-[24px] leading-none font-bold tabular-nums', !late && p >= 0.85 && 'text-urgent')}><Clock size={18} {...ic} />{fmt(remain)}</p>
        </div>
        <p className={cn('text-[12px] font-semibold tabular-nums', late ? 'text-white/80' : 'text-muted')}>{late ? '100%' : `${Math.round(p * 100)}%`} SLA</p>
      </div>
      <div className={cn('mt-3 h-2 overflow-hidden rounded-full', late ? 'bg-white/25' : 'bg-surface')}>
        <div className={cn('h-full rounded-full transition-all duration-700', bar)} style={{ width: `${late ? 100 : p * 100}%` }} />
      </div>
      <p className={cn('mt-3 truncate text-[12px]', late ? 'text-white/85' : 'text-muted')}>{t.unit}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={onNudge} className={cn('inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-semibold transition active:scale-95', late ? 'bg-white text-urgent' : nudged ? 'bg-done/10 text-done' : 'bg-ink text-white hover:bg-ink/85')}>
          {nudged ? <Check size={14} {...ic} /> : <BellRing size={14} {...ic} />}{nudged ? 'Đã đôn đốc' : 'Đôn đốc'}
        </button>
        <button onClick={() => setPick(!pick)} className={cn('inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-semibold transition active:scale-95', late ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-surface hover:bg-page')}>
          <Repeat size={14} {...ic} />Chuyển đơn vị
        </button>
      </div>
      {pick && (
        <div className="absolute right-4 bottom-14 z-10 w-[220px] animate-rise rounded-tile bg-card p-1 text-ink shadow-card ring-1 ring-black/5">
          {units.filter((u) => u !== t.unit).map((u) => (
            <button key={u} onClick={() => { onTransfer(u); setPick(false) }} className="flex h-9 w-full items-center rounded-lg px-3 text-left text-[12px] font-semibold hover:bg-surface">{u}</button>
          ))}
        </div>
      )}
    </article>
  )
}

export default function SlaWatchScreen() {
  const version = useTicketVersion()
  const [tickets, setTickets] = useState(buildSeed)
  useEffect(() => { setTickets(buildSeed()) }, [version])
  const [tick, setTick] = useState(0)
  const [nudged, setNudged] = useState<string[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(i)
  }, [])
  const show = (kind: 'success' | 'info', text: string) => {
    setToast({ kind, text })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2200)
  }

  void tick // render lại mỗi giây để đồng hồ chạy
  const remainOf = (t: Ticket) => Math.round((t.deadline - Date.now()) / 1000)
  const soon = tickets.filter((t) => { const r = remainOf(t); return r >= 0 && 1 - r / (t.hours * 3600) >= 0.85 }).length
  const late = tickets.filter((t) => remainOf(t) < 0).length

  return (
    <DispatcherShell
      title="Giám sát SLA"
      subtitle={`${tickets.length} phiếu đang theo dõi · ${late} đã trễ hạn`}
      toast={toast}
      actions={<HeaderStat dark title="Sắp trễ" value={soon} icon={AlertTriangle} />}
    >
      <div className="grid grid-cols-3 items-start gap-4">
        {columns.map((c) => {
          const list = tickets.filter((t) => t.level === c.level).sort((a, b) => remainOf(a) - remainOf(b))
          return (
            <section key={c.level} className="flex flex-col gap-3 rounded-card bg-surface p-3">
              <div className="flex items-center justify-between px-2 pt-1">
                <h2 className="flex items-center gap-2 text-[16px] font-semibold"><span className={cn('size-2.5 rounded-full', dot[c.level])} />{c.label}<span className="text-[12px] font-medium text-muted">({c.hours}h)</span></h2>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-card px-2 text-[12px] font-semibold">{list.length}</span>
              </div>
              {list.map((t) => (
                <TicketCard
                  key={t.code}
                  t={t}
                  remain={remainOf(t)}
                  nudged={nudged.includes(t.code)}
                  onNudge={() => { setNudged((l) => [...l, t.code]); show('success', `Đã đôn đốc ${t.unit}`) }}
                  onTransfer={(u) => { setTickets((l) => l.map((x) => (x.code === t.code ? { ...x, unit: u } : x))); show('info', `Đã chuyển sang ${u}`) }}
                />
              ))}
            </section>
          )
        })}
      </div>
    </DispatcherShell>
  )
}
