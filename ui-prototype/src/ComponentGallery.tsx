import { useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Construction, Droplets, Lightbulb, MapPin, Plus, Send, Trash2, TreeDeciduous, Users, Wrench, Zap } from 'lucide-react'
import { Avatar, Button, EmptyState, IconChip, PillTab, StatusPill, Toast, cn, type DataState, type Level } from './components/primitives'
import {
  CompareEvidence,
  DataTable,
  EvidenceUploadCard,
  IncidentListItem,
  InputField,
  MapBentoViewport,
  MetricBentoCard,
  Timeline,
  type Row,
} from './components/data'
import { ModalDialog, SideSheet, SidebarNav, TopPillNav } from './components/nav'

const states: DataState[] = ['normal', 'loading', 'empty', 'error']
const stateLabel: Record<DataState, string> = { normal: 'Thường', loading: 'Tải', empty: 'Rỗng', error: 'Lỗi' }

function GalleryCard({ title, span, children, delay = 0 }: { title: string; span: string; children: ReactNode; delay?: number }) {
  return (
    <section className={cn('animate-rise rounded-card bg-card p-6 shadow-card transition hover:-translate-y-0.5', span)} style={{ animationDelay: `${delay}ms` }}>
      <h2 className="mb-4 text-[16px] font-semibold">{title}</h2>
      {children}
    </section>
  )
}
const Label = ({ children }: { children: ReactNode }) => <p className="mb-2 text-[12px] text-muted">{children}</p>

function StateSwitch({ value, onChange }: { value: DataState; onChange: (s: DataState) => void }) {
  return <PillTab items={states.map((s) => stateLabel[s])} value={stateLabel[value]} onChange={(l) => onChange(states.find((s) => stateLabel[s] === l)!)} />
}

const rows: Row[] = [
  { code: 'DN-202610-0001', type: 'Ngập úng', street: 'Nguyễn Văn Linh, Hải Châu', level: 'urgent', sla: '1 giờ' },
  { code: 'DN-202610-0002', type: 'Cây đổ', street: 'Điện Biên Phủ, Thanh Khê', level: 'high', sla: '6 giờ' },
  { code: 'DN-202610-0003', type: 'Hư hỏng đường', street: 'Ngô Quyền, Sơn Trà', level: 'normal', sla: '18 giờ' },
  { code: 'DN-202610-0004', type: 'Đèn chiếu sáng', street: 'Nguyễn Hữu Thọ, Cẩm Lệ', level: 'low', sla: '40 giờ' },
  { code: 'DN-202610-0005', type: 'Rác thải', street: 'Trường Sa, Ngũ Hành Sơn', level: 'done', sla: 'Xong' },
]
const pins: { x: number; y: number; level: Level }[] = [
  { x: 22, y: 30, level: 'urgent' }, { x: 45, y: 62, level: 'high' }, { x: 68, y: 25, level: 'normal' },
  { x: 33, y: 78, level: 'low' }, { x: 80, y: 70, level: 'done' }, { x: 55, y: 40, level: 'high' },
]
const steps = [
  { label: 'Đã tiếp nhận', time: '08:02' }, { label: 'Đã phân loại', time: '08:03' }, { label: 'Đã giao', time: '08:15' },
  { label: 'Đang xử lý', time: '08:40' }, { label: 'Đã xử lý', time: '--:--' }, { label: 'Đã xác nhận', time: '--:--' }, { label: 'Đã đóng', time: '--:--' },
]

