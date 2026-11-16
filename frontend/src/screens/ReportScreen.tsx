'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, CheckCircle2, ChevronUp, Plus, Clock, Construction, Droplets, Lightbulb, Send, Sparkles, Trash2, TreeDeciduous, Users, Wrench } from 'lucide-react'
import {
  Button,
  EmptyState,
  IconChip,
  PillTab,
  Skeleton,
  StatusPill,
  Toast,
  cn,
  ic,
  type Level,
} from '../components/primitives'
import {
  EvidenceUploadCard,
  IncidentListItem,
  InputField,
  MapBentoViewport,
  MetricBentoCard,
  Timeline,
} from '../components/data'
import { CitizenTabBar, TopPillNav } from '../components/nav'
import { DEMO_ID, agoText, getTickets, isOpen, submitDemoTicket } from '../data/tickets'

type Photo = 'empty' | 'scanning' | 'done'
type Pt = { x: number; y: number }

const TYPES = ['Đường', 'Ngập úng', 'Cây đổ', 'Rác', 'Đèn', 'Khác']
const kindOf: Record<string, 'road' | 'flood' | 'tree' | 'trash' | 'light'> = {
  'Đường': 'road', 'Ngập úng': 'flood', 'Cây đổ': 'tree', 'Rác': 'trash', 'Đèn': 'light', 'Khác': 'road',
}
const LEVELS: { label: string; level: Level; hours: number }[] = [
  { label: 'Khẩn cấp', level: 'urgent', hours: 4 },
  { label: 'Cao', level: 'high', hours: 12 },
  { label: 'Trung bình', level: 'normal', hours: 24 },
  { label: 'Thấp', level: 'low', hours: 48 },
]
const M_PER_PCT = 15

// Phiếu đang mở (trừ phiếu demo) từ nguồn dữ liệu chung, dùng để phát hiện trùng lặp trong bán kính 50m.
const existing = getTickets().filter((t) => isOpen(t) && t.id !== DEMO_ID).map((t) => ({
  x: t.x, y: t.y, level: t.priority as Level, title: t.title, address: `${t.district}, Đà Nẵng`, time: agoText(t.submittedAt), kind: t.kind, code: t.id,
}))

function addressAt({ x, y }: Pt) {
  if (x > 80) return null
  if (x < 12) return 'Hòa Vang'
  const top = y < 50
  if (x < 35) return top ? 'Tôn Đức Thắng, Liên Chiểu' : 'Nguyễn Hữu Thọ, Cẩm Lệ'
  if (x < 60) return top ? 'Điện Biên Phủ, Thanh Khê' : 'Lê Duẩn, Hải Châu'
  return top ? 'Ngô Quyền, Sơn Trà' : 'Trường Sa, Ngũ Hành Sơn'
}
function nearest(p: Pt) {
  let best = { i: -1, m: Infinity }
  existing.forEach((e, i) => {
    const m = Math.hypot(e.x - p.x, e.y - p.y) * M_PER_PCT
    if (m < best.m) best = { i, m }
  })
  return best
}

function Card({ title, className, children, delay = 0 }: { title: string; className?: string; children: ReactNode; delay?: number }) {
  return (
    <section className={cn('animate-rise rounded-card bg-card p-4 shadow-card transition hover:-translate-y-0.5 md:p-6', className)} style={{ animationDelay: `${delay}ms` }}>
      <h2 className="mb-4 text-[16px] font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function ScreenFrame({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-page pb-32 md:pb-8">
      <div className="mx-auto w-full max-w-[1440px] p-4 md:p-8">
        <div className="hidden md:block"><TopPillNav active={1} /></div>
        <header className="animate-rise mt-2 mb-6 md:mt-8">
          <h1 className="text-[24px] font-bold">{title}</h1>
          <p className="mt-1 text-[12px] text-muted">{sub}</p>
        </header>
        {children}
      </div>
      <div className="fixed inset-x-0 bottom-0 flex justify-center p-4 md:hidden">
        <CitizenTabBar />
      </div>
    </div>
  )
}

const typeIcon = { 'Đường': Construction, 'Ngập úng': Droplets, 'Cây đổ': TreeDeciduous, 'Rác': Trash2, 'Đèn': Lightbulb, 'Khác': Wrench } as Record<string, typeof Wrench>
const unitOf: Record<string, string> = {
  'Đường': 'Cầu đường', 'Ngập úng': 'Thoát nước', 'Cây đổ': 'Cây xanh', 'Rác': 'Môi trường', 'Đèn': 'Chiếu sáng', 'Khác': 'Cơ động',
}

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

