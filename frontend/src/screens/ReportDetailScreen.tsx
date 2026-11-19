'use client'

import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Send, Star, Trash2 } from 'lucide-react'
import { Avatar, Button, ErrorState, Skeleton, StatusPill, cn, ic } from '../components/primitives'
import { EvidenceUploadCard, InputField, MapBentoViewport, Timeline } from '../components/data'
import { ModalDialog } from '../components/nav'
import CitizenShell from './CitizenShell'
import { getReports, steps } from './citizenData'
import { getTicket, useTicketVersion } from '../data/tickets'

type Msg = { from: 'me' | 'ioc'; text?: string; photo?: boolean; time: string }
const nowStr = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

export default function ReportDetailScreen({ id }: { id: string }) {
  useTicketVersion()
  const r = getReports().find((x) => x.id === id)
  const tk = getTicket(id)
  const [loading, setLoading] = useState(true)
  const [cancelled, setCancelled] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [inputKey, setInputKey] = useState(0)
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'ioc', text: 'Đã tiếp nhận phiếu của bạn.', time: r?.times[0] ?? '' }])
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t) }, [])
  useEffect(() => { scroller.current?.scrollTo({ top: 9999, behavior: 'smooth' }) }, [msgs])

  if (!r)
    return (
      <CitizenShell title="Chi tiết phản ánh" sub={id}>
        <div className="mx-auto max-w-[480px] rounded-card bg-card p-8 text-center shadow-card"><ErrorState text="Không tìm thấy phiếu" /><Button onClick={() => { window.location.href = '/citizen/my-reports' }}>Về danh sách</Button></div>
      </CitizenShell>
    )

  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2200) }
  const send = (m: Omit<Msg, 'from' | 'time'>) => {
    setMsgs((l) => [...l, { ...m, from: 'me', time: nowStr() }])
    setTimeout(() => setMsgs((l) => [...l, { from: 'ioc', text: 'Đã nhận thông tin bổ sung.', time: nowStr() }]), 1100)
  }
  const submitText = () => { if (!text.trim()) return; send({ text: text.trim() }); setText(''); setInputKey((k) => k + 1) }

  const rejected = r.status === 'rejected' || cancelled
  const tlSteps = rejected
    ? [{ label: 'Tiếp nhận', time: r.times[0] }, { label: 'Phân loại', time: r.times[1] }, { label: cancelled ? 'Đã hủy' : 'Từ chối', time: cancelled ? nowStr() : r.times[2] }]
    : steps.map((label, i) => ({ label, time: r.times[i] }))
  const canCancel = r.status === 'received' && !cancelled

  const hero = (
    <section
      className="animate-rise relative flex flex-col justify-between gap-8 overflow-hidden rounded-card p-6 text-white shadow-card md:min-h-[240px]"
      style={{ background: 'radial-gradient(110% 130% at 100% 100%, rgba(229,37,27,0.6) 0%, rgba(229,37,27,0) 60%), #111111' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-white/60">{r.title}</p>
        {rejected ? <span className="inline-flex h-6 items-center rounded-full bg-white/15 px-3 text-[12px] font-semibold">{cancelled ? 'Đã hủy' : 'Từ chối'}</span> : <StatusPill level={r.status === 'done' ? 'done' : r.level} />}
      </div>
      <div>
        <p className="text-[32px] leading-none font-bold tabular-nums md:text-[40px]">{r.id}</p>
        {canCancel && <div className="mt-6"><Button variant="subtle" icon={Trash2} onClick={() => setConfirm(true)}>Hủy phản ánh</Button></div>}
        {r.status === 'done' && (
          <div className="mt-6">
            {r.rated ? (
              <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-[14px] font-semibold"><Star size={16} {...ic} className="fill-white" />{r.rated}/5</span>
            ) : (
              <Button variant="subtle" icon={Star} onClick={() => { window.location.href = `/citizen/feedback/${r.id}` }}>Đánh giá</Button>
            )}
          </div>
        )}
      </div>
    </section>
  )

  return (
    <CitizenShell title="Chi tiết phản ánh" sub={`${r.address} · ${r.date}`} toast={toast}>
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-[420px]">
            <ModalDialog variant="modal" title="Hủy phản ánh?" confirm="Xác nhận" cancelLabel="Giữ lại" onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); setCancelled(true); say('Đã hủy phản ánh') }}>
              <p className="text-[14px] text-muted">{r.id}</p>
            </ModalDialog>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="flex flex-col gap-4 md:col-span-7">
          {hero}
          <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '80ms' }}>
            <h2 className="mb-6 text-[16px] font-semibold">Tiến độ</h2>
            {loading ? <Skeleton className="h-20" /> : <Timeline rejected={rejected} current={rejected ? 2 : r.step} steps={tlSteps} />}
          </section>
          <section className="animate-rise rounded-card bg-card p-2 shadow-card" style={{ animationDelay: '140ms' }}>
            <EvidenceUploadCard state={loading ? 'scanning' : 'done'} imageUrl={tk.imageUrl} height={260} />
          </section>
        </div>

        <div className="flex flex-col gap-4 md:col-span-5">
          <section className="animate-rise relative h-[200px] overflow-hidden rounded-card shadow-card" style={{ animationDelay: '100ms' }}>
            <MapBentoViewport fill detailed state={loading ? 'loading' : 'normal'} pins={[]} controls="bottom" userPin={{ x: r.x, y: r.y, level: r.level, radius: 30 }} />
          </section>
          <section className="animate-rise flex flex-col rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '160ms' }}>
            <h2 className="mb-4 text-[16px] font-semibold">Nhắn IOC</h2>
            <div ref={scroller} className="mb-4 flex max-h-[260px] min-h-[140px] flex-col gap-3 overflow-y-auto">
              {msgs.map((m, i) => (
                <div key={i} className={cn('flex animate-rise items-end gap-2', m.from === 'me' && 'flex-row-reverse')}>
                  {m.from === 'ioc' && <Avatar name="IOC Đà Nẵng" size={32} color={1} />}
                  <div className={cn('max-w-[75%] rounded-card p-3 text-[14px]', m.from === 'me' ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-surface')}>
                    {m.photo ? (
                      <div className="h-24 w-36 overflow-hidden rounded-tile bg-surface">
                        {tk.imageUrl && <img src={tk.imageUrl} alt="Ảnh đính kèm" className="size-full object-cover" />}
                      </div>
                    ) : (
                      m.text
                    )}
                    <p className={cn('mt-1 text-[12px]', m.from === 'me' ? 'text-white/60' : 'text-muted')}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            {rejected ? null : (
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1"><InputField key={inputKey} placeholder="Gửi thêm mô tả" onChange={setText} /></div>
                <Button variant="subtle" icon={ImageIcon} onClick={() => send({ photo: true })} />
                <Button icon={Send} disabled={!text.trim()} onClick={submitText} />
              </div>
            )}
          </section>
        </div>
      </div>
    </CitizenShell>
  )
}
