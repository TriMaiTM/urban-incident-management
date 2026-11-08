import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, MapPin } from 'lucide-react'
import { Button, Toast, cn, ic } from '../components/primitives'

export const phoneOk = (v: string) => /^0\d{9}$/.test(v.replace(/\s/g, ''))
export const wait = (ms = 1100) => new Promise<void>((r) => setTimeout(r, ms))
export const forcedError = () => new URLSearchParams(window.location.search).get('state') === 'error'

export function AuthShell({ headline, children, toast }: { headline: ReactNode; children: ReactNode; toast?: null | { kind: 'success' | 'error' | 'info'; text: string } }) {
  return (
    <div className="min-h-screen bg-page p-4">
      {toast && <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 animate-rise"><Toast kind={toast.kind} text={toast.text} /></div>}
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-[1440px] gap-4 md:grid-cols-2">
        <main className="flex items-center justify-center rounded-card bg-card p-6 shadow-card md:p-12">
          <div className="animate-rise w-full max-w-[400px]">
            <a href="/" className="mb-8 flex items-center gap-2 text-[16px] font-bold md:hidden"><span className="flex size-8 items-center justify-center rounded-full bg-ink text-white"><MapPin size={16} {...ic} /></span>Urbana</a>
            {children}
          </div>
        </main>
        <aside className="relative hidden overflow-hidden rounded-card bg-ink p-10 text-white shadow-card md:sticky md:top-4 md:flex md:h-[calc(100vh-32px)] md:flex-col md:justify-between">
          <div className="pointer-events-none absolute -right-32 -bottom-40 size-[560px] rounded-full bg-accent opacity-90 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-10 -left-24 size-[300px] rounded-full bg-accent/40 blur-[80px]" />
          <a href="/" className="relative flex items-center gap-3 text-[24px] font-bold"><span className="flex size-12 items-center justify-center rounded-full bg-accent"><MapPin size={22} {...ic} /></span>Urbana</a>
          <div className="relative">
            <h2 className="max-w-[460px] text-[48px] leading-[1.1] font-bold">{headline}</h2>
            <p className="mt-4 text-[14px] text-white/70">Quản lý sự cố đô thị Đà Nẵng</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[24px] font-bold">{title}</h1>
      <p className="mt-1 text-[14px] text-muted">{sub}</p>
    </div>
  )
}

export function Alert({ text, tone = 'error' }: { text?: string | null; tone?: 'error' | 'success' }) {
  if (!text) return null
  const I = tone === 'error' ? AlertCircle : CheckCircle2
  return (
    <div role="alert" className={cn('mb-4 flex animate-rise items-start gap-2 rounded-tile p-3 text-[14px]', tone === 'error' ? 'bg-urgent/10 text-urgent' : 'bg-done/10 text-done')}>
      <I size={16} {...ic} className="mt-0.5 shrink-0" />{text}
    </div>
  )
}

export function OtpInput({ value, onChange, error, disabled }: { value: string; onChange: (v: string) => void; error?: boolean; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const set = (i: number, ch: string) => {
    const a = value.padEnd(6, ' ').split('')
    a[i] = ch || ' '
    onChange(a.join('').trimEnd())
  }
  return (
    <div className="flex justify-between gap-2" onPaste={(e) => { const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, 5)]?.focus() } }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          aria-label={`Số OTP thứ ${i + 1}`}
          value={(value[i] ?? '').trim()}
          onChange={(e) => { const ch = e.target.value.replace(/\D/g, '').slice(-1); set(i, ch); if (ch && i < 5) refs.current[i + 1]?.focus() }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !value[i]?.trim() && i > 0) refs.current[i - 1]?.focus() }}
          className={cn('h-12 w-full min-w-0 rounded-tile bg-surface text-center text-[16px] font-semibold tabular-nums outline-none transition focus:bg-card focus:ring-2 focus:ring-ink disabled:opacity-50', error && 'ring-2 ring-urgent')}
        />
      ))}
    </div>
  )
}

/* Nút gửi mã OTP có đếm ngược gửi lại */
export function useCountdown(start = 30) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n <= 0) return
    const t = setTimeout(() => setN(n - 1), 1000)
    return () => clearTimeout(t)
  }, [n])
  return [n, () => setN(start)] as const
}

export function SendCode({ onSend, left, loading, disabled }: { onSend: () => void; left: number; loading: boolean; disabled?: boolean }) {
  return <Button variant="subtle" loading={loading} disabled={disabled || left > 0} onClick={onSend}>{left > 0 ? `Gửi lại (${left}s)` : 'Gửi mã'}</Button>
}

export function Primary({ children, loading, onClick, disabled }: { children: ReactNode; loading?: boolean; onClick: () => void; disabled?: boolean }) {
  return <div className="[&>button]:w-full"><Button size="lg" loading={loading} disabled={disabled} onClick={onClick}>{children}</Button></div>
}
