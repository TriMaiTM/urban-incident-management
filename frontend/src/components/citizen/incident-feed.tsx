"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Inbox,
  Loader2,
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  ThumbsUp,
  X,
} from "lucide-react";

import type { IncidentNearbyItem } from "@/types/incident";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface IncidentFeedProps {
  incidents: IncidentNearbyItem[];
  selectedCoords: { latitude: number; longitude: number } | null;
  onFocusLocation: (coords: { latitude: number; longitude: number }) => void;
  onVoteDuplicate: (incidentId: string) => void;
  votedIds: Set<string>;
  isVotingId: string | null;
  className?: string;
}

/**
 * 6 sự cố mẫu thực tế tại Đà Nẵng phục vụ hiển thị dự phòng phong phú
 * khi backend ngoại tuyến hoặc danh sách sự cố lân cận rỗng.
 */
export const MOCK_AREA_INCIDENTS: (IncidentNearbyItem & { address_text?: string })[] = [
  {
    id: "mock-inc-001",
    ticket_code: "DN-20261018-001",
    title: "Hư hỏng mặt đường đầu cầu Rồng hướng Hải Châu",
    status: "IN_PROGRESS",
    priority: "HIGH",
    distance_meters: 35,
    latitude: 16.0611,
    longitude: 108.2208,
    created_at: "2026-10-18T08:30:00Z",
    image_url: null,
    address_text: "Đầu cầu Rồng, P. Phước Ninh, Q. Hải Châu",
  },
  {
    id: "mock-inc-002",
    ticket_code: "DN-20261018-002",
    title: "Cây gãy nghiêng nguy hiểm trên đường Bạch Đằng",
    status: "SUBMITTED",
    priority: "MEDIUM",
    distance_meters: 120,
    latitude: 16.0682,
    longitude: 108.2245,
    created_at: "2026-10-18T09:15:00Z",
    image_url: null,
    address_text: "150 Bạch Đằng, P. Hải Châu 1, Q. Hải Châu",
  },
  {
    id: "mock-inc-003",
    ticket_code: "DN-20261018-003",
    title: "Ngập úng cục bộ do nghẹt hố ga thoát nước Hàm Nghi",
    status: "IN_PROGRESS",
    priority: "HIGH",
    distance_meters: 210,
    latitude: 16.0625,
    longitude: 108.213,
    created_at: "2026-10-18T07:45:00Z",
    image_url: null,
    address_text: "Ngã ba Hàm Nghi - Hùng Vương, Q. Thanh Khê",
  },
  {
    id: "mock-inc-004",
    ticket_code: "DN-20261018-004",
    title: "Mất điện toàn bộ hệ thống chiếu sáng đường Nguyễn Văn Linh",
    status: "SUBMITTED",
    priority: "MEDIUM",
    distance_meters: 340,
    latitude: 16.0602,
    longitude: 108.2155,
    created_at: "2026-10-18T10:05:00Z",
    image_url: null,
    address_text: "Đoạn từ Hoàng Diệu đến Cầu Rồng, Q. Hải Châu",
  },
  {
    id: "mock-inc-005",
    ticket_code: "DN-20261018-005",
    title: "Rác thải sinh hoạt ùn ứ quá tải tại kiệt Hùng Vương",
    status: "RESOLVED",
    priority: "LOW",
    distance_meters: 450,
    latitude: 16.069,
    longitude: 108.218,
    created_at: "2026-10-18T06:20:00Z",
    image_url: null,
    address_text: "Kiệt 82 Hùng Vương, P. Hải Châu 2, Q. Hải Châu",
  },
  {
    id: "mock-inc-006",
    ticket_code: "DN-20261018-006",
    title: "Sụt lún nắp hố ga gây nguy hiểm đường Lê Duẩn",
    status: "IN_PROGRESS",
    priority: "CRITICAL",
    distance_meters: 520,
    latitude: 16.0715,
    longitude: 108.216,
    created_at: "2026-10-18T08:00:00Z",
    image_url: null,
    address_text: "Trước số 120 Lê Duẩn, P. Thạch Thang, Q. Hải Châu",
  },
];

/**
 * Tính khoảng cách đường chim bay theo công thức Haversine (mét)
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Định dạng thời gian theo chuẩn GovTech Đà Nẵng
 */
