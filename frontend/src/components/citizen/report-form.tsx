"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  LocateFixed,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type {
  CategoryOut,
  IncidentCreateResponse,
  IncidentNearbyItem,
} from "@/types/incident";
import { createIncident, getCategories, voteDuplicate } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export interface ReportFormProps {
  selectedCoords: { latitude: number; longitude: number } | null;
  onSelectCoords: (coords: { latitude: number; longitude: number }) => void;
  nearbyIncidents: IncidentNearbyItem[];
  isInsideZone: boolean;
  zoneName: string | null;
  zoneMessage: string | null;
  onIncidentCreated: (incident: IncidentCreateResponse) => void;
  onVoteDuplicateSuccess: (ticketCode: string, newCount: number) => void;
  className?: string;
}

/**
 * Trả về Badge thể hiện trạng thái theo chuẩn GovTech Đà Nẵng:
 * - SUBMITTED / TRIAGED: slate / blue
 * - ASSIGNED / IN_PROGRESS: amber
 * - RESOLVED / CONFIRMED / CLOSED: emerald
 * - EMERGENCY / Cảnh báo: rose / red
 */
function renderIncidentStatusBadge(status: string) {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case "SUBMITTED":
      return (
        <Badge
          variant="outline"
          className="border-slate-300 bg-slate-50 text-slate-700 font-mono text-[11px]"
        >
          Đã gửi
        </Badge>
      );
    case "TRIAGED":
      return (
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-700 font-mono text-[11px]"
        >
          Đã phân loại
        </Badge>
      );
    case "ASSIGNED":
    case "IN_PROGRESS":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-700 font-mono text-[11px]"
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
          className="border-emerald-300 bg-emerald-50 text-emerald-700 font-mono text-[11px]"
        >
          Đã xử lý
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="border-slate-200 text-slate-600 font-mono text-[11px]"
        >
          {status}
        </Badge>
      );
  }
}

