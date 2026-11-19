'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Download,
  Edit3,
  Layers,
  MapPin,
  PenTool,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react'
import { Button, IconChip, PillTab, Skeleton, cn, ic } from '../components/primitives'
import GoongBentoMap, {
  ensureLiveZonesLoaded,
  invalidateLiveZonesCache,
  type InteractiveZoneItem,
} from '../components/GoongBentoMap'
import AdminShell from './AdminShell'
import districtsGeoJsonRaw from '../data/danang_districts_boundary.json'
import { apiListZones, apiUpdateZone, type ApiZoneOut } from '../lib/backend-api'
import { getTickets, isOpen, useTicketVersion } from '../data/tickets'

const LABEL_LNG_LAT: Record<string, [number, number]> = {
  hc: [108.216, 16.058],
  tk: [108.191, 16.068],
  st: [108.258, 16.098],
  cl: [108.193, 16.015],
  nhs: [108.252, 16.002],
  lc: [108.14, 16.115],
  hv: [108.015, 16.035],
}

/** Extract the largest exterior ring [lng, lat][] (without duplicate closing vertex) from a Polygon or MultiPolygon. */
function extractPrimaryRing(geom: GeoJSON.Geometry): [number, number][] {
  let ring: number[][] = []
  if (geom.type === 'Polygon') {
    ring = geom.coordinates[0] ?? []
  } else if (geom.type === 'MultiPolygon') {
    let best: number[][] = []
    for (const poly of geom.coordinates) {
      const candidate = poly[0] ?? []
      if (candidate.length > best.length) best = candidate
    }
    ring = best
  }
  const pts: [number, number][] = ring.map((c) => [+Number(c[0]).toFixed(6), +Number(c[1]).toFixed(6)])
  if (
    pts.length > 1 &&
    Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 1e-7 &&
    Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 1e-7
  ) {
    pts.pop()
  }
  return pts
}

/** Uniformly subsample a dense ring down to `targetCount` control vertices for smooth interactive dragging. */
function simplifyRingPoints(pts: [number, number][], targetCount = 32): [number, number][] {
  if (pts.length <= targetCount) return pts
  const out: [number, number][] = []
  const step = pts.length / targetCount
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.min(pts.length - 1, Math.round(i * step))
    out.push(pts[idx])
  }
  return out
}

/** Convert an open array of [lng, lat] vertices into a valid GeoJSON MultiPolygon. */
function ringToMultiPolygon(pts: [number, number][]): GeoJSON.MultiPolygon {
  const closed: [number, number][] = pts.length > 0 ? [...pts, pts[0]] : []
  return {
    type: 'MultiPolygon',
    coordinates: [[closed]],
  }
}

const TABS = ['Trình vẽ Đa giác GIS', 'Thông số Lõi Hệ thống']

