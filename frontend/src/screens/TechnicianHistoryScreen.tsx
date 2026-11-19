'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, Image as ImageIcon, MapPin, Package, Percent, Wrench } from 'lucide-react'
import { EmptyState, PillTab, StatusPill, cn, ic } from '../components/primitives'
import { MetricBentoCard } from '../components/data'
import { agoText, clock, getTickets, useTicketVersion } from '../data/tickets'
import { plan } from './technicianData'
import TechnicianShell from './TechnicianShell'

type Job = {
  code: string
  title: string
  address: string
  time: string
  doneAt: number
  mats: string
  matCount: number
  ok: boolean
  beforeUrl?: string
  afterUrl?: string
}

function Thumb({ label, url, after }: { label: string; url?: string; after?: boolean }) {
  return (
    <div className="relative h-16 w-[72px] shrink-0 overflow-hidden rounded-tile bg-surface md:h-[72px] md:w-24">
      {url ? (
        <img src={url} alt={label} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted">
          <ImageIcon size={18} {...ic} />
        </div>
      )}
      <span
        className={cn(
          'absolute bottom-1 left-1 rounded-full px-1.5 text-[10px] leading-4 font-semibold',
          after ? 'bg-done text-white' : 'bg-ink text-white',
        )}
      >
        {label}
      </span>
    </div>
  )
}

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export default function TechnicianHistoryScreen() {
  const version = useTicketVersion()
  const jobs: Job[] = useMemo(
    () =>
      getTickets()
        .filter((t) => ['RESOLVED', 'CONFIRMED', 'CLOSED', 'REOPENED'].includes(t.status))
        .map((t) => {
          const doneAt = t.at.RESOLVED ?? t.submittedAt
          const matsList = plan[t.kind].materials
          return {
            code: t.id,
            title: t.title,
            address: t.address,
            time: `${agoText(doneAt)} trước · ${clock(doneAt)}`,
            doneAt,
            mats: matsList.join(', '),
            matCount: matsList.length,
            ok: t.status !== 'REOPENED',
            beforeUrl: t.imageUrl,
            afterUrl: t.afterImageUrl ?? t.imageUrl,
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  )
  const [filter, setFilter] = useState('Tất cả')

  const data = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const j of jobs) {
      const jsDay = new Date(j.doneAt).getDay() // 0 = Sun, 1 = Mon .. 6 = Sat
      const idx = jsDay === 0 ? 6 : jsDay - 1
      counts[idx] += 1
    }
    return DAY_LABELS.map((d, i) => ({ d, n: counts[i] }))
  }, [jobs])

  const max = Math.max(...data.map((x) => x.n), 1)
  const total = jobs.length
  const okRate = total > 0 ? Math.round((jobs.filter((j) => j.ok).length / total) * 100) : 100
  const totalMaterials = jobs.reduce((acc, j) => acc + j.matCount, 0)
  const list = jobs.filter((j) => filter === 'Tất cả' || (filter === 'Đạt' ? j.ok : !j.ok))
  const peakIdx = data.findIndex((x) => x.n === Math.max(...data.map((y) => y.n)) && x.n > 0)

  return (
    <TechnicianShell title="Nhật ký công tác" subtitle="Thống kê thực tế từ các nhiệm vụ hiện trường đã hoàn thành">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <MetricBentoCard compact dark title="Đã sửa" value={total} icon={Wrench} caption="Nhiệm vụ thực tế" />
          <MetricBentoCard compact title="Tỷ lệ đạt" value={okRate} suffix="%" icon={Percent} tone="done" caption="Nghiệm thu IOC" />
          <MetricBentoCard compact title="Vật tư dùng" value={totalMaterials} icon={Package} caption="Hạng mục thiết bị" />
        </div>

        <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-semibold">Số vụ theo ngày trong tuần</h2>
              <p className="text-[12px] text-muted tabular-nums">{total} vụ đã xử lý thực tế</p>
            </div>
          </div>
          <div className="mt-4 flex h-28 items-end gap-2 md:h-32 md:gap-4">
            {data.map((x, i) => (
              <div key={x.d} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[12px] font-semibold tabular-nums">{x.n}</span>
                <div
                  className={cn(
                    'w-full max-w-10 rounded-full transition-all duration-500',
                    i === peakIdx ? 'bg-accent' : x.n > 0 ? 'bg-ink' : 'bg-low/40',
                  )}
                  style={{ height: `${x.n > 0 ? Math.max(15, (x.n / max) * 70) : 8}%` }}
                />
                <span className="text-[12px] text-muted">{x.d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold">Vụ việc đã xong ({list.length})</h2>
            <PillTab tone="ink" items={['Tất cả', 'Đạt', 'Làm lại']} value={filter} onChange={setFilter} />
          </div>
          {list.length === 0 && <EmptyState icon={CheckCircle2} tone="done" text="Chưa có vụ nào" />}
          <ul className="divide-y divide-surface">
            {list.map((j) => (
              <li key={j.code} className="flex items-center gap-3 py-3 md:gap-4">
                <div className="flex gap-1.5">
                  <Thumb label="Trước" url={j.beforeUrl} />
                  <Thumb label="Sau" url={j.afterUrl} after />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-muted tabular-nums">{j.code}</p>
                  <h3 className="truncate text-[14px] font-semibold">{j.title}</h3>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-muted">
                    <MapPin size={12} {...ic} className="shrink-0" />
                    {j.address}
                  </p>
                  <p className="mt-0.5 hidden items-center gap-1 text-[12px] text-muted md:flex">
                    <Package size={12} {...ic} />
                    {j.mats}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {j.ok ? (
                    <StatusPill level="done" />
                  ) : (
                    <span className="inline-flex h-6 items-center rounded-full bg-high px-3 text-[12px] font-semibold text-white">
                      Làm lại
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[12px] text-muted">
                    <Clock size={12} {...ic} />
                    {j.time}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </TechnicianShell>
  )
}
