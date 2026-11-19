'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Clock, MapPin, Smile, Target } from 'lucide-react'
import { Avatar, Button, EmptyState, ErrorState, IconChip, PillTab, Skeleton, cn, ic } from '../components/primitives'
import { MapBentoViewport, MetricBentoCard } from '../components/data'
import { AdminRail } from '../components/nav'
import { getTickets, remainingSec, useTicketVersion } from '../data/tickets'

type DistrictStat = {
  name: string
  x: number
  y: number
  lng: number
  lat: number
  count: number
  doneCount: number
  doneRate: number
}

const DISTRICT_CENTERS: { name: string; x: number; y: number; lng: number; lat: number }[] = [
  { name: 'Hải Châu', x: 48, y: 68, lng: 108.216, lat: 16.058 },
  { name: 'Thanh Khê', x: 48, y: 22, lng: 108.191, lat: 16.068 },
  { name: 'Sơn Trà', x: 70, y: 20, lng: 108.248, lat: 16.085 },
  { name: 'Ngũ Hành Sơn', x: 70, y: 72, lng: 108.252, lat: 16.002 },
  { name: 'Liên Chiểu', x: 22, y: 22, lng: 108.14, lat: 16.095 },
  { name: 'Cẩm Lệ', x: 25, y: 70, lng: 108.193, lat: 16.015 },
  { name: 'Hòa Vang', x: 14, y: 52, lng: 108.055, lat: 16.025 },
]

const PERIODS = ['7 ngày', '30 ngày']

