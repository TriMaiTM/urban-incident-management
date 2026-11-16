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
import MapArt from './MapArt'
import SamplePhoto from './SamplePhoto'
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
    <div className={cn('flex h-full flex-col justify-between rounded-card shadow-card transition hover:-translate-y-1', compact ? 'min-h-[88px] gap-2 p-3 md:min-h-[104px] md:p-4' : 'min-h-[148px] p-4', dark ? 'bg-ink text-white' : 'bg-card')}>
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
  layout = 'row',
  status = 'default',
  state = 'normal',
}: {
  title: string
  address: string
  time: string
  level: Level
  kind: keyof typeof typeIcon
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
  const thumb = (cls: string) => (
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
  onCapture,
  onChoose,
  onSample,
  dragging,
  height,
}: {
  height?: number
  state: 'empty' | 'scanning' | 'done' | 'error'
  onCapture?: () => void
  onChoose?: () => void
  onSample?: () => void
  dragging?: boolean
}) {
  const photo = state === 'empty' || state === 'scanning' || state === 'done'
  return (
    <div
      className={cn('flex h-full min-h-[220px] flex-col rounded-card bg-surface p-3 transition', dragging && 'bg-card shadow-[0_0_0_3px_#111111,0_0_32px_rgba(17,17,17,0.18)]')}
      style={height ? { height } : undefined}
    >
      <div
        className={cn(
          'relative flex flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-tile',
          state === 'error' && 'border-2 border-dashed border-low',
          dragging && 'ring-2 ring-ink',
        )}
      >
        {photo && <SamplePhoto className={cn('absolute inset-0 size-full object-cover transition duration-700', state === 'empty' && 'scale-110 blur-[6px]', dragging && 'animate-pulse')} />}
        {state === 'empty' && (
          <>
            <div className="absolute inset-0 bg-card/55" />
            <IconChip icon={dragging ? ImageIcon : Camera} tone="ink" size={48} />
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
            <span className="absolute bottom-3 inline-flex h-6 items-center gap-1 rounded-full bg-card px-3 text-[12px] font-semibold"><Sparkles size={12} {...ic} />Đang quét AI</span>
          </>
        )}
        {state === 'done' && (
          <>
            <span className="absolute bottom-3 left-3 inline-flex h-6 items-center gap-1 rounded-full bg-done px-3 text-[12px] font-semibold text-white"><ShieldCheck size={12} {...ic} />NĐ13 Đã mờ</span>
            <span className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-card"><Check size={16} {...ic} /></span>
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
    </div>
  )
}

/* 8. MapBentoViewport */
// Toạ độ ghim giữ hệ 0-100% cũ, quy đổi vào vùng nội thành trên ảnh bản đồ thật.
const mx = (x: number) => 58 + x * 0.24
const my = (y: number) => 36 + y * 0.5
const ux = (x: number) => (x - 58) / 0.24
const uy = (y: number) => (y - 36) / 0.5
const pinColor: Record<Level, string> = { urgent: 'bg-urgent', high: 'bg-high', normal: 'bg-normal', low: 'bg-low', done: 'bg-done' }
export function MapBentoViewport({
  pins,
  state = 'normal',
  compact,
  fill,
  detailed,
  controls = 'top',
  userPin,
  onPick,
  image = '/danang-map.png',
  imageRatio = 1177 / 711,
  zoom = 1,
  onZoom,
  onPinClick,
  selectedPin,
  route,
  heat,
}: {
  heat?: { x: number; y: number; size: number; alpha: number }[]
  route?: { x: number; y: number }[]
  image?: string
  imageRatio?: number
  zoom?: number
  onZoom?: (dir: -1 | 0 | 1) => void
  onPinClick?: (i: number) => void
  selectedPin?: number
  pins: { x: number; y: number; level: Level; label?: string }[]
  state?: DataState
  compact?: boolean
  fill?: boolean
  detailed?: boolean
  controls?: 'top' | 'bottom' | 'bottom-left'
  userPin?: { x: number; y: number; level: Level; bad?: boolean; radius?: number; label?: string }
  onPick?: (x: number, y: number) => void
}) {
  const layer = (
    <>
      {state === 'normal' && heat?.map((h, i) => (
        <span
          key={i}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-700 ease-out"
          style={{ left: `${mx(h.x)}%`, top: `${my(h.y)}%`, width: h.size, height: h.size, background: `radial-gradient(circle, rgba(229,37,27,${h.alpha}) 0%, rgba(229,37,27,${h.alpha * 0.45}) 40%, rgba(229,37,27,0) 70%)` }}
        />
      ))}
      {state === 'normal' && route && route.length > 1 && (
        <>
          <svg key={route.map((r) => r.x + r.y).join()} className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 1000 700" preserveAspectRatio="none" fill="none">
            {['#ffffff', '#111111'].map((c, i) => (
              <polyline key={c} points={route.map((r) => `${mx(r.x) * 10},${my(r.y) * 7}`).join(' ')} pathLength={1} stroke={c} strokeWidth={i ? 6 : 12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1} className="animate-draw" />
            ))}
          </svg>
          <span className="pointer-events-none absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-white shadow-card ring-4 ring-card" style={{ left: `${mx(route[0].x)}%`, top: `${my(route[0].y)}%` }}>
            <Navigation size={14} {...ic} />
          </span>
        </>
      )}
      {state === 'normal' &&
        pins.map((p, i) => {
          const sel = selectedPin === i
          const inner = p.label ? (
            <span className="relative flex size-7 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-white shadow-card ring-4 ring-card">{p.label}</span>
          ) : (
            <>
              <span className={cn('absolute inset-0 animate-pulse-soft rounded-full', pinColor[p.level])} style={{ animationDelay: `${(i % 5) * 0.4}s` }} />
              <span className={cn('relative block rounded-full shadow-card ring-4 ring-card transition-all duration-300', sel ? 'size-6 ring-ink' : 'size-4', pinColor[p.level])} />
            </>
          )
          return onPinClick ? (
            <button key={i} aria-label="Ghim sự cố" onClick={(e) => { e.stopPropagation(); onPinClick(i) }} className="absolute -translate-x-1/2 -translate-y-1/2 transition hover:scale-125" style={{ left: `${mx(p.x)}%`, top: `${my(p.y)}%`, zIndex: sel ? 5 : 1 }}>{inner}</button>
          ) : (
            <span key={i} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${mx(p.x)}%`, top: `${my(p.y)}%` }}>{inner}</span>
          )
        })}
      {state === 'normal' && userPin && (
        <span key={`${Math.round(userPin.x)}-${Math.round(userPin.y)}`} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${mx(userPin.x)}%`, top: `${my(userPin.y)}%` }}>
          {userPin.radius && (
            <span className={cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-rise rounded-full border-2 border-dashed', userPin.bad ? 'border-urgent bg-urgent/10' : 'border-ink/40 bg-ink/5')} style={{ width: userPin.radius * 2, height: userPin.radius * 2 }} />
          )}
          <span className={cn('absolute inset-0 animate-pulse-soft rounded-full', userPin.bad ? 'bg-urgent' : 'bg-ink')} />
          <span className={cn('animate-rise relative flex size-8 items-center justify-center rounded-full text-white shadow-card ring-4 ring-card', userPin.bad ? 'bg-urgent' : 'bg-ink')}>
            {userPin.label ? <span className="text-[14px] font-bold">{userPin.label}</span> : <MapPin size={16} {...ic} />}
          </span>
        </span>
      )}
    </>
  )
  const pick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onPick || state !== 'normal') return
    const r = e.currentTarget.getBoundingClientRect()
    onPick(ux(((e.clientX - r.left) / r.width) * 100), uy(((e.clientY - r.top) / r.height) * 100))
  }
  return (
    <div
      className={cn(
        'overflow-hidden rounded-card bg-surface',
        fill ? 'absolute inset-0' : cn('relative', compact ? 'h-[200px]' : 'h-[320px]'),
        (detailed || image) && '[container-type:size]',
        onPick && 'cursor-crosshair',
      )}
      onClick={detailed || image ? undefined : pick}
    >
      {detailed || image ? (
        <div
          onClick={pick}
          className="absolute top-1/2 left-1/2 transition-transform duration-500 ease-out"
          style={{
            width: `max(100cqw, ${imageRatio * 100}cqh)`,
            height: `max(100cqh, ${100 / imageRatio}cqw)`,
            transform: `translate(-50%, -50%) scale(${zoom})`,
          }}
        >
          {image ? <img src={image} alt="" draggable={false} className="absolute inset-0 size-full select-none" /> : <MapArt />}
          {layer}
        </div>
      ) : (
        <>
          <svg className="absolute inset-0 size-full" viewBox="0 0 400 300" preserveAspectRatio="none" fill="none">
            <rect width="400" height="300" fill="#f4f4f5" />
            <path d="M300 0 C330 80 380 120 400 130 L400 300 L260 300 C300 220 280 120 300 0Z" fill="#e9e9eb" />
            <g stroke="#ffffff" strokeLinecap="round">
              <path d="M0 80 L400 60" strokeWidth="14" />
              <path d="M0 200 C120 180 200 240 400 190" strokeWidth="14" />
              <path d="M110 0 L130 300" strokeWidth="12" />
              <path d="M240 0 L210 300" strokeWidth="10" />
              <path d="M0 140 L200 150" strokeWidth="5" />
              <path d="M40 0 L60 300" strokeWidth="5" />
            </g>
          </svg>
          {layer}
        </>
      )}
      {state === 'normal' && (
        <div className={cn('absolute flex flex-col gap-2', controls === 'top' ? 'top-3 right-3' : controls === 'bottom' ? 'right-3 bottom-3' : 'bottom-3 left-3')} onClick={(e) => e.stopPropagation()}>
          {[Plus, Minus, Navigation].map((I, i) => (
            <button key={i} onClick={() => onZoom?.(([1, -1, 0] as const)[i])} className="flex size-10 items-center justify-center rounded-full bg-card shadow-card transition hover:-translate-y-0.5"><I size={16} {...ic} /></button>
          ))}
        </div>
      )}
      {state !== 'normal' && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          {state === 'loading' && <div className="size-10 animate-spin rounded-full border-4 border-surface border-t-ink" />}
          {state === 'empty' && <EmptyState icon={MapPin} text="Chưa có sự cố" />}
          {state === 'error' && <ErrorState text="Không tải bản đồ" />}
        </div>
      )}
    </div>
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
  height = 160,
  chipMiddle,
}: {
  state?: DataState
  gps: { text: string; ok: boolean }
  photos?: boolean
  height?: number
  chipMiddle?: boolean
}) {
  if (state === 'loading')
    return <div className="grid grid-cols-2 gap-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
  if (state === 'empty') return <div className="rounded-tile bg-surface"><EmptyState icon={ImageIcon} text="Chưa có ảnh" /></div>
  if (state === 'error') return <div className="rounded-tile bg-surface"><ErrorState text="Không tải ảnh" /></div>
  const pane = (label: string, _grad: string, after?: boolean) => (
    <div className="relative flex items-end overflow-hidden rounded-tile p-3" style={{ height }}>
      <SamplePhoto className={cn('absolute inset-0 size-full', after && 'brightness-110 saturate-75')} />
      <span className="relative inline-flex h-6 items-center rounded-full bg-card px-3 text-[12px] font-semibold">{label}</span>
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
        {pane('Trước', 'from-ink to-muted')}
        {pane('Sau', 'from-done to-low', true)}
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
