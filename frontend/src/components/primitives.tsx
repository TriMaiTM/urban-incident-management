'use client'

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  XCircle,
  type LucideProps,
} from 'lucide-react'

export type Icon = ComponentType<LucideProps>
export const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')
export const ic = { strokeWidth: 1.75 }

export type DataState = 'normal' | 'loading' | 'empty' | 'error'

/* 1. Button */
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'subtle' | 'ghost' | 'danger' | 'hero'
  size?: 'sm' | 'md' | 'lg'
  icon?: Icon
  loading?: boolean
  disabled?: boolean
  children?: ReactNode
  onClick?: () => void
}
const btnVariant = {
  primary: 'bg-ink text-white hover:bg-ink/85',
  secondary: 'border border-ink text-ink hover:bg-surface',
  subtle: 'bg-surface text-ink hover:bg-page',
  ghost: 'text-ink hover:bg-surface',
  danger: 'bg-accent text-white hover:bg-accent/90',
  hero: 'bg-accent text-white shadow-card hover:bg-accent/90',
}
const btnSize = {
  sm: 'h-8 px-3 text-[12px] gap-1',
  md: 'h-10 px-4 text-[14px] gap-2',
  lg: 'h-12 px-6 text-[14px] gap-2',
}
export function Button({
  variant = 'primary',
  size = 'md',
  icon: I,
  loading,
  disabled,
  children,
  onClick,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
        btnVariant[variant],
        btnSize[size],
      )}
    >
      {loading ? <Loader2 size={16} {...ic} className="animate-spin" /> : I && <I size={size === 'sm' ? 14 : 16} {...ic} />}
      {children}
    </button>
  )
}

/* 2. PillTab */
export function PillTab({
  items,
  value,
  onChange,
  tone = 'white',
}: {
  items: string[]
  value: string
  onChange: (v: string) => void
  tone?: 'white' | 'ink'
}) {
  return (
    <div className="inline-flex gap-1 rounded-full bg-surface p-1">
      {items.map((it) => {
        const on = it === value
        return (
          <button
            key={it}
            onClick={() => onChange(it)}
            className={cn(
              'h-8 rounded-full px-4 text-[12px] font-semibold transition',
              on
                ? tone === 'ink'
                  ? 'bg-ink text-white'
                  : 'bg-card text-ink shadow-card'
                : 'text-muted hover:text-ink',
            )}
          >
            {it}
          </button>
        )
      })}
    </div>
  )
}

/* 3. StatusPill */
export type Level = 'urgent' | 'high' | 'normal' | 'low' | 'done'
const pillStyle: Record<Level, string> = {
  urgent: 'bg-urgent text-white',
  high: 'bg-high text-white',
  normal: 'bg-normal text-ink',
  low: 'bg-low text-ink',
  done: 'bg-done text-white',
}
export const levelLabel: Record<Level, string> = {
  urgent: 'Khẩn cấp',
  high: 'Cao',
  normal: 'Trung bình',
  low: 'Thấp',
  done: 'Hoàn tất',
}
export function StatusPill({ level }: { level: Level }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1 rounded-full px-3 text-[12px] font-semibold whitespace-nowrap', pillStyle[level])}>
      {level === 'urgent' && <AlertTriangle size={12} {...ic} />}
      {level === 'done' && <CheckCircle2 size={12} {...ic} />}
      {levelLabel[level]}
    </span>
  )
}

/* 17. IconChip + Avatar */
const tones = {
  neutral: 'bg-surface text-ink',
  ink: 'bg-ink text-white',
  urgent: 'bg-urgent/10 text-urgent',
  high: 'bg-high/10 text-high',
  normal: 'bg-normal/15 text-ink',
  done: 'bg-done/10 text-done',
}
export type Tone = keyof typeof tones
export function IconChip({ icon: I, tone = 'neutral', size = 40 }: { icon: Icon; tone?: Tone; size?: 32 | 40 | 48 }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-tile', tones[tone])} style={{ width: size, height: size }}>
      <I size={size === 32 ? 16 : 20} {...ic} />
    </span>
  )
}
const avatarBg = ['bg-ink text-white', 'bg-high text-white', 'bg-normal text-ink', 'bg-done text-white', 'bg-low text-ink']
export function Avatar({
  name,
  size = 40,
  color = 0,
  online,
}: {
  name: string
  size?: 24 | 32 | 40 | 48
  color?: number
  online?: boolean
}) {
  const initials = name.split(' ').slice(-2).map((w) => w[0]).join('')
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-card', avatarBg[color % avatarBg.length])}
      style={{ width: size, height: size, fontSize: size <= 24 ? 12 : size >= 48 ? 14 : 12 }}
    >
      {initials}
      {online && <span className="absolute right-0 bottom-0 size-2 rounded-full bg-done ring-2 ring-card" />}
    </span>
  )
}

