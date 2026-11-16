'use client'

// Ảnh hiện trường mẫu: cây đổ sau bão trên đường Đà Nẵng.
export default function SamplePhoto({ className }: { className?: string }) {
  return <img src="/field-photo.jpg" alt="Ảnh hiện trường" draggable={false} className={`object-cover ${className ?? ''}`} />
}
