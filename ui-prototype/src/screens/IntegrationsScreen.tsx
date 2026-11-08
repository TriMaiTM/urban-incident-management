import { useRef, useState } from 'react'
import { Activity, Map as MapIcon, MessageCircle, ScanEye, Zap, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import { Button, IconChip, cn, ic } from '../components/primitives'
import AdminShell from './AdminShell'

type St = 'ok' | 'slow' | 'down'
type Svc = { id: string; name: string; desc: string; icon: ComponentType<LucideProps>; status: St; reqs: string; ms: number; series: number[]; checked: string }
const seed: Svc[] = [
  { id: 'ds', name: 'DeepSeek Vision', desc: 'Nhận diện loại và mức độ sự cố từ ảnh', icon: ScanEye, status: 'ok', reqs: '12.480', ms: 640, series: [5, 7, 6, 9, 8, 10, 12, 9, 11, 13], checked: '2 phút trước' },
  { id: 'gm', name: 'Goong Maps', desc: 'Bản đồ, tìm địa chỉ và dẫn đường', icon: MapIcon, status: 'ok', reqs: '38.215', ms: 120, series: [9, 11, 10, 12, 14, 13, 15, 14, 16, 15], checked: '2 phút trước' },
  { id: 'ms', name: 'Messenger Webhook', desc: 'Gửi thông báo tiến độ cho công dân', icon: MessageCircle, status: 'slow', reqs: '4.902', ms: 1840, series: [6, 5, 7, 4, 6, 8, 5, 3, 4, 3], checked: '14 phút trước' },
]
const meta: Record<St, { label: string; dot: string; chip: string }> = {
  ok: { label: 'Hoạt động', dot: 'bg-done', chip: 'bg-done/10 text-done' },
  slow: { label: 'Phản hồi chậm', dot: 'bg-high', chip: 'bg-high/15 text-high' },
  down: { label: 'Mất kết nối', dot: 'bg-urgent', chip: 'bg-urgent/10 text-urgent' },
}

function Card({ s, onCheck, busy }: { s: Svc; onCheck: () => void; busy: boolean }) {
  const m = meta[s.status]
  const max = Math.max(...s.series)
  return (
    <article className="animate-rise flex flex-col gap-5 rounded-card bg-card p-6 shadow-card transition hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3"><IconChip icon={s.icon} tone="ink" size={48} /><div><h2 className="text-[16px] font-semibold">{s.name}</h2><p className="text-[12px] text-muted">{s.desc}</p></div></div>
        <span className={cn('inline-flex h-6 shrink-0 items-center gap-2 rounded-full px-3 text-[12px] font-semibold', m.chip)}>
          <span className="relative flex size-2">
            {busy && <><span className="absolute inset-0 animate-ping rounded-full bg-ink" /><span className="absolute inset-0 animate-ping rounded-full bg-ink [animation-delay:.4s]" /></>}
            {!busy && s.status === 'ok' && <span className="absolute inset-0 animate-pulse-soft rounded-full bg-done" />}
            <span className={cn('relative size-2 rounded-full', busy ? 'bg-ink' : m.dot)} />
          </span>
          {busy ? 'Đang kiểm tra' : m.label}
        </span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-[12px] text-muted">Lưu lượng 24 giờ</p><p className="text-[32px] leading-none font-bold tabular-nums">{s.reqs}</p><p className="mt-1 text-[12px] text-muted">yêu cầu</p></div>
        <div className="flex h-12 items-end gap-1">{s.series.map((v, i) => <span key={i} className={cn('w-2 rounded-full', i === s.series.length - 1 ? 'bg-accent' : 'bg-low')} style={{ height: `${(v / max) * 100}%` }} />)}</div>
      </div>
      <div className="flex items-center justify-between rounded-tile bg-surface p-3 text-[12px]">
        <span className="flex items-center gap-2 text-muted"><Activity size={14} {...ic} />Độ trễ</span>
        <span className={cn('text-[14px] font-semibold tabular-nums', s.ms > 1000 && 'text-high')}>{s.ms} ms</span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="text-[12px] text-muted">Kiểm tra {s.checked}</span>
        <Button variant="secondary" icon={Zap} loading={busy} onClick={onCheck}>Kiểm tra kết nối</Button>
      </div>
    </article>
  )
}

export default function IntegrationsScreen() {
  const [list, setList] = useState(seed)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<null | { kind: 'success' | 'error' | 'info'; text: string }>(null)
  const timer = useRef<number | undefined>(undefined)
  const say = (kind: 'success' | 'error' | 'info', text: string) => { setToast({ kind, text }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(null), 2600) }

  const check = async (s: Svc) => {
    setBusy(s.id)
    await new Promise((r) => setTimeout(r, 1600))
    const fail = new URLSearchParams(window.location.search).get('state') === 'error'
    const ms = fail ? 0 : Math.round(s.id === 'gm' ? 90 + Math.random() * 60 : s.id === 'ds' ? 500 + Math.random() * 300 : 180 + Math.random() * 120)
    setList((l) => l.map((x) => (x.id === s.id ? { ...x, status: fail ? 'down' : 'ok', ms: fail ? x.ms : ms, checked: 'Vừa xong' } : x)))
    setBusy(null)
    if (fail) say('error', `${s.name}: không kết nối được`)
    else say('success', `${s.name}: kết nối tốt, ${ms} ms`)
  }
  const bad = list.filter((s) => s.status !== 'ok').length

  return (
    <AdminShell title="Tích hợp" subtitle={bad ? `${bad} dịch vụ cần chú ý` : 'Tất cả dịch vụ đang hoạt động'} toast={toast}>
      <div className="grid grid-cols-3 gap-4">{list.map((s) => <Card key={s.id} s={s} busy={busy === s.id} onCheck={() => check(s)} />)}</div>
    </AdminShell>
  )
}
