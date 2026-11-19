'use client'

/**
 * Strict TypeScript client for Da Nang Urban Incident Management FastAPI Backend.
 * Matches docs/openapi.json without using `any`.
 */

export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
    : '') || 'http://localhost:8000'

const TOKEN_KEY = 'urbana.token'
const USER_KEY = 'urbana.user'

export interface ApiUserOut {
  id: string
  email: string | null
  phone: string | null
  full_name: string
  auth_provider: string
  role: 'CITIZEN' | 'DISPATCHER' | 'TECHNICIAN' | 'ADMIN'
  department_id: string | null
  avatar_url: string | null
  is_locked: boolean
  created_at: string
}

export interface ApiTokenOut {
  access_token: string
  token_type: string
  expires_in_seconds: number
  user: ApiUserOut
}

export interface ApiCategoryOut {
  id: string
  code: string
  name: string
  default_sla_hours: number
  default_department_id: string | null
  is_active: boolean
}

export interface ApiDepartmentOut {
  id: string
  code: string
  name: string
  level: string
  contact_email: string | null
  contact_phone: string | null
}

export interface ApiMediaOut {
  id: string
  incident_id: string
  media_type: 'BEFORE_ORIGINAL' | 'BEFORE_ANONYMIZED' | 'AFTER_PROOF' | string
  file_url: string
  latitude: number | null
  longitude: number | null
  created_at: string
}

export interface ApiHistoryOut {
  id: string
  incident_id: string
  actor_id: string | null
  from_status: string | null
  to_status: string
  note: string | null
  created_at: string
}

export interface ApiFeedbackOut {
  id: string
  incident_id: string
  citizen_id: string
  rating: number | null
  comment: string | null
  created_at: string
}

export interface ApiIncidentOut {
  id: string
  ticket_code: string
  title: string
  description: string
  status:
    | 'SUBMITTED'
    | 'TRIAGED'
    | 'ASSIGNED'
    | 'IN_PROGRESS'
    | 'RESOLVED'
    | 'CONFIRMED'
    | 'CLOSED'
    | 'REJECTED'
    | 'REOPENED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY'
  is_priority_suggested: boolean
  channel: string
  address_text: string
  district: string | null
  ward: string | null
  latitude: number
  longitude: number
  anonymized_image_url: string | null
  category_code: string | null
  assigned_department_code: string | null
  duplicate_count: number
  rejection_reason: string | null
  sla_due_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string | null
}

export interface ApiIncidentDetailOut extends ApiIncidentOut {
  citizen_id: string | null
  citizen_contact: string | null
  assigned_technician_id: string | null
  assigned_technician_name: string | null
  is_duplicate_of_id: string | null
  category: ApiCategoryOut | null
  assigned_department: ApiDepartmentOut | null
  media: ApiMediaOut[]
  history: ApiHistoryOut[]
  feedback: ApiFeedbackOut | null
  ai_classification_raw: Record<string, unknown> | null
  ai_confidence: number | null
}

export interface ApiIncidentListOut {
  total: number
  items: ApiIncidentOut[]
  page: number
  page_size: number
}

export interface ApiAnalyzeImageOut {
  category_code: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY'
  suggested_department_code: string
  summary_vi: string
  hazard_warning: string | null
  confidence: number
  sla_hours: number
  is_blurred: boolean
  faces_detected: number
  plates_detected: number
}

export interface ApiNearbyItem {
  id: string
  ticket_code: string
  title: string
  status: string
  priority: string
  category_code: string | null
  distance_meters: number
  latitude: number
  longitude: number
  created_at: string
  image_url: string | null
}

export interface ApiNearbyOut {
  count: number
  items: ApiNearbyItem[]
}

export interface ApiLocationValidateOut {
  is_inside: boolean
  zone_id: string | null
  zone_name: string | null
  message: string
}

