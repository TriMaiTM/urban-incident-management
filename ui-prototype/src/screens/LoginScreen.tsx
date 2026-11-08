import { useState } from 'react'
import { PillTab, Button } from '../components/primitives'
import { InputField } from '../components/data'
import { Alert, AuthShell, OtpInput, Primary, SendCode, Title, forcedError, phoneOk, useCountdown, wait } from './AuthShell'

function Google({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <div className="[&>button]:w-full">
      <Button variant="secondary" size="lg" loading={loading} onClick={onClick}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" /><path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.100-4.600H2.300v2.800A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.900 14c-.2-.7-.4-1.300-.4-2s.1-1.400.4-2V7.200H2.300a11 11 0 0 0 0 9.600z" /><path fill="#EA4335" d="M12 5.400c1.600 0 3.100.6 4.200 1.700l3.100-3.100A11 11 0 0 0 2.300 7.200L5.900 10c.8-2.700 3.200-4.600 6.100-4.600z" /></svg>
        Tiếp tục với Google
      </Button>
    </div>
  )
}

function go(user: string) {
  const u = user.toLowerCase()
  window.location.href = u.includes('admin') ? '/admin/analytics' : u.includes('kt') ? '/technician/tasks' : '/dispatcher/command-center'
}

export default function LoginScreen() {
  const [tab, setTab] = useState('Công dân')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [user, setUser] = useState('')
  const [pw, setPw] = useState('')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [busy, setBusy] = useState<'' | 'send' | 'login' | 'google'>('')
  const [left, start] = useCountdown()

  const reset = (t: string) => { setTab(t); setErrs({}); setBanner(null) }
  const send = async () => {
    if (!phoneOk(phone)) return setErrs({ phone: 'Số điện thoại gồm 10 số, bắt đầu bằng 0' })
    setErrs({}); setBanner(null); setBusy('send'); await wait(900); setBusy(''); setSent(true); start()
  }
  const loginCitizen = async () => {
    const e: Record<string, string> = {}
    if (!phoneOk(phone)) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0'
    else if (!sent) e.otp = 'Hãy gửi mã OTP trước'
    else if (otp.replace(/\s/g, '').length < 6) e.otp = 'Nhập đủ 6 số'
    setErrs(e); setBanner(null)
    if (Object.keys(e).length) return
    setBusy('login'); await wait()
    setBusy('')
    if (otp === '000000' || forcedError()) return setBanner('Mã OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.')
    window.location.href = '/'
  }
  const loginStaff = async () => {
    const e: Record<string, string> = {}
    if (!user.trim()) e.user = 'Nhập tên đăng nhập hoặc email công vụ'
    if (!pw) e.pw = 'Nhập mật khẩu'
    setErrs(e); setBanner(null)
    if (Object.keys(e).length) return
    setBusy('login'); await wait()
    setBusy('')
    if (pw === 'sai' || forcedError()) return setBanner('Tên đăng nhập hoặc mật khẩu không đúng.')
    go(user)
  }
  const google = async () => { setBanner(null); setBusy('google'); await wait(); setBusy(''); window.location.href = '/' }
  const loading = busy !== ''

  return (
    <AuthShell headline={<>Mỗi phản ánh,<br />một thành phố tốt hơn.</>}>
      <Title title="Đăng nhập" sub="Chọn không gian làm việc của bạn" />
      <div className="mb-6"><PillTab tone="ink" items={['Công dân', 'Cán bộ']} value={tab} onChange={reset} /></div>
      <Alert text={banner} />
      {tab === 'Công dân' ? (
        <div className="space-y-4">
          <Google loading={busy === 'google'} onClick={google} />
          <div className="flex items-center gap-3 text-[12px] text-muted"><span className="h-px flex-1 bg-surface" />hoặc dùng số điện thoại<span className="h-px flex-1 bg-surface" /></div>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1"><InputField label="Số điện thoại" placeholder="09xx xxx xxx" value={phone} disabled={loading} error={errs.phone} onChange={setPhone} /></div>
            <div className={errs.phone ? 'mb-6' : ''}><SendCode onSend={send} left={left} loading={busy === 'send'} disabled={loading} /></div>
          </div>
          {sent && (
            <div className="animate-rise">
              <span className="mb-1 block text-[12px] text-muted">Mã OTP 6 số đã gửi tới {phone}</span>
              <OtpInput value={otp} onChange={setOtp} error={!!errs.otp || !!banner} disabled={loading} />
              {errs.otp && <span className="mt-1 block text-[12px] text-urgent">{errs.otp}</span>}
            </div>
          )}
          {!sent && errs.otp && <span className="block text-[12px] text-urgent">{errs.otp}</span>}
          <Primary loading={busy === 'login'} disabled={loading && busy !== 'login'} onClick={loginCitizen}>Đăng nhập</Primary>
        </div>
      ) : (
        <div className="space-y-4">
          <InputField label="Tên đăng nhập / Email công vụ" placeholder="vd: kt.hung hoặc ten@danang.gov.vn" value={user} disabled={loading} error={errs.user} onChange={setUser} />
          <InputField kind="password" label="Mật khẩu" placeholder="Nhập mật khẩu" value={pw} disabled={loading} error={errs.pw} onChange={setPw} />
          <div className="text-right"><a href="/auth/forgot-password" className="text-[12px] font-semibold underline">Quên mật khẩu?</a></div>
          <Primary loading={busy === 'login'} onClick={loginStaff}>Đăng nhập</Primary>
        </div>
      )}
      <p className="mt-6 text-center text-[14px] text-muted">Chưa có tài khoản? <a href="/auth/register" className="font-semibold text-ink underline">Đăng ký</a></p>
    </AuthShell>
  )
}
