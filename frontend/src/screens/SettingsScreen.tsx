'use client'

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  CircleDot,
  Construction,
  Droplets,
  Lightbulb,
  Phone,
  Plus,
  Save,
  Trash2,
  TreeDeciduous,
  X,
  type LucideProps,
} from 'lucide-react'
import { Button, IconChip, cn, ic } from '../components/primitives'
import { InputField } from '../components/data'
import AdminShell from './AdminShell'
import {
  apiCreateDepartment,
  apiListCategories,
  apiListDepartments,
  apiUpdateCategory,
  type ApiCategoryOut,
  type ApiDepartmentOut,
} from '../lib/backend-api'
import { CATEGORY_TO_KIND, getTickets, useTicketVersion, type Kind } from '../data/tickets'

type CatRow = {
  id?: string
  name: string
  code: string
  kind: Kind
  icon: ComponentType<LucideProps>
  slaHours: number
  on: boolean
}

const ICON_BY_KIND: Record<Kind, ComponentType<LucideProps>> = {
  flood: Droplets,
  tree: TreeDeciduous,
  road: Construction,
  light: Lightbulb,
  trash: Trash2,
}

const slaFields = [
  { key: 'urgent', label: 'Khẩn cấp', dot: 'bg-urgent', def: '4' },
  { key: 'high', label: 'Cao', dot: 'bg-high', def: '12' },
  { key: 'normal', label: 'Trung bình', dot: 'bg-normal', def: '24' },
  { key: 'low', label: 'Thấp', dot: 'bg-low', def: '48' },
]

type UnitRow = { id?: string; code: string; name: string; email: string; phone: string }

