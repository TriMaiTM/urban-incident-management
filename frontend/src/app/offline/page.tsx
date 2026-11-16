'use client'

import ClientRouteShell from '@/components/ClientRouteShell'
import { OfflineScreen } from '@/screens/ExceptionScreens'

export default function Page() {
  return (
    <ClientRouteShell>
      <OfflineScreen />
    </ClientRouteShell>
  )
}
