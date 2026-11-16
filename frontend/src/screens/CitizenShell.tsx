'use client'

import type { ReactNode } from 'react'
import { Toast } from '../components/primitives'
import { CitizenTabBar, TopPillNav } from '../components/nav'

export default function CitizenShell({
  title, sub, children, toast, right,
}: { title: string; sub: string; children: ReactNode; toast?: string | null; right?: ReactNode }) {
  return (
    <div className="min-h-screen bg-page pb-28 md:pb-8">
      {toast && <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 animate-rise"><Toast kind="success" text={toast} /></div>}
      <div className="mx-auto w-full max-w-[1440px] p-4 md:p-8">
        <div className="hidden md:block"><TopPillNav active={1} /></div>
        <header className="animate-rise mt-2 mb-4 flex items-end justify-between gap-4 md:mt-6 md:mb-6">
          <div className="min-w-0">
            <h1 className="truncate text-[24px] font-bold">{title}</h1>
            <p className="mt-1 truncate text-[12px] text-muted">{sub}</p>
          </div>
          {right}
        </header>
        {children}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-4 md:hidden"><CitizenTabBar /></div>
    </div>
  )
}
