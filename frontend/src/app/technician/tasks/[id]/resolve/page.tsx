'use client'

import { useParams } from 'next/navigation'
import ClientRouteShell from '@/components/ClientRouteShell'
import TaskResolveScreen from '@/screens/TaskResolveScreen'

export default function Page() {
  const params = useParams<{ id: string }>()
  const raw = params?.id ? decodeURIComponent(String(params.id)) : 'DN-202610-0129'
  return (
    <ClientRouteShell>
      <TaskResolveScreen id={raw} />
    </ClientRouteShell>
  )
}