export default function SettingsScreen() {
  const ticketVer = useTicketVersion()
  const [catRows, setCatRows] = useState<CatRow[]>([])
  const [sla, setSla] = useState<Record<string, string>>(
    Object.fromEntries(slaFields.map((f) => [f.key, f.def])),
  )
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [units, setUnits] = useState<UnitRow[]>([])
  const [adding, setAdding] = useState(false)
  const [nu, setNu] = useState({ name: '', email: '', phone: '' })
  const [ne, setNe] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<null | { kind: 'success' | 'info'; text: string }>(null)
  const timer = useRef<number | undefined>(undefined)

  const say = (text: string) => {
    setToast({ kind: 'success', text })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2200)
  }

  useEffect(() => {
    apiListCategories()
      .then((apiCats: ApiCategoryOut[]) => {
        setCatRows(
          apiCats.map((c) => {
            const kind: Kind = CATEGORY_TO_KIND[c.code] ?? 'road'
            return {
              id: c.id,
              name: c.name,
              code: c.code,
              kind,
              icon: c.code === 'OTHER' ? CircleDot : ICON_BY_KIND[kind],
              slaHours: c.default_sla_hours,
              on: c.is_active ?? true,
            }
          }),
        )
      })
      .catch(() => {})

    apiListDepartments()
      .then((depts: ApiDepartmentOut[]) => {
        setUnits(
          depts.map((d) => ({
            id: d.id,
            code: d.code,
            name: d.name,
            email: d.contact_email ?? 'ioc@danang.gov.vn',
            phone: d.contact_phone ?? '0236 3822 180',
          })),
        )
      })
      .catch(() => {})
  }, [])

  // Real ticket counts per kind from live PostgreSQL incidents
  const realCountByKind = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of getTickets()) {
      map[t.kind] = (map[t.kind] ?? 0) + 1
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketVer])

  const saveSla = async () => {
    const e: Record<string, string> = {}
    slaFields.forEach((f) => {
      const v = Number(sla[f.key])
      if (!Number.isInteger(v) || v < 1 || v > 168) e[f.key] = 'Từ 1 đến 168 giờ'
    })
    const v = slaFields.map((f) => Number(sla[f.key]))
    if (!Object.keys(e).length && !(v[0] < v[1] && v[1] < v[2] && v[2] < v[3])) {
      e.order = 'Thời hạn phải tăng dần: Khẩn cấp < Cao < Trung bình < Thấp'
    }
    setErrs(e)
    setFailed(false)
    if (Object.keys(e).length) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400))
    setSaving(false)
    if (new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state') === 'error') {
      setFailed(true)
      return
    }
    say('Đã lưu cấu hình SLA')
  }

  const addUnit = () => {
    const e: Record<string, string> = {}
    if (!nu.name.trim()) e.name = 'Nhập tên đơn vị'
    if (!/^[\d\s]{9,14}$/.test(nu.phone.trim())) e.phone = 'Số điện thoại chưa hợp lệ'
    setNe(e)
    if (Object.keys(e).length) return
    const code = `DEPT_${Date.now().toString().slice(-4)}`
    apiCreateDepartment({
      code,
      name: nu.name.trim(),
      contact_email: nu.email.trim() || undefined,
      contact_phone: nu.phone.trim(),
    })
      .then((created) => {
        setUnits((l) => [
          ...l,
          {
            id: created.id,
            code: created.code,
            name: created.name,
            email: created.contact_email ?? 'ioc@danang.gov.vn',
            phone: created.contact_phone ?? nu.phone.trim(),
          },
        ])
      })
      .catch(() => {})
    setNu({ name: '', email: '', phone: '' })
    setAdding(false)
    say('Đã thêm đơn vị vào PostgreSQL')
  }

  const card = 'animate-rise rounded-card bg-card p-4 shadow-card md:p-6'

  return (
    <AdminShell
      title="Cấu hình"
      subtitle="Danh mục sự cố, thời hạn SLA và danh bạ đơn vị thực tế từ PostgreSQL"
      toast={toast}
    >
      <section className={card}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold">Thời hạn SLA (giờ)</h2>
            <p className="text-[12px] text-muted">Thời gian tối đa để xử lý theo mức độ ưu tiên</p>
          </div>
          <Button icon={Save} loading={saving} onClick={saveSla}>
            Lưu SLA
          </Button>
        </div>
        {failed && (
          <div role="alert" className="mb-4 rounded-tile bg-urgent/10 p-3 text-[14px] text-urgent">
            Không lưu được, vui lòng thử lại.
          </div>
        )}
        {errs.order && (
          <div role="alert" className="mb-4 rounded-tile bg-urgent/10 p-3 text-[14px] text-urgent">
            {errs.order}
          </div>
        )}
        <div className="grid grid-cols-4 gap-4">
          {slaFields.map((f) => (
            <div key={f.key} className="rounded-tile bg-surface p-4">
              <p className="mb-2 flex items-center gap-2 text-[14px] font-semibold">
                <span className={cn('size-2.5 rounded-full', f.dot)} />
                {f.label}
              </p>
              <div className="flex items-end gap-2">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={sla[f.key]}
                  disabled={saving}
                  onChange={(e) => setSla((s) => ({ ...s, [f.key]: e.target.value }))}
                  aria-label={`SLA ${f.label}`}
                  className={cn(
                    'h-14 w-full min-w-0 rounded-tile bg-card text-center text-[32px] font-bold tabular-nums outline-none focus:ring-2 focus:ring-ink disabled:opacity-50',
                    errs[f.key] && 'ring-2 ring-urgent',
                  )}
                />
                <span className="pb-3 text-[14px] text-muted">giờ</span>
              </div>
              {errs[f.key] && <p className="mt-1 text-[12px] text-urgent">{errs[f.key]}</p>}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <section className={card}>
          <h2 className="mb-4 text-[16px] font-semibold">Danh mục sự cố ({catRows.length})</h2>
          <div className="overflow-hidden rounded-tile">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="bg-surface text-[12px] text-muted">
                  {['Loại sự cố', 'SLA mặc định', 'Phiếu thật', 'Bật'].map((c) => (
                    <th key={c} className="px-4 py-3 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catRows.map((c) => (
                  <tr key={c.code} className={cn('transition hover:bg-surface', !c.on && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <IconChip icon={c.icon} size={32} />
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          <p className="font-mono text-[12px] text-muted">{c.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-semibold tabular-nums">{c.slaHours} giờ</td>
                    <td className="px-4 py-3 font-semibold text-ink tabular-nums">
                      {c.code === 'OTHER' ? 0 : realCountByKind[c.kind] ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        role="switch"
                        aria-checked={c.on}
                        aria-label={`Bật ${c.name}`}
                        onClick={() => {
                          const nextOn = !c.on
                          setCatRows((l) =>
                            l.map((x) => (x.code === c.code ? { ...x, on: nextOn } : x)),
                          )
                          if (c.id) apiUpdateCategory(c.id, { is_active: nextOn }).catch(() => {})
                          say(c.on ? `Đã ẩn danh mục ${c.name}` : `Đã bật danh mục ${c.name}`)
                        }}
                        className={cn(
                          'flex h-6 w-11 items-center rounded-full p-1 transition-colors',
                          c.on ? 'bg-ink' : 'bg-low',
                        )}
                      >
                        <span
                          className={cn(
                            'size-4 rounded-full bg-white transition-transform',
                            c.on && 'translate-x-5',
                          )}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={card}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Danh bạ đơn vị ({units.length})</h2>
            <Button
              size="sm"
              variant={adding ? 'subtle' : 'primary'}
              icon={adding ? X : Plus}
              onClick={() => {
                setAdding(!adding)
                setNe({})
              }}
            >
              {adding ? 'Đóng' : 'Thêm đơn vị'}
            </Button>
          </div>
          {adding && (
            <div className="mb-4 animate-rise space-y-3 rounded-tile bg-surface p-4">
              <InputField
                label="Tên đơn vị"
                placeholder="Công ty Thoát nước và Xử lý nước thải"
                value={nu.name}
                error={ne.name}
                onChange={(v) => setNu((s) => ({ ...s, name: v }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Email liên hệ"
                  placeholder="donvi@danang.gov.vn"
                  value={nu.email}
                  onChange={(v) => setNu((s) => ({ ...s, email: v }))}
                />
                <InputField
                  label="Số điện thoại"
                  placeholder="0236 xxxx xxx"
                  value={nu.phone}
                  error={ne.phone}
                  onChange={(v) => setNu((s) => ({ ...s, phone: v }))}
                />
              </div>
              <Button onClick={addUnit}>Thêm vào danh bạ</Button>
            </div>
          )}
          <ul className="divide-y divide-surface">
            {units.map((u) => (
              <li key={u.code} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{u.name}</p>
                  <p className="text-[12px] text-muted">
                    <span className="font-mono">{u.code}</span> · {u.email}
                  </p>
                </div>
                <a
                  href={`tel:${u.phone.replace(/\s/g, '')}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[12px] font-semibold tabular-nums transition hover:bg-page"
                >
                  <Phone size={14} {...ic} />
                  {u.phone}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  )
}
