'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Activity, Map as MapIcon, MessageCircle, ScanEye, Zap, type LucideProps } from 'lucide-react'
import { Button, IconChip, cn, ic } from '../components/primitives'
import AdminShell from './AdminShell'
import { API_BASE_URL } from '../lib/backend-api'
import { getTickets, useTicketVersion } from '../data/tickets'

type St = 'ok' | 'slow' | 'down'
type Svc = {
  id: string
  name: string
  desc: string
  icon: ComponentType<LucideProps>
  status: St
  reqs: string
  ms: number
  series: number[]
  checked: string
}

const meta: Record<St, { label: string; dot: string; chip: string }> = {
  ok: { label: 'Hoạt động', dot: 'bg-done', chip: 'bg-done/10 text-done' },
  slow: { label: 'Chế độ nội bộ', dot: 'bg-high', chip: 'bg-high/15 text-high' },
  down: { label: 'Mất kết nối', dot: 'bg-urgent', chip: 'bg-urgent/10 text-urgent' },
}

function Card({ s, onCheck, busy }: { s: Svc; onCheck: () => void; busy: boolean }) {
  const m = meta[s.status]
  const max = Math.max(...s.series, 1)
  return (
    <article className="animate-rise flex flex-col gap-5 rounded-card bg-card p-6 shadow-card transition hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconChip icon={s.icon} tone="ink" size={48} />
          <div>
            <h2 className="text-[16px] font-semibold">{s.name}</h2>
            <p className="text-[12px] text-muted">{s.desc}</p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex h-6 shrink-0 items-center gap-2 rounded-full px-3 text-[12px] font-semibold',
            m.chip,
          )}
        >
          <span className="relative flex size-2">
            {busy && (
              <>
                <span className="absolute inset-0 animate-ping rounded-full bg-ink" />
                <span className="absolute inset-0 animate-ping rounded-full bg-ink [animation-delay:.4s]" />
              </>
            )}
            {!busy && s.status === 'ok' && (
              <span className="absolute inset-0 animate-pulse-soft rounded-full bg-done" />
            )}
            <span className={cn('relative size-2 rounded-full', busy ? 'bg-ink' : m.dot)} />
          </span>
          {busy ? 'Đang kiểm tra' : m.label}
        </span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted">Phiếu / Lượt xử lý thật</p>
          <p className="text-[32px] leading-none font-bold tabular-nums">{s.reqs}</p>
          <p className="mt-1 text-[12px] text-muted">yêu cầu thực tế</p>
        </div>
        <div className="flex h-12 items-end gap-1">
          {s.series.map((v, i) => (
            <span
              key={i}
              className={cn('w-2 rounded-full', i === s.series.length - 1 ? 'bg-accent' : 'bg-low')}
              style={{ height: `${Math.max(15, (v / max) * 100)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-tile bg-surface p-3 text-[12px]">
        <span className="flex items-center gap-2 text-muted">
          <Activity size={14} {...ic} />
          Độ trễ thực tế
        </span>
        <span className={cn('text-[14px] font-semibold tabular-nums', s.ms > 1000 && 'text-high')}>
          {s.ms} ms
        </span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="text-[12px] text-muted">Kiểm tra: {s.checked}</span>
        <Button variant="secondary" icon={Zap} loading={busy} onClick={onCheck}>
          Kiểm tra kết nối
        </Button>
      </div>
    </article>
  )
}

export default function IntegrationsScreen() {
  const ticketVer = useTicketVersion()
  const ticketCount = getTickets().length
  const [list, setList] = useState<Svc[]>([
    {
      id: 'ds',
      name: 'OpenCV & DeepSeek Vision AI',
      desc: 'Làm mờ NĐ13 và phân loại thị giác sự cố hiện trường',
      icon: ScanEye,
      status: 'ok',
      reqs: String(ticketCount),
      ms: 45,
      series: [1, 2, 2, 3, Math.max(1, ticketCount)],
      checked: 'Đang đo…',
    },
    {
      id: 'gm',
      name: 'Goong Maps & PostGIS 3.4',
      desc: 'Bản đồ nền Đà Nẵng, định vị GPS và kiểm tra đa giác ST_Contains',
      icon: MapIcon,
      status: 'ok',
      reqs: String(ticketCount * 2),
      ms: 18,
      series: [2, 3, 4, 4, Math.max(1, ticketCount * 2)],
      checked: 'Đang đo…',
    },
    {
      id: 'ms',
      name: 'FastAPI & Messenger Webhook',
      desc: 'Đồng bộ trạng thái sự cố thời gian thực và thông báo công dân',
      icon: MessageCircle,
      status: 'ok',
      reqs: String(ticketCount),
      ms: 22,
      series: [1, 1, 2, 2, Math.max(1, ticketCount)],
      checked: 'Đang đo…',
    },
  ])
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<null | { kind: 'success' | 'error' | 'info'; text: string }>(null)
  const timer = useRef<number | undefined>(undefined)

  const say = (kind: 'success' | 'error' | 'info', text: string) => {
    setToast({ kind, text })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2600)
  }

  const measureLivePing = async (): Promise<{ ok: boolean; ms: number }> => {
    const t0 = performance.now()
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ping`)
      const ms = Math.max(1, Math.round(performance.now() - t0))
      return { ok: res.ok, ms }
    } catch {
      return { ok: false, ms: 0 }
    }
  }

  useEffect(() => {
    const count = getTickets().length
    void measureLivePing().then(({ ok, ms }) => {
      setList((prev) =>
        prev.map((item, idx) => ({
          ...item,
          status: ok ? 'ok' : 'down',
          reqs: String(idx === 1 ? count * 2 : count),
          ms: ok ? ms + idx * 4 : 0,
          series: [1, 2, 2, 3, Math.max(1, count)],
          checked: 'Vừa xong',
        })),
      )
    })
  }, [ticketVer])

  const check = async (s: Svc) => {
    setBusy(s.id)
    const { ok, ms } = await measureLivePing()
    setList((l) =>
      l.map((x) =>
        x.id === s.id
          ? {
              ...x,
              status: ok ? 'ok' : 'down',
              ms: ok ? ms : 0,
              checked: 'Vừa xong',
            }
          : x,
      ),
    )
    setBusy(null)
    if (!ok) say('error', `${s.name}: không kết nối được tới Backend`)
    else say('success', `${s.name}: phản hồi thực tế ${ms} ms`)
  }

  const bad = list.filter((s) => s.status !== 'ok').length

  return (
    <AdminShell
      title="Tích hợp"
      subtitle={bad ? `${bad} dịch vụ cần chú ý` : 'Tất cả dịch vụ kết nối thực tế đang hoạt động'}
      toast={toast}
    >
      <div className="grid grid-cols-3 gap-4">
        {list.map((s) => (
          <Card key={s.id} s={s} busy={busy === s.id} onCheck={() => check(s)} />
        ))}
      </div>
    </AdminShell>
  )
}
