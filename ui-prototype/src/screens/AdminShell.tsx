import type { ReactNode } from 'react'
import { Avatar, Toast } from '../components/primitives'
import { AdminRail } from '../components/nav'

export default function AdminShell({ title, subtitle, actions, toast, children }: { title: string; subtitle: string; actions?: ReactNode; toast?: null | { kind: 'success' | 'error' | 'info'; text: string }; children: ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-auto bg-page">
      {toast && <div className="fixed top-6 left-1/2 z-[120] -translate-x-1/2 animate-rise"><Toast kind={toast.kind} text={toast.text} /></div>}
      <div className="flex min-h-screen w-[1440px] gap-4 p-4">
        <div className="shrink-0"><AdminRail /></div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex items-center justify-between">
            <div className="animate-rise">
              <h1 className="text-[24px] font-bold">{title}</h1>
              <p className="mt-1 text-[12px] text-muted">{subtitle}</p>
            </div>
            <div className="flex items-center gap-4">
              {actions}
              <a href="/profile" aria-label="Hồ sơ"><Avatar name="Nguyễn Hoàng Anh" size={48} online /></a>
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  )
}
