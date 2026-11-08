import { useEffect, useRef, useState } from 'react'
import { Check, Copy, MessageCircle, Phone, Search } from 'lucide-react'
import { Button, cn, ic } from '../components/primitives'
import { InputField } from '../components/data'
import ExceptionShell from '../components/ExceptionShell'

const go = (href: string) => () => { window.location.href = href }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const home: Record<string, string> = { citizen: '/', dispatcher: '/dispatcher/command-center', technician: '/technician/tasks', admin: '/admin/analytics' }
const hotline = 'inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-semibold whitespace-nowrap transition active:scale-95'

/* 30. 404 */
export function NotFoundScreen() {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const find = async () => {
    const c = code.trim().toUpperCase()
    if (!/^DN-\d{6}-\d{4}$/.test(c)) return setErr('Mã phiếu có dạng DN-202610-0124')
    setErr(''); setBusy(true); await sleep(700); setBusy(false)
    window.location.href = `/tracking/${c}`
  }
  return (
    <ExceptionShell art="notfound" title="Không tìm thấy trang" sub="Đường dẫn hoặc mã phiếu sự cố không tồn tại"
      actions={<><Button variant="subtle" size="lg" onClick={go('/report')}>Gửi phản ánh mới</Button><Button size="lg" onClick={go('/')}>Về Trang chủ</Button></>}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1"><InputField kind="search" placeholder="Tìm mã phiếu, vd DN-202610-0124" value={code} error={err} disabled={busy} onChange={(v) => { setCode(v); setErr('') }} /></div>
        <Button loading={busy} icon={Search} onClick={find}>Tìm</Button>
      </div>
    </ExceptionShell>
  )
}

/* 31. 403 */
export function ForbiddenScreen() {
  const [busy, setBusy] = useState(false)
  const role = localStorage.getItem('urbana.role') ?? 'citizen'
  const out = async () => { setBusy(true); await sleep(800); localStorage.removeItem('urbana.role'); window.location.href = '/auth/login' }
  return (
    <ExceptionShell art="forbidden" title="Khu vực tác chiến nội bộ" sub="Bạn không có quyền truy cập"
      actions={<><Button variant="subtle" size="lg" loading={busy} onClick={out}>Đăng xuất đổi tài khoản</Button><Button size="lg" disabled={busy} onClick={go(home[role] ?? '/')}>Về trang làm việc của bạn</Button></>} />
  )
}

