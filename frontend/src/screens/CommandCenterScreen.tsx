'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Construction, Droplets, Lightbulb, Sparkles, Trash2, TreeDeciduous, Truck, Users, Wrench } from 'lucide-react'
import { Avatar, Button, HeaderStat, EmptyState, IconChip, Skeleton, StatusPill, Toast, cn, ic, type Level } from '../components/primitives'
import { EvidenceUploadCard, IncidentListItem, InputField, MapBentoViewport, MetricBentoCard } from '../components/data'
import { DispatcherRail } from '../components/nav'
import { DEMO_ID, agoText, getTickets, remainingSec, resetTickets, setStatus, useTicketVersion, type Ticket as DataTicket } from '../data/tickets'
import { apiMergeDuplicate } from '../lib/backend-api'

type Kind = 'road' | 'flood' | 'tree' | 'trash' | 'light'
type Ticket = {
  id: string; title: string; address: string; kind: Kind; level: Level; time: string
  x: number; y: number; remaining: number; extra: number; badPhoto?: boolean
}
const M_PER_PCT = 15
const SLA_HOURS: Record<string, number> = { urgent: 4, high: 12, normal: 24, low: 48 }
const rank: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
const levels: Level[] = ['urgent', 'high', 'normal', 'low']
const kinds: Kind[] = ['flood', 'road', 'tree', 'trash', 'light']
const kindLabel: Record<Kind, string> = { flood: 'Ngập úng', road: 'Đường', tree: 'Cây đổ', trash: 'Rác', light: 'Đèn' }
const kindIcon = { flood: Droplets, road: Construction, tree: TreeDeciduous, trash: Trash2, light: Lightbulb }
const units = ['Công ty Thoát nước', 'Đội Cầu đường', 'Công viên Cây xanh', 'Môi trường đô thị', 'Chiếu sáng đô thị', 'Đội cơ động IOC']
const unitOf: Record<Kind, string> = { flood: units[0], road: units[1], tree: units[2], trash: units[3], light: units[4] }

/** Hàng đợi điều phối: phiếu mới (Đã tiếp nhận, Đã phân loại) từ nguồn dữ liệu chung. */
const queueTickets = (): (Ticket & { _t: DataTicket })[] =>
  getTickets().filter((t) => t.status === 'SUBMITTED' || t.status === 'TRIAGED').map((t) => ({
    id: t.id, title: t.title, address: t.address, kind: t.kind, level: t.priority, time: agoText(t.submittedAt), x: t.x, y: t.y,
    remaining: remainingSec(t), extra: t.supporters, badPhoto: t.badPhoto, _t: t,
  }))

