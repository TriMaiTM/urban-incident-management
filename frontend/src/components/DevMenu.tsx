'use client'

import { useEffect, useState, type ComponentType } from 'react'
import {
  LayoutGrid,
  Menu,
  X,
  FileText,
  Map,
  Radar,
  ClipboardList,
  Navigation,
  Timer,
  Truck,
  BookOpen,
  Code2,
  FileQuestion,
  ShieldOff,
  ServerCrash,
  Wrench,
  WifiOff,
  Layers,
  SlidersHorizontal,
  Plug,
  Users,
  ScrollText,
  List,
  LogIn,
  UserPlus,
  KeyRound,
  IdCard,
  History,
  ShieldCheck,
  FileCheck,
  BadgeCheck,
  Search,
  BarChart3,
  FileText as FileIcon,
  Bell,
  Star,
  UserRound,
  ChevronDown,
  LogOut,
  type LucideProps,
} from 'lucide-react'
import { cn, ic } from './primitives'
import { DEMO_ID, getTicket, getTickets, nextStatus, resetTickets, setStatus, statusLabel, useTicketVersion } from '../data/tickets'
import {
  AUTH_CHANGE_EVENT,
  type ApiUserOut,
  clearAuthSession,
  getStoredUser,
  loginAsDemoRole,
} from '../lib/backend-api'

type RoleKey = 'CITIZEN' | 'DISPATCHER' | 'TECHNICIAN' | 'ADMIN'
type RouteItem = { path: string; label: string; icon: ComponentType<LucideProps> }
type RouteSection = {
  id: string
  title: string
  badge: string
  role?: RoleKey
  items: RouteItem[]
}

const ROLE_LABELS: Record<RoleKey, string> = {
  CITIZEN: 'Công dân',
  DISPATCHER: 'Điều phối IOC',
  TECHNICIAN: 'Kỹ thuật viên',
  ADMIN: 'Quản trị',
}