export function ReportForm({
  selectedCoords,
  onSelectCoords,
  nearbyIncidents,
  isInsideZone,
  zoneName,
  zoneMessage,
  onIncidentCreated,
  onVoteDuplicateSuccess,
  className,
}: ReportFormProps) {
  // Danh mục sự cố nạp động
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Dữ liệu Form
  const [categoryId, setCategoryId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [addressText, setAddressText] = useState<string>("");
  const [citizenContact, setCitizenContact] = useState<string>("");

  // Tệp hình ảnh & Preview
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Trạng thái thao tác
  const [isGettingGps, setIsGettingGps] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [votingIncidentId, setVotingIncidentId] = useState<string | null>(null);
  const [votedIncidentIds, setVotedIncidentIds] = useState<Set<string>>(
    () => new Set()
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Nạp danh mục từ Backend (thủ công khi người dùng bấm Tải lại)
  const reloadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoriesError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Không thể tải danh mục sự cố";
      setCategoriesError(msg);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Nạp danh mục khi component mount (khởi tạo bất đồng bộ an toàn)
  useEffect(() => {
    let ignore = false;

    async function initCategories() {
      try {
        const data = await getCategories();
        if (!ignore) {
          setCategories(data);
          setIsLoadingCategories(false);
        }
      } catch (err) {
        if (!ignore) {
          const msg =
            err instanceof Error ? err.message : "Không thể tải danh mục sự cố";
          setCategoriesError(msg);
          setIsLoadingCategories(false);
        }
      }
    }

    void initCategories();

    return () => {
      ignore = true;
    };
  }, []);

  // Dọn dẹp Blob preview URL khi unmount hoặc đổi ảnh
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Lấy vị trí GPS hiện tại của công dân
  const handleGetGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ dịch vụ định vị GPS");
      return;
    }

    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsGettingGps(false);
        const { latitude, longitude } = position.coords;
        onSelectCoords({ latitude, longitude });
        toast.success("Đã xác định vị trí GPS hiện tại");
      },
      (error) => {
        setIsGettingGps(false);
        let msg = "Không thể lấy vị trí hiện tại";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Vui lòng cấp quyền truy cập vị trí trong trình duyệt";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Tín hiệu GPS hiện không khả dụng";
        } else if (error.code === error.TIMEOUT) {
          msg = "Thời gian xác định GPS quá lâu, vui lòng thử lại";
        }
        toast.error(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [onSelectCoords]);

  // Xử lý chọn tệp hình ảnh
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chỉ chọn tệp hình ảnh (JPG, PNG, WEBP)");
      return;
    }

    // Giới hạn 10MB theo cấu hình hệ thống
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("Dung lượng ảnh vượt quá giới hạn 10MB");
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreviewUrl(previewUrl);
    setSubmitError(null);
  };

  // Xóa ảnh đã chọn
  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Xác nhận trùng lặp sự cố lân cận
  const handleVoteDuplicate = async (item: IncidentNearbyItem) => {
    setVotingIncidentId(item.id);
    try {
      const res = await voteDuplicate(item.id);
      setVotedIncidentIds((prev) => new Set(prev).add(item.id));
      toast.success(
        `Đã xác nhận trùng lặp phiếu ${item.ticket_code}! Tổng cộng ${res.new_count} người cùng ghi nhận.`
      );
      onVoteDuplicateSuccess(item.ticket_code, res.new_count);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Không thể xác nhận trùng lặp";
      toast.error(msg);
    } finally {
      setVotingIncidentId(null);
    }
  };

  // Gửi phản ánh hiện trường
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    // 1. Thẩm định tọa độ
    if (!selectedCoords) {
      toast.error("Vui lòng chọn vị trí sự cố trên bản đồ hoặc bằng GPS");
      return;
    }

    // 2. Thẩm định hàng rào địa lý
    if (isInsideZone === false) {
      toast.error(
        "Vị trí bạn chọn nằm ngoài phạm vi Vùng Đô thị Đà Nẵng thử nghiệm"
      );
      return;
    }

    // 3. Thẩm định danh mục
    if (!categoryId) {
      toast.error("Vui lòng chọn danh mục sự cố đô thị");
      return;
    }

    // 4. Thẩm định tiêu đề
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      toast.error("Tiêu đề sự cố phải có ít nhất 3 ký tự");
      return;
    }

    // 5. Thẩm định mô tả
    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 5) {
      toast.error("Mô tả chi tiết phải có ít nhất 5 ký tự");
      return;
    }

    // 6. Thẩm định địa chỉ
    const trimmedAddress = addressText.trim();
    if (trimmedAddress.length < 3) {
      toast.error("Vui lòng nhập địa chỉ cụ thể hiện trường (tối thiểu 3 ký tự)");
      return;
    }

    // 7. Thẩm định tệp ảnh
    if (!imageFile) {
      toast.error("Vui lòng chụp hoặc tải lên ít nhất một ảnh hiện trường");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", trimmedTitle);
      formData.append("description", trimmedDesc);
      formData.append("latitude", selectedCoords.latitude.toString());
      formData.append("longitude", selectedCoords.longitude.toString());
      formData.append("address_text", trimmedAddress);

      if (citizenContact.trim()) {
        formData.append("citizen_contact", citizenContact.trim());
      }

      const selectedCat = categories.find((c) => c.id === categoryId);
      if (selectedCat) {
        formData.append("category_id", selectedCat.id);
        formData.append("category_code", selectedCat.code);
      }

      formData.append("image", imageFile);

      const createdIncident = await createIncident(formData);
      toast.success(
        `Gửi phản ánh thành công! Mã tiếp nhận: ${createdIncident.ticket_code}`
      );

      // Xóa trắng form sau khi gửi thành công
      setTitle("");
      setDescription("");
      setAddressText("");
      setCitizenContact("");
      setCategoryId("");
      handleRemoveImage();

      onIncidentCreated(createdIncident);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gửi phản ánh hiện trường thất bại";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormBlockedByLocation =
    !selectedCoords || isInsideZone === false;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-4 text-slate-900", className)}
      noValidate
    >
      {/* KHỐI 1: ĐỊNH VỊ TỌA ĐỘ HIỆN TRƯỜNG */}
      <section className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <MapPin className="size-3.5 text-[#1051A6]" />
            <span>VỊ TRÍ HIỆN TRƯỜNG</span>
            <span className="text-rose-500 font-bold">*</span>
          </Label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetGpsLocation}
            disabled={isGettingGps}
            className="h-7 gap-1 px-2.5 text-xs text-slate-700 hover:text-[#1051A6] border-slate-300"
          >
            {isGettingGps ? (
              <Loader2 className="size-3 animate-spin text-[#1051A6]" />
            ) : (
              <LocateFixed className="size-3 text-[#1051A6]" />
            )}
            <span>{isGettingGps ? "Đang định vị..." : "Lấy GPS hiện tại"}</span>
          </Button>
        </div>

        {selectedCoords ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2 text-xs border border-slate-200">
              <div>
                <span className="text-[11px] text-slate-500 block">Vĩ độ (Lat)</span>
                <span className="font-mono tabular-nums font-semibold text-slate-800">
                  {selectedCoords.latitude.toFixed(6)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Kinh độ (Lon)</span>
                <span className="font-mono tabular-nums font-semibold text-slate-800">
                  {selectedCoords.longitude.toFixed(6)}
                </span>
              </div>
            </div>

            {isInsideZone ? (
              <div className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  Thuộc vùng quản lý: {zoneName || "Vùng Đô thị Trung tâm Đà Nẵng"}
                </span>
              </div>
            ) : (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertTriangle className="size-3.5" />
                <AlertTitle className="text-xs font-semibold">
                  Ngoài phạm vi thử nghiệm
                </AlertTitle>
                <AlertDescription className="text-[11px] leading-relaxed">
                  {zoneMessage ||
                    "Vị trí bạn chọn nằm ngoài Vùng Đô thị Trung tâm Đà Nẵng. Không thể gửi phản ánh."}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-600 font-medium">
              Chưa chọn vị trí hiện trường
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chạm trực tiếp vào bản đồ bên phải hoặc bấm nút &quot;Lấy GPS hiện tại&quot; để định vị.
            </p>
          </div>
        )}
      </section>

      {/* KHỐI 2: CẢNH BÁO TRÙNG LẶP 50M (SPATIAL DEDUPLICATION) */}
      {nearbyIncidents.length > 0 && (
        <section className="space-y-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 shadow-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-900">
                Phát hiện {nearbyIncidents.length} sự cố trong bán kính 50m quanh vị trí này
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Có thể sự cố đã được người khác thông báo. Bấm xác nhận trùng lặp để ưu tiên xử lý mà không cần gửi thêm phiếu mới:
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
            {nearbyIncidents.map((item) => {
              const isVotingThis = votingIncidentId === item.id;
              const hasVotedThis = votedIncidentIds.has(item.id);

              return (
                <Card
                  key={item.id}
                  className="gap-2 p-2.5 bg-white border-amber-200 shadow-none text-xs"
                >
                  <CardContent className="p-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {item.ticket_code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums text-[11px] text-slate-500">
                          ~{Math.round(item.distance_meters)}m
                        </span>
                        {renderIncidentStatusBadge(item.status)}
                      </div>
                    </div>

                    <p className="text-xs font-medium text-slate-700 line-clamp-1">
                      {item.title}
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isVotingThis || hasVotedThis}
                      onClick={() => handleVoteDuplicate(item)}
                      className={cn(
                        "w-full h-7 text-[11px] font-medium transition-colors",
                        hasVotedThis
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-blue-200 text-[#1051A6] hover:bg-blue-50"
                      )}
                    >
                      {isVotingThis ? (
                        <>
                          <Loader2 className="size-3 animate-spin mr-1.5" />
                          Đang ghi nhận...
                        </>
                      ) : hasVotedThis ? (
                        <>
                          <CheckCircle2 className="size-3 text-emerald-600 mr-1.5" />
                          Đã xác nhận trùng lặp
                        </>
                      ) : (
                        "Tôi cũng gặp sự cố này (Xác nhận trùng lặp)"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* KHỐI 3: THÔNG TIN SỰ CỐ HIỆN TRƯỜNG */}
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <FileText className="size-3.5 text-[#1051A6]" />
          <span>NỘI DUNG PHẢN ÁNH</span>
        </div>

        {/* Danh mục sự cố */}
        <div className="space-y-1">
          <Label htmlFor="category-select" className="text-xs font-medium text-slate-700">
            Danh mục sự cố <span className="text-rose-500 font-bold">*</span>
          </Label>

          {isLoadingCategories ? (
            <Skeleton className="h-9 w-full" />
          ) : categoriesError ? (
            <div className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              <span>{categoriesError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[11px] px-2"
                onClick={() => void reloadCategories()}
              >
                Tải lại
              </Button>
            </div>
          ) : (
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category-select" className="w-full h-9 text-xs">
                <SelectValue placeholder="-- Chọn danh mục sự cố đô thị --" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((cat) => cat.is_active)
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                      <span>{cat.name}</span>
                      <span className="font-mono tabular-nums text-slate-500 text-[11px] ml-1">
                        (SLA {cat.default_sla_hours}h)
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tiêu đề */}
        <div className="space-y-1">
          <Label htmlFor="incident-title" className="text-xs font-medium text-slate-700">
            Tiêu đề phản ánh <span className="text-rose-500 font-bold">*</span>
          </Label>
          <Input
            id="incident-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Nắp cống hỏng, Cây gãy chắn đường..."
            maxLength={255}
            className="h-9 text-xs"
          />
        </div>

        {/* Mô tả chi tiết */}
        <div className="space-y-1">
          <Label htmlFor="incident-desc" className="text-xs font-medium text-slate-700">
            Mô tả chi tiết <span className="text-rose-500 font-bold">*</span>
          </Label>
          <Textarea
            id="incident-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả cụ thể hiện trạng, kích thước hư hỏng, mức độ gây cản trở giao thông hoặc nguy hiểm..."
            rows={3}
            className="text-xs resize-none"
          />
        </div>

        {/* Địa chỉ cụ thể */}
        <div className="space-y-1">
          <Label htmlFor="incident-address" className="text-xs font-medium text-slate-700">
            Địa chỉ cụ thể <span className="text-rose-500 font-bold">*</span>
          </Label>
          <Input
            id="incident-address"
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            placeholder="Ví dụ: Số 123 đường Bạch Đằng, P. Hải Châu 1, Q. Hải Châu"
            maxLength={500}
            className="h-9 text-xs"
          />
        </div>

        {/* Thông tin liên hệ */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="incident-contact" className="text-xs font-medium text-slate-700">
              Số điện thoại / Email liên hệ
            </Label>
            <span className="text-[11px] text-slate-400">Không bắt buộc</span>
          </div>
          <div className="relative">
            <Phone className="size-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <Input
              id="incident-contact"
              value={citizenContact}
              onChange={(e) => setCitizenContact(e.target.value)}
              placeholder="0905... (để nhận tin nhắn kết quả xử lý)"
              className="h-9 text-xs pl-8"
              maxLength={255}
            />
          </div>
        </div>
      </section>

      {/* KHỐI 4: ĐÍNH KÈM ẢNH HIỆN TRƯỜNG & CAM KẾT BẢO VỆ DỮ LIỆU */}
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <ImageIcon className="size-3.5 text-[#1051A6]" />
            <span>ẢNH CHỤP HIỆN TRƯỜNG</span>
            <span className="text-rose-500 font-bold">*</span>
          </Label>
          <span className="text-[11px] text-slate-400">Tối đa 10MB</span>
        </div>

        {/* Tệp input ẩn để kích hoạt qua nút hoặc khung kéo thả */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageChange}
          className="hidden"
        />

        {imagePreviewUrl ? (
          <div className="space-y-2">
            <div className="relative rounded-md border border-slate-200 overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Ảnh hiện trường sự cố"
                className="w-full max-h-48 object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 shadow-xs"
                title="Xóa ảnh"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
              <span className="truncate max-w-[200px]">{imageFile?.name}</span>
              <span>
                {imageFile ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB` : ""}
              </span>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
            className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-4 cursor-pointer hover:bg-slate-100/70 transition-colors text-center"
          >
            <Camera className="size-6 text-slate-400 mb-1" />
            <p className="text-xs font-medium text-slate-700">
              Chụp ảnh hoặc Chọn ảnh hiện trường
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Hỗ trợ định dạng JPG, PNG, WEBP (Tối đa 10MB)
            </p>
          </div>
        )}

        {/* Thông báo quyền riêng tư chuẩn Nghị định 13/2023/NĐ-CP */}
        <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
          <ShieldCheck className="size-4 text-[#1051A6] shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="text-slate-800 font-semibold">Bảo vệ dữ liệu cá nhân:</strong>{" "}
            Hệ thống ứng dụng công nghệ AI tự động nhận diện và làm mờ khuôn mặt, biển số xe theo Nghị định 13/2023/NĐ-CP trước khi công khai thông tin.
          </p>
        </div>
      </section>

      {/* THÔNG BÁO LỖI NẾU CÓ */}
      {submitError && (
        <Alert variant="destructive" className="py-2.5 text-xs">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-xs font-semibold">Lỗi gửi phản ánh</AlertTitle>
          <AlertDescription className="text-xs">{submitError}</AlertDescription>
        </Alert>
      )}

      {/* KHỐI 5: NÚT GỬI PHẢN ÁNH */}
      <div className="pt-1">
        <Button
          type="submit"
          disabled={isFormBlockedByLocation || isSubmitting}
          className="w-full bg-[#1051A6] hover:bg-[#0d4287] text-white font-medium h-10 shadow-xs transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang tiếp nhận và phân tích AI...
            </>
          ) : (
            "Gửi phản ánh sự cố hiện trường"
          )}
        </Button>

        {isFormBlockedByLocation && (
          <p className="text-[11px] text-center text-slate-500 mt-1.5">
            {!selectedCoords
              ? "Vui lòng chọn vị trí trên bản đồ để kích hoạt gửi phản ánh"
              : "Vị trí nằm ngoài Đà Nẵng thử nghiệm. Vui lòng chọn lại điểm hiện trường."}
          </p>
        )}
      </div>
    </form>
  );
}

export default ReportForm;
