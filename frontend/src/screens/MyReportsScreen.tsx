'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Construction, Droplets, FileText, Lightbulb, Plus, Trash2, TreeDeciduous, X } from 'lucide-react'
import { Button, EmptyState, ErrorState, IconChip, PillTab, Skeleton, cn, ic } from '../components/primitives'
import { IncidentListItem, MetricBentoCard } from '../components/data'
import CitizenShell from './CitizenShell'
import { getReports, statusTab, type Report } from './citizenData'
import { getTicket, useTicketVersion } from '../data/tickets'

const kindIcon = { flood: Droplets, road: Construction, tree: TreeDeciduous, trash: Trash2, light: Lightbulb }
const TABS = ['Đang xử lý', 'Đã hoàn tất', 'Bị từ chối']

function ReportCard({ r, delay }: { r: Report; delay: number }) {
  const I = kindIcon[r.kind]
  const imgUrl = getTicket(r.id).imageUrl
  return (
    <div
      role="button"
      onClick={() => { window.location.href = `/citizen/reports/${r.id}` }}
      style={{ animationDelay: `${delay}ms` }}
      className="animate-rise cursor-pointer rounded-card bg-card p-2 shadow-card transition hover:-translate-y-1"
    >
      <div className="flex items-center justify-between px-3 py-2 text-[12px] text-muted">
        <span className="font-semibold text-ink tabular-nums">{r.id}</span>
        <span className="flex items-center gap-1"><Clock size={12} {...ic} />{r.date}</span>
      </div>
      {r.status === 'rejected' ? (
        <div className="flex items-center gap-3 rounded-card bg-surface p-3">
          <IconChip icon={I} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{r.title}</p>
            <p className="mt-1 truncate text-[12px] text-muted">{r.reason}</p>
          </div>
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-ink px-3 text-[12px] font-semibold text-white"><X size={12} {...ic} />Từ chối</span>
        </div>
      ) : (
        <IncidentListItem kind={r.kind} imageUrl={imgUrl} title={r.title} address={r.address.split(', ')[1]} time={r.ago} level={r.status === 'done' ? 'done' : r.level} />
      )}
    </div>
  )
}

export default function MyReportsScreen() {
  useTicketVersion()
  const forced = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state')
  const [tab, setTab] = useState(TABS[0])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(forced === 'error')
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t) }, [])
  const switchTab = (v: string) => { setTab(v); setLoading(true); setTimeout(() => setLoading(false), 350) }

  const list = forced === 'empty' ? [] : getReports().filter((r) => statusTab(r) === tab)
  const count = (t: string) => getReports().filter((r) => statusTab(r) === t).length

  const body = failed ? (
    <div className="rounded-card bg-card p-8 text-center shadow-card"><ErrorState text="Không tải được phiếu" /><Button variant="subtle" onClick={() => setFailed(false)}>Thử lại</Button></div>
  ) : loading ? (
    <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[132px] rounded-card" />)}</div>
  ) : list.length === 0 ? (
    <div className="rounded-card bg-card p-8 shadow-card">
      <EmptyState icon={FileText} text="Chưa có phiếu" />
      <div className="flex justify-center"><Button icon={Plus} onClick={() => { window.location.href = '/report' }}>Báo sự cố</Button></div>
    </div>
  ) : (
    <div className="grid gap-4 md:grid-cols-2">{list.map((r, i) => <ReportCard key={r.id + tab} r={r} delay={i * 70} />)}</div>
  )

  return (
    <CitizenShell title="Phản ánh của tôi" sub="Theo dõi mọi phiếu bạn đã gửi">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[360px_1fr] md:items-start">
        <div className="flex flex-col gap-4 md:sticky md:top-6 md:self-start">
          <MetricBentoCard dark title="Tổng phiếu của tôi" value={getReports().length} icon={FileText} chart="bars" series={[1, 0, 2, 1, 3, 2, 4]} caption="Từ đầu năm" />
          <div className="grid grid-cols-2 gap-4">
            <MetricBentoCard compact title="Đang xử lý" value={count('Đang xử lý')} icon={Clock} tone="high" />
            <MetricBentoCard compact title="Hoàn tất" value={count('Đã hoàn tất')} icon={CheckCircle2} tone="done" />
          </div>
          <div className="hidden md:block"><Button size="lg" icon={Plus} onClick={() => { window.location.href = '/report' }}>Báo sự cố mới</Button></div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto"><PillTab tone="ink" items={TABS} value={tab} onChange={switchTab} /></div>
          {body}
        </div>
      </div>
    </CitizenShell>
  )
}