export default function DevMenu() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<ApiUserOut | null>(null)
  const [switchingRole, setSwitchingRole] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    citizen: true,
    dispatcher: true,
    technician: true,
    admin: true,
    system: false,
  })

  const version = useTicketVersion()
  const tickets = getTickets()
  const latestCode = tickets[0]?.id ?? DEMO_ID
  const demo = getTicket(latestCode) ?? getTicket(DEMO_ID)!
  const next = demo ? nextStatus(demo.status) : null
  const current = (typeof window !== 'undefined' ? window.location.pathname : '/').replace(/\/$/, '') || '/'

  useEffect(() => {
    const sync = () => setUser(getStoredUser())
    sync()
    window.addEventListener(AUTH_CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [version])

  const sections: RouteSection[] = [
    {
      id: 'citizen',
      title: '1. Công dân',
      badge: '8 màn',
      role: 'CITIZEN',
      items: [
        { path: '/', label: 'Trang chủ (Bản đồ)', icon: Map },
        { path: '/report', label: 'Báo cáo hiện trường', icon: FileText },
        { path: '/incidents', label: 'Danh sách sự cố', icon: List },
        { path: `/tracking/${latestCode}`, label: 'Tra cứu tiến độ', icon: Search },
        { path: '/citizen/my-reports', label: 'Phản ánh của tôi', icon: UserRound },
        { path: `/citizen/reports/${latestCode}`, label: 'Chi tiết phản ánh', icon: FileIcon },
        { path: `/citizen/feedback/${DEMO_ID}`, label: 'Đánh giá & Khiếu nại', icon: Star },
        { path: '/citizen/notifications', label: 'Thông báo', icon: Bell },
      ],
    },
    {
      id: 'dispatcher',
      title: '2. Điều phối viên IOC',
      badge: '5 màn',
      role: 'DISPATCHER',
      items: [
        { path: '/dispatcher/command-center', label: 'Bàn tác chiến IOC', icon: Radar },
        { path: '/dispatcher/verify', label: 'Nghiệm thu hiện trường', icon: BadgeCheck },
        { path: '/dispatcher/sla-watch', label: 'Giám sát SLA', icon: Timer },
        { path: '/dispatcher/field-units', label: 'Điều động đội', icon: Truck },
        { path: '/dispatcher/incidents', label: 'Sổ bộ sự cố', icon: BookOpen },
      ],
    },
    {
      id: 'technician',
      title: '3. Kỹ thuật viên',
      badge: '5 màn',
      role: 'TECHNICIAN',
      items: [
        { path: '/technician/tasks', label: 'Danh sách nhiệm vụ', icon: ClipboardList },
        { path: `/technician/tasks/${latestCode}`, label: 'Chi tiết nhiệm vụ', icon: Navigation },
        { path: `/technician/tasks/${latestCode}/resolve`, label: 'Gửi biên bản nghiệm thu', icon: FileCheck },
        { path: '/technician/history', label: 'Nhật ký công tác', icon: History },
        { path: '/technician/profile', label: 'Trực ban & GPS', icon: ShieldCheck },
      ],
    },
    {
      id: 'admin',
      title: '4. Quản trị hệ thống',
      badge: '6 màn',
      role: 'ADMIN',
      items: [
        { path: '/admin/analytics', label: 'Bảng chỉ số (Analytics)', icon: BarChart3 },
        { path: '/admin/zones', label: 'Phân vùng GIS (7 Quận)', icon: Layers },
        { path: '/admin/users', label: 'Quản lý người dùng', icon: Users },
        { path: '/admin/settings', label: 'Cấu hình SLA & Đơn vị', icon: SlidersHorizontal },
        { path: '/admin/integrations', label: 'Giám sát tích hợp', icon: Plug },
        { path: '/admin/audit-logs', label: 'Nhật ký kiểm toán', icon: ScrollText },
      ],
    },
    {
      id: 'system',
      title: '5. Xác thực & Hệ thống',
      badge: '11 màn',
      items: [
        { path: '/auth/login', label: 'Đăng nhập', icon: LogIn },
        { path: '/auth/register', label: 'Đăng ký', icon: UserPlus },
        { path: '/auth/forgot-password', label: 'Quên mật khẩu', icon: KeyRound },
        { path: '/profile', label: 'Hồ sơ cá nhân', icon: IdCard },
        { path: '/developers/open311', label: 'Open311 API', icon: Code2 },
        { path: '/gallery', label: 'Component Gallery', icon: LayoutGrid },
        { path: '/403', label: '403 Từ chối truy cập', icon: ShieldOff },
        { path: '/404', label: '404 Không tìm thấy', icon: FileQuestion },
        { path: '/500', label: '500 Lỗi máy chủ', icon: ServerCrash },
        { path: '/maintenance', label: 'Bảo trì hệ thống', icon: Wrench },
        { path: '/offline', label: 'Ngoại tuyến (Offline)', icon: WifiOff },
      ],
    },
  ]

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleQuickRole = async (role: RoleKey) => {
    setSwitchingRole(role)
    await loginAsDemoRole(role)
    setSwitchingRole(null)
  }

  return (
    <div className="fixed right-4 bottom-28 z-50 flex flex-col items-end gap-2 md:bottom-4">
      {open && (
        <nav className="animate-rise max-h-[82vh] w-[310px] overflow-y-auto rounded-card bg-card p-3 shadow-card ring-1 ring-black/5">
          {/* Phần 1: Phiên đăng nhập & Chuyển nhanh Role Demo */}
          <div className="mb-2.5 rounded-tile bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted">Phiên đăng nhập hiện tại</p>
                <p className="truncate text-[13px] font-bold text-ink">
                  {user ? `${user.full_name} (${ROLE_LABELS[user.role]})` : 'Khách (Chưa đăng nhập)'}
                </p>
              </div>
              {user && (
                <button
                  type="button"
                  title="Đăng xuất"
                  onClick={() => clearAuthSession()}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card text-muted shadow-card transition hover:text-urgent"
                >
                  <LogOut size={13} {...ic} />
                </button>
              )}
            </div>
            <p className="mt-2 mb-1.5 text-[11px] text-muted">Chuyển nhanh tài khoản Demo:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['CITIZEN', 'DISPATCHER', 'TECHNICIAN', 'ADMIN'] as RoleKey[]).map((r) => {
                const active = user?.role === r
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={switchingRole !== null}
                    onClick={() => handleQuickRole(r)}
                    className={cn(
                      'h-7 rounded-full px-2.5 text-[11px] font-semibold transition',
                      active ? 'bg-ink text-white' : 'bg-card text-ink hover:bg-page',
                    )}
                  >
                    {switchingRole === r ? 'Đang chuyển…' : ROLE_LABELS[r]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Phần 2: Điều khiển nhanh phiếu mới nhất */}
          {demo && (
            <div className="mb-2.5 rounded-tile bg-surface p-2.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-mono font-semibold text-muted">{demo.id}</span>
                <span className="font-bold text-ink">{statusLabel[demo.status]}</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  disabled={!next}
                  onClick={() => next && setStatus(demo.id, next)}
                  className="h-7 flex-1 rounded-full bg-ink px-2.5 text-[11px] font-semibold text-white disabled:opacity-40"
                >
                  {next ? `→ ${statusLabel[next]}` : 'Hết vòng đời'}
                </button>
                <button
                  onClick={resetTickets}
                  className="h-7 rounded-full bg-card px-2.5 text-[11px] font-semibold"
                >
                  Đồng bộ DB
                </button>
              </div>
            </div>
          )}

          {/* Phần 3: Danh sách màn hình chia theo 5 Section Role */}
          <div className="space-y-2">
            {sections.map((sec) => {
              const isOpen = openSections[sec.id]
              const isMyRole = sec.role && user?.role === sec.role
              return (
                <div key={sec.id} className="overflow-hidden rounded-tile border border-surface">
                  <button
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-bold transition',
                      isMyRole ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-page',
                    )}
                  >
                    <span>{sec.title}</span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          isMyRole ? 'bg-white/20 text-white' : 'bg-card text-muted',
                        )}
                      >
                        {sec.badge}
                      </span>
                      <ChevronDown
                        size={14}
                        {...ic}
                        className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
                      />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="divide-y divide-surface/60 bg-card p-1">
                      {sec.items.map((r) => {
                        const active = current === r.path
                        return (
                          <a
                            key={r.path}
                            href={r.path}
                            className={cn(
                              'flex h-8.5 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition',
                              active ? 'bg-ink font-semibold text-white' : 'text-ink hover:bg-surface',
                            )}
                          >
                            <r.icon size={15} {...ic} className="shrink-0" />
                            <span className="truncate">{r.label}</span>
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menu màn hình theo vai trò"
        className="flex size-12 items-center justify-center rounded-full bg-ink text-white shadow-card transition active:scale-95"
      >
        {open ? <X size={20} {...ic} /> : <Menu size={20} {...ic} />}
      </button>
    </div>
  )
}
