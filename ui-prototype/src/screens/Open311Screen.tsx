import { useState, type ReactNode } from 'react'
import { Check, Copy, Download, MapPin, Play } from 'lucide-react'
import { Button, Dropdown, Skeleton, cn, ic } from '../components/primitives'
import { InputField } from '../components/data'
import { kindLabel } from './HomeScreen'
import { getTickets, statusLabel } from '../data/tickets'
import { zoneSeed, zonesGeoJson } from './ZonesScreen'

const BASE = 'https://api.urbana.danang.gov.vn/open311/v2'
const services = [
  { service_code: 'FLOOD', service_name: 'Ngập úng', type: 'realtime' }, { service_code: 'TREE', service_name: 'Cây đổ', type: 'realtime' },
  { service_code: 'ROAD', service_name: 'Hư hỏng mặt đường', type: 'realtime' }, { service_code: 'MANHOLE', service_name: 'Hố ga, nắp cống', type: 'realtime' },
  { service_code: 'LIGHT', service_name: 'Đèn chiếu sáng', type: 'realtime' }, { service_code: 'TRASH', service_name: 'Rác thải', type: 'realtime' },
]
const codeOf: Record<string, string> = { road: 'ROAD', flood: 'FLOOD', tree: 'TREE', trash: 'TRASH', light: 'LIGHT' }
const requests = getTickets().map((t) => ({
  service_request_id: t.id, status: ['CONFIRMED', 'CLOSED', 'REJECTED'].includes(t.status) ? 'closed' : 'open', status_notes: statusLabel[t.status],
  service_code: codeOf[t.kind], service_name: kindLabel[t.kind] === 'Đường' ? 'Hư hỏng mặt đường' : kindLabel[t.kind],
  description: t.title, address: `${t.address}`, lat: t.gps.lat, long: t.gps.lng, requested_datetime: new Date(t.submittedAt).toISOString(),
}))
type Id = 'services' | 'post' | 'get'
const endpoints: { id: Id; method: 'GET' | 'POST'; path: string; title: string; desc: string }[] = [
  { id: 'services', method: 'GET', path: '/services.json', title: 'Danh mục dịch vụ', desc: 'Liệt kê các loại sự cố có thể phản ánh.' },
  { id: 'post', method: 'POST', path: '/requests.json', title: 'Gửi phản ánh', desc: 'Tạo phiếu sự cố mới, trả về mã phiếu và token.' },
  { id: 'get', method: 'GET', path: '/requests.json', title: 'Danh sách phản ánh', desc: 'Tra cứu phiếu theo loại và trạng thái.' },
]

function Json({ data }: { data: unknown }) {
  const text = JSON.stringify(data, null, 2)
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+\.?\d*/g)) {
    out.push(text.slice(last, m.index))
    const cls = m[1] ? (m[2] ? 'text-white' : 'text-[#7ee2a8]') : m[3] ? 'text-[#f5b400]' : 'text-[#ff9a8f]'
    out.push(<span key={m.index} className={cls}>{m[1] ? m[1] : m[0]}{m[2] ?? ''}</span>)
    last = (m.index ?? 0) + m[0].length
  }
  out.push(text.slice(last))
  return <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-white/60">{out}</pre>
}

type Res = { status: number; ms: number; body: unknown }
const ALL = 'Tất cả'

