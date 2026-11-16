'use client'

import { useState } from 'react'
import { InputField } from '../components/data'
import { Alert, AuthShell, OtpInput, Primary, SendCode, Title, forcedError, phoneOk, useCountdown, wait } from './AuthShell'

export default function RegisterScreen() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [pw, setPw] = useState('')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [busy, setBusy] = useState<'' | 'send' | 'submit'>('')
  const [done, setDone] = useState(false)
  const [left, start] = useCountdown()

  const send = async () => {
    if (!phoneOk(phone)) return setErrs((e) => ({ ...e, phone: 'Số điện thoại gồm 10 số, bắt đầu bằng 0' }))
    setErrs((e) => ({ ...e, phone: '' })); setBusy('send'); await wait(900); setBusy(''); setSent(true); start()
  }
  const submit = async () => {
    const e: Record<string, string> = {}
    if (name.trim().split(/\s+/).length < 2) e.name = 'Nhập đầy đủ họ và tên'
    if (!phoneOk(phone)) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0'
    else if (!sent) e.otp = 'Hãy gửi mã OTP để xác thực số điện thoại'
    else if (otp.replace(/\s/g, '').length < 6) e.otp = 'Nhập đủ 6 số OTP'
    if (pw.length < 8) e.pw = 'Mật khẩu tối thiểu 8 ký tự'
    setErrs(e); setBanner(null)
    if (Object.keys(e).length) return
    setBusy('submit'); await wait(1200); setBusy('')
    if (otp === '000000' || forcedError()) return setBanner('Mã OTP không đúng hoặc số điện thoại đã được đăng ký.')
    setDone(true)
    setTimeout(() => { window.location.href = '/' }, 1500)
  }
  const loading = busy !== ''
  const strength = Math.min(4, [pw.length >= 8, /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length)

  return (
    <AuthShell headline={<>Lưu giữ mọi phản ánh<br />của bạn ở một nơi.</>}>
      <Title title="Đăng ký tài khoản" sub="Dành cho công dân Đà Nẵng" />
      <Alert text={banner} />
      <Alert tone="success" text={done ? 'Đăng ký thành công, đang chuyển bạn về trang chủ…' : null} />
      <div className="space-y-4">
        <InputField label="Họ và tên" placeholder="Nguyễn Văn A" value={name} disabled={loading || done} error={errs.name} onChange={setName} />
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1"><InputField label="Số điện thoại" placeholder="09xx xxx xxx" value={phone} disabled={loading || done} error={errs.phone} onChange={setPhone} /></div>
          <div className={errs.phone ? 'mb-6' : ''}><SendCode onSend={send} left={left} loading={busy === 'send'} disabled={loading || done} /></div>
        </div>
        {sent && (
          <div className="animate-rise">
            <span className="mb-1 block text-[12px] text-muted">Mã OTP 6 số</span>
            <OtpInput value={otp} onChange={setOtp} error={!!errs.otp || !!banner} disabled={loading || done} />
          </div>
        )}
        {errs.otp && <span className="block text-[12px] text-urgent">{errs.otp}</span>}
        <div>
          <InputField kind="password" label="Mật khẩu" placeholder="Tối thiểu 8 ký tự" value={pw} disabled={loading || done} error={errs.pw} onChange={setPw} />
          <div className="mt-2 flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full transition ${i < strength ? (strength < 3 ? 'bg-high' : 'bg-done') : 'bg-surface'}`} />)}</div>
        </div>
        <Primary loading={busy === 'submit'} disabled={done} onClick={submit}>Đăng ký tài khoản</Primary>
      </div>
      <p className="mt-6 text-center text-[14px] text-muted">Đã có tài khoản? <a href="/auth/login" className="font-semibold text-ink underline">Đăng nhập</a></p>
    </AuthShell>
  )
}
