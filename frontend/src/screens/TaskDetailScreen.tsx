'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Clock, Navigation, Play, Sparkles, Wrench } from 'lucide-react'
import { Button, EmptyState, ErrorState, IconChip, Skeleton, StatusPill, Toast, cn, ic } from '../components/primitives'
import { EvidenceUploadCard, MapBentoViewport, Timeline } from '../components/data'
import { TechnicianNav } from '../components/nav'
import { fmtClock, getTask, plan, routeTo, useMedia, useTick } from './technicianData'
import { setStatus, useTicketVersion } from '../data/tickets'

export default function TaskDetailScreen({ id }: { id: string }) {
  const desktop = useMedia('(min-width: 768px)')
  useTicketVersion()
  const task = getTask(id)
  useTick()
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t) }, [])
  const back = () => { window.location.href = '/technician/tasks' }

  if (!task)
    return (
      <div className="flex min-h-screen items-center justify-center bg-page p-4">
        <div className="rounded-card bg-card p-8 text-center shadow-card">
          <ErrorState text="Không tìm thấy nhiệm vụ" />
          <Button onClick={back}>Về danh sách</Button>
        </div>
      </div>
    )

  const p = plan[task.kind]
  const arrived = task.startedAt ?? null
  const started = task.status === 'IN_PROGRESS'
  const start = () => {
    setStatus(task.id, 'IN_PROGRESS')
    setToast(true)
    setTimeout(() => setToast(false), 2200)
  }
  const chip = 'flex items-center gap-2 rounded-full bg-white/10 p-1 pr-4 text-[14px] font-semibold text-white'

  const photo = (
    <section className="animate-rise rounded-card bg-card p-2 shadow-card">
      <EvidenceUploadCard state={loading ? 'scanning' : 'done'} height={desktop ? 400 : 240} />
    </section>
  )
  const ai = (
    <section
      className="animate-rise relative overflow-hidden rounded-card p-4 text-white shadow-card transition hover:-translate-y-0.5 md:p-6"
      style={{ animationDelay: '120ms', background: 'radial-gradient(120% 140% at 100% 100%, rgba(229,37,27,0.6) 0%, rgba(229,37,27,0) 60%), #111111' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">AI đề xuất</h2>
        <IconChip icon={Sparkles} size={32} />
      </div>
      {loading ? (
        <div className="space-y-3"><Skeleton dark className="h-10 w-2/3 rounded-full" /><Skeleton dark className="h-10 w-1/2 rounded-full" /></div>
      ) : (
        <div className="animate-rise space-y-4">
          <div className="flex flex-wrap gap-2">
            {p.materials.map((m) => <span key={m} className={chip}><IconChip icon={Wrench} size={32} />{m}</span>)}
          </div>
          <ol className="space-y-2">
            {p.steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-[14px]">
                <span className="flex size-6 items-center justify-center rounded-full bg-white/15 text-[12px] font-semibold">{i + 1}</span>{s}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
  const map = (
    <section className="animate-rise relative h-[280px] overflow-hidden rounded-card shadow-card md:h-auto md:min-h-[420px] md:flex-1" style={{ animationDelay: '60ms' }}>
      <MapBentoViewport
        fill
        detailed
        controls="bottom"
        state={loading ? 'loading' : 'normal'}
        pins={[]}
        route={routeTo(task)}
        userPin={{ x: task.x, y: task.y, level: task.level, radius: 34 }}
      />
      <div className="absolute top-4 left-4 flex items-center gap-3 rounded-full bg-card p-1 pr-4 shadow-card">
        <IconChip icon={Navigation} tone="ink" size={32} />
        <span className="text-[14px] font-semibold">{task.distance} · {task.eta}</span>
      </div>
    </section>
  )
  const status = (
    <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '180ms' }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">Trạng thái</h2>
        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface px-3 text-[12px] font-semibold tabular-nums"><Clock size={12} {...ic} />{fmtClock(task.remaining)}</span>
      </div>
      <Timeline
        current={task.finished ? 2 : started ? 1 : 0}
        steps={[
          { label: 'Đã giao', time: task.assigned },
          { label: 'Đang xử lý', time: arrived ?? '--:--' },
          { label: 'Đã xử lý', time: task.resolvedAt ?? '--:--' },
        ]}
      />
    </section>
  )

  return (
    <div className="min-h-screen bg-page pb-32">
      {toast && <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 animate-rise"><Toast kind="success" text="Đã ghi nhận có mặt" /></div>}
      <div className="mx-auto flex w-full max-w-[1440px] gap-4 p-4">
        <div className="hidden shrink-0 md:block"><TechnicianNav mode="rail" /></div>
        <div className="min-w-0 flex-1">
          <header className="animate-rise mb-4 flex items-center gap-3">
            <Button variant="subtle" icon={ArrowLeft} onClick={back} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[24px] font-bold">{task.title}</h1>
              <p className="mt-1 text-[12px] text-muted">{task.id} · {task.address}</p>
            </div>
            <StatusPill level={task.level} />
          </header>
          {task.finished && !loading && (
            <div className="mb-4 rounded-card bg-card p-4 shadow-card"><EmptyState icon={Check} tone="done" text="Nhiệm vụ đã hoàn tất" /></div>
          )}
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-4">{photo}{ai}</div>
            <div className="flex min-w-0 flex-1 flex-col gap-4">{map}{status}</div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center bg-gradient-to-t from-page via-page/90 to-transparent p-4 pt-8 md:pl-[80px]">
        <div className="w-full max-w-[560px] [&>button]:w-full">
          {started ? (
            <div className="animate-rise flex h-14 items-center justify-between rounded-full bg-ink pr-2 pl-6 text-white shadow-card">
              <span className="flex items-center gap-3 text-[14px] font-semibold">
                <span className="relative flex size-3"><span className="absolute inset-0 animate-pulse-soft rounded-full bg-white" /><span className="relative size-3 rounded-full bg-white" /></span>
                Đang xử lý · Có mặt {arrived}
              </span>
              <Button variant="subtle" icon={Check} onClick={() => { window.location.href = `/technician/tasks/${task.id}/resolve` }}>Nghiệm thu</Button>
            </div>
          ) : (
            <Button size="lg" icon={Play} disabled={loading || task.finished} onClick={start}>
              <span className={cn('text-[16px]')}>Bắt đầu xử lý</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
