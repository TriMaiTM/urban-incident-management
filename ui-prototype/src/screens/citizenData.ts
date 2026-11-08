import type { Level } from '../components/primitives'
import { agoText, citizenStep, dateText, getTickets, gpsDeviation, levelOf, statusLabel, timesOf, type Status as LifeStatus, type Ticket } from '../data/tickets'

export type Kind = 'road' | 'flood' | 'tree' | 'trash' | 'light'
export type Status = 'received' | 'processing' | 'done' | 'rejected'
export type Report = {
  id: string; title: string; address: string; kind: Kind; level: Level; status: Status; label: string; raw: LifeStatus; gpsDev: number
  step: number; date: string; ago: string; unit: string; x: number; y: number
  times: string[]; reason?: string; rated?: number; ktv?: string; note?: string
}
export const steps = ['Tiếp nhận', 'Phân loại', 'Giao việc', 'Đang xử lý', 'Đã khắc phục']

const toReport = (t: Ticket): Report => ({
  id: t.id, title: t.title, address: t.address, kind: t.kind, level: levelOf(t), step: citizenStep(t.status),
  status: t.status === 'REJECTED' ? 'rejected' : t.status === 'CONFIRMED' || t.status === 'CLOSED' ? 'done' : t.status === 'SUBMITTED' || t.status === 'TRIAGED' ? 'received' : 'processing',
  label: statusLabel[t.status], raw: t.status, gpsDev: gpsDeviation(t), date: dateText(t.submittedAt), ago: agoText(t.submittedAt), unit: t.unit, x: t.x, y: t.y, times: timesOf(t),
  reason: t.reason, rated: t.rated, ktv: t.ktv, note: t.note,
})
/** Danh sách phản ánh của công dân, đọc từ nguồn dữ liệu chung. */
const MINE = ['DN-202610-0129', 'DN-202610-0121', 'DN-202610-0097', 'DN-202610-0052', 'DN-202610-0048', 'DN-202610-0036']
export const getReports = (): Report[] => MINE.map((id) => getTickets().find((t) => t.id === id)!).map(toReport)
/** Bản chụp tại thời điểm tải module, dùng cho dữ liệu tĩnh (tiêu đề, mã). */
export const reports: Report[] = getReports()

// Tab "Đã hoàn tất" chỉ gồm phiếu CLOSED; phiếu Đã xác nhận vẫn chờ công dân đánh giá.
export const statusTab = (r: Report) => (r.raw === 'CLOSED' ? 'Đã hoàn tất' : r.status === 'rejected' ? 'Bị từ chối' : 'Đang xử lý')
