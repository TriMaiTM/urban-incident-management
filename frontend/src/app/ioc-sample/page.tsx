"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

// --- Types ---
type Priority = "EMERGENCY" | "HIGH" | "NORMAL" | "LOW";
type Status = "SUBMITTED" | "TRIAGED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type CategoryCode = "ROAD_DAMAGE" | "FLOODING" | "FALLEN_TREE" | "GARBAGE" | "STREETLIGHT" | "OTHER";

interface IncidentItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: CategoryCode;
  categoryName: string;
  priority: Priority;
  status: Status;
  channel: "WEB" | "MESSENGER";
  district: string;
  address: string;
  coordinates: [number, number]; // [lat, lon]
  slaDueHours: number;
  aiConfidence: number;
  aiSummary: string;
  hazardWarning: string | null;
  departmentCode: string;
  departmentName: string;
  technicianName: string | null;
  createdAt: string;
  blurredFacesCount: number;
  blurredPlatesCount: number;
  imageBeforeUrl: string;
  imageAfterUrl?: string;
  duplicateCount: number;
}

// --- Mock Data chuẩn Đà Nẵng IOC ---
const SAMPLE_INCIDENTS: IncidentItem[] = [
  {
    id: "inc-101",
    code: "DN-202610-0104",
    title: "Hố sụt lún nguy hiểm lòng đường Bạch Đằng",
    description: "Mặt đường sụt lún tạo hố sâu khoảng 20cm, kích thước 1m x 1.5m gần số 120 Bạch Đằng. Xe máy đi qua dễ sụp bánh.",
    category: "ROAD_DAMAGE",
    categoryName: "Hư hỏng mặt đường",
    priority: "EMERGENCY",
    status: "TRIAGED",
    channel: "MESSENGER",
    district: "Hải Châu",
    address: "120 Bạch Đằng, P. Hải Châu 1, Q. Hải Châu",
    coordinates: [16.0682, 108.2235],
    slaDueHours: 1.5,
    aiConfidence: 0.96,
    aiSummary: "Hố sụt lún sâu trên tuyến đường huyết mạch, tiềm ẩn nguy cơ lật xe nghiêm trọng.",
    hazardWarning: "Khu vực mật độ giao thông cao giờ cao điểm. Cần đặt rào cảnh báo khẩn cấp.",
    departmentCode: "SGTVT_DN",
    departmentName: "Sở Giao thông Vận tải",
    technicianName: null,
    createdAt: "10 phút trước",
    blurredFacesCount: 3,
    blurredPlatesCount: 2,
    imageBeforeUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
    duplicateCount: 4,
  },
  {
    id: "inc-102",
    code: "DN-202610-0103",
    title: "Cây xà cừ cổ thụ gãy cành đè ngang đường Hùng Vương",
    description: "Nhánh cây dài hơn 6m rơi chắn 1/2 làn đường Hùng Vương giao Ngô Gia Tự sau đợt gió lốc.",
    category: "FALLEN_TREE",
    categoryName: "Cây xanh gãy đổ",
    priority: "HIGH",
    status: "ASSIGNED",
    channel: "WEB",
    district: "Hải Châu",
    address: "Ngã tư Hùng Vương - Ngô Gia Tự, P. Hải Châu 2, Q. Hải Châu",
    coordinates: [16.0701, 108.2162],
    slaDueHours: 3.2,
    aiConfidence: 0.94,
    aiSummary: "Cành cây lớn gãy chắn lối lưu thông, có nguy cơ kéo đứt đường dây điện chiếu sáng lân cận.",
    hazardWarning: "Có dây điện mắc vào cành cây, yêu cầu cắt điện tạm thời trước khi cưa hạ.",
    departmentCode: "CCX_DN",
    departmentName: "Công ty Công viên Cây xanh",
    technicianName: "Lê Văn Tuấn (Tổ 3)",
    createdAt: "25 phút trước",
    blurredFacesCount: 1,
    blurredPlatesCount: 4,
    imageBeforeUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
    duplicateCount: 2,
  },
  {
    id: "inc-103",
    code: "DN-202610-0102",
    title: "Ngập úng cục bộ đường Hàm Nghi đoạn bờ hồ Thạc Gián",
    description: "Nước ngập sâu 35cm kéo dài khoảng 80m do rác bít kín miệng cống thoát nước sau cơn mưa rào.",
    category: "FLOODING",
    categoryName: "Ngập úng đô thị",
    priority: "HIGH",
    status: "IN_PROGRESS",
    channel: "WEB",
    district: "Thanh Khê",
    address: "Đoạn hồ Hàm Nghi, P. Thạc Gián, Q. Thanh Khê",
    coordinates: [16.0645, 108.2098],
    slaDueHours: 4.8,
    aiConfidence: 0.92,
    aiSummary: "Ngập cục bộ do tắc rác cửa thu nước mặt hồ, các phương tiện nhỏ không thể qua lại.",
    hazardWarning: "Nước che khuất mép vỉa hè và miệng cống.",
    departmentCode: "CTN_DN",
    departmentName: "Công ty Thoát nước & XLNT",
    technicianName: "Đội phản ứng nhanh Q. Thanh Khê",
    createdAt: "1 giờ trước",
    blurredFacesCount: 2,
    blurredPlatesCount: 1,
    imageBeforeUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
    duplicateCount: 6,
  },
  {
    id: "inc-104",
    code: "DN-202610-0099",
    title: "Hàng loạt đèn chiếu sáng mất điện đường Võ Nguyên Giáp",
    description: "Đoạn đường ven biển từ ngã ba Nguyễn Văn Thoại hướng về phía Phạm Văn Đồng mất điện tối om.",
    category: "STREETLIGHT",
    categoryName: "Chiếu sáng công cộng",
    priority: "NORMAL",
    status: "RESOLVED",
    channel: "WEB",
    district: "Sơn Trà",
    address: "Võ Nguyên Giáp, P. Phước Mỹ, Q. Sơn Trà",
    coordinates: [16.0592, 108.2471],
    slaDueHours: 0,
    aiConfidence: 0.89,
    aiSummary: "Sự cố nhảy aptomat tủ điện chiếu sáng công cộng do chập dây ngầm.",
    hazardWarning: null,
    departmentCode: "CCS_DN",
    departmentName: "Công ty CP Chiếu sáng Đô thị",
    technicianName: "Nguyễn Hoàng Nam",
    createdAt: "3 giờ trước",
    blurredFacesCount: 0,
    blurredPlatesCount: 0,
    imageBeforeUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80",
    duplicateCount: 1,
  },
  {
    id: "inc-105",
    code: "DN-202610-0095",
    title: "Tập kết phế thải xây dựng trái phép vỉa hè Như Nguyệt",
    description: "Đống xà bần và bao cát đổ tràn vỉa hè người đi bộ sát chân cầu Thuận Phước.",
    category: "GARBAGE",
    categoryName: "Rác thải, ô nhiễm",
    priority: "LOW",
    status: "ASSIGNED",
    channel: "MESSENGER",
    district: "Hải Châu",
    address: "Vỉa hè đường Như Nguyệt, P. Thuận Phước, Q. Hải Châu",
    coordinates: [16.0881, 108.2219],
    slaDueHours: 18.5,
    aiConfidence: 0.91,
    aiSummary: "Chất thải rắn xây dựng tập kết trái phép, mất mỹ quan đô thị.",
    hazardWarning: null,
    departmentCode: "CMT_DN",
    departmentName: "Công ty Môi trường Đô thị",
    technicianName: "Tổ thu gom Q. Hải Châu",
    createdAt: "5 giờ trước",
    blurredFacesCount: 1,
    blurredPlatesCount: 1,
    imageBeforeUrl: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80",
    duplicateCount: 0,
  },
];

