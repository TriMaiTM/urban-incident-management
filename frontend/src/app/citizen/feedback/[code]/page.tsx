'use client'

import { useParams } from 'next/navigation'
import ClientRouteShell from '@/components/ClientRouteShell'
import FeedbackScreen from '@/screens/FeedbackScreen'

export default function Page() {
  const params = useParams<{ code: string }>()
  const raw = params?.code ? decodeURIComponent(String(params.code)) : 'DN-202610-0129'
  return (
    <ClientRouteShell>
      <FeedbackScreen code={raw} />
    </ClientRouteShell>
  )
}
