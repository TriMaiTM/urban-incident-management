"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { IncidentFeed } from "@/components/citizen/incident-feed";
import { ReportForm } from "@/components/citizen/report-form";
import { MapView } from "@/components/map/map-view";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { IncidentCreateResponse, IncidentNearbyItem } from "@/types/incident";
import type { SystemZoneOut } from "@/types/zone";
import { cn } from "@/lib/utils";

// Tọa độ mặc định: Cầu Rồng, trung tâm TP. Đà Nẵng
const DEFAULT_COORDS = { latitude: 16.0611, longitude: 108.2208 };

export default function CitizenPage() {
  // Điều phối Sidebar tab: "feed" (Danh sách sự cố) hoặc "report" (Gửi phản ánh)
  const [sidebarTab, setSidebarTab] = useState<"feed" | "report">("feed");

  // Mobile navigation tab: "sidebar" hoặc "map"
  const [mobileTab, setMobileTab] = useState<"sidebar" | "map">("sidebar");

  // State điều phối tọa độ được chọn
  const [selectedCoords, setSelectedCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(DEFAULT_COORDS);

  // State lưu danh sách phân vùng đô thị đang kích hoạt
  const [activeZones, setActiveZones] = useState<SystemZoneOut[]>([]);

  // State kiểm tra phạm vi hàng rào địa lý
  const [isInsideZone, setIsInsideZone] = useState<boolean>(true);
  const [zoneName, setZoneName] = useState<string | null>(null);
  const [zoneMessage, setZoneMessage] = useState<string | null>(null);

  // State danh sách sự cố lân cận trong bán kính 50m
  const [nearbyIncidents, setNearbyIncidents] = useState<IncidentNearbyItem[]>([]);

  // State quản lý lượt upvote trùng lặp
  const [votedIds, setVotedIds] = useState<Set<string>>(() => new Set());
  const [isVotingId, setIsVotingId] = useState<string | null>(null);

  // State điều khiển Modal thành công sau khi gửi phiếu phản ánh
  const [createdIncident, setCreatedIncident] = useState<IncidentCreateResponse | null>(null);

  // State sao chép mã phiếu thành công
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Nạp danh sách các phân vùng đô thị kích hoạt (Active Zones) 1 lần khi khởi tạo
  useEffect(() => {
    let isCancelled = false;

    async function fetchZones() {
      try {
        const zones = await api.getActiveZones();
        if (!isCancelled) {
          setActiveZones(zones);
        }
      } catch (error) {
        console.warn("Không thể tải danh sách phân vùng hoạt động:", error);
      }
    }

    void fetchZones();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Tự động kiểm tra Geofence và quét sự cố lân cận 50m khi selectedCoords thay đổi
  useEffect(() => {
    let isCancelled = false;

    if (!selectedCoords) {
      return;
    }

    const { latitude, longitude } = selectedCoords;

    async function syncLocationData() {
      try {
        const [validateRes, nearbyRes] = await Promise.allSettled([
          api.validateLocation(latitude, longitude),
          api.getNearbyIncidents(latitude, longitude, 50),
        ]);

        if (isCancelled) return;

        if (validateRes.status === "fulfilled") {
          setIsInsideZone(validateRes.value.is_inside);
          setZoneName(validateRes.value.zone_name);
          setZoneMessage(validateRes.value.message);
        } else {
          console.warn("Lỗi khi kiểm tra phân vùng địa lý:", validateRes.reason);
        }

        if (nearbyRes.status === "fulfilled") {
          setNearbyIncidents(nearbyRes.value.items ?? []);
        } else {
          console.warn("Lỗi khi quét sự cố lân cận:", nearbyRes.reason);
          setNearbyIncidents([]);
        }
      } catch (error) {
        console.warn("Lỗi đồng bộ dữ liệu vị trí:", error);
      }
    }

    void syncLocationData();

    return () => {
      isCancelled = true;
    };
  }, [selectedCoords]);

  // Cập nhật tọa độ từ bản đồ hoặc nút GPS
  const handleSelectCoords = (coords: { latitude: number; longitude: number }) => {
    setSelectedCoords(coords);
  };

  // Di chuyển góc nhìn bản đồ đến vị trí sự cố được chọn từ feed
  const handleFocusLocation = (coords: { latitude: number; longitude: number }) => {
    setSelectedCoords(coords);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileTab("map");
    }
  };

  // Xử lý vote sự cố trùng lặp từ Feed
  const handleVoteDuplicate = async (incidentId: string) => {
    setIsVotingId(incidentId);
    try {
      const res = await api.voteDuplicate(incidentId);
      setVotedIds((prev) => new Set(prev).add(incidentId));
      toast.success(
        `Đã xác nhận trùng cho phiếu ${res.ticket_code}! Tổng cộng ${res.new_count} lượt ghi nhận.`
      );
      if (selectedCoords) {
        try {
          const nearbyRes = await api.getNearbyIncidents(
            selectedCoords.latitude,
            selectedCoords.longitude,
            50
          );
          setNearbyIncidents(nearbyRes.items ?? []);
        } catch (error) {
          console.warn("Lỗi cập nhật sự cố sau khi vote duplicate:", error);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Không thể xác nhận trùng lặp";
      toast.error(msg);
    } finally {
      setIsVotingId(null);
    }
  };

  // Cập nhật lại danh sách sự cố lân cận khi người dùng bình chọn trùng lặp từ ReportForm
  const handleVoteDuplicateSuccess = async (ticketCode: string, newCount: number) => {
    toast.info(`Đã xác nhận trùng cho phiếu ${ticketCode} (${newCount} lượt).`);
    if (selectedCoords) {
      try {
        const nearbyRes = await api.getNearbyIncidents(
          selectedCoords.latitude,
          selectedCoords.longitude,
          50
        );
        setNearbyIncidents(nearbyRes.items ?? []);
      } catch (error) {
        console.warn("Lỗi cập nhật sự cố sau khi xác nhận trùng lặp:", error);
      }
    }
  };

  // Xử lý sao chép mã phiếu vào clipboard
  const handleCopyTicketCode = async () => {
    if (!createdIncident?.ticket_code) return;
    try {
      await navigator.clipboard.writeText(createdIncident.ticket_code);
      setCopied(true);
      toast.success("Đã sao chép mã tra cứu vào bộ nhớ tạm");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép mã phiếu. Vui lòng ghi lại mã bằng tay.");
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-slate-900">
      {/* Top Header: Chuẩn GovTech Đà Nẵng, h-14, viền crisp border-slate-200 */}
      <header className="h-14 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        {/* Bên trái: Logo/Icon Tòa thị chính & Tiêu đề hệ thống */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1051A6] text-white shadow-xs shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-tight">
              IOC ĐÀ NẴNG
            </h1>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              TIẾP NHẬN SỰ CỐ ĐÔ THỊ LÕI
            </p>
          </div>
        </div>

        {/* Ở giữa: Cụm chuyển đổi 4 phân hệ */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            className="bg-white text-[#1051A6] font-semibold shadow-xs px-3 py-1 text-xs rounded-md flex items-center gap-1.5 transition-colors"
          >
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
            Công dân
          </button>
          <button
            type="button"
            onClick={() => toast.info("Phân hệ Điều phối IOC đang trong giai đoạn thử nghiệm")}
            className="px-3 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-colors"
          >
            Điều phối IOC
          </button>
          <button
            type="button"
            onClick={() => toast.info("Phân hệ Kỹ thuật viên đang trong giai đoạn thử nghiệm")}
            className="px-3 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-colors"
          >
            Kỹ thuật viên
          </button>
          <button
            type="button"
            onClick={() => toast.info("Phân hệ Quản trị đang trong giai đoạn thử nghiệm")}
            className="px-3 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-colors"
          >
            Quản trị
          </button>
        </nav>

        {/* Bên phải: Mobile Switcher, Thông tin tài khoản & Nút CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Switcher (md:hidden) */}
          <div className="flex items-center gap-1 md:hidden bg-slate-100 p-0.5 rounded-md border border-slate-200">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "rounded-md h-7 px-2.5 text-xs font-medium transition-all",
                mobileTab === "sidebar"
                  ? "bg-white text-[#1051A6] shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
              onClick={() => setMobileTab("sidebar")}
            >
              Danh sách
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "rounded-md h-7 px-2.5 text-xs font-medium transition-all",
                mobileTab === "map"
                  ? "bg-white text-[#1051A6] shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
              onClick={() => setMobileTab("map")}
            >
              <MapPin className="size-3.5 mr-1" />
              Bản đồ
            </Button>
          </div>

          {/* Trạng thái tài khoản người dùng */}
          <div className="hidden sm:flex items-center gap-2 pl-1 border-l border-slate-200">
            <Avatar className="size-7 border border-slate-200">
              <AvatarFallback className="bg-slate-100 text-[11px] font-semibold text-slate-700">
                CD
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left">
              <span className="text-xs font-medium text-slate-900 leading-none">
                Khách (Công dân)
              </span>
              <span className="text-[10px] text-slate-500 leading-tight">
                Đà Nẵng SmartCity
              </span>
            </div>
          </div>

          {/* Nút CTA chính: Gửi phản ánh mới */}
          <Button
            type="button"
            onClick={() => {
              setSidebarTab("report");
              setMobileTab("sidebar");
            }}
            className="h-9 px-3.5 bg-[#1051A6] hover:bg-[#0d4287] text-white text-xs font-medium rounded-md shadow-xs gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">+ Gửi phản ánh mới</span>
            <span className="xs:hidden">Gửi phản ánh</span>
          </Button>
        </div>
      </header>

      {/* Body Split-Screen: Sidebar trái liền mạch & MapView phải toàn diện */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Cột trái: Sidebar liền mạch chạm mép với Tabs shadcn/ui */}
        <aside
          className={cn(
            "w-full md:w-[420px] shrink-0 border-r border-slate-200 bg-white flex flex-col h-full z-10",
            mobileTab === "sidebar" ? "flex" : "hidden md:flex"
          )}
        >
          <Tabs
            value={sidebarTab}
            onValueChange={(val) => setSidebarTab(val as "feed" | "report")}
            className="w-full flex-1 flex flex-col overflow-hidden gap-0"
          >
            <TabsList className="grid grid-cols-2 h-10 w-full rounded-none border-b border-slate-200 bg-slate-50 p-1 shrink-0">
              <TabsTrigger
                value="feed"
                className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-[#1051A6] data-[state=active]:font-semibold data-[state=active]:shadow-xs rounded-md"
              >
                Sự cố khu vực
                {nearbyIncidents.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-4 px-1 text-[10px] font-mono tabular-nums bg-slate-200 text-slate-700 rounded-full"
                  >
                    {nearbyIncidents.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="report"
                className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-[#1051A6] data-[state=active]:font-semibold data-[state=active]:shadow-xs rounded-md"
              >
                + Gửi phản ánh
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="feed"
              className="m-0 flex-1 h-full overflow-hidden focus-visible:outline-none"
            >
              <IncidentFeed
                incidents={nearbyIncidents}
                selectedCoords={selectedCoords}
                onFocusLocation={handleFocusLocation}
                onVoteDuplicate={handleVoteDuplicate}
                votedIds={votedIds}
                isVotingId={isVotingId}
                className="h-full"
              />
            </TabsContent>

            <TabsContent
              value="report"
              className="m-0 flex-1 overflow-y-auto focus-visible:outline-none"
            >
              <ReportForm
                selectedCoords={selectedCoords}
                onSelectCoords={handleSelectCoords}
                nearbyIncidents={nearbyIncidents}
                isInsideZone={isInsideZone}
                zoneName={zoneName}
                zoneMessage={zoneMessage}
                onIncidentCreated={(incident) => {
                  setCreatedIncident(incident);
                }}
                onVoteDuplicateSuccess={(ticketCode, newCount) => {
                  void handleVoteDuplicateSuccess(ticketCode, newCount);
                }}
              />
            </TabsContent>
          </Tabs>
        </aside>

        {/* Cột phải: Bản đồ GIS MapLibre GL full viewport */}
        <main
          className={cn(
            "flex-1 h-full relative bg-slate-100",
            mobileTab === "map" ? "block" : "hidden md:block"
          )}
        >
          <MapView
            selectedCoords={selectedCoords}
            onSelectCoords={handleSelectCoords}
            nearbyIncidents={nearbyIncidents}
            activeZones={activeZones}
            isInsideZone={isInsideZone}
            className="w-full h-full"
          />
        </main>
      </div>

      {/* Modal Tiếp nhận Thành công (Chuẩn Figma Dialog) */}
      <Dialog
        open={createdIncident !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedIncident(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-slate-200 bg-white shadow-lg rounded-lg">
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-base font-semibold text-slate-900 text-center">
              Tiếp nhận phản ánh sự cố thành công!
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              Hệ thống Điều phối Đô thị Đà Nẵng đã ghi nhận thông tin và đang chuyển dữ liệu
              đến bộ phận chức năng xử lý.
            </DialogDescription>
          </DialogHeader>

          {createdIncident && (
            <div className="space-y-4 py-2">
              {/* Khối hiển thị mã tra cứu to rõ */}
              <div className="text-center space-y-1">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Mã tra cứu phiếu sự cố
                </span>
                <div className="text-2xl font-mono tabular-nums font-bold text-[#1051A6] bg-slate-50 border border-slate-200 p-3 rounded-lg text-center tracking-wider select-all">
                  {createdIncident.ticket_code}
                </div>
              </div>

              {/* Thông tin vắn tắt sự cố */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2 text-xs">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-500 shrink-0">Tiêu đề:</span>
                  <span className="font-medium text-slate-900 text-right line-clamp-2">
                    {createdIncident.title}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Trạng thái:</span>
                  <Badge
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700 font-mono text-[11px] rounded-full px-2 py-0.5"
                  >
                    Ghi nhận mới
                  </Badge>
                </div>
                {createdIncident.sla_due_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Thời hạn cam kết (SLA):</span>
                    <span className="font-mono tabular-nums text-slate-900 font-medium">
                      {new Date(createdIncident.sla_due_at).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {createdIncident.duplicate_count > 1 && (
                  <div className="flex justify-between items-center text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                    <span>Đã ghi nhận trùng:</span>
                    <span className="font-bold tabular-nums">
                      {createdIncident.duplicate_count} lượt
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1 text-center">
                <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                  <Phone className="size-3 text-slate-400" />
                  <span>
                    Theo dõi tiến độ trực tiếp hoặc liên hệ đường dây nóng{" "}
                    <strong className="font-mono text-slate-700">1022</strong>.
                  </span>
                </p>
                <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="size-3 text-[#1051A6]" />
                  <span>Thông tin được bảo vệ theo Nghị định 13/2023/NĐ-CP</span>
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyTicketCode}
              className="h-9 rounded-md gap-1.5 text-xs font-medium w-full sm:w-auto border-slate-200"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-500" />
                  Sao chép mã tra cứu
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setCreatedIncident(null);
                setSidebarTab("report");
              }}
              className="h-9 bg-[#1051A6] hover:bg-[#0d4287] text-white rounded-md text-xs font-medium w-full sm:w-auto"
            >
              Đóng / Gửi phản ánh mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
