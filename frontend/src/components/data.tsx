'use client'

import {
  Camera,
  Clock,
  Droplets,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ChevronDown,
  Lightbulb,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TreeDeciduous,
  Construction,
  Check,
  type LucideProps,
} from 'lucide-react'
import { useState, type ComponentType, type ReactNode } from 'react'
import GoongBentoMap from './GoongBentoMap'
import {
  Button,
  Dropdown,
  EmptyState,
  ErrorState,
  IconChip,
  Skeleton,
  StatusPill,
  cn,
  ic,
  useCountUp,
  type DataState,
  type Level,
  type Tone,
} from './primitives'

type Icon = ComponentType<LucideProps>

/* 4. MetricBentoCard */
export function MetricBentoCard({
  title,
  value,
  suffix,
  icon,
  tone = 'neutral',
  chart,
  series = [],
  state = 'normal',
  dark,
  compact,
  caption = 'Hôm nay',
}: {
  caption?: string
  compact?: boolean
  title: string
  value: number
  suffix?: string
  icon: Icon
  tone?: Tone
  chart?: 'spark' | 'bars'
  series?: number[]
  state?: DataState
  dark?: boolean
}) {
  const n = useCountUp(value)
  const max = Math.max(...series, 1)
  const pts = series.map((s, i) => `${(i / (series.length - 1)) * 100},${32 - (s / max) * 28}`).join(' ')
  return (
    <div className={cn('flex flex-col justify-between rounded-card shadow-card transition hover:-translate-y-1', compact ? 'min-h-[88px] gap-2 p-3 md:min-h-[104px] md:p-4' : 'min-h-[144px] gap-3 p-4', dark ? 'bg-ink text-white' : 'bg-card')}>
      <div className="flex items-center justify-between">
        <span className={cn('font-semibold', compact ? 'text-[12px] md:text-[14px]' : 'text-[14px]', dark && 'text-white')}>{title}</span>
        <span className={cn(compact && 'hidden md:block')}><IconChip icon={icon} tone={dark ? 'neutral' : tone} size={32} /></span>
      </div>
      {state === 'loading' && <div className="space-y-2"><Skeleton className="h-9 w-24" /><Skeleton className="h-3 w-full" /></div>}
      {state === 'empty' && <div className="text-[32px] leading-none font-bold text-muted">--</div>}
      {state === 'error' && <p className="text-[12px] text-urgent">Không tải được</p>}
      {state === 'normal' && (
        <div className="flex items-end justify-between gap-3">
          <div className={cn('leading-none font-bold tabular-nums', compact ? 'text-[28px] md:text-[32px]' : 'text-[40px]')}>
            {n}
            {suffix && <span className="text-[16px] font-semibold opacity-60">{suffix}</span>}
          </div>
          {chart === 'spark' && (
            <svg viewBox="0 0 100 32" className={cn('h-9 w-24', compact && 'hidden md:block')} fill="none">
              <polyline points={pts} stroke={dark ? '#ffffff' : '#111111'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="100" cy={32 - (series[series.length - 1] / max) * 28} r="3" fill="#e5251b" />
            </svg>
          )}
          {chart === 'bars' && (
            <div className={cn('flex h-9 items-end gap-1', compact && 'hidden md:flex')}>
              {series.map((s, i) => (
                <span key={i} className={cn('w-2 rounded-full', i === series.length - 1 ? 'bg-accent' : dark ? 'bg-white/40' : 'bg-low')} style={{ height: `${(s / max) * 100}%` }} />
              ))}
            </div>
          )}
        </div>
      )}
      {!compact && (
        <span className={cn('text-[12px]', dark ? 'text-white/60' : 'text-muted')}>
          {state === 'empty' ? 'Chưa có dữ liệu' : caption}
        </span>
      )}
    </div>
  )
}

/* 5. IncidentListItem */
const typeIcon: Record<string, Icon> = { flood: Droplets, road: Construction, tree: TreeDeciduous, trash: Trash2, light: Lightbulb }
const typeBg: Record<string, string> = {
  flood: 'from-ink to-low',
  road: 'from-high to-normal',
  tree: 'from-done to-low',
  trash: 'from-low to-surface',
  light: 'from-normal to-high',
}
export function IncidentListItem({
  title,
  address,
  time,
  level,
  kind,
  imageUrl,
  layout = 'row',
  status = 'default',
  state = 'normal',
}: {
  title: string
  address: string
  time: string
  level: Level
  kind: keyof typeof typeIcon
  imageUrl?: string
  layout?: 'row' | 'card'
  status?: 'default' | 'selected' | 'overdue'
  state?: DataState
}) {
  const I = typeIcon[kind]
  if (state === 'loading')
    return (
      <div className="flex items-center gap-3 rounded-card bg-surface p-3">
        <Skeleton className="size-14 bg-card" />
        <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4 bg-card" /><Skeleton className="h-3 w-1/2 bg-card" /></div>
      </div>
    )
  if (state === 'empty') return <div className="rounded-card bg-surface"><EmptyState text="Chưa có phiếu" /></div>
  if (state === 'error') return <div className="rounded-card bg-surface"><ErrorState /></div>
  const frame = cn(
    'rounded-card transition hover:-translate-y-0.5',
    status === 'selected' ? 'bg-ink text-white' : 'bg-surface',
    status === 'overdue' && 'ring-1 ring-urgent',
  )
  const thumb = (cls: string) =>
    imageUrl ? (
      <div className={cn('relative overflow-hidden rounded-tile bg-surface', cls)}>
        <img src={imageUrl} alt={title} className="size-full object-cover" />
      </div>
    ) : (
      <div className={cn('flex items-center justify-center rounded-tile bg-gradient-to-br text-white', typeBg[kind], cls)}>
        <I size={22} {...ic} />
      </div>
    )
  const sub = status === 'selected' ? 'text-white/60' : 'text-muted'
  if (layout === 'card')
    return (
      <div className={cn(frame, 'p-3')}>
        {thumb('h-24 w-full')}
        <div className="mt-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[14px] font-semibold">{title}</p>
            <p className={cn('mt-1 text-[12px]', sub)}>{address} · {time}</p>
          </div>
          <StatusPill level={level} />
        </div>
      </div>
    )
  return (
    <div className={cn(frame, 'flex items-center gap-3 p-3')}>
      {thumb('size-14 shrink-0')}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{title}</p>
        <p className={cn('mt-1 flex items-center gap-1 truncate text-[12px]', sub)}>
          <MapPin size={12} {...ic} />{address} · <Clock size={12} {...ic} />{time}
        </p>
      </div>
      <StatusPill level={level} />
    </div>
  )
}

/* 6. InputField */
const fieldBase = 'w-full bg-surface text-[14px] text-ink outline-none placeholder:text-muted transition focus:bg-card focus:ring-2 focus:ring-ink'
export function InputField({
  kind = 'text',
  label,
  placeholder,
  error,
  value,
  disabled,
  onChange,
  height,
  options,
  pill,
}: {
  options?: string[]
  pill?: boolean
  height?: number
  onChange?: (v: string) => void
  kind?: 'text' | 'password' | 'textarea' | 'select' | 'search'
  label?: string
  placeholder: string
  error?: string
  value?: string
  disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  const [picked, setPicked] = useState(value)
  const err = error ? 'ring-2 ring-urgent' : ''
  let control: ReactNode
  if (kind === 'textarea')
    control = <textarea rows={3} style={height ? { height } : undefined} onChange={(e) => onChange?.(e.target.value)} defaultValue={value} disabled={disabled} placeholder={placeholder} className={cn(fieldBase, 'resize-none rounded-tile p-3', err)} />
  else if (kind === 'select')
    control = <Dropdown options={options ?? ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang']} value={picked} placeholder={placeholder} pill={pill} disabled={disabled} invalid={!!error} onChange={(v) => { setPicked(v); onChange?.(v) }} />
  else if (kind === 'search')
    control = (
      <div className="relative">
        <Search size={16} {...ic} className="absolute top-3 left-4 text-muted" />
        <input onChange={(e) => onChange?.(e.target.value)} defaultValue={value} disabled={disabled} placeholder={placeholder} className={cn(fieldBase, 'h-10 rounded-full pr-4 pl-10', err)} />
      </div>
    )
  else if (kind === 'password')
    control = (
      <div className="relative">
        <input type={show ? 'text' : 'password'} onChange={(e) => onChange?.(e.target.value)} defaultValue={value} disabled={disabled} placeholder={placeholder} className={cn(fieldBase, 'h-10 rounded-tile pr-10 pl-3', err)} />
        <button type="button" onClick={() => setShow(!show)} className="absolute top-3 right-3 text-muted">
          {show ? <EyeOff size={16} {...ic} /> : <Eye size={16} {...ic} />}
        </button>
      </div>
    )
  else
    control = <input onChange={(e) => onChange?.(e.target.value)} defaultValue={value} disabled={disabled} placeholder={placeholder} className={cn(fieldBase, 'h-10 rounded-tile px-3', err)} />
  return (
    <label className={cn('block', disabled && 'opacity-50')}>
      {label && <span className="mb-1 block text-[12px] text-muted">{label}</span>}
      {control}
      {error && <span className="mt-1 block text-[12px] text-urgent">{error}</span>}
    </label>
  )
}

/* 7. EvidenceUploadCard */
export function EvidenceUploadCard({
  state,
  imageUrl,
  onCapture,
  onChoose,
  onSample,
  dragging,
  height,
}: {
  height?: number
  state: 'empty' | 'scanning' | 'done' | 'error'
  imageUrl?: string
  onCapture?: () => void
  onChoose?: () => void
  onSample?: () => void
  dragging?: boolean
}) {
  const showImage = (state === 'scanning' || state === 'done') && !!imageUrl
  return (
    <div
      className={cn(
        'relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-card bg-card p-4 transition',
        state === 'empty' && 'border-2 border-dashed border-low/80 bg-card',
        state === 'error' && 'border-2 border-dashed border-urgent/60 bg-card',
        dragging && 'ring-2 ring-ink shadow-[0_0_0_3px_#111111,0_0_32px_rgba(17,17,17,0.18)]',
      )}
      style={height ? { height } : { minHeight: 190 }}
    >
      {showImage && (
        <img
          src={imageUrl}
          alt="Ảnh hiện trường"
          className={cn(
            'absolute inset-0 size-full object-cover transition duration-500',
            dragging && 'animate-pulse',
          )}
        />
      )}
      {!showImage && (state === 'scanning' || state === 'done') && (
        <div className="flex flex-col items-center gap-2 text-muted">
          <ImageIcon size={28} {...ic} />
          <span className="text-[12px]">Ảnh hiện trường</span>
        </div>
      )}
      {state === 'empty' && (
        <>
          <IconChip icon={dragging ? ImageIcon : Camera} tone="ink" size={48} />
          <p className="text-[12px] text-muted">Tải lên hoặc kéo thả ảnh hiện trường thật</p>
          <div className="relative flex flex-wrap justify-center gap-2">
            <Button size="sm" icon={Camera} onClick={onCapture}>Chụp ảnh</Button>
            <Button size="sm" variant="secondary" icon={ImageIcon} onClick={onChoose}>Chọn ảnh</Button>
            {onSample && <Button size="sm" variant="subtle" icon={Sparkles} onClick={onSample}>Ảnh mẫu</Button>}
          </div>
        </>
      )}
      {state === 'scanning' && (
        <>
          <div className="absolute inset-x-0 top-0 bottom-0"><div className="animate-scan absolute inset-x-0 h-1 bg-white shadow-[0_0_16px_#fff]" /></div>
          <span className="absolute bottom-3 inline-flex h-6 items-center gap-1 rounded-full bg-card px-3 text-[12px] font-semibold shadow-card"><Sparkles size={12} {...ic} />Đang quét AI</span>
        </>
      )}
      {state === 'done' && (
        <>
          <span className="absolute bottom-3 left-3 inline-flex h-6 items-center gap-1 rounded-full bg-done px-3 text-[12px] font-semibold text-white shadow-card"><ShieldCheck size={12} {...ic} />NĐ13 Đã mờ</span>
          {onChoose ? (
            <button
              type="button"
              onClick={onChoose}
              className="absolute top-3 right-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-card/95 px-3 text-[12px] font-semibold text-ink shadow-card transition hover:bg-card"
            >
              <ImageIcon size={13} {...ic} />Đổi ảnh
            </button>
          ) : (
            <span className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-card shadow-card"><Check size={16} {...ic} /></span>
          )}
        </>
      )}
      {state === 'error' && (
        <>
          <IconChip icon={Camera} tone="urgent" size={48} />
          <p className="text-[12px] text-urgent">Ảnh quá mờ</p>
          <Button size="sm" variant="secondary" onClick={onChoose}>Thử lại</Button>
        </>
      )}
    </div>
  )
}

/* 8. MapBentoViewport — Interactive Goong Map with GADM 4.1 District GIS Layers */
export function MapBentoViewport({
  pins,
  state = 'normal',
  compact,
  fill,
  controls = 'top',
  userPin,
  onPick,
  onZoom,
  onPinClick,
  selectedPin,
  route,
  heat,
}: {
  heat?: { x: number; y: number; lat?: number; lng?: number; size: number; alpha: number }[]
  route?: { x: number; y: number; lat?: number; lng?: number }[]
  image?: string
  imageRatio?: number
  zoom?: number
  onZoom?: (dir: -1 | 0 | 1) => void
  onPinClick?: (i: number) => void
  selectedPin?: number
  pins: { x: number; y: number; lat?: number; lng?: number; level: Level; label?: string }[]
  state?: DataState
  compact?: boolean
  fill?: boolean
  detailed?: boolean
  controls?: 'top' | 'bottom' | 'bottom-left'
  userPin?: { x: number; y: number; lat?: number; lng?: number; level: Level; bad?: boolean; radius?: number; label?: string }
  onPick?: (x: number, y: number, lngLat?: { lng: number; lat: number; district: string | null }) => void
}) {
  return (
    <GoongBentoMap
      pins={pins}
      state={state}
      compact={compact}
      fill={fill}
      controls={controls}
      userPin={userPin}
      onPick={onPick}
      onZoom={onZoom}
      onPinClick={onPinClick}
      selectedPin={selectedPin}
      route={route}
      heat={heat}
    />
  )
}

/* 13. DataTable */
export type Row = { code: string; type: string; street: string; level: Level; sla: string }
export function DataTable({ rows, state = 'normal' }: { rows: Row[]; state?: DataState }) {
  const cols = ['Mã phiếu', 'Loại', 'Vị trí', 'Mức', 'Hạn SLA']
  return (
    <div className="overflow-hidden rounded-tile">
      <table className="w-full text-left text-[14px]">
        <thead>
          <tr className="bg-surface text-[12px] text-muted">
            {cols.map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}
          </tr>
        </thead>
        {state === 'normal' && (
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className="transition hover:bg-surface">
                <td className="px-4 py-3 font-semibold tabular-nums">{r.code}</td>
                <td className="px-4 py-3">{r.type}</td>
                <td className="px-4 py-3 text-muted">{r.street}</td>
                <td className="px-4 py-3"><StatusPill level={r.level} /></td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-muted"><Clock size={14} {...ic} />{r.sla}</span></td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
      {state === 'loading' && <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>}
      {state === 'empty' && <EmptyState text="Chưa có phiếu" />}
      {state === 'error' && <ErrorState />}
    </div>
  )
}

/* 14. CompareEvidence */
export function CompareEvidence({
  state = 'normal',
  gps,
  photos,
  beforeUrl,
  afterUrl,
  height = 160,
  chipMiddle,
}: {
  state?: DataState
  gps: { text: string; ok: boolean }
  photos?: boolean
  beforeUrl?: string
  afterUrl?: string
  height?: number
  chipMiddle?: boolean
}) {
  void photos
  if (state === 'loading')
    return <div className="grid grid-cols-2 gap-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
  if (state === 'empty') return <div className="rounded-tile bg-surface"><EmptyState icon={ImageIcon} text="Chưa có ảnh" /></div>
  if (state === 'error') return <div className="rounded-tile bg-surface"><ErrorState text="Không tải ảnh" /></div>
  const pane = (label: string, url?: string) => (
    <div className="relative flex items-end overflow-hidden rounded-tile bg-surface p-3" style={{ height }}>
      {url ? (
        <img src={url} alt={label} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted">
          <ImageIcon size={24} {...ic} />
          <span className="text-[12px]">Chưa có ảnh {label.toLowerCase()}</span>
        </div>
      )}
      <span className="relative inline-flex h-6 items-center rounded-full bg-card px-3 text-[12px] font-semibold shadow-card">{label}</span>
    </div>
  )
  const chip = (
    <span className={cn('inline-flex h-8 items-center gap-1 rounded-full px-4 text-[12px] font-semibold text-white shadow-card', gps.ok ? 'bg-done' : 'bg-urgent', chipMiddle && 'animate-rise ring-4 ring-card')}>
      <MapPin size={12} {...ic} />{gps.text}
    </span>
  )
  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-3">
        {pane('Trước', beforeUrl)}
        {pane('Sau', afterUrl ?? beforeUrl)}
      </div>
      {chipMiddle ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{chip}</div>
      ) : (
        <div className="mt-3 flex justify-center">{chip}</div>
      )}
    </div>
  )
}

/* 15. Timeline */
export type Step = { label: string; time: string }
export function Timeline({
  steps,
  current,
  rejected,
  state = 'normal',
}: {
  steps: Step[]
  current: number
  rejected?: boolean
  state?: DataState
}) {
  if (state === 'loading') return <div className="flex gap-3">{steps.map((_, i) => <Skeleton key={i} className="h-16 flex-1" />)}</div>
  if (state === 'empty') return <div className="rounded-tile bg-surface"><EmptyState text="Chưa có mốc" /></div>
  if (state === 'error') return <div className="rounded-tile bg-surface"><ErrorState /></div>
  return (
    <ol className="flex">
      {steps.map((s, i) => {
        const done = i < current
        const now = i === current
        const bad = rejected && i === steps.length - 1
        return (
          <li key={s.label} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <span className={cn('absolute top-4 right-[calc(50%+22px)] z-0 h-0.5 w-[calc(100%-44px)] -translate-y-1/2 rounded-full', i <= current ? 'bg-ink' : 'bg-low/40')} />}
            <span
              className={cn(
                'relative z-10 flex items-center justify-center rounded-full text-[12px] font-semibold transition',
                now ? 'size-8 bg-ink text-white ring-4 ring-ink/15' : 'size-8',
                bad && 'bg-urgent text-white ring-4 ring-urgent/15',
                done && 'bg-done text-white',
                !done && !now && 'bg-surface text-muted',
              )}
            >
              {done ? <Check size={16} {...ic} /> : i + 1}
            </span>
            <span className={cn('mt-2 text-[12px]', now || bad ? 'font-semibold text-ink' : 'text-muted')}>{s.label}</span>
            <span className="text-[12px] text-muted">{s.time}</span>
          </li>
        )
      })}
    </ol>
  )
}
