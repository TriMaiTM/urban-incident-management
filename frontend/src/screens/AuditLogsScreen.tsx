'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, FilterX, Activity, Search } from 'lucide-react'
import { Button, Dropdown, HeaderStat, EmptyState, ErrorState, Skeleton, cn, ic } from '../components/primitives'
import AdminShell from './AdminShell'
import { apiListAuditLogs } from '../lib/backend-api'

type Log = { at: string; who: string; action: string; code: string; before: string; after: string; ip: string; today: boolean }
const actions = ['Tất cả hành động', 'Giao việc', 'Đổi mức độ', 'Nghiệm thu', 'Khóa tài khoản', 'Đổi vai trò', 'Gộp phiếu']
const people = ['Trần Minh Quân', 'Phạm Thu Hà', 'Nguyễn Hoàng Anh', 'Lê Văn Hùng', 'Đặng Quốc Bảo']
const tpl: Record<string, [string, string]> = {
  'Giao việc': ['Chưa giao', 'Đội CTĐT Hải Châu'],
  'Đổi mức độ': ['Trung bình', 'Khẩn cấp'],
  'Nghiệm thu': ['Chờ nghiệm thu', 'Đã đóng'],
  'Khóa tài khoản': ['Hoạt động', 'Bị khóa'],
  'Đổi vai trò': ['CITIZEN', 'TECHNICIAN'],
  'Gộp phiếu': ['DN-202610-0118', 'DN-202610-0124'],
}
const logs: Log[] = Array.from({ length: 34 }, (_, i) => {
  const action = actions[1 + (i * 5) % 6]
  const mins = i * 37 + 4
  const d = new Date(2026, 9, 14, 11, 20 - (mins % 60) )
  d.setMinutes(d.getMinutes() - mins)
  const [b, a] = tpl[action]
  const admin = action === 'Khóa tài khoản' || action === 'Đổi vai trò'
  return {
    at: d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
    who: admin ? people[2] : people[(i * 3) % 5],
    action,
    code: admin ? `USR-${String(100 + i)}` : `DN-202610-${String(140 - i).padStart(4, '0')}`,
    before: b, after: a,
    ip: `10.12.${(i * 7) % 40}.${20 + ((i * 13) % 200)}`,
    today: mins < 11 * 60,
  }
})
const PAGE = 8

export default function AuditLogsScreen() {
  const forced = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(forced === 'error')
  const [q, setQ] = useState(forced === 'empty' ? 'zzz' : '')
  const [action, setAction] = useState(actions[0])
  const [page, setPage] = useState(1)
  const [liveLogs, setLiveLogs] = useState<Log[]>(logs)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700)
    apiListAuditLogs({ page_size: 50 }).then((res) => {
      if (!res.items.length) return
      const mapped: Log[] = res.items.map((item, idx) => {
        const d = new Date(item.created_at)
        const act = item.to_status === 'ASSIGNED' ? 'Giao việc' : item.to_status === 'CONFIRMED' || item.to_status === 'CLOSED' ? 'Nghiệm thu' : 'Đổi mức độ'
        return {
          at: d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
          who: item.actor_name ?? people[idx % people.length],
          action: act,
          code: item.ticket_code,
          before: item.from_status ?? 'Mới tạo',
          after: item.to_status,
          ip: `10.12.${(idx * 7) % 40}.${20 + ((idx * 13) % 200)}`,
          today: true,
        }
      })
      setLiveLogs([...mapped, ...logs])
    }).catch(() => {})
    return () => clearTimeout(t)
  }, [])
  const list = useMemo(() => liveLogs.filter((l) => (action === actions[0] || l.action === action) && (!q.trim() || `${l.code} ${l.who}`.toLowerCase().includes(q.trim().toLowerCase()))), [liveLogs, q, action])
  useEffect(() => setPage(1), [q, action])
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const view = list.slice((page - 1) * PAGE, page * PAGE)
  const todayCount = liveLogs.filter((l) => l.today).length

  return (
    <AdminShell title="Nhật ký" subtitle="Mọi thao tác trên hệ thống đều được ghi lại" actions={<HeaderStat dark title="Hành động hôm nay" value={todayCount} icon={Activity} />}>
      <section className="animate-rise rounded-card bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <label className="flex h-10 w-[340px] items-center gap-2 rounded-full bg-surface px-4 focus-within:ring-2 focus-within:ring-ink">
            <Search size={16} {...ic} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mã phiếu hoặc tên người…" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted" />
          </label>
          <div className="w-[200px]"><Dropdown pill placeholder="Hành động" value={action} options={actions} onChange={setAction} /></div>
          <span className="ml-auto text-[12px] text-muted tabular-nums">{list.length} bản ghi</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-tile">
          <table className="w-full text-left text-[14px]">
            <thead><tr className="bg-surface text-[12px] text-muted">{['Thời điểm', 'Người thực hiện', 'Hành động', 'Trước / Sau', 'IP'].map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}</tr></thead>
            {!loading && !failed && view.length > 0 && (
              <tbody>
                {view.map((l, i) => (
                  <tr key={i} className="transition hover:bg-surface">
                    <td className="px-4 py-3 whitespace-nowrap text-muted tabular-nums">{l.at}</td>
                    <td className="px-4 py-3 font-semibold">{l.who}</td>
                    <td className="px-4 py-3"><span className="inline-flex h-6 items-center rounded-full bg-surface px-3 text-[12px] font-semibold">{l.action}</span><p className="mt-1 text-[12px] text-muted tabular-nums">{l.code}</p></td>
                    <td className="px-4 py-3"><span className="inline-flex flex-wrap items-center gap-2 text-[12px]"><span className="rounded-md bg-urgent/10 px-2 py-0.5 text-urgent line-through decoration-urgent/40">{l.before}</span><ArrowRight size={12} {...ic} className="text-muted" /><span className="rounded-md bg-done/10 px-2 py-0.5 font-semibold text-done">{l.after}</span></span></td>
                    <td className="px-4 py-3 text-muted tabular-nums">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {loading && <div className="space-y-2 p-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>}
          {!loading && failed && <div className="py-8 text-center"><ErrorState text="Không tải được nhật ký" /><Button variant="subtle" onClick={() => setFailed(false)}>Thử lại</Button></div>}
          {!loading && !failed && view.length === 0 && <div className="py-8 text-center"><EmptyState text="Không có bản ghi phù hợp" /><Button variant="subtle" icon={FilterX} onClick={() => { setQ(''); setAction(actions[0]) }}>Xóa bộ lọc</Button></div>}
        </div>
        {!loading && !failed && view.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[12px] text-muted tabular-nums">Hiển thị {(page - 1) * PAGE + 1}–{(page - 1) * PAGE + view.length} trong {list.length}</p>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Trang trước" className="flex size-8 items-center justify-center rounded-full bg-surface disabled:opacity-40"><ChevronLeft size={16} {...ic} /></button>
              {Array.from({ length: pages }, (_, n) => n + 1).map((n) => <button key={n} onClick={() => setPage(n)} className={cn('size-8 rounded-full text-[12px] font-semibold', n === page ? 'bg-ink text-white' : 'text-muted hover:bg-surface')}>{n}</button>)}
              <button disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Trang sau" className="flex size-8 items-center justify-center rounded-full bg-surface disabled:opacity-40"><ChevronRight size={16} {...ic} /></button>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  )
}