export interface ApiZoneOut {
  id: string
  name: string
  is_active: boolean
  open_incident_count: number
  bounding_box: {
    min_lon?: number
    min_lat?: number
    max_lon?: number
    max_lat?: number
  } | null
  description: string | null
  geojson_geometry: {
    type: string
    coordinates: number[][][] | number[][][][]
  } | null
}

export interface ApiAnalyticsSummaryOut {
  total_incidents: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
  by_district: Record<string, number>
  sla_compliance: {
    within_sla?: number
    breached_sla?: number
    compliance_rate?: number
  }
  avg_resolution_time_minutes: number
  avg_satisfaction_rating: number
  satisfaction_score: number
  completion_rate_by_district: Record<string, number>
}

export interface ApiUserListOut {
  total: number
  items: ApiUserOut[]
  page: number
  page_size: number
}

export interface ApiAuditLogItemOut {
  id: string
  incident_id: string
  ticket_code: string
  actor_id: string | null
  actor_name: string | null
  actor_role: string | null
  from_status: string | null
  to_status: string
  note: string | null
  created_at: string
}

export interface ApiAuditLogListOut {
  total: number
  items: ApiAuditLogItemOut[]
  page: number
  page_size: number
}

export interface ApiOpen311ServiceOut {
  service_code: string
  service_name: string
  description: string
  metadata: boolean
  type: string
  keywords: string
  group: string
}

export interface ApiOpen311RequestItemOut {
  service_request_id: string
  status: 'open' | 'closed'
  status_notes: string | null
  service_name: string
  service_code: string
  description: string
  agency_responsible: string | null
  service_notice: string | null
  requested_datetime: string
  updated_datetime: string | null
  expected_datetime: string | null
  address: string
  lat: number
  long: number
  media_url: string | null
}

export const AUTH_CHANGE_EVENT = 'urbana-auth-changed'

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthSession(token: string, user: ApiUserOut): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem('urbana.role', user.role.toLowerCase())
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem('urbana.role')
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function getStoredUser(): ApiUserOut | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as ApiUserOut) : null
  } catch {
    return null
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const errBody = (await res.json()) as { detail?: unknown }
      if (typeof errBody.detail === 'string') {
        detail = errBody.detail
      }
    } catch {
      // ignore non-json error body
    }
    throw new Error(detail)
  }
  return (await res.json()) as T
}

export const ROLE_DEMO_EMAILS: Record<'CITIZEN' | 'DISPATCHER' | 'TECHNICIAN' | 'ADMIN', string> = {
  CITIZEN: 'citizen@danang.gov.vn',
  DISPATCHER: 'dispatcher@danang.gov.vn',
  TECHNICIAN: 'technician@danang.gov.vn',
  ADMIN: 'admin@danang.gov.vn',
}

export function normalizeLoginIdentifier(raw: string): string {
  const s = raw.trim().toLowerCase()
  if (s === 'admin' || s === 'quantri') return ROLE_DEMO_EMAILS.ADMIN
  if (s === 'dispatcher' || s === 'ioc' || s === 'quan.tm') return ROLE_DEMO_EMAILS.DISPATCHER
  if (s === 'technician' || s === 'kt' || s === 'kt.hung' || s === 'hung.lv') return ROLE_DEMO_EMAILS.TECHNICIAN
  if (s === 'citizen' || s === 'congdan') return ROLE_DEMO_EMAILS.CITIZEN
  return raw.trim()
}

/**
 * Explicitly switch to a demo role session (used only when user clicks a Quick Demo Login button).
 */
export async function loginAsDemoRole(
  role: 'CITIZEN' | 'DISPATCHER' | 'TECHNICIAN' | 'ADMIN',
): Promise<ApiUserOut | null> {
  try {
    const out = await apiLogin(ROLE_DEMO_EMAILS[role], 'Password123!')
    return out.user
  } catch {
    return null
  }
}

/**
 * Look up the seeded Technician UUID without mutating the current user's auth session in localStorage.
 */
export async function fetchDefaultTechnicianId(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: ROLE_DEMO_EMAILS.TECHNICIAN,
        password: 'Password123!',
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as ApiTokenOut
    return data.user?.id ?? null
  } catch {
    return null
  }
}