export default function AnalyticsScreen() {
  const ticketVer = useTicketVersion()
  const forced = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state')
  const [period, setPeriod] = useState(PERIODS[0])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(forced === 'error')
  const [sel, setSel] = useState('Ngũ Hành Sơn')

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450)
    return () => clearTimeout(t)
  }, [])

  const switchPeriod = (v: string) => {
    setPeriod(v)
    setLoading(true)
    setTimeout(() => setLoading(false), 300)
  }

  const allRealTickets = useMemo(() => {
    const days = period === PERIODS[0] ? 7 : 30
    const cutoff = Date.now() - days * 86_400_000
    return getTickets().filter((t) => t.submittedAt >= cutoff)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketVer, period])

  const districtStats = useMemo<DistrictStat[]>(() => {
    return DISTRICT_CENTERS.map((dc) => {
      const inDist = allRealTickets.filter(
        (t) => t.district.trim().toLowerCase().includes(dc.name.toLowerCase()),
      )
      const count = inDist.length
      const doneCount = inDist.filter((t) =>
        ['RESOLVED', 'CONFIRMED', 'CLOSED'].includes(t.status),
      ).length
      const doneRate = count > 0 ? Math.round((doneCount / count) * 100) : 0
      return {
        ...dc,
        count,
        doneCount,
        doneRate,
      }
    })
  }, [allRealTickets])

  // Select the district with the most incidents by default when real data arrives
  useEffect(() => {
    const top = [...districtStats].sort((a, b) => b.count - a.count)[0]
    if (top && top.count > 0) {
      setSel(top.name)
    }
  }, [districtStats])

  const totalIncidents = allRealTickets.length
  const empty = forced === 'empty' || totalIncidents === 0

  const slaComplianceRate = useMemo(() => {
    if (allRealTickets.length === 0) return 0
    const within = allRealTickets.filter((t) => remainingSec(t) >= 0).length
    return Math.round((within / allRealTickets.length) * 100)
  }, [allRealTickets])

  const avgResolutionMinutes = useMemo(() => {
    const resolved = allRealTickets.filter(
      (t) => ['RESOLVED', 'CONFIRMED', 'CLOSED'].includes(t.status) && t.at.RESOLVED,
    )
    if (resolved.length === 0) return 0
    const sumMin = resolved.reduce(
      (acc, t) => acc + Math.max(1, Math.round(((t.at.RESOLVED ?? t.submittedAt) - t.submittedAt) / 60000)),
      0,
    )
    return Math.round(sumMin / resolved.length)
  }, [allRealTickets])

  const satisfactionScore = useMemo(() => {
    const rated = allRealTickets.filter((t) => typeof t.rated === 'number' && t.rated > 0)
    if (rated.length > 0) {
      const avgStars = rated.reduce((s, t) => s + (t.rated ?? 5), 0) / rated.length
      return Math.round(avgStars * 20)
    }
    const completed = allRealTickets.filter((t) => ['CONFIRMED', 'CLOSED'].includes(t.status))
    return completed.length > 0 ? 100 : 0
  }, [allRealTickets])

  const heat = useMemo(
    () =>
      allRealTickets.map((t) => ({
        x: t.x,
        y: t.y,
        lat: t.gps.lat,
        lng: t.gps.lng,
        size: t.district.toLowerCase().includes(sel.toLowerCase()) ? 165 : 130,
        alpha: 0.55,
      })),
    [allRealTickets, sel],
  )

  const current = districtStats.find((d) => d.name === sel) ?? districtStats[0]
  const activeDistricts = districtStats.filter((d) => d.count > 0)
  const avgCompletion =
    activeDistricts.length > 0
      ? Math.round(activeDistricts.reduce((s, d) => s + d.doneRate, 0) / activeDistricts.length)
      : 0
  const lowest =
    activeDistricts.length > 0
      ? activeDistricts.reduce((a, b) => (b.doneRate < a.doneRate ? b : a)).name
      : ''

  const pick = (x: number, y: number) => {
    const n = districtStats.reduce((a, b) =>
      Math.hypot(b.x - x, b.y - y) < Math.hypot(a.x - x, a.y - y) ? b : a,
    )
    setSel(n.name)
  }

  const body = failed ? (
    <div className="flex flex-1 items-center justify-center">
      <div className="rounded-card bg-card p-8 text-center shadow-card">
        <ErrorState text="Không tải được số liệu" />
        <Button variant="subtle" onClick={() => setFailed(false)}>
          Thử lại
        </Button>
      </div>
    </div>
  ) : (
    <>
      <div className="grid grid-cols-4 gap-4">
        <MetricBentoCard
          title="Tổng sự cố"
          value={totalIncidents}
          icon={Activity}
          chart="bars"
          series={districtStats.map((d) => Math.max(1, d.count))}
          caption={period}
          state={loading ? 'loading' : 'normal'}
        />
        <MetricBentoCard
          dark
          title="Đúng hạn SLA"
          value={slaComplianceRate}
          suffix="%"
          icon={Target}
          chart="spark"
          series={[80, 90, 95, 100, Math.max(1, slaComplianceRate)]}
          caption={period}
          state={loading ? 'loading' : 'normal'}
        />
        <MetricBentoCard
          title="Giải quyết TB"
          value={avgResolutionMinutes}
          suffix=" phút"
          icon={Clock}
          chart="spark"
          series={[15, 25, 20, 18, Math.max(1, avgResolutionMinutes)]}
          caption={period}
          state={loading ? 'loading' : 'normal'}
        />
        <MetricBentoCard
          title="Hài lòng"
          value={satisfactionScore}
          suffix="/100"
          icon={Smile}
          tone="done"
          chart="bars"
          series={[80, 85, 90, 95, Math.max(1, satisfactionScore)]}
          caption={period}
          state={loading ? 'loading' : 'normal'}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_440px] gap-4">
        <section className="relative overflow-hidden rounded-card shadow-card">
          <MapBentoViewport
            fill
            detailed
            controls="bottom"
            state={loading ? 'loading' : 'normal'}
            pins={allRealTickets.map((t) => ({
              x: t.x,
              y: t.y,
              lat: t.gps.lat,
              lng: t.gps.lng,
              level: ['CONFIRMED', 'CLOSED'].includes(t.status) ? 'done' : t.priority,
            }))}
            heat={empty ? undefined : heat}
            onPick={pick}
          />
          <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-card p-1 pr-4 shadow-card">
            <IconChip icon={MapPin} tone="ink" size={32} />
            <span className="text-[14px] font-semibold">Mật độ sự cố thực tế ({totalIncidents})</span>
          </div>
          {!loading && current && (
            <>
              <div
                key={current.name + period}
                className="absolute bottom-4 left-4 flex animate-rise items-center gap-4 rounded-card bg-card p-4 shadow-card"
              >
                <IconChip icon={AlertTriangle} tone={current.count > 0 ? 'urgent' : 'neutral'} size={48} />
                <div>
                  <p className="text-[16px] font-semibold">{current.name}</p>
                  <p className="mt-1 text-[12px] text-muted tabular-nums">
                    {current.count} sự cố · {current.doneRate}% hoàn thành ({current.doneCount}/{current.count})
                  </p>
                </div>
              </div>
              <div className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-card px-4 py-2 text-[12px] text-muted shadow-card xl:flex">
                Thấp
                <span className="h-2 w-24 rounded-full bg-gradient-to-r from-accent/10 to-accent" />
                Cao
              </div>
            </>
          )}
        </section>

        <section
          className="animate-rise flex flex-col rounded-card bg-card p-6 shadow-card"
          style={{ animationDelay: '100ms' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Hoàn thành theo Quận/Huyện</h2>
            <span className="inline-flex h-6 items-center rounded-full bg-surface px-3 text-[12px] font-semibold tabular-nums">
              TB {avgCompletion}%
            </span>
          </div>
          {loading ? (
            <div className="flex flex-1 items-end gap-3">
              {districtStats.map((d) => (
                <Skeleton key={d.name} className="h-[75%] flex-1 rounded-full" />
              ))}
            </div>
          ) : empty ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState icon={Activity} text="Chưa có sự cố nào trong kỳ" />
            </div>
          ) : (
            <div className="flex flex-1 items-stretch gap-2.5">
              {districtStats.map((d) => {
                const on = d.name === sel
                return (
                  <button
                    key={d.name}
                    onClick={() => setSel(d.name)}
                    onMouseEnter={() => setSel(d.name)}
                    className="group flex flex-1 flex-col items-center gap-2"
                  >
                    <span
                      className={cn(
                        'text-[11px] font-semibold tabular-nums transition',
                        on ? 'text-accent' : 'text-muted',
                      )}
                    >
                      {d.count > 0 ? `${d.doneRate}%` : `${d.count} vụ`}
                    </span>
                    <span className="relative flex w-full flex-1 items-end overflow-hidden rounded-full bg-surface">
                      <span
                        className={cn(
                          'w-full rounded-full transition-all duration-700 ease-out group-hover:opacity-90',
                          on ? 'bg-accent' : d.count > 0 ? 'bg-ink' : 'bg-low/40',
                        )}
                        style={{ height: `${d.count > 0 ? Math.max(12, d.doneRate) : 6}%` }}
                      />
                    </span>
                    <span
                      className={cn(
                        'h-8 text-center text-[11px] leading-4 transition',
                        on ? 'font-semibold text-ink' : 'text-muted',
                      )}
                    >
                      {d.name}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {!loading && !empty && sel === lowest && lowest !== '' && (
            <p className="mt-3 flex items-center gap-2 text-[12px] text-muted">
              <AlertTriangle size={14} {...ic} />
              Tỷ lệ hoàn thành thấp nhất trong {period}
            </p>
          )}
        </section>
      </div>
    </>
  )

  return (
    <div className="fixed inset-0 overflow-auto bg-page">
      <div className="mx-auto flex h-dvh min-h-[660px] w-full max-w-[1440px] gap-4 p-4">
        <div className="shrink-0">
          <AdminRail />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex items-center justify-between">
            <div className="animate-rise">
              <h1 className="text-[24px] font-bold">Bảng chỉ số</h1>
              <p className="mt-1 text-[12px] text-muted">
                Số liệu thời gian thực từ PostgreSQL ({totalIncidents} phiếu sự cố thật)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <PillTab tone="ink" items={PERIODS} value={period} onChange={switchPeriod} />
              <a href="/profile" aria-label="Hồ sơ">
                <Avatar name="Nguyễn Hoàng Anh" size={48} online />
              </a>
            </div>
          </header>
          {body}
        </div>
      </div>
    </div>
  )
}
