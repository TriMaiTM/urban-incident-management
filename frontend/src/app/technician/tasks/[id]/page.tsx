'use client'

import { useParams } from 'next/navigation'
import ClientRouteShell from '@/components/ClientRouteShell'
import TaskDetailScreen from '@/screens/TaskDetailScreen'

export default function Page() {
  const params = useParams<{ id: string }>()
  const raw = params?.id ? decodeURIComponent(String(params.id)) : 'DN-202610-0129'
  return (
    <ClientRouteShell>
      <TaskDetailScreen id={raw} />
    </ClientRouteShell>
  )
}