export async function loadSampleFieldPhotoFile(): Promise<File> {
  const res = await fetch('/field-photo.jpg')
  const blob = await res.blob()
  return new File([blob], 'field-photo.jpg', { type: blob.type || 'image/jpeg' })
}

/* ==================== Auth & Profile ==================== */

export async function apiLogin(
  username: string,
  password: string,
): Promise<ApiTokenOut> {
  const normalized = normalizeLoginIdentifier(username)
  const out = await requestJson<ApiTokenOut>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: normalized, password }),
  })
  setAuthSession(out.access_token, out.user)
  return out
}

export async function apiRegister(payload: {
  full_name: string
  phone?: string
  email?: string
  password: string
}): Promise<ApiTokenOut> {
  const out = await requestJson<ApiTokenOut>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  setAuthSession(out.access_token, out.user)
  return out
}

export async function apiGoogleLogin(idToken: string): Promise<ApiTokenOut> {
  const out = await requestJson<ApiTokenOut>('/api/v1/auth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  })
  setAuthSession(out.access_token, out.user)
  return out
}

export async function apiGetMe(): Promise<ApiUserOut> {
  const user = await requestJson<ApiUserOut>('/api/v1/auth/me')
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
  return user
}

export async function apiUpdateProfile(payload: {
  full_name?: string
  phone?: string
  avatar_url?: string
}): Promise<ApiUserOut> {
  const user = await requestJson<ApiUserOut>('/api/v1/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
  return user
}

export async function apiChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return requestJson<{ message: string }>('/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  })
}

/* ==================== Incidents & AI ==================== */

export async function apiAnalyzeImage(
  file: Blob,
  description = '',
): Promise<ApiAnalyzeImageOut> {
  const fd = new FormData()
  fd.append('image', file, 'incident.jpg')
  fd.append('description', description)
  return requestJson<ApiAnalyzeImageOut>('/api/v1/incidents/analyze-image', {
    method: 'POST',
    body: fd,
  })
}

export async function apiValidateLocation(
  latitude: number,
  longitude: number,
): Promise<ApiLocationValidateOut> {
  return requestJson<ApiLocationValidateOut>('/api/v1/zones/validate-location', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  })
}

export async function apiGetNearbyIncidents(
  latitude: number,
  longitude: number,
  radius = 50,
): Promise<ApiNearbyOut> {
  const q = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radius: String(radius),
  })
  return requestJson<ApiNearbyOut>(`/api/v1/incidents/nearby?${q.toString()}`)
}

export async function apiVoteDuplicate(idOrCode: string): Promise<{
  incident_id: string
  ticket_code: string
  duplicate_count: number
  message: string
}> {
  return requestJson(
    `/api/v1/incidents/${encodeURIComponent(idOrCode)}/vote-duplicate`,
    { method: 'POST' },
  )
}

export async function apiMergeDuplicate(
  primaryIdOrCode: string,
  duplicateIdOrCode: string,
  note?: string,
): Promise<{
  primary_incident_id: string
  primary_ticket_code: string
  duplicate_incident_id: string
  duplicate_ticket_code: string
  duplicate_count: number
  message: string
}> {
  return requestJson(
    `/api/v1/incidents/${encodeURIComponent(primaryIdOrCode)}/merge-duplicate`,
    {
      method: 'POST',
      body: JSON.stringify({
        duplicate_incident_id_or_code: duplicateIdOrCode,
        note,
      }),
    },
  )
}

