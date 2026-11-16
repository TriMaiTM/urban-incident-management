'use client'

import { useEffect, useRef, useState } from 'react'
import { BatteryMedium, Crosshair, Phone, RefreshCw, Signal, Smartphone, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import { IconChip, cn, ic } from '../components/primitives'
import TechnicianShell, { type TechToast } from './TechnicianShell'

const pad = (n: number) => String(n).padStart(2, '0')
function Stat({ icon, label, value, tone = 'neutral', off }: { icon: ComponentType<LucideProps>; label: string; value: string; tone?: 'neutral' | 'done' | 'high'; off?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-tile bg-surface p-3">
      <IconChip icon={icon} tone={off ? 'neutral' : tone} size={40} />
      <div className="min-w-0">
        <p className="text-[12px] text-muted">{label}</p>
        <p className="truncate text-[14px] font-semibold">{value}</p>
      </div>
    </div>
  )
}

export default function TechnicianProfileScreen() {
  const [on, setOn] = useState(true)
  const [secs, setSecs] = useState(3 * 3600 + 12 * 60 + 40)
  const [toast, setToast] = useState<TechToast>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!on) return
    const i = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(i)
  }, [on])

  const flip = () => {
    const next = !on
    setOn(next)
    setToast({ kind: next ? 'success' : 'info', text: next ? 'Bạn đã sẵn sàng nhận nhiệm vụ' : 'Đã chuyển sang nghỉ ca' })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2200)
  }
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60

  return (
    <TechnicianShell title="Trực ban" subtitle="Lê Văn Hùng, Đội cầu đường Hải Châu" toast={toast}>
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <button
          onClick={flip}
          role="switch"
          aria-checked={on}
          className={cn('relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-card p-6 text-left shadow-card transition-colors duration-500 active:scale-[.99] md:min-h-[420px] md:p-8', on ? 'bg-ink text-white' : 'bg-low text-ink')}
        >
          <div className="flex items-center justify-between">
            <span className={cn('inline-flex h-8 items-center gap-2 rounded-full px-3 text-[12px] font-semibold', on ? 'bg-white/10' : 'bg-white/50')}>
              <span className="relative flex size-2.5">
                {on && <span className="absolute inset-0 animate-pulse-soft rounded-full bg-done" />}
                <span className={cn('relative size-2.5 rounded-full', on ? 'bg-done' : 'bg-muted')} />
              </span>
              {on ? 'Đang trực' : 'Ngoài ca'}
            </span>
            <span className="text-[12px] opacity-70">Ca sáng 06:00 – 14:00</span>
          </div>
          <div>
            <h2 className="text-[32px] leading-tight font-bold md:text-[40px]">{on ? 'Sẵn sàng nhận nhiệm vụ' : 'Nghỉ ca'}</h2>
            <p className="mt-2 text-[14px] opacity-70">{on ? 'IOC có thể giao phiếu mới cho bạn ngay.' : 'Bạn sẽ không nhận phiếu mới cho đến khi bật lại.'}</p>
            <p className="mt-4 text-[24px] font-bold tabular-nums">{on ? `${pad(h)}:${pad(m)}:${pad(s)}` : '--:--:--'}<span className="ml-2 text-[12px] font-medium opacity-60">thời gian trực</span></p>
          </div>
          <span className={cn('flex h-16 w-32 items-center rounded-full p-2 transition-colors duration-500 md:h-20 md:w-40', on ? 'bg-white/15' : 'bg-white/50')}>
            <span className={cn('size-12 rounded-full shadow-card transition-all duration-500 md:size-16', on ? 'translate-x-16 bg-done md:translate-x-20' : 'translate-x-0 bg-white')} />
          </span>
        </button>

        <div className="flex flex-col gap-4">
          <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6">
            <h2 className="mb-3 text-[16px] font-semibold">Thiết bị công tác</h2>
            <div className="grid gap-2">
              <Stat icon={Smartphone} label="Điện thoại công tác" value="Kết nối tốt" tone="done" off={!on} />
              <Stat icon={BatteryMedium} label="Pin" value="78%, dùng được khoảng 6 giờ" tone="high" off={!on} />
              <Stat icon={Signal} label="Mạng" value="4G, 3 vạch" tone="done" off={!on} />
              <Stat icon={RefreshCw} label="Đồng bộ dữ liệu" value="Vừa xong" tone="done" off={!on} />
            </div>
          </section>
          <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6">
            <h2 className="mb-3 text-[16px] font-semibold">Định vị GPS</h2>
            <Stat icon={Crosshair} label={on ? 'Đang chia sẻ vị trí' : 'Đã tạm dừng chia sẻ'} value={on ? 'Chính xác 8m, Lê Duẩn, Hải Châu' : 'IOC không thấy vị trí của bạn'} tone="done" off={!on} />
          </section>
          <a href="tel:1022" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-accent text-[14px] font-semibold text-white shadow-card transition hover:bg-accent/90 active:scale-95">
            <Phone size={18} {...ic} />Gọi hotline IOC
          </a>
        </div>
      </div>
    </TechnicianShell>
  )
}
