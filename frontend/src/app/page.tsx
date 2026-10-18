"use client";

import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  ShieldCheck,
  Clock,
  MapPin,
  AlertTriangle,
  Send,
  RotateCcw,
  CheckCircle2,
  FileText,
  Sparkles,
  Layers,
  ArrowUpRight,
  Info,
  Check,
  Activity,
  Navigation,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StatusBadgeSpec {
  code: string;
  name: string;
  description: string;
  badgeClass: string;
}

const INCIDENT_STATUSES: StatusBadgeSpec[] = [
  {
    code: "SUBMITTED",
    name: "Ghi nhận mới",
    description: "Tiếp nhận qua cổng người dân, chờ phân tích AI",
    badgeClass: "badge-status-submitted",
  },
  {
    code: "TRIAGED",
    name: "Đã phân loại AI",
    description: "DeepSeek trích xuất thực thể, danh mục & độ tin cậy",
    badgeClass: "badge-status-triaged",
  },
  {
    code: "ASSIGNED",
    name: "Đã giao đơn vị",
    description: "Điều phối viên phân bổ đến cơ quan quận/huyện",
    badgeClass: "badge-status-assigned",
  },
  {
    code: "IN_PROGRESS",
    name: "Đang khắc phục",
    description: "Đội phản ứng nhanh tiếp cận và xử lý tại hiện trường",
    badgeClass: "badge-status-in-progress",
  },
  {
    code: "RESOLVED",
    name: "Đã hoàn tất",
    description: "Kỹ thuật viên khắc phục xong kèm ảnh đối chứng",
    badgeClass: "badge-status-resolved",
  },
  {
    code: "CONFIRMED",
    name: "Đã nghiệm thu",
    description: "Người dân hoặc thanh tra đô thị xác nhận hiện trường",
    badgeClass: "badge-status-confirmed",
  },
  {
    code: "CLOSED",
    name: "Đóng phiếu",
    description: "Hồ sơ sự cố lưu trữ vào kho cơ sở dữ liệu GIS",
    badgeClass: "badge-status-closed",
  },
  {
    code: "REJECTED",
    name: "Từ chối / Hủy",
    description: "Phản ánh trùng lặp, spam hoặc nằm ngoài ranh giới",
    badgeClass: "badge-status-rejected",
  },
  {
    code: "EMERGENCY",
    name: "Sự cố khẩn cấp",
    description: "Nguy cơ an toàn tính mạng, áp dụng quy trình SLA đặc biệt",
    badgeClass: "badge-status-emergency",
  },
];

interface DispatcherIncident {
  id: string;
  category: string;
  address: string;
  status: string;
  statusClass: string;
  slaRemaining: string;
  slaClass: string;
}

const SAMPLE_INCIDENTS: DispatcherIncident[] = [
  {
    id: "DN-202610-A1B2",
    category: "Cây xanh ngã đổ",
    address: "Cầu Rồng, P. Hải Châu 1, Q. Hải Châu",
    status: "IN_PROGRESS",
    statusClass: "badge-status-in-progress",
    slaRemaining: "03:45:12",
    slaClass: "text-amber-600 font-semibold",
  },
  {
    id: "DN-202610-C3D4",
    category: "Thoát nước & Ngập úng",
    address: "45 Nguyễn Văn Linh, P. Bình Hiên, Q. Hải Châu",
    status: "EMERGENCY",
    statusClass: "badge-status-emergency",
    slaRemaining: "00:28:10",
    slaClass: "text-rose-600 font-semibold",
  },
  {
    id: "DN-202610-E5F6",
    category: "Giao thông & Hạ tầng",
    address: "Ngã tư Điện Biên Phủ - Hà Huy Tập, Q. Thanh Khê",
    status: "TRIAGED",
    statusClass: "badge-status-triaged",
    slaRemaining: "07:15:00",
    slaClass: "text-blue-700",
  },
  {
    id: "DN-202610-G7H8",
    category: "Chiếu sáng đô thị",
    address: "Tuyến ven sông Như Nguyệt, P. Thuận Phước, Q. Hải Châu",
    status: "RESOLVED",
    statusClass: "badge-status-resolved",
    slaRemaining: "Hoàn tất đúng hạn",
    slaClass: "text-emerald-700",
  },
  {
    id: "DN-202610-M9K0",
    category: "Rác thải môi trường",
    address: "Khu vực Chợ Hàn, Trần Phú, P. Hải Châu 1",
    status: "SUBMITTED",
    statusClass: "badge-status-submitted",
    slaRemaining: "11:59:45",
    slaClass: "text-slate-600",
  },
];