export async function apiCreateIncident(payload: {
  title: string
  description: string
  latitude: number
  longitude: number
  address_text: string
  district?: string
  ward?: string
  citizen_contact?: string
  category_code?: string
  priority?: string
  image: Blob
}): Promise<ApiIncidentDetailOut> {
  const fd = new FormData()
  fd.append('title', payload.title)
  fd.append('description', payload.description)
  fd.append('latitude', String(payload.latitude))
  fd.append('longitude', String(payload.longitude))
  fd.append('address_text', payload.address_text)
  if (payload.district) fd.append('district', payload.district)
  if (payload.ward) fd.append('ward', payload.ward)
  if (payload.citizen_contact) fd.append('citizen_contact', payload.citizen_contact)
  if (payload.category_code) fd.append('category_code', payload.category_code)
  if (payload.priority) fd.append('priority', payload.priority)
  fd.append('image', payload.image, 'incident.jpg')

  return requestJson<ApiIncidentDetailOut>('/api/v1/incidents', {
    method: 'POST',
    body: fd,
  })
}

export async function apiListIncidents(params?: {
  page?: number
  page_size?: number
  status?: string
  priority?: string
  district?: string
  category_code?: string
  q?: string
  mine?: boolean
}): Promise<ApiIncidentListOut> {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.page_size) sp.set('page_size', String(params.page_size))
  if (params?.status) sp.set('status', params.status)
  if (params?.priority) sp.set('priority', params.priority)
  if (params?.district) sp.set('district', params.district)
  if (params?.category_code) sp.set('category_code', params.category_code)
  if (params?.q) sp.set('q', params.q)
  if (params?.mine) sp.set('mine', 'true')
  const qs = sp.toString()
  return requestJson<ApiIncidentListOut>(
    `/api/v1/incidents${qs ? `?${qs}` : ''}`,
  )
}

export async function apiGetIncidentDetail(
  idOrCode: string,
): Promise<ApiIncidentDetailOut> {
  return requestJson<ApiIncidentDetailOut>(
    `/api/v1/incidents/${encodeURIComponent(idOrCode)}`,
  )
}

