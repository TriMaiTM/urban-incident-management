import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Clock, MapPin, Smile, Target } from 'lucide-react'
import { Avatar, Button, EmptyState, ErrorState, IconChip, PillTab, Skeleton, cn, ic } from '../components/primitives'
import { MapBentoViewport, MetricBentoCard } from '../components/data'
import { AdminRail } from '../components/nav'

type D = { name: string; x: number; y: number; count: [number, number]; done: [number, number] }
// Tâm quận theo tọa độ % trên bản đồ minh họa; count/done theo [7 ngày, 30 ngày].
const districts: D[] = [
  { name: 'Hải Châu', x: 48, y: 68, count: [64, 262], done: [92, 94] },
  { name: 'Thanh Khê', x: 48, y: 22, count: [52, 215], done: [88, 90] },
  { name: 'Sơn Trà', x: 70, y: 20, count: [41, 172], done: [95, 96] },
  { name: 'Ngũ Hành Sơn', x: 70, y: 72, count: [28, 118], done: [90, 93] },
  { name: 'Liên Chiểu', x: 22, y: 22, count: [37, 160], done: [78, 81] },
  { name: 'Cẩm Lệ', x: 25, y: 70, count: [30, 126], done: [85, 88] },
]
const offsets = [[0, 0, 1], [-4, 3, 0.65], [3.5, -3, 0.6], [2, 5, 0.5]]
const PERIODS = ['7 ngày', '30 ngày']

