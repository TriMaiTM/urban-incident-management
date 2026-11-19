'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, Package, RotateCcw, ShieldCheck, TrafficCone, Wrench, X } from 'lucide-react'
import { Avatar, HeaderStat, Button, EmptyState, ErrorState, IconChip, Skeleton, Toast, cn, ic } from '../components/primitives'
import { CompareEvidence, MapBentoViewport } from '../components/data'
import { DispatcherRail } from '../components/nav'
import { DEMO_ID, clock, deadlineOf, getTickets, gpsDeviation, setStatus, shortHash, useTicketVersion } from '../data/tickets'
import { plan } from './technicianData'

type Case = {
  id: string; title: string; address: string; gps: number; ax: number; ay: number; bx: number; by: number
  lat: number; lng: number; latB: number; lngB: number
  measure: string; material: string; time: string; minutes: number; hash: string; onTime: boolean
}
/** Phiếu chờ nghiệm thu (trạng thái RESOLVED) lấy từ nguồn dữ liệu chung (phiếu mới nhất lên đầu). */
const buildCases = (): Case[] =>
  getTickets()
    .filter((t) => t.status === 'RESOLVED')
    .sort((a, b) => b.submittedAt - a.submittedAt || Number(b.id === DEMO_ID) - Number(a.id === DEMO_ID))
    .map((t) => {
      const dev = gpsDeviation(t)
      const start = t.at.IN_PROGRESS ?? t.submittedAt
      const end = t.at.RESOLVED ?? Date.now()
      return {
        id: t.id, title: t.title, address: t.address, gps: dev, ax: t.x, ay: t.y, bx: t.x + dev / 3, by: t.y + dev / 9,
        lat: t.gps.lat, lng: t.gps.lng,
        latB: t.gpsAfter?.lat ?? t.gps.lat + 0.0001,
        lngB: t.gpsAfter?.lng ?? t.gps.lng + 0.0001,
        measure: plan[t.kind].steps.join(', '), material: plan[t.kind].materials.join(', '), time: `${clock(start)} – ${clock(end)}`,
        minutes: Math.max(1, Math.round((end - start) / 60000)), hash: shortHash(t.hash), onTime: end <= deadlineOf(t),
      }
    })
const emptyCase: Case = {
  id: '—', title: '', address: '', gps: 0, ax: 50, ay: 50, bx: 50, by: 50,
  lat: 16.0678, lng: 108.2208, latB: 16.0679, lngB: 108.2209,
  measure: '', material: '', time: '', minutes: 0, hash: '', onTime: true,
}
const RADIUS_PX = 110

function Confetti() {
  const dots = useMemo(() => Array.from({ length: 28 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 7) * 0.12, size: 6 + (i % 3) * 3, c: ['bg-white', 'bg-accent', 'bg-done'][i % 3] })), [])
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d, i) => (
        <span key={i} className={cn('absolute top-0 rounded-sm', d.c)} style={{ left: `${d.left}%`, width: d.size, height: d.size, animation: `fall 1.6s ease-in ${d.delay}s both` }} />
      ))}
    </div>
  )
}

