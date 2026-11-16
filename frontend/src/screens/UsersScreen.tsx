'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, FilterX, Lock, LockOpen, Plus, Search, X } from 'lucide-react'
import { Avatar, Button, Dropdown, EmptyState, ErrorState, PillTab, Skeleton, cn, ic } from '../components/primitives'
import { InputField } from '../components/data'
import AdminShell from './AdminShell'
import { apiCreateUserByAdmin, apiListUsers, apiUpdateUserByAdmin } from '../lib/backend-api'

type Role = 'CITIZEN' | 'DISPATCHER' | 'TECHNICIAN' | 'ADMIN'
type User = { id: number; backendId?: string; name: string; contact: string; role: Role; unit: string; locked: boolean }
const roleLabel: Record<Role, string> = { CITIZEN: 'Công dân', DISPATCHER: 'Điều phối', TECHNICIAN: 'Kỹ thuật viên', ADMIN: 'Quản trị' }
const roleChip: Record<Role, string> = { CITIZEN: 'bg-surface text-ink', DISPATCHER: 'bg-ink text-white', TECHNICIAN: 'bg-high/15 text-high', ADMIN: 'bg-accent/10 text-accent' }
const roles = Object.keys(roleLabel) as Role[]
const units = ['Không có', 'Trung tâm IOC', 'Đội CTĐT Hải Châu', 'Đội Thoát nước 2', 'Đội Cầu đường 1', 'Đội Cây xanh Thanh Khê', 'Đội Điện lực Sơn Trà', 'Sở Xây dựng']
const seed: User[] = [
  { id: 1, name: 'Nguyễn Hoàng Anh', contact: 'anh.nh@danang.gov.vn', role: 'ADMIN', unit: 'Sở Xây dựng', locked: false },
  { id: 2, name: 'Trần Minh Quân', contact: 'quan.tm@danang.gov.vn', role: 'DISPATCHER', unit: 'Trung tâm IOC', locked: false },
  { id: 3, name: 'Phạm Thu Hà', contact: 'ha.pt@danang.gov.vn', role: 'DISPATCHER', unit: 'Trung tâm IOC', locked: false },
  { id: 4, name: 'Lê Văn Hùng', contact: 'hung.lv@danang.gov.vn', role: 'TECHNICIAN', unit: 'Đội CTĐT Hải Châu', locked: false },
  { id: 5, name: 'Đặng Quốc Bảo', contact: 'bao.dq@danang.gov.vn', role: 'TECHNICIAN', unit: 'Đội Thoát nước 2', locked: false },
  { id: 6, name: 'Võ Thanh Tâm', contact: 'tam.vt@danang.gov.vn', role: 'TECHNICIAN', unit: 'Đội Cầu đường 1', locked: true },
  { id: 7, name: 'Hoàng Minh Khoa', contact: 'khoa.hm@danang.gov.vn', role: 'TECHNICIAN', unit: 'Đội Cây xanh Thanh Khê', locked: false },
  { id: 8, name: 'Nguyễn Minh Anh', contact: '0905 123 456', role: 'CITIZEN', unit: 'Không có', locked: false },
  { id: 9, name: 'Bùi Thị Lan', contact: '0935 678 120', role: 'CITIZEN', unit: 'Không có', locked: false },
  { id: 10, name: 'Trương Gia Huy', contact: '0914 220 877', role: 'CITIZEN', unit: 'Không có', locked: true },
  { id: 11, name: 'Ngô Thùy Dương', contact: '0988 341 009', role: 'CITIZEN', unit: 'Không có', locked: false },
  { id: 12, name: 'Đinh Công Danh', contact: 'danh.dc@danang.gov.vn', role: 'TECHNICIAN', unit: 'Đội Điện lực Sơn Trà', locked: false },
]