export default function ShowcasePage() {
  const [category, setCategory] = useState<string>("trees");
  const [address, setAddress] = useState<string>(
    "Số 123 đường Bạch Đằng, P. Hải Châu 1, Q. Hải Châu"
  );
  const [coordinates, setCoordinates] = useState<string>(
    "16.0611, 108.2208"
  );
  const [description, setDescription] = useState<string>(
    "Cây xà cừ cổ thụ gãy nhánh lớn chắn ngang một làn đường xe cơ giới, nguy cơ mất an toàn giao thông giờ cao điểm."
  );
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedIncidentForDetail, setSelectedIncidentForDetail] =
    useState<DispatcherIncident | null>(null);

  const getCategoryLabel = (catVal: string): string => {
    switch (catVal) {
      case "traffic":
        return "Giao thông & Hạ tầng đường bộ";
      case "trees":
        return "Cây xanh đô thị & Ngã đổ";
      case "drainage":
        return "Thoát nước & Ngập úng đô thị";
      case "lighting":
        return "Chiếu sáng công cộng & Cột điện";
      case "waste":
        return "Rác thải & Vệ sinh môi trường";
      default:
        return "Sự cố đô thị chung";
    }
  };

  const handleOpenSubmitDialog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !description.trim()) {
      toast.error("Vui lòng điền đầy đủ địa chỉ hiện trường và mô tả sự cố.");
      return;
    }
    setIsDialogOpen(true);
  };

  const handleConfirmSubmission = () => {
    setIsDialogOpen(false);
    toast.success("Tiếp nhận phản ánh sự cố thành công!", {
      description:
        "Mã phiếu DN-202610-A1B2 đã được chuyển đến Trung tâm IOC Đà Nẵng để phân phối xử lý.",
    });
  };

  const handleResetForm = () => {
    setCategory("trees");
    setAddress("Số 123 đường Bạch Đằng, P. Hải Châu 1, Q. Hải Châu");
    setCoordinates("16.0611, 108.2208");
    setDescription(
      "Cây xà cừ cổ thụ gãy nhánh lớn chắn ngang một làn đường xe cơ giới, nguy cơ mất an toàn giao thông giờ cao điểm."
    );
    toast.info("Đã khôi phục dữ liệu mẫu của biểu mẫu tiếp nhận.");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 dark:bg-background dark:text-foreground">
      {/* Header hành chính */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8 dark:border-slate-800 dark:bg-card">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-[#1051A6] text-white shadow-xs">
            <Building2 className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900 md:text-base dark:text-slate-100">
              Nền tảng Tiếp nhận &amp; Điều phối Sự cố Đô thị Lõi Đà Nẵng
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
              Trung tâm Giám sát Điều hành Đô thị Thông minh (IOC) TP Đà Nẵng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-md border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <ShieldCheck className="mr-1 size-3.5 text-[#1051A6]" />
            Đà Nẵng GovTech | Thử nghiệm Đợt 1
          </Badge>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
        {/* Banner thông tin kỹ thuật kiểm định */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#1051A6] dark:bg-blue-950 dark:text-blue-400">
                <Info className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Môi trường Kiểm định Hệ thống Thành phần (Design System Showcase)
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Tuân thủ Bộ quy tắc Giao diện Hành chính GovTech Đà Nẵng,
                  Tailwind CSS v4 inline variables và primitives chính chủ Radix
                  UI / shadcn.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-slate-200 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-200"
                onClick={() =>
                  toast.success("Thông báo kiểm định thành công!", {
                    description:
                      "Hệ thống phân giải Sonner Toast đã hoạt động bình thường trên layout.",
                  })
                }
              >
                <Check className="size-3.5" />
                Toast Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-slate-200 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-200"
                onClick={() =>
                  toast.warning(
                    "Cảnh báo SLA: Phiếu DN-202610-C3D4 còn dưới 30 phút!"
                  )
                }
              >
                <Clock className="size-3.5 text-amber-600" />
                Cảnh báo SLA
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-slate-200 text-xs text-rose-700 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-950"
                onClick={() =>
                  toast.error(
                    "Lỗi Geofence 422: Tọa độ ngoài ranh giới hành chính Đà Nẵng"
                  )
                }
              >
                <AlertTriangle className="size-3.5" />
                Lỗi Geofence
              </Button>
            </div>
          </div>
        </div>

        {/* Khối 1: Bảng mã trạng thái sự cố chuẩn */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-[#1051A6]" />
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100">
              Khối 1: Bảng Mã Trạng thái Sự cố Chuẩn (Incident Status Badges)
            </h2>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-card">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {INCIDENT_STATUSES.map((status) => (
                <div
                  key={status.code}
                  className="flex items-start justify-between rounded-md border border-slate-100 p-3 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`rounded-md font-mono text-xs font-medium tracking-wide ${status.badgeClass}`}
                      >
                        {status.code}
                      </Badge>
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-200">
                        {status.name}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {status.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Grid 2 cột: Khối 2 (Card Preview) & Khối 3 (Form Tiếp nhận) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Khối 2: Thẻ sự cố mẫu */}
          <section className="space-y-3 lg:col-span-5">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-[#1051A6]" />
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100">
                Khối 2: Thẻ Sự cố Mẫu (Incident Card Preview)
              </h2>
            </div>

            <Card className="rounded-lg border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-card">
              <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold tracking-wider text-slate-500 tabular-nums dark:text-slate-400">
                    MÃ PHIẾU: DN-202610-A1B2
                  </span>
                  <Badge
                    variant="outline"
                    className="badge-status-in-progress rounded-md text-xs font-medium"
                  >
                    IN_PROGRESS
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Cây xà cừ ngã đổ chắn ngang lòng đường
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Thuộc địa bàn phân cấp: Quận Hải Châu, TP Đà Nẵng
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4 text-xs">
                {/* Thông tin thực địa */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    <span>
                      Cầu Rồng, P. Hải Châu 1, Q. Hải Châu, TP Đà Nẵng
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Navigation className="size-4 shrink-0 text-slate-400" />
                    <span>Tọa độ WGS84:</span>
                    <span className="font-mono font-medium text-slate-900 tabular-nums dark:text-slate-100">
                      16.0611°N, 108.2208°E
                    </span>
                  </div>
                </div>

                <div className="rounded-md border border-slate-100 bg-slate-50/80 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Clock className="size-3.5 text-amber-600" />
                      SLA Còn lại:
                    </span>
                    <span className="font-mono text-sm font-bold text-amber-600 tabular-nums">
                      03:45:12
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Sparkles className="size-3.5 text-[#1051A6]" />
                      Độ tin cậy AI DeepSeek:
                    </span>
                    <span className="font-mono font-semibold text-emerald-600 tabular-nums">
                      94.5%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Đơn vị phụ trách:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Cty Công viên Cây xanh ĐN
                    </span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Ghi chú hiện trường: Nhánh cây dài 6m đường kính 35cm gãy đè lên
                  hành lang đi bộ và làn xe thô sơ. Đội xử lý số 2 đã có mặt
                  cùng cưa máy lúc 14:15.
                </p>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-md border-slate-200 text-xs dark:border-slate-700"
                  onClick={() =>
                    toast.info(
                      "Mở bản đồ định vị: 16.0611, 108.2208 trên nền bản đồ MapLibre"
                    )
                  }
                >
                  <MapPin className="size-3.5 text-[#1051A6]" />
                  Xem GIS Map
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-md bg-[#1051A6] text-xs hover:bg-[#0D4185]"
                  onClick={() => {
                    setSelectedIncidentForDetail(SAMPLE_INCIDENTS[0]);
                  }}
                >
                  Chi tiết điều phối
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </CardFooter>
            </Card>
          </section>

          {/* Khối 3: Form tiếp nhận phản ánh mẫu */}
          <section className="space-y-3 lg:col-span-7">
            <div className="flex items-center gap-2">
              <Send className="size-4 text-[#1051A6]" />
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100">
                Khối 3: Form Tiếp nhận Phản ánh Mẫu (Incident Submission Form)
              </h2>
            </div>

            <Card className="rounded-lg border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-card">
              <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Ghi nhận Phản ánh Hiện trường Mới
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Nhập thông tin sự cố hạ tầng đô thị. AI sẽ tự động phân loại
                  nhóm sự cố và kích hoạt chuẩn SLA xử lý.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleOpenSubmitDialog}>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Danh mục sự cố */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="category-select"
                        className="text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Danh mục Sự cố Đô thị
                      </Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger
                          id="category-select"
                          className="w-full rounded-md border-slate-200 text-xs dark:border-slate-700"
                        >
                          <SelectValue placeholder="Chọn danh mục" />
                        </SelectTrigger>
                        <SelectContent className="rounded-md border-slate-200 text-xs dark:border-slate-800">
                          <SelectItem value="traffic">
                            Giao thông &amp; Hạ tầng đường bộ
                          </SelectItem>
                          <SelectItem value="trees">
                            Cây xanh đô thị &amp; Ngã đổ
                          </SelectItem>
                          <SelectItem value="drainage">
                            Thoát nước &amp; Ngập úng đô thị
                          </SelectItem>
                          <SelectItem value="lighting">
                            Chiếu sáng công cộng &amp; Cột điện
                          </SelectItem>
                          <SelectItem value="waste">
                            Rác thải &amp; Vệ sinh môi trường
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tọa độ WGS84 */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="incident-coords"
                        className="text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Tọa độ WGS84 (Lat, Lon)
                      </Label>
                      <Input
                        id="incident-coords"
                        value={coordinates}
                        onChange={(e) => setCoordinates(e.target.value)}
                        placeholder="16.0611, 108.2208"
                        className="font-mono rounded-md border-slate-200 text-xs tabular-nums dark:border-slate-700"
                      />
                    </div>
                  </div>

                  {/* Địa chỉ hiện trường */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="incident-address"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Địa chỉ Hiện trường (Khu vực Đô thị Lõi)
                    </Label>
                    <Input
                      id="incident-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Số nhà, tên đường, phường, quận..."
                      className="rounded-md border-slate-200 text-xs dark:border-slate-700"
                    />
                  </div>

                  {/* Nội dung mô tả sự cố */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="incident-desc"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Nội dung Mô tả Hiện trường &amp; Tác động
                    </Label>
                    <Textarea
                      id="incident-desc"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả hiện trạng, mức độ nghiêm trọng, nguy cơ cản trở lưu thông hoặc nguy hiểm..."
                      className="rounded-md border-slate-200 text-xs dark:border-slate-700"
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-md border-slate-200 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300"
                    onClick={handleResetForm}
                  >
                    <RotateCcw className="size-3.5" />
                    Hủy / Làm lại
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    className="rounded-md bg-[#1051A6] text-xs font-medium text-white hover:bg-[#0D4185]"
                  >
                    <Send className="size-3.5" />
                    Gửi phản ánh sự cố
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </section>
        </div>

        {/* Khối 4: Bảng điều phối sự cố gần đây */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-[#1051A6]" />
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100">
                Khối 4: Bảng Điều phối Sự cố Gần đây (Dispatcher Incident Table)
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Tổng số: 5 sự cố trong ca trực
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-card">
            <Table>
              <TableHeader className="bg-slate-50/75 dark:bg-slate-900/50">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="w-[150px] text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mã phiếu
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Danh mục sự cố
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Địa chỉ hiện trường
                  </TableHead>
                  <TableHead className="w-[140px] text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Trạng thái
                  </TableHead>
                  <TableHead className="w-[150px] text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Hạn xử lý SLA
                  </TableHead>
                  <TableHead className="w-[100px] text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SAMPLE_INCIDENTS.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800/80 dark:hover:bg-slate-800/40"
                  >
                    <TableCell className="font-mono text-xs font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                      {item.id}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {item.category}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {item.address}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`rounded-md font-mono text-xs font-medium ${item.statusClass}`}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={`font-mono text-xs tabular-nums ${item.slaClass}`}>
                      {item.slaRemaining}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-md border-slate-200 px-2.5 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={() => setSelectedIncidentForDetail(item)}
                      >
                        Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>

      {/* Khối 5: Dialog Xác nhận Tiếp nhận Sự cố */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-lg border-slate-200 p-6 sm:max-w-md dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
              <CheckCircle2 className="size-5 text-[#1051A6]" />
              Xác nhận Tiếp nhận Phản ánh Sự cố
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Hệ thống sẽ lưu phiếu phản ánh vào CSDL GIS không gian và kích hoạt
              tiến trình phân tích AI DeepSeek.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-md border border-slate-100 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã phiếu dự kiến:</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                DN-202610-A1B2
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nhóm danh mục:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {getCategoryLabel(category)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tọa độ WGS84:</span>
              <span className="font-mono text-slate-800 tabular-nums dark:text-slate-200">
                {coordinates}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Địa chỉ hiện trường:</span>
              <span className="max-w-[220px] text-right font-medium text-slate-800 truncate dark:text-slate-200">
                {address}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200/60 pt-2 dark:border-slate-800">
              <span className="text-slate-500">Thời hạn cam kết SLA:</span>
              <span className="font-mono font-bold text-amber-600 tabular-nums">
                04:00:00 (Tiêu chuẩn đô thị lõi)
              </span>
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md border-slate-200 text-xs dark:border-slate-700"
              onClick={() => setIsDialogOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-md bg-[#1051A6] text-xs font-medium text-white hover:bg-[#0D4185]"
              onClick={handleConfirmSubmission}
            >
              Xác nhận &amp; Gửi điều phối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Chi tiết Sự cố từ Bảng Điều phối */}
      <Dialog
        open={selectedIncidentForDetail !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIncidentForDetail(null);
        }}
      >
        <DialogContent className="rounded-lg border-slate-200 p-6 sm:max-w-lg dark:border-slate-800">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Hồ sơ Chi tiết Sự cố Đô thị
              </DialogTitle>
              {selectedIncidentForDetail && (
                <Badge
                  variant="outline"
                  className={`rounded-md font-mono text-xs font-medium ${selectedIncidentForDetail.statusClass}`}
                >
                  {selectedIncidentForDetail.status}
                </Badge>
              )}
            </div>
            <DialogDescription className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              MÃ PHIẾU: {selectedIncidentForDetail?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedIncidentForDetail && (
            <div className="space-y-3 text-xs">
              <div className="rounded-md border border-slate-100 bg-slate-50/80 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex justify-between">
                  <span className="text-slate-500">Danh mục:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedIncidentForDetail.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hiện trường:</span>
                  <span className="font-medium text-slate-800 text-right dark:text-slate-200">
                    {selectedIncidentForDetail.address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thời hạn SLA còn lại:</span>
                  <span
                    className={`font-mono tabular-nums ${selectedIncidentForDetail.slaClass}`}
                  >
                    {selectedIncidentForDetail.slaRemaining}
                  </span>
                </div>
              </div>

              <div className="rounded-md border border-slate-200/60 p-3 space-y-1.5 text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Quy trình Điều phối IOC:
                </span>
                <p className="leading-relaxed">
                  Phiếu đã được đồng bộ với hệ thống bản đồ số MapLibre và thông báo
                  đến Đội cơ động tuần tra phụ trách phân vùng Hải Châu.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md border-slate-200 text-xs dark:border-slate-700"
              onClick={() => setSelectedIncidentForDetail(null)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-md bg-[#1051A6] text-xs font-medium text-white hover:bg-[#0D4185]"
              onClick={() => {
                const id = selectedIncidentForDetail?.id;
                setSelectedIncidentForDetail(null);
                toast.success(`Đã phân công lại sự cố ${id} thành công!`);
              }}
            >
              Điều phối Đơn vị
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
