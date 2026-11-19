'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, Siren } from 'lucide-react'
import { Button, EmptyState, ErrorState, IconChip, Skeleton, StatusPill, type Level } from '../components/primitives'
import { IncidentListItem } from '../components/data'
import CitizenShell from './CitizenShell'
import { agoText, getTickets, levelOf, statusLabel, useTicketVersion, type Kind } from '../data/tickets'

type N = {
  id: string
  group: 'Hôm nay' | 'Trước đó'
  title: string
  message: string
  time: string
  to: string
  kind: Kind
  level: Level
  imageUrl?: string
  emergency?: boolean
}

export default function NotificationsScreen() {
  const ticketVer = useTicketVersion()
  const forced = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state')
  const [read, setRead] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(forced === 'error')

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450)
    return () => clearTimeout(t)
  }, [])

  const list = useMemo<N[]>(() => {
    if (forced === 'empty') return []
    const now = Date.now()
    return getTickets().map((t) => {
      const isToday = now - t.submittedAt < 86_400_000
      const canFeedback = t.status === 'CONFIRMED' || t.status === 'CLOSED'
      return {
        id: `notif-${t.id}`,
        group: isToday ? 'Hôm nay' : 'Trước đó',
        title: t.title,
        message: canFeedback ? `${statusLabel[t.status]} · Mời đánh giá kết quả` : `${statusLabel[t.status]} · ${t.unit}`,
        time: `${agoText(t.submittedAt)} trước`,
        to: canFeedback ? `/citizen/feedback/${t.id}` : `/citizen/reports/${t.id}`,
        kind: t.kind,
        level: levelOf(t),
        imageUrl: t.imageUrl,
        emergency: t.priority === 'urgent',
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketVer, forced])

  const open = (n: N) => {
    setRead((r) => [...r, n.id])
    setTimeout(() => {
      window.location.href = n.to
    }, 120)
  }
  const unread = list.filter((n) => !read.includes(n.id)).length

  const row = (n: N, i: number) => {
    const isUnread = !read.includes(n.id)
    if (n.emergency) {
      return (
        <div
          key={n.id}
          role="button"
          onClick={() => open(n)}
          style={{
            animationDelay: `${i * 70}ms`,
            background:
              'radial-gradient(90% 160% at 100% 100%, rgba(229,37,27,0.5) 0%, rgba(229,37,27,0) 60%), #111111',
          }}
          className="animate-rise relative flex cursor-pointer items-center gap-4 rounded-card p-4 text-white shadow-card transition hover:-translate-y-1 md:p-6"
        >
          <IconChip icon={Siren} size={48} tone="urgent" />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold">{n.title}</p>
            <p className="mt-1 text-[12px] text-white/60">
              IOC Đà Nẵng · {n.message} · {n.time}
            </p>
          </div>
          <StatusPill level="urgent" />
          {isUnread && <span className="absolute top-3 right-3 size-2 rounded-full bg-white" />}
        </div>
      )
    }
    return (
      <div
        key={n.id}
        role="button"
        onClick={() => open(n)}
        style={{ animationDelay: `${i * 70}ms` }}
        className="animate-rise relative cursor-pointer"
      >
        <IncidentListItem
          kind={n.kind}
          imageUrl={n.imageUrl}
          title={n.title}
          address={n.message}
          time={n.time}
          level={n.level}
        />
        {isUnread && (
          <span className="absolute top-2 left-2 size-2.5 rounded-full bg-ink ring-2 ring-card" />
        )}
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
      sub={unread ? `${unread} tin cập nhật từ phiếu phản ánh của bạn` : 'Đã đọc hết'}
      right={
        <Button
          variant="subtle"
          disabled={!unread}
          onClick={() => setRead(list.map((n) => n.id))}
        >
          Đọc tất cả
        </Button>
      }
    >
      <div className="mx-auto flex max-w-[860px] flex-col gap-4">
        {failed ? (
          <div className="rounded-card bg-card p-8 text-center shadow-card">
            <ErrorState text="Không tải được thông báo" />
            <Button variant="subtle" onClick={() => setFailed(false)}>
              Thử lại
            </Button>
          </div>
        ) : loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-[100px] rounded-card" />)
        ) : list.length === 0 ? (
          <div className="rounded-card bg-card p-8 shadow-card">
            <EmptyState icon={Bell} text="Chưa có thông báo" />
          </div>
        ) : (
          <>
            {group('Hôm nay')}
            {group('Trước đó')}
          </>
        )}
      </div>
    </CitizenShell>
  )
}