function Sheet({ user, onClose, onSave }: { user: User | null; onClose: () => void; onSave: (u: User) => void }) {
  const isNew = !user
  const [name, setName] = useState(user?.name ?? '')
  const [contact, setContact] = useState(user?.contact ?? '')
  const [role, setRole] = useState<Role>(user?.role ?? 'CITIZEN')
  const [unit, setUnit] = useState(user?.unit ?? units[0])
  const [locked, setLocked] = useState(user?.locked ?? false)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState(false)
  const save = async () => {
    const e: Record<string, string> = {}
    if (name.trim().split(/\s+/).length < 2) e.name = 'Nhập đầy đủ họ và tên'
    if (!/^0\d{9}$/.test(contact.replace(/\s/g, '')) && !/^\S+@\S+\.\S+$/.test(contact)) e.contact = 'Nhập SĐT 10 số hoặc email hợp lệ'
    if (role !== 'CITIZEN' && unit === units[0]) e.unit = 'Cán bộ cần thuộc một đơn vị'
    setErrs(e); setFail(false)
    if (Object.keys(e).length) return
    setBusy(true); await new Promise((r) => setTimeout(r, 900)); setBusy(false)
    if (new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state') === 'error') return setFail(true)
    onSave({ id: user?.id ?? Date.now(), name: name.trim(), contact, role, unit: role === 'CITIZEN' ? units[0] : unit, locked })
  }
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 animate-rise" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <aside className="animate-slide-in flex h-full w-[420px] max-w-full flex-col gap-5 overflow-y-auto bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">{isNew ? 'Thêm người dùng' : 'Sửa người dùng'}</h2>
          <button onClick={onClose} aria-label="Đóng" className="flex size-8 items-center justify-center rounded-full bg-surface"><X size={16} {...ic} /></button>
        </div>
        {fail && <div role="alert" className="rounded-tile bg-urgent/10 p-3 text-[14px] text-urgent">Không lưu được, vui lòng thử lại.</div>}
        <InputField label="Họ và tên" placeholder="Nguyễn Văn A" value={name} disabled={busy} error={errs.name} onChange={setName} />
        <InputField label="Số điện thoại / Email" placeholder="09xx xxx xxx hoặc ten@danang.gov.vn" value={contact} disabled={busy} error={errs.contact} onChange={setContact} />
        <div>
          <span className="mb-2 block text-[12px] text-muted">Vai trò</span>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((r) => (
              <button key={r} disabled={busy} onClick={() => setRole(r)} className={cn('flex h-12 flex-col items-start justify-center rounded-tile px-3 text-left transition disabled:opacity-50', role === r ? 'bg-ink text-white' : 'bg-surface hover:bg-page')}>
                <span className="text-[12px] font-bold tracking-wide">{r}</span>
                <span className={cn('text-[12px]', role === r ? 'text-white/70' : 'text-muted')}>{roleLabel[r]}</span>
              </button>
            ))}
          </div>
        </div>
        {role !== 'CITIZEN' && (
          <div>
            <span className="mb-1 block text-[12px] text-muted">Đơn vị</span>
            <Dropdown placeholder="Chọn đơn vị" options={units.slice(1)} value={unit === units[0] ? '' : unit} invalid={!!errs.unit} disabled={busy} onChange={setUnit} />
            {errs.unit && <span className="mt-1 block text-[12px] text-urgent">{errs.unit}</span>}
          </div>
        )}
        {!isNew && (
          <div className={cn('flex items-center justify-between rounded-tile p-3', locked ? 'bg-urgent/10' : 'bg-surface')}>
            <div><p className="text-[14px] font-semibold">{locked ? 'Tài khoản đang bị khóa' : 'Tài khoản đang hoạt động'}</p><p className="text-[12px] text-muted">{locked ? 'Không thể đăng nhập' : 'Có thể đăng nhập bình thường'}</p></div>
            <Button size="sm" variant={locked ? 'primary' : 'danger'} icon={locked ? LockOpen : Lock} disabled={busy} onClick={() => setLocked(!locked)}>{locked ? 'Mở khóa' : 'Khóa'}</Button>
          </div>
        )}
        <div className="mt-auto flex gap-2 [&>button]:flex-1"><Button variant="subtle" disabled={busy} onClick={onClose}>Hủy</Button><Button loading={busy} onClick={save}>{isNew ? 'Thêm' : 'Lưu thay đổi'}</Button></div>
      </aside>
    </div>
  )
}