export default function SystemSettingsScreen() {
  const ticketVer = useTicketVersion()
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [zones, setZones] = useState<InteractiveZoneItem[]>([])
  const [selectedId, setSelectedId] = useState<string>('nhs')
  const [mode, setMode] = useState<'view' | 'edit' | 'draw'>('edit')
  const [points, setPoints] = useState<[number, number][]>([])
  const [history, setHistory] = useState<[number, number][][]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [jsonDraft, setJsonDraft] = useState('')
  const [toast, setToast] = useState<null | { kind: 'success' | 'info' | 'error'; text: string }>(null)
  const timer = useRef<number | undefined>(undefined)

  // Core Engine Settings state (persisted in localStorage)
  const [coreConfig, setCoreConfig] = useState({
    dedupRadiusMeters: '50',
    verifyGpsMeters: '50',
    decree13BlurEnabled: true,
    opencvVisualFallback: true,
    postgisStrictContain: true,
    rateLimitPerMin: '10',
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('urbana.core_settings')
      if (saved) {
        setCoreConfig((prev) => ({ ...prev, ...(JSON.parse(saved) as Partial<typeof prev>) }))
      }
    } catch {
      // ignore
    }
  }, [])

  const openCountsByDistrict = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of getTickets()) {
      if (isOpen(t)) {
        const k = t.district.trim().toLowerCase()
        counts[k] = (counts[k] ?? 0) + 1
      }
    }
    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketVer])

  const defaultZones = useMemo<InteractiveZoneItem[]>(() => {
    return (
      districtsGeoJsonRaw.features as unknown as Array<{
        properties: { zone_id: string; name: string; is_active?: boolean }
        geometry: GeoJSON.Geometry
      }>
    ).map((f) => {
      const id = f.properties.zone_id.toLowerCase()
      const name = f.properties.name
      return {
        id,
        backendId: f.properties.zone_id,
        name,
        open: 0,
        on: f.properties.is_active !== false,
        labelLngLat: LABEL_LNG_LAT[id] ?? [108.2, 16.06],
        geometry: f.geometry,
      }
    })
  }, [])

  const loadedZoneIdRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    apiListZones()
      .then((apiZones: ApiZoneOut[]) => {
        if (!active) return
        const districts = apiZones.filter((z) => z.id.toUpperCase() !== 'DANANG_CORE')
        const merged = defaultZones.map((seed) => {
          const match = districts.find((d) => d.id.toLowerCase() === seed.id)
          if (!match) return seed
          return {
            ...seed,
            backendId: match.id,
            name: match.name || seed.name,
            open: match.open_incident_count ?? 0,
            on: match.is_active,
            geometry: (match.geojson_geometry as unknown as GeoJSON.Geometry) ?? seed.geometry,
          }
        })
        setZones(merged)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setZones(defaultZones)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [defaultZones])

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedId) ?? zones[0],
    [zones, selectedId],
  )

  // Load 100% of the exact saved vertices from PostGIS when selecting a zone (NEVER auto-simplify!)
  useEffect(() => {
    if (!selectedZone) return
    if (loadedZoneIdRef.current === selectedZone.id) return
    loadedZoneIdRef.current = selectedZone.id
    const rawPts = extractPrimaryRing(selectedZone.geometry)
    setPoints(rawPts)
    setHistory([])
  }, [selectedZone])

  const say = (kind: 'success' | 'info' | 'error', text: string) => {
    setToast({ kind, text })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2600)
  }

  const pushPoints = (next: [number, number][]) => {
    setHistory((h) => [...h.slice(-25), points])
    setPoints(next)
  }

  const handleMapClickDraw = (pt: [number, number]) => {
    pushPoints([...points, pt])
  }

  const handleMoveVertex = (index: number, pt: [number, number]) => {
    const next = points.map((p, i) => (i === index ? pt : p))
    pushPoints(next)
  }

  const handleRemoveVertex = (index: number) => {
    if (points.length <= 3 && mode === 'edit') {
      say('error', 'Đa giác cần tối thiểu 3 điểm đỉnh')
      return
    }
    pushPoints(points.filter((_, i) => i !== index))
  }

  const handleInsertVertex = (afterIndex: number, pt: [number, number]) => {
    const next = [...points]
    next.splice(afterIndex + 1, 0, pt)
    pushPoints(next)
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setPoints(prev)
  }

  const handleStartFreshDraw = () => {
    setMode('draw')
    pushPoints([])
    say('info', `Chế độ vẽ mới: Hãy chấm từng điểm trên bản đồ để vẽ ranh giới ${selectedZone?.name ?? ''}`)
  }

  const handleSimplify = (targetCount: number) => {
    if (!selectedZone) return
    const rawPts = extractPrimaryRing(selectedZone.geometry)
    const source = rawPts.length > points.length ? rawPts : points
    pushPoints(simplifyRingPoints(source, targetCount))
    setMode('edit')
    say('info', `Đã chuẩn hóa về ${Math.min(source.length, targetCount)} điểm neo để dễ kéo chỉnh`)
  }

  const handleResetDefault = () => {
    if (!selectedZone) return
    const def = defaultZones.find((d) => d.id === selectedZone.id)
    if (!def) return
    const rawPts = extractPrimaryRing(def.geometry)
    pushPoints(rawPts)
    setZones((prev) => prev.map((z) => (z.id === selectedZone.id ? { ...z, geometry: def.geometry } : z)))
    setMode('edit')
    say('info', `Đã nạp lại ranh giới mặc định cho ${selectedZone.name} (${rawPts.length} đỉnh)`)
  }

  const handleSaveBoundary = async () => {
    if (!selectedZone) return
    if (points.length < 3) {
      say('error', 'Vui lòng chấm tối thiểu 3 điểm đỉnh để tạo đa giác hợp lệ')
      return
    }
    setSaving(true)
    const newGeom = ringToMultiPolygon(points)
    try {
      const zoneCode = selectedZone.backendId ?? selectedZone.id.toUpperCase()
      await apiUpdateZone(zoneCode, {
        geojson_geometry: newGeom as unknown as { type: string; coordinates: unknown },
      })
      setZones((prev) =>
        prev.map((z) => (z.id === selectedZone.id ? { ...z, geometry: newGeom } : z)),
      )
      invalidateLiveZonesCache()
      await ensureLiveZonesLoaded(true)
      setMode('edit')
      say('success', `Đã lưu ranh giới mới của ${selectedZone.name} vào PostGIS (${points.length} đỉnh)`)
    } catch (err) {
      say('error', err instanceof Error ? err.message : 'Không thể lưu ranh giới vào PostGIS')
    } finally {
      setSaving(false)
    }
  }

  const handleExportGeoJson = () => {
    if (!selectedZone) return
    const currentGeom = points.length >= 3 ? ringToMultiPolygon(points) : selectedZone.geometry
    const feature = {
      type: 'Feature',
      properties: {
        zone_id: (selectedZone.backendId ?? selectedZone.id).toUpperCase(),
        name: selectedZone.name,
        is_active: selectedZone.on,
      },
      geometry: currentGeom,
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(feature, null, 2)], { type: 'application/geo+json' }),
    )
    a.download = `ranh-gioi-${selectedZone.id}.geojson`
    a.click()
    say('success', `Đã xuất tệp GeoJSON cho ${selectedZone.name}`)
  }

  const handleApplyJsonDraft = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as unknown
      if (Array.isArray(parsed)) {
        const validPts: [number, number][] = parsed
          .filter((item): item is [number, number] => Array.isArray(item) && item.length >= 2)
          .map((item) => [+Number(item[0]).toFixed(6), +Number(item[1]).toFixed(6)])
        if (validPts.length < 3) throw new Error('Cần tối thiểu 3 tọa độ [lng, lat]')
        pushPoints(validPts)
      } else if (parsed && typeof parsed === 'object' && 'type' in parsed) {
        const obj = parsed as { type: string; geometry?: GeoJSON.Geometry; coordinates?: unknown }
        const geom = (obj.type === 'Feature' ? obj.geometry : (obj as unknown as GeoJSON.Geometry))
        if (!geom) throw new Error('Không tìm thấy geometry hợp lệ')
        const ring = extractPrimaryRing(geom)
        if (ring.length < 3) throw new Error('Geometry cần tối thiểu 3 đỉnh')
        pushPoints(ring)
      }
      setShowJsonModal(false)
      setMode('edit')
      say('success', 'Đã nạp tọa độ từ JSON')
    } catch (err) {
      say('error', err instanceof Error ? err.message : 'Định dạng JSON không hợp lệ')
    }
  }

  const saveCoreEngineSettings = () => {
    try {
      localStorage.setItem('urbana.core_settings', JSON.stringify(coreConfig))
      say('success', 'Đã lưu cấu hình thông số lõi hệ thống')
    } catch {
      say('error', 'Không thể lưu cấu hình')
    }
  }

  // Build zones preview where the currently selected zone uses the live draft polygon points
  const previewZones = useMemo<InteractiveZoneItem[]>(() => {
    return zones.map((z) => {
      if (z.id === selectedZone?.id && points.length >= 3) {
        return {
          ...z,
          geometry: ringToMultiPolygon(points),
        }
      }
      return z
    })
  }, [zones, selectedZone?.id, points])

  return (
    <AdminShell
      title="Cài đặt hệ thống"
      subtitle="Trình vẽ & hiệu chỉnh đa giác ranh giới GIS (PostGIS) và các thông số cốt lõi của nền tảng"
      toast={toast}
      actions={
        <div className="flex items-center gap-3">
          <PillTab tone="ink" items={TABS} value={activeTab} onChange={setActiveTab} />
          {activeTab === TABS[0] && (
            <Button
              size="lg"
              icon={Save}
              loading={saving}
              disabled={points.length < 3}
              onClick={handleSaveBoundary}
            >
              Lưu ranh giới vào PostGIS
            </Button>
          )}
        </div>
      }
    >
      {activeTab === TABS[0] ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_410px]">
          {/* Bản đồ tương tác vẽ & kéo chỉnh đỉnh đa giác */}
          <section className="relative h-[calc(100dvh-116px)] min-h-[540px] overflow-hidden rounded-card bg-card shadow-card">
            {loading ? (
              <Skeleton className="size-full" />
            ) : (
              <>
                <GoongBentoMap
                  fill
                  controls="bottom"
                  interactiveZones={previewZones}
                  selectedZoneId={selectedId}
                  onSelectZone={(id) => {
                    if (mode !== 'draw') setSelectedId(id)
                  }}
                  polygonPoints={points}
                  polygonMode={mode}
                  onPolygonMapClick={handleMapClickDraw}
                  onPolygonMoveVertex={handleMoveVertex}
                  onPolygonRemoveVertex={handleRemoveVertex}
                  onPolygonInsertVertex={handleInsertVertex}
                />

                {/* Thanh công cụ nổi phía trên bản đồ */}
                <div className="absolute top-3 right-3 left-3 z-10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-card/95 p-1.5 shadow-card backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => setMode('edit')}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition',
                        mode === 'edit' ? 'bg-ink text-white' : 'text-ink hover:bg-surface',
                      )}
                    >
                      <Edit3 size={14} {...ic} />
                      Kéo chỉnh đỉnh ({points.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleStartFreshDraw}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition',
                        mode === 'draw' ? 'bg-accent text-white' : 'text-ink hover:bg-surface',
                      )}
                    >
                      <PenTool size={14} {...ic} />
                      Vẽ mới từ đầu
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('view')}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition',
                        mode === 'view' ? 'bg-ink text-white' : 'text-ink hover:bg-surface',
                      )}
                    >
                      <Layers size={14} {...ic} />
                      Xem tổng thể
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-card/95 p-1.5 shadow-card backdrop-blur-sm">
                    <button
                      type="button"
                      disabled={history.length === 0}
                      onClick={handleUndo}
                      title="Hoàn tác thao tác vừa rồi"
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-surface px-3 text-[12px] font-semibold text-ink transition hover:bg-page disabled:opacity-40"
                    >
                      <Undo2 size={14} {...ic} />
                      Hoàn tác
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimplify(20)}
                      title="Rút gọn thành 20 điểm neo chính để dễ kéo chỉnh"
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-surface px-3 text-[12px] font-semibold text-ink transition hover:bg-page"
                    >
                      20 đỉnh
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDefault}
                      title="Khôi phục ranh giới mặc định ban đầu"
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-surface px-3 text-[12px] font-semibold text-ink transition hover:bg-page"
                    >
                      <RotateCcw size={14} {...ic} />
                      Mặc định
                    </button>
                  </div>
                </div>

                {/* Hướng dẫn thao tác trực quan dưới đáy bản đồ */}
                <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[540px] rounded-card bg-ink/90 px-4 py-2.5 text-[12px] text-white shadow-card backdrop-blur-sm">
                  {mode === 'draw' ? (
                    <p>
                      <strong className="text-accent">Chế độ Vẽ mới:</strong> Click từng điểm trên bản đồ để tạo ranh giới mới cho{' '}
                      <strong>{selectedZone?.name}</strong> (đã chấm <strong>{points.length}</strong> điểm, cần tối thiểu 3 điểm). Kéo chốt số để tinh chỉnh.
                    </p>
                  ) : mode === 'edit' ? (
                    <p>
                      <strong>Chế độ Kéo chỉnh đỉnh:</strong> Kéo các chốt số màu đỏ để dời vị trí đỉnh · Bấm dấu{' '}
                      <span className="inline-flex size-4 items-center justify-center rounded-full bg-white font-bold text-ink">+</span> giữa cạnh để thêm đỉnh · Nhấp đúp hoặc chuột phải vào đỉnh để xóa.
                    </p>
                  ) : (
                    <p>
                      <strong>Chế độ Xem tổng thể:</strong> Bấm vào tên Quận/Huyện trên bản đồ hoặc cột bên phải để chọn vùng cần chỉnh sửa.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Bảng điều khiển bên phải: Chọn vùng, Danh sách tọa độ đỉnh & Xuất/Nhập GeoJSON */}
          <aside className="flex h-[calc(100dvh-116px)] min-h-[540px] flex-col gap-3 overflow-hidden rounded-card bg-surface p-3">
            {/* 1. Chọn khu vực */}
            <div className="rounded-card bg-card p-3.5 shadow-card">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold">1. Chọn khu vực cần vẽ / chỉnh sửa</span>
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                  {(selectedZone?.backendId ?? selectedId).toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {zones.map((z) => {
                  const active = z.id === selectedId
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(z.id)
                        if (mode === 'draw') setMode('edit')
                      }}
                      className={cn(
                        'flex items-center justify-between rounded-tile px-3 py-2 text-left text-[12px] font-semibold transition',
                        active ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-page',
                      )}
                    >
                      <span className="truncate">{z.name.replace('Quận ', '').replace('Huyện ', '')}</span>
                      <span
                        className={cn(
                          'size-2 shrink-0 rounded-full',
                          z.on ? 'bg-done' : 'bg-muted',
                        )}
                        title={z.on ? 'Đang tiếp nhận' : 'Đang tạm dừng'}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Danh sách các điểm đỉnh [lng, lat] của khu vực đang chọn */}
            <div className="flex min-h-0 flex-1 flex-col rounded-card bg-card p-3.5 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-semibold">
                    2. Danh sách điểm đỉnh ({points.length} đỉnh)
                  </h3>
                  <p className="text-[11px] text-muted">Chuẩn WGS84 (Kinh độ, Vĩ độ)</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setJsonDraft(JSON.stringify(points, null, 2))
                      setShowJsonModal(true)
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-full bg-surface px-2.5 text-[11px] font-semibold text-ink transition hover:bg-page"
                  >
                    <Upload size={12} {...ic} />
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleExportGeoJson}
                    className="inline-flex h-7 items-center gap-1 rounded-full bg-surface px-2.5 text-[11px] font-semibold text-ink transition hover:bg-page"
                  >
                    <Download size={12} {...ic} />
                    GeoJSON
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {points.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[12px] text-muted">
                    <PenTool size={22} {...ic} />
                    <p>Chưa có điểm đỉnh nào. Hãy click trực tiếp lên bản đồ bên trái để chấm điểm.</p>
                  </div>
                ) : (
                  points.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-tile bg-surface px-2.5 py-1.5 text-[12px]"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 font-mono text-[11px] tabular-nums">
                        <input
                          type="number"
                          step="0.0005"
                          value={pt[0]}
                          aria-label={`Kinh độ đỉnh ${idx + 1}`}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!Number.isNaN(val)) handleMoveVertex(idx, [val, pt[1]])
                          }}
                          className="rounded bg-card px-1.5 py-0.5 text-ink outline-none focus:ring-1 focus:ring-ink"
                        />
                        <input
                          type="number"
                          step="0.0005"
                          value={pt[1]}
                          aria-label={`Vĩ độ đỉnh ${idx + 1}`}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!Number.isNaN(val)) handleMoveVertex(idx, [pt[0], val])
                          }}
                          className="rounded bg-card px-1.5 py-0.5 text-ink outline-none focus:ring-1 focus:ring-ink"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVertex(idx)}
                        title="Xóa điểm đỉnh này"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-urgent/10 hover:text-urgent"
                      >
                        <Trash2 size={13} {...ic} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 flex gap-2 border-t border-surface pt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  onClick={() => {
                    const last = points[points.length - 1] ?? selectedZone?.labelLngLat ?? [108.22, 16.06]
                    pushPoints([...points, [+(last[0] + 0.004).toFixed(6), +(last[1] - 0.004).toFixed(6)]])
                  }}
                >
                  Thêm đỉnh
                </Button>
                <Button
                  size="sm"
                  icon={Save}
                  loading={saving}
                  disabled={points.length < 3}
                  onClick={handleSaveBoundary}
                >
                  Lưu vào PostGIS
                </Button>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* Tab 2: Thông số Lõi Hệ thống (Core System Parameters) */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="animate-rise rounded-card bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <IconChip icon={MapPin} tone="ink" size={40} />
              <div>
                <h2 className="text-[16px] font-semibold">Không gian GIS & Hàng rào Địa lý (PostGIS)</h2>
                <p className="text-[12px] text-muted">Tham số kiểm tra tọa độ WGS84 (SRID 4326) và gom trùng không gian</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-tile bg-surface p-4">
                <div>
                  <p className="text-[14px] font-semibold">Bán kính phát hiện trùng lặp sự cố (`ST_DWithin`)</p>
                  <p className="text-[12px] text-muted">Gợi ý gộp phiếu khi công dân báo cùng loại sự cố trong bán kính</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={coreConfig.dedupRadiusMeters}
                    onChange={(e) => setCoreConfig((c) => ({ ...c, dedupRadiusMeters: e.target.value }))}
                    className="h-10 w-20 rounded-tile bg-card text-center text-[16px] font-bold tabular-nums outline-none focus:ring-2 focus:ring-ink"
                  />
                  <span className="text-[13px] text-muted">mét</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-tile bg-surface p-4">
                <div>
                  <p className="text-[14px] font-semibold">Ngưỡng sai lệch GPS nghiệm thu hiện trường</p>
                  <p className="text-[12px] text-muted">Khoảng cách tối đa giữa ảnh Trước và ảnh Sau của Kỹ thuật viên</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={coreConfig.verifyGpsMeters}
                    onChange={(e) => setCoreConfig((c) => ({ ...c, verifyGpsMeters: e.target.value }))}
                    className="h-10 w-20 rounded-tile bg-card text-center text-[16px] font-bold tabular-nums outline-none focus:ring-2 focus:ring-ink"
                  />
                  <span className="text-[13px] text-muted">mét</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-tile bg-surface p-4">
                <div>
                  <p className="text-[14px] font-semibold">Kiểm tra nghiêm ngặt vùng tạm dừng (`ST_Contains`)</p>
                  <p className="text-[12px] text-muted">Chặn gửi phản ánh khi ghim nằm ngoài Đà Nẵng hoặc thuộc Quận đang tắt</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={coreConfig.postgisStrictContain}
                  onClick={() =>
                    setCoreConfig((c) => ({ ...c, postgisStrictContain: !c.postgisStrictContain }))
                  }
                  className={cn(
                    'flex h-7 w-12 items-center rounded-full p-1 transition-colors',
                    coreConfig.postgisStrictContain ? 'bg-ink' : 'bg-low',
                  )}
                >
                  <span
                    className={cn(
                      'size-5 rounded-full bg-white transition-transform',
                      coreConfig.postgisStrictContain && 'translate-x-5',
                    )}
                  />
                </button>
              </div>
            </div>
          </section>

          <section className="animate-rise rounded-card bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <IconChip icon={Sparkles} tone="ink" size={40} />
              <div>
                <h2 className="text-[16px] font-semibold">Lõi AI Thị giác & Bảo vệ Dữ liệu Cá nhân (NĐ13)</h2>
                <p className="text-[12px] text-muted">Cấu hình xử lý hình ảnh OpenCV và tự động phân loại sự cố</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-tile bg-surface p-4">
                <div>
                  <p className="text-[14px] font-semibold">Tự động làm mờ khuôn mặt & biển số (Nghị định 13/2023/NĐ-CP)</p>
                  <p className="text-[12px] text-muted">Sử dụng OpenCV Haar Cascade làm mờ trước khi công khai ảnh</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={coreConfig.decree13BlurEnabled}
                  onClick={() =>
                    setCoreConfig((c) => ({ ...c, decree13BlurEnabled: !c.decree13BlurEnabled }))
                  }
                  className={cn(
                    'flex h-7 w-12 items-center rounded-full p-1 transition-colors',
                    coreConfig.decree13BlurEnabled ? 'bg-done' : 'bg-low',
                  )}
                >
                  <span
                    className={cn(
                      'size-5 rounded-full bg-white transition-transform',
                      coreConfig.decree13BlurEnabled && 'translate-x-5',
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-tile bg-surface p-4">
                <div>
                  <p className="text-[14px] font-semibold">Bộ phân tích đặc trưng thị giác OpenCV nội bộ</p>
                  <p className="text-[12px] text-muted">Phân tích màu HSV & mật độ cạnh Canny khi chưa gắn khóa DeepSeek API</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={coreConfig.opencvVisualFallback}
                  onClick={() =>
                    setCoreConfig((c) => ({ ...c, opencvVisualFallback: !c.opencvVisualFallback }))
                  }
                  className={cn(
                    'flex h-7 w-12 items-center rounded-full p-1 transition-colors',
                    coreConfig.opencvVisualFallback ? 'bg-ink' : 'bg-low',
                  )}
                >
                  <span
                    className={cn(
                      'size-5 rounded-full bg-white transition-transform',
                      coreConfig.opencvVisualFallback && 'translate-x-5',
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-tile bg-surface p-4">
                <div>
                  <p className="text-[14px] font-semibold">Giới hạn tần suất phân tích ảnh AI (Rate Limit)</p>
                  <p className="text-[12px] text-muted">Số lượt gọi `/api/v1/incidents/analyze-image` tối đa mỗi phút</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={coreConfig.rateLimitPerMin}
                    onChange={(e) => setCoreConfig((c) => ({ ...c, rateLimitPerMin: e.target.value }))}
                    className="h-10 w-20 rounded-tile bg-card text-center text-[16px] font-bold tabular-nums outline-none focus:ring-2 focus:ring-ink"
                  />
                  <span className="text-[13px] text-muted">lần/phút</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button icon={Check} onClick={saveCoreEngineSettings}>
                  Lưu thông số lõi
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Modal nhập/sửa nhanh mảng JSON tọa độ */}
      {showJsonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setShowJsonModal(false)}
        >
          <div className="animate-rise w-full max-w-[560px] rounded-card bg-card p-6 shadow-card">
            <h3 className="text-[16px] font-semibold">
              Nhập / Chỉnh sửa JSON tọa độ — {selectedZone?.name}
            </h3>
            <p className="mt-1 text-[12px] text-muted">
              Hỗ trợ mảng tọa độ <code>[[lng, lat], ...]</code> hoặc đối tượng GeoJSON <code>Feature / Polygon / MultiPolygon</code>.
            </p>
            <textarea
              rows={10}
              value={jsonDraft}
              onChange={(e) => setJsonDraft(e.target.value)}
              className="mt-3 w-full rounded-tile bg-surface p-3 font-mono text-[12px] text-ink outline-none focus:ring-2 focus:ring-ink"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="subtle" onClick={() => setShowJsonModal(false)}>
                Đóng
              </Button>
              <Button icon={Check} onClick={handleApplyJsonDraft}>
                Áp dụng tọa độ
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
