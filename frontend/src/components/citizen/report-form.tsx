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
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  LocateFixed,
  MapPin,
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
 * - SUBMITTED / TRIAGED: blue
 * - ASSIGNED / IN_PROGRESS: amber
 * - RESOLVED / CONFIRMED / CLOSED: emerald
 */
function renderIncidentStatusBadge(status: string) {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case "SUBMITTED":
    case "TRIAGED":
    case "NEW":
      return (
        <Badge
          variant="outline"
          className="rounded-full border-blue-300 bg-blue-50 text-blue-700 font-mono text-[11px]"
        >
          Đã gửi
        </Badge>
      );
    case "ASSIGNED":
    case "IN_PROGRESS":
      return (
        <Badge
          variant="outline"
          className="rounded-full border-amber-300 bg-amber-50 text-amber-800 font-mono text-[11px]"
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
          className="rounded-full border-emerald-300 bg-emerald-50 text-emerald-700 font-mono text-[11px]"
        >
          Đã xử lý
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="rounded-full border-slate-200 bg-slate-50 text-slate-600 font-mono text-[11px]"
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

  // Nạp danh mục từ Backend (hoặc fallback) khi người dùng bấm Tải lại
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

  // Nạp danh mục khi component mount
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

  const isFormBlockedByLocation = !selectedCoords || isInsideZone === false;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("p-4 space-y-3.5 text-slate-900", className)}
    >
      {/* 1. KHỐI VỊ TRÍ HIỆN TRƯỜNG */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-slate-700">
            Vị trí hiện trường <span className="text-rose-500 font-bold">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetGpsLocation}
            disabled={isGettingGps}
            className="h-7 text-xs gap-1.5 rounded-md px-2.5 border-slate-200 text-slate-700 hover:text-[#1051A6]"
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
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2 font-mono tabular-nums text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-sans">
                Tọa độ WGS84:
              </span>
              <span className="text-slate-800 font-medium">
                Lat: {selectedCoords.latitude.toFixed(6)}, Lon:{" "}
                {selectedCoords.longitude.toFixed(6)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-500 text-[11px] font-sans">
                Phân vùng kiểm soát:
              </span>
              {isInsideZone !== false ? (
                <Badge
                  variant="outline"
                  className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-sans font-medium"
                >
                  <CheckCircle2 className="size-3 mr-1" />
                  {zoneName || "Khu vực đô thị lõi Đà Nẵng"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="rounded-full bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-sans font-medium"
                >
                  <AlertCircle className="size-3 mr-1" />
                  Ngoài phạm vi hỗ trợ
                </Badge>
              )}
            </div>
            {isInsideZone === false && zoneMessage && (
              <p className="text-[11px] font-sans text-rose-600 mt-1 leading-normal">
                {zoneMessage}
              </p>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500 flex items-center gap-1.5 py-1">
            <MapPin className="size-3.5 text-slate-400 shrink-0" />
            <span>Chạm vào bản đồ hoặc bấm GPS để chọn vị trí</span>
          </div>
        )}
      </div>

      {/* 2. CẢNH BÁO TRÙNG LẶP 50M (SPATIAL DEDUPLICATION) */}
      {nearbyIncidents.length > 0 && (
        <Alert className="border-amber-200/80 bg-amber-50/60 text-amber-950 p-2.5 rounded-lg space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
            <AlertTitle className="text-xs font-semibold text-amber-900 m-0">
              Phát hiện sự cố lân cận ({nearbyIncidents.length} phiếu trong bán kính 50m)
            </AlertTitle>
          </div>
          <AlertDescription className="text-xs space-y-2 w-full pt-1">
            <p className="text-amber-900/90 text-[11px] leading-relaxed">
              Bạn có thể bấm xác nhận trùng lặp để tăng mức ưu tiên xử lý:
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-0.5 w-full">
              {nearbyIncidents.map((item) => {
                const isVotingThis = votingIncidentId === item.id;
                const hasVotedThis = votedIncidentIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className="rounded-md border border-amber-200/80 bg-white p-2.5 text-xs space-y-1.5 shadow-none w-full"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono tabular-nums font-semibold text-[#1051A6]">
                        {item.ticket_code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums text-[11px] text-slate-500">
                          ~{Math.round(item.distance_meters)}m
                        </span>
                        {renderIncidentStatusBadge(item.status)}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 line-clamp-1 font-medium">
                      {item.title}
                    </p>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isVotingThis || hasVotedThis}
                      onClick={() => handleVoteDuplicate(item)}
                      className={cn(
                        "w-full h-7 text-xs border-amber-300 bg-amber-50/60 hover:bg-amber-100 text-amber-900 rounded-md transition-colors",
                        hasVotedThis &&
                          "border-emerald-300 bg-emerald-50 text-emerald-700"
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
                          Đã xác nhận trùng lặp (+1)
                        </>
                      ) : (
                        "Tôi cũng gặp sự cố này (+1)"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 3. CÁC TRƯỜNG THÔNG TIN SỰ CỐ */}
      {/* Danh mục sự cố */}
      <div className="space-y-1">
        <Label
          htmlFor="category-select"
          className="text-xs font-medium text-slate-700"
        >
          Danh mục sự cố <span className="text-rose-500 font-bold">*</span>
        </Label>

        {isLoadingCategories ? (
          <Skeleton className="h-9 w-full rounded-md" />
        ) : categoriesError ? (
          <div className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
            <span>{categoriesError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-2 rounded-md"
              onClick={() => void reloadCategories()}
            >
              Tải lại
            </Button>
          </div>
        ) : (
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger
              id="category-select"
              className="w-full h-9 text-xs rounded-md border-slate-200 bg-white"
            >
              <SelectValue placeholder="Chọn danh mục sự cố đô thị" />
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
        <Label
          htmlFor="incident-title"
          className="text-xs font-medium text-slate-700"
        >
          Tiêu đề phản ánh <span className="text-rose-500 font-bold">*</span>
        </Label>
        <Input
          id="incident-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Cây xanh ngã đổ chắn đường, mặt đường sụt lún..."
          maxLength={255}
          className="h-9 text-xs rounded-md border-slate-200 bg-white"
        />
      </div>

      {/* Mô tả chi tiết */}
      <div className="space-y-1">
        <Label
          htmlFor="incident-desc"
          className="text-xs font-medium text-slate-700"
        >
          Mô tả chi tiết hiện trường <span className="text-rose-500 font-bold">*</span>
        </Label>
        <Textarea
          id="incident-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả mức độ nghiêm trọng, vật cản hoặc nguy cơ mất an toàn..."
          rows={3}
          className="text-xs min-h-[72px] rounded-md resize-none border-slate-200 bg-white"
        />
      </div>

      {/* Địa chỉ cụ thể */}
      <div className="space-y-1">
        <Label
          htmlFor="incident-address"
          className="text-xs font-medium text-slate-700"
        >
          Địa chỉ hiện trường <span className="text-rose-500 font-bold">*</span>
        </Label>
        <Input
          id="incident-address"
          value={addressText}
          onChange={(e) => setAddressText(e.target.value)}
          placeholder="Số nhà, tên đường, phường..."
          maxLength={500}
          className="h-9 text-xs rounded-md border-slate-200 bg-white"
        />
      </div>

      {/* Thông tin liên hệ */}
      <div className="space-y-1">
        <Label
          htmlFor="incident-contact"
          className="text-xs font-medium text-slate-700"
        >
          Thông tin liên hệ{" "}
          <span className="text-xs text-slate-400 font-normal">(tùy chọn)</span>
        </Label>
        <Input
          id="incident-contact"
          value={citizenContact}
          onChange={(e) => setCitizenContact(e.target.value)}
          placeholder="Số điện thoại hoặc email để nhận kết quả xử lý"
          maxLength={255}
          className="h-9 text-xs rounded-md border-slate-200 bg-white"
        />
      </div>

      {/* 4. ĐÍNH KÈM ẢNH HIỆN TRƯỜNG & CAM KẾT NĐ 13/2023 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-slate-700">
            Ảnh chụp hiện trường <span className="text-rose-500 font-bold">*</span>
          </Label>
          <span className="text-[11px] text-slate-400">Tối đa 10MB</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageChange}
          className="hidden"
        />

        {imagePreviewUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 bg-slate-50/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreviewUrl}
              alt="Ảnh hiện trường"
              className="h-20 w-auto object-cover rounded-md border border-slate-200"
            />
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs font-medium text-slate-800 truncate">
                {imageFile?.name}
              </p>
              <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                {imageFile
                  ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB`
                  : ""}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleRemoveImage}
              className="h-7 w-7 rounded-full text-slate-400 hover:text-rose-600 shrink-0"
              title="Xóa ảnh"
            >
              <Trash2 className="size-4" />
            </Button>
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
            className="border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/70 rounded-lg p-2.5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1"
          >
            <Camera className="size-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">
              Chụp ảnh hoặc chọn tệp từ thiết bị
            </span>
            <span className="text-[10px] text-slate-400">
              Hỗ trợ định dạng JPG, PNG (tối đa 10MB)
            </span>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1.5">
          <ShieldCheck className="size-3.5 text-[#1051A6] shrink-0" />
          <span>
            Hệ thống tự động làm mờ khuôn mặt, biển số xe theo Nghị định
            13/2023/NĐ-CP.
          </span>
        </p>
      </div>

      {/* 5. KHỐI THAO TÁC SUBMIT */}
      <div className="pt-2 space-y-2">
        {submitError && (
          <Alert variant="destructive" className="py-2 text-xs w-full">
            <AlertCircle className="size-4" />
            <AlertTitle className="text-xs font-semibold">
              Lỗi gửi phản ánh
            </AlertTitle>
            <AlertDescription className="text-xs">{submitError}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || isFormBlockedByLocation}
          className="w-full h-9 bg-[#1051A6] hover:bg-[#0d4287] text-white text-xs font-medium rounded-md shadow-xs transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Đang gửi phản ánh...
            </>
          ) : (
            "Gửi phản ánh sự cố hiện trường"
          )}
        </Button>

        {isFormBlockedByLocation && (
          <p className="text-[11px] text-center text-slate-500">
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
