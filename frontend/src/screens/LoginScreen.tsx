'use client'

import { useEffect, useState } from 'react'
import { PillTab, Button } from '../components/primitives'
import { InputField } from '../components/data'
import { Alert, AuthShell, OtpInput, Primary, SendCode, Title, forcedError, phoneOk, useCountdown, wait } from './AuthShell'
import { ROLE_DEMO_EMAILS, apiGoogleLogin, apiLogin, setAuthSession } from '../lib/backend-api'
import { ROLE_HOME_PATHS, getRoutePolicy } from '../components/ClientRouteShell'

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

function redirectAfterLogin(role: 'CITIZEN' | 'DISPATCHER' | 'TECHNICIAN' | 'ADMIN', nextPath: string | null) {
  if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('/auth')) {
    const policy = getRoutePolicy(nextPath)
    if (policy === 'PUBLIC' || policy === 'ANY_AUTH' || policy === role) {
      window.location.href = nextPath
      return
    }
  }
  window.location.href = ROLE_HOME_PATHS[role] ?? '/'
}

export default function LoginScreen() {
  const [nextPath, setNextPath] = useState<string | null>(null)
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    const nxt = sp.get('next')
    if (nxt) {
      setNextPath(nxt)
      const pol = getRoutePolicy(nxt)
      if (pol === 'DISPATCHER' || pol === 'TECHNICIAN' || pol === 'ADMIN') {
        setTab('Cán bộ')
      } else if (pol === 'CITIZEN') {
        setTab('Công dân')
      }
    }
  }, [])

  const reset = (t: string) => { setTab(t); setErrs({}); setBanner(null) }
  const send = async () => {
    if (!phoneOk(phone)) return setErrs({ phone: 'Số điện thoại gồm 10 số, bắt đầu bằng 0' })
    setErrs({}); setBanner(null); setBusy('send'); await wait(600); setBusy(''); setSent(true); start()
  }

  const loginCitizen = async () => {
    const e: Record<string, string> = {}
    if (!phoneOk(phone)) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0'
    else if (!sent) e.otp = 'Hãy gửi mã OTP trước'
    else if (otp.replace(/\s/g, '').length < 6) e.otp = 'Nhập đủ 6 số'
    setErrs(e); setBanner(null)
    if (Object.keys(e).length) return
    setBusy('login')
    try {
      const auth = await apiLogin(ROLE_DEMO_EMAILS.CITIZEN, 'Password123!')
      setAuthSession(auth.access_token, { ...auth.user, phone })
    } catch {
      await wait(600)
    }
    setBusy('')
    if (otp === '000000' || forcedError()) return setBanner('Mã OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.')
    redirectAfterLogin('CITIZEN', nextPath)
  }

  const loginStaff = async () => {
    const e: Record<string, string> = {}
    if (!user.trim()) e.user = 'Nhập tên đăng nhập hoặc email công vụ'
    if (!pw) e.pw = 'Nhập mật khẩu'
    setErrs(e); setBanner(null)
    if (Object.keys(e).length) return
    setBusy('login')
    try {
      const auth = await apiLogin(user.trim(), pw)
      setBusy('')
      if (forcedError()) return setBanner('Tên đăng nhập hoặc mật khẩu không đúng.')
      redirectAfterLogin(auth.user.role, nextPath)
      return
    } catch {
      await wait(500)
      setBusy('')
      return setBanner('Tên đăng nhập hoặc mật khẩu không đúng.')
    }
  }

  const google = async () => {
    setBanner(null); setBusy('google')
    try {
      await apiGoogleLogin('mock_google_token:citizen@danang.gov.vn')
    } catch {
      try {
        await apiLogin(ROLE_DEMO_EMAILS.CITIZEN, 'Password123!')
      } catch {
        await wait(500)
      }
    }
    setBusy('')
    redirectAfterLogin('CITIZEN', nextPath)
  }

  const quickFillStaff = (role: 'DISPATCHER' | 'TECHNICIAN' | 'ADMIN') => {
    setTab('Cán bộ')
    setUser(ROLE_DEMO_EMAILS[role])
    setPw('Password123!')
    setErrs({})
    setBanner(null)
  }

  const loading = busy !== ''
  const requiredPolicy = nextPath ? getRoutePolicy(nextPath) : 'PUBLIC'

  return (
    <AuthShell headline={<>Mỗi phản ánh,<br />một thành phố tốt hơn.</>}>
      <Title title="Đăng nhập" sub="Chọn không gian làm việc của bạn" />
      {nextPath && (
        <div className="mb-4 rounded-tile bg-surface p-3 text-[12px] text-ink">
          Vui lòng đăng nhập{' '}
          {requiredPolicy !== 'PUBLIC' && requiredPolicy !== 'ANY_AUTH' ? (
            <strong>
              vai trò{' '}
              {requiredPolicy === 'CITIZEN'
                ? 'Công dân'
                : requiredPolicy === 'DISPATCHER'
                  ? 'Điều phối viên IOC'
                  : requiredPolicy === 'TECHNICIAN'
                    ? 'Kỹ thuật viên'
                    : 'Quản trị'}
            </strong>
          ) : (
            'tài khoản của bạn'
          )}{' '}
          để tiếp tục vào <code className="font-mono font-semibold">{nextPath}</code>.
        </div>
      )}
      <div className="mb-5"><PillTab tone="ink" items={['Công dân', 'Cán bộ']} value={tab} onChange={reset} /></div>
      <Alert text={banner} />
      {tab === 'Công dân' ? (
        <div className="space-y-4">
          <Google loading={busy === 'google'} onClick={google} />
          <div className="flex items-center gap-3 text-[12px] text-muted"><span className="h-px flex-1 bg-surface" />hoặc dùng số điện thoại<span className="h-px flex-1 bg-surface" /></div>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1"><InputField key={`phone-${phone}`} label="Số điện thoại" placeholder="09xx xxx xxx" value={phone} disabled={loading} error={errs.phone} onChange={setPhone} /></div>
            <div className={errs.phone ? 'mb-6' : ''}><SendCode onSend={send} left={left} loading={busy === 'send'} disabled={loading} /></div>
          </div>
          {sent && (
            <div className="animate-rise">
              <span className="mb-1 block text-[12px] text-muted">Mã OTP 6 số đã gửi tới {phone} (Demo: 123456)</span>
              <OtpInput value={otp} onChange={setOtp} error={!!errs.otp || !!banner} disabled={loading} />
              {errs.otp && <span className="mt-1 block text-[12px] text-urgent">{errs.otp}</span>}
            </div>
          )}
          {!sent && errs.otp && <span className="block text-[12px] text-urgent">{errs.otp}</span>}
          <Primary loading={busy === 'login'} disabled={loading && busy !== 'login'} onClick={loginCitizen}>Đăng nhập</Primary>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-tile bg-surface p-2.5">
            <p className="mb-1.5 text-[11px] font-semibold text-muted">Điền nhanh tài khoản cán bộ (Demo):</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => quickFillStaff('DISPATCHER')} className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-ink shadow-card transition hover:bg-ink hover:text-white">Điều phối IOC</button>
              <button type="button" onClick={() => quickFillStaff('TECHNICIAN')} className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-ink shadow-card transition hover:bg-ink hover:text-white">Kỹ thuật viên</button>
              <button type="button" onClick={() => quickFillStaff('ADMIN')} className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-ink shadow-card transition hover:bg-ink hover:text-white">Quản trị Admin</button>
            </div>
          </div>
          <InputField key={`u-${user}`} label="Tên đăng nhập / Email công vụ" placeholder="vd: dispatcher@danang.gov.vn" value={user} disabled={loading} error={errs.user} onChange={setUser} />
          <InputField key={`p-${user}`} kind="password" label="Mật khẩu" placeholder="Nhập mật khẩu" value={pw} disabled={loading} error={errs.pw} onChange={setPw} />
          <div className="text-right"><a href="/auth/forgot-password" className="text-[12px] font-semibold underline">Quên mật khẩu?</a></div>
          <Primary loading={busy === 'login'} onClick={loginStaff}>Đăng nhập</Primary>
        </div>
      )}
      <p className="mt-5 text-center text-[14px] text-muted">Chưa có tài khoản? <a href="/auth/register" className="font-semibold text-ink underline">Đăng ký</a></p>
    </AuthShell>
  )
}
