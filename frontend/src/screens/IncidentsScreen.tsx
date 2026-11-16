'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Download, FilterX, Search } from 'lucide-react'
import { Button, EmptyState, PillTab, StatusPill, cn, ic, levelLabel, type Level } from '../components/primitives'
import { getTickets, kindLabel, levelOf, remainingSec, statusLabel, type Ticket } from '../data/tickets'
import DispatcherShell, { type ToastState } from './DispatcherShell'

type Row = { code: string; type: string; street: string; district: string; level: Level; unit: string; sla: string; status: string }
const slaText = (t: Ticket) => {
  const r = remainingSec(t), a = Math.abs(r)
  const txt = `${Math.floor(a / 3600)}h ${String(Math.floor((a % 3600) / 60)).padStart(2, '0')}m`
  return ['CONFIRMED', 'CLOSED'].includes(t.status) ? 'Hoàn tất' : t.status === 'REJECTED' ? '—' : r < 0 ? `Trễ ${txt}` : `Còn ${txt}`
}
// Sổ bộ đọc từ nguồn dữ liệu chung, hạn SLA tính từ lúc gửi + mức ưu tiên.
const rows: Row[] = getTickets().map((t) => ({
  code: t.id, type: kindLabel[t.kind], street: t.address, district: t.district, level: levelOf(t), unit: t.unit, sla: slaText(t), status: statusLabel[t.status],
}))
const PAGE = 8
const lv: Level[] = ['urgent', 'high', 'normal', 'low', 'done']
const filters = ['Tất cả', ...lv.map((l) => levelLabel[l])]

export default function IncidentsScreen() {
  const forcedEmpty = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : '')).get('state') === 'empty'
  const [filter, setFilter] = useState('Tất cả')
  const [q, setQ] = useState(forcedEmpty ? 'zzz' : '')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<ToastState>(null)
  const timer = useRef<number | undefined>(undefined)

  const list = useMemo(() => {
    const k = q.trim().toLowerCase()
    return rows.filter((r) => (filter === 'Tất cả' || levelLabel[r.level] === filter) && (!k || `${r.code} ${r.type} ${r.street} ${r.district} ${r.unit} ${r.status}`.toLowerCase().includes(k)))
  }, [filter, q])
  useEffect(() => setPage(1), [filter, q])
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const view = list.slice((page - 1) * PAGE, page * PAGE)

  const exportCsv = () => {
    if (!list.length) return
    const csv = ['Mã phiếu,Loại,Vị trí,Quận,Mức,Trạng thái,Đội,Hạn SLA', ...list.map((r) => [r.code, r.type, r.street, r.district, levelLabel[r.level], r.status, r.unit, r.sla].join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'so-bo-su-co.csv'
    a.click()
    setToast({ kind: 'success', text: `Đã xuất ${list.length} phiếu` })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2200)
  }
  const nums = Array.from({ length: pages }, (_, i) => i + 1)

  return (
    <DispatcherShell title="Sổ bộ" subtitle={`${list.length} / ${rows.length} phiếu`} toast={toast} actions={<Button size="lg" icon={Download} onClick={exportCsv} disabled={!list.length}>Xuất file</Button>}>
      <section className="animate-rise rounded-card bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div className="overflow-x-auto"><PillTab items={filters} value={filter} onChange={setFilter} tone="ink" /></div>
          <label className="flex h-10 w-[300px] shrink-0 items-center gap-2 rounded-full bg-surface px-4 focus-within:ring-2 focus-within:ring-ink">
            <Search size={16} {...ic} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã phiếu, đường, đội…" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted" />
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-tile">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="bg-surface text-[12px] text-muted">
                {['Mã phiếu', 'Loại', 'Vị trí', 'Quận', 'Mức', 'Trạng thái', 'Đội phụ trách', 'Hạn SLA'].map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}
              </tr>
            </thead>
            {view.length > 0 && (
              <tbody>
                {view.map((r) => (
                  <tr key={r.code} className="transition hover:bg-surface">
                    <td className="px-4 py-3 font-semibold tabular-nums">{r.code}</td>
                    <td className="px-4 py-3">{r.type}</td>
                    <td className="px-4 py-3 text-muted">{r.street}</td>
                    <td className="px-4 py-3 text-muted">{r.district}</td>
                    <td className="px-4 py-3"><StatusPill level={r.level} /></td>
                    <td className="px-4 py-3 text-[12px] font-semibold">{r.status}</td>
                    <td className="px-4 py-3">{r.unit}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-muted tabular-nums"><Clock size={14} {...ic} />{r.sla}</span></td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {view.length === 0 && (
            <div className="py-10">
              <EmptyState text="Không có phiếu phù hợp" />
              <div className="flex justify-center"><Button variant="subtle" icon={FilterX} onClick={() => { setFilter('Tất cả'); setQ('') }}>Xóa bộ lọc</Button></div>
            </div>
          )}
        </div>

        {view.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[12px] text-muted tabular-nums">Hiển thị {(page - 1) * PAGE + 1}–{(page - 1) * PAGE + view.length} trong {list.length} phiếu</p>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Trang trước" className="flex size-8 items-center justify-center rounded-full bg-surface transition hover:bg-page disabled:opacity-40"><ChevronLeft size={16} {...ic} /></button>
              {nums.map((n) => (
                <button key={n} onClick={() => setPage(n)} className={cn('size-8 rounded-full text-[12px] font-semibold transition', n === page ? 'bg-ink text-white' : 'text-muted hover:bg-surface')}>{n}</button>
              ))}
              <button disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Trang sau" className="flex size-8 items-center justify-center rounded-full bg-surface transition hover:bg-page disabled:opacity-40"><ChevronRight size={16} {...ic} /></button>
            </div>
          </div>
        )}
      </section>
    </DispatcherShell>
  )
}