const fmt = (s: number) => {
  const a = Math.abs(s)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${s < 0 ? 'Trễ ' : ''}${p(Math.floor(a / 3600))}:${p(Math.floor((a % 3600) / 60))}:${p(a % 60)}`
}
const meters = (a: Ticket, b: Ticket) => Math.round(Math.hypot(a.x - b.x, a.y - b.y) * M_PER_PCT)

function SlaStrip({ remaining, level, selected }: { remaining: number; level: Level; selected: boolean }) {
  const total = (SLA_HOURS[level] ?? 24) * 3600
  const ratio = Math.max(0, Math.min(1, remaining / total))
  const late = remaining < 0
  const crit = late || remaining < 1800 || ratio < 0.1
  return (
    <div className="flex items-center gap-3 px-3 pb-3">
      <span className={cn('inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-3 text-[12px] font-semibold tabular-nums', crit && 'animate-pulse', selected ? 'bg-white text-ink' : 'bg-card text-ink')}>
        <Clock size={12} {...ic} />{fmt(remaining)}
      </span>
      <span className={cn('h-1.5 flex-1 overflow-hidden rounded-full', selected ? 'bg-white/20' : 'bg-card')}>
        <span className={cn('block h-full rounded-full transition-all duration-1000', selected ? 'bg-white' : 'bg-ink')} style={{ width: `${late ? 100 : ratio * 100}%` }} />
      </span>
    </div>
  )
}

export default function CommandCenterScreen() {
  const version = useTicketVersion()
  const [removed, setRemoved] = useState<string[]>([])
  const [extras, setExtras] = useState<Record<string, number>>({})
  const [now, setNow] = useState(0)
  const [sel, setSel] = useState<string>(DEMO_ID)
  const [leaving, setLeaving] = useState<string[]>([])
  const [booting, setBooting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [edits, setEdits] = useState<Record<string, { kind?: Kind; level?: Level; unit?: string }>>({})
  const [fixed, setFixed] = useState<string[]>([])
  const [toast, setToast] = useState<null | { kind: 'success' | 'error' | 'info'; text: string }>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => { const t = setTimeout(() => setBooting(false), 800); return () => clearTimeout(t) }, [])
  useEffect(() => { const t = setInterval(() => setNow((n) => n + 1), 1000); return () => clearInterval(t) }, [])
  useEffect(() => {
    if (booting) return
    setBusy(true)
    const t = setTimeout(() => setBusy(false), 450)
    return () => clearTimeout(t)
  }, [sel, booting])

  const show = (kind: 'success' | 'error' | 'info', text: string) => {
    setToast({ kind, text })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const live = useMemo(
    () => queueTickets().filter((t) => !removed.includes(t.id)).map((t) => ({ ...t, ...edits[t.id], extra: t.extra + (extras[t.id] ?? 0) } as Ticket)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, removed, extras, edits, now],
  )
  const queue = useMemo(
    () => [...live].sort((a, b) => rank[a.level] - rank[b.level] || a.remaining - b.remaining),
    [live],
  )
  const active = queue.filter((t) => !leaving.includes(t.id))
  const cur = active.find((t) => t.id === sel) ?? active[0]
  const dup = cur ? active.find((t) => t.id !== cur.id && meters(cur, t) <= 50) : undefined
  const soon = active.filter((t) => t.remaining < 1800).length
  const others = cur ? active.filter((t) => t.id !== cur.id) : []

  const remove = (id: string, then: () => void) => {
    setLeaving((l) => [...l, id])
    setTimeout(() => {
      then()
      setLeaving((l) => l.filter((x) => x !== id))
    }, 520)
  }
  const nextAfter = (id: string) => {
    const rest = active.filter((t) => t.id !== id)
    if (rest[0]) setSel(rest[0].id)
  }
  const approve = () => { if (!cur) return; const id = cur.id; nextAfter(id); remove(id, () => setStatus(id, 'ASSIGNED')); show('success', 'Đã giao việc') }
  const reject = () => { if (!cur) return; const id = cur.id; nextAfter(id); remove(id, () => setStatus(id, 'REJECTED')); show('error', 'Đã từ chối') }
  const merge = () => {
    if (!cur || !dup) return
    const keep = cur.id
    const dupId = dup.id
    apiMergeDuplicate(keep, dupId).catch(() => {})
    remove(dupId, () => setRemoved((l) => [...l, dupId]))
    setExtras((e) => ({ ...e, [keep]: (e[keep] ?? 0) + 1 }))
    show('success', 'Đã gộp phiếu')
  }
  const edit = (patch: { kind?: Kind; level?: Level; unit?: string }) => cur && setEdits((e) => ({ ...e, [cur.id]: { ...e[cur.id], ...patch } }))
  const reload = () => { setRemoved([]); setExtras({}); setEdits({}); setFixed([]); resetTickets(); setSel(DEMO_ID) }

  const aiKind = cur?.kind ?? 'flood'
  const unit = cur ? edits[cur.id]?.unit ?? unitOf[cur.kind] : ''
  const TI = kindIcon[aiKind]
  const chip = 'flex items-center gap-2 rounded-full bg-white/10 p-1 pr-4 text-[14px] font-semibold text-white transition hover:bg-white/20'
  const photoState = !cur ? 'empty' : busy || booting ? 'scanning' : cur.badPhoto && !fixed.includes(cur.id) ? 'error' : 'done'

  return (
    <div className="fixed inset-0 overflow-auto bg-page">
      {toast && <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 animate-rise"><Toast kind={toast.kind} text={toast.text} /></div>}
      <div className="mx-auto flex h-screen min-h-[760px] w-full max-w-[1440px] gap-4 p-4">
        <div className="shrink-0"><DispatcherRail /></div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex items-center justify-between">
            <div className="animate-rise">
              <h1 className="text-[24px] font-bold">Bàn tác chiến</h1>
              <p className="mt-1 text-[12px] text-muted">Duyệt, ghép, giao việc</p>
            </div>
            <div className="flex items-center gap-4">
              <HeaderStat dark title="Chờ duyệt" value={active.length} icon={Users} />
              <HeaderStat title="Sắp trễ" value={soon} icon={AlertTriangle} tone="urgent" />
              <a href="/dispatcher/field-units" className="inline-flex h-12 items-center gap-2 rounded-full bg-card px-5 text-[14px] font-semibold shadow-card transition hover:bg-surface active:scale-95"><Truck size={16} {...ic} />Điều động đội</a>
              <a href="/profile" aria-label="Hồ sơ"><Avatar name="Trần Minh Quân" size={48} online /></a>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 gap-4">
            {/* Cột 1: hàng đợi */}
            <section className="flex w-[400px] shrink-0 flex-col rounded-card bg-card p-4 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[16px] font-semibold">Hàng đợi</h2>
                <span className="inline-flex h-6 items-center rounded-full bg-surface px-3 text-[12px] font-semibold tabular-nums">{active.length}</span>
              </div>
              <div className="-mr-2 flex-1 overflow-y-auto pr-2">
                {booting && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="mb-3 h-[116px]" />)}
                {!booting && active.length === 0 && leaving.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2">
                    <EmptyState icon={CheckCircle2} tone="done" text="Hàng đợi trống" />
                    <Button variant="subtle" onClick={reload}>Nạp lại</Button>
                  </div>
                )}
                {!booting && queue.map((t) => {
                  const out = leaving.includes(t.id)
                  const isSel = cur?.id === t.id
                  return (
                    <div
                      key={t.id}
                      className={cn('overflow-hidden transition-all duration-500 ease-in', out ? 'max-h-0 translate-x-24 opacity-0' : 'mb-3 max-h-[140px]')}
                    >
                      <div
                        role="button"
                        onClick={() => setSel(t.id)}
                        className={cn('animate-rise cursor-pointer rounded-card transition', isSel ? 'bg-ink' : 'bg-surface')}
                      >
                        <IncidentListItem kind={t.kind} title={t.title} address={t.address.split(', ')[1]} time={t.time} level={t.level} status={isSel ? 'selected' : 'default'} />
                        <SlaStrip remaining={t.remaining} level={t.level} selected={isSel} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Cột 2: bản đồ */}
            <section className="relative min-w-0 flex-1 overflow-hidden rounded-card shadow-card">
              <MapBentoViewport
                fill
                detailed
                controls="bottom"
                state={!cur && !booting ? 'empty' : booting ? 'loading' : 'normal'}
                pins={others}
                selectedPin={dup ? others.indexOf(dup) : undefined}
                onPinClick={(i) => setSel(others[i].id)}
                userPin={cur ? { x: cur.x, y: cur.y, level: cur.level, radius: 38 } : undefined}
              />
              {cur && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-3 rounded-full bg-card p-1 pr-2 shadow-card">
                  <IconChip icon={Wrench} tone="ink" size={32} />
                  <span className="text-[14px] font-semibold">{cur.address}</span>
                  <span key={cur.extra} className="animate-rise inline-flex h-6 items-center gap-1 rounded-full bg-surface px-3 text-[12px] font-semibold tabular-nums">
                    <Users size={12} {...ic} />+{cur.extra}
                  </span>
                </div>
              )}
              {cur && dup && (
                <div key={dup.id} className="absolute right-4 bottom-4 left-4 z-10 max-w-[460px] animate-rise rounded-card bg-card p-4 shadow-card ring-1 ring-high">
                  <div className="mb-3 flex items-center gap-3">
                    <IconChip icon={AlertTriangle} tone="high" />
                    <h2 className="text-[16px] font-semibold">Trùng lặp {meters(cur, dup)}m</h2>
                  </div>
                  <IncidentListItem kind={dup.kind} title={dup.title} address={dup.address.split(', ')[1]} time={dup.time} level={dup.level} />
                  <div className="mt-3"><Button onClick={merge}>Gộp phiếu</Button></div>
                </div>
              )}
            </section>

            {/* Cột 3: kiểm duyệt */}
            <div className="flex w-[380px] shrink-0 flex-col gap-4 overflow-y-auto">
              {!cur && !booting ? (
                <section className="flex flex-1 items-center justify-center rounded-card bg-card p-6 shadow-card"><EmptyState icon={CheckCircle2} tone="done" text="Đã xử lý hết" /></section>
              ) : (
                <>
                  <section className="rounded-card bg-card p-2 shadow-card">
                    <EvidenceUploadCard state={photoState} height={300} onChoose={() => cur && setFixed((f) => [...f, cur.id])} />
                  </section>

                  <section
                    className="relative overflow-hidden rounded-card p-6 text-white shadow-card transition hover:-translate-y-0.5"
                    style={{ background: 'radial-gradient(120% 140% at 100% 100%, rgba(229,37,27,0.6) 0%, rgba(229,37,27,0) 60%), #111111' }}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-[16px] font-semibold">AI gợi ý</h2>
                      <IconChip icon={Sparkles} size={32} />
                    </div>
                    {busy || booting || !cur ? (
                      <div className="flex flex-wrap gap-2"><Skeleton dark className="h-10 w-28 rounded-full" /><Skeleton dark className="h-10 w-24 rounded-full" /><Skeleton dark className="h-10 w-40 rounded-full" /></div>
                    ) : (
                      <div key={cur.id} className="animate-rise space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button title="Đổi loại" onClick={() => edit({ kind: kinds[(kinds.indexOf(cur.kind) + 1) % kinds.length] })} className={chip}><IconChip icon={TI} size={32} />{kindLabel[cur.kind]}</button>
                          <button title="Đổi mức" onClick={() => edit({ level: levels[(levels.indexOf(cur.level) + 1) % levels.length] })} className="transition active:scale-95"><StatusPill level={cur.level} /></button>
                          <span className={chip}><IconChip icon={Users} size={32} />{unit}</span>
                        </div>
                        <InputField key={cur.id + unit} pill kind="select" placeholder="Chọn đơn vị" value={unit} options={units} onChange={(v) => edit({ unit: v })} />
                      </div>
                    )}
                  </section>

                  <div className="mt-auto grid grid-cols-2 gap-3">
                    <Button variant="secondary" size="lg" disabled={!cur || booting} onClick={reject}>Từ chối tiếp nhận</Button>
                    <Button size="lg" disabled={!cur || booting || busy} onClick={approve}>Duyệt & Giao việc</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