export async function apiTriageIncident(
  idOrCode: string,
  payload: {
    category_id: string
    priority: string
    assigned_department_id: string
    note?: string
  },
): Promise<ApiIncidentDetailOut> {
  return requestJson<ApiIncidentDetailOut>(
    `/api/v1/incidents/${encodeURIComponent(idOrCode)}/triage`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function apiAssignIncident(
  idOrCode: string,
  payload: {
    assigned_department_id?: string
    assigned_technician_id?: string
    note?: string
  },
): Promise<ApiIncidentDetailOut> {
  return requestJson<ApiIncidentDetailOut>(
    `/api/v1/incidents/${encodeURIComponent(idOrCode)}/assign`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function apiUpdateIncidentStatus(
  idOrCode: string,
  payload: {
    to_status: string
    note?: string
    proof_latitude?: number
    proof_longitude?: number
    proof_image?: Blob
  },
): Promise<ApiIncidentDetailOut> {
  const fd = new FormData()
  fd.append('to_status', payload.to_status)
  if (payload.note) fd.append('note', payload.note)
  if (payload.proof_latitude !== undefined) {
    fd.append('proof_latitude', String(payload.proof_latitude))
  }
  if (payload.proof_longitude !== undefined) {
    fd.append('proof_longitude', String(payload.proof_longitude))
  }
  if (payload.proof_image) {
    fd.append('proof_image', payload.proof_image, 'after_proof.jpg')
  }
  return requestJson<ApiIncidentDetailOut>(
    `/api/v1/incidents/${encodeURIComponent(idOrCode)}/status`,
    {
      method: 'PATCH',
      body: fd,
    },
  )
}

export async function apiSubmitIncidentFeedback(
  idOrCode: string,
  payload: {
    action: 'CONFIRM' | 'DISPUTE'
    rating?: number
    comment?: string
  },
): Promise<ApiFeedbackOut> {
  return requestJson<ApiFeedbackOut>(
    `/api/v1/incidents/${encodeURIComponent(idOrCode)}/feedback`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

/* ==================== Analytics, Zones, Admin & Open311 ==================== */

export async function apiGetAnalyticsSummary(): Promise<ApiAnalyticsSummaryOut> {
  return requestJson<ApiAnalyticsSummaryOut>('/api/v1/incidents/analytics/summary')
}

export async function apiListZones(): Promise<ApiZoneOut[]> {
  return requestJson<ApiZoneOut[]>('/api/v1/zones')
}

export async function apiUpdateZone(
  zoneId: string,
  payload: { is_active?: boolean; name?: string; description?: string },
): Promise<ApiZoneOut> {
  return requestJson<ApiZoneOut>(
    `/api/v1/zones/${encodeURIComponent(zoneId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function apiListCategories(): Promise<ApiCategoryOut[]> {
  return requestJson<ApiCategoryOut[]>('/api/v1/categories')
}

export async function apiUpdateCategory(
  categoryId: string,
  payload: {
    name?: string
    default_sla_hours?: number
    default_department_id?: string
    is_active?: boolean
  },
): Promise<ApiCategoryOut> {
  return requestJson<ApiCategoryOut>(
    `/api/v1/categories/${encodeURIComponent(categoryId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function apiListDepartments(): Promise<ApiDepartmentOut[]> {
  return requestJson<ApiDepartmentOut[]>('/api/v1/departments')
}

export async function apiCreateDepartment(payload: {
  code: string
  name: string
  level?: string
  contact_email?: string
  contact_phone?: string
}): Promise<ApiDepartmentOut> {
  return requestJson<ApiDepartmentOut>('/api/v1/departments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiListUsers(params?: {
  page?: number
  page_size?: number
  role?: string
  q?: string
}): Promise<ApiUserListOut> {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.page_size) sp.set('page_size', String(params.page_size))
  if (params?.role) sp.set('role', params.role)
  if (params?.q) sp.set('q', params.q)
  const qs = sp.toString()
  return requestJson<ApiUserListOut>(`/api/v1/users${qs ? `?${qs}` : ''}`)
}

export async function apiCreateUserByAdmin(payload: {
  email?: string
  phone?: string
  full_name: string
  password: string
  role: 'CITIZEN' | 'DISPATCHER' | 'TECHNICIAN' | 'ADMIN'
  department_id?: string
}): Promise<ApiUserOut> {
  return requestJson<ApiUserOut>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiUpdateUserByAdmin(
  userId: string,
  payload: {
    full_name?: string
    phone?: string
    role?: 'CITIZEN' | 'DISPATCHER' | 'TECHNICIAN' | 'ADMIN'
    department_id?: string
    is_locked?: boolean
  },
): Promise<ApiUserOut> {
  return requestJson<ApiUserOut>(
    `/api/v1/users/${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function apiListAuditLogs(params?: {
  page?: number
  page_size?: number
  ticket_code?: string
  to_status?: string
}): Promise<ApiAuditLogListOut> {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.page_size) sp.set('page_size', String(params.page_size))
  if (params?.ticket_code) sp.set('ticket_code', params.ticket_code)
  if (params?.to_status) sp.set('to_status', params.to_status)
  const qs = sp.toString()
  return requestJson<ApiAuditLogListOut>(
    `/api/v1/audit-logs${qs ? `?${qs}` : ''}`,
  )
}

export async function apiGetOpen311Services(): Promise<ApiOpen311ServiceOut[]> {
  return requestJson<ApiOpen311ServiceOut[]>('/open311/v2/services.json')
}

export async function apiListOpen311Requests(params?: {
  service_code?: string
  status?: string
  limit?: number
}): Promise<ApiOpen311RequestItemOut[]> {
  const sp = new URLSearchParams()
  if (params?.service_code) sp.set('service_code', params.service_code)
  if (params?.status) sp.set('status', params.status)
  if (params?.limit) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  return requestJson<ApiOpen311RequestItemOut[]>(
    `/open311/v2/requests.json${qs ? `?${qs}` : ''}`,
  )
}

export async function apiCreateOpen311Request(payload: {
  service_code: string
  lat: number
  long: number
  address_string?: string
  description: string
}): Promise<
  Array<{
    service_request_id: string
    service_notice: string
    account_id: string | null
  }>
> {
  return requestJson('/open311/v2/requests.json', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
