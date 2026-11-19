'use client'

/**
 * Nguồn dữ liệu mẫu dùng chung cho mọi màn.
 * - Hạn SLA và đồng hồ đếm lùi luôn TÍNH từ thời điểm gửi + mức ưu tiên.
 * - Trạng thái theo vòng đời trong guidelines/Guidelines.md (mục "Vòng đời phiếu").
 * - Thay đổi trạng thái được lưu vào localStorage để các màn thấy cùng một phiếu.
 */
import { useEffect, useState } from 'react'
import {
  type ApiCategoryOut,
  type ApiDepartmentOut,
  type ApiIncidentDetailOut,
  type ApiIncidentOut,
  apiAssignIncident,
  apiGetIncidentDetail,
  apiListCategories,
  apiListDepartments,
  apiListIncidents,
  apiSubmitIncidentFeedback,
  apiTriageIncident,
  apiUpdateIncidentStatus,
  fetchDefaultTechnicianId,
  loadSampleFieldPhotoFile,
} from '../lib/backend-api'

export type Priority = 'urgent' | 'high' | 'normal' | 'low'
export type Status = 'SUBMITTED' | 'TRIAGED' | 'ASSIGNED' | 'REJECTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CONFIRMED' | 'CLOSED' | 'REOPENED'
export type Kind = 'road' | 'flood' | 'tree' | 'trash' | 'light'
export type Gps = { lat: number; lng: number }

export const CATEGORY_TO_KIND: Record<string, Kind> = {
  ROAD_DAMAGE: 'road',
  FLOODING: 'flood',
  FALLEN_TREE: 'tree',
  GARBAGE: 'trash',
  STREETLIGHT: 'light',
  OTHER: 'road',
}

export const KIND_TO_CATEGORY: Record<Kind, string> = {
  road: 'ROAD_DAMAGE',
  flood: 'FLOODING',
  tree: 'FALLEN_TREE',
  trash: 'GARBAGE',
  light: 'STREETLIGHT',
}

export const API_PRIO_TO_UI: Record<string, Priority> = {
  EMERGENCY: 'urgent',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
}

export const UI_PRIO_TO_API: Record<Priority, 'EMERGENCY' | 'HIGH' | 'NORMAL' | 'LOW'> = {
  urgent: 'EMERGENCY',
  high: 'HIGH',
  normal: 'NORMAL',
  low: 'LOW',
}

/** Nhãn hiển thị: dùng đúng một nhãn trên mọi màn. */
export const statusLabel: Record<Status, string> = {
  SUBMITTED: 'Đã tiếp nhận', TRIAGED: 'Đã phân loại', ASSIGNED: 'Đã giao', REJECTED: 'Từ chối', IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã xử lý', CONFIRMED: 'Đã xác nhận', CLOSED: 'Đã đóng', REOPENED: 'Mở lại',
}
export const priorityLabel: Record<Priority, string> = { urgent: 'Khẩn cấp', high: 'Cao', normal: 'Trung bình', low: 'Thấp' }
export const SLA_HOURS: Record<Priority, number> = { urgent: 4, high: 12, normal: 24, low: 48 }
export const kindLabel: Record<Kind, string> = { flood: 'Ngập úng', road: 'Hư hỏng mặt đường', tree: 'Cây đổ', trash: 'Rác thải', light: 'Đèn chiếu sáng' }
export const DEMO_ID = 'DN-202610-0129'

const FLOW: Status[] = ['SUBMITTED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CONFIRMED', 'CLOSED']
export const nextStatus = (s: Status): Status | null => (s === 'REJECTED' ? null : s === 'REOPENED' ? 'RESOLVED' : FLOW[FLOW.indexOf(s) + 1] ?? null)

export type Ticket = {
  id: string; title: string; address: string; district: string; kind: Kind; priority: Priority
  submittedAt: number; status: Status; unit: string; ktv?: string
  x: number; y: number; gps: Gps; gpsAfter?: Gps; hash: string
  supporters: number; badPhoto?: boolean; reason?: string; rated?: number; note?: string
  at: Partial<Record<Status, number>> // thời điểm chuyển trạng thái (ms)
}

/* ---------- Thời gian ---------- */
const MIN = 60_000
const boot = (() => {
  try {
    const v = Number(sessionStorage.getItem('urbana.boot'))
    if (v) return v
    sessionStorage.setItem('urbana.boot', String(Date.now()))
  } catch { /* bỏ qua */ }
  return Date.now()
})()

