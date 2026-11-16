'use client'

import ClientRouteShell from '@/components/ClientRouteShell'
import TaskListScreen from '@/screens/TaskListScreen'

export default function Page() {
  return (
    <ClientRouteShell>
      <TaskListScreen />
    </ClientRouteShell>
  )
}