export default function Open311Screen() {
  const [sel, setSel] = useState<Id>('services')
  const [svc, setSvc] = useState(ALL)
  const [stat, setStat] = useState(ALL)
  const [limit, setLimit] = useState('5')
  const [f, setF] = useState({ service_code: '', lat: '16.0678', long: '108.2208', description: '', address_string: '' })
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Res | null>(null)
  const [copied, setCopied] = useState(false)
  const [dl, setDl] = useState(false)

  const ep = endpoints.find((e) => e.id === sel)!
  const qs = sel === 'get' ? new URLSearchParams({ ...(svc !== ALL && { service_code: svc }), ...(stat !== ALL && { status: stat }), limit }).toString() : ''
  const url = `${BASE}${ep.path}${qs ? `?${qs}` : ''}`
  const curl = sel === 'post'
    ? `curl -X POST "${url}" \\\n  -d service_code=${f.service_code || '…'} \\\n  -d lat=${f.lat} -d long=${f.long} \\\n  -d description="${f.description || '…'}"`
    : `curl "${url}"`

  const pick = (id: Id) => { setSel(id); setRes(null); setErrs({}) }
  const run = async () => {
    const e: Record<string, string> = {}
    if (sel === 'post') {
      if (!services.some((s) => s.service_code === f.service_code)) e.service_code = 'Chọn loại dịch vụ'
      if (!(Number(f.lat) >= 15.9 && Number(f.lat) <= 16.2)) e.lat = 'lat trong khoảng 15.9 – 16.2'
      if (!(Number(f.long) >= 107.9 && Number(f.long) <= 108.35)) e.long = 'long trong khoảng 107.9 – 108.35'
      if (f.description.trim().length < 10) e.description = 'Mô tả tối thiểu 10 ký tự'
    }
    if (sel === 'get' && !(Number(limit) >= 1 && Number(limit) <= 50)) e.limit = 'limit từ 1 đến 50'
    setErrs(e)
    if (Object.keys(e).length) return
    setBusy(true); setRes(null)
    const t0 = performance.now()
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 500))
    let status = 200, body: unknown
    if (new URLSearchParams(window.location.search).get('state') === 'error') { status = 500; body = [{ code: 500, description: 'Internal server error' }] }
    else if (sel === 'services') body = services
    else if (sel === 'post') { status = 201; body = [{ service_request_id: `DN-202610-${150 + Math.floor(Math.random() * 40)}`, service_notice: 'Phản ánh đã được tiếp nhận', account_id: null, token: Math.random().toString(36).slice(2, 12) }] }
    else body = requests.filter((r) => (svc === ALL || r.service_code === svc) && (stat === ALL || r.status === stat)).slice(0, Number(limit))
    setRes({ status, ms: Math.round(performance.now() - t0), body }); setBusy(false)
  }
  const copy = () => { navigator.clipboard?.writeText(JSON.stringify(res?.body, null, 2)).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(zonesGeoJson(zoneSeed), null, 2)], { type: 'application/geo+json' }))
    a.download = 'ranh-gioi-da-nang.geojson'; a.click(); setDl(true); setTimeout(() => setDl(false), 1800)
  }
  const ok = res && res.status < 400

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-[1440px] p-4">
        <header className="animate-rise mb-4 flex items-end justify-between">
          <div>
            <a href="/" className="mb-3 inline-flex items-center gap-2 text-[14px] font-bold"><span className="flex size-8 items-center justify-center rounded-full bg-ink text-white"><MapPin size={16} {...ic} /></span>Urbana · Developers</a>
            <h1 className="text-[24px] font-bold">Open311 API</h1>
            <p className="mt-1 text-[12px] text-muted">Dữ liệu phản ánh đô thị mở của thành phố Đà Nẵng, chuẩn GeoReport v2</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 items-center rounded-full bg-card px-3 font-mono text-[12px] shadow-card">{BASE}</span>
            <Button icon={dl ? Check : Download} variant={dl ? 'subtle' : 'primary'} onClick={download}>{dl ? 'Đã tải' : 'Tải GeoJSON ranh giới'}</Button>
          </div>
        </header>

        <div className="grid grid-cols-[440px_1fr] gap-4">
          <section className="flex flex-col gap-3 rounded-card bg-surface p-3">
            <h2 className="px-2 pt-1 text-[16px] font-semibold">Endpoint</h2>
            {endpoints.map((e) => (
              <button key={e.id} onClick={() => pick(e.id)} className={cn('animate-rise rounded-card bg-card p-4 text-left shadow-card transition hover:-translate-y-0.5', sel === e.id && 'ring-2 ring-ink')}>
                <div className="flex items-center gap-3">
                  <span className={cn('inline-flex h-6 w-14 items-center justify-center rounded-full text-[12px] font-bold', e.method === 'GET' ? 'bg-done/10 text-done' : 'bg-ink text-white')}>{e.method}</span>
                  <code className="font-mono text-[14px] font-semibold">{e.path}</code>
                </div>
                <p className="mt-3 text-[14px] font-semibold">{e.title}</p>
                <p className="mt-0.5 text-[12px] text-muted">{e.desc}</p>
              </button>
            ))}
            <div className="mt-1 rounded-card bg-card p-4 shadow-card">
              <p className="text-[14px] font-semibold">Ranh giới hành chính</p>
              <p className="mt-0.5 mb-3 text-[12px] text-muted">7 vùng của Đà Nẵng dưới dạng GeoJSON FeatureCollection, dùng để vẽ lớp bản đồ hoặc kiểm tra tọa độ.</p>
              <Button size="sm" variant="subtle" icon={Download} onClick={download}>Tải GeoJSON</Button>
            </div>
          </section>

          <section className="animate-rise flex flex-col gap-4 rounded-card bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-3 text-[16px] font-semibold"><span className={cn('inline-flex h-6 items-center rounded-full px-3 text-[12px] font-bold', ep.method === 'GET' ? 'bg-done/10 text-done' : 'bg-ink text-white')}>{ep.method}</span>Thử API</h2>
              <Button icon={Play} loading={busy} onClick={run}>Gửi yêu cầu</Button>
            </div>

            {sel === 'services' && <p className="rounded-tile bg-surface p-3 text-[14px] text-muted">Endpoint này không có tham số. Bấm "Gửi yêu cầu" để lấy danh mục dịch vụ.</p>}
            {sel === 'get' && (
              <div className="grid grid-cols-3 gap-3">
                <div><span className="mb-1 block text-[12px] text-muted">service_code</span><Dropdown placeholder="Loại" value={svc} options={[ALL, ...services.map((s) => s.service_code)]} onChange={setSvc} /></div>
                <div><span className="mb-1 block text-[12px] text-muted">status</span><Dropdown placeholder="Trạng thái" value={stat} options={[ALL, 'open', 'closed']} onChange={setStat} /></div>
                <InputField label="limit" placeholder="5" value={limit} error={errs.limit} onChange={setLimit} />
              </div>
            )}
            {sel === 'post' && (
              <div className="grid grid-cols-2 gap-3">
                <div><span className="mb-1 block text-[12px] text-muted">service_code</span><Dropdown placeholder="Chọn loại" value={f.service_code} options={services.map((s) => s.service_code)} invalid={!!errs.service_code} onChange={(v) => setF({ ...f, service_code: v })} />{errs.service_code && <span className="mt-1 block text-[12px] text-urgent">{errs.service_code}</span>}</div>
                <InputField label="address_string" placeholder="124 Lê Duẩn, Hải Châu" value={f.address_string} onChange={(v) => setF({ ...f, address_string: v })} />
                <InputField label="lat" placeholder="16.0678" value={f.lat} error={errs.lat} onChange={(v) => setF({ ...f, lat: v })} />
                <InputField label="long" placeholder="108.2208" value={f.long} error={errs.long} onChange={(v) => setF({ ...f, long: v })} />
                <div className="col-span-2"><InputField label="description" placeholder="Ngập úng nặng trước số 124, xe máy không đi qua được" value={f.description} error={errs.description} onChange={(v) => setF({ ...f, description: v })} /></div>
              </div>
            )}

            <div>
              <p className="mb-1 text-[12px] text-muted">Yêu cầu</p>
              <pre className="overflow-x-auto rounded-tile bg-surface p-3 font-mono text-[12px] leading-relaxed">{curl}</pre>
            </div>

            <div className="flex min-h-[320px] flex-1 flex-col rounded-card bg-ink p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-white/70">Phản hồi
                  {res && <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-bold', ok ? 'bg-done text-white' : 'bg-accent text-white')}>{res.status}</span>}
                  {res && <span className="tabular-nums">{res.ms} ms</span>}
                </span>
                {res && <button onClick={copy} className="inline-flex h-8 items-center gap-1 rounded-full bg-white/10 px-3 text-[12px] font-semibold text-white transition hover:bg-white/20">{copied ? <Check size={14} {...ic} /> : <Copy size={14} {...ic} />}{copied ? 'Đã chép' : 'Sao chép'}</button>}
              </div>
              <div className="max-h-[420px] flex-1 overflow-auto">
                {busy && <div className="space-y-2"><Skeleton dark className="h-4 w-1/3" /><Skeleton dark className="h-4 w-2/3" /><Skeleton dark className="h-4 w-1/2" /><Skeleton dark className="h-4 w-3/4" /></div>}
                {!busy && !res && <p className="text-[14px] text-white/50">Chưa có phản hồi. Bấm "Gửi yêu cầu" để thử.</p>}
                {!busy && res && <Json data={res.body} />}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
