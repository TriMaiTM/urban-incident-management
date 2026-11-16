'use client'

import type { ReactNode } from 'react'

const INK = '#111111', RED = '#e5251b', G1 = '#d4d4d8', G2 = '#9ca3af', G3 = '#f4f4f5'

function Cone({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-16" y="-4" width="32" height="6" rx="2" fill={INK} />
      <path d="M-11 -4 L-4 -42 H4 L11 -4Z" fill={RED} />
      <path d="M-7.500 -17 H7.500 L6 -26 H-6Z" fill="#fff" />
    </g>
  )
}
function Barrier({ x, y, w = 120 }: { x: number; y: number; w?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="4" y="0" width="6" height="34" fill={G2} /><rect x={w - 10} y="0" width="6" height="34" fill={G2} />
      <rect x="0" y="-26" width={w} height="26" rx="4" fill="#fff" stroke={INK} strokeWidth="3" />
      <clipPath id={`b${x}`}><rect x="0" y="-26" width={w} height="26" rx="4" /></clipPath>
      <g clipPath={`url(#b${x})`} fill={RED}>{Array.from({ length: Math.ceil(w / 24) + 1 }, (_, i) => <path key={i} d={`M${i * 24} 0 L${i * 24 + 12} -26 H${i * 24 + 24} L${i * 24 + 12} 0Z`} />)}</g>
    </g>
  )
}
const Ground = () => <g><rect x="0" y="176" width="360" height="4" rx="2" fill={INK} /><path d="M20 190 H80 M120 190 H200 M240 190 H320" stroke={G1} strokeWidth="4" strokeLinecap="round" /></g>

