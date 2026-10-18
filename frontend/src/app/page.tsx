"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { MapView } from "@/components/map/map-view";
import { ReportForm } from "@/components/citizen/report-form";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { IncidentCreateResponse, IncidentNearbyItem } from "@/types/incident";
import type { SystemZoneOut } from "@/types/zone";
import { cn } from "@/lib/utils";

// Tọa độ mặc định: Cầu Rồng, trung tâm TP. Đà Nẵng
const DEFAULT_COORDS = { latitude: 16.0611, longitude: 108.2208 };

export default function CitizenPage() {
  // Mobile navigation tab: "form" hoặc "map"
  const [mobileTab, setMobileTab] = useState<"form" | "map">("form");

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
        console.error("Không thể tải danh sách phân vùng hoạt động:", error);
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
          console.error("Lỗi khi kiểm tra phân vùng địa lý:", validateRes.reason);
        }

        if (nearbyRes.status === "fulfilled") {
          setNearbyIncidents(nearbyRes.value.items ?? []);
        } else {
          console.error("Lỗi khi quét sự cố lân cận:", nearbyRes.reason);
          setNearbyIncidents([]);
        }
      } catch (error) {
        console.error("Lỗi đồng bộ dữ liệu vị trí:", error);
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

  // Cập nhật lại danh sách sự cố lân cận khi người dùng bình chọn trùng lặp thành công
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
        console.error("Lỗi cập nhật sự cố sau khi xác nhận trùng lặp:", error);
      }
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top Header: Chuẩn GovTech Đà Nẵng, h-14, viền crisp border-slate-200 */}
      <header className="h-14 border-b border-slate-200 bg-white/95 px-4 flex items-center justify-between shrink-0 z-20 backdrop-blur-sm">
        {/* Bên trái: Logo/Icon & Tên hệ thống */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#1051A6] text-white shadow-sm shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 leading-tight">
              HỆ THỐNG TIẾP NHẬN & ĐIỀU PHỐI SỰ CỐ ĐÔ THỊ
            </h1>
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
              TP ĐÀ NẴNG - KHU VỰC ĐÔ THỊ LÕI
            </p>
          </div>
        </div>

        {/* Ở giữa / Bên phải: Mobile Switcher, GovTech Badge, Hotline 1022 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Tab Toggle (md:hidden) */}
          <div className="flex items-center gap-1 md:hidden bg-slate-100 p-1 rounded-md border border-slate-200">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 px-2.5 text-xs font-medium rounded-md transition-all",
                mobileTab === "map"
                  ? "bg-[#1051A6] text-white hover:bg-[#1051A6] hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              )}
              onClick={() => setMobileTab("map")}
            >
              <MapPin className="h-3.5 w-3.5 mr-1" />
              Bản đồ
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 px-2.5 text-xs font-medium rounded-md transition-all",
                mobileTab === "form"
                  ? "bg-[#1051A6] text-white hover:bg-[#1051A6] hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              )}
              onClick={() => setMobileTab("form")}
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              Báo cáo
            </Button>
          </div>

          {/* Đà Nẵng GovTech Badge */}
          <Badge
            variant="outline"
            className="hidden lg:inline-flex items-center gap-1.5 border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 rounded-md"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#1051A6]" />
            Đà Nẵng GovTech | Thử nghiệm Đợt 1
          </Badge>

          {/* Hotline phản ánh 1022 */}
          <a
            href="tel:1022"
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
            title="Đường dây nóng phản ánh sự cố TP Đà Nẵng"
          >
            <Phone className="h-3.5 w-3.5 text-rose-600" />
            <span className="hidden sm:inline">Hotline phản ánh:</span>
            <span className="font-mono tabular-nums font-bold">1022</span>
          </a>
        </div>
      </header>

      {/* Body Split-Screen: Panel trái (ReportForm) & Panel phải (MapView) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Panel bên trái: Form báo cáo hiện trường, cuộn độc lập */}
        <aside
          className={cn(
            "w-full md:w-[480px] lg:w-[540px] shrink-0 border-r border-slate-200 bg-slate-50/50 overflow-y-auto p-4",
            mobileTab === "form" ? "block" : "hidden md:block"
          )}
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
            onVoteDuplicateSuccess={handleVoteDuplicateSuccess}
          />
        </aside>

        {/* Panel bên phải: Bản đồ GIS MapLibre GL full viewport */}
        <main
          className={cn(
            "flex-1 h-full relative",
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

      {/* Dialog Thành công sau khi tiếp nhận phản ánh */}
      <Dialog
        open={createdIncident !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedIncident(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-slate-200">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-slate-900">
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
              <div className="rounded-md border border-slate-200 bg-slate-100 p-3 text-center">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Mã tra cứu phiếu sự cố
                </span>
                <span className="block text-2xl font-mono font-bold tabular-nums text-[#1051A6] select-all mt-0.5">
                  {createdIncident.ticket_code}
                </span>
              </div>

              {/* Thông tin vắn tắt sự cố */}
              <div className="rounded-md border border-slate-200 bg-white p-3 space-y-2 text-xs">
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
                    className="border-blue-200 bg-blue-50 text-blue-700 font-mono text-[11px]"
                  >
                    Ghi nhận mới
                  </Badge>
                </div>
                {createdIncident.sla_due_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Thời hạn cam kết (SLA):</span>
                    <span className="font-mono tabular-nums text-slate-700 font-medium">
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
                {createdIncident.duplicate_count > 0 && (
                  <div className="flex justify-between items-center text-amber-700 bg-amber-50 px-2 py-1 rounded">
                    <span>Đã ghi nhận trùng:</span>
                    <span className="font-bold tabular-nums">
                      {createdIncident.duplicate_count} lượt
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                Vui lòng lưu lại mã tra cứu để theo dõi tiến độ giải quyết trực tiếp trên Cổng
                Thông tin hoặc gọi tổng đài <span className="font-mono font-semibold">1022</span>.
              </p>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyTicketCode}
              className="w-full sm:w-auto border-slate-300 text-slate-700"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1 text-emerald-600" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Sao chép mã phiếu
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => setCreatedIncident(null)}
              className="w-full sm:w-auto bg-[#1051A6] text-white hover:bg-[#0d4185]"
            >
              Đóng / Gửi phản ánh mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