/* ---------- Toạ độ & mã băm ---------- */
const M_LAT = 111_320
export const fromXY = (x: number, y: number): Gps => ({ lat: +(16.15 - (y / 100) * 0.15).toFixed(6), lng: +(108.1 + (x / 100) * 0.2).toFixed(6) })
const shiftEast = (g: Gps, meters: number): Gps => ({ lat: g.lat, lng: +(g.lng + meters / (M_LAT * Math.cos((g.lat * Math.PI) / 180))).toFixed(6) })
export function distanceM(a: Gps, b: Gps) {
  const r = Math.PI / 180
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}
/** Băm xác định 64 ký tự hex (FNV mở rộng) từ nội dung biên bản. */
function hashOf(s: string) {
  let out = ''
  for (let k = 0; k < 8; k++) {
    let h = 0x811c9dc5 ^ (k * 0x9e3779b1)
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
    out += (h >>> 0).toString(16).padStart(8, '0')
  }
  return out
}
export const shortHash = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`

/* ---------- Dữ liệu gốc ---------- */
type Spec = {
  id: string; title: string; address: string; district: string; kind: Kind; priority: Priority; status: Status
  agoMin: number; x: number; y: number; afterM?: number; unit: string; ktv?: string; supporters: number
  steps: Partial<Record<Status, number>> // phút kể từ lúc gửi
  badPhoto?: boolean; reason?: string; rated?: number; note?: string
}
const U = { flood: 'Công ty Thoát nước', road: 'Đội Cầu đường', tree: 'Công viên Cây xanh', trash: 'Môi trường đô thị', light: 'Chiếu sáng đô thị' }
const specs: Spec[] = [
  { id: 'DN-202610-0131', title: 'Ngập úng đường Lê Duẩn', address: 'Lê Duẩn, Hải Châu', district: 'Hải Châu', kind: 'flood', priority: 'normal', status: 'SUBMITTED', agoMin: 2, x: 46, y: 59.9, unit: U.flood, supporters: 0, steps: {} },
  { id: 'DN-202610-0129', title: 'Ngập úng đường Lê Duẩn', address: 'Lê Duẩn, Hải Châu', district: 'Hải Châu', kind: 'flood', priority: 'high', status: 'TRIAGED', agoMin: 70, x: 45, y: 62, afterM: 12, unit: U.flood, supporters: 3, steps: { TRIAGED: 1 } },
  { id: 'DN-202610-0126', title: 'Cây đổ Điện Biên Phủ', address: 'Điện Biên Phủ, Thanh Khê', district: 'Thanh Khê', kind: 'tree', priority: 'urgent', status: 'TRIAGED', agoMin: 22, x: 55, y: 40, unit: U.tree, supporters: 5, steps: { TRIAGED: 1 } },
  { id: 'DN-202610-0125', title: 'Rác tràn đường Trường Sa', address: 'Trường Sa, Ngũ Hành Sơn', district: 'Ngũ Hành Sơn', kind: 'trash', priority: 'normal', status: 'TRIAGED', agoMin: 300, x: 74, y: 72, unit: U.trash, supporters: 4, steps: { TRIAGED: 2 } },
  { id: 'DN-202610-0127', title: 'Đèn hỏng Quốc lộ 14G', address: 'Quốc lộ 14G, Hòa Vang', district: 'Hòa Vang', kind: 'light', priority: 'low', status: 'TRIAGED', agoMin: 360, x: 8, y: 50, unit: U.light, supporters: 0, badPhoto: true, steps: { TRIAGED: 3 } },
  { id: 'DN-202610-0124', title: 'Ngập úng đường Lê Duẩn', address: '124 Lê Duẩn, Hải Châu', district: 'Hải Châu', kind: 'flood', priority: 'urgent', status: 'ASSIGNED', agoMin: 198, x: 45, y: 62, afterM: 18, unit: U.flood, ktv: 'Lê Văn Hùng', supporters: 3, steps: { TRIAGED: 1, ASSIGNED: 15 } },
  { id: 'DN-202610-0109', title: 'Sạt lở Tôn Đức Thắng', address: 'Tôn Đức Thắng, Liên Chiểu', district: 'Liên Chiểu', kind: 'road', priority: 'urgent', status: 'ASSIGNED', agoMin: 253, x: 22, y: 30, unit: U.road, ktv: 'Phạm Quốc Bảo', supporters: 7, steps: { TRIAGED: 1, ASSIGNED: 20 } },
  { id: 'DN-202610-0121', title: 'Cây đổ Điện Biên Phủ', address: '88 Điện Biên Phủ, Thanh Khê', district: 'Thanh Khê', kind: 'tree', priority: 'high', status: 'IN_PROGRESS', agoMin: 160, x: 55, y: 40, afterM: 68, unit: U.tree, ktv: 'Lê Văn Hùng', supporters: 5, steps: { TRIAGED: 2, ASSIGNED: 25, IN_PROGRESS: 70 } },
  { id: 'DN-202610-0119', title: 'Ổ gà đường Ngô Quyền', address: '215 Ngô Quyền, Sơn Trà', district: 'Sơn Trà', kind: 'road', priority: 'high', status: 'IN_PROGRESS', agoMin: 300, x: 68, y: 25, unit: U.road, ktv: 'Đặng Quốc Bảo', supporters: 2, steps: { TRIAGED: 2, ASSIGNED: 30, IN_PROGRESS: 95 } },
  { id: 'DN-202610-0097', title: 'Cây nghiêng Nguyễn Văn Linh', address: '402 Nguyễn Văn Linh, Hải Châu', district: 'Hải Châu', kind: 'tree', priority: 'normal', status: 'RESOLVED', agoMin: 1560, x: 40, y: 85, afterM: 68, unit: U.tree, ktv: 'Lê Văn Hùng', supporters: 2, steps: { TRIAGED: 2, ASSIGNED: 30, IN_PROGRESS: 90, RESOLVED: 1500 }, note: 'Đã cắt tỉa và gia cố thân cây.' },
  { id: 'DN-202610-0061', title: 'Đèn tắt Nguyễn Hữu Thọ', address: '56 Nguyễn Hữu Thọ, Cẩm Lệ', district: 'Cẩm Lệ', kind: 'light', priority: 'normal', status: 'RESOLVED', agoMin: 600, x: 33, y: 78, afterM: 18, unit: U.light, ktv: 'Lê Văn Hùng', supporters: 1, steps: { TRIAGED: 2, ASSIGNED: 20, IN_PROGRESS: 60, RESOLVED: 420 }, note: 'Đã thay bóng LED và kiểm tra tủ điều khiển.' },
  { id: 'DN-202610-0052', title: 'Ổ gà đường Tôn Đức Thắng', address: '301 Tôn Đức Thắng, Liên Chiểu', district: 'Liên Chiểu', kind: 'road', priority: 'low', status: 'CONFIRMED', agoMin: 4320, x: 22, y: 30, afterM: 25, unit: 'Đội Cầu đường', ktv: 'Phạm Quốc Bảo', supporters: 1, steps: { TRIAGED: 2, ASSIGNED: 8, IN_PROGRESS: 60, RESOLVED: 200, CONFIRMED: 230 }, note: 'Đã cắt vá, đầm nén và hoàn trả mặt đường.' },
  { id: 'DN-202610-0048', title: 'Cây nghiêng Nguyễn Văn Linh', address: '402 Nguyễn Văn Linh, Hải Châu', district: 'Hải Châu', kind: 'tree', priority: 'normal', status: 'CLOSED', agoMin: 7200, x: 40, y: 85, afterM: 15, unit: U.tree, ktv: 'Lê Văn Hùng', supporters: 1, rated: 5, steps: { TRIAGED: 2, ASSIGNED: 20, IN_PROGRESS: 60, RESOLVED: 210, CONFIRMED: 240, CLOSED: 300 }, note: 'Đã cắt tỉa và gia cố thân cây.' },
  { id: 'DN-202610-0036', title: 'Rác thải bãi đất trống', address: 'Hòa Vang, Đà Nẵng', district: 'Hòa Vang', kind: 'trash', priority: 'low', status: 'REJECTED', agoMin: 10080, x: 8, y: 50, unit: U.trash, supporters: 0, reason: 'Ngoài phạm vi tiếp nhận', steps: { TRIAGED: 5, REJECTED: 30 } },
  { id: 'DN-202610-0040', title: 'Rác tràn đường Trường Sa', address: '12 Trường Sa, Ngũ Hành Sơn', district: 'Ngũ Hành Sơn', kind: 'trash', priority: 'normal', status: 'REOPENED', agoMin: 2000, x: 74, y: 72, afterM: 62, unit: U.trash, ktv: 'Hoàng Minh Khoa', supporters: 4, steps: { TRIAGED: 2, ASSIGNED: 30, IN_PROGRESS: 80, RESOLVED: 300, REOPENED: 360 } },
]
const base: Ticket[] = specs.map((s) => {
  const submittedAt = boot - s.agoMin * MIN
  const gps = fromXY(s.x, s.y)
  const at: Ticket['at'] = { SUBMITTED: submittedAt }
  for (const [k, m] of Object.entries(s.steps)) at[k as Status] = submittedAt + (m ?? 0) * MIN
  const resolved = !!s.afterM
  return {
    id: s.id, title: s.title, address: s.address, district: s.district, kind: s.kind, priority: s.priority, submittedAt, status: s.status,
    unit: s.unit, ktv: s.ktv, x: s.x, y: s.y, gps, gpsAfter: resolved ? shiftEast(gps, s.afterM!) : undefined,
    hash: hashOf([s.id, s.kind, gps.lat, gps.lng, s.afterM ?? 0].join('|')), supporters: s.supporters, badPhoto: s.badPhoto,
    reason: s.reason, rated: s.rated, note: s.note, at,
  }
})

/* ---------- Lưu thay đổi trạng thái & Đồng bộ Backend ---------- */
type Override = {
  status: Status
  at: Ticket['at']
  submittedAt?: number
  supporters?: number
  reason?: string
  rated?: number
  note?: string
  ktv?: string
  unit?: string
  kind?: Kind
  priority?: Priority
  proofFile?: File
}
const KEY = 'urbana.tickets'
const EVT = 'urbana-tickets'
const liveTicketsById = new Map<string, Ticket>()
let hasLiveBackendData = false
let initialBackendSyncCompleted = false
let cachedCategories: ApiCategoryOut[] | null = null
let cachedDepartments: ApiDepartmentOut[] | null = null
let cachedTechId: string | null = null

export const isInitialBackendSyncDone = () => initialBackendSyncCompleted

export function toXY(lat: number, lng: number): { x: number; y: number } {
  const x = Math.max(6, Math.min(94, +(((lng - 108.1) / 0.2) * 100).toFixed(1)))
  const y = Math.max(8, Math.min(92, +(((16.15 - lat) / 0.15) * 100).toFixed(1)))
  return { x, y }
}

const DEPT_CODE_TO_UNIT: Record<string, string> = {
  CTN_DN: 'Công ty Thoát nước',
  SGTVT_DN: 'Đội Cầu đường',
  CCX_DN: 'Công viên Cây xanh',
  CMT_DN: 'Môi trường đô thị',
  CCS_DN: 'Chiếu sáng đô thị',
  UBND_HC: 'UBND Quận Hải Châu',
  UBND_TK: 'UBND Quận Thanh Khê',
}

export function mapApiIncidentToTicket(inc: ApiIncidentOut | ApiIncidentDetailOut): Ticket {
  const kind: Kind = CATEGORY_TO_KIND[inc.category_code ?? 'ROAD_DAMAGE'] ?? 'road'
  const priority: Priority = API_PRIO_TO_UI[inc.priority] ?? 'normal'
  const submittedAt = new Date(inc.created_at).getTime() || Date.now()
  const gps: Gps = { lat: inc.latitude, lng: inc.longitude }
  const { x, y } = toXY(inc.latitude, inc.longitude)
  const resolvedMs = inc.resolved_at ? new Date(inc.resolved_at).getTime() : undefined

  const at: Ticket['at'] = { SUBMITTED: submittedAt }
  if (inc.status !== 'SUBMITTED') at.TRIAGED = submittedAt + MIN
  if (['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CONFIRMED', 'CLOSED', 'REOPENED'].includes(inc.status)) {
    at.ASSIGNED = submittedAt + 5 * MIN
  }
  if (['IN_PROGRESS', 'RESOLVED', 'CONFIRMED', 'CLOSED', 'REOPENED'].includes(inc.status)) {
    at.IN_PROGRESS = submittedAt + 15 * MIN
  }
  if (resolvedMs) {
    at.RESOLVED = resolvedMs
  }
  if (['CONFIRMED', 'CLOSED'].includes(inc.status)) {
    at.CONFIRMED = (resolvedMs ?? submittedAt) + 5 * MIN
  }
  if (inc.status === 'CLOSED') {
    at.CLOSED = (at.CONFIRMED ?? submittedAt) + 5 * MIN
  }

  let ktv: string | undefined
  let gpsAfter: Gps | undefined
  let rated: number | undefined
  let note: string | undefined

  if ('history' in inc && Array.isArray(inc.history)) {
    for (const h of inc.history) {
      const hSt = h.to_status as Status
      const tMs = new Date(h.created_at).getTime()
      if (tMs) at[hSt] = tMs
      if (h.to_status === 'RESOLVED' && h.note) note = h.note
    }
  }
  if ('assigned_technician_name' in inc && inc.assigned_technician_name) {
    ktv = inc.assigned_technician_name
  }
  if ('media' in inc && Array.isArray(inc.media)) {
    const proof = inc.media.find((m) => m.media_type === 'AFTER_PROOF')
    if (proof && proof.latitude !== null && proof.longitude !== null) {
      gpsAfter = { lat: proof.latitude, lng: proof.longitude }
    }
  }
  if (!gpsAfter && ['RESOLVED', 'CONFIRMED', 'CLOSED'].includes(inc.status)) {
    gpsAfter = shiftEast(gps, 12)
  }
  if ('feedback' in inc && inc.feedback?.rating) {
    rated = inc.feedback.rating
  }

  const unit =
    (inc.assigned_department_code ? DEPT_CODE_TO_UNIT[inc.assigned_department_code] : undefined) ??
    U[kind]

  return {
    id: inc.ticket_code,
    title: inc.title,
    address: inc.address_text,
    district: inc.district || 'Hải Châu',
    kind,
    priority,
    submittedAt,
    status: inc.status,
    unit,
    ktv,
    x,
    y,
    gps,
    gpsAfter,
    hash: hashOf([inc.ticket_code, kind, gps.lat, gps.lng, 12].join('|')),
    supporters: inc.duplicate_count ?? 0,
    reason: inc.rejection_reason ?? undefined,
    rated,
    note,
    at,
  }
}

export function upsertBackendIncident(inc: ApiIncidentOut | ApiIncidentDetailOut): Ticket {
  const mapped = mapApiIncidentToTicket(inc)
  hasLiveBackendData = true
  liveTicketsById.set(mapped.id, mapped)
  if (typeof window !== 'undefined') {
    const o = load()
    if (o[mapped.id]) {
      delete o[mapped.id]
      localStorage.setItem(KEY, JSON.stringify(o))
    }
    window.dispatchEvent(new Event(EVT))
  }
  return mapped
}

export async function syncTicketsFromBackend(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const res = await apiListIncidents({ page: 1, page_size: 100 })
    hasLiveBackendData = true
    liveTicketsById.clear()
    for (const item of res.items) {
      const mapped = mapApiIncidentToTicket(item)
      liveTicketsById.set(mapped.id, mapped)
    }
  } catch {
    // Graceful fallback to local base tickets when backend is offline
  } finally {
    initialBackendSyncCompleted = true
    window.dispatchEvent(new Event(EVT))
  }
}

const load = (): Record<string, Override> => {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function getTickets(): Ticket[] {
  const o = load()
  // When connected to PostgreSQL backend, use 100% live PostgreSQL incidents (newest first)
  const sourceList: Ticket[] =
    hasLiveBackendData && liveTicketsById.size > 0
      ? Array.from(liveTicketsById.values()).sort((a, b) => b.submittedAt - a.submittedAt)
      : base

  return sourceList.map((t) => {
    const x = o[t.id]
    if (!x) return t
    return {
      ...t,
      status: x.status,
      submittedAt: x.submittedAt ?? t.submittedAt,
      supporters: x.supporters ?? t.supporters,
      reason: x.reason ?? t.reason,
      rated: x.rated ?? t.rated,
      note: x.note ?? t.note,
      ktv: x.ktv ?? t.ktv,
      unit: x.unit ?? t.unit,
      kind: x.kind ?? t.kind,
      priority: x.priority ?? t.priority,
      at: { ...t.at, ...x.at },
    }
  })
}

export const getTicket = (id: string) => getTickets().find((t) => t.id === id)

async function syncStatusMutationToBackend(
  id: string,
  cur: Ticket,
  status: Status,
  extra?: Partial<Override>,
): Promise<void> {
  try {
    if (status === 'ASSIGNED') {
      if (!cachedTechId) {
        cachedTechId = await fetchDefaultTechnicianId()
      }
      if (!cachedCategories) cachedCategories = await apiListCategories()
      if (!cachedDepartments) cachedDepartments = await apiListDepartments()

      const targetKind = extra?.kind ?? cur.kind
      const targetPrio = extra?.priority ?? cur.priority
      const catCode = KIND_TO_CATEGORY[targetKind] ?? 'ROAD_DAMAGE'
      const catObj = cachedCategories.find((c) => c.code === catCode) ?? cachedCategories[0]

      const unitName = extra?.unit ?? cur.unit
      const deptCode = Object.entries(DEPT_CODE_TO_UNIT).find(([, uName]) => uName === unitName)?.[0]
      const deptObj =
        (deptCode ? cachedDepartments.find((d) => d.code === deptCode) : undefined) ??
        cachedDepartments[0]

      if (catObj && deptObj) {
        await apiTriageIncident(id, {
          category_id: catObj.id,
          priority: UI_PRIO_TO_API[targetPrio] ?? 'NORMAL',
          assigned_department_id: deptObj.id,
          note: 'Điều phối viên IOC duyệt phân loại sự cố',
        }).catch(() => {})

        const assigned = await apiAssignIncident(id, {
          assigned_department_id: deptObj.id,
          assigned_technician_id: cachedTechId ?? undefined,
          note: `Giao việc cho ${unitName}`,
        })
        upsertBackendIncident(assigned)
        return
      }
    } else if (status === 'IN_PROGRESS') {
      const updated = await apiUpdateIncidentStatus(id, {
        to_status: 'IN_PROGRESS',
        note: extra?.note || 'Kỹ thuật viên đã có mặt tại hiện trường và bắt đầu xử lý',
      })
      upsertBackendIncident(updated)
      return
    } else if (status === 'RESOLVED') {
      if (cur.status !== 'IN_PROGRESS') {
        await apiUpdateIncidentStatus(id, {
          to_status: 'IN_PROGRESS',
          note: 'Kỹ thuật viên bắt đầu xử lý tại hiện trường',
        }).catch(() => {})
      }
      const proofFile = extra?.proofFile ?? (await loadSampleFieldPhotoFile())
      const updated = await apiUpdateIncidentStatus(id, {
        to_status: 'RESOLVED',
        note: extra?.note || 'Đã hoàn thành khắc phục sự cố tại hiện trường',
        proof_latitude: cur.gps.lat,
        proof_longitude: cur.gps.lng,
        proof_image: proofFile,
      })
      upsertBackendIncident(updated)
      return
    } else if (status === 'CONFIRMED' || status === 'REJECTED' || (status === 'REOPENED' && cur.status === 'RESOLVED')) {
      const updated = await apiUpdateIncidentStatus(id, {
        to_status: status,
        note:
          extra?.reason ||
          extra?.note ||
          (status === 'CONFIRMED'
            ? 'Điều phối viên IOC duyệt nghiệm thu đạt yêu cầu'
            : status === 'REJECTED'
              ? 'Từ chối tiếp nhận phản ánh'
              : 'Yêu cầu kỹ thuật viên xử lý lại hiện trường'),
      })
      upsertBackendIncident(updated)
      return
    } else if (status === 'CLOSED') {
      await apiSubmitIncidentFeedback(id, {
        action: 'CONFIRM',
        rating: extra?.rated,
        comment: extra?.note || 'Công dân xác nhận hài lòng đóng phiếu',
      })
      const detail = await apiGetIncidentDetail(id)
      upsertBackendIncident(detail)
      return
    } else if (status === 'REOPENED' && cur.status === 'CONFIRMED') {
      await apiSubmitIncidentFeedback(id, {
        action: 'DISPUTE',
        rating: extra?.rated,
        comment: extra?.reason || extra?.note || 'Công dân khiếu nại yêu cầu xử lý lại',
      })
      const detail = await apiGetIncidentDetail(id)
      upsertBackendIncident(detail)
      return
    }
  } catch {
    // Keep optimistic state if backend call fails
  }
}

export function setStatus(id: string, status: Status, extra?: Partial<Override>) {
  if (typeof window === 'undefined') return
  const o = load()
  const cur = getTicket(id)
  if (!cur) return
  const { proofFile, ...persistExtra } = extra ?? {}
  void proofFile
  o[id] = {
    ...(o[id] ?? { at: {} }),
    ...persistExtra,
    status,
    at: { ...(o[id]?.at ?? {}), [status]: Date.now() },
  }
  localStorage.setItem(KEY, JSON.stringify(o))
  window.dispatchEvent(new Event(EVT))

  void syncStatusMutationToBackend(id, cur, status, extra)
}

/** Công dân gửi phản ánh ở màn 2: phiếu demo bắt đầu tính SLA từ lúc này, rồi AI tự phân loại. */
export function submitDemoTicket() {
  if (typeof window === 'undefined') return
  const o = load()
  const now = Date.now()
  o[DEMO_ID] = { status: 'SUBMITTED', submittedAt: now, at: { SUBMITTED: now } }
  localStorage.setItem(KEY, JSON.stringify(o))
  window.dispatchEvent(new Event(EVT))
  setTimeout(() => setStatus(DEMO_ID, 'TRIAGED'), 1500)
}

export function resetTickets() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
  window.dispatchEvent(new Event(EVT))
  void syncTicketsFromBackend()
}

/** Hook: render lại khi trạng thái phiếu đổi (kể cả từ tab khác) và tự đồng bộ từ Backend. */
export function useTicketVersion() {
  const [v, setV] = useState(0)
  useEffect(() => {
    const f = () => setV((n) => n + 1)
    const onFocus = () => {
      void syncTicketsFromBackend()
    }
    window.addEventListener(EVT, f)
    window.addEventListener('storage', f)
    window.addEventListener('focus', onFocus)
    void syncTicketsFromBackend()
    const timer = window.setInterval(() => {
      void syncTicketsFromBackend()
    }, 5000)
    return () => {
      window.removeEventListener(EVT, f)
      window.removeEventListener('storage', f)
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [])
  return v
}

/* ---------- Tính toán ---------- */
export const deadlineOf = (t: Pick<Ticket, 'submittedAt' | 'priority'>) => t.submittedAt + SLA_HOURS[t.priority] * 3600_000
const stopAt = (t: Ticket) => t.at.RESOLVED ?? t.at.CONFIRMED ?? t.at.CLOSED
/** Giây còn lại tới hạn SLA (âm = trễ). Phiếu đã xử lý xong thì đóng băng tại lúc xử lý xong. */
export const remainingSec = (t: Ticket, now = Date.now()) => {
  const end = ['RESOLVED', 'CONFIRMED', 'CLOSED'].includes(t.status) ? stopAt(t) ?? now : now
  return Math.round((deadlineOf(t) - end) / 1000)
}
export const gpsDeviation = (t: Ticket) => (t.gpsAfter ? Math.round(distanceM(t.gps, t.gpsAfter)) : 0)
export const isOpen = (t: Ticket) => !['CONFIRMED', 'CLOSED', 'REJECTED'].includes(t.status)
export const clock = (d: number) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
export const agoText = (ms: number) => {
  const m = Math.max(1, Math.round((Date.now() - ms) / MIN))
  return m < 60 ? `${m} phút` : m < 1440 ? `${Math.round(m / 60)} giờ` : `${Math.round(m / 1440)} ngày`
}
export const dateText = (ms: number) => new Date(ms).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
/** Mức hiển thị trên StatusPill: phiếu đã xác nhận/đóng hiện "Hoàn tất". */
export const levelOf = (t: Ticket): Priority | 'done' => (t.status === 'CONFIRMED' || t.status === 'CLOSED' ? 'done' : t.priority)
/** Timeline công dân 5 mốc: Tiếp nhận, Phân loại, Giao việc, Đang xử lý, Đã khắc phục (CONFIRMED/CLOSED = 5 -> xanh cả 5 mốc). */
export const citizenStep = (s: Status) => ({ SUBMITTED: 0, TRIAGED: 1, ASSIGNED: 2, REJECTED: 2, IN_PROGRESS: 3, REOPENED: 3, RESOLVED: 4, CONFIRMED: 5, CLOSED: 5 })[s]
export const timesOf = (t: Ticket): string[] => {
  const k: Status[] = ['SUBMITTED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']
  const step = citizenStep(t.status)
  return k.map((s, i) => (i <= step && t.at[s] ? clock(t.at[s]!) : '--:--'))
}
export const WORK_BASE = { x: 24, y: 50 }
