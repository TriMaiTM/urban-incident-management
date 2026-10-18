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
 * Lấy danh sách các phân vùng đô thị đang kích hoạt kèm GeoJSON ranh giới.
 * Endpoint: GET /zones/active
 */
export async function getActiveZones(): Promise<SystemZoneOut[]> {
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

  return response.json();
}

/**
 * Thẩm định tọa độ (WGS84 lat, lon) theo hàng rào địa lý vùng lõi Đà Nẵng.
 * Endpoint: POST /zones/validate-location
 */
export async function validateLocation(
  latitude: number,
  longitude: number
): Promise<LocationValidateOut> {
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

  return response.json();
}

/**
 * Tìm kiếm các sự cố lân cận trong bán kính (mặc định 50m) để phát hiện trùng lặp.
 * Endpoint: GET /incidents/nearby?latitude=...&longitude=...&radius=...
 */
export async function getNearbyIncidents(
  latitude: number,
  longitude: number,
  radius = 50
): Promise<IncidentNearbyOut> {
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

  return response.json();
}

/**
 * Lấy toàn bộ danh mục sự cố đô thị từ hệ thống.
 * Endpoint: GET /categories/
 */
export async function getCategories(): Promise<CategoryOut[]> {
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
}

/**
 * Gửi phản ánh hiện trường sự cố mới (kèm ảnh hiện trường để làm mờ và phân loại AI).
 * Endpoint: POST /incidents/ (multipart/form-data)
 */
export async function createIncident(formData: FormData): Promise<IncidentCreateResponse> {
  const url = `${API_BASE_URL}/incidents/`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      // Không đặt Content-Type thủ công để browser tự thêm boundary multipart/form-data
    },
    body: formData,
  });

  if (!response.ok) {
    await handleResponseError(response);
  }

  return response.json();
}

/**
 * Xác nhận sự cố trùng lặp tại hiện trường ("Tôi cũng gặp sự cố này").
 * Endpoint: POST /incidents/{incidentId}/vote-duplicate
 */
export async function voteDuplicate(
  incidentId: string
): Promise<IncidentVoteDuplicateOut> {
  const url = `${API_BASE_URL}/incidents/${encodeURIComponent(incidentId)}/vote-duplicate`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

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
};

export default api;
