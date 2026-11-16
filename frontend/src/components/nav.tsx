'use client'

import {
  Bell,
  ClipboardList,
  Home,
  Map as MapIcon,
  PhoneOff,
  Search,
  Settings,
  User,
  X,
  Clock,
  MapPin,
  Sparkles,
  Radar,
  Layers,
  SlidersHorizontal,
  Plug,
  Users as UsersIcon,
  ScrollText,
  List,
  CircleUser,
  UserRound,
  History,
  FilePlus2,
  BarChart3,
  Timer,
  Truck,
  BookOpen,
  BadgeCheck,
  type LucideProps,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import SamplePhoto from './SamplePhoto'
import { Avatar, Button, IconChip, StatusPill, cn, ic } from './primitives'

type Icon = ComponentType<LucideProps>
const items: { icon: Icon; label: string }[] = [
  { icon: Home, label: 'Tổng quan' },
  { icon: MapIcon, label: 'Bản đồ' },
  { icon: ClipboardList, label: 'Phiếu' },
  { icon: Settings, label: 'Cài đặt' },
]

/* 9. SidebarNav */
export function SidebarNav({ mode, active = 0 }: { mode: 'rail' | 'expanded' | 'tabbar'; active?: number }) {
  if (mode === 'tabbar')
    return (
      <nav className="flex w-[390px] max-w-full items-center justify-around rounded-card bg-card p-2 shadow-card">
        {items.map((it, i) => (
          <button key={it.label} className={cn('flex flex-col items-center gap-1 rounded-tile px-4 py-2 text-[12px] font-semibold transition', i === active ? 'bg-ink text-white' : 'text-muted hover:text-ink')}>
            <it.icon size={20} {...ic} />
            {it.label}
          </button>
        ))}
      </nav>
    )
  const wide = mode === 'expanded'
  return (
    <nav className={cn('flex flex-col gap-2 rounded-card bg-surface p-2', wide ? 'w-[200px]' : 'w-16 items-center')}>
      {items.map((it, i) => (
        <button
          key={it.label}
          className={cn('group relative flex h-12 items-center gap-3 rounded-tile text-[14px] font-semibold transition', wide ? 'px-3' : 'w-12 justify-center', i === active ? 'bg-ink text-white' : 'text-muted hover:bg-card hover:text-ink')}
        >
          <it.icon size={20} {...ic} />
          {wide ? it.label : <span role="tooltip" className="pointer-events-none absolute top-1/2 left-full z-[100] ml-3 -translate-y-1/2 translate-x-1 rounded-tile bg-card px-4 py-2.5 text-[14px] font-medium whitespace-nowrap text-ink opacity-0 shadow-[0_8px_32px_rgba(0,0,0,0.14)] ring-1 ring-black/5 transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">{it.label}</span>}
        </button>
      ))}
    </nav>
  )
}

/* 10. TopPillNav: ba viên tách rời (logo | đề mục | tìm kiếm, thông báo, hồ sơ) */
export function TopPillNav(_: { active?: number }) {
  const cur = pathNow()
  const pill = 'flex items-center rounded-full bg-card p-2 shadow-card'
  return (
    <div className="flex items-center justify-between gap-3">
      <a href="/" className={cn(pill, 'gap-2 py-2 pr-5 pl-2 text-[14px] font-bold')}><IconChip icon={MapPin} tone="ink" size={32} />Đà Nẵng</a>
      <nav className={cn(pill, 'gap-1')}>
        {citizenItems.filter((t) => t !== profileItem).map((t) => (
          <a key={t.path} href={t.path} className={cn('inline-flex h-10 items-center rounded-full px-4 text-[14px] font-semibold transition', t.match(cur) ? 'bg-ink text-white' : 'text-muted hover:bg-surface hover:text-ink')}>{t.label}</a>
        ))}
      </nav>
      <div className={cn(pill, 'gap-2')}>
        <a href="/tracking/DN-202610-0129" aria-label="Tra cứu" className="flex size-10 items-center justify-center rounded-full bg-surface transition hover:bg-page"><Search size={16} {...ic} /></a>
        <a href="/citizen/notifications" aria-label="Thông báo" className={cn('flex size-10 items-center justify-center rounded-full transition', cur === '/citizen/notifications' ? 'bg-ink text-white' : 'bg-surface hover:bg-page')}><Bell size={16} {...ic} /></a>
        <a href="/profile" aria-label="Hồ sơ" className={cn('rounded-full', cur === '/profile' && 'ring-2 ring-ink')}><Avatar name="Nguyễn Minh" /></a>
      </div>
    </div>
  )
}

/* 11. ModalDialog */
export function ModalDialog({
  variant,
  title,
  children,
  confirm,
  cancelLabel = 'Hủy',
  onCancel,
  onConfirm,
}: {
  variant: 'modal' | 'sheet'
  title: string
  children?: ReactNode
  confirm: string
  cancelLabel?: string
  onCancel?: () => void
  onConfirm?: () => void
}) {
  const body = (
    <>
      {variant === 'sheet' && <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-low" />}
      <div className="flex items-center justify-between">
        <h4 className="text-[16px] font-semibold">{title}</h4>
        <button onClick={onCancel} className="flex size-8 items-center justify-center rounded-full bg-surface"><X size={16} {...ic} /></button>
      </div>
      <div className="my-4">{children}</div>
      <div className="flex justify-end gap-2">
        <Button variant="subtle" onClick={onCancel}>{cancelLabel}</Button>
        <Button onClick={onConfirm}>{confirm}</Button>
      </div>
    </>
  )
  return (
    <div className={cn('relative flex overflow-hidden rounded-card bg-ink/40 p-4', variant === 'modal' ? 'h-[260px] items-center justify-center' : 'h-[260px] w-[390px] max-w-full items-end p-0')}>
      <div className={cn('animate-rise bg-card shadow-card', variant === 'modal' ? 'w-full max-w-[360px] rounded-card p-6' : 'w-full rounded-t-[20px] p-6')}>{body}</div>
    </div>
  )
}

/* 12. SideSheet */
export function SideSheet() {
  return (
    <div className="relative flex h-[420px] justify-end overflow-hidden rounded-card bg-ink/40">
      <aside className="animate-slide-in flex w-[320px] flex-col gap-4 bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h4 className="text-[16px] font-semibold">DN-202610-0001</h4>
          <button className="flex size-8 items-center justify-center rounded-full bg-surface"><X size={16} {...ic} /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill level="urgent" />
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface px-3 text-[12px] font-semibold"><Sparkles size={12} {...ic} />AI gợi ý</span>
        </div>
        <div className="h-28 overflow-hidden rounded-tile"><SamplePhoto className="size-full" /></div>
        <div className="space-y-3 text-[14px]">
          <div className="flex items-center gap-3"><IconChip icon={MapPin} size={32} />Nguyễn Văn Linh, Hải Châu</div>
          <div className="flex items-center gap-3"><IconChip icon={Clock} tone="urgent" size={32} />Còn 1 giờ 20 phút</div>
          <div className="flex items-center gap-3"><IconChip icon={PhoneOff} size={32} />0905***123</div>
          <div className="flex items-center gap-3"><IconChip icon={User} size={32} />Đội CTĐT Hải Châu</div>
        </div>
        <div className="mt-auto flex gap-2"><Button variant="subtle">Gộp phiếu</Button><Button>Giao việc</Button></div>
      </aside>
    </div>
  )
}

/* Rail / tab bar theo vai trò: link thật, mục đang chọn lấy theo đường dẫn */
type NavItem = { icon: Icon; label: string; path: string; match: (p: string) => boolean }
const pathNow = () => (typeof window !== 'undefined' ? window.location.pathname : '/').replace(/\/$/, '') || '/'
const profileItem: NavItem = { icon: CircleUser, label: 'Hồ sơ', path: '/profile', match: (p) => p === '/profile' }
export type Role = 'citizen' | 'dispatcher' | 'technician' | 'admin'
const dispatcherItems: NavItem[] = [
  { icon: Radar, label: 'Bàn tác chiến', path: '/dispatcher/command-center', match: (p) => p === '/dispatcher/command-center' },
  { icon: Timer, label: 'Giám sát SLA', path: '/dispatcher/sla-watch', match: (p) => p === '/dispatcher/sla-watch' },
  { icon: Truck, label: 'Điều động đội', path: '/dispatcher/field-units', match: (p) => p === '/dispatcher/field-units' },
  { icon: BookOpen, label: 'Sổ bộ', path: '/dispatcher/incidents', match: (p) => p === '/dispatcher/incidents' },
  { icon: BadgeCheck, label: 'Nghiệm thu', path: '/dispatcher/verify', match: (p) => p === '/dispatcher/verify' },
  profileItem,
]
const technicianItems: NavItem[] = [
  { icon: ClipboardList, label: 'Nhiệm vụ', path: '/technician/tasks', match: (p) => p.startsWith('/technician/tasks') },
  { icon: History, label: 'Nhật ký', path: '/technician/history', match: (p) => p === '/technician/history' },
  { icon: UserRound, label: 'Trực ban', path: '/technician/profile', match: (p) => p === '/technician/profile' },
  profileItem,
]
const citizenItems: NavItem[] = [
  { icon: Home, label: 'Trang chủ', path: '/', match: (p) => p === '/' },
  { icon: FilePlus2, label: 'Báo cáo', path: '/report', match: (p) => p === '/report' },
  { icon: ClipboardList, label: 'Của tôi', path: '/citizen/my-reports', match: (p) => p.startsWith('/citizen') },
  { icon: List, label: 'Sự cố', path: '/incidents', match: (p) => p === '/incidents' || p.startsWith('/tracking') },
  profileItem,
]
const adminItems: NavItem[] = [
  { icon: BarChart3, label: 'Bảng chỉ số', path: '/admin/analytics', match: (p) => p === '/admin/analytics' },
  { icon: UsersIcon, label: 'Người dùng', path: '/admin/users', match: (p) => p === '/admin/users' },
  { icon: ScrollText, label: 'Nhật ký', path: '/admin/audit-logs', match: (p) => p === '/admin/audit-logs' },
  { icon: Layers, label: 'Phân vùng', path: '/admin/zones', match: (p) => p === '/admin/zones' },
  { icon: SlidersHorizontal, label: 'Cấu hình', path: '/admin/settings', match: (p) => p === '/admin/settings' },
  { icon: Plug, label: 'Tích hợp', path: '/admin/integrations', match: (p) => p === '/admin/integrations' },
  profileItem,
]
const roleItems: Record<Role, NavItem[]> = { citizen: citizenItems, dispatcher: dispatcherItems, technician: technicianItems, admin: adminItems }
function LinkNav({ role, mode }: { role: Role; mode: 'rail' | 'tabbar' }) {
  const items = roleItems[role]
  const cur = pathNow()
  if (typeof window !== 'undefined' && cur !== '/profile') localStorage.setItem('urbana.role', role)
  if (mode === 'tabbar')
    return (
      <nav className="flex w-[390px] max-w-full items-center justify-around rounded-card bg-card p-2 shadow-card">
        {items.map((it) => (
          <a key={it.path} href={it.path} className={cn('flex min-w-0 flex-1 flex-col items-center gap-1 rounded-tile px-1 py-2 text-[12px] font-semibold transition', it.match(cur) ? 'bg-ink text-white' : 'text-muted hover:text-ink')}>
            <it.icon size={20} {...ic} />
            {it.label}
          </a>
        ))}
      </nav>
    )
  return (
    <nav className="flex w-16 flex-col items-center gap-2 rounded-card bg-surface p-2">
      {items.map((it) => (
        <a key={it.path} href={it.path} aria-label={it.label} className={cn('group relative flex size-12 items-center justify-center rounded-tile transition', it.match(cur) ? 'bg-ink text-white' : 'text-muted hover:bg-card hover:text-ink')}>
          <it.icon size={20} {...ic} />
          <span role="tooltip" className="pointer-events-none absolute top-1/2 left-full z-[100] ml-3 -translate-y-1/2 translate-x-1 rounded-tile bg-card px-4 py-2.5 text-[14px] font-medium whitespace-nowrap text-ink opacity-0 shadow-[0_8px_32px_rgba(0,0,0,0.14)] ring-1 ring-black/5 transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">{it.label}</span>
        </a>
      ))}
    </nav>
  )
}
export const DispatcherRail = () => <LinkNav role="dispatcher" mode="rail" />
export const TechnicianNav = ({ mode }: { mode: 'rail' | 'tabbar' }) => <LinkNav role="technician" mode={mode} />
export const CitizenTabBar = () => <LinkNav role="citizen" mode="tabbar" />
export const AdminRail = () => <LinkNav role="admin" mode="rail" />

export const RoleNav = ({ role, mode }: { role: Role; mode: 'rail' | 'tabbar' }) => <LinkNav role={role} mode={mode} />
export const currentRole = (): Role =>
  (new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('role') ??
    (typeof window !== 'undefined' ? localStorage.getItem('urbana.role') : null) ??
    'citizen') as Role
