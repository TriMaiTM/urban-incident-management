'use client'

import ClientRouteShell from '@/components/ClientRouteShell'
import SystemSettingsScreen from '@/screens/SystemSettingsScreen'

export default function Page() {
  return (
    <ClientRouteShell>
      <SystemSettingsScreen />
    </ClientRouteShell>
  )
}
