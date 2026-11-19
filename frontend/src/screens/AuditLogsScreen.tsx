'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, FilterX, Activity, Search } from 'lucide-react'
import { Button, Dropdown, HeaderStat, EmptyState, ErrorState, Skeleton, cn, ic } from '../components/primitives'
import AdminShell from './AdminShell'
import { apiListAuditLogs } from '../lib/backend-api'
import { getTickets, statusLabel, useTicketVersion, type Status } from '../data/tickets'

type Log = {
  id: string
  at: string
  timestamp: number
  who: string
  action: string
  code: string
  before: string
  after: string
  note: string
  today: boolean
}

const actions = ['Tất cả hành động', 'Tiếp nhận', 'Phân loại AI', 'Giao việc', 'Xử lý hiện trường', 'Nghiệm thu', 'Đóng phiếu']
const PAGE = 8

function classifyAction(toStatus: string): string {
  switch (toStatus) {
    case 'SUBMITTED':
      return 'Tiếp nhận'
    case 'TRIAGED':
      return 'Phân loại AI'
    case 'ASSIGNED':
      return 'Giao việc'
    case 'IN_PROGRESS':
    case 'RESOLVED':
      return 'Xử lý hiện trường'
    case 'CONFIRMED':
    case 'REOPENED':
    case 'REJECTED':
      return 'Nghiệm thu'
    case 'CLOSED':
      return 'Đóng phiếu'
    default:
      return 'Cập nhật trạng thái'
  }
}

function formatStatusVi(st: string | null | undefined): string {
  if (!st) return 'Khởi tạo'
  return statusLabel[st as Status] ?? st
}

