'use client'

import { type ReactNode, useEffect, useState } from 'react'
import DevMenu from './DevMenu'

export default function ClientRouteShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="min-h-screen bg-page" />
  }

  return (
    <>
      {children}
      <DevMenu />
    </>
  )
}
