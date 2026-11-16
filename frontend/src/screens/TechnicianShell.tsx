'use client'

import type { ReactNode } from 'react'
import { Avatar, Toast } from '../components/primitives'
import { TechnicianNav } from '../components/nav'

export type TechToast = null | { kind: 'success' | 'error' | 'info'; text: string }

export default function TechnicianShell({ title, subtitle, toast, children }: { title: string; subtitle: string; toast?: TechToast; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-page pb-28 md:pb-4">
      {toast && <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 animate-rise"><Toast kind={toast.kind} text={toast.text} /></div>}
      <div className="mx-auto flex w-full max-w-[1440px] gap-4 p-4">
        <div className="hidden shrink-0 md:block"><TechnicianNav mode="rail" /></div>
        <div className="min-w-0 flex-1">
          <header className="animate-rise mb-4 flex items-end justify-between">
            <div>
              <h1 className="text-[24px] font-bold">{title}</h1>
              <p className="mt-1 text-[12px] text-muted">{subtitle}</p>
            </div>
            <a href="/profile" aria-label="Hồ sơ"><Avatar name="Lê Văn Hùng" size={48} online /></a>
          </header>
          {children}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-4 md:hidden"><TechnicianNav mode="tabbar" /></div>
    </div>
  )
}