export default function VerifyScreen() {
  const version = useTicketVersion()
  const forced = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state')
  const cases = useMemo(buildCases, [version])
  const [idx, setIdx] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [closed, setClosed] = useState<string[]>([])
  const [reopened, setReopened] = useState<string[]>([])
  const [drafts, setDrafts] = useState<string[]>([])
  const [toast, setToast] = useState<null | { kind: 'success' | 'error' | 'info'; text: string }>(null)
  const [burst, setBurst] = useState(0)
  const timer = useRef<number | undefined>(undefined)
  const [failed, setFailed] = useState(forced === 'error')

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 450)
    return () => clearTimeout(t)
  }, [idx])

  const safeIdx = Math.min(idx, Math.max(0, cases.length - 1))
  const c = cases[safeIdx] ?? emptyCase
  const isClosed = closed.includes(c.id)
  const isReopened = reopened.includes(c.id)
  const gpsOk = c.gps < 50
  const checks = [
    { label: `GPS ${c.gps}m, ngưỡng 50m`, ok: gpsOk },
    { label: 'Ảnh đã làm mờ NĐ13', ok: true },
    { label: 'Biên bản đầy đủ', ok: true },
    { label: 'Đúng hạn SLA', ok: c.onTime },
  ]
  const pass = checks.every((x) => x.ok)
  const allDone = closed.length === cases.length || cases.length === 0

  const show = (kind: 'success' | 'error' | 'info', text: string) => {
    setToast({ kind, text })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2200)
  }
  const approve = () => { setClosed((l) => [...l, c.id]); setStatus(c.id, 'CONFIRMED'); setBurst((b) => b + 1); show('success', 'Đã xác nhận') }
  const redo = () => { setReopened((l) => [...l, c.id]); setStatus(c.id, 'REOPENED'); show('info', 'Đã yêu cầu làm lại') }
  const draft = () => { setDrafts((l) => [...l, c.id]); show('info', 'Đã lưu nháp') }
  const reload = () => { setClosed([]); setReopened([]); setDrafts([]); setIdx(0) }

  const busy = isClosed || isReopened
  const body = failed ? (
    <div className="flex flex-1 items-center justify-center"><div className="rounded-card bg-card p-8 text-center shadow-card"><ErrorState text="Không tải được phiếu" /><Button variant="subtle" onClick={() => setFailed(false)}>Thử lại</Button></div></div>
  ) : allDone ? (
    <div className="flex flex-1 items-center justify-center"><div className="rounded-card bg-card p-8 text-center shadow-card"><EmptyState icon={CheckCircle2} tone="done" text="Đã nghiệm thu hết" /><Button variant="subtle" onClick={reload}>Nạp lại</Button></div></div>
  ) : (
    <>
      <section className="animate-rise shrink-0 rounded-card bg-card p-1.5 shadow-card">
        {loading ? (
          <div className="grid grid-cols-2 gap-3"><Skeleton className="h-[180px]" /><Skeleton className="h-[180px]" /></div>
        ) : (
          <CompareEvidence photos chipMiddle height={180} gps={{ text: gpsOk ? `GPS: ${c.gps}m Đạt` : `GPS lệch ${c.gps}m`, ok: gpsOk }} />
        )}
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_360px_300px] gap-3.5 overflow-hidden">
        <section className="relative h-full min-h-0 overflow-hidden rounded-card shadow-card">
          <MapBentoViewport
            fill
            detailed
            controls="bottom"
            state={loading ? 'loading' : 'normal'}
            pins={[{ x: c.bx, y: c.by, lat: c.latB, lng: c.lngB, level: 'done', label: 'B' }]}
            userPin={{ x: c.ax, y: c.ay, lat: c.lat, lng: c.lng, level: 'low', radius: RADIUS_PX, label: 'A' }}
          />
          <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full bg-card p-1 pr-3.5 shadow-card">
            <IconChip icon={ShieldCheck} tone="ink" size={32} />
            <span className="text-[13px] font-semibold">Bán kính 50m</span>
          </div>
        </section>

        <section className="animate-rise flex min-h-0 flex-col overflow-y-auto rounded-card bg-card p-4 shadow-card" style={{ animationDelay: '80ms' }}>
          <h2 className="mb-3 shrink-0 text-[15px] font-semibold">Biên bản</h2>
          {loading ? (
            <div className="space-y-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <div key={c.id} className="animate-rise flex flex-1 flex-col justify-between gap-2.5 text-[13px]">
              {([[Wrench, c.measure], [Package, c.material], [Clock, `${c.time} · ${c.minutes} phút`], [TrafficCone, 'Đã mở lại làn đường']] as const).map(([I, v], i) => (
                <div key={i} className="flex items-center gap-2.5"><IconChip icon={I} size={32} /><span className="line-clamp-2">{v}</span></div>
              ))}
              <div className="mt-auto flex items-center gap-2.5 rounded-tile bg-surface p-2.5 text-[12px] text-muted">
                <Avatar name="Lê Văn Hùng" size={32} />
                <span className="min-w-0 truncate">KTV Lê Văn Hùng · TB-0457<br />SHA256 <span className="font-semibold text-ink tabular-nums">{c.hash}</span></span>
              </div>
            </div>
          )}
        </section>

        <section
          className="relative flex min-h-0 flex-col justify-between gap-3 overflow-y-auto rounded-card p-4 text-white shadow-card"
          style={{ background: isClosed ? 'radial-gradient(120% 140% at 100% 100%, rgba(22,163,74,0.55) 0%, rgba(22,163,74,0) 60%), #111111' : 'radial-gradient(120% 140% at 100% 100%, rgba(229,37,27,0.5) 0%, rgba(229,37,27,0) 60%), #111111' }}
        >
          {isClosed && <Confetti key={burst} />}
          <div className="relative flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Tổng kết</h2>
            <span className="relative flex size-9 items-center justify-center">
              {isClosed && <span className="absolute inset-0 animate-pulse-soft rounded-full bg-done" />}
              <IconChip icon={isClosed ? CheckCircle2 : pass ? Check : X} tone={isClosed || pass ? 'done' : 'urgent'} size={32} />
            </span>
          </div>
          <div className="relative">
            <p key={String(isClosed) + String(isReopened)} className="animate-rise text-[28px] leading-none font-bold">
              {isClosed ? 'Đã xác nhận' : isReopened ? 'Mở lại' : pass ? 'Đạt' : 'Không đạt'}
            </p>
            <ul className="mt-3 space-y-1.5">
              {checks.map((k) => (
                <li key={k.label} className="flex items-center gap-2 text-[12px] text-white/85">
                  {k.ok ? <Check size={14} {...ic} className="shrink-0 text-done" /> : <X size={14} {...ic} className="shrink-0 text-urgent" />}{k.label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 pt-0.5 pr-14">
        <Button size="md" variant="subtle" disabled={busy || drafts.includes(c.id)} onClick={draft}>{drafts.includes(c.id) ? 'Đã lưu nháp' : 'Lưu nháp'}</Button>
        <Button size="md" variant="secondary" icon={RotateCcw} disabled={busy} onClick={redo}>Yêu cầu làm lại</Button>
        <Button size="md" icon={Check} disabled={busy || !pass || loading} onClick={approve}>Duyệt nghiệm thu</Button>
      </div>
    </>
  )

  return (
    <div className="fixed inset-0 overflow-hidden bg-page">
      {toast && <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 animate-rise"><Toast kind={toast.kind} text={toast.text} /></div>}
      <div className="mx-auto flex h-dvh w-full max-w-[1440px] gap-4 p-4">
        <div className="shrink-0"><DispatcherRail /></div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <header className="flex shrink-0 items-center justify-between gap-4">
            <div className="min-w-0 animate-rise">
              <h1 className="text-[22px] leading-tight font-bold">Nghiệm thu</h1>
              <p className="mt-0.5 truncate text-[12px] text-muted">{c.id} · {c.address}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <HeaderStat dark title="Chờ nghiệm thu" value={Math.max(0, cases.length - closed.length)} icon={Clock} />

              {/* Compact paginator + dropdown selector so 10-100+ cases never overflow header */}
              <div className="relative flex h-12 items-center gap-1 rounded-full bg-card p-1 shadow-card">
                <button
                  type="button"
                  aria-label="Phiếu trước"
                  disabled={cases.length <= 1}
                  onClick={() => setIdx((safeIdx - 1 + cases.length) % Math.max(1, cases.length))}
                  className="flex size-9 items-center justify-center rounded-full bg-surface text-ink transition hover:bg-page disabled:opacity-40"
                >
                  <ChevronLeft size={16} {...ic} />
                </button>
                <button
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  className="flex h-9 items-center gap-2 rounded-full bg-ink px-3.5 text-[12px] font-semibold text-white transition hover:bg-ink/90"
                >
                  <span className="font-mono tabular-nums">{c.id.slice(-4)}</span>
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] tabular-nums">
                    {cases.length ? `${safeIdx + 1}/${cases.length}` : '0/0'}
                  </span>
                  <ChevronDown size={14} {...ic} className={cn('transition-transform', pickerOpen && 'rotate-180')} />
                </button>
                <button
                  type="button"
                  aria-label="Phiếu tiếp theo"
                  disabled={cases.length <= 1}
                  onClick={() => setIdx((safeIdx + 1) % Math.max(1, cases.length))}
                  className="flex size-9 items-center justify-center rounded-full bg-surface text-ink transition hover:bg-page disabled:opacity-40"
                >
                  <ChevronRight size={16} {...ic} />
                </button>

                {pickerOpen && cases.length > 0 && (
                  <div className="animate-rise absolute top-14 right-0 z-50 max-h-[320px] w-[300px] overflow-y-auto rounded-card bg-card p-1.5 shadow-card ring-1 ring-black/5">
                    {cases.map((item, i) => {
                      const active = i === safeIdx
                      const done = closed.includes(item.id)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { setIdx(i); setPickerOpen(false) }}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-tile px-3 py-2 text-left text-[12px] transition',
                            active ? 'bg-ink text-white' : 'text-ink hover:bg-surface',
                          )}
                        >
                          <div className="min-w-0">
                            <p className="font-mono font-bold tabular-nums">{item.id}</p>
                            <p className={cn('truncate text-[11px]', active ? 'text-white/70' : 'text-muted')}>{item.title}</p>
                          </div>
                          {done && <span className="shrink-0 rounded-full bg-done px-2 py-0.5 text-[10px] font-semibold text-white">Đã duyệt</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <a href="/profile" aria-label="Hồ sơ"><Avatar name="Trần Minh Quân" size={48} online /></a>
            </div>
          </header>
          {body}
        </div>
      </div>
    </div>
  )
}