function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${hours}:${minutes} ${day}/${month}`;
  } catch {
    return dateStr;
  }
}

/**
 * Render Badge trạng thái sự cố chuẩn semantic GovTech Đà Nẵng
 */
function renderStatusBadge(status: string) {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case "SUBMITTED":
    case "TRIAGED":
    case "NEW":
      return (
        <Badge
          variant="outline"
          className="rounded-full border-blue-300 bg-blue-50 text-blue-700 text-[11px] font-medium"
        >
          Mới tiếp nhận
        </Badge>
      );
    case "ASSIGNED":
    case "IN_PROGRESS":
      return (
        <Badge
          variant="outline"
          className="rounded-full border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-medium"
        >
          Đang xử lý
        </Badge>
      );
    case "RESOLVED":
    case "CONFIRMED":
    case "CLOSED":
      return (
        <Badge
          variant="outline"
          className="rounded-full border-emerald-300 bg-emerald-50 text-emerald-700 text-[11px] font-medium"
        >
          Đã giải quyết
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="rounded-full border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-medium"
        >
          {status}
        </Badge>
      );
  }
}

/**
 * Khớp từ khóa danh mục theo tiêu đề
 */
function matchesCategory(title: string, category: string): boolean {
  if (category === "all") return true;
  const t = title.toLowerCase();
  switch (category) {
    case "road":
      return (
        t.includes("đường") ||
        t.includes("mặt đường") ||
        t.includes("ổ gà") ||
        t.includes("sụt lún") ||
        t.includes("hố ga") ||
        t.includes("cầu")
      );
    case "flood":
      return (
        t.includes("ngập") ||
        t.includes("úng") ||
        t.includes("cống") ||
        t.includes("thoát nước") ||
        t.includes("nước")
      );
    case "tree":
      return (
        t.includes("cây") ||
        t.includes("cành") ||
        t.includes("ngã") ||
        t.includes("gãy") ||
        t.includes("xanh")
      );
    case "waste":
      return (
        t.includes("rác") ||
        t.includes("phế thải") ||
        t.includes("vệ sinh") ||
        t.includes("ùn ứ")
      );
    case "lighting":
      return (
        t.includes("chiếu sáng") ||
        t.includes("đèn") ||
        t.includes("điện") ||
        t.includes("mất điện")
      );
    default:
      return true;
  }
}

/**
 * Khớp trạng thái xử lý
 */
function matchesStatus(status: string, filter: string): boolean {
  if (filter === "all") return true;
  const s = status.toUpperCase();
  if (filter === "SUBMITTED") {
    return s === "SUBMITTED" || s === "TRIAGED" || s === "NEW";
  }
  if (filter === "IN_PROGRESS") {
    return s === "IN_PROGRESS" || s === "ASSIGNED";
  }
  if (filter === "RESOLVED") {
    return s === "RESOLVED" || s === "CONFIRMED" || s === "CLOSED";
  }
  return s === filter.toUpperCase();
}

export function IncidentFeed({
  incidents,
  selectedCoords,
  onFocusLocation,
  onVoteDuplicate,
  votedIds,
  isVotingId,
  className,
}: IncidentFeedProps) {
  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Dữ liệu hiển thị: dùng incidents thực tế nếu có, ngược lại fallback MOCK_AREA_INCIDENTS
  const baseIncidents = useMemo(() => {
    return incidents.length > 0 ? incidents : MOCK_AREA_INCIDENTS;
  }, [incidents]);

  // Lọc theo từ khóa, danh mục và trạng thái
  const filteredIncidents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return baseIncidents.filter((item) => {
      // Khớp từ khóa tìm kiếm
      if (query) {
        const matchTicket = item.ticket_code.toLowerCase().includes(query);
        const matchTitle = item.title.toLowerCase().includes(query);
        const address =
          (item as IncidentNearbyItem & { address_text?: string })
            .address_text || "";
        const matchAddress = address.toLowerCase().includes(query);
        if (!matchTicket && !matchTitle && !matchAddress) {
          return false;
        }
      }

      // Khớp danh mục
      if (!matchesCategory(item.title, selectedCategory)) {
        return false;
      }

      // Khớp trạng thái
      if (!matchesStatus(item.status, selectedStatus)) {
        return false;
      }

      return true;
    });
  }, [baseIncidents, searchQuery, selectedCategory, selectedStatus]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== "all" ||
    selectedStatus !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedStatus("all");
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* 1. Thanh công cụ lọc ở đầu Feed */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2 shrink-0">
        {/* Ô tìm kiếm từ khóa */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã hoặc từ khóa..."
            className="h-8 pl-8 pr-7 text-xs rounded-md bg-white border-slate-200 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
              title="Xóa tìm kiếm"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Cặp Select lọc Danh mục & Trạng thái */}
        <div className="grid grid-cols-2 gap-2">
          {/* Bộ lọc Danh mục */}
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="h-8 text-xs rounded-md bg-white border-slate-200">
              <SelectValue placeholder="Tất cả danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Tất cả danh mục
              </SelectItem>
              <SelectItem value="road" className="text-xs">
                Mặt đường
              </SelectItem>
              <SelectItem value="flood" className="text-xs">
                Ngập úng
              </SelectItem>
              <SelectItem value="tree" className="text-xs">
                Cây xanh
              </SelectItem>
              <SelectItem value="waste" className="text-xs">
                Rác thải
              </SelectItem>
              <SelectItem value="lighting" className="text-xs">
                Chiếu sáng
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Bộ lọc Trạng thái */}
          <Select
            value={selectedStatus}
            onValueChange={setSelectedStatus}
          >
            <SelectTrigger className="h-8 text-xs rounded-md bg-white border-slate-200">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Tất cả trạng thái
              </SelectItem>
              <SelectItem value="SUBMITTED" className="text-xs">
                Mới tiếp nhận
              </SelectItem>
              <SelectItem value="IN_PROGRESS" className="text-xs">
                Đang xử lý
              </SelectItem>
              <SelectItem value="RESOLVED" className="text-xs">
                Đã giải quyết
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. Danh sách thẻ sự cố */}
      <div className="flex-1 overflow-y-auto space-y-2.5 p-4">
        {filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4 space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox className="size-5" />
            </div>
            <p className="text-xs font-medium text-slate-700">
              Không tìm thấy sự cố phù hợp
            </p>
            <p className="text-[11px] text-slate-500 max-w-[240px]">
              {hasActiveFilters
                ? "Thử thay đổi từ khóa hoặc điều chỉnh bộ lọc danh mục và trạng thái."
                : "Hiện chưa có sự cố nào được ghi nhận tại khu vực này."}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs gap-1.5 rounded-md border-slate-200 text-slate-600 mt-2"
              >
                <RotateCcw className="size-3" />
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const isVoting = isVotingId === incident.id;
            const hasVoted = votedIds.has(incident.id);

            // Địa chỉ: ưu tiên address_text nếu có, ngược lại tọa độ
            const address =
              (incident as IncidentNearbyItem & { address_text?: string })
                .address_text ||
              `Tọa độ ${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`;

            // Tính khoảng cách
            const distanceMeters =
              incident.distance_meters > 0
                ? incident.distance_meters
                : selectedCoords
                ? calculateHaversineDistance(
                    selectedCoords.latitude,
                    selectedCoords.longitude,
                    incident.latitude,
                    incident.longitude
                  )
                : null;

            const distanceText =
              distanceMeters !== null
                ? distanceMeters < 1000
                  ? `${distanceMeters}m`
                  : `${(distanceMeters / 1000).toFixed(1)}km`
                : null;

            return (
              <div
                key={incident.id}
                className="border border-slate-200 bg-white rounded-lg p-3 hover:border-slate-300 transition-all shadow-xs space-y-2"
              >
                {/* Header thẻ: Mã phiếu + Badge trạng thái + Thời gian */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono tabular-nums text-xs font-bold text-[#1051A6]">
                    {incident.ticket_code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {renderStatusBadge(incident.status)}
                    <span className="font-mono tabular-nums text-[10px] text-slate-500">
                      {formatTime(incident.created_at)}
                    </span>
                  </div>
                </div>

                {/* Tiêu đề sự cố */}
                <p
                  className="text-xs font-semibold text-slate-900 line-clamp-1"
                  title={incident.title}
                >
                  {incident.title}
                </p>

                {/* Địa chỉ & Khoảng cách */}
                <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <MapPin className="size-3.5 text-slate-400 shrink-0" />
                    <span
                      className="truncate text-xs text-slate-600"
                      title={address}
                    >
                      {address}
                    </span>
                  </div>
                  {distanceText && (
                    <span className="font-mono tabular-nums text-[11px] text-slate-500 shrink-0">
                      ~{distanceText}
                    </span>
                  )}
                </div>

                {/* Footer thẻ: Upvote trùng lặp + Định vị bản đồ */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isVoting || hasVoted}
                    onClick={() => onVoteDuplicate(incident.id)}
                    className={cn(
                      "h-7 text-xs border-amber-300 bg-amber-50/60 hover:bg-amber-100 text-amber-900 rounded-md gap-1 transition-colors",
                      hasVoted &&
                        "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    )}
                  >
                    {isVoting ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        <span>Đang gửi...</span>
                      </>
                    ) : hasVoted ? (
                      <>
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        <span>Đã +1 Trùng</span>
                      </>
                    ) : (
                      <>
                        <ThumbsUp className="size-3 text-amber-600" />
                        <span>+1 Trùng lặp</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onFocusLocation({
                        latitude: incident.latitude,
                        longitude: incident.longitude,
                      })
                    }
                    className="h-7 text-xs text-slate-600 hover:text-[#1051A6] rounded-md gap-1"
                  >
                    <Navigation className="size-3 text-slate-400 hover:text-[#1051A6]" />
                    <span>Xem vị trí</span>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default IncidentFeed;
