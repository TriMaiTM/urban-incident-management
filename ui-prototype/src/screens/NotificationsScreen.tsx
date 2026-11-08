import { useEffect, useState } from 'react'
import { Bell, Siren } from 'lucide-react'
import { Button, EmptyState, ErrorState, IconChip, Skeleton, StatusPill, cn } from '../components/primitives'
import { IncidentListItem } from '../components/data'
import CitizenShell from './CitizenShell'
import { reports } from './citizenData'
import { statusLabel } from '../data/tickets'

type N = { id: string; group: 'Hôm nay' | 'Trước đó'; title: string; message: string; time: string; to: string; reportId: string; emergency?: boolean }
const find = (id: string) => reports.find((r) => r.id === id)!
const seed: N[] = [
  { id: 'n1', group: 'Hôm nay', title: 'Cảnh báo ngập Hải Châu', message: 'Tránh đường Lê Duẩn', time: '5 phút', to: '/citizen/reports/DN-202610-0129', reportId: 'DN-202610-0129', emergency: true },
  { id: 'n2', group: 'Hôm nay', title: find('DN-202610-0121').title, message: statusLabel.ASSIGNED, time: '40 phút', to: '/citizen/reports/DN-202610-0121', reportId: 'DN-202610-0121' },
  { id: 'n3', group: 'Hôm nay', title: find('DN-202610-0129').title, message: statusLabel.SUBMITTED, time: '1 giờ', to: '/citizen/reports/DN-202610-0129', reportId: 'DN-202610-0129' },
  { id: 'n4', group: 'Trước đó', title: find('DN-202610-0052').title, message: 'Mời đánh giá', time: 'Hôm qua', to: '/citizen/feedback/DN-202610-0052', reportId: 'DN-202610-0052' },
  { id: 'n5', group: 'Trước đó', title: find('DN-202610-0036').title, message: statusLabel.REJECTED, time: '2 ngày', to: '/citizen/reports/DN-202610-0036', reportId: 'DN-202610-0036' },
  { id: 'n6', group: 'Trước đó', title: find('DN-202610-0048').title, message: statusLabel.CLOSED, time: '5 ngày', to: '/citizen/reports/DN-202610-0048', reportId: 'DN-202610-0048' },
]

export default function NotificationsScreen() {
  const forced = new URLSearchParams(window.location.search).get('state')
  const [read, setRead] = useState<string[]>(['n5', 'n6'])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(forced === 'error')
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t) }, [])
  const list = forced === 'empty' ? [] : seed
  const open = (n: N) => { setRead((r) => [...r, n.id]); setTimeout(() => { window.location.href = n.to }, 150) }
  const unread = list.filter((n) => !read.includes(n.id)).length

  const row = (n: N, i: number) => {
    const r = find(n.reportId)
    const isUnread = !read.includes(n.id)
    if (n.emergency)
      return (
        <div
          key={n.id}
          role="button"
          onClick={() => open(n)}
          style={{ animationDelay: `${i * 70}ms`, background: 'radial-gradient(90% 160% at 100% 100%, rgba(229,37,27,0.5) 0%, rgba(229,37,27,0) 60%), #111111' }}
          className="animate-rise relative flex cursor-pointer items-center gap-4 rounded-card p-4 text-white shadow-card transition hover:-translate-y-1 md:p-6"
        >
          <IconChip icon={Siren} size={48} tone="urgent" />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold">{n.title}</p>
            <p className="mt-1 text-[12px] text-white/60">IOC Đà Nẵng · {n.message} · {n.time}</p>
          </div>
          <StatusPill level="urgent" />
          {isUnread && <span className="absolute top-3 right-3 size-2 rounded-full bg-white" />}
        </div>
      )
    return (
      <div key={n.id} role="button" onClick={() => open(n)} style={{ animationDelay: `${i * 70}ms` }} className="animate-rise relative cursor-pointer">
        <IncidentListItem kind={r.kind} title={n.title} address={n.message} time={n.time} level={r.status === 'done' ? 'done' : r.level} />
        {isUnread && <span className="absolute top-2 left-2 size-2.5 rounded-full bg-ink ring-2 ring-card" />}
      </div>
    )
  }

  const group = (g: N['group']) => {
    const items = list.filter((n) => n.group === g)
    if (!items.length) return null
    return (
      <section key={g} className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6">
        <h2 className="mb-4 text-[16px] font-semibold">{g}</h2>
        <div className="flex flex-col gap-3">{items.map((n, i) => row(n, i))}</div>
      </section>
    )
  }

  return (
    <CitizenShell
      title="Thông báo"
      sub={unread ? `${unread} tin chưa đọc` : 'Đã đọc hết'}
      right={<Button variant="subtle" disabled={!unread} onClick={() => setRead(seed.map((n) => n.id))}>Đọc tất cả</Button>}
    >
      <div className="mx-auto flex max-w-[860px] flex-col gap-4">
        {failed ? (
          <div className="rounded-card bg-card p-8 text-center shadow-card"><ErrorState text="Không tải được thông báo" /><Button variant="subtle" onClick={() => setFailed(false)}>Thử lại</Button></div>
        ) : loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-[100px] rounded-card" />)
        ) : list.length === 0 ? (
          <div className="rounded-card bg-card p-8 shadow-card"><EmptyState icon={Bell} text="Chưa có thông báo" /></div>
        ) : (
          <>{group('Hôm nay')}{group('Trước đó')}</>
        )}
      </div>
    </CitizenShell>
  )
}
