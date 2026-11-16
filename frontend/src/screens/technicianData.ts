'use client'

import { useEffect, useState } from 'react'
import type { Level } from '../components/primitives'
import { WORK_BASE, agoText, clock, deadlineOf, getTickets, gpsDeviation, levelOf, remainingSec, statusLabel, type Gps, type Kind as TKind, type Status, type Ticket } from '../data/tickets'

export type Kind = TKind
export type Task = {
  id: string; title: string; address: string; kind: Kind; level: Level
  remaining: number; distance: string; eta: string; x: number; y: number
  done?: string; assigned: string
  status: Status; statusText: string; finished: boolean; gpsDev: number; hash: string
  startedAt?: string; resolvedAt?: string; gps: Gps; gpsAfter?: Gps
}
const OPEN: Status[] = ['ASSIGNED', 'IN_PROGRESS', 'REOPENED']
const DONE: Status[] = ['RESOLVED', 'CONFIRMED', 'CLOSED']
const toTask = (t: Ticket): Task => {
  const km = Math.hypot(t.x - WORK_BASE.x, t.y - WORK_BASE.y) * 0.05
  const finished = DONE.includes(t.status)
  const doneAt = t.at.RESOLVED ?? t.at.CONFIRMED ?? t.at.CLOSED
  return {
    id: t.id, title: t.title, address: t.address, kind: t.kind, level: levelOf(t), remaining: remainingSec(t),
    distance: `${km.toFixed(1).replace('.', ',')} km`, eta: finished ? '' : `${Math.max(3, Math.round(km * 4.8))} phút`, x: t.x, y: t.y,
    done: finished && doneAt ? `${agoText(doneAt)} trước` : undefined, assigned: t.at.ASSIGNED ? clock(t.at.ASSIGNED) : '--:--',
    status: t.status, statusText: statusLabel[t.status], finished, gpsDev: gpsDeviation(t), hash: t.hash,
    startedAt: t.at.IN_PROGRESS ? clock(t.at.IN_PROGRESS) : undefined, resolvedAt: doneAt ? clock(doneAt) : undefined, gps: t.gps, gpsAfter: t.gpsAfter,
  }
}
/** Nhiệm vụ của kỹ thuật viên: phiếu đã giao trở đi. Gọi lại mỗi lần render để đồng hồ luôn đúng. */
export const getTasks = (): Task[] => {
  const rank = { urgent: 0, high: 1, normal: 2, low: 3 }
  const all = getTickets().filter((t) => [...OPEN, ...DONE].includes(t.status))
  all.sort((a, b) => Number(DONE.includes(a.status)) - Number(DONE.includes(b.status)) || rank[a.priority] - rank[b.priority] || deadlineOf(a) - deadlineOf(b))
  return all.map(toTask)
}
/** Tìm nhiệm vụ theo mã, bất kể trạng thái (dùng cho màn chi tiết và nghiệm thu). */
export const getTask = (id: string): Task | undefined => { const t = getTickets().find((x) => x.id === id); return t ? toTask(t) : undefined }
export const base = WORK_BASE // vị trí đội hiện tại

export function routeTo(t: { x: number; y: number }) {
  const lane = 41
  return [base, { x: base.x, y: lane }, { x: t.x, y: lane }, { x: t.x, y: t.y }]
}

export const fmtClock = (s: number) => {
  const p = (n: number) => String(n).padStart(2, '0')
  const a = Math.max(0, s)
  return `${p(Math.floor(a / 3600))}:${p(Math.floor((a % 3600) / 60))}:${p(a % 60)}`
}

export function useMedia(q: string) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(q)
    const f = () => setM(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [q])
  return m
}

export function useTick() {
  const [n, setN] = useState(0)
  useEffect(() => { const t = setInterval(() => setN((x) => x + 1), 1000); return () => clearInterval(t) }, [])
  return n
}

export const plan: Record<Kind, { materials: string[]; steps: string[] }> = {
  flood: { materials: ['Máy bơm 1', 'Biển báo 2', 'Bao cát 20'], steps: ['Đặt biển cảnh báo', 'Thông cống thoát nước', 'Hút nước đọng'] },
  tree: { materials: ['Cưa máy 1', 'Xe cẩu 1', 'Cọc rào 6'], steps: ['Rào chắn khu vực', 'Cắt nhỏ thân cây', 'Dọn và thu gom'] },
  road: { materials: ['Nhựa nguội 4', 'Máy đầm 1', 'Cọc tiêu 4'], steps: ['Rào chắn làn đường', 'Cắt vá mặt đường', 'Đầm nén hoàn trả'] },
  light: { materials: ['Bóng LED 1', 'Xe thang 1', 'Cáp 10m'], steps: ['Ngắt nguồn điện', 'Thay bóng đèn', 'Kiểm tra tủ điều khiển'] },
  trash: { materials: ['Xe ép rác 1', 'Bao rác 30', 'Chổi quét 2'], steps: ['Thu gom rác tràn', 'Quét dọn vệ sinh', 'Phun khử mùi'] },
}