/* 16. EmptyState + Toast */
export function EmptyState({ icon: I = Info, text, tone = 'neutral' }: { icon?: Icon; text: string; tone?: Tone }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      <IconChip icon={I} tone={tone} size={48} />
      <p className="text-[14px] text-muted">{text}</p>
    </div>
  )
}
const toastIcon = { success: CheckCircle2, error: XCircle, info: Info }
const toastTone: Record<keyof typeof toastIcon, Tone> = { success: 'done', error: 'urgent', info: 'neutral' }
export function Toast({ kind, text }: { kind: keyof typeof toastIcon; text: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-ink py-2 pr-6 pl-2 text-[14px] text-white shadow-card">
      <span className={cn('flex size-8 items-center justify-center rounded-full', kind === 'success' ? 'bg-done' : kind === 'error' ? 'bg-urgent' : 'bg-white/20')}>
        {(() => { const I = toastIcon[kind]; return <I size={16} {...ic} /> })()}
      </span>
      {text}
    </div>
  )
}
export { toastTone }

/* Shared state helpers */
export function Skeleton({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-tile bg-[length:200%_100%]',
        dark
          ? 'bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.24)_50%,rgba(255,255,255,0.08)_100%)]'
          : 'bg-[linear-gradient(90deg,#f4f4f5_0%,#ffffff_50%,#f4f4f5_100%)]',
        className,
      )}
    />
  )
}
export function ErrorState({ text = 'Không tải được' }: { text?: string }) {
  return <EmptyState icon={XCircle} tone="urgent" text={text} />
}

export function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

/* Dropdown: danh sách thả xuống dạng popover thay cho <select> gốc */
export function Dropdown({ options, value, placeholder, onChange, pill, disabled, invalid, className }: {
  options: string[]; value?: string; placeholder: string; onChange: (v: string) => void
  pill?: boolean; disabled?: boolean; invalid?: boolean; className?: string
}) {
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState({ left: 0, top: 0, width: 0 })
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const toggle = () => {
    if (open) return setOpen(false)
    const r = btn.current!.getBoundingClientRect()
    setBox({ left: r.left, top: r.bottom + 8, width: Math.max(r.width, 200) })
    setOpen(true)
  }
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const down = (e: MouseEvent) => { if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close() }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true) }
  }, [open])
  const left = Math.min(box.left, window.innerWidth - box.width - 8)
  return (
    <>
      <button
        ref={btn}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        className={cn('flex h-10 w-full items-center justify-between gap-2 bg-surface text-[14px] transition focus-visible:ring-2 focus-visible:ring-ink disabled:opacity-50', pill ? 'rounded-full pr-3 pl-4 font-semibold' : 'rounded-tile px-3', open && 'ring-2 ring-ink', invalid && 'ring-2 ring-urgent', className)}
      >
        <span className={cn('truncate', !value && 'text-muted')}>{value || placeholder}</span>
        <ChevronDown size={16} {...{ strokeWidth: 1.75 }} className={cn('shrink-0 text-muted transition', open && 'rotate-180')} />
      </button>
      {open && createPortal(
        <div ref={list} role="listbox" style={{ left, top: box.top, width: box.width }} className="animate-rise fixed z-[100] max-h-[320px] overflow-y-auto rounded-tile bg-card p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.14)] ring-1 ring-black/5">
          {options.map((o) => (
            <button key={o} role="option" aria-selected={o === value} onClick={() => { onChange(o); setOpen(false) }} className={cn('flex h-10 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-[14px] transition hover:bg-surface', o === value ? 'font-semibold' : 'font-medium')}>
              {o}{o === value && <Check size={16} {...{ strokeWidth: 1.75 }} />}
            </button>
          ))}
        </div>, document.body)}
    </>
  )
}

/* HeaderStat: số liệu gọn dạng viên thuốc cho header, cao 48px bằng avatar và nút lớn. */
export function HeaderStat({ title, value, icon, dark, tone = 'neutral' }: { title: string; value: number; icon: Icon; dark?: boolean; tone?: Tone }) {
  const n = useCountUp(value, 600)
  return (
    <div className={cn('flex h-12 shrink-0 items-center gap-3 rounded-full pr-5 pl-2 shadow-card', dark ? 'bg-ink text-white' : 'bg-card')}>
      <IconChip icon={icon} tone={dark ? 'neutral' : tone} size={32} />
      <span className="text-[14px] font-semibold whitespace-nowrap">{title}</span>
      <span className={cn('text-[24px] leading-none font-bold tabular-nums', !dark && tone === 'urgent' && value > 0 && 'text-urgent')}>{n}</span>
    </div>
  )
}