/* 32. 500 */
export function ServerErrorScreen() {
  const [trace] = useState(() => `TR-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(trace).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600) }
  const reload = async () => { setBusy(true); await sleep(800); window.location.reload() }
  return (
    <ExceptionShell art="server" title="Máy chủ đang xử lý lỗi đột xuất" sub="Vui lòng thử lại sau"
      actions={<><Button variant="subtle" size="lg" loading={busy} onClick={reload}>Tải lại trang</Button><a href="tel:1022" className={cn(hotline, 'bg-accent text-white shadow-card hover:bg-accent/90')}><Phone size={16} {...ic} />Gọi hotline hỗ trợ 1022</a></>}>
      <div className="flex items-center justify-between gap-3 rounded-tile bg-surface p-3">
        <div className="min-w-0"><p className="text-[12px] text-muted">Mã tham chiếu lỗi (Trace ID)</p><p className="truncate text-[14px] font-semibold tabular-nums">{trace}</p></div>
        <button onClick={copy} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-card px-3 text-[12px] font-semibold shadow-card transition active:scale-95">{copied ? <Check size={14} {...ic} /> : <Copy size={14} {...ic} />}{copied ? 'Đã chép' : 'Sao chép'}</button>
      </div>
    </ExceptionShell>
  )
}

/* 33. Bảo trì */
export function MaintenanceScreen() {
  const target = useRef(Number(sessionStorage.getItem('urbana.maint')) || Date.now() + (2 * 3600 + 15 * 60) * 1000)
  useEffect(() => { sessionStorage.setItem('urbana.maint', String(target.current)) }, [])
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i) }, [])
  const left = Math.max(0, Math.round((target.current - now) / 1000))
  const parts: [number, string][] = [[Math.floor(left / 3600), 'giờ'], [Math.floor((left % 3600) / 60), 'phút'], [left % 60, 'giây']]
  return (
    <ExceptionShell art="maintenance" title="Hệ thống đang bảo trì định kỳ" sub={left ? 'Dự kiến mở lại dịch vụ sau' : 'Dịch vụ đã sẵn sàng trở lại'}
      actions={<><a href="tel:1022" className={cn(hotline, 'bg-ink text-white hover:bg-ink/85')}><Phone size={16} {...ic} />Tổng đài 1022 Đà Nẵng</a><a href="https://facebook.com" target="_blank" rel="noreferrer" className={cn(hotline, 'bg-surface hover:bg-page')}><MessageCircle size={16} {...ic} />Fanpage Facebook IOC</a></>}>
      {left > 0 ? (
        <div className="grid grid-cols-3 gap-3" aria-live="off">
          {parts.map(([n, l], i) => (
            <div key={l} className={cn('rounded-tile py-3 text-center', i === 0 ? 'bg-ink text-white' : 'bg-surface')}>
              <p className="text-[32px] leading-none font-bold tabular-nums">{String(n).padStart(2, '0')}</p>
              <p className={cn('mt-1 text-[12px]', i === 0 ? 'text-white/70' : 'text-muted')}>{l}</p>
            </div>
          ))}
        </div>
      ) : <div className="[&>button]:w-full"><Button size="lg" onClick={() => { sessionStorage.removeItem('urbana.maint'); window.location.href = '/' }}>Vào lại hệ thống</Button></div>}
      <p className="mt-4 text-center text-[12px] text-muted">Trong thời gian bảo trì, bạn vẫn gửi được phản ánh qua một trong hai kênh bên dưới.</p>
    </ExceptionShell>
  )
}

/* 34. Ngoại tuyến */
const queue = [
  { t: 'Ngập úng đường Lê Duẩn', d: '2 ảnh · 09:42' },
  { t: 'Cây đổ Điện Biên Phủ', d: '3 ảnh · 09:15' },
  { t: 'Biên bản nghiệm thu DN-202610-0121', d: '4 ảnh · 08:58' },
]
export function OfflineScreen() {
  const [pending, setPending] = useState(queue)
  const [busy, setBusy] = useState(false)
  const [tries, setTries] = useState(0)
  const [msg, setMsg] = useState<null | { ok: boolean; text: string }>(null)
  const retry = async () => {
    setBusy(true); setMsg(null); await sleep(1400); setBusy(false)
    if (tries === 0 && new URLSearchParams(window.location.search).get('state') !== 'online') { setTries(1); return setMsg({ ok: false, text: 'Vẫn chưa có kết nối mạng. Dữ liệu vẫn được giữ trên máy.' }) }
    setPending([]); setMsg({ ok: true, text: `Đã gửi ${queue.length} phiếu lên máy chủ.` })
  }
  return (
    <ExceptionShell art="offline" title="Bạn đang ngoại tuyến" sub="Dữ liệu và ảnh chụp đã được lưu an toàn trên máy"
      actions={<><Button variant="subtle" size="lg" onClick={go('/')}>Về Trang chủ</Button><Button size="lg" loading={busy} onClick={retry}>Thử gửi lại ngay</Button></>}>
      {msg && <div role="alert" className={cn('mb-3 animate-rise rounded-tile p-3 text-[14px]', msg.ok ? 'bg-done/10 text-done' : 'bg-urgent/10 text-urgent')}>{msg.text}</div>}
      <div className="flex items-center justify-between px-1 pb-2"><h2 className="text-[14px] font-semibold">Phiếu chờ gửi</h2><span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-2 text-[12px] font-semibold text-white tabular-nums">{pending.length}</span></div>
      {pending.length ? (
        <ul className="divide-y divide-white rounded-tile bg-surface">
          {pending.map((p) => <li key={p.t} className="flex items-center justify-between gap-3 px-3 py-3"><span className="min-w-0 truncate text-[14px] font-medium">{p.t}</span><span className="shrink-0 text-[12px] text-muted">{p.d}</span></li>)}
        </ul>
      ) : <p className="rounded-tile bg-surface p-4 text-center text-[14px] text-muted">Không còn phiếu nào chờ gửi</p>}
    </ExceptionShell>
  )
}