export default function LinearStyleIOCSamplePage() {
  const [selectedId, setSelectedId] = useState<string>("inc-101");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [isApproving, setIsApproving] = useState(false);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selectedIncident = useMemo(() => {
    return SAMPLE_INCIDENTS.find((item) => item.id === selectedId) || SAMPLE_INCIDENTS[0];
  }, [selectedId]);

  const filteredIncidents = useMemo(() => {
    return SAMPLE_INCIDENTS.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPriority = filterPriority === "ALL" || item.priority === filterPriority;
      return matchSearch && matchPriority;
    });
  }, [searchQuery, filterPriority]);

  const handleQuickApprove = () => {
    setIsApproving(true);
    setTimeout(() => {
      setApprovedIds((prev) => new Set(prev).add(selectedIncident.id));
      setIsApproving(false);
    }, 600);
  };

  // Priority indicator rendering
  const renderPriorityIcon = (p: Priority) => {
    switch (p) {
      case "EMERGENCY":
        return (
          <div className="flex items-center gap-0.5 text-rose-500" title="Khẩn cấp (Emergency)">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <div className="flex items-end gap-[1px] h-3.5 ml-1">
              <span className="w-[2px] h-1.5 bg-rose-500 rounded-xs" />
              <span className="w-[2px] h-2.5 bg-rose-500 rounded-xs" />
              <span className="w-[2px] h-3.5 bg-rose-500 rounded-xs" />
            </div>
          </div>
        );
      case "HIGH":
        return (
          <div className="flex items-end gap-[1px] h-3.5 text-amber-400" title="Cao (High)">
            <span className="w-[2px] h-1.5 bg-amber-400 rounded-xs" />
            <span className="w-[2px] h-2.5 bg-amber-400 rounded-xs" />
            <span className="w-[2px] h-3.5 bg-amber-400 rounded-xs" />
          </div>
        );
      case "NORMAL":
        return (
          <div className="flex items-end gap-[1px] h-3.5 text-sky-400" title="Trung bình (Normal)">
            <span className="w-[2px] h-1.5 bg-sky-400 rounded-xs" />
            <span className="w-[2px] h-2.5 bg-sky-400 rounded-xs" />
            <span className="w-[2px] h-3.5 bg-zinc-600 rounded-xs" />
          </div>
        );
      case "LOW":
        return (
          <div className="flex items-end gap-[1px] h-3.5 text-zinc-500" title="Thấp (Low)">
            <span className="w-[2px] h-1.5 bg-zinc-500 rounded-xs" />
            <span className="w-[2px] h-2 bg-zinc-700 rounded-xs" />
            <span className="w-[2px] h-3 bg-zinc-800 rounded-xs" />
          </div>
        );
    }
  };

  const renderStatusBadge = (s: Status, isApproved: boolean) => {
    if (isApproved && s === "TRIAGED") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="size-2.5" /> ĐÃ DUYỆT
        </span>
      );
    }
    switch (s) {
      case "TRIAGED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Bot className="size-2.5" /> CHỜ DUYỆT AI
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <UserCheck className="size-2.5" /> ĐÃ GIAO VIỆC
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="size-2.5 animate-spin" /> ĐANG XỬ LÝ
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check className="size-2.5" /> HOÀN THÀNH
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300">
            {s}
          </span>
        );
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#08090a] text-zinc-200 antialiased selection:bg-indigo-500/30 selection:text-indigo-200 font-sans overflow-hidden">
      {/* ── TOP LINEAR COMMAND BAR ── */}
      <header className="h-12 border-b border-zinc-800/80 bg-[#08090a]/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Breadcrumbs & Live status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-xs">
              <Building2 className="size-3.5" />
            </div>
            <span className="text-xs font-semibold text-zinc-100 tracking-tight">IOC ĐÀ NẴNG</span>
          </div>

          <span className="text-zinc-600">/</span>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="text-zinc-300 font-medium">Bàn Điều phối Tác chiến</span>
            <span className="relative flex h-1.5 w-1.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] text-emerald-400/90 font-mono">Live</span>
          </div>
        </div>

        {/* Center: Command Palette Trigger (Linear style ⌘K) */}
        <div className="hidden md:flex items-center">
          <div className="flex items-center gap-2 h-7 w-80 px-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-400 focus-within:border-indigo-500/80 transition-all">
            <Search className="size-3.5 text-zinc-500 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sự cố, mã phiếu, đường phố... (Ctrl+K)"
              className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-hidden"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-700/80 bg-zinc-800/80 px-1 text-[10px] font-mono text-zinc-400">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Right: Quick actions & View switcher */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px]">
              <AlertTriangle className="size-3" /> 1 Khẩn cấp
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px]">
              <Bot className="size-3" /> 2 Chờ duyệt AI
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white rounded-md hover:bg-zinc-800/60 transition-colors"
          >
            <span>Cổng Dân sự</span>
            <ExternalLink className="size-3 text-zinc-500" />
          </Link>

          <div className="size-6 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-[10px] font-mono font-bold text-white flex items-center justify-center ring-1 ring-white/10">
            IOC
          </div>
        </div>
      </header>

      {/* ── SUB-TOOLBAR: Filters & Grouping ── */}
      <div className="h-9 border-b border-zinc-850 bg-[#0a0b0e] px-4 flex items-center justify-between shrink-0 text-xs text-zinc-400">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider mr-1">
            <Filter className="size-3" /> Lọc nhanh:
          </div>

          {(["ALL", "EMERGENCY", "HIGH", "NORMAL"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterPriority(lvl)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filterPriority === lvl
                  ? "bg-zinc-800 text-zinc-100 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              {lvl === "ALL" && "Tất cả mức độ"}
              {lvl === "EMERGENCY" && "Khẩn cấp (SOP 1)"}
              {lvl === "HIGH" && "Mức cao"}
              {lvl === "NORMAL" && "Bình thường"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 shrink-0">
          <span>{filteredIncidents.length} sự cố hiển thị</span>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: Linear Split View ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT COLUMN: Issue Stream ── */}
        <section className="w-full md:w-[440px] lg:w-[480px] shrink-0 border-r border-zinc-800/80 bg-[#090a0d] flex flex-col h-full overflow-hidden">
          {/* Stream Header */}
          <div className="p-3 border-b border-zinc-850 flex items-center justify-between text-xs font-medium text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-200">Hàng đợi Tiếp nhận</span>
              <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                {SAMPLE_INCIDENTS.length}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
              <Clock className="size-3" /> Sắp xếp: Thời gian SLA
            </div>
          </div>

          {/* Issue Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-850/60">
            {filteredIncidents.map((incident) => {
              const isSelected = incident.id === selectedIncident.id;
              const isApproved = approvedIds.has(incident.id);

              return (
                <div
                  key={incident.id}
                  onClick={() => setSelectedId(incident.id)}
                  className={`group relative p-3 cursor-pointer transition-all flex flex-col gap-2 ${
                    isSelected
                      ? "bg-zinc-850/70 border-l-2 border-indigo-500"
                      : "hover:bg-zinc-900/60"
                  }`}
                >
                  {/* Row 1: Priority + Code + Status + SLA Timer */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {renderPriorityIcon(incident.priority)}
                      <span className="font-mono text-[11px] text-zinc-400 tracking-wider">
                        {incident.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {renderStatusBadge(incident.status, isApproved)}
                      <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                        <Clock className="size-3 text-zinc-500" />
                        <span
                          className={
                            incident.slaDueHours <= 2
                              ? "text-rose-400 font-semibold"
                              : "text-zinc-400"
                          }
                        >
                          {incident.slaDueHours}h
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Title */}
                  <h4 className="text-xs font-medium text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">
                    {incident.title}
                  </h4>

                  {/* Row 3: Meta tags & Location */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="size-3 text-zinc-500 shrink-0" />
                      <span className="truncate">{incident.district}</span>
                      <span className="text-zinc-650">•</span>
                      <span className="text-zinc-400 font-mono">{incident.categoryName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {incident.duplicateCount > 0 && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1 rounded">
                          +{incident.duplicateCount} trùng
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {incident.createdAt}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── RIGHT COLUMN: Linear Mission Inspector (Detail Pane) ── */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto bg-[#08090a]">
          {/* Detail Sub-header */}
          <div className="h-12 border-b border-zinc-800/80 bg-[#090a0d] px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-indigo-400 font-semibold tracking-wide">
                {selectedIncident.code}
              </span>
              <span className="text-zinc-700">|</span>
              <span className="text-xs text-zinc-300 font-medium">
                {selectedIncident.categoryName}
              </span>
              {renderPriorityIcon(selectedIncident.priority)}
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickApprove}
                disabled={isApproving || approvedIds.has(selectedIncident.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shadow-xs ${
                  approvedIds.has(selectedIncident.id)
                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-98"
                }`}
              >
                {isApproving ? (
                  <>
                    <RefreshCw className="size-3 animate-spin" /> Đang duyệt...
                  </>
                ) : approvedIds.has(selectedIncident.id) ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-400" /> Đã duyệt đề xuất AI
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" /> Duyệt đề xuất AI (1-Click)
                  </>
                )}
              </button>

              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors">
                <Users className="size-3.5 text-zinc-400" /> Phân công
              </button>
            </div>
          </div>

          {/* Inspector Content Body */}
          <div className="p-6 max-w-5xl space-y-6">
            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
                {selectedIncident.title}
              </h2>
              <p className="text-xs leading-relaxed text-zinc-400">
                {selectedIncident.description}
              </p>
            </div>

            {/* Linear-style Properties Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-500">Đơn vị thụ lý</span>
                <p className="font-medium text-zinc-200 flex items-center gap-1 truncate">
                  <Building2 className="size-3 text-indigo-400 shrink-0" />
                  {selectedIncident.departmentName}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-zinc-500">Kỹ thuật viên phụ trách</span>
                <p className="font-medium text-zinc-200 flex items-center gap-1 truncate">
                  <UserCheck className="size-3 text-emerald-400 shrink-0" />
                  {selectedIncident.technicianName || "Chờ chỉ định"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-zinc-500">Địa chỉ hiện trường</span>
                <p className="font-medium text-zinc-200 flex items-center gap-1 truncate">
                  <MapPin className="size-3 text-rose-400 shrink-0" />
                  {selectedIncident.address}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-zinc-500">Tọa độ WGS84</span>
                <p className="font-mono text-zinc-300 flex items-center gap-1">
                  <Navigation className="size-3 text-sky-400 shrink-0" />
                  {selectedIncident.coordinates[0].toFixed(4)},{" "}
                  {selectedIncident.coordinates[1].toFixed(4)}
                </p>
              </div>
            </div>

            {/* ── AI TRIAGE TERMINAL CARD (DeepSeek Vision) ── */}
            <div className="rounded-lg border border-indigo-500/20 bg-gradient-to-b from-indigo-950/20 to-zinc-900/40 p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-indigo-500/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="size-5 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Bot className="size-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200">
                    DeepSeek Vision Multimodal Triage
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">v3 (deepseek-flash)</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-zinc-500">Độ tin cậy:</span>
                  <span className="text-emerald-400 font-semibold">
                    {(selectedIncident.aiConfidence * 100).toFixed(1)}%
                  </span>
                  <div className="w-12 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${selectedIncident.aiConfidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-zinc-500 shrink-0">• Tóm tắt AI:</span>
                  <span className="text-zinc-300 font-medium">{selectedIncident.aiSummary}</span>
                </div>

                {selectedIncident.hazardWarning && (
                  <div className="flex items-start gap-2 text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                    <ShieldAlert className="size-3.5 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      <strong>Cảnh báo nguy cơ:</strong> {selectedIncident.hazardWarning}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── PHOTOS & DECREE 13 ANONYMIZATION ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="size-3.5 text-zinc-400" /> Ảnh hiện trường & Tuân thủ Nghị định 13
                </h3>

                <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="size-3" /> Đã làm mờ {selectedIncident.blurredFacesCount} mặt,{" "}
                  {selectedIncident.blurredPlatesCount} biển số xe (OpenCV)
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo 1: Before Anonymized */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden space-y-2 p-2">
                  <div className="relative aspect-video rounded-md overflow-hidden bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedIncident.imageBeforeUrl}
                      alt="Hiện trường"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-zinc-300 border border-white/10">
                      BEFORE_ANONYMIZED (Công khai)
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 px-1">
                    Ảnh chụp gửi từ người dân qua {selectedIncident.channel}.
                  </p>
                </div>

                {/* Simulated Radar / Map View */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden p-2 flex flex-col justify-between">
                  <div className="relative aspect-video rounded-md overflow-hidden bg-[#0d1117] border border-zinc-800 flex items-center justify-center">
                    {/* Simulated Radar Circles */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <div className="size-48 rounded-full border border-sky-400" />
                      <div className="size-32 rounded-full border border-sky-400" />
                      <div className="size-16 rounded-full border border-sky-400" />
                    </div>

                    {/* Center Marker */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="size-4 rounded-full bg-rose-500 ring-4 ring-rose-500/30 animate-pulse" />
                      <span className="mt-1 text-[10px] font-mono font-semibold text-zinc-200 bg-zinc-900/90 px-1.5 py-0.5 rounded border border-zinc-700">
                        {selectedIncident.code}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-zinc-900/80 text-[10px] font-mono text-sky-400 border border-zinc-700">
                      Bán kính quét: 50m
                    </div>
                  </div>

                  <div className="p-1 pt-2 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Trắc địa: WGS84 SRID 4326</span>
                    <span className="text-emerald-400">Không có phản ánh trùng 50m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
