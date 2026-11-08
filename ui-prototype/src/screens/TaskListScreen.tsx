import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Construction, Droplets, Lightbulb, Navigation, Trash2, TreeDeciduous, Users, Wrench } from 'lucide-react'
import { Avatar, Button, EmptyState, ErrorState, IconChip, PillTab, Skeleton, StatusPill, cn, ic } from '../components/primitives'
import { MapBentoViewport, MetricBentoCard } from '../components/data'
import { TechnicianNav } from '../components/nav'
import { fmtClock, getTasks, useTick, type Task } from './technicianData'
import { useTicketVersion } from '../data/tickets'

const kindIcon = { flood: Droplets, road: Construction, tree: TreeDeciduous, trash: Trash2, light: Lightbulb }

function TaskCard({ task, remaining, featured, onHover, delay }: { task: Task; remaining: number; featured: boolean; onHover: (id: string | null) => void; delay: number }) {
  const I = kindIcon[task.kind]
  const done = task.finished
  const pill = cn('inline-flex h-6 items-center gap-1 rounded-full px-3 text-[12px] font-semibold tabular-nums', featured ? 'bg-white/15 text-white' : 'bg-surface text-ink')
  return (
    <div
      role="button"
      onClick={() => { window.location.href = `/technician/tasks/${task.id}` }}
      onMouseEnter={() => onHover(task.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        animationDelay: `${delay}ms`,
        background: featured ? 'radial-gradient(90% 160% at 100% 100%, rgba(229,37,27,0.45) 0%, rgba(229,37,27,0) 60%), #111111' : undefined,
      }}
      className={cn('animate-rise cursor-pointer rounded-card p-4 shadow-card transition hover:-translate-y-1 md:p-6', featured ? 'text-white' : 'bg-card')}
    >
      <div className="flex items-center gap-3">
        <IconChip icon={I} tone={featured ? 'neutral' : 'ink'} size={48} />
        <div className="min-w-0 flex-1">
          <p className={cn('truncate font-semibold', featured ? 'text-[16px]' : 'text-[14px]')}>{task.title}</p>
          <p className={cn('mt-1 truncate text-[12px]', featured ? 'text-white/60' : 'text-muted')}>{task.address}</p>
        </div>
        <StatusPill level={task.level} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {done ? (
          <span className={pill}><Clock size={12} {...ic} />{task.done}</span>
        ) : (
          <span className={cn(pill, remaining < 1800 && 'animate-pulse')}><Clock size={12} {...ic} />{fmtClock(remaining)}</span>
        )}
        <span className={pill}><Navigation size={12} {...ic} />{task.distance}</span>
        <span className={cn('inline-flex h-6 items-center gap-1 rounded-full px-3 text-[12px] font-semibold', task.status === 'IN_PROGRESS' ? (featured ? 'bg-accent text-white' : 'bg-ink text-white') : featured ? 'bg-white text-ink' : 'bg-surface text-ink')}>{task.statusText}</span>
        <span className="ml-auto">
          <Button size="sm" variant={featured ? 'subtle' : done ? 'subtle' : 'primary'} icon={Navigation}>{done ? 'Xem lại' : 'Dẫn đường'}</Button>
        </span>
      </div>
    </div>
  )
}

export default function TaskListScreen() {
  const forced = new URLSearchParams(window.location.search).get('state')
  const [tab, setTab] = useState('Đang thực hiện')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(forced === 'error')
  const [hover, setHover] = useState<string | null>(null)
  useTick()
  useTicketVersion()
  const tasks = getTasks()
  useEffect(() => { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t) }, [])

  const active = forced === 'empty' ? [] : tasks.filter((t) => !t.finished)
  const history = tasks.filter((t) => t.finished)
  const list = tab === 'Lịch sử' ? history : active
  const hoverIdx = active.findIndex((t) => t.id === hover)

  const body = (() => {
    if (loading) return [0, 1, 2].map((i) => <Skeleton key={i} className="h-[132px] rounded-card" />)
    if (failed)
      return (
        <div className="rounded-card bg-card p-6 text-center shadow-card">
          <ErrorState text="Không tải được nhiệm vụ" />
          <Button variant="subtle" onClick={() => setFailed(false)}>Thử lại</Button>
        </div>
      )
    if (list.length === 0)
      return (
        <div className="rounded-card bg-card p-6 shadow-card"><EmptyState icon={CheckCircle2} tone="done" text="Đã làm xong hết" /></div>
      )
    return list.map((t, i) => (
      <TaskCard key={t.id + tab} task={t} remaining={t.remaining} featured={tab !== 'Lịch sử' && i === 0 && t.level === 'urgent'} onHover={setHover} delay={i * 70} />
    ))
  })()

  const side = (
    <div className="flex flex-col gap-4 md:order-2 md:w-[440px] md:shrink-0">
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <MetricBentoCard compact dark title="Được giao" value={active.length} icon={Wrench} />
        <MetricBentoCard compact title="Xong hôm nay" value={4} icon={CheckCircle2} tone="done" chart="bars" series={[1, 2, 1, 3, 2, 4]} />
        <MetricBentoCard compact title="Đúng hạn" value={96} suffix="%" icon={Users} chart="spark" series={[5, 6, 5, 8, 7, 9]} />
      </div>
      <section className="relative h-[200px] overflow-hidden rounded-card shadow-card md:h-auto md:min-h-[420px] md:flex-1">
        <MapBentoViewport
          fill
          detailed
          controls="bottom"
          state={loading ? 'loading' : 'normal'}
          pins={active}
          selectedPin={hoverIdx >= 0 ? hoverIdx : undefined}
          onPinClick={(i) => { window.location.href = `/technician/tasks/${active[i].id}` }}
          userPin={{ x: 24, y: 50, level: 'low' }}
        />
      </section>
    </div>
  )

  return (
    <div className="min-h-screen bg-page pb-28 md:pb-4">
      <div className="mx-auto flex w-full max-w-[1440px] gap-4 p-4">
        <div className="hidden shrink-0 md:block"><TechnicianNav mode="rail" /></div>
        <div className="min-w-0 flex-1">
          <header className="animate-rise mb-4 flex items-end justify-between">
            <div>
              <h1 className="text-[24px] font-bold">Nhiệm vụ</h1>
              <p className="mt-1 text-[12px] text-muted">Ca sáng, Đội cầu đường Hải Châu</p>
            </div>
            <a href="/profile" aria-label="Hồ sơ"><Avatar name="Lê Văn Hùng" size={48} online /></a>
          </header>
          <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
            {side}
            <div className="flex min-w-0 flex-1 flex-col gap-4 md:order-1">
              <div><PillTab tone="ink" items={['Đang thực hiện', 'Lịch sử']} value={tab} onChange={setTab} /></div>
              {body}
            </div>
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-4 md:hidden"><TechnicianNav mode="tabbar" /></div>
    </div>
  )
}
