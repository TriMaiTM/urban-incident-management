'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowLeft, LogIn, ShieldAlert } from 'lucide-react'
import DevMenu from './DevMenu'
import { Button, IconChip } from './primitives'
import {
  AUTH_CHANGE_EVENT,
  type ApiUserOut,
  getAuthToken,
  getStoredUser,
} from '../lib/backend-api'

type Role = 'CITIZEN' | 'DISPATCHER' | 'TECHNICIAN' | 'ADMIN'
type RoutePolicy = 'PUBLIC' | 'ANY_AUTH' | Role

const ROLE_LABELS: Record<Role, string> = {
  CITIZEN: 'Công dân',
  DISPATCHER: 'Điều phối viên IOC',
  TECHNICIAN: 'Kỹ thuật viên hiện trường',
  ADMIN: 'Quản trị hệ thống',
}

export const ROLE_HOME_PATHS: Record<Role, string> = {
  CITIZEN: '/',
  DISPATCHER: '/dispatcher/command-center',
  TECHNICIAN: '/technician/tasks',
  ADMIN: '/admin/analytics',
}

export function getRoutePolicy(pathname: string): RoutePolicy {
  const p = pathname.replace(/\/$/, '') || '/'
  if (p.startsWith('/admin')) return 'ADMIN'
  if (p.startsWith('/dispatcher')) return 'DISPATCHER'
  if (p.startsWith('/technician')) return 'TECHNICIAN'
  if (p.startsWith('/citizen') || p === '/report') return 'CITIZEN'
  if (p === '/profile') return 'ANY_AUTH'
  return 'PUBLIC'
}

export default function ClientRouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/'
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<ApiUserOut | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const syncAuth = () => {
      setToken(getAuthToken())
      setUser(getStoredUser())
    }
    syncAuth()
    setMounted(true)
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuth)
    window.addEventListener('storage', syncAuth)
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuth)
      window.removeEventListener('storage', syncAuth)
    }
  }, [pathname])

  const policy = getRoutePolicy(pathname)
  const isLoggedIn = Boolean(token && user)

  useEffect(() => {
    if (!mounted) return
    if (policy !== 'PUBLIC' && !isLoggedIn) {
      window.location.replace(`/auth/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [mounted, policy, isLoggedIn, pathname])

  if (!mounted) {
    return <div className="min-h-screen bg-page" />
  }

  // 1. Unauthenticated user visiting a protected route -> redirecting to /auth/login
  if (policy !== 'PUBLIC' && !isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page p-4">
        <div className="animate-rise w-full max-w-[440px] rounded-card bg-card p-6 text-center shadow-card">
          <div className="mx-auto mb-3 flex justify-center">
            <IconChip icon={LogIn} tone="ink" size={48} />
          </div>
          <h1 className="text-[18px] font-bold">Yêu cầu đăng nhập</h1>
          <p className="mt-1 text-[13px] text-muted">
            Đang chuyển tới trang đăng nhập để truy cập{' '}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] text-ink">{pathname}</code>…
          </p>
        </div>
        <DevMenu />
      </div>
    )
  }

  // 2. Authenticated user visiting a route belonging to a DIFFERENT role -> 403 Forbidden Gate
  if (
    policy !== 'PUBLIC' &&
    policy !== 'ANY_AUTH' &&
    user &&
    user.role !== policy
  ) {
    const myHome = ROLE_HOME_PATHS[user.role] ?? '/'
    return (
      <div className="flex min-h-screen items-center justify-center bg-page p-4">
        <div className="animate-rise w-full max-w-[520px] rounded-card bg-card p-6 shadow-card md:p-8">
          <div className="flex items-center justify-between">
            <span className="inline-flex h-7 items-center rounded-full bg-urgent/10 px-3 text-[12px] font-bold text-urgent">
              403 · Sai phân quyền vai trò
            </span>
            <IconChip icon={ShieldAlert} tone="urgent" size={40} />
          </div>
          <h1 className="mt-4 text-[24px] leading-tight font-bold">
            Không có quyền truy cập phân hệ này
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            Trang <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] text-ink">{pathname}</code>{' '}
            chỉ dành riêng cho vai trò <strong className="text-ink">{ROLE_LABELS[policy]}</strong>.
          </p>

          <div className="mt-4 space-y-2 rounded-tile bg-surface p-3.5 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-muted">Tài khoản đang đăng nhập:</span>
              <span className="font-semibold text-ink">{user.full_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Vai trò hiện tại của bạn:</span>
              <span className="inline-flex h-6 items-center rounded-full bg-card px-2.5 text-[12px] font-bold text-ink">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Vai trò yêu cầu:</span>
              <span className="inline-flex h-6 items-center rounded-full bg-ink px-2.5 text-[12px] font-bold text-white">
                {ROLE_LABELS[policy]}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => {
                window.location.href = myHome
              }}
            >
              Về không gian {ROLE_LABELS[user.role]}
            </Button>
            <Button
              icon={LogIn}
              onClick={() => {
                window.location.href = `/auth/login?next=${encodeURIComponent(pathname)}`
              }}
            >
              Đăng nhập {ROLE_LABELS[policy]}
            </Button>
          </div>
        </div>
        <DevMenu />
      </div>
    )
  }

  return (
    <>
      {children}
      <DevMenu />
    </>
  )
}