export default function AnalyticsScreen() {
  const forced = new URLSearchParams(window.location.search).get('state')
  const [period, setPeriod] = useState(PERIODS[0])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(forced === 'error')
  const pi = period === PERIODS[0] ? 0 : 1
  const empty = forced === 'empty'
  const lowest = districts.reduce((a, b) => (b.done[pi] < a.done[pi] ? b : a)).name
  const [sel, setSel] = useState('Liên Chiểu')

  useEffect(() => { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t) }, [])
  const switchPeriod = (v: string) => {
    setPeriod(v)
    setLoading(true)
    setTimeout(() => setLoading(false), 450)
  }

  const maxCount = Math.max(...districts.map((d) => d.count[pi]))
  const heat = useMemo(
    () =>
      districts.flatMap((d) =>
        offsets.map(([ox, oy, k]) => ({
          x: d.x + ox,
          y: d.y + oy,
          size: (110 + d.count[pi] * (pi ? 0.6 : 2.4)) * k * (d.name === sel ? 1.15 : 1),
          alpha: (0.2 + 0.5 * (d.count[pi] / maxCount)) * k,
        })),
      ),
    [pi, sel, maxCount],
  )
  const current = districts.find((d) => d.name === sel)!
  const avg = Math.round(districts.reduce((s, d) => s + d.done[pi], 0) / districts.length)
  const total = districts.reduce((s, d) => s + d.count[pi], 0)

  const pick = (x: number, y: number) => {
    const n = districts.reduce((a, b) => (Math.hypot(b.x - x, b.y - y) < Math.hypot(a.x - x, a.y - y) ? b : a))
    setSel(n.name)
  }

  const body = failed ? (
    <div className="flex flex-1 items-center justify-center"><div className="rounded-card bg-card p-8 text-center shadow-card"><ErrorState text="Không tải được số liệu" /><Button variant="subtle" onClick={() => setFailed(false)}>Thử lại</Button></div></div>
  ) : (
    <>
      <div className="grid grid-cols-4 gap-4">
        <MetricBentoCard title="Tổng sự cố" value={empty ? 0 : total} icon={Activity} chart="bars" series={[3, 5, 4, 7, 6, 9, 12]} caption={period} state={loading ? 'loading' : empty ? 'empty' : 'normal'} />
        <MetricBentoCard dark title="Đúng hạn SLA" value={pi ? 91 : 94} suffix="%" icon={Target} chart="spark" series={[5, 6, 5, 8, 7, 9, 10]} caption={period} state={loading ? 'loading' : empty ? 'empty' : 'normal'} />
        <MetricBentoCard title="Giải quyết TB" value={pi ? 412 : 384} suffix=" phút" icon={Clock} chart="spark" series={[9, 8, 8, 7, 6, 7, 6]} caption={period} state={loading ? 'loading' : empty ? 'empty' : 'normal'} />
        <MetricBentoCard title="Hài lòng" value={pi ? 90 : 92} suffix="/100" icon={Smile} tone="done" chart="bars" series={[6, 7, 7, 8, 8, 9, 9]} caption={period} state={loading ? 'loading' : empty ? 'empty' : 'normal'} />
      </div>

      <div className="grid min-h-[560px] flex-1 grid-cols-[1fr_440px] gap-4">
        <section className="relative overflow-hidden rounded-card shadow-card">
          <MapBentoViewport
            fill
            detailed
            controls="bottom"
            state={loading ? 'loading' : empty ? 'empty' : 'normal'}
            pins={[]}
            heat={empty ? undefined : heat}
            onPick={pick}
          />
          <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-card p-1 pr-4 shadow-card">
            <IconChip icon={MapPin} tone="ink" size={32} />
            <span className="text-[14px] font-semibold">Mật độ sự cố</span>
          </div>
          {!loading && !empty && (
            <>
              <div key={current.name + pi} className="absolute bottom-4 left-4 flex animate-rise items-center gap-4 rounded-card bg-card p-4 shadow-card">
                <IconChip icon={AlertTriangle} tone="urgent" size={48} />
                <div>
                  <p className="text-[16px] font-semibold">{current.name}</p>
                  <p className="mt-1 text-[12px] text-muted tabular-nums">{current.count[pi]} sự cố · {current.done[pi]}% hoàn thành</p>
                </div>
              </div>
              <div className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-card px-4 py-2 text-[12px] text-muted shadow-card xl:flex">
                Thấp<span className="h-2 w-24 rounded-full bg-gradient-to-r from-accent/10 to-accent" />Cao
              </div>
            </>
          )}
        </section>

        <section className="animate-rise flex flex-col rounded-card bg-card p-6 shadow-card" style={{ animationDelay: '100ms' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Hoàn thành</h2>
            <span className="inline-flex h-6 items-center rounded-full bg-surface px-3 text-[12px] font-semibold tabular-nums">TB {avg}%</span>
          </div>
          {loading ? (
            <div className="flex flex-1 items-end gap-3">{districts.map((d, i) => <Skeleton key={d.name} className={cn('flex-1 rounded-full', ['h-[70%]', 'h-[85%]', 'h-[60%]', 'h-[90%]', 'h-[75%]', 'h-[80%]'][i])} />)}</div>
          ) : empty ? (
            <div className="flex flex-1 items-center justify-center"><EmptyState icon={Activity} text="Chưa có dữ liệu" /></div>
          ) : (
            <div className="flex flex-1 items-stretch gap-3">
              {districts.map((d) => {
                const on = d.name === sel
                return (
                  <button key={d.name} onClick={() => setSel(d.name)} onMouseEnter={() => setSel(d.name)} className="group flex flex-1 flex-col items-center gap-2">
                    <span className={cn('text-[12px] font-semibold tabular-nums transition', on ? 'text-accent' : 'text-muted')}>{d.done[pi]}%</span>
                    <span className="relative flex w-full flex-1 items-end overflow-hidden rounded-full bg-surface">
                      <span
                        className={cn('w-full rounded-full transition-all duration-700 ease-out group-hover:opacity-90', on ? 'bg-accent' : 'bg-ink')}
                        style={{ height: `${d.done[pi]}%` }}
                      />
                    </span>
                    <span className={cn('h-8 text-center text-[12px] leading-4 transition', on ? 'font-semibold text-ink' : 'text-muted')}>{d.name}</span>
                  </button>
                )
              })}
            </div>
          )}
          {!loading && !empty && sel === lowest && (
            <p className="mt-3 flex items-center gap-2 text-[12px] text-muted"><AlertTriangle size={14} {...ic} />Thấp nhất {period}</p>
          )}
        </section>
      </div>
    </>
  )

  return (
    <div className="fixed inset-0 overflow-auto bg-page">
      <div className="flex min-h-screen w-[1440px] gap-4 p-4">
        <div className="shrink-0"><AdminRail /></div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex items-center justify-between">
            <div className="animate-rise">
              <h1 className="text-[24px] font-bold">Bảng chỉ số</h1>
              <p className="mt-1 text-[12px] text-muted">Đà Nẵng, 6 quận nội thành</p>
            </div>
            <div className="flex items-center gap-4">
              <PillTab tone="ink" items={PERIODS} value={period} onChange={switchPeriod} />
              <a href="/profile" aria-label="Hồ sơ"><Avatar name="Nguyễn Hoàng Anh" size={48} online /></a>
            </div>
          </header>
          {body}
        </div>
      </div>
    </div>
  )
}
