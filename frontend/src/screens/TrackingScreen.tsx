'use client'

import { useEffect, useState } from 'react'
import { Check, Clock, Construction, Droplets, Lightbulb, Search, Send, Star, Trash2, TreeDeciduous, Users } from 'lucide-react'
import { Avatar, Button, EmptyState, ErrorState, IconChip, Skeleton, StatusPill, Toast, cn, ic, type Level } from '../components/primitives'
import { CompareEvidence, EvidenceUploadCard, InputField, Timeline } from '../components/data'
import SamplePhoto from '../components/SamplePhoto'
import { CitizenTabBar, TopPillNav } from '../components/nav'
import { fmtClock, useTick } from './technicianData'
import { citizenStep, clock, deadlineOf, getTickets, gpsDeviation, levelOf, remainingSec, timesOf, useTicketVersion, type Ticket } from '../data/tickets'

type Kind = 'flood' | 'road' | 'tree' | 'trash' | 'light'
type Track = {
  code: string; title: string; address: string; kind: Kind; level: Level
  step: number; remaining: number; unit: string; ktv: string; promise: string; note: string; times: string[]; gpsDev?: number
}
const kindIcon = { flood: Droplets, road: Construction, tree: TreeDeciduous, trash: Trash2, light: Lightbulb }
const steps = ['Tiếp nhận', 'Phân loại', 'Giao việc', 'Đang xử lý', 'Đã khắc phục']
const noteOf = (t: Ticket) =>
  t.status === 'IN_PROGRESS' ? 'Đang xử lý tại hiện trường.' : t.status === 'REOPENED' ? 'Phiếu được mở lại để xử lý bổ sung.' : t.status === 'REJECTED' ? (t.reason ?? '') : t.note ?? ''
const trackOf = (t: Ticket): Track => ({
  code: t.id, title: t.title, address: t.address, kind: t.kind, level: levelOf(t), step: citizenStep(t.status), remaining: remainingSec(t),
  unit: t.unit, ktv: t.ktv ?? 'Chờ phân công', promise: `Trước ${clock(deadlineOf(t))}`, note: noteOf(t), times: timesOf(t), gpsDev: gpsDeviation(t),
})
const allTracks = () => getTickets().map(trackOf)