export default function ComponentGallery() {
  const [tab1, setTab1] = useState('Tất cả')
  const [tab2, setTab2] = useState('Bản đồ')
  const [metricState, setMetricState] = useState<DataState>('normal')
  const [listState, setListState] = useState<DataState>('normal')
  const [mapState, setMapState] = useState<DataState>('normal')
  const [tableState, setTableState] = useState<DataState>('normal')
  const [cmpState, setCmpState] = useState<DataState>('normal')
  const [tlState, setTlState] = useState<DataState>('normal')

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-[1440px] p-8">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-[24px] font-bold">Component Gallery</h1>
            <p className="mt-1 text-[12px] text-muted">17 component, đủ variant và state</p>
          </div>
          <span className="inline-flex h-8 items-center gap-2 rounded-full bg-card px-4 text-[12px] font-semibold shadow-card"><MapPin size={14} strokeWidth={1.75} />Đà Nẵng</span>
        </header>

        <div className="grid grid-cols-12 gap-4">
          <GalleryCard title="Nút bấm" span="col-span-8" delay={0}>
            <div className="space-y-4">
              {(['primary', 'secondary', 'subtle', 'ghost', 'danger'] as const).map((v) => (
                <div key={v} className="flex items-center gap-3">
                  <span className="w-20 text-[12px] text-muted capitalize">{v}</span>
                  <Button variant={v} size="sm">Xác nhận</Button>
                  <Button variant={v} size="md">Xác nhận</Button>
                  <Button variant={v} size="lg">Xác nhận</Button>
                  <Button variant={v} icon={Plus}>Thêm</Button>
                  <Button variant={v} disabled>Khóa</Button>
                  <Button variant={v} loading>Gửi</Button>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <span className="w-20 text-[12px] text-muted">Hero</span>
                <Button variant="hero" size="lg" icon={Send}>Gửi báo cáo</Button>
                <Button variant="hero" size="lg" loading>Gửi báo cáo</Button>
                <Button variant="hero" size="lg" disabled>Gửi báo cáo</Button>
              </div>
            </div>
          </GalleryCard>

          <div className="col-span-4 flex flex-col gap-4">
            <GalleryCard title="Tab pill" span="" delay={60}>
              <Label>Nền trắng</Label>
              <PillTab items={['Tất cả', 'Mới', 'Quá hạn']} value={tab1} onChange={setTab1} />
              <div className="mt-4" />
              <Label>Nền đen</Label>
              <PillTab tone="ink" items={['Bản đồ', 'Danh sách']} value={tab2} onChange={setTab2} />
            </GalleryCard>
            <GalleryCard title="Trạng thái" span="" delay={120}>
              <div className="flex flex-wrap gap-2">
                {(['urgent', 'high', 'normal', 'low', 'done'] as Level[]).map((l) => <StatusPill key={l} level={l} />)}
              </div>
            </GalleryCard>
            <GalleryCard title="Icon, Avatar" span="" delay={180}>
              <div className="flex items-center gap-3">
                <IconChip icon={Droplets} /><IconChip icon={TreeDeciduous} tone="done" /><IconChip icon={Zap} tone="normal" />
                <IconChip icon={AlertTriangle} tone="urgent" /><IconChip icon={Wrench} tone="ink" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name="Trần Văn An" size={24} /><Avatar name="Lê Thị Hoa" size={32} color={1} /><Avatar name="Phạm Quốc Bảo" size={40} color={2} online /><Avatar name="Võ Thanh Tâm" size={48} color={3} />
                </div>
                <div className="flex -space-x-2"><Avatar name="Trần Văn An" size={32} /><Avatar name="Lê Thị Hoa" size={32} color={1} /><Avatar name="Võ Tâm" size={32} color={4} /></div>
              </div>
            </GalleryCard>
          </div>

          <GalleryCard title="Chỉ số" span="col-span-12" delay={60}>
            <div className="mb-4"><StateSwitch value={metricState} onChange={setMetricState} /></div>
            <div className="grid grid-cols-4 gap-4">
              <MetricBentoCard title="Phiếu mới" value={128} icon={Plus} state={metricState} />
              <MetricBentoCard title="Đang xử lý" value={46} icon={Wrench} tone="high" chart="bars" series={[3, 5, 4, 7, 6, 9, 12]} state={metricState} />
              <MetricBentoCard title="Đúng hạn" value={94} suffix="%" icon={CheckCircle2} tone="done" chart="spark" series={[4, 6, 5, 8, 7, 9, 10]} state={metricState} />
              <MetricBentoCard title="Khẩn cấp" value={7} icon={AlertTriangle} tone="urgent" chart="bars" series={[1, 2, 1, 3, 2, 4, 7]} state={metricState} dark />
            </div>
          </GalleryCard>

          <GalleryCard title="Phiếu sự cố" span="col-span-7" delay={60}>
            <div className="mb-4"><StateSwitch value={listState} onChange={setListState} /></div>
            <div className="space-y-3">
              <IncidentListItem state={listState} kind="flood" title="Ngập úng đường Lê Duẩn" address="Hải Châu, Đà Nẵng" time="5 phút" level="urgent" />
              <IncidentListItem state={listState} kind="tree" title="Cây đổ đường Ngô Quyền" address="Sơn Trà, Đà Nẵng" time="12 phút" level="high" status="selected" />
              <IncidentListItem state={listState} kind="road" title="Ổ gà đường Tôn Đức Thắng" address="Liên Chiểu, Đà Nẵng" time="Trễ 2h" level="normal" status="overdue" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <IncidentListItem state={listState} layout="card" kind="light" title="Đèn tắt đường Trường Sa" address="Ngũ Hành Sơn" time="1 giờ" level="low" />
              <IncidentListItem state={listState} layout="card" kind="trash" title="Rác tràn đường Hòa Vang" address="Hòa Vang" time="3 giờ" level="done" />
            </div>
          </GalleryCard>

          <GalleryCard title="Bản đồ" span="col-span-5" delay={120}>
            <div className="mb-4"><StateSwitch value={mapState} onChange={setMapState} /></div>
            <MapBentoViewport pins={pins} state={mapState} />
            <div className="mt-4"><Label>Widget nhỏ</Label>
              <MapBentoViewport compact pins={pins.slice(0, 3)} />
            </div>
          </GalleryCard>

          <GalleryCard title="Ô nhập" span="col-span-5" delay={60}>
            <div className="space-y-4">
              <InputField label="Tiêu đề" placeholder="Nhập tiêu đề" />
              <InputField kind="password" label="Mật khẩu" placeholder="Nhập mật khẩu" value="matkhau123" />
              <InputField kind="textarea" label="Ghi chú" placeholder="Mô tả ngắn gọn" />
              <InputField kind="select" label="Quận" placeholder="Chọn quận" />
              <InputField kind="search" placeholder="Tìm mã phiếu" />
              <InputField label="Địa chỉ" placeholder="Nhập địa chỉ" error="Chưa nhập địa chỉ" />
              <InputField label="Mã phiếu" placeholder="Mã phiếu" value="DN-202610-0001" disabled />
            </div>
          </GalleryCard>

          <GalleryCard title="Minh chứng" span="col-span-7" delay={120}>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Trống</Label><EvidenceUploadCard state="empty" /></div>
              <div><Label>Đang quét</Label><EvidenceUploadCard state="scanning" /></div>
              <div><Label>Hoàn tất</Label><EvidenceUploadCard state="done" /></div>
              <div><Label>Lỗi</Label><EvidenceUploadCard state="error" /></div>
            </div>
          </GalleryCard>

          <GalleryCard title="Bảng dữ liệu" span="col-span-12" delay={60}>
            <div className="mb-4"><StateSwitch value={tableState} onChange={setTableState} /></div>
            <DataTable rows={rows} state={tableState} />
          </GalleryCard>

          <GalleryCard title="Trước sau" span="col-span-6" delay={60}>
            <div className="mb-4"><StateSwitch value={cmpState} onChange={setCmpState} /></div>
            <CompareEvidence state={cmpState} gps={{ text: 'GPS: 12m Đạt', ok: true }} />
            <div className="mt-4"><Label>GPS lệch</Label></div>
            <CompareEvidence gps={{ text: 'GPS: 68m Lệch', ok: false }} />
          </GalleryCard>

          <GalleryCard title="Vòng đời" span="col-span-6" delay={120}>
            <div className="mb-4"><StateSwitch value={tlState} onChange={setTlState} /></div>
            <Timeline steps={steps} current={3} state={tlState} />
            <div className="mt-6"><Label>Nhánh từ chối</Label></div>
            <Timeline steps={[steps[0], steps[1], { label: 'Từ chối', time: '08:20' }]} current={2} rejected />
            <div className="mt-6"><Label>Nhánh mở lại</Label></div>
            <Timeline steps={[steps[4], steps[5], { label: 'Mở lại', time: '09:10' }]} current={2} />
          </GalleryCard>

          <GalleryCard title="Thanh bên" span="col-span-6" delay={60}>
            <div className="flex items-start gap-6">
              <div><Label>Rail</Label><SidebarNav mode="rail" /></div>
              <div><Label>Mở rộng</Label><SidebarNav mode="expanded" active={2} /></div>
            </div>
            <div className="mt-6"><Label>Tab bar mobile</Label><SidebarNav mode="tabbar" active={1} /></div>
          </GalleryCard>

          <div className="col-span-6 flex flex-col gap-4">
            <GalleryCard title="Thanh trên" span="" delay={120}>
              <TopPillNav active={1} />
            </GalleryCard>
            <GalleryCard title="Thông báo" span="" delay={180}>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-card bg-surface"><EmptyState icon={Users} text="Chưa có phiếu" /></div>
                <div className="flex flex-col items-start justify-center gap-3">
                  <Toast kind="success" text="Đã gửi báo cáo" />
                  <Toast kind="error" text="Ngoài phạm vi" />
                  <Toast kind="info" text="Đã lưu nháp" />
                </div>
              </div>
            </GalleryCard>
          </div>

          <GalleryCard title="Hộp thoại" span="col-span-6" delay={60}>
            <Label>Desktop</Label>
            <ModalDialog variant="modal" title="Gộp phiếu trùng" confirm="Gộp phiếu">
              <div className="flex items-center gap-3 rounded-tile bg-surface p-3 text-[14px]"><IconChip icon={AlertTriangle} tone="high" size={32} />Trùng lặp 35m</div>
            </ModalDialog>
            <div className="mt-4"><Label>Mobile</Label></div>
            <ModalDialog variant="sheet" title="Xóa phản ánh" confirm="Xóa">
              <div className="flex items-center gap-3 rounded-tile bg-surface p-3 text-[14px]"><IconChip icon={Trash2} tone="urgent" size={32} />DN-202610-0004</div>
            </ModalDialog>
          </GalleryCard>

          <GalleryCard title="Chi tiết" span="col-span-6" delay={120}>
            <SideSheet />
          </GalleryCard>
        </div>
      </div>
    </div>
  )
}
