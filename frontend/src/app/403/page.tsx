'use client'

import ClientRouteShell from '@/components/ClientRouteShell'
import { ForbiddenScreen } from '@/screens/ExceptionScreens'

export default function Page() {
  return (
    <ClientRouteShell>
      <ForbiddenScreen />
    </ClientRouteShell>
  )
}
