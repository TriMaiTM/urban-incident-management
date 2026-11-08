/**
 * Nguồn dữ liệu mẫu dùng chung cho mọi màn.
 * - Hạn SLA và đồng hồ đếm lùi luôn TÍNH từ thời điểm gửi + mức ưu tiên.
 * - Trạng thái theo vòng đời trong guidelines/Guidelines.md (mục "Vòng đời phiếu").
 * - Thay đổi trạng thái được lưu vào localStorage để các màn thấy cùng một phiếu.
 */
import { useEffect, useState } from 'react'

export type Priority = 'urgent' | 'high' | 'normal' | 'low'
export type Status = 'SUBMITTED' | 'TRIAGED' | 'ASSIGNED' | 'REJECTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CONFIRMED' | 'CLOSED' | 'REOPENED'
export type Kind = 'road' | 'flood' | 'tree' | 'trash' | 'light'
export type Gps = { lat: number; lng: number }

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

/* ---------- Lưu thay đổi trạng thái ---------- */
type Override = { status: Status; at: Ticket['at']; submittedAt?: number }
const KEY = 'urbana.tickets'
const EVT = 'urbana-tickets'
const load = (): Record<string, Override> => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } }
export function getTickets(): Ticket[] {
  const o = load()
  return base.map((t) => {
    const x = o[t.id]
    const m = x ? { ...t, status: x.status, submittedAt: x.submittedAt ?? t.submittedAt, at: { ...t.at, ...x.at } } : t
    // CLOSED: công dân xác nhận, hoặc tự đóng sau 3 ngày kể từ lúc CONFIRMED.
    if (m.status === 'CONFIRMED' && m.at.CONFIRMED && Date.now() - m.at.CONFIRMED > 3 * 86_400_000) return { ...m, status: 'CLOSED' as Status, at: { ...m.at, CLOSED: m.at.CONFIRMED + 3 * 86_400_000 } }
    return m
  })
}
export const getTicket = (id: string) => getTickets().find((t) => t.id === id)
export function setStatus(id: string, status: Status) {
  const o = load()
  const cur = getTicket(id)
  if (!cur) return
  o[id] = { ...(o[id] ?? { at: {} }), status, at: { ...(o[id]?.at ?? {}), [status]: Date.now() } }
  localStorage.setItem(KEY, JSON.stringify(o))
  window.dispatchEvent(new Event(EVT))
}
/** Công dân gửi phản ánh ở màn 2: phiếu demo bắt đầu tính SLA từ lúc này, rồi AI tự phân loại. */
export function submitDemoTicket() {
  const o = load()
  const now = Date.now()
  o[DEMO_ID] = { status: 'SUBMITTED', submittedAt: now, at: { SUBMITTED: now } }
  localStorage.setItem(KEY, JSON.stringify(o))
  window.dispatchEvent(new Event(EVT))
  setTimeout(() => setStatus(DEMO_ID, 'TRIAGED'), 1500)
}
export function resetTickets() { localStorage.removeItem(KEY); window.dispatchEvent(new Event(EVT)) }
/** Hook: render lại khi trạng thái phiếu đổi (kể cả từ tab khác). */
export function useTicketVersion() {
  const [v, setV] = useState(0)
  useEffect(() => {
    const f = () => setV((n) => n + 1)
    window.addEventListener(EVT, f); window.addEventListener('storage', f)
    return () => { window.removeEventListener(EVT, f); window.removeEventListener('storage', f) }
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
/** Timeline công dân 5 mốc: Tiếp nhận, Phân loại, Giao việc, Đang xử lý, Đã khắc phục. */
export const citizenStep = (s: Status) => ({ SUBMITTED: 0, TRIAGED: 1, ASSIGNED: 2, REJECTED: 2, IN_PROGRESS: 3, REOPENED: 3, RESOLVED: 4, CONFIRMED: 4, CLOSED: 4 })[s]
export const timesOf = (t: Ticket): string[] => {
  const k: Status[] = ['SUBMITTED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']
  const step = citizenStep(t.status)
  return k.map((s, i) => (i <= step && t.at[s] ? clock(t.at[s]!) : '--:--'))
}
export const WORK_BASE = { x: 24, y: 50 }
