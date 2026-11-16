'use client'

import { useEffect, useState } from 'react'
import { Check, Construction, Star } from 'lucide-react'
import { Avatar, Button, EmptyState, ErrorState, IconChip, StatusPill, cn } from '../components/primitives'
import { CompareEvidence, EvidenceUploadCard, InputField } from '../components/data'
import CitizenShell from './CitizenShell'
import { getReports } from './citizenData'
import { setStatus, useTicketVersion } from '../data/tickets'

export default function FeedbackScreen({ code }: { code: string }) {
  useTicketVersion()
  const r = getReports().find((x) => x.id === code)
  const [loading, setLoading] = useState(true)
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [reason, setReason] = useState('')
  const [proof, setProof] = useState<'empty' | 'scanning' | 'done'>('empty')
  const [result, setResult] = useState<null | 'ok' | 'complaint'>(null)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t) }, [])
  useEffect(() => {
    if (proof !== 'scanning') return
    const t = setTimeout(() => setProof('done'), 1400)
    return () => clearTimeout(t)
  }, [proof])

  if (!r)
    return (
      <CitizenShell title="Đánh giá" sub={code}>
        <div className="mx-auto max-w-[480px] rounded-card bg-card p-8 text-center shadow-card"><ErrorState text="Không tìm thấy phiếu" /><Button onClick={() => { window.location.href = '/citizen/my-reports' }}>Về danh sách</Button></div>
      </CitizenShell>
    )

  const complaint = (stars > 0 && stars <= 2) || reason.trim().length > 0
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2200) }

  const hero = (
    <section
      className="animate-rise relative flex flex-col justify-between gap-8 overflow-hidden rounded-card p-6 text-white shadow-card"
      style={{ background: 'radial-gradient(110% 130% at 100% 100%, rgba(229,37,27,0.6) 0%, rgba(229,37,27,0) 60%), #111111' }}
    >
      <div className="flex items-center justify-between"><p className="text-[12px] text-white/60">{r.title}</p><StatusPill level="done" /></div>
      <p className="text-[32px] leading-none font-bold tabular-nums">{r.id}</p>
    </section>
  )

  return (
    <CitizenShell title="Đánh giá" sub={`${r.address} · Hoàn tất ${r.times[4]}`} toast={toast}>
      {r.status !== 'done' && !result ? (
        <div className="mx-auto max-w-[480px] rounded-card bg-card p-8 shadow-card"><EmptyState icon={Star} text="Chưa thể đánh giá" /><div className="flex justify-center"><Button onClick={() => { window.location.href = `/citizen/reports/${r.id}` }}>Xem phiếu</Button></div></div>
      ) : result ? (
        <div className="mx-auto grid max-w-[720px] gap-4">
          {hero}
          <div className="animate-rise rounded-card bg-card p-8 shadow-card"><EmptyState icon={Check} tone="done" text={result === 'ok' ? 'Cảm ơn bạn' : 'Đã gửi khiếu nại'} /><div className="flex justify-center"><Button onClick={() => { window.location.href = '/citizen/my-reports' }}>Về danh sách</Button></div></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <section className="animate-rise rounded-card bg-card p-4 shadow-card md:col-span-7 md:p-6" style={{ animationDelay: '60ms' }}>
            <h2 className="mb-4 text-[16px] font-semibold">Trước và sau</h2>
            <CompareEvidence photos height={300} chipMiddle state={loading ? 'loading' : 'normal'} gps={{ text: `GPS: ${r.gpsDev}m ${r.gpsDev < 50 ? 'Đạt' : 'Lệch'}`, ok: r.gpsDev < 50 }} />
            {r.note && (
              <div className="mt-4 flex items-center gap-3 rounded-tile bg-surface p-3"><Avatar name={r.ktv ?? 'KTV'} size={32} /><p className="text-[14px]">{r.note}</p></div>
            )}
          </section>

          <div className="flex flex-col gap-4 md:col-span-5">
            {hero}
            <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '120ms' }}>
              <h2 className="mb-4 text-[16px] font-semibold">Đánh giá</h2>
              <div className="flex justify-center gap-2" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} aria-label={`${n} sao`} onMouseEnter={() => setHover(n)} onClick={() => setStars(n)} className="transition hover:-translate-y-1 active:scale-90">
                    <Star size={48} strokeWidth={1.75} className={cn('transition', n <= (hover || stars) ? 'fill-ink text-ink' : 'text-low')} />
                  </button>
                ))}
              </div>
              <div className={cn('grid transition-all duration-500 ease-out', complaint ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                <div className="overflow-hidden">
                  <div className="space-y-3 rounded-card bg-surface p-3">
                    <div className="flex items-center gap-2 text-[14px] font-semibold"><IconChip icon={Construction} tone="urgent" size={32} />Khiếu nại làm lại</div>
                    <InputField kind="textarea" height={72} placeholder="Nêu lý do" value={reason} onChange={setReason} />
                    <EvidenceUploadCard height={170} state={proof} onChoose={() => setProof('scanning')} onCapture={() => setProof('scanning')} onSample={() => setProof('scanning')} />
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 [&>button]:w-full">
                <Button onClick={() => { setStatus(r.id, 'CLOSED', { rated: stars || undefined }); setResult('ok'); say('Đã xác nhận') }}>Xác nhận hài lòng</Button>
                <Button variant="secondary" disabled={!complaint} onClick={() => { setStatus(r.id, 'REOPENED', { rated: stars || undefined, reason: reason.trim() || 'Khiếu nại chất lượng xử lý' }); setResult('complaint'); say('Đã gửi khiếu nại') }}>Gửi khiếu nại</Button>
              </div>
            </section>
          </div>
        </div>
      )}
    </CitizenShell>
  )
}
