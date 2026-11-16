'use client'

import ClientRouteShell from '@/components/ClientRouteShell'
import { ServerErrorScreen } from '@/screens/ExceptionScreens'

export default function Page() {
  return (
    <ClientRouteShell>
      <ServerErrorScreen />
    </ClientRouteShell>
  )
}