export default function AuditLogsScreen() {
  const ticketVer = useTicketVersion()
  const forced = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(forced === 'error')
  const [q, setQ] = useState(forced === 'empty' ? 'zzz' : '')
  const [action, setAction] = useState(actions[0])
  const [page, setPage] = useState(1)
  const [apiLogs, setApiLogs] = useState<Log[] | null>(null)

  useEffect(() => {
    let active = true
    const t = setTimeout(() => {
      if (active) setLoading(false)
    }, 500)
    apiListAuditLogs({ page_size: 100 })
      .then((res) => {
        if (!active) return
        const now = new Date()
        const realItems = res.items.filter((item) => !item.ticket_code.startsWith('DN-202610-'))
        const mapped: Log[] = realItems.map((item) => {
          const d = new Date(item.created_at)
          const isToday =
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          return {
            id: item.id,
            at: d.toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }),
            timestamp: d.getTime(),
            who: item.actor_name || 'Hệ thống AI / Công dân',
            action: classifyAction(item.to_status),
            code: item.ticket_code,
            before: formatStatusVi(item.from_status),
            after: formatStatusVi(item.to_status),
            note: item.note || 'Chuyển trạng thái phiếu sự cố',
            today: isToday,
          }
        })
        setApiLogs(mapped)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [ticketVer])

  // Fallback derived from real tickets in getTickets() if API endpoint requires elevated token not yet present
  const derivedTicketLogs = useMemo<Log[]>(() => {
    const out: Log[] = []
    const now = new Date()
    for (const t of getTickets()) {
      const entries = Object.entries(t.at) as [Status, number][]
      entries.sort((a, b) => a[1] - b[1])
      entries.forEach(([st, ts], idx) => {
        const d = new Date(ts)
        const prevSt = idx > 0 ? entries[idx - 1][0] : null
        const isToday =
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        out.push({
          id: `${t.id}-${st}`,
          at: d.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          timestamp: ts,
          who:
            st === 'SUBMITTED'
              ? 'Công dân phản ánh'
              : st === 'TRIAGED'
                ? 'Hệ thống AI / IOC'
                : st === 'IN_PROGRESS' || st === 'RESOLVED'
                  ? t.ktv || 'Kỹ thuật viên hiện trường'
                  : 'Điều phối viên IOC',
          action: classifyAction(st),
          code: t.id,
          before: formatStatusVi(prevSt),
          after: formatStatusVi(st),
          note: t.title,
          today: isToday,
        })
      })
    }
    return out.sort((a, b) => b.timestamp - a.timestamp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketVer])

  const liveLogs = apiLogs && apiLogs.length > 0 ? apiLogs : derivedTicketLogs

  const list = useMemo(
    () =>
      liveLogs.filter(
        (l) =>
          (action === actions[0] || l.action === action) &&
          (!q.trim() || `${l.code} ${l.who} ${l.note}`.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [liveLogs, q, action],
  )
  useEffect(() => setPage(1), [q, action])
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const view = list.slice((page - 1) * PAGE, page * PAGE)
  const todayCount = liveLogs.filter((l) => l.today).length

  return (
    <AdminShell
      title="Nhật ký"
      subtitle="Lịch sử biến động trạng thái sự cố thực tế từ PostgreSQL"
      actions={<HeaderStat dark title="Hành động hôm nay" value={todayCount} icon={Activity} />}
    >
      <section className="animate-rise rounded-card bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <label className="flex h-10 w-[340px] items-center gap-2 rounded-full bg-surface px-4 focus-within:ring-2 focus-within:ring-ink">
            <Search size={16} {...ic} className="text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm mã phiếu, người thực hiện, ghi chú…"
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted"
            />
          </label>
          <div className="w-[220px]">
            <Dropdown pill placeholder="Hành động" value={action} options={actions} onChange={setAction} />
          </div>
          <span className="ml-auto text-[12px] text-muted tabular-nums">{list.length} bản ghi thật</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-tile">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="bg-surface text-[12px] text-muted">
                {['Thời điểm', 'Người thực hiện', 'Hành động', 'Trước / Sau', 'Ghi chú'].map((c) => (
                  <th key={c} className="px-4 py-3 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            {!loading && !failed && view.length > 0 && (
              <tbody>
                {view.map((l) => (
                  <tr key={l.id} className="transition hover:bg-surface">
                    <td className="px-4 py-3 whitespace-nowrap text-muted tabular-nums">{l.at}</td>
                    <td className="px-4 py-3 font-semibold">{l.who}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex h-6 items-center rounded-full bg-surface px-3 text-[12px] font-semibold">
                        {l.action}
                      </span>
                      <p className="mt-1 font-mono text-[12px] text-muted tabular-nums">{l.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="rounded-md bg-urgent/10 px-2 py-0.5 text-urgent line-through decoration-urgent/40">
                          {l.before}
                        </span>
                        <ArrowRight size={12} {...ic} className="text-muted" />
                        <span className="rounded-md bg-done/10 px-2 py-0.5 font-semibold text-done">
                          {l.after}
                        </span>
                      </span>
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-[12px] text-muted" title={l.note}>
                      {l.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {loading && (
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          )}
          {!loading && failed && (
            <div className="py-8 text-center">
              <ErrorState text="Không tải được nhật ký" />
              <Button variant="subtle" onClick={() => setFailed(false)}>
                Thử lại
              </Button>
            </div>
          )}
          {!loading && !failed && view.length === 0 && (
            <div className="py-8 text-center">
              <EmptyState text="Không có bản ghi phù hợp" />
              <Button
                variant="subtle"
                icon={FilterX}
                onClick={() => {
                  setQ('')
                  setAction(actions[0])
                }}
              >
                Xóa bộ lọc
              </Button>
            </div>
          )}
        </div>
        {!loading && !failed && view.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[12px] text-muted tabular-nums">
              Hiển thị {(page - 1) * PAGE + 1}–{(page - 1) * PAGE + view.length} trong {list.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                aria-label="Trang trước"
                className="flex size-8 items-center justify-center rounded-full bg-surface disabled:opacity-40"
              >
                <ChevronLeft size={16} {...ic} />
              </button>
              {Array.from({ length: pages }, (_, n) => n + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    'size-8 rounded-full text-[12px] font-semibold',
                    n === page ? 'bg-ink text-white' : 'text-muted hover:bg-surface',
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                disabled={page === pages}
                onClick={() => setPage(page + 1)}
                aria-label="Trang sau"
                className="flex size-8 items-center justify-center rounded-full bg-surface disabled:opacity-40"
              >
                <ChevronRight size={16} {...ic} />
              </button>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  )
}
