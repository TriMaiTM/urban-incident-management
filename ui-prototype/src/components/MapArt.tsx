// Bản đồ nền thật của Đà Nẵng (ảnh), phủ kín khung chứa.
export default function MapArt() {
  return <img src="/danang-map.png" alt="" draggable={false} className="absolute inset-0 size-full select-none object-fill" />
}

/* Khung có tỉ lệ đúng của ảnh bản đồ: lớp phủ (đa giác, ghim) dùng toạ độ % khớp với ảnh. */
export function MapCanvas({ children }: { children: React.ReactNode }) {
  const r = 1177 / 711
  return (
    <div className="absolute inset-0 overflow-hidden [container-type:size]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: `max(100cqw, ${r * 100}cqh)`, height: `max(100cqh, ${100 / r}cqw)` }}>
        <MapArt />
        {children}
      </div>
    </div>
  )
}