function AiSuggestCard({ photo, type, level, address, onType, onLevel }: {
  photo: Photo; type: string; level: (typeof LEVELS)[number]; address: string; onType: () => void; onLevel: () => void
}) {
  const TI = typeIcon[type]
  const chip = 'flex items-center gap-2 rounded-full bg-white/10 p-1 pr-4 text-[14px] font-semibold text-white transition hover:bg-white/20'
  return (
    <section
      className="animate-rise relative overflow-hidden rounded-card p-4 text-white shadow-card transition hover:-translate-y-0.5 md:p-6"
      style={{ background: 'radial-gradient(120% 140% at 100% 100%, rgba(229,37,27,0.6) 0%, rgba(229,37,27,0) 60%), #111111' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">AI gợi ý</h2>
        <IconChip icon={Sparkles} size={32} />
      </div>
      {photo === 'empty' && (
        <div className="flex flex-wrap gap-2 opacity-40">
          <span className={chip}><IconChip icon={Droplets} size={32} />Ngập úng</span>
          <StatusPill level="high" />
          <span className={chip}><IconChip icon={Users} size={32} />Đội thoát nước</span>
        </div>
      )}
      {photo === 'scanning' && (
        <div className="flex flex-wrap gap-2">
          <Skeleton dark className="h-10 w-32 rounded-full" /><Skeleton dark className="h-10 w-24 rounded-full" /><Skeleton dark className="h-10 w-40 rounded-full" />
        </div>
      )}
      {photo === 'done' && (
        <div className="animate-rise space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onType} title="Đổi loại" className={chip}><IconChip icon={TI} tone="neutral" size={32} />{type}</button>
            <button onClick={onLevel} title="Đổi mức" className="transition active:scale-95"><StatusPill level={level.level} /></button>
            <span className={chip}><IconChip icon={Users} size={32} />Đội {unitOf[type]}</span>
          </div>
          <p className="flex items-center gap-1 text-[12px] text-white/60"><Clock size={14} {...ic} />{level.hours} giờ · {address}</p>
        </div>
      )}
    </section>
  )
}

function DuplicateAlert({ meters, item, onJoin, onNew }: {
  meters: number; item: (typeof existing)[number]; onJoin: () => void; onNew: () => void
}) {
  return (
    <section className="animate-rise rounded-card bg-card p-4 shadow-card ring-1 ring-high">
      <div className="mb-3 flex items-center gap-3">
        <IconChip icon={AlertTriangle} tone="high" />
        <h2 className="text-[16px] font-semibold">Trùng lặp {meters}m</h2>
      </div>
      <IncidentListItem kind={item.kind} title={item.title} address={item.address} time={item.time} level={item.level} />
      <div className="mt-3 flex gap-2">
        <Button icon={Users} onClick={onJoin}>Tôi cũng gặp</Button>
        <Button variant="subtle" onClick={onNew}>Gửi mới</Button>
      </div>
    </section>
  )
}

export default function ReportScreen() {
  const desktop = useMedia('(min-width: 768px)')
  const [photo, setPhoto] = useState<Photo>('empty')
  const [type, setType] = useState('Ngập úng')
  const [levelLabel, setLevelLabel] = useState('Cao')
  const [pin, setPin] = useState<Pt | null>(null)
  const [dupHandled, setDupHandled] = useState(false)
  const [note, setNote] = useState('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [result, setResult] = useState<null | { code: string; merged: boolean }>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const startUpload = () => {
    if (photo === 'scanning') return
    setPhoto('scanning')
    setPin(null)
    setDupHandled(false)
  }
  useEffect(() => {
    if (photo !== 'scanning') return
    const t = setTimeout(() => {
      setPhoto('done')
      setType('Ngập úng')
      setLevelLabel('Cao')
      setPin({ x: 46.5, y: 60.5 }) // vị trí GPS từ ảnh
      setSheetOpen(true)
    }, 1800)
    return () => clearTimeout(t)
  }, [photo])

  const lv = LEVELS.find((l) => l.label === levelLabel)!
  const addr = pin ? addressAt(pin) : null
  const outside = !!pin && !addr
  const near = pin && !outside ? nearest(pin) : null
  const dup = near && near.m <= 50 && !dupHandled ? { ...existing[near.i], m: Math.round(near.m) } : null
  const phoneBad = phone.length > 0 && !/^0\d{9}$/.test(phone)
  const ready = photo === 'done' && !!pin && !outside && /^0\d{9}$/.test(phone)
  const current = photo === 'empty' ? 0 : photo === 'scanning' ? 1 : !pin || outside ? 2 : 3
  const steps = ['Ảnh', 'AI', 'Ghim', 'Gửi']

  const submit = () => {
    setSending(true)
    setTimeout(() => {
      setSending(false)
      submitDemoTicket()
      setResult({ code: DEMO_ID, merged: false })
    }, 1200)
  }
  const reset = () => {
    setPhoto('empty'); setPin(null); setDupHandled(false); setNote(''); setPhone(''); setResult(null); setSheetOpen(false)
  }
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) startUpload()
    e.target.value = ''
  }
  const cycleType = () => setType(TYPES[(TYPES.indexOf(type) + 1) % TYPES.length])
  const cycleLevel = () => setLevelLabel(LEVELS[(LEVELS.indexOf(lv) + 1) % LEVELS.length].label)

  if (result)
    return (
      <ScreenFrame title={result.merged ? 'Đã ghi nhận' : 'Gửi thành công'} sub={result.merged ? 'Cộng thêm vào phiếu đã có' : 'Lưu mã để theo dõi'}>
        <ResultView code={result.code} merged={result.merged} type={type} level={lv.level} hours={lv.hours} address={addr ?? ''} pin={pin!} onReset={reset} />
      </ScreenFrame>
    )

  const photoCard = (
    <section
      className="animate-rise rounded-card bg-card p-2 shadow-card transition hover:-translate-y-0.5"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) startUpload() }}
    >
      <EvidenceUploadCard
        height={desktop ? 240 : 190}
        state={photo}
        dragging={dragging}
        onCapture={() => camRef.current?.click()}
        onChoose={() => fileRef.current?.click()}
        onSample={startUpload}
      />
    </section>
  )
  const aiCard = <AiSuggestCard photo={photo} type={type} level={lv} address={addr ?? ''} onType={cycleType} onLevel={cycleLevel} />
  const formCard = (
    <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '120ms' }}>
      <div className="grid gap-3">
        <InputField kind="textarea" height={72} placeholder="Mô tả hiện trường" onChange={setNote} value={note} />
        <InputField placeholder="Số điện thoại" value={phone} onChange={setPhone} error={phoneBad ? 'Số điện thoại chưa đúng' : undefined} />
        <Button variant="hero" size="lg" icon={Send} loading={sending} disabled={!ready} onClick={submit}>Gửi phản ánh</Button>
      </div>
    </section>
  )
  const dupAlert = dup && (
    <DuplicateAlert meters={dup.m} item={dup} onJoin={() => setResult({ code: dup.code, merged: true })} onNew={() => setDupHandled(true)} />
  )

  const mapOverlay = (
    <>
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="pointer-events-auto rounded-full shadow-card md:w-[360px]">
          <InputField key={addr ?? 'x'} kind="search" placeholder="Chạm bản đồ" value={addr ?? ''} error={undefined} onChange={() => {}} />
        </div>
        <div className="pointer-events-auto self-start rounded-full shadow-card md:self-auto">
          <PillTab tone="ink" items={steps} value={steps[current]} onChange={() => {}} />
        </div>
      </div>
      {outside && (
        <div className="absolute inset-x-3 bottom-3 z-10 flex justify-center md:bottom-4 md:justify-start">
          <Toast kind="error" text="Ngoài ranh giới Đà Nẵng" />
        </div>
      )}
      {desktop && dupAlert && <div className="absolute bottom-4 left-4 z-10 w-[460px]">{dupAlert}</div>}
    </>
  )
  const mapNode = (
    <MapBentoViewport
      fill
      detailed
      controls="bottom"
      pins={existing}
      userPin={pin ? { ...pin, level: lv.level, bad: outside, radius: 28 } : undefined}
      onPick={(x, y) => { setPin({ x, y }); setDupHandled(false) }}
    />
  )
  const metrics = (
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      <MetricBentoCard compact title="Tiếp nhận" value={128} icon={Plus} chart="bars" series={[3, 5, 4, 7, 6, 9, 12]} />
      <MetricBentoCard compact title="Đang xử lý" value={46} icon={Wrench} tone="high" chart="spark" series={[4, 6, 5, 8, 7, 9, 10]} />
      <MetricBentoCard compact title="Đã hoàn tất" value={82} icon={CheckCircle2} tone="done" chart="bars" series={[2, 3, 5, 4, 6, 7, 9]} />
    </div>
  )

  return (
    <div className="min-h-screen bg-page pb-28 md:pb-8">
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <div className="mx-auto w-full max-w-[1440px] p-4 md:p-8">
        <div className="hidden md:block"><TopPillNav active={1} /></div>
        <header className="mt-2 mb-4 flex flex-col gap-4 md:mt-6 md:mb-4 md:flex-row md:items-end md:justify-between">
          <div className="animate-rise">
            <h1 className="text-[24px] font-bold">Báo cáo hiện trường</h1>
            <p className="mt-1 text-[12px] text-muted">Ảnh, vị trí, gửi: dưới một phút</p>
          </div>
          <div className="md:w-[640px]">{metrics}</div>
        </header>

        {desktop ? (
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 flex flex-col gap-4">
              {photoCard}
              {aiCard}
              {formCard}
            </div>
            <section className="relative col-span-3 min-h-[760px] overflow-hidden rounded-card shadow-card">
              {mapNode}
              {mapOverlay}
            </section>
          </div>
        ) : (
          <>
            <section className="relative h-[calc(100dvh-300px)] min-h-[380px] overflow-hidden rounded-card shadow-card">
              {mapNode}
              {mapOverlay}
            </section>
            <div
              className="fixed inset-x-0 bottom-[96px] z-30 flex flex-col rounded-t-[20px] bg-page shadow-[0_-8px_32px_rgba(0,0,0,0.12)] transition-[height] duration-500 ease-out"
              style={{ height: sheetOpen ? 'calc(100dvh - 96px - 72px)' : 236 }}
            >
              <button onClick={() => setSheetOpen(!sheetOpen)} aria-label="Mở rộng" className="flex shrink-0 justify-center py-3">
                <span className="flex h-5 w-12 items-center justify-center rounded-full bg-low/40">
                  <ChevronUp size={16} {...ic} className={cn('transition duration-500', sheetOpen && 'rotate-180')} />
                </span>
              </button>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
                {dupAlert}
                {photoCard}
                {aiCard}
                {formCard}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-4 md:hidden">
        <CitizenTabBar />
      </div>
    </div>
  )
}

function ResultView({ code, merged, type, level, hours, address, pin, onReset }: {
  code: string; merged: boolean; type: string; level: Level; hours: number; address: string; pin: Pt; onReset: () => void
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
      <section className="animate-rise relative flex flex-col justify-between gap-8 overflow-hidden rounded-card bg-ink p-6 text-white shadow-card md:col-span-7 md:min-h-[320px] md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/60 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <span className="flex size-12 animate-bounce items-center justify-center rounded-tile bg-done text-white"><CheckCircle2 size={24} {...ic} /></span>
          <StatusPill level={level} />
        </div>
        <div className="relative">
          <p className="text-[12px] text-white/60">{merged ? 'Mã phiếu đã có' : 'Mã phiếu'}</p>
          <p className="mt-2 text-[32px] leading-none font-bold tabular-nums md:text-[40px]">{code}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="subtle" icon={Check} onClick={() => { navigator.clipboard?.writeText(code); setCopied(true) }}>{copied ? 'Đã chép' : 'Chép mã'}</Button>
            <Button variant="subtle" onClick={onReset}>Báo thêm</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:col-span-5">
        <MetricBentoCard title={merged ? 'Người cùng gặp' : 'Hạn xử lý'} value={merged ? 4 : hours} suffix={merged ? '' : ' giờ'} icon={merged ? Users : Clock} tone="high" />
        <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '120ms' }}>
          <h2 className="mb-4 text-[16px] font-semibold">Vị trí</h2>
          <MapBentoViewport compact detailed pins={existing} userPin={{ ...pin, level, radius: 28 }} />
        </section>
      </div>

      <section className="animate-rise rounded-card bg-card p-4 shadow-card md:col-span-7 md:p-6" style={{ animationDelay: '180ms' }}>
        <h2 className="mb-4 text-[16px] font-semibold">Phiếu của bạn</h2>
        <IncidentListItem kind={kindOf[type]} title={merged ? 'Ngập úng đường Lê Duẩn' : `${type} ${address.split(',')[0]}`} address={merged ? 'Hải Châu, Đà Nẵng' : address} time="Vừa xong" level={level} />
      </section>
      <section className="animate-rise rounded-card bg-card p-4 shadow-card md:col-span-5 md:p-6" style={{ animationDelay: '240ms' }}>
        <h2 className="mb-4 text-[16px] font-semibold">Tiếp theo</h2>
        <Timeline current={0} steps={[{ label: 'Tiếp nhận', time: 'Giờ này' }, { label: 'Phân loại', time: '' }, { label: 'Giao việc', time: '' }]} />
        <div className="mt-6"><Button size="lg" onClick={() => { window.location.href = `/tracking/${code}` }}>Theo dõi tiến độ</Button></div>
      </section>
    </div>
  )
}
