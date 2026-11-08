import { useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button, IconChip, cn, ic } from '../components/primitives'
import { InputField } from '../components/data'
import { Alert, AuthShell, OtpInput, Primary, Title, forcedError, phoneOk, useCountdown, wait } from './AuthShell'

const titles = [
  ['Quên mật khẩu', 'Nhập số điện thoại hoặc email đã đăng ký'],
  ['Nhập mã OTP', 'Mã gồm 6 số vừa được gửi cho bạn'],
  ['Đặt mật khẩu mới', 'Chọn mật khẩu mạnh, tối thiểu 8 ký tự'],
]

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState(0)
  const [contact, setContact] = useState('')
  const [otp, setOtp] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [left, start] = useCountdown()

  const run = async (ok: () => Record<string, string>, after: () => void, serverFail?: () => string | null) => {
    const e = ok(); setErr(e); setBanner(null)
    if (Object.keys(e).length) return
    setBusy(true); await wait(); setBusy(false)
    const f = serverFail?.() ?? (forcedError() ? 'Có lỗi hệ thống, vui lòng thử lại sau.' : null)
    if (f) return setBanner(f)
    after()
  }
  const next1 = () => run(
    () => { const e: Record<string, string> = {}; if (!(phoneOk(contact) || /^\S+@\S+\.\S+$/.test(contact))) e.contact = 'Nhập số điện thoại 10 số hoặc email hợp lệ'; return e },
    () => { setStep(1); start() },
  )
  const next2 = () => run(
    () => { const e: Record<string, string> = {}; if (otp.replace(/\s/g, '').length < 6) e.otp = 'Nhập đủ 6 số'; return e },
    () => setStep(2),
    () => (otp === '000000' ? 'Mã OTP không đúng hoặc đã hết hạn.' : null),
  )
  const next3 = () => run(
    () => ({ ...(pw.length < 8 ? { pw: 'Mật khẩu tối thiểu 8 ký tự' } : {}), ...(pw2 !== pw ? { pw2: 'Mật khẩu nhập lại chưa khớp' } : {}) }),
    () => setDone(true),
  )
  const resend = async () => { setBusy(true); await wait(800); setBusy(false); start(); setOtp('') }

  if (done)
    return (
      <AuthShell headline={<>Lấy lại quyền truy cập<br />trong vài bước.</>}>
        <div className="flex flex-col items-center py-8 text-center">
          <IconChip icon={CheckCircle2} tone="done" size={48} />
          <h1 className="mt-4 text-[24px] font-bold">Đã đổi mật khẩu</h1>
          <p className="mt-1 mb-6 text-[14px] text-muted">Hãy đăng nhập lại bằng mật khẩu mới.</p>
          <div className="w-full [&>button]:w-full"><Button size="lg" onClick={() => { window.location.href = '/auth/login' }}>Về trang đăng nhập</Button></div>
        </div>
      </AuthShell>
    )

  return (
    <AuthShell headline={<>Lấy lại quyền truy cập<br />trong vài bước.</>}>
      <div className="mb-6" aria-label={`Bước ${step + 1} trên 3`}>
        <div className="flex gap-2">{[0, 1, 2].map((i) => <span key={i} className={cn('h-2 flex-1 rounded-full transition-colors duration-500', i <= step ? 'bg-ink' : 'bg-surface')} />)}</div>
        <p className="mt-2 text-[12px] text-muted">Bước {step + 1}/3</p>
      </div>
      <Title title={titles[step][0]} sub={step === 1 ? `Mã gồm 6 số đã gửi tới ${contact}` : titles[step][1]} />
      <Alert text={banner} />
      <div className="space-y-4">
        {step === 0 && <>
          <InputField label="Số điện thoại hoặc email" placeholder="09xx xxx xxx hoặc ten@email.com" value={contact} disabled={busy} error={err.contact} onChange={setContact} />
          <Primary loading={busy} onClick={next1}>Gửi mã OTP</Primary>
        </>}
        {step === 1 && <>
          <div>
            <OtpInput value={otp} onChange={setOtp} error={!!err.otp || !!banner} disabled={busy} />
            {err.otp && <span className="mt-1 block text-[12px] text-urgent">{err.otp}</span>}
          </div>
          <p className="text-[14px] text-muted">Chưa nhận được mã? <button disabled={left > 0 || busy} onClick={resend} className="font-semibold text-ink underline disabled:text-muted disabled:no-underline">{left > 0 ? `Gửi lại sau ${left}s` : 'Gửi lại'}</button></p>
          <Primary loading={busy} onClick={next2}>Xác nhận</Primary>
        </>}
        {step === 2 && <>
          <InputField kind="password" label="Mật khẩu mới" placeholder="Tối thiểu 8 ký tự" value={pw} disabled={busy} error={err.pw} onChange={setPw} />
          <InputField kind="password" label="Nhập lại mật khẩu" placeholder="Nhập lại mật khẩu mới" value={pw2} disabled={busy} error={err.pw2} onChange={setPw2} />
          <Primary loading={busy} onClick={next3}>Đặt lại mật khẩu</Primary>
        </>}
      </div>
      <div className="mt-6 text-center">
        {step > 0 ? <button disabled={busy} onClick={() => { setStep(step - 1); setErr({}); setBanner(null) }} className="inline-flex items-center gap-1 text-[14px] font-semibold"><ArrowLeft size={16} {...ic} />Quay lại</button>
          : <a href="/auth/login" className="inline-flex items-center gap-1 text-[14px] font-semibold"><ArrowLeft size={16} {...ic} />Về đăng nhập</a>}
      </div>
    </AuthShell>
  )
}
