'use client'

import ClientRouteShell from '@/components/ClientRouteShell'
import CommandCenterScreen from '@/screens/CommandCenterScreen'

export default function Page() {
  return (
    <ClientRouteShell>
      <CommandCenterScreen />
    </ClientRouteShell>
  )
}
