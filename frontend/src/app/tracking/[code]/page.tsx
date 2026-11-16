'use client'

import { useParams } from 'next/navigation'
import ClientRouteShell from '@/components/ClientRouteShell'
import TrackingScreen from '@/screens/TrackingScreen'

export default function Page() {
  const params = useParams<{ code: string }>()
  const raw = params?.code ? decodeURIComponent(String(params.code)) : 'DN-202610-0129'
  return (
    <ClientRouteShell>
      <TrackingScreen code={raw} />
    </ClientRouteShell>
  )
}
