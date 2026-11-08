import { useRef, useState } from 'react'
import { Droplets, Lightbulb, Phone, Plus, Save, Trash2, TreeDeciduous, Construction, CircleDot, X, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import { Button, IconChip, cn, ic } from '../components/primitives'
import { InputField } from '../components/data'
import AdminShell from './AdminShell'

const cats: { name: string; code: string; icon: ComponentType<LucideProps>; sla: string; n: number; on: boolean }[] = [
  { name: 'Ngập úng', code: 'FLOOD', icon: Droplets, sla: 'Khẩn cấp', n: 38, on: true },
  { name: 'Cây đổ', code: 'TREE', icon: TreeDeciduous, sla: 'Khẩn cấp', n: 21, on: true },
  { name: 'Hư hỏng mặt đường', code: 'ROAD', icon: Construction, sla: 'Cao', n: 64, on: true },
  { name: 'Hố ga, nắp cống', code: 'MANHOLE', icon: CircleDot, sla: 'Cao', n: 17, on: true },
  { name: 'Đèn chiếu sáng', code: 'LIGHT', icon: Lightbulb, sla: 'Tiêu chuẩn', n: 29, on: true },
  { name: 'Rác thải', code: 'TRASH', icon: Trash2, sla: 'Thấp', n: 45, on: false },
]
const slaFields = [
  { key: 'urgent', label: 'Khẩn cấp', dot: 'bg-urgent', def: '4' },
  { key: 'high', label: 'Cao', dot: 'bg-high', def: '12' },
  { key: 'normal', label: 'Tiêu chuẩn', dot: 'bg-normal', def: '24' },
  { key: 'low', label: 'Thấp', dot: 'bg-low', def: '48' },
]
type Unit = { name: string; head: string; phone: string; size: number }
const unitSeed: Unit[] = [
  { name: 'Đội CTĐT Hải Châu', head: 'Lê Văn Hùng', phone: '0236 3821 001', size: 12 },
  { name: 'Đội Thoát nước 2', head: 'Đặng Quốc Bảo', phone: '0236 3821 002', size: 9 },
  { name: 'Đội Cầu đường 1', head: 'Võ Thanh Tâm', phone: '0236 3821 003', size: 14 },
  { name: 'Đội Cây xanh Thanh Khê', head: 'Hoàng Minh Khoa', phone: '0236 3821 004', size: 8 },
  { name: 'Đội Điện lực Sơn Trà', head: 'Đinh Công Danh', phone: '0236 3821 005', size: 10 },
]

export default function SettingsScreen() {
  const [cat, setCat] = useState(cats)
  const [sla, setSla] = useState<Record<string, string>>(Object.fromEntries(slaFields.map((f) => [f.key, f.def])))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [units, setUnits] = useState(unitSeed)
  const [adding, setAdding] = useState(false)
  const [nu, setNu] = useState({ name: '', head: '', phone: '' })
  const [ne, setNe] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<null | { kind: 'success' | 'info'; text: string }>(null)
  const timer = useRef<number | undefined>(undefined)
  const say = (text: string) => { setToast({ kind: 'success', text }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(null), 2200) }

  const saveSla = async () => {
    const e: Record<string, string> = {}
    slaFields.forEach((f) => { const v = Number(sla[f.key]); if (!Number.isInteger(v) || v < 1 || v > 168) e[f.key] = 'Từ 1 đến 168 giờ' })
    const v = slaFields.map((f) => Number(sla[f.key]))
    if (!Object.keys(e).length && !(v[0] < v[1] && v[1] < v[2] && v[2] < v[3])) e.order = 'Thời hạn phải tăng dần: Khẩn cấp < Cao < Tiêu chuẩn < Thấp'
    setErrs(e); setFailed(false)
    if (Object.keys(e).length) return
    setSaving(true); await new Promise((r) => setTimeout(r, 900)); setSaving(false)
    if (new URLSearchParams(window.location.search).get('state') === 'error') return setFailed(true)
    say('Đã lưu cấu hình SLA')
  }
  const addUnit = () => {
    const e: Record<string, string> = {}
    if (!nu.name.trim()) e.name = 'Nhập tên đơn vị'
    if (!/^[\d\s]{9,14}$/.test(nu.phone.trim())) e.phone = 'Số điện thoại chưa hợp lệ'
    setNe(e)
    if (Object.keys(e).length) return
    setUnits((l) => [...l, { name: nu.name.trim(), head: nu.head.trim() || 'Chưa phân công', phone: nu.phone.trim(), size: 0 }])
    setNu({ name: '', head: '', phone: '' }); setAdding(false); say('Đã thêm đơn vị')
  }
  const card = 'animate-rise rounded-card bg-card p-4 shadow-card md:p-6'

  return (
    <AdminShell title="Cấu hình" subtitle="Danh mục sự cố, thời hạn SLA và danh bạ đơn vị" toast={toast}>
      <section className={card}>
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-[16px] font-semibold">Thời hạn SLA (giờ)</h2><p className="text-[12px] text-muted">Thời gian tối đa để xử lý theo mức độ</p></div>
          <Button icon={Save} loading={saving} onClick={saveSla}>Lưu SLA</Button></div>
        {failed && <div role="alert" className="mb-4 rounded-tile bg-urgent/10 p-3 text-[14px] text-urgent">Không lưu được, vui lòng thử lại.</div>}
        {errs.order && <div role="alert" className="mb-4 rounded-tile bg-urgent/10 p-3 text-[14px] text-urgent">{errs.order}</div>}
        <div className="grid grid-cols-4 gap-4">
          {slaFields.map((f) => (
            <div key={f.key} className="rounded-tile bg-surface p-4">
              <p className="mb-2 flex items-center gap-2 text-[14px] font-semibold"><span className={cn('size-2.5 rounded-full', f.dot)} />{f.label}</p>
              <div className="flex items-end gap-2">
                <input type="number" min={1} max={168} value={sla[f.key]} disabled={saving} onChange={(e) => setSla((s) => ({ ...s, [f.key]: e.target.value }))} aria-label={`SLA ${f.label}`} className={cn('h-14 w-full min-w-0 rounded-tile bg-card text-center text-[32px] font-bold tabular-nums outline-none focus:ring-2 focus:ring-ink disabled:opacity-50', errs[f.key] && 'ring-2 ring-urgent')} />
                <span className="pb-3 text-[14px] text-muted">giờ</span>
              </div>
              {errs[f.key] && <p className="mt-1 text-[12px] text-urgent">{errs[f.key]}</p>}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <section className={card}>
          <h2 className="mb-4 text-[16px] font-semibold">Danh mục sự cố</h2>
          <div className="overflow-hidden rounded-tile">
            <table className="w-full text-left text-[14px]">
              <thead><tr className="bg-surface text-[12px] text-muted">{['Loại', 'SLA mặc định', 'Phiếu', 'Bật'].map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}</tr></thead>
              <tbody>
                {cat.map((c) => (
                  <tr key={c.code} className={cn('transition hover:bg-surface', !c.on && 'opacity-60')}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><IconChip icon={c.icon} size={32} /><div><p className="font-semibold">{c.name}</p><p className="text-[12px] text-muted">{c.code}</p></div></div></td>
                    <td className="px-4 py-3 text-[12px] font-semibold">{c.sla}</td>
                    <td className="px-4 py-3 tabular-nums text-muted">{c.n}</td>
                    <td className="px-4 py-3">
                      <button role="switch" aria-checked={c.on} aria-label={`Bật ${c.name}`} onClick={() => { setCat((l) => l.map((x) => (x.code === c.code ? { ...x, on: !x.on } : x))); say(c.on ? `Đã ẩn danh mục ${c.name}` : `Đã bật danh mục ${c.name}`) }} className={cn('flex h-6 w-11 items-center rounded-full p-1 transition-colors', c.on ? 'bg-ink' : 'bg-low')}>
                        <span className={cn('size-4 rounded-full bg-white transition-transform', c.on && 'translate-x-5')} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={card}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-[16px] font-semibold">Danh bạ đơn vị</h2><Button size="sm" variant={adding ? 'subtle' : 'primary'} icon={adding ? X : Plus} onClick={() => { setAdding(!adding); setNe({}) }}>{adding ? 'Đóng' : 'Thêm đơn vị'}</Button></div>
          {adding && (
            <div className="mb-4 animate-rise space-y-3 rounded-tile bg-surface p-4">
              <InputField label="Tên đơn vị" placeholder="Đội Cầu đường 2" value={nu.name} error={ne.name} onChange={(v) => setNu((s) => ({ ...s, name: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Phụ trách" placeholder="Họ tên" value={nu.head} onChange={(v) => setNu((s) => ({ ...s, head: v }))} />
                <InputField label="Số điện thoại" placeholder="0236 xxxx xxx" value={nu.phone} error={ne.phone} onChange={(v) => setNu((s) => ({ ...s, phone: v }))} />
              </div>
              <Button onClick={addUnit}>Thêm vào danh bạ</Button>
            </div>
          )}
          <ul className="divide-y divide-surface">
            {units.map((u) => (
              <li key={u.name} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold">{u.name}</p><p className="text-[12px] text-muted">{u.head} · {u.size} thành viên</p></div>
                <a href={`tel:${u.phone.replace(/\s/g, '')}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[12px] font-semibold tabular-nums transition hover:bg-page"><Phone size={14} {...ic} />{u.phone}</a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  )
}
