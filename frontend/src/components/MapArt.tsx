'use client'

import GoongBentoMap from './GoongBentoMap'

export default function MapArt() {
  return <GoongBentoMap fill />
}

export function MapCanvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <GoongBentoMap fill />
      {children}
    </div>
  )
}