export default function UsersScreen() {
  const forced = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state')
  const [users, setUsers] = useState(seed)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(forced === 'error-list')
  const [filter, setFilter] = useState('Tất cả')
  const [q, setQ] = useState('')
  const [sheet, setSheet] = useState<null | 'new' | number>(null)
  const [toast, setToast] = useState<null | { kind: 'success'; text: string }>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    let active = true
    const t = setTimeout(() => { if (active) setLoading(false) }, 700)
    apiListUsers({ page_size: 50 }).then((res) => {
      if (!active || !res.items.length) return
      const mapped: User[] = res.items.map((u, idx) => ({
        id: idx + 1,
        backendId: u.id,
        name: u.full_name,
        contact: u.email ?? u.phone ?? '—',
        role: u.role,
        unit: u.role === 'CITIZEN' ? units[0] : (seed[idx % seed.length]?.unit ?? 'Trung tâm IOC'),
        locked: u.is_locked ?? false,
      }))
      setUsers(mapped)
      setLoading(false)
    }).catch(() => {})
    return () => { active = false; clearTimeout(t) }
  }, [])

  const list = useMemo(() => users.filter((u) => (filter === 'Tất cả' || roleLabel[u.role] === filter) && (!q.trim() || `${u.name} ${u.contact} ${u.unit}`.toLowerCase().includes(q.trim().toLowerCase()))), [users, filter, q])
  const editing = typeof sheet === 'number' ? users.find((u) => u.id === sheet) ?? null : null
  const save = (u: User) => {
    if (editing?.backendId) {
      apiUpdateUserByAdmin(editing.backendId, { full_name: u.name, role: u.role, is_locked: u.locked }).catch(() => {})
    } else if (!editing) {
      const isEmail = u.contact.includes('@')
      apiCreateUserByAdmin({
        full_name: u.name,
        email: isEmail ? u.contact : undefined,
        phone: !isEmail ? u.contact.replace(/\s/g, '') : undefined,
        password: 'Password123!',
        role: u.role,
      }).catch(() => {})
    }
    setUsers((l) => (l.some((x) => x.id === u.id) ? l.map((x) => (x.id === u.id ? u : x)) : [u, ...l]))
    setSheet(null)
    setToast({ kind: 'success', text: 'Đã lưu người dùng' })
    window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(null), 2200)
  }

  return (
    <AdminShell title="Người dùng" subtitle={`${users.length} tài khoản · ${users.filter((u) => u.locked).length} đang bị khóa`} toast={toast} actions={<Button size="lg" icon={Plus} onClick={() => setSheet('new')}>Thêm người dùng</Button>}>
      <section className="animate-rise rounded-card bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <PillTab tone="ink" items={['Tất cả', ...roles.map((r) => roleLabel[r])]} value={filter} onChange={setFilter} />
          <label className="flex h-10 w-[300px] items-center gap-2 rounded-full bg-surface px-4 focus-within:ring-2 focus-within:ring-ink">
            <Search size={16} {...ic} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên, SĐT, email, đơn vị…" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted" />
          </label>
        </div>
        <div className="mt-4 overflow-hidden rounded-tile">
          <table className="w-full text-left text-[14px]">
            <thead><tr className="bg-surface text-[12px] text-muted">{['Họ tên', 'Vai trò', 'Đơn vị', 'Trạng thái', ''].map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}</tr></thead>
            {!loading && !failed && list.length > 0 && (
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} onClick={() => setSheet(u.id)} className="cursor-pointer transition hover:bg-surface">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.name} color={u.id} /><div><p className="font-semibold">{u.name}</p><p className="text-[12px] text-muted">{u.contact}</p></div></div></td>
                    <td className="px-4 py-3"><span className={cn('inline-flex h-6 items-center rounded-full px-3 text-[12px] font-semibold', roleChip[u.role])}>{roleLabel[u.role]}</span></td>
                    <td className="px-4 py-3 text-muted">{u.unit === units[0] ? '—' : u.unit}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-[12px] font-semibold"><span className={cn('size-2 rounded-full', u.locked ? 'bg-urgent' : 'bg-done')} />{u.locked ? 'Bị khóa' : 'Hoạt động'}</span></td>
                    <td className="px-4 py-3 text-right text-muted"><ChevronRight size={16} {...ic} className="inline" /></td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {loading && <div className="space-y-2 p-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>}
          {!loading && failed && <div className="py-8 text-center"><ErrorState text="Không tải được danh sách" /><Button variant="subtle" onClick={() => setFailed(false)}>Thử lại</Button></div>}
          {!loading && !failed && list.length === 0 && <div className="py-8 text-center"><EmptyState text="Không có người dùng phù hợp" /><Button variant="subtle" icon={FilterX} onClick={() => { setFilter('Tất cả'); setQ('') }}>Xóa bộ lọc</Button></div>}
        </div>
      </section>
      {sheet !== null && <Sheet key={String(sheet)} user={editing} onClose={() => setSheet(null)} onSave={save} />}
    </AdminShell>
  )
}
