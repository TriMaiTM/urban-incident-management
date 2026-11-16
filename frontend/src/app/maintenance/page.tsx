'use client'

import ClientRouteShell from '@/components/ClientRouteShell'
import { MaintenanceScreen } from '@/screens/ExceptionScreens'

export default function Page() {
  return (
    <ClientRouteShell>
      <MaintenanceScreen />
    </ClientRouteShell>
  )
}
