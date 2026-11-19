'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, CheckCircle2, ChevronUp, Clock, Construction, Droplets, Lightbulb, Send, Sparkles, Trash2, TreeDeciduous, Users, Wrench } from 'lucide-react'
import {
  Button,
  IconChip,
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
import {
  fallbackStreetAddress,
  findDistrictAtLngLat,
  requestBrowserGpsInDaNang,
  reverseGeocodeDaNang,
  xyToLngLat,
} from '../components/GoongBentoMap'
import { agoText, getTickets, isOpen, upsertBackendIncident, useTicketVersion } from '../data/tickets'
import { apiAnalyzeImage, apiCreateIncident, apiVoteDuplicate, getStoredUser } from '../lib/backend-api'

type Photo = 'empty' | 'scanning' | 'done'
type Pt = { x: number; y: number; lng?: number; lat?: number }

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

type ExistingPin = {
  x: number; y: number; lat?: number; lng?: number; level: Level; title: string; address: string; time: string; kind: 'road' | 'flood' | 'tree' | 'trash' | 'light'; code: string
}
const buildExisting = (): ExistingPin[] => getTickets().filter((t) => isOpen(t)).map((t) => ({
  x: t.x, y: t.y, lat: t.gps.lat, lng: t.gps.lng, level: t.priority as Level, title: t.title, address: `${t.district}, Đà Nẵng`, time: agoText(t.submittedAt), kind: t.kind, code: t.id,
}))

function resolveSyncAddress(p: Pt): { address: string | null; district: string | null } {
  const [lng, lat] = p.lng !== undefined && p.lat !== undefined ? [p.lng, p.lat] : xyToLngLat(p.x, p.y)
  const dist = findDistrictAtLngLat(lng, lat)
  if (!dist || !dist.on) return { address: null, district: null }
  return {
    address: fallbackStreetAddress(lng, lat, dist.name),
    district: dist.name,
  }
}

function nearest(p: Pt, list: ExistingPin[]) {
  let best = { i: -1, m: Infinity }
  const [pLng, pLat] = p.lng !== undefined && p.lat !== undefined ? [p.lng, p.lat] : xyToLngLat(p.x, p.y)
  list.forEach((e, i) => {
    const m =
      e.lng !== undefined && e.lat !== undefined
        ? Math.hypot((e.lng - pLng) * 106000, (e.lat - pLat) * 111320)
        : Math.hypot(e.x - p.x, e.y - p.y) * M_PER_PCT
    if (m < best.m) best = { i, m }
  })
  return best
}

function ScreenFrame({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-page pb-32 md:pb-6">
      <div className="mx-auto w-full max-w-[1440px] p-4 md:px-6 md:py-4">
        <div className="hidden md:block"><TopPillNav active={1} /></div>
        <header className="animate-rise mt-2 mb-4 md:mt-4">
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
  const chip = 'flex items-center gap-2 rounded-full bg-white/10 p-1 pr-3.5 text-[13px] font-semibold text-white transition hover:bg-white/20'
  return (
    <section
      className="animate-rise relative shrink-0 overflow-hidden rounded-card p-3.5 text-white shadow-card transition hover:-translate-y-0.5 md:p-4"
      style={{ background: 'radial-gradient(120% 140% at 100% 100%, rgba(229,37,27,0.6) 0%, rgba(229,37,27,0) 60%), #111111' }}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">AI gợi ý</h2>
        <IconChip icon={Sparkles} size={32} />
      </div>
      {photo === 'empty' && (
        <div className="flex flex-wrap gap-1.5 opacity-40">
          <span className={chip}><IconChip icon={Droplets} size={32} />Ngập úng</span>
          <StatusPill level="high" />
          <span className={chip}><IconChip icon={Users} size={32} />Đội thoát nước</span>
        </div>
      )}
      {photo === 'scanning' && (
        <div className="flex flex-wrap gap-2">
          <Skeleton dark className="h-8 w-28 rounded-full" /><Skeleton dark className="h-8 w-20 rounded-full" /><Skeleton dark className="h-8 w-36 rounded-full" />
        </div>
      )}
      {photo === 'done' && (
        <div className="animate-rise space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={onType} title="Đổi loại" className={chip}><IconChip icon={TI} tone="neutral" size={32} />{type}</button>
            <button onClick={onLevel} title="Đổi mức" className="transition active:scale-95"><StatusPill level={level.level} /></button>
            <span className={chip}><IconChip icon={Users} size={32} />Đội {unitOf[type]}</span>
          </div>
          <p className="flex items-center gap-1 truncate text-[12px] text-white/70"><Clock size={13} {...ic} />{level.hours} giờ · {address || 'Đang xác định địa chỉ…'}</p>
        </div>
      )}
    </section>
  )
}

function DuplicateAlert({ meters, item, onJoin, onNew }: {
  meters: number; item: ExistingPin; onJoin: () => void; onNew: () => void
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
  // ALL HOOKS MUST RUN UNCONDITIONALLY AT THE TOP (Before any early return!)
  const version = useTicketVersion()
  const existing = useMemo(buildExisting, [version])

  const desktop = useMedia('(min-width: 768px)')
  const [photo, setPhoto] = useState<Photo>('empty')
  const [type, setType] = useState('Ngập úng')
  const [levelLabel, setLevelLabel] = useState('Cao')
  const [pin, setPin] = useState<Pt | null>(null)
  const [liveAddress, setLiveAddress] = useState<string | null>(null)
  const [liveDistrict, setLiveDistrict] = useState<string | null>(null)
  const [isOutside, setIsOutside] = useState(false)
  const [dupHandled, setDupHandled] = useState(false)
  const [note, setNote] = useState('')
  const [phone, setPhone] = useState(() => getStoredUser()?.phone || '0905123456')
  const [sending, setSending] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [result, setResult] = useState<null | { code: string; merged: boolean }>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined)
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const applyAiResult = (ai: { category_code: string; priority: string }) => {
    const c = ai.category_code.toUpperCase()
    if (c.includes('FLOOD')) setType('Ngập úng')
    else if (c.includes('TREE')) setType('Cây đổ')
    else if (c.includes('WASTE') || c.includes('TRASH') || c.includes('GARBAGE')) setType('Rác')
    else if (c.includes('LIGHT')) setType('Đèn')
    else if (c.includes('OTHER')) setType('Khác')
    else setType('Đường')
    const p = ai.priority.toUpperCase()
    if (p === 'URGENT' || p === 'EMERGENCY' || p === 'CRITICAL') setLevelLabel('Khẩn cấp')
    else if (p === 'HIGH') setLevelLabel('Cao')
    else if (p === 'LOW') setLevelLabel('Thấp')
    else setLevelLabel('Trung bình')
  }

  const applyPinAndGeocode = (nextPin: Pt) => {
    setPin(nextPin)
    setDupHandled(false)
    const sync = resolveSyncAddress(nextPin)
    if (!sync.address) {
      setIsOutside(true)
      setLiveAddress(null)
      setLiveDistrict(null)
      return
    }
    setIsOutside(false)
    setLiveAddress(sync.address)
    setLiveDistrict(sync.district)
    const [lng, lat] =
      nextPin.lng !== undefined && nextPin.lat !== undefined
        ? [nextPin.lng, nextPin.lat]
        : xyToLngLat(nextPin.x, nextPin.y)
    reverseGeocodeDaNang(lng, lat)
      .then((geo) => {
        if (!geo.inside) {
          setIsOutside(true)
          setLiveAddress(null)
          setLiveDistrict(null)
        } else {
          setIsOutside(false)
          setLiveAddress(geo.address)
          setLiveDistrict(geo.district)
        }
      })
      .catch(() => {})
  }

  const startUpload = (file: File) => {
    if (photo === 'scanning') return
    setSubmitErr(null)
    setSelectedFile(file)
    setPreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setPhoto('scanning')
    setPin(null)
    setLiveAddress(null)
    setIsOutside(false)
    setDupHandled(false)
    apiAnalyzeImage(file, note)
      .then(applyAiResult)
      .catch(() => {})
  }

  useEffect(() => {
    if (!selectedFile || photo !== 'done' || !note.trim()) return
    const t = setTimeout(() => {
      apiAnalyzeImage(selectedFile, note)
        .then(applyAiResult)
        .catch(() => {})
    }, 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, selectedFile, photo])

  useEffect(() => {
    if (photo !== 'scanning') return
    let active = true
    const t = setTimeout(() => {
      requestBrowserGpsInDaNang().then((gps) => {
        if (!active) return
        setPhoto('done')
        applyPinAndGeocode({ x: gps.x, y: gps.y, lng: gps.lng, lat: gps.lat })
        setSheetOpen(true)
      })
    }, 1200)
    return () => {
      active = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo])

  const lv = LEVELS.find((l) => l.label === levelLabel)!
  const addr = liveAddress
  const outside = !!pin && isOutside
  const near = pin && !outside ? nearest(pin, existing) : null
  const dup = near && near.m <= 50 && !dupHandled ? { ...existing[near.i], m: Math.round(near.m) } : null
  const phoneBad = phone.length > 0 && !/^0\d{9}$/.test(phone)
  const ready = photo === 'done' && !!selectedFile && !!pin && !outside && /^0\d{9}$/.test(phone)

  const submit = async () => {
    if (!selectedFile || !pin) {
      setSubmitErr('Vui lòng tải ảnh hiện trường thực tế và chọn vị trí trước khi gửi.')
      return
    }
    setSending(true)
    setSubmitErr(null)
    const [lon, lat] =
      pin.lng !== undefined && pin.lat !== undefined ? [pin.lng, pin.lat] : xyToLngLat(pin.x, pin.y)
    const catCode =
      type === 'Ngập úng'
        ? 'FLOODING'
        : type === 'Cây đổ'
          ? 'FALLEN_TREE'
          : type === 'Đèn'
            ? 'STREETLIGHT'
            : type === 'Rác'
              ? 'GARBAGE'
              : type === 'Khác'
                ? 'OTHER'
                : 'ROAD_DAMAGE'
    const prio = lv.level === 'urgent' ? 'EMERGENCY' : lv.level === 'high' ? 'HIGH' : lv.level === 'low' ? 'LOW' : 'NORMAL'
    const distName = liveDistrict || addr?.split(',').pop()?.trim() || 'Hải Châu'
    try {
      const created = await apiCreateIncident({
        title: note.trim() ? `${type}: ${note.trim().slice(0, 48)}` : `${type} tại ${addr ?? 'Đà Nẵng'}`,
        description: note.trim() || `${type} tại ${addr ?? 'Đà Nẵng'}`,
        latitude: lat,
        longitude: lon,
        address_text: addr ?? 'Đà Nẵng',
        district: distName,
        category_code: catCode,
        priority: prio,
        citizen_contact: phone,
        image: selectedFile,
      })
      upsertBackendIncident(created)
      setSending(false)
      setResult({ code: created.ticket_code, merged: false })
    } catch (err) {
      setSending(false)
      setSubmitErr(err instanceof Error ? err.message : 'Không thể gửi phản ánh lên hệ thống.')
    }
  }

  const reset = () => {
    setPhoto('empty'); setPin(null); setLiveAddress(null); setLiveDistrict(null); setIsOutside(false); setDupHandled(false); setNote(''); setResult(null); setSheetOpen(false); setSelectedFile(null); setPreviewUrl(undefined); setSubmitErr(null)
  }
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) startUpload(f)
    e.target.value = ''
  }
  const cycleType = () => setType(TYPES[(TYPES.indexOf(type) + 1) % TYPES.length])
  const cycleLevel = () => setLevelLabel(LEVELS[(LEVELS.indexOf(lv) + 1) % LEVELS.length].label)

  if (result)
    return (
      <ScreenFrame title={result.merged ? 'Đã ghi nhận' : 'Gửi thành công'} sub={result.merged ? 'Cộng thêm vào phiếu đã có' : 'Lưu mã để theo dõi'}>
        <ResultView code={result.code} merged={result.merged} type={type} level={lv.level} hours={lv.hours} address={addr ?? ''} pin={pin!} existing={existing} imageUrl={previewUrl} onReset={reset} />
      </ScreenFrame>
    )

  const photoCard = (
    <section
      className="animate-rise shrink-0 rounded-card bg-card shadow-card transition hover:-translate-y-0.5"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) startUpload(f) }}
    >
      <EvidenceUploadCard
        height={desktop ? 210 : 190}
        state={photo}
        imageUrl={previewUrl}
        dragging={dragging}
        onCapture={() => camRef.current?.click()}
        onChoose={() => fileRef.current?.click()}
      />
    </section>
  )
  const aiCard = <AiSuggestCard photo={photo} type={type} level={lv} address={addr ?? ''} onType={cycleType} onLevel={cycleLevel} />
  const formCard = (
    <section className="animate-rise shrink-0 rounded-card bg-card p-4 shadow-card md:p-5" style={{ animationDelay: '120ms' }}>
      <div className="grid gap-3.5">
        <InputField kind="textarea" height={68} placeholder="Mô tả hiện trường" onChange={setNote} value={note} />
        <InputField placeholder="Số điện thoại" value={phone} onChange={setPhone} error={phoneBad ? 'Số điện thoại chưa đúng' : undefined} />
        {submitErr && <p className="text-[12px] text-urgent">{submitErr}</p>}
        <Button variant="hero" size="lg" icon={Send} loading={sending} disabled={!ready} onClick={submit}>Gửi phản ánh</Button>
      </div>
    </section>
  )
  const dupAlert = dup && (
    <DuplicateAlert meters={dup.m} item={dup} onJoin={() => { apiVoteDuplicate(dup.code).catch(() => {}); setResult({ code: dup.code, merged: true }) }} onNew={() => setDupHandled(true)} />
  )

  const mapOverlay = (
    <>
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center">
        <div className="pointer-events-auto rounded-full shadow-card md:w-[400px]">
          <InputField key={addr ?? 'x'} kind="search" placeholder="Chạm hoặc kéo ghim trên bản đồ" value={addr ?? ''} error={undefined} onChange={() => {}} />
        </div>
      </div>
      {outside && (
        <div className="absolute inset-x-3 bottom-3 z-10 flex justify-center md:bottom-4 md:justify-start">
          <Toast kind="error" text="Ngoài ranh giới Đà Nẵng hoặc vùng đang tạm dừng" />
        </div>
      )}
      {desktop && dupAlert && <div className="absolute bottom-4 left-4 z-10 w-[440px]">{dupAlert}</div>}
    </>
  )
  const mapNode = (
    <MapBentoViewport
      fill
      detailed
      controls="bottom"
      pins={existing}
      userPin={pin ? { ...pin, level: lv.level, bad: outside, radius: 50 } : undefined}
      onPick={(x, y, info) => {
        applyPinAndGeocode({ x, y, lng: info?.lng, lat: info?.lat })
      }}
    />
  )

  return (
    <div className="min-h-screen bg-page pb-28 md:h-dvh md:overflow-hidden md:pb-0">
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col p-4 md:px-6 md:py-4">
        <div className="hidden shrink-0 md:block"><TopPillNav active={1} /></div>
        <header className="mt-2 mb-3 flex shrink-0 items-center justify-between md:mt-3 md:mb-3.5">
          <div className="animate-rise">
            <h1 className="text-[22px] leading-tight font-bold md:text-[24px]">Báo cáo hiện trường</h1>
            <p className="mt-0.5 text-[12px] text-muted">Ảnh thực tế, định vị GPS, gửi nhanh dưới một phút</p>
          </div>
        </header>

        {desktop ? (
          <div className="grid min-h-0 flex-1 grid-cols-12 gap-5">
            <div className="col-span-4 flex min-h-0 flex-col gap-4">
              {photoCard}
              {aiCard}
              {formCard}
            </div>
            <section className="relative col-span-8 h-full min-h-0 overflow-hidden rounded-card shadow-card">
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

function ResultView({ code, merged, type, level, hours, address, pin, existing, imageUrl, onReset }: {
  code: string; merged: boolean; type: string; level: Level; hours: number; address: string; pin: Pt; existing: ExistingPin[]; imageUrl?: string; onReset: () => void
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
      <section className="animate-rise relative flex flex-col justify-between gap-8 overflow-hidden rounded-card bg-ink p-6 text-white shadow-card md:col-span-7 md:min-h-[260px] md:p-8">
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
        <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-5" style={{ animationDelay: '120ms' }}>
          <h2 className="mb-3 text-[16px] font-semibold">Vị trí</h2>
          <MapBentoViewport compact detailed pins={existing} userPin={{ ...pin, level, radius: 50 }} />
        </section>
      </div>

      <section className="animate-rise rounded-card bg-card p-4 shadow-card md:col-span-7 md:p-6" style={{ animationDelay: '180ms' }}>
        <h2 className="mb-4 text-[16px] font-semibold">Phiếu của bạn</h2>
        <IncidentListItem kind={kindOf[type]} imageUrl={imageUrl} title={merged ? 'Đã gộp vào phiếu hiện có' : `${type} ${address.split(',')[0]}`} address={address || 'Đà Nẵng'} time="Vừa xong" level={level} />
      </section>
      <section className="animate-rise rounded-card bg-card p-4 shadow-card md:col-span-5 md:p-6" style={{ animationDelay: '240ms' }}>
        <h2 className="mb-4 text-[16px] font-semibold">Tiếp theo</h2>
        <Timeline current={0} steps={[{ label: 'Tiếp nhận', time: 'Giờ này' }, { label: 'Phân loại', time: '' }, { label: 'Giao việc', time: '' }]} />
        <div className="mt-6"><Button size="lg" onClick={() => { window.location.href = `/tracking/${code}` }}>Theo dõi tiến độ</Button></div>
      </section>
    </div>
  )
}
