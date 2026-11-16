'use client'

import { useState } from 'react'
import { LayoutGrid, Menu, X, FileText, Map, Radar, ClipboardList, Navigation, Timer, Truck, BookOpen, Code2, FileQuestion, ShieldOff, ServerCrash, Wrench, WifiOff, Layers, SlidersHorizontal, Plug, Users, ScrollText, List, LogIn, UserPlus, KeyRound, IdCard, History, ShieldCheck, FileCheck, BadgeCheck, Search, BarChart3, FileText as FileIcon, Bell, Star, UserRound } from 'lucide-react'
import { cn, ic } from './primitives'
import { DEMO_ID, getTicket, nextStatus, resetTickets, setStatus, statusLabel, useTicketVersion } from '../data/tickets'

// Thêm màn mới vào đây để hiện trong menu.
const routes = [
  { path: '/', label: 'Trang chủ', icon: Map },
  { path: '/auth/login', label: 'Đăng nhập', icon: LogIn },
  { path: '/auth/register', label: 'Đăng ký', icon: UserPlus },
  { path: '/auth/forgot-password', label: 'Quên mật khẩu', icon: KeyRound },
  { path: '/profile', label: 'Hồ sơ', icon: IdCard },
  { path: '/incidents', label: 'Danh sách sự cố', icon: List },
  { path: '/admin/users', label: 'Người dùng', icon: Users },
  { path: '/admin/audit-logs', label: 'Nhật ký', icon: ScrollText },
  { path: '/admin/zones', label: 'Phân vùng GIS', icon: Layers },
  { path: '/admin/settings', label: 'Cấu hình', icon: SlidersHorizontal },
  { path: '/admin/integrations', label: 'Tích hợp', icon: Plug },
  { path: '/404', label: '404 Không tìm thấy', icon: FileQuestion },
  { path: '/403', label: '403 Từ chối', icon: ShieldOff },
  { path: '/500', label: '500 Lỗi máy chủ', icon: ServerCrash },
  { path: '/maintenance', label: 'Bảo trì', icon: Wrench },
  { path: '/offline', label: 'Ngoại tuyến', icon: WifiOff },
  { path: '/developers/open311', label: 'Open311 API', icon: Code2 },
  { path: '/gallery', label: 'Component Gallery', icon: LayoutGrid },
  { path: '/report', label: 'Báo cáo hiện trường', icon: FileText },
  { path: '/dispatcher/command-center', label: 'Bàn tác chiến', icon: Radar },
  { path: '/dispatcher/sla-watch', label: 'Giám sát SLA', icon: Timer },
  { path: '/dispatcher/field-units', label: 'Điều động đội', icon: Truck },
  { path: '/dispatcher/incidents', label: 'Sổ bộ', icon: BookOpen },
  { path: '/citizen/my-reports', label: 'Phản ánh của tôi', icon: UserRound },
  { path: '/citizen/reports/DN-202610-0129', label: 'Chi tiết phản ánh', icon: FileIcon },
  { path: '/citizen/feedback/DN-202610-0052', label: 'Đánh giá', icon: Star },
  { path: '/citizen/notifications', label: 'Thông báo', icon: Bell },
  { path: '/admin/analytics', label: 'Bảng chỉ số', icon: BarChart3 },
  { path: '/tracking/DN-202610-0129', label: 'Tra cứu tiến độ', icon: Search },
  { path: '/dispatcher/verify', label: 'Nghiệm thu (điều phối)', icon: BadgeCheck },
  { path: '/technician/tasks', label: 'Danh sách nhiệm vụ', icon: ClipboardList },
  { path: '/technician/history', label: 'Nhật ký công tác', icon: History },
  { path: '/technician/profile', label: 'Trực ban', icon: ShieldCheck },
  { path: '/technician/tasks/DN-202610-0129', label: 'Chi tiết nhiệm vụ', icon: Navigation },
  { path: '/technician/tasks/DN-202610-0129/resolve', label: 'Nghiệm thu', icon: FileCheck },
]

export default function DevMenu() {
  const [open, setOpen] = useState(false)
  useTicketVersion()
  const demo = getTicket(DEMO_ID)!
  const next = nextStatus(demo.status)
  const current = (typeof window !== 'undefined' ? window.location.pathname : '/').replace(/\/$/, '') || '/'
  return (
    <div className="fixed right-4 bottom-28 z-50 flex flex-col items-end gap-2 md:bottom-4">
      {open && (
        <nav className="animate-rise max-h-[70vh] w-60 overflow-y-auto rounded-card bg-card p-2 shadow-card">
          <div className="mb-2 rounded-tile bg-surface p-3">
            <p className="text-[12px] text-muted">Phiếu demo {DEMO_ID.slice(-4)}</p>
            <p className="text-[14px] font-semibold">{statusLabel[demo.status]}</p>
            <div className="mt-2 flex gap-2">
              <button disabled={!next} onClick={() => next && setStatus(DEMO_ID, next)} className="h-8 flex-1 rounded-full bg-ink px-3 text-[12px] font-semibold text-white disabled:opacity-40">{next ? `→ ${statusLabel[next]}` : 'Hết vòng đời'}</button>
              <button onClick={resetTickets} className="h-8 rounded-full bg-card px-3 text-[12px] font-semibold">Đặt lại</button>
            </div>
          </div>
          {routes.map((r) => (
            <a
              key={r.path}
              href={r.path}
              className={cn('flex h-10 items-center gap-3 rounded-tile px-3 text-[14px] font-semibold transition', (current === r.path) ? 'bg-ink text-white' : 'text-ink hover:bg-surface')}
            >
              <r.icon size={16} {...ic} />
              {r.label}
            </a>
          ))}
        </nav>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menu màn hình"
        className="flex size-12 items-center justify-center rounded-full bg-ink text-white shadow-card transition active:scale-95"
      >
        {open ? <X size={20} {...ic} /> : <Menu size={20} {...ic} />}
      </button>
    </div>
  )
}