const art = {
  /* 404: biển báo thi công "404" trên hàng rào */
  notfound: (
    <>
      <circle cx="180" cy="90" r="78" fill={G3} />
      <rect x="171" y="108" width="18" height="68" fill={G2} />
      <rect x="82" y="30" width="196" height="84" rx="14" fill={INK} />
      <rect x="90" y="38" width="180" height="68" rx="9" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="6 5" />
      <text x="180" y="92" textAnchor="middle" fontSize="48" fontWeight="800" fill="#fff" letterSpacing="3">404</text>
      <Barrier x={20} y={176} w={90} /><Cone x={300} y={176} /><Cone x={332} y={176} s={0.8} />
      <circle cx="240" cy="150" r="14" fill="none" stroke={INK} strokeWidth="5" /><path d="M250 160 L266 176" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <Ground />
    </>
  ),
  /* 403: cổng chắn đóng kèm ổ khóa */
  forbidden: (
    <>
      <circle cx="180" cy="90" r="78" fill={G3} />
      <rect x="60" y="60" width="14" height="116" rx="3" fill={INK} /><rect x="286" y="60" width="14" height="116" rx="3" fill={INK} />
      <circle cx="67" cy="56" r="9" fill={RED} /><circle cx="293" cy="56" r="9" fill={RED} />
      <Barrier x={70} y={126} w={220} />
      <rect x="140" y="38" width="80" height="62" rx="12" fill={INK} />
      <path d="M156 38 V28 a24 24 0 0 1 48 0 V38" fill="none" stroke={INK} strokeWidth="9" />
      <circle cx="180" cy="64" r="8" fill={RED} /><rect x="177" y="66" width="6" height="18" rx="3" fill={RED} />
      <Cone x={36} y={176} s={0.9} /><Cone x={324} y={176} s={0.9} />
      <Ground />
    </>
  ),
  /* 500: giàn giáo, cờ lê và biển cảnh báo */
  server: (
    <>
      <circle cx="180" cy="90" r="78" fill={G3} />
      <g stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round"><rect x="104" y="60" width="152" height="116" rx="4" /><path d="M104 99 H256 M104 138 H256 M180 60 V176" /><path d="M104 60 L180 99 L256 60 M104 138 L180 99 L256 138" strokeWidth="3" stroke={G2} /></g>
      <path d="M180 14 L226 94 H134Z" fill={RED} stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
      <rect x="177" y="40" width="6" height="30" rx="3" fill="#fff" /><circle cx="180" cy="80" r="4" fill="#fff" />
      <g transform="translate(272 120) rotate(35)"><rect x="-5" y="-4" width="10" height="54" rx="5" fill={INK} /><path d="M-14 -4 a14 14 0 1 1 28 0 l-8 0 l0 -10 l-12 0 l0 10Z" fill={INK} /></g>
      <Cone x={60} y={176} /><Cone x={92} y={176} s={0.8} />
      <Ground />
    </>
  ),
  /* Bảo trì: cần cẩu tháp */
  maintenance: (
    <>
      <circle cx="180" cy="100" r="78" fill={G3} />
      <g stroke={INK} strokeWidth="5" fill="none" strokeLinejoin="round"><path d="M130 176 V28 H150 V176" /><path d="M130 60 L150 40 M130 90 L150 70 M130 120 L150 100 M130 150 L150 130" strokeWidth="3" /><path d="M140 28 V12" /></g>
      <rect x="40" y="26" width="240" height="14" fill={INK} />
      <rect x="40" y="40" width="40" height="22" fill={G2} />
      <path d="M140 12 L50 26 M140 12 L250 26" stroke={INK} strokeWidth="3" />
      <path d="M232 40 V104" stroke={INK} strokeWidth="3" /><rect x="208" y="104" width="48" height="22" rx="3" fill={RED} /><rect x="208" y="104" width="48" height="8" fill="#fff" opacity=".35" />
      <path d="M232 104 L216 104 M232 104 L248 104" stroke={INK} strokeWidth="3" />
      <rect x="100" y="164" width="80" height="12" rx="3" fill={INK} />
      <g transform="translate(284 176)"><path d="M-24 0 a24 24 0 0 1 48 0Z" fill={RED} /><rect x="-28" y="-2" width="56" height="6" rx="3" fill={INK} /></g>
      <Cone x={40} y={176} /><Cone x={72} y={176} s={0.8} />
      <Ground />
    </>
  ),
  /* Ngoại tuyến: trụ sóng với dây cáp bị ngắt */
  offline: (
    <>
      <circle cx="180" cy="90" r="78" fill={G3} />
      <path d="M180 176 L160 70 H200Z" fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M166 100 H194 M171 130 H189 M164 70 L196 100 M196 70 L164 100" stroke={INK} strokeWidth="3" />
      <circle cx="180" cy="60" r="9" fill={RED} />
      <g fill="none" strokeLinecap="round" strokeWidth="6"><path d="M150 40 a42 42 0 0 1 0 40" stroke={G2} /><path d="M210 40 a42 42 0 0 0 0 40" stroke={G2} /><path d="M134 28 a64 64 0 0 1 0 64" stroke={G1} /><path d="M226 28 a64 64 0 0 0 0 64" stroke={G1} /></g>
      <path d="M268 40 L296 72 M296 40 L268 72" stroke={RED} strokeWidth="8" strokeLinecap="round" />
      <path d="M36 150 q50 -30 96 8" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" /><rect x="128" y="152" width="22" height="14" rx="3" fill={INK} /><rect x="156" y="152" width="22" height="14" rx="3" fill="#fff" stroke={INK} strokeWidth="3" />
      <Cone x={300} y={176} /><Cone x={332} y={176} s={0.8} />
      <Ground />
    </>
  ),
}
export type ArtKey = keyof typeof art

export default function ExceptionShell({ art: a, title, sub, children, actions }: { art: ArtKey; title: string; sub: string; children?: ReactNode; actions: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <main className="animate-rise w-full max-w-[560px] rounded-card bg-card p-6 text-center shadow-card md:p-10">
        <svg viewBox="0 0 360 200" className="mx-auto h-auto w-full max-w-[360px]" role="img" aria-hidden>{art[a]}</svg>
        <h1 className="mt-6 text-[24px] leading-tight font-bold">{title}</h1>
        <p className="mt-2 text-[14px] text-muted">{sub}</p>
        {children && <div className="mt-6 text-left">{children}</div>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:flex-1 [&>button]:w-full">{actions}</div>
      </main>
    </div>
  )
}
