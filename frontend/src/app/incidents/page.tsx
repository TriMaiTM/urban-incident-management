'use client'

import ClientRouteShell from '@/components/ClientRouteShell'
import IncidentListScreen from '@/screens/IncidentListScreen'

export default function Page() {
  return (
    <ClientRouteShell>
      <IncidentListScreen />
    </ClientRouteShell>
  )
}
