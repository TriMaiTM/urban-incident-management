'use client'

import ClientRouteShell from '@/components/ClientRouteShell'
import { NotFoundScreen } from '@/screens/ExceptionScreens'

export default function Page() {
  return (
    <ClientRouteShell>
      <NotFoundScreen />
    </ClientRouteShell>
  )
}
