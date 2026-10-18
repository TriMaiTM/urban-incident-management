/**
 * API client helper for Da Nang Urban Incident Management Platform.
 * Communicates with FastAPI backend at /api/v1/*.
 */

import type {
  CategoryOut,
  IncidentCreateResponse,
  IncidentNearbyOut,
  IncidentVoteDuplicateOut,
} from "@/types/incident";
import type {
  LocationValidateOut,
  SystemZoneOut,
} from "@/types/zone";
import danangCoreBoundary from "@/data/danang_core_boundary.json";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:8000/api/v1";

interface FastApiValidationErrorItem {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

interface ErrorResponseBody {
  detail?: string | FastApiValidationErrorItem[];
  message?: string;
}

/**
 * Helper to handle HTTP errors and extract meaningful error messages.
 */
async function handleResponseError(response: Response): Promise<never> {
  let errorMessage = `Yêu cầu thất bại (${response.status}: ${response.statusText})`;

  try {
    const errorData: ErrorResponseBody = await response.json();
    if (typeof errorData?.detail === "string" && errorData.detail.trim().length > 0) {
      errorMessage = errorData.detail;
    } else if (Array.isArray(errorData?.detail) && errorData.detail.length > 0) {
      errorMessage = errorData.detail
        .map((item) => item.msg || JSON.stringify(item))
        .join("; ");
    } else if (typeof errorData?.message === "string" && errorData.message.trim().length > 0) {
      errorMessage = errorData.message;
    }
  } catch {
    // Response body is not JSON, retain default status message
  }

  throw new Error(errorMessage);
}

/**
 * Tọa độ ranh giới vùng đô thị lõi Đà Nẵng trích xuất từ dữ liệu hành chính chuẩn 2025.
 * Thứ tự WGS84 chuẩn GeoJSON: [longitude, latitude].
 */
export const DANANG_CORE_POLYGON_COORDINATES: [number, number][][][] =
  danangCoreBoundary.features[0].geometry.coordinates as [number, number][][][];

export const FALLBACK_DANANG_ZONES: SystemZoneOut[] = [
  {
    id: "DANANG_CORE",
    name: "Vùng Đô thị Trung tâm Đà Nẵng",
    is_active: true,
    bounding_box: [107.8167, 15.9180, 108.3384, 16.2155],
    description:
      "Khu vực đô thị lõi gồm 6 quận: Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Cẩm Lệ, Liên Chiểu và huyện Hòa Vang",
    geojson_geometry: {
      type: danangCoreBoundary.features[0].geometry.type,
      coordinates: DANANG_CORE_POLYGON_COORDINATES,
    },
  },
];

export const FALLBACK_CATEGORIES: CategoryOut[] = [
  {
    id: "cat-road",
    code: "ROAD_DAMAGE",
    name: "Hư hỏng mặt đường, ổ gà",
    description: "Hư hỏng kết cấu đường bộ, sụt lún, ổ gà",
    default_priority: "NORMAL",
    default_sla_hours: 24,
    is_active: true,
  },
  {
    id: "cat-flood",
    code: "FLOODING",
    name: "Ngập úng đô thị",
    description: "Ngập úng cục bộ, tắc cống thoát nước",
    default_priority: "HIGH",
    default_sla_hours: 12,
    is_active: true,
  },
  {
    id: "cat-tree",
    code: "FALLEN_TREE",
    name: "Cây xanh gãy đổ",
    description: "Cây xanh ngã đổ, cành cây có nguy cơ gãy gây nguy hiểm",
    default_priority: "HIGH",
    default_sla_hours: 8,
    is_active: true,
  },
  {
    id: "cat-garbage",
    code: "GARBAGE",
    name: "Rác thải, ô nhiễm môi trường",
    description: "Tập kết rác sai quy định, ô nhiễm môi trường",
    default_priority: "LOW",
    default_sla_hours: 48,
    is_active: true,
  },
  {
    id: "cat-light",
    code: "STREETLIGHT",
    name: "Chiếu sáng công cộng, mất điện",
    description: "Đèn đường hư hỏng, sự cố chiếu sáng đô thị",
    default_priority: "NORMAL",
    default_sla_hours: 24,
    is_active: true,
  },
  {
    id: "cat-other",
    code: "OTHER",
    name: "Sự cố đô thị khác",
    description: "Các vấn đề trật tự và mỹ quan đô thị khác",
    default_priority: "NORMAL",
    default_sla_hours: 72,
    is_active: true,
  },
];

/**
 * Thẩm định nhanh vị trí (WGS84 lat, lon) có nằm trong vùng lõi Đà Nẵng hay không
 * bằng thuật toán Ray-casting (Point-in-Polygon).
 */
export function isInsideDanangCore(latitude: number, longitude: number): boolean {
  const [minLon, minLat, maxLon, maxLat] = [107.8167, 15.9180, 108.3384, 16.2155];

  // 1. Kiểm tra nhanh Bounding Box [107.8167, 15.9180, 108.3384, 16.2155]
  if (
    longitude < minLon ||
    longitude > maxLon ||
    latitude < minLat ||
    latitude > maxLat
  ) {
    return false;
  }

  // 2. Thuật toán Ray-casting với polygon ring Đà Nẵng
  const ring = DANANG_CORE_POLYGON_COORDINATES[0][0];
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Lấy danh sách các phân vùng đô thị đang kích hoạt kèm GeoJSON ranh giới.
 * Endpoint: GET /zones/active
 * Tự động fallback sang FALLBACK_DANANG_ZONES khi backend ngoại tuyến.
 */
export async function getActiveZones(): Promise<SystemZoneOut[]> {
  try {
    const url = `${API_BASE_URL}/zones/active`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error: unknown) {
    console.warn(
      "Backend API ngoại tuyến - sử dụng danh sách phân vùng Đà Nẵng ngoại tuyến",
      error
    );
    return FALLBACK_DANANG_ZONES;
  }
}

/**
 * Thẩm định tọa độ (WGS84 lat, lon) theo hàng rào địa lý vùng lõi Đà Nẵng.
 * Endpoint: POST /zones/validate-location
 * Tự động fallback tính toán bằng isInsideDanangCore khi backend ngoại tuyến.
 */
export async function validateLocation(
  latitude: number,
  longitude: number
): Promise<LocationValidateOut> {
  try {
    const url = `${API_BASE_URL}/zones/validate-location`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error: unknown) {
    console.warn("Backend API ngoại tuyến - kiểm tra hàng rào địa lý nội bộ", error);
    const inside = isInsideDanangCore(latitude, longitude);
    return {
      is_inside: inside,
      zone_id: inside ? "DANANG_CORE" : null,
      zone_name: inside ? "Vùng Đô thị Trung tâm Đà Nẵng (Demo)" : null,
      message: inside
        ? "Tọa độ hợp lệ trong khu vực đô thị lõi TP. Đà Nẵng (Chế độ mô phỏng)"
        : "Tọa độ nằm ngoài phạm vi đô thị lõi TP. Đà Nẵng (Chế độ mô phỏng)",
    };
  }
}

/**
 * Tìm kiếm các sự cố lân cận trong bán kính (mặc định 50m) để phát hiện trùng lặp.
 * Endpoint: GET /incidents/nearby?latitude=...&longitude=...&radius=...
 * Tự động fallback trả về danh sách rỗng khi backend ngoại tuyến.
 */
export async function getNearbyIncidents(
  latitude: number,
  longitude: number,
  radius = 50
): Promise<IncidentNearbyOut> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
    });

    const url = `${API_BASE_URL}/incidents/nearby?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error: unknown) {
    console.warn(
      "Backend API ngoại tuyến - không thể tải danh sách sự cố lân cận",
      error
    );
    return { count: 0, items: [] };
  }
}

/**
 * Lấy toàn bộ danh mục sự cố đô thị từ hệ thống.
 * Endpoint: GET /categories/
 * Tự động fallback sang FALLBACK_CATEGORIES khi backend ngoại tuyến.
 */
export async function getCategories(): Promise<CategoryOut[]> {
  try {
    const url = `${API_BASE_URL}/categories/`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    interface RawCategoryItem {
      id: string;
      code: string;
      name: string;
      default_sla_hours?: number;
      default_department_id?: string | null;
      description?: string | null;
      default_priority?: string;
      is_active?: boolean;
    }

    const rawList: RawCategoryItem[] = await response.json();

    return rawList.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description ?? null,
      default_priority: item.default_priority ?? "NORMAL",
      default_sla_hours: item.default_sla_hours ?? 24,
      is_active: item.is_active ?? true,
      ...(item.default_department_id ? { default_department_id: item.default_department_id } : {}),
    }));
  } catch (error: unknown) {
    console.warn("Backend API ngoại tuyến - sử dụng danh mục mẫu ngoại tuyến", error);
    return FALLBACK_CATEGORIES;
  }
}

/**
 * Gửi phản ánh hiện trường sự cố mới (kèm ảnh hiện trường để làm mờ và phân loại AI).
 * Endpoint: POST /incidents/ (multipart/form-data)
 * Tự động fallback tạo phản ánh demo khi backend ngoại tuyến.
 */
export async function createIncident(formData: FormData): Promise<IncidentCreateResponse> {
  let response: Response;
  try {
    const url = `${API_BASE_URL}/incidents/`;
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        // Không đặt Content-Type thủ công để browser tự thêm boundary multipart/form-data
      },
      body: formData,
    });
  } catch (networkError: unknown) {
    console.warn("Backend API ngoại tuyến - tạo phản ánh ở chế độ mô phỏng", networkError);
    const titleVal = formData.get("title");
    const title = typeof titleVal === "string" && titleVal.trim() ? titleVal : "Sự cố phản ánh";

    return {
      id: "demo-" + Date.now(),
      ticket_code:
        "DN-" +
        new Date().toISOString().slice(0, 7).replace("-", "") +
        "-DEMO" +
        Math.floor(1000 + Math.random() * 9000),
      title,
      status: "SUBMITTED",
      priority: "NORMAL",
      duplicate_count: 1,
      sla_due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      message: "Phản ánh đã được ghi nhận ở chế độ mô phỏng (Backend đang ngoại tuyến).",
    };
  }

  if (!response.ok) {
    await handleResponseError(response);
  }

  return await response.json();
}

/**
 * Xác nhận sự cố trùng lặp tại hiện trường ("Tôi cũng gặp sự cố này").
 * Endpoint: POST /incidents/{incidentId}/vote-duplicate
 * Tự động fallback sang phản hồi mẫu khi backend ngoại tuyến.
 */
export async function voteDuplicate(
  incidentId: string
): Promise<IncidentVoteDuplicateOut> {
  let response: Response;
  try {
    const url = `${API_BASE_URL}/incidents/${encodeURIComponent(incidentId)}/vote-duplicate`;
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });
  } catch (networkError: unknown) {
    console.warn("Backend API ngoại tuyến - xác nhận trùng lặp ở chế độ mô phỏng", networkError);
    return {
      incident_id: incidentId,
      ticket_code: "DN-DEMO",
      previous_count: 1,
      new_count: 2,
      message: "Đã xác nhận trùng lặp thành công (Chế độ mô phỏng)",
    };
  }

  if (!response.ok) {
    await handleResponseError(response);
  }

  interface RawVoteDuplicateResponse {
    incident_id: string;
    ticket_code: string;
    duplicate_count?: number;
    previous_count?: number;
    new_count?: number;
    message: string;
  }

  const raw: RawVoteDuplicateResponse = await response.json();
  const currentCount = raw.new_count ?? raw.duplicate_count ?? 1;
  const prevCount =
    raw.previous_count ?? (raw.duplicate_count !== undefined ? Math.max(0, raw.duplicate_count - 1) : 0);

  return {
    incident_id: raw.incident_id,
    ticket_code: raw.ticket_code,
    duplicate_count: currentCount,
    previous_count: prevCount,
    new_count: currentCount,
    message: raw.message,
  };
}

export const api = {
  getActiveZones,
  validateLocation,
  getNearbyIncidents,
  getCategories,
  createIncident,
  voteDuplicate,
  isInsideDanangCore,
  FALLBACK_DANANG_ZONES,
  FALLBACK_CATEGORIES,
};

export default api;
