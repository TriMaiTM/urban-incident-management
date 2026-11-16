'use client'

import ClientRouteShell from '@/components/ClientRouteShell'
import UsersScreen from '@/screens/UsersScreen'

export default function Page() {
  return (
    <ClientRouteShell>
      <UsersScreen />
    </ClientRouteShell>
  )
}
