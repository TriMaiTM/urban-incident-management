import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Camera, LogOut } from 'lucide-react'
import { Button, ic } from '../components/primitives'
import { InputField } from '../components/data'
import { AdminRail, currentRole } from '../components/nav'
import { Alert, phoneOk, wait, forcedError } from './AuthShell'
import CitizenShell from './CitizenShell'
import DispatcherShell from './DispatcherShell'
import TechnicianShell from './TechnicianShell'

const roles = {
  citizen: { name: 'Nguyễn Minh Anh', label: 'Công dân', sub: 'Tài khoản công dân, Hải Châu' },
  dispatcher: { name: 'Trần Minh Quân', label: 'Điều phối viên IOC', sub: 'Trung tâm điều hành IOC Đà Nẵng' },
  technician: { name: 'Lê Văn Hùng', label: 'Kỹ thuật viên', sub: 'Đội cầu đường Hải Châu' },
  admin: { name: 'Nguyễn Hoàng Anh', label: 'Quản trị', sub: 'Sở Xây dựng Đà Nẵng' },
} as const

function Frame({ role, sub, children }: { role: keyof typeof roles; sub: string; children: ReactNode }) {
  if (role === 'citizen') return <CitizenShell title="Hồ sơ cá nhân" sub={sub}>{children}</CitizenShell>
  if (role === 'technician') return <TechnicianShell title="Hồ sơ cá nhân" subtitle={sub}>{children}</TechnicianShell>
  if (role === 'dispatcher') return <DispatcherShell title="Hồ sơ cá nhân" subtitle={sub}>{children}</DispatcherShell>
  return (
    <div className="fixed inset-0 overflow-auto bg-page">
      <div className="flex min-h-screen w-[1440px] gap-4 p-4">
        <div className="shrink-0"><AdminRail /></div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="animate-rise"><h1 className="text-[24px] font-bold">Hồ sơ cá nhân</h1><p className="mt-1 text-[12px] text-muted">{sub}</p></header>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function ProfileScreen() {
  const role = (currentRole() in roles ? currentRole() : 'citizen') as keyof typeof roles
  const info = roles[role]
  const [name, setName] = useState<string>(info.name)
  const [phone, setPhone] = useState('0905123456')
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pe, setPe] = useState<Record<string, string>>({})
  const [pwe, setPwe] = useState<Record<string, string>>({})
  const [pBanner, setPBanner] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [wBanner, setWBanner] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [busy, setBusy] = useState<'' | 'profile' | 'pw' | 'out'>('')
  const [photo, setPhoto] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const [key, setKey] = useState(0)
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo) }, [photo])

  const saveProfile = async () => {
    const e: Record<string, string> = {}
    if (name.trim().split(/\s+/).length < 2) e.name = 'Nhập đầy đủ họ và tên'
    if (!phoneOk(phone)) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0'
    setPe(e); setPBanner(null)
    if (Object.keys(e).length) return
    setBusy('profile'); await wait(); setBusy('')
    setPBanner(forcedError() ? { tone: 'error', text: 'Không lưu được, vui lòng thử lại.' } : { tone: 'success', text: 'Đã lưu thông tin' })
  }
  const savePw = async () => {
    const e: Record<string, string> = {}
    if (!cur) e.cur = 'Nhập mật khẩu hiện tại'
    if (pw.length < 8) e.pw = 'Mật khẩu mới tối thiểu 8 ký tự'
    else if (pw === cur) e.pw = 'Mật khẩu mới phải khác mật khẩu cũ'
    if (pw2 !== pw) e.pw2 = 'Mật khẩu nhập lại chưa khớp'
    setPwe(e); setWBanner(null)
    if (Object.keys(e).length) return
    setBusy('pw'); await wait(); setBusy('')
    if (cur === 'sai' || forcedError()) return setWBanner({ tone: 'error', text: 'Mật khẩu hiện tại không đúng.' })
    setWBanner({ tone: 'success', text: 'Đã đổi mật khẩu' })
    setCur(''); setPw(''); setPw2(''); setKey((k) => k + 1)
  }
  const logout = async () => { setBusy('out'); await wait(800); window.location.href = '/auth/login' }
  const off = busy !== ''
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('')

  const card = 'animate-rise rounded-card bg-card p-4 shadow-card md:p-6'
  return (
    <Frame role={role} sub={info.sub}>
      <div className="grid gap-4 md:grid-cols-2">
        <section className={`${card} space-y-4`}>
          <h2 className="text-[16px] font-semibold">Thông tin cá nhân</h2>
          <div className="flex items-center gap-4">
            <button onClick={() => file.current?.click()} className="group relative size-20 shrink-0 overflow-hidden rounded-full bg-ink text-[24px] font-bold text-white" aria-label="Đổi ảnh đại diện">
              {photo ? <img src={photo} alt="" className="size-full object-cover" /> : initials}
              <span className="absolute inset-0 flex items-center justify-center bg-ink/50 opacity-0 transition group-hover:opacity-100"><Camera size={20} {...ic} /></span>
            </button>
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)) }} />
            <div>
              <p className="text-[16px] font-semibold">{name}</p>
              <span className="mt-1 inline-flex h-6 items-center rounded-full bg-surface px-3 text-[12px] font-semibold">{info.label}</span>
              <div><button onClick={() => file.current?.click()} className="mt-1 text-[12px] font-semibold underline">Đổi ảnh đại diện</button></div>
            </div>
          </div>
          <Alert tone={pBanner?.tone} text={pBanner?.text} />
          <InputField label="Họ và tên" placeholder="Họ và tên" value={name} disabled={off} error={pe.name} onChange={setName} />
          <InputField label="Số điện thoại" placeholder="09xx xxx xxx" value={phone} disabled={off} error={pe.phone} onChange={setPhone} />
          <div className="[&>button]:w-full"><Button loading={busy === 'profile'} disabled={off && busy !== 'profile'} onClick={saveProfile}>Lưu thay đổi</Button></div>
        </section>

        <div className="flex flex-col gap-4">
          <section key={key} className={`${card} space-y-4`}>
            <h2 className="text-[16px] font-semibold">Đổi mật khẩu</h2>
            <Alert tone={wBanner?.tone} text={wBanner?.text} />
            <InputField kind="password" label="Mật khẩu hiện tại" placeholder="Nhập mật khẩu hiện tại" disabled={off} error={pwe.cur} onChange={setCur} />
            <InputField kind="password" label="Mật khẩu mới" placeholder="Tối thiểu 8 ký tự" disabled={off} error={pwe.pw} onChange={setPw} />
            <InputField kind="password" label="Nhập lại mật khẩu mới" placeholder="Nhập lại mật khẩu mới" disabled={off} error={pwe.pw2} onChange={setPw2} />
            <div className="[&>button]:w-full"><Button variant="secondary" loading={busy === 'pw'} disabled={off && busy !== 'pw'} onClick={savePw}>Đổi mật khẩu</Button></div>
          </section>
          <section className={`${card} flex items-center justify-between gap-4`}>
            <div><h2 className="text-[16px] font-semibold">Đăng xuất</h2><p className="text-[12px] text-muted">Kết thúc phiên trên thiết bị này</p></div>
            <Button variant="subtle" icon={LogOut} loading={busy === 'out'} disabled={off && busy !== 'out'} onClick={logout}>Đăng xuất</Button>
          </section>
        </div>
      </div>
    </Frame>
  )
}
