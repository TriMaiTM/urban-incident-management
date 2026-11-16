'use client'

import ClientRouteShell from '@/components/ClientRouteShell'
import { NotFoundScreen } from '@/screens/ExceptionScreens'

export default function NotFound() {
  return (
    <ClientRouteShell>
      <NotFoundScreen />
    </ClientRouteShell>
  )
}
