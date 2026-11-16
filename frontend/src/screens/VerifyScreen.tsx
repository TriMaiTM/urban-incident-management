'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CheckCircle2, Clock, Package, RotateCcw, ShieldCheck, TrafficCone, Wrench, X } from 'lucide-react'
import { Avatar, HeaderStat, Button, EmptyState, ErrorState, IconChip, PillTab, Skeleton, Toast, cn, ic } from '../components/primitives'
import { CompareEvidence, MapBentoViewport, MetricBentoCard } from '../components/data'
import { DispatcherRail } from '../components/nav'
import { DEMO_ID, clock, deadlineOf, getTickets, gpsDeviation, setStatus, shortHash, useTicketVersion } from '../data/tickets'
import { plan } from './technicianData'

type Case = {
  id: string; title: string; address: string; gps: number; ax: number; ay: number; bx: number; by: number
  measure: string; material: string; time: string; minutes: number; hash: string; onTime: boolean
}
/** Phiếu chờ nghiệm thu (trạng thái RESOLVED) lấy từ nguồn dữ liệu chung. */
const buildCases = (): Case[] =>
  getTickets().filter((t) => t.status === 'RESOLVED').sort((a, b) => Number(b.id === DEMO_ID) - Number(a.id === DEMO_ID)).map((t) => {
    const dev = gpsDeviation(t)
    const start = t.at.IN_PROGRESS ?? t.submittedAt
    const end = t.at.RESOLVED ?? Date.now()
    return {
      id: t.id, title: t.title, address: t.address, gps: dev, ax: t.x, ay: t.y, bx: t.x + dev / 3, by: t.y + dev / 9,
      measure: plan[t.kind].steps.join(', '), material: plan[t.kind].materials.join(', '), time: `${clock(start)} – ${clock(end)}`,
      minutes: Math.max(1, Math.round((end - start) / 60000)), hash: shortHash(t.hash), onTime: end <= deadlineOf(t),
    }
  })
const emptyCase: Case = { id: '—', title: '', address: '', gps: 0, ax: 50, ay: 50, bx: 50, by: 50, measure: '', material: '', time: '', minutes: 0, hash: '', onTime: true }
const RADIUS_PX = 110 // 50m trên bản đồ minh họa

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
    const t = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(t)
  }, [idx])

  const c = cases[idx] ?? emptyCase
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
      <section className="animate-rise rounded-card bg-card p-2 shadow-card">
        {loading ? (
          <div className="grid grid-cols-2 gap-3"><Skeleton className="h-[300px]" /><Skeleton className="h-[300px]" /></div>
        ) : (
          <CompareEvidence photos chipMiddle height={300} gps={{ text: gpsOk ? `GPS: ${c.gps}m Đạt` : `GPS lệch ${c.gps}m`, ok: gpsOk }} />
        )}
      </section>

      <div className="grid grid-cols-[1fr_380px_320px] gap-4">
        <section className="relative min-h-[360px] overflow-hidden rounded-card shadow-card">
          <MapBentoViewport
            fill
            detailed
            controls="bottom"
            state={loading ? 'loading' : 'normal'}
            pins={[{ x: c.bx, y: c.by, level: 'done', label: 'B' }]}
            userPin={{ x: c.ax, y: c.ay, level: 'low', radius: RADIUS_PX, label: 'A' }}
          />
          <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-card p-1 pr-4 shadow-card">
            <IconChip icon={ShieldCheck} tone="ink" size={32} />
            <span className="text-[14px] font-semibold">Bán kính 50m</span>
          </div>
        </section>

        <section className="animate-rise rounded-card bg-card p-6 shadow-card" style={{ animationDelay: '80ms' }}>
          <h2 className="mb-4 text-[16px] font-semibold">Biên bản</h2>
          {loading ? (
            <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div key={c.id} className="animate-rise space-y-4 text-[14px]">
              {([[Wrench, c.measure], [Package, c.material], [Clock, `${c.time} · ${c.minutes} phút`], [TrafficCone, 'Đã mở lại làn đường']] as const).map(([I, v], i) => (
                <div key={i} className="flex items-center gap-3"><IconChip icon={I} size={40} /><span>{v}</span></div>
              ))}
              <div className="flex items-center gap-3 rounded-tile bg-surface p-3 text-[12px] text-muted">
                <Avatar name="Lê Văn Hùng" size={32} />
                <span className="min-w-0">KTV Lê Văn Hùng · TB-0457<br />SHA256 <span className="font-semibold text-ink tabular-nums">{c.hash}</span></span>
              </div>
            </div>
          )}
        </section>

        <section
          className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-card p-6 text-white shadow-card"
          style={{ background: isClosed ? 'radial-gradient(120% 140% at 100% 100%, rgba(22,163,74,0.55) 0%, rgba(22,163,74,0) 60%), #111111' : 'radial-gradient(120% 140% at 100% 100%, rgba(229,37,27,0.5) 0%, rgba(229,37,27,0) 60%), #111111' }}
        >
          {isClosed && <Confetti key={burst} />}
          <div className="relative flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Tổng kết</h2>
            <span className="relative flex size-10 items-center justify-center">
              {isClosed && <span className="absolute inset-0 animate-pulse-soft rounded-full bg-done" />}
              <IconChip icon={isClosed ? CheckCircle2 : pass ? Check : X} tone={isClosed || pass ? 'done' : 'urgent'} />
            </span>
          </div>
          <div className="relative">
            <p key={String(isClosed) + String(isReopened)} className="animate-rise text-[32px] leading-none font-bold">
              {isClosed ? 'Đã xác nhận' : isReopened ? 'Mở lại' : pass ? 'Đạt' : 'Không đạt'}
            </p>
            <ul className="mt-4 space-y-2">
              {checks.map((k) => (
                <li key={k.label} className="flex items-center gap-2 text-[12px] text-white/80">
                  {k.ok ? <Check size={14} {...ic} className="text-done" /> : <X size={14} {...ic} className="text-urgent" />}{k.label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button size="lg" variant="subtle" disabled={busy || drafts.includes(c.id)} onClick={draft}>{drafts.includes(c.id) ? 'Đã lưu nháp' : 'Lưu nháp'}</Button>
        <Button size="lg" variant="secondary" icon={RotateCcw} disabled={busy} onClick={redo}>Yêu cầu làm lại</Button>
        <Button size="lg" icon={Check} disabled={busy || !pass || loading} onClick={approve}>Duyệt nghiệm thu</Button>
      </div>
    </>
  )

  return (
    <div className="fixed inset-0 overflow-auto bg-page">
      {toast && <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 animate-rise"><Toast kind={toast.kind} text={toast.text} /></div>}
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-4 p-4">
        <div className="shrink-0"><DispatcherRail /></div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex items-center justify-between">
            <div className="animate-rise">
              <h1 className="text-[24px] font-bold">Nghiệm thu</h1>
              <p className="mt-1 text-[12px] text-muted">{c.id} · {c.address}</p>
            </div>
            <div className="flex items-center gap-4">
              <HeaderStat dark title="Chờ nghiệm thu" value={cases.length - closed.length} icon={Clock} />
              <PillTab tone="ink" items={cases.map((x) => x.id.slice(-4))} value={c.id.slice(-4)} onChange={(v) => setIdx(cases.findIndex((x) => x.id.endsWith(v)))} />
              <a href="/profile" aria-label="Hồ sơ"><Avatar name="Trần Minh Quân" size={48} online /></a>
            </div>
          </header>
          {body}
        </div>
      </div>
    </div>
  )
}
