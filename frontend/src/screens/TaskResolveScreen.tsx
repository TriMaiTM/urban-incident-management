'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, CheckCircle2, MapPin, Package, RotateCcw, ShieldCheck, Sparkles, TrafficCone, Wrench } from 'lucide-react'
import { Avatar, Button, ErrorState, IconChip, PillTab, StatusPill, Toast, cn, ic } from '../components/primitives'
import { EvidenceUploadCard, InputField, MetricBentoCard, Timeline } from '../components/data'
import { TechnicianNav } from '../components/nav'
import { getTask, plan, useMedia } from './technicianData'
import { getTicket, isInitialBackendSyncDone, setStatus, shortHash, useTicketVersion } from '../data/tickets'

type Photo = 'empty' | 'scanning' | 'done'
const STEPS = ['Ảnh', 'Biên bản', 'Gửi']
const chipBase = 'inline-flex h-6 items-center gap-1 rounded-full px-3 text-[12px] font-semibold text-white'

export default function TaskResolveScreen({ id }: { id: string }) {
  useTicketVersion()
  const desktop = useMedia('(min-width: 768px)')
  const task = getTask(id)
  const syncDone = isInitialBackendSyncDone()
  const hash = task ? shortHash(task.hash) : ''
  const p = task ? plan[task.kind] : plan.road
  const [photo, setPhoto] = useState<Photo>('empty')
  const [meters, setMeters] = useState(task?.gpsDev ?? 12)
  const [step, setStep] = useState(0)
  const [measure, setMeasure] = useState(p.steps.join(', '))
  const [material, setMaterial] = useState(p.materials.join(', '))
  const [note, setNote] = useState('Đã mở lại làn đường')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined)
  const camRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const back = () => { window.location.href = `/technician/tasks/${id}` }

  useEffect(() => {
    if (task) {
      const tp = plan[task.kind]
      setMeasure(tp.steps.join(', '))
      setMaterial(tp.materials.join(', '))
      setMeters(task.gpsDev ?? 12)
    }
  }, [task?.id, task?.kind])

  useEffect(() => {
    if (photo !== 'scanning') return
    const t = setTimeout(() => setPhoto('done'), 1500)
    return () => clearTimeout(t)
  }, [photo])

  if (!task && !syncDone)
    return (
      <div className="flex min-h-screen items-center justify-center bg-page p-4">
        <div className="size-10 animate-spin rounded-full border-4 border-surface border-t-ink" />
      </div>
    )

  if (!task)
    return (
      <div className="flex min-h-screen items-center justify-center bg-page p-4">
        <div className="rounded-card bg-card p-8 text-center shadow-card">
          <ErrorState text="Không tìm thấy nhiệm vụ" />
          <Button onClick={() => { window.location.href = '/technician/tasks' }}>Về danh sách</Button>
        </div>
      </div>
    )

  const gpsOk = meters < 50
  const photoReady = photo === 'done'
  const formReady = measure.trim() !== '' && material.trim() !== ''
  const ready = photoReady && gpsOk && formReady

  const pick = (m: number) => { setMeters(m); setPhoto('scanning') }
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setProofFile(f)
      setPreviewUrl((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
        return URL.createObjectURL(f)
      })
      pick(Math.min(35, (f.size % 30) + 5))
    }
    e.target.value = ''
  }
  const submit = () => {
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setSent(true)
      setStatus(task.id, 'RESOLVED', {
        note: `${measure}. Vật tư: ${material}. ${note}`,
        proofFile: proofFile ?? undefined,
      })
    }, 1000)
  }

  const gpsChip = photoReady && (
    <span className={cn(chipBase, 'animate-rise', gpsOk ? 'bg-done' : 'bg-urgent')}>
      <MapPin size={12} {...ic} />{gpsOk ? `GPS: ${meters}m Đạt` : `GPS lệch ${meters}m`}
    </span>
  )
  const ndChip = photoReady && <span className={cn(chipBase, 'animate-rise bg-ink')}><ShieldCheck size={12} {...ic} />NĐ13 Đã mờ</span>

  const sign = (
    <div className="flex items-center gap-2 text-[12px] text-muted">
      <Avatar name="Lê Văn Hùng" size={24} />
      <span className="min-w-0 truncate">KTV Lê Văn Hùng · TB-0457 · SHA256 <span className="font-semibold text-ink tabular-nums">{hash || '…'}</span></span>
    </div>
  )

  const activeImageUrl = previewUrl ?? getTicket(task.id).afterImageUrl ?? getTicket(task.id).imageUrl

  const photoBlock = (
    <section className="animate-rise rounded-card bg-card p-2 shadow-card">
      <EvidenceUploadCard
        height={desktop ? 400 : 260}
        state={photo}
        imageUrl={activeImageUrl}
        onCapture={() => camRef.current?.click()}
        onChoose={() => fileRef.current?.click()}
      />
      <div className="flex min-h-[48px] items-center justify-between gap-2 px-3 py-2">
        <div className="flex flex-wrap gap-2">{gpsChip}{!desktop && ndChip}</div>
        {photoReady && <Button size="sm" variant="subtle" icon={RotateCcw} onClick={() => setPhoto('empty')}>Chụp lại</Button>}
      </div>
    </section>
  )

  const formBlock = (
    <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '80ms' }}>
      <div className="grid gap-4">
        <InputField kind="textarea" height={88} label="Biện pháp" placeholder="Nhập biện pháp" value={measure} onChange={setMeasure} />
        <InputField label="Vật tư" placeholder="Nhập vật tư" value={material} onChange={setMaterial} error={material.trim() === '' ? 'Chưa nhập vật tư' : undefined} />
        <InputField label="Ghi chú lưu thông" placeholder="Ghi chú lưu thông" value={note} onChange={setNote} />
      </div>
      <div className="mt-4">{sign}</div>
    </section>
  )

  const sendButton = (
    <Button size="lg" loading={sending} disabled={!ready} onClick={submit}>Gửi biên bản</Button>
  )

  const review = (
    <section className="animate-rise rounded-card bg-card p-4 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <div className="size-20 shrink-0 overflow-hidden rounded-tile bg-surface">
          {activeImageUrl && <img src={activeImageUrl} alt="Ảnh nghiệm thu" className="size-full object-cover" />}
        </div>
        <div className="flex flex-wrap gap-2">{gpsChip}{ndChip}</div>
      </div>
      <div className="space-y-3 text-[14px]">
        {[[Wrench, measure], [Package, material], [TrafficCone, note]].map(([I, v], i) => {
          const Ic = I as typeof Wrench
          return <div key={i} className="flex items-center gap-3"><IconChip icon={Ic} size={32} /><span className="truncate">{v as string}</span></div>
        })}
      </div>
      <div className="mt-4">{sign}</div>
    </section>
  )

  const successBody = (
        <div className="grid w-full gap-4 md:grid-cols-5">
          <section
            className="animate-rise relative flex flex-col justify-between gap-10 overflow-hidden rounded-card p-6 text-white shadow-card md:col-span-3 md:min-h-[360px] md:p-8"
            style={{ background: 'radial-gradient(100% 120% at 100% 0%, rgba(229,37,27,0.55) 0%, rgba(229,37,27,0) 60%), #111111' }}
          >
            <div className="flex items-center justify-between">
              <span className="flex size-12 animate-bounce items-center justify-center rounded-tile bg-done"><CheckCircle2 size={24} {...ic} /></span>
              <StatusPill level="done" />
            </div>
            <div>
              <h1 className="text-[24px] font-bold">Đã gửi biên bản</h1>
              <p className="mt-1 text-[12px] text-white/60">Chờ điều phối viên nghiệm thu</p>
              <p className="mt-6 text-[32px] leading-none font-bold tabular-nums md:text-[40px]">{task.id}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="subtle" icon={Check} onClick={() => { navigator.clipboard?.writeText(task.id); setCopied(true) }}>{copied ? 'Đã chép' : 'Chép mã'}</Button>
                <Button variant="subtle" onClick={() => { window.location.href = '/technician/tasks' }}>Về danh sách</Button>
              </div>
            </div>
          </section>
          <div className="grid gap-4 md:col-span-2">
            <MetricBentoCard title="Sai lệch GPS" value={meters} suffix=" m" icon={MapPin} tone="done" />
            <section className="animate-rise rounded-card bg-card p-4 shadow-card md:p-6" style={{ animationDelay: '120ms' }}>
              <h2 className="mb-4 text-[16px] font-semibold">Vòng đời</h2>
              <Timeline current={2} steps={[{ label: 'Đang xử lý', time: '09:42' }, { label: 'Đã xử lý', time: 'Vừa xong' }, { label: 'Đã xác nhận', time: '--:--' }]} />
              <div className="mt-4">{sign}</div>
            </section>
          </div>
        </div>
  )

  const nextDisabled = step === 0 ? !(photoReady && gpsOk) : step === 1 ? !formReady : !ready

  return (
    <div className="min-h-screen bg-page pb-32 md:pb-4">
      {!gpsOk && photoReady && (
        <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 animate-rise"><Toast kind="error" text="GPS lệch, chụp lại" /></div>
      )}
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <div className="mx-auto flex w-full max-w-[1440px] gap-4 p-4">
        <div className="hidden shrink-0 md:block"><TechnicianNav mode="rail" /></div>
        <div className="min-w-0 flex-1">
          <header className="animate-rise mb-4 flex items-center gap-3">
            <Button variant="subtle" icon={ArrowLeft} onClick={back} />
            <div className="min-w-0 flex-1">
              <h1 className="text-[24px] font-bold">Nghiệm thu</h1>
              <p className="mt-1 truncate text-[12px] text-muted">{task.id} · {task.address}</p>
            </div>
            <StatusPill level={sent ? 'done' : task.level} />
          </header>

          {sent ? (
            successBody
          ) : desktop ? (
            <div className="flex gap-4">
              <div className="min-w-0 flex-1">{photoBlock}</div>
              <div className="flex w-[520px] shrink-0 flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <MetricBentoCard compact dark title="Sai lệch GPS" value={photoReady ? meters : 0} suffix=" m" icon={MapPin} />
                  <MetricBentoCard compact title="Thời gian xử lý" value={42} suffix=" phút" icon={Sparkles} chart="bars" series={[2, 4, 3, 6, 5, 8]} />
                </div>
                {formBlock}
                <div className="[&>button]:w-full">{sendButton}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4"><PillTab tone="ink" items={STEPS} value={STEPS[step]} onChange={(v) => { const i = STEPS.indexOf(v); if (i <= step) setStep(i) }} /></div>
              <div key={step}>{step === 0 ? photoBlock : step === 1 ? formBlock : review}</div>
            </>
          )}
        </div>
      </div>

      {!desktop && !sent && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center bg-gradient-to-t from-page via-page/90 to-transparent p-4 pt-8">
          <div className="flex w-full max-w-[560px] gap-3 [&>button]:flex-1">
            {step > 0 && <Button size="lg" variant="subtle" onClick={() => setStep(step - 1)}>Quay lại</Button>}
            {step < 2 ? (
              <Button size="lg" disabled={nextDisabled} onClick={() => setStep(step + 1)}>Tiếp tục</Button>
            ) : (
              sendButton
            )}
          </div>
        </div>
      )}
    </div>
  )
}