export default function TrackingScreen({ code }: { code: string }) {
  const track: Track | undefined =
    allTracks().find((t) => t.code === code) ??
    (/^DN-\d{6}-\d{4}$/.test(code)
      ? (() => {
          const n = Number(code.slice(-4)) % 4
          return {
            code, title: 'Phiếu sự cố đô thị', address: 'Đà Nẵng', kind: 'road', level: (['high', 'normal', 'low', 'urgent'] as Level[])[n],
            step: n, remaining: 20000 + n * 9000, unit: 'Trung tâm IOC Đà Nẵng', ktv: n < 2 ? 'Chờ phân công' : 'Lê Văn Hùng',
            promise: 'Trước 17:00', note: n === 3 ? 'Đang xử lý tại hiện trường.' : '', times: ['08:00', n >= 1 ? '08:05' : '--:--', n >= 2 ? '08:30' : '--:--', n >= 3 ? '09:10' : '--:--', '--:--'],
          } as Track
        })()
      : undefined)
  useTick()
  useTicketVersion()
  const [loading, setLoading] = useState(true)
  const [stars, setStars] = useState(0)
  const [hoverStar, setHoverStar] = useState(0)
  const [proof, setProof] = useState<'empty' | 'scanning' | 'done'>('empty')
  const [sent, setSent] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t) }, [])
  useEffect(() => {
    if (proof !== 'scanning') return
    const t = setTimeout(() => setProof('done'), 1400)
    return () => clearTimeout(t)
  }, [proof])

  const q = query.trim().toUpperCase()
  const known = allTracks().find((t) => t.code === q)
  const notFound = q.length >= 14 && !known
  useEffect(() => { if (known && known.code !== code) window.location.href = `/tracking/${known.code}` }, [known, code])

  const say = (text: string) => { setToast(text); setTimeout(() => setToast(null), 2200) }
  const complaint = stars > 0 && stars <= 2

  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen bg-page pb-28 md:pb-8">
      {toast && <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 animate-rise"><Toast kind="success" text={toast} /></div>}
      <div className="mx-auto w-full max-w-[1440px] p-4 md:p-8">
        <div className="hidden md:block"><TopPillNav active={2} /></div>
        <header className="animate-rise mt-2 mb-4 flex flex-col gap-3 md:mt-6 md:mb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[24px] font-bold">Tra cứu tiến độ</h1>
            <p className="mt-1 text-[12px] text-muted">{track ? track.code : code}</p>
          </div>
          <div className="md:w-[320px]"><InputField kind="search" placeholder="Tìm mã phiếu" onChange={setQuery} error={notFound ? 'Mã không tồn tại' : undefined} /></div>
        </header>
        {content}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-4 md:hidden"><CitizenTabBar /></div>
    </div>
  )

  if (!track)
    return shell(
      <div className="mx-auto max-w-[480px] rounded-card bg-card p-8 text-center shadow-card">
        <ErrorState text="Không tìm thấy mã phiếu" />
        <Button onClick={() => { window.location.href = '/' }}>Về trang chủ</Button>
      </div>,
    )

  const resolved = track.step >= 4
  const I = kindIcon[track.kind]
  const remaining = track.remaining

  const hero = (
    <section
      className="animate-rise relative flex flex-col justify-between gap-10 overflow-hidden rounded-card p-6 text-white shadow-card md:min-h-[300px] md:p-8"
      style={{ background: 'radial-gradient(110% 130% at 100% 100%, rgba(229,37,27,0.6) 0%, rgba(229,37,27,0) 60%), #111111' }}
    >
      <div className="flex items-center justify-between">
        <IconChip icon={I} size={48} />
        <StatusPill level={resolved ? 'done' : track.level} />
      </div>
      <div>
        <p className="text-[12px] text-white/60">{track.title}</p>
        <p className="mt-2 text-[32px] leading-none font-bold tabular-nums md:text-[40px]">{track.code}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex h-8 items-center gap-2 rounded-full bg-white/15 px-4 text-[14px] font-semibold tabular-nums', !resolved && remaining < 1800 && 'animate-pulse')}>
            <Clock size={14} {...ic} />{resolved ? 'Hoàn tất' : fmtClock(remaining)}
          </span>
        </div>
      </div>
    </section>
  )

  const timeline = (
    <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '80ms' }}>
      <h2 className="mb-6 text-[16px] font-semibold">Tiến độ</h2>
      {loading ? (
        <div className="flex gap-3">{steps.map((s) => <Skeleton key={s} className="h-20 flex-1" />)}</div>
      ) : (
        <Timeline current={track.step} steps={steps.map((label, i) => ({ label, time: track.times[i] }))} />
      )}
    </section>
  )

  const unit = (
    <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '120ms' }}>
      <h2 className="mb-4 text-[16px] font-semibold">Đơn vị</h2>
      <div className="flex items-center gap-3">
        <IconChip icon={Users} tone="ink" size={48} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{track.unit}</p>
          <p className="mt-1 flex items-center gap-1 text-[12px] text-muted"><Clock size={12} {...ic} />Cam kết {track.promise}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-tile bg-surface p-3">
        <Avatar name={track.ktv === 'Chờ phân công' ? 'Chờ' : track.ktv} size={32} color={track.ktv === 'Chờ phân công' ? 4 : 0} online={track.step >= 3} />
        <span className="text-[14px] font-semibold">{track.ktv}</span>
      </div>
    </section>
  )

  const compare = (
    <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '160ms' }}>
      <h2 className="mb-4 text-[16px] font-semibold">Trước và sau</h2>
      {resolved ? (
        <CompareEvidence photos height={160} gps={{ text: `GPS: ${track.gpsDev ?? 12}m Đạt`, ok: (track.gpsDev ?? 12) < 50 }} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="relative flex h-40 items-end overflow-hidden rounded-tile p-3">
            <SamplePhoto className="absolute inset-0 size-full" />
            <span className="relative inline-flex h-6 items-center rounded-full bg-card px-3 text-[12px] font-semibold">Trước</span>
          </div>
          <div className="flex h-40 items-center justify-center rounded-tile bg-surface"><EmptyState icon={Clock} text="Chờ ảnh sau" /></div>
        </div>
      )}
      {track.note && (
        <div className="mt-4 flex items-center gap-3 rounded-tile bg-surface p-3">
          <Avatar name={track.ktv} size={32} />
          <p className="text-[14px]">{track.note}</p>
        </div>
      )}
    </section>
  )

  const rating = (
    <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '200ms' }}>
      <h2 className="mb-4 text-[16px] font-semibold">Đánh giá</h2>
      {!resolved ? (
        <div className="rounded-tile bg-surface"><EmptyState icon={Star} text="Mở sau khi khắc phục" /></div>
      ) : sent ? (
        <div className="animate-rise rounded-tile bg-surface"><EmptyState icon={Check} tone="done" text={complaint ? 'Đã gửi khiếu nại' : 'Cảm ơn bạn'} /></div>
      ) : (
        <>
          <div className="flex justify-center gap-2" onMouseLeave={() => setHoverStar(0)}>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = n <= (hoverStar || stars)
              return (
                <button key={n} aria-label={`${n} sao`} onMouseEnter={() => setHoverStar(n)} onClick={() => setStars(n)} className="transition active:scale-90 hover:-translate-y-1">
                  <Star size={36} strokeWidth={1.75} className={cn('transition', on ? 'fill-ink text-ink' : 'text-low')} />
                </button>
              )
            })}
          </div>
          <div className={cn('grid transition-all duration-500 ease-out', complaint ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
            <div className="overflow-hidden">
              <div className="space-y-3 rounded-card bg-surface p-3">
                <div className="flex items-center gap-2 text-[14px] font-semibold"><IconChip icon={Construction} tone="urgent" size={32} />Khiếu nại làm lại</div>
                <EvidenceUploadCard height={170} state={proof} onChoose={() => setProof('scanning')} onCapture={() => setProof('scanning')} onSample={() => setProof('scanning')} />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <InputField kind="textarea" height={72} placeholder="Phản hồi của bạn" />
            <Button disabled={stars === 0} icon={Send} onClick={() => { setSent(true); say(complaint ? 'Đã gửi khiếu nại' : 'Đã gửi đánh giá') }}>{complaint ? 'Gửi khiếu nại' : 'Gửi đánh giá'}</Button>
          </div>
        </>
      )}
    </section>
  )

  return shell(
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
      <div className="flex flex-col gap-4 md:col-span-7">{hero}{timeline}{unit}</div>
      <div className="flex flex-col gap-4 md:col-span-5">{compare}{rating}</div>
    </div>,
  )
}
