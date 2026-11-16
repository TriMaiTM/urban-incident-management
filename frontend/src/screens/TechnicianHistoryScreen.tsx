'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, MapPin, Package, Percent, Wrench } from 'lucide-react'
import { EmptyState, PillTab, StatusPill, cn, ic } from '../components/primitives'
import { MetricBentoCard } from '../components/data'
import SamplePhoto from '../components/SamplePhoto'
import { agoText, clock, getTickets, useTicketVersion } from '../data/tickets'
import { plan } from './technicianData'
import TechnicianShell from './TechnicianShell'

const weeks: Record<string, { d: string; n: number }[]> = {
  'Tuần này': [{ d: 'T2', n: 6 }, { d: 'T3', n: 9 }, { d: 'T4', n: 7 }, { d: 'T5', n: 11 }, { d: 'T6', n: 8 }, { d: 'T7', n: 4 }, { d: 'CN', n: 2 }],
  'Tuần trước': [{ d: 'T2', n: 8 }, { d: 'T3', n: 5 }, { d: 'T4', n: 10 }, { d: 'T5', n: 6 }, { d: 'T6', n: 9 }, { d: 'T7', n: 7 }, { d: 'CN', n: 3 }],
}
type Job = { code: string; title: string; address: string; time: string; mats: string; ok: boolean }

function Thumb({ label, after }: { label: string; after?: boolean }) {
  return (
    <div className="relative h-16 w-[72px] shrink-0 overflow-hidden rounded-tile bg-surface md:h-[72px] md:w-24">
      <SamplePhoto className={cn('size-full', after ? '' : 'opacity-70 saturate-0')} />
      <span className={cn('absolute bottom-1 left-1 rounded-full px-1.5 text-[10px] leading-4 font-semibold', after ? 'bg-done text-white' : 'bg-ink text-white')}>{label}</span>
    </div>
  )
}

export default function TechnicianHistoryScreen() {
  const version = useTicketVersion()
  const jobs: Job[] = useMemo(() => getTickets().filter((t) => ['RESOLVED', 'CONFIRMED', 'CLOSED', 'REOPENED'].includes(t.status)).map((t) => {
    const doneAt = t.at.RESOLVED ?? t.submittedAt
    return { code: t.id, title: t.title, address: t.address, time: `${agoText(doneAt)} trước · ${clock(doneAt)}`, mats: plan[t.kind].materials.join(', '), ok: t.status !== 'REOPENED' }
  }), [version])
  const [week, setWeek] = useState('Tuần này')
  const [filter, setFilter] = useState('Tất cả')
  const data = weeks[week]
  const max = Math.max(...data.map((x) => x.n))
  const total = data.reduce((a, b) => a + b.n, 0)
  const list = jobs.filter((j) => filter === 'Tất cả' || (filter === 'Đạt' ? j.ok : !j.ok))
  const today = data.findIndex((x) => x.n === Math.max(...data.map((y) => y.n)))

  return (
    <TechnicianShell title="Nhật ký công tác" subtitle="Tháng 10/2026, Đội cầu đường Hải Châu">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <MetricBentoCard compact dark title="Đã sửa" value={42} icon={Wrench} caption="Trong tháng" />
          <MetricBentoCard compact title="Tỷ lệ đạt" value={96} suffix="%" icon={Percent} tone="done" caption="Nghiệm thu lần 1" />
          <MetricBentoCard compact title="Vật tư dùng" value={128} icon={Package} caption="Kiện, bao, bộ" />
        </div>

        <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-semibold">Số vụ theo ngày</h2>
              <p className="text-[12px] text-muted tabular-nums">{total} vụ đã xử lý</p>
            </div>
            <PillTab items={Object.keys(weeks)} value={week} onChange={setWeek} />
          </div>
          <div className="mt-4 flex h-28 items-end gap-2 md:h-32 md:gap-4">
            {data.map((x, i) => (
              <div key={x.d} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[12px] font-semibold tabular-nums opacity-0 transition group-hover:opacity-100">{x.n}</span>
                <div className={cn('w-full max-w-10 rounded-full transition-all duration-500', i === today ? 'bg-accent' : 'bg-low group-hover:bg-ink')} style={{ height: `${(x.n / max) * 70}%` }} />
                <span className="text-[12px] text-muted">{x.d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold">Vụ việc đã xong</h2>
            <PillTab tone="ink" items={['Tất cả', 'Đạt', 'Làm lại']} value={filter} onChange={setFilter} />
          </div>
          {list.length === 0 && <EmptyState icon={CheckCircle2} tone="done" text="Chưa có vụ nào" />}
          <ul className="divide-y divide-surface">
            {list.map((j) => (
              <li key={j.code} className="flex items-center gap-3 py-3 md:gap-4">
                <div className="flex gap-1.5"><Thumb label="Trước" /><Thumb label="Sau" after /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-muted tabular-nums">{j.code}</p>
                  <h3 className="truncate text-[14px] font-semibold">{j.title}</h3>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-muted"><MapPin size={12} {...ic} className="shrink-0" />{j.address}</p>
                  <p className="mt-0.5 hidden items-center gap-1 text-[12px] text-muted md:flex"><Package size={12} {...ic} />{j.mats}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {j.ok ? <StatusPill level="done" /> : <span className="inline-flex h-6 items-center rounded-full bg-high px-3 text-[12px] font-semibold text-white">Làm lại</span>}
                  <span className="flex items-center gap-1 text-[12px] text-muted"><Clock size={12} {...ic} />{j.time}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </TechnicianShell>
  )
}
