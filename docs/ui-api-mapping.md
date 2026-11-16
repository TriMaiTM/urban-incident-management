# Bảng Đối Chiếu Dữ Liệu UI & API Backend (`ui-api-mapping.md`)

Tài liệu này đối chiếu chi tiết giữa **34 màn hình trong `ui-prototype/src`**, quy tắc vòng đời tại **`ui-prototype/guidelines/lifecycle.md`**, tài liệu bàn giao **`docs/PROJECT_CONTEXT_HANDOFF.md`** và mã nguồn thực tế tại **`backend/app`** (routers, Pydantic schemas, SQLAlchemy models).

---

## 1. Tổng Quan Các Endpoint Hiện Có Trên Backend

| Nhóm | Method & Đường dẫn đầy đủ | Request (Params / Body) | Response Schema | Quyền truy cập (RBAC) |
| :--- | :--- | :--- | :--- | :--- |
| **Health** | `GET /api/health` | Không có | `{"status", "app_name", "environment", "version"}` | Công khai |
| **Health** | `GET /api/v1/ping` | Không có | `{"message": "pong", "service": "api_v1"}` | Công khai |
| **Auth** | `POST /api/v1/auth/register` | JSON `UserRegisterIn` (`email?`, `phone?`, `full_name`, `password`) | `TokenOut` (`access_token`, `token_type`, `expires_in_seconds`, `user: UserOut`) | Công khai |
| **Auth** | `POST /api/v1/auth/login` | JSON `UserLoginIn` (`username`, `password`) | `TokenOut` | Công khai |
| **Auth** | `POST /api/v1/auth/google` | JSON `GoogleLoginIn` (`id_token`) | `TokenOut` | Công khai |
| **Auth** | `GET /api/v1/auth/me` | Header `Authorization: Bearer <token>` | `UserOut` (`id`, `email`, `phone`, `full_name`, `auth_provider`, `role`, `department_id`, `avatar_url`, `is_locked`, `created_at`) | Đã đăng nhập |
| **Auth** | `PATCH /api/v1/auth/me` | JSON `UserProfileUpdateIn` (`full_name?`, `phone?`, `avatar_url?`) | `UserOut` | Đã đăng nhập |
| **Auth** | `POST /api/v1/auth/change-password` | JSON `PasswordChangeIn` (`current_password`, `new_password`) | `{"message"}` | Đã đăng nhập |
| **Users** | `GET /api/v1/users` | Query: `page=1`, `page_size=20`, `role?`, `department_id?`, `is_locked?`, `q?` | `UserListOut` (`total`, `items: list[UserOut]`, `page`, `page_size`) | `ADMIN` |
| **Users** | `POST /api/v1/users` | JSON `AdminUserCreateIn` (`email?`, `phone?`, `full_name`, `password`, `role`, `department_id?`) | `UserOut` | `ADMIN` |
| **Users** | `PATCH /api/v1/users/{user_id}` | JSON `AdminUserUpdateIn` (`full_name?`, `phone?`, `role?`, `department_id?`, `is_locked?`) | `UserOut` | `ADMIN` |
| **Zones** | `GET /api/v1/zones` | Không có | `list[ZoneOut]` (tất cả vùng kèm `open_incident_count`, `is_active`, `geojson_geometry`) | Công khai |
| **Zones** | `GET /api/v1/zones/active` | Không có | `list[ZoneOut]` (`id`, `name`, `is_active`, `bounding_box`, `description`, `geojson_geometry`) | Công khai |
| **Zones** | `PATCH /api/v1/zones/{zone_id}` | JSON `ZoneUpdateIn` (`name?`, `description?`, `is_active?`) | `ZoneOut` | `ADMIN` |
| **Zones** | `POST /api/v1/zones/validate-location` | JSON `LocationValidateIn` (`latitude`, `longitude`) | `LocationValidateOut` (`is_inside`, `zone_id`, `zone_name`, `message`) | Công khai |
| **Categories** | `GET /api/v1/categories` | Không có | `list[CategoryOut]` (`id`, `code`, `name`, `default_sla_hours`, `default_department_id`, `is_active`) | Công khai |
| **Categories** | `PATCH /api/v1/categories/{category_id}` | JSON `CategoryUpdateIn` (`name?`, `default_sla_hours?`, `default_department_id?`, `is_active?`) | `CategoryOut` | `ADMIN` |
| **Departments** | `GET /api/v1/departments` | Không có | `list[DepartmentOut]` (`id`, `code`, `name`, `level`, `contact_email`, `contact_phone`) | Công khai |
| **Departments** | `POST /api/v1/departments` | JSON `DepartmentCreateIn` (`code`, `name`, `level`, `contact_email?`, `contact_phone?`) | `DepartmentOut` | `ADMIN` |
| **Departments** | `PATCH /api/v1/departments/{department_id}` | JSON `DepartmentUpdateIn` (`name?`, `level?`, `contact_email?`, `contact_phone?`) | `DepartmentOut` | `ADMIN` |
| **Audit Logs** | `GET /api/v1/audit-logs` | Query: `page=1`, `page_size=20`, `ticket_code?`, `actor_id?`, `to_status?`, `from_date?`, `to_date?` | `AuditLogListOut` (`total`, `items: list[AuditLogItemOut]`, `page`, `page_size`) | `ADMIN`, `DISPATCHER` |
| **Incidents** | `POST /api/v1/incidents/analyze-image` | `multipart/form-data` (`image: UploadFile`, `description?: str`) | `IncidentAnalyzeImageOut` (`category_code`, `priority`, `suggested_department_code`, `summary_vi`, `hazard_warning`, `confidence`, `sla_hours`, `is_blurred`, `faces_detected`, `plates_detected`) | Công khai (Rate limit theo `user_id` hoặc IP có kiểm tra `TRUSTED_PROXIES`, mặc định 10 lần/phút) |
| **Incidents** | `POST /api/v1/incidents` | `multipart/form-data` (`title`, `description`, `latitude`, `longitude`, `address_text`, `district?`, `ward?`, `citizen_contact?`, `category_code?`, `priority?`, `image: UploadFile`) | `IncidentDetailOut` (kèm `is_priority_suggested: bool`) | Công khai (hoặc kèm Bearer Token tùy chọn) |
| **Incidents** | `GET /api/v1/incidents/nearby` | Query: `latitude`, `longitude`, `radius=50.0`, `limit=10` | `IncidentNearbyOut` (`count`, `items: list[IncidentNearbyItem]` có `category_code`) | Công khai |
| **Incidents** | `POST /api/v1/incidents/{id_or_code}/vote-duplicate` | Path: `id_or_code` (`UUID` hoặc `ticket_code`) | `IncidentVoteDuplicateOut` (`incident_id`, `ticket_code`, `duplicate_count`, `message`) | Công khai |
| **Incidents** | `POST /api/v1/incidents/{id_or_code}/merge-duplicate` | Path: `id_or_code`<br>JSON `IncidentMergeDuplicateIn` (`duplicate_incident_id_or_code`, `note?`) | `IncidentMergeDuplicateOut` (`primary_incident_id`, `primary_ticket_code`, `duplicate_incident_id`, `duplicate_ticket_code`, `duplicate_count`, `message`) | `ADMIN`, `DISPATCHER` |
| **Incidents** | `PATCH /api/v1/incidents/{id_or_code}/triage` | Path: `id_or_code`<br>JSON `IncidentTriageIn` (`category_id: UUID`, `priority: str`, `assigned_department_id: UUID`, `note?: str`) | `IncidentDetailOut` (`is_priority_suggested=False`) | `ADMIN`, `DISPATCHER` (từ `SUBMITTED`, `TRIAGED`) |
| **Incidents** | `PATCH /api/v1/incidents/{id_or_code}/assign` | Path: `id_or_code`<br>JSON `IncidentAssignIn` (`assigned_department_id?: UUID`, `assigned_technician_id?: UUID`, `note?: str`) | `IncidentDetailOut` (`is_priority_suggested=False`) | `ADMIN`, `DISPATCHER` (từ `TRIAGED`, `ASSIGNED`, `REOPENED`) |
| **Incidents** | `PATCH /api/v1/incidents/{id_or_code}/status` | Path: `id_or_code`<br>`multipart/form-data` (`to_status`, `note?`, `proof_latitude?`, `proof_longitude?`, `proof_image?: UploadFile`) | `IncidentDetailOut` | `TECHNICIAN` (`IN_PROGRESS`, `RESOLVED`); `ADMIN`, `DISPATCHER` (`CONFIRMED`, `REOPENED`, `REJECTED`, `CLOSED` khi `citizen_id` rỗng) |
| **Incidents** | `POST /api/v1/incidents/{id_or_code}/feedback` | Path: `id_or_code`<br>JSON `IncidentFeedbackCreateIn` (`action: "CONFIRM" \| "DISPUTE"`, `rating?: 1..5`, `comment?: str`) | `IncidentFeedbackOut` | Đã đăng nhập — chỉ chủ phiếu (`citizen_id == current_user.id`) khi `status == "CONFIRMED"` |
| **Incidents** | `GET /api/v1/incidents` | Query: `page=1`, `page_size=20`, `status?` (nhiều giá trị), `priority?` (nhiều giá trị), `q?`, `assigned_technician_id?`, `mine=false`, `district?`, `category_code?`, `category_id?` | `IncidentListOut` (`total`, `items: list[IncidentOut]`, `page`, `page_size`) | Công khai (`mine=true` yêu cầu đăng nhập) |
| **Incidents** | `GET /api/v1/incidents/map` | Query: `district?`, `category_code?`, `status?` | `IncidentMapFeatureCollectionOut` (`type: "FeatureCollection"`, `features` có `duplicate_count`) | Công khai |
| **Incidents** | `GET /api/v1/incidents/analytics/summary` | Query: `from_date?`, `to_date?` | `IncidentAnalyticsSummaryOut` (`total_incidents`, `by_status` [9 trạng thái], `by_priority`, `by_district`, `sla_compliance`, `avg_resolution_time_minutes`, `avg_satisfaction_rating`, `satisfaction_score`, `completion_rate_by_district`) | Công khai |
| **Incidents** | `GET /api/v1/incidents/{id_or_code}` | Path: `id_or_code` (`UUID` hoặc `ticket_code`) | `IncidentDetailOut` (ẩn `BEFORE_ORIGINAL` và che `citizen_contact` nếu không phải `ADMIN`/`DISPATCHER`; `rejection_reason` chỉ trả cho chủ phiếu/`DISPATCHER`/`ADMIN`; `assigned_technician_name` rút gọn khi ẩn danh) | Công khai (hoặc kèm Bearer Token tùy chọn) |
| **Webhooks** | `GET /api/v1/webhooks/facebook` | Query: `hub.mode`, `hub.verify_token`, `hub.challenge` | Plain text challenge | Meta Platform |
| **Webhooks** | `POST /api/v1/webhooks/facebook` | JSON `FacebookWebhookPayload` | Plain text `"EVENT_RECEIVED"` | Meta Platform |
| **Open311** | `GET /open311/v2/services.json` | Không có | `list[Open311ServiceOut]` | Công khai |
| **Open311** | `GET /open311/v2/requests.json` | Query: `service_code?`, `status?` (`open\|closed`), `start_date?`, `end_date?`, `limit=20` | `list[Open311RequestItemOut]` | Công khai |
| **Open311** | `POST /open311/v2/requests.json` | JSON `Open311CreateRequestIn` (`service_code`, `lat`, `long`, `address_string?`, `email?`, `phone?`, `first_name?`, `last_name?`, `description`, `media_url?`) | `list[Open311CreateRequestResponseItem]` | Công khai |
| **Open311** | `GET /open311/v2/requests/{service_request_id}.json` | Path: `service_request_id: str` | `list[Open311RequestItemOut]` | Công khai |

---

## 2. Bảng Đối Chiếu Từng Màn Hình (34 Màn Hình)

### Nhóm I: Phân Hệ Công Cộng (`01-cong-cong`)

#### Màn 1: Trang chủ & Bản đồ Đô thị Mở (`/`) — `HomeScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Thống kê nhanh 3 thẻ (`stat`) | `fresh: number` (tiếp nhận 24h), `working: number` (`IN_PROGRESS`), `closed: number` (`CLOSED`), `series: number[]` (sparkline/bars 7 điểm) | `GET /api/v1/incidents/analytics/summary` | **Cần adapter** | Backend trả `by_status` (`IN_PROGRESS`, `CLOSED`) và `total_incidents` (có thể lọc `from_date` 24h cho `fresh`). Tuy nhiên backend **không trả mảng chuỗi thời gian `series: number[]`** cho biểu đồ mini. |
| Danh sách ghim & thẻ sự cố (`Incident[]`) | `code: string`, `title: string`, `address: string`, `district: string`, `time: string` (relative), `kind: 'road'\|'flood'\|'tree'\|'trash'\|'light'`, `level: 'urgent'\|'high'\|'normal'\|'low'\|'done'`, `x: number`, `y: number` (hoặc `lat, lng`), `supporters: number` | `GET /api/v1/incidents` hoặc `GET /api/v1/incidents/map` | **Cần adapter** | - `ticket_code` $\rightarrow$ `code`<br>- `address_text` / `district` $\rightarrow$ `address`, `district`<br>- `created_at` (ISO datetime) $\rightarrow$ `time` (`agoText`)<br>- `category_code` (`ROAD_DAMAGE`, `FLOODING`, `FALLEN_TREE`, `GARBAGE`, `STREETLIGHT`, `OTHER`) $\rightarrow$ `kind` (`road`, `flood`, `tree`, `trash`, `light`)<br>- `priority` (`EMERGENCY`, `HIGH`, `NORMAL`, `LOW`) + `status` (`CONFIRMED`/`CLOSED` $\rightarrow$ `'done'`) $\rightarrow$ `level`<br>- `duplicate_count` $\rightarrow$ `supporters` (lưu ý `IncidentMapProperties` của `/map` chưa có `duplicate_count`, còn `IncidentOut` của `GET /api/v1/incidents` có `duplicate_count`). |
| Bộ lọc danh sách | `district: string`, `kind: string`, `status: 'Mọi tình trạng'\|'Đang xử lý'\|'Hoàn tất'` | `GET /api/v1/incidents?district=...&category_code=...&status=...` | **Cần adapter** | Backend nhận 1 giá trị `status` đơn lẻ (`SUBMITTED`, `IN_PROGRESS`...), trong khi UI lọc theo nhóm (`'Hoàn tất'` = `CONFIRMED` + `CLOSED`, `'Đang xử lý'` = các trạng thái mở). |
| Tìm kiếm nhanh mã phiếu | `query: string` (`DN-YYYYMM-XXXX`) | `GET /api/v1/incidents/{ticket_code}` | **Khớp** | Trả về `IncidentDetailOut` (404 nếu không tồn tại). |
| Nút "Tôi cũng gặp" (+1) trên thẻ ghim | `code: string` $\rightarrow$ cộng `+1` vào `supporters` | `POST /api/v1/incidents/{id}/vote-duplicate` | **Cần adapter** | Endpoint backend nhận `id: UUID` trên URL chứ không phải `ticket_code`. UI phải truyền `id` (UUID) lấy từ `IncidentOut.id`. |

#### Màn 2: Cổng Báo cáo Phản ánh Hiện trường (`/report`) — `ReportScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Tải ảnh & Quét AI gợi ý trước khi gửi (`AiSuggestCard`) | `photo: 'empty'\|'scanning'\|'done'`, `type: string`, `level: Level`, `hours: number`, `unit: string`, tag `NĐ13 Đã mờ` | Không có endpoint preview riêng (AI chạy ngầm trong `POST /api/v1/incidents`) | **Thiếu backend** | Trong UI, ngay khi chọn ảnh (trước khi bấm "Gửi phản ánh"), hệ thống quét AI để gợi ý Loại, Mức độ, Đội phụ trách. Trong Backend, AI DeepSeek Vision chỉ chạy ngầm (`BackgroundTasks`) **sau khi** đã gọi `POST /api/v1/incidents` để tạo phiếu. |
| Kiểm tra tọa độ trong ranh giới Đà Nẵng | `pin: { x, y }` (hoặc `latitude: number, longitude: number`) $\rightarrow$ `outside: boolean` | `POST /api/v1/zones/validate-location` | **Cần adapter** | Quy đổi tọa độ bản đồ sang `{ latitude, longitude }`, đọc `is_inside: boolean` từ `LocationValidateOut`. |
| Reverse Geocoding (Tọa độ $\rightarrow$ Địa chỉ) | `pin` $\rightarrow$ `addr: string \| null` | Không có (UI đang dùng hàm `addressAt(pin)` nội bộ) | **Thiếu backend** | Cần gọi Goong Maps Reverse Geocoding từ client hoặc thêm endpoint proxy trên backend (hiện chưa rõ). |
| Cảnh báo trùng lặp $\le 50\text{m}$ (`DuplicateAlert`) | `meters: number`, `item: { code, title, address, time, kind, level }` | `GET /api/v1/incidents/nearby?latitude=...&longitude=...&radius=50` | **Cần adapter** | Map `IncidentNearbyOut.items[0]`: `distance_meters` $\rightarrow$ `meters`, `ticket_code` $\rightarrow$ `code`, `priority` $\rightarrow$ `level`, `created_at` $\rightarrow$ `time`. Lưu ý `IncidentNearbyItem` hiện **thiếu `category_code`** để suy ra `kind` icon. |
| Bấm "Tôi cũng gặp" khi phát hiện trùng lặp | `code: string` (hoặc `id: UUID`), `merged: true` | `POST /api/v1/incidents/{id}/vote-duplicate` | **Cần adapter** | Dùng `IncidentNearbyItem.id` (UUID) để gọi API, nhận lại `ticket_code` và `duplicate_count`. |
| Gửi phản ánh mới (`submit`) | `note: string` (mô tả), `phone: string`, `type: string`, `level: Level`, `pin` (`lat, lng`), `addr: string`, `image: File` | `POST /api/v1/incidents` (`multipart/form-data`) | **Cần adapter** | Backend `POST /api/v1/incidents` bắt buộc có `title` (tối thiểu 3 ký tự) và `description` (tối thiểu 5 ký tự), trong khi form UI chỉ có 1 ô `note` ("Mô tả hiện trường" — không bắt buộc trong `ready`) và không gửi `type`/`level` do người dùng chỉnh trên `AiSuggestCard` lên server. |

#### Màn 3: Tra cứu Tiến độ & Chi tiết Phiếu (`/tracking/[code]`) — `TrackingScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Thông tin phiếu & đồng hồ SLA (`Track`) | `code: string`, `title: string`, `address: string`, `kind: Kind`, `level: Level`, `step: 0..4`, `remaining: number` (giây), `unit: string`, `ktv: string`, `promise: string`, `note: string` | `GET /api/v1/incidents/{ticket_code}` | **Cần adapter** | - `assigned_department.name` $\rightarrow$ `unit`<br>- `sla_due_at` $\rightarrow$ tính `remaining` (giây) và `promise` (`Trước HH:mm`)<br>- **Thiếu tên KTV (`ktv`)**: `IncidentDetailOut` chỉ trả `assigned_technician_id: UUID \| None`, không trả `assigned_technician.full_name`. |
| Timeline 5 mốc công dân (`times: string[]`) | 5 mốc: `['Tiếp nhận', 'Phân loại', 'Giao việc', 'Đang xử lý', 'Đã khắc phục']` kèm giờ `HH:mm` | `GET /api/v1/incidents/{ticket_code}` (`history: list[IncidentHistoryOut]`) | **Cần adapter** | Lọc `history` theo `to_status` (`SUBMITTED`, `TRIAGED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`/`CONFIRMED`) và format `created_at` sang `HH:mm`. |
| Ảnh Trước & Sau (`CompareEvidence`) | Ảnh Trước (`BEFORE_ANONYMIZED`), Ảnh Sau (`AFTER_PROOF`), độ lệch GPS (`gpsDev: number`, `ok: boolean`) | `GET /api/v1/incidents/{ticket_code}` (`media: list[IncidentMediaOut]`) | **Cần adapter** | Lọc `media` theo `media_type == "BEFORE_ANONYMIZED"` và `"AFTER_PROOF"`. Tuy nhiên backend **không lưu tọa độ GPS của ảnh sau** nên không tính được `gpsDev` (m). |
| Khung Đánh giá 1–5 sao & Khiếu nại | `stars: 1..5`, `comment: string`, `proof` (ảnh khiếu nại khi 1–2 sao) | `POST /api/v1/incidents/{id}/feedback` | **Cần adapter** | - Dùng `id: UUID` từ `IncidentDetailOut.id`.<br>- Backend bắt buộc JWT token (`get_current_user`), trong khi `/tracking/[code]` là trang công khai không bắt buộc đăng nhập.<br>- Backend không nhận ảnh đính kèm khiếu nại (`proof`). |

#### Màn 4: Danh sách Sự cố Đô thị Công khai (`/incidents`) — `IncidentListScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Lưới thẻ & Bản đồ sự cố công khai | `list: Incident[]` (`code`, `title`, `address`, `district`, `time`, `kind`, `level`, `x`, `y`, `supporters`), ảnh thumbnail (`anonymized_image_url`) | `GET /api/v1/incidents` & `GET /api/v1/incidents/map` | **Cần adapter** | Tương tự Màn 1: chuyển đổi `IncidentOut` sang `Incident`. UI đánh dấu thẻ `top` cho phiếu có `supporters` (`duplicate_count`) lớn nhất. |
| Bộ lọc Quận, Loại, Trạng thái | `district`, `kind`, `status` (`Mọi tình trạng`, `Đang xử lý`, `Hoàn tất`) | `GET /api/v1/incidents` | **Cần adapter** | Map tên tiếng Việt sang `district`, `category_code`, và nhóm `status`. |

#### Màn 5: Cổng Tài liệu API Chuẩn Mở Open311 (`/developers/open311`) — `Open311Screen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Thử `GET /services.json` | `[ { service_code: string, service_name: string, type: string } ]` | `GET /open311/v2/services.json` | **Khớp** | Lưu ý dữ liệu mock trong `Open311Screen.tsx` đang dùng mã `FLOOD, TREE, ROAD, MANHOLE, LIGHT, TRASH`, còn DB thực tế trả `ROAD_DAMAGE, FLOODING, FALLEN_TREE, GARBAGE, STREETLIGHT, OTHER`. |
| Thử `POST /requests.json` | Request: `service_code, lat, long, description, address_string`<br>Response: `[{ service_request_id, service_notice, account_id, token? }]` | `POST /open311/v2/requests.json` | **Cần adapter** | Schema `Open311CreateRequestResponseItem` của backend có `service_request_id, service_notice, account_id` (không có trường `token`). |
| Thử `GET /requests.json` (lọc danh sách theo `service_code, status, limit`) | Query: `service_code?, status? ('open'\|'closed'), limit`<br>Response: `list[Open311RequestItemOut]` | Không có `GET /open311/v2/requests.json` (chỉ có `GET /open311/v2/requests/{service_request_id}.json`) | **Thiếu backend** | Backend hiện mới cài đặt tra cứu chi tiết 1 phiếu theo `{service_request_id}.json`, chưa có endpoint danh sách `GET /open311/v2/requests.json`. |
| Nút "Tải GeoJSON ranh giới" | GeoJSON `FeatureCollection` các phân vùng Đà Nẵng | `GET /api/v1/zones/active` | **Cần adapter** | Bọc mảng `ZoneOut.geojson_geometry` từ `/api/v1/zones/active` thành chuẩn GeoJSON `FeatureCollection`. |

---

### Nhóm II: Xác Thực & Danh Tính (`02-xac-thuc`)

#### Màn 6: Đăng nhập Đa phương thức (`/auth/login`) — `LoginScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Đăng nhập Google (Tab Công dân) | `id_token: string` $\rightarrow$ `TokenOut` | `POST /api/v1/auth/google` | **Khớp** | Nhận `id_token` từ Google SDK, trả JWT `access_token` và `user`. |
| Đăng nhập SĐT + OTP 6 số (Tab Công dân) | `phone: string` $\rightarrow$ gửi OTP; `phone + otp: string (6 số)` $\rightarrow$ đăng nhập | Không có | **Thiếu backend** | Backend hiện chỉ hỗ trợ đăng nhập bằng `username` (email/SĐT) + `password` tại `POST /api/v1/auth/login`, không có OTP. |
| Đăng nhập Cán bộ (Tab Cán bộ) | `user: string` (tên đăng nhập / email công vụ), `pw: string` | `POST /api/v1/auth/login` | **Cần adapter** | Map `{ user, pw }` $\rightarrow$ `UserLoginIn { username: user, password: pw }`. Dựa vào `TokenOut.user.role` (`ADMIN`, `DISPATCHER`, `TECHNICIAN`, `CITIZEN`) để điều hướng trang đích thay vì kiểm tra chuỗi `user.includes(...)`. |

#### Màn 7: Đăng ký Tài khoản Công dân (`/auth/register`) — `RegisterScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Gửi & xác thực mã OTP SĐT | `phone: string`, `otp: string (6 số)` | Không có | **Thiếu backend** | Backend không có luồng gửi/kiểm tra OTP khi đăng ký. |
| Tạo tài khoản công dân | `name: string`, `phone: string`, `pw: string` (tối thiểu 8 ký tự) | `POST /api/v1/auth/register` | **Cần adapter** | Map `{ name, phone, pw }` $\rightarrow$ `UserRegisterIn { full_name: name, phone, password: pw }`. (Backend cho phép `password >= 6` ký tự, UI kiểm tra `>= 8` ký tự). |

#### Màn 8: Quên & Đặt lại Mật khẩu (`/auth/forgot-password`) — `ForgotPasswordScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Bước 1: Yêu cầu gửi OTP | `contact: string` (SĐT hoặc Email) | Không có | **Thiếu backend** | Chưa có endpoint gửi OTP khôi phục mật khẩu. |
| Bước 2: Xác nhận mã OTP | `contact: string`, `otp: string (6 số)` | Không có | **Thiếu backend** | Chưa có endpoint xác minh OTP. |
| Bước 3: Đặt lại mật khẩu mới | `pw: string`, `pw2: string` | Không có | **Thiếu backend** | Chưa có endpoint đặt lại mật khẩu. |

#### Màn 9: Hồ sơ Cá nhân & Cài đặt Tài khoản (`/profile`) — `ProfileScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Xem thông tin hồ sơ hiện tại | `name: string`, `phone: string`, `role: string`, `sub: string` (đơn vị/khu vực), `photo: string \| null` | `GET /api/v1/auth/me` | **Cần adapter** | Map `UserOut`: `full_name` $\rightarrow$ `name`, `phone` $\rightarrow$ `phone`, `role` $\rightarrow$ `role`, `avatar_url` $\rightarrow$ `photo`. Nếu có `department_id`, cần tra tên đơn vị từ `GET /api/v1/departments`. |
| Cập nhật họ tên, SĐT, ảnh đại diện | `name: string`, `phone: string`, `photo: File` | Không có (`PUT/PATCH /api/v1/auth/me` chưa tồn tại) | **Thiếu backend** | Backend chỉ có `GET /api/v1/auth/me`, chưa có API cập nhật hồ sơ hay tải ảnh avatar. |
| Đổi mật khẩu | `cur: string` (mật khẩu cũ), `pw: string` (mật khẩu mới), `pw2: string` | Không có | **Thiếu backend** | Chưa có endpoint đổi mật khẩu. |

---

### Nhóm III: Phân Hệ Công Dân (`03-cong-dan`)

#### Màn 10: Sổ tay Phản ánh của Tôi (`/citizen/my-reports`) — `MyReportsScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Thống kê cá nhân & Danh sách phiếu của tôi theo 3 tab (`Đang xử lý`, `Đã hoàn tất`, `Bị từ chối`) | `Report[]` (`id`, `title`, `address`, `kind`, `level`, `status`, `raw`, `date`, `ago`, `reason?`) | `GET /api/v1/incidents` (chưa lọc theo `citizen_id`) | **Thiếu backend** | `GET /api/v1/incidents` hiện chưa có tham số lọc theo người gửi (`citizen_id` hoặc `/incidents/me`), và `IncidentOut` trong danh sách chưa trả `reason` (ghi chú lý do từ chối nằm trong `IncidentHistory`). |

#### Màn 11: Chi tiết Tương tác Phiếu Công dân (`/citizen/reports/[id]`) — `ReportDetailScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Thông tin chi tiết phiếu, Timeline, Bản đồ, Ảnh hiện trường | `id: string` (`ticket_code`), `title`, `address`, `date`, `status`, `level`, `step`, `times: string[]`, `rated?: number`, tọa độ ghim, ảnh | `GET /api/v1/incidents/{ticket_code}` | **Cần adapter** | Map từ `IncidentDetailOut`: `feedback.rating` $\rightarrow$ `rated`, `history` $\rightarrow$ `times`, `latitude/longitude` $\rightarrow$ vị trí bản đồ, `media` $\rightarrow$ ảnh. |
| Hủy phản ánh (khi đang ở trạng thái mới tiếp nhận) | `id: string` $\rightarrow$ hủy phiếu | Không có (Backend `PATCH /api/v1/incidents/{id}/status` chỉ cho phép `ADMIN`, `DISPATCHER`, `TECHNICIAN`) | **Thiếu backend** | Công dân (`CITIZEN`) không có quyền gọi `/status`, và backend cũng không có trạng thái `CANCELLED` hay API cho công dân tự hủy phiếu. |
| Nhắn tin bổ sung với IOC (`msgs: Msg[]`) | `from: 'me'\|'ioc'`, `text?: string`, `photo?: boolean`, `time: string` | Không có | **Thiếu backend** | Backend không có bảng/endpoint chat hoặc gửi tin nhắn bổ sung trực tiếp trên web giữa công dân và IOC. |

#### Màn 12: Đánh giá Hài lòng & Khiếu nại (`/citizen/feedback/[code]`) — `FeedbackScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Thông tin đối chiếu Trước/Sau & Ghi chú KTV | `id: string` (`code`), `title`, `address`, `times[4]`, `gpsDev: number`, `ktv: string`, `note: string`, ảnh Trước/Sau | `GET /api/v1/incidents/{ticket_code}` | **Cần adapter** | Lấy ảnh `BEFORE_ANONYMIZED` và `AFTER_PROOF` từ `media`, ghi chú KTV từ `history` ứng với `to_status == "RESOLVED"`. Thiếu `gpsDev` và tên `ktv`. |
| Gửi đánh giá ("Xác nhận hài lòng" $\ge 3$ sao hoặc "Gửi khiếu nại" $1\text{--}2$ sao) | `stars: 1..5`, `comment: string`, `proof?: File` (ảnh khiếu nại) | `POST /api/v1/incidents/{id}/feedback` | **Cần adapter** | - Cần truyền `IncidentDetailOut.id` (UUID) thay vì `code`.<br>- Lệch trạng thái: Backend chỉ cho phép feedback khi `status == "RESOLVED"` và chuyển sang `CONFIRMED` (nếu $\ge 3$ sao) hoặc `IN_PROGRESS` (nếu $\le 2$ sao); trong khi UI chỉ mở màn này khi `status == 'done'` (`CONFIRMED`/`CLOSED`) và chuyển sang `CLOSED` hoặc `REOPENED`.<br>- Backend không nhận ảnh khiếu nại `proof`. |

#### Màn 13: Trung tâm Thông báo Công dân (`/citizen/notifications`) — `NotificationsScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Danh sách thông báo & đánh dấu đã đọc | `id: string`, `group: 'Hôm nay'\|'Trước đó'`, `title: string`, `message: string`, `time: string`, `to: string`, `reportId: string`, `emergency?: boolean`, `read: boolean` | Không có | **Chỉ mock / Thiếu backend** | Backend chưa có model và endpoint quản lý thông báo in-app (`notifications`) cho công dân. |

---

### Nhóm IV: Điều Phối Viên IOC (`04-dieu-phoi-ioc`)

#### Màn 14: Bàn Tác chiến & Điều phối Sự cố (`/dispatcher/command-center`) — `CommandCenterScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Hàng đợi phiếu chờ duyệt (`queue`) | Các phiếu có `status` là `SUBMITTED` hoặc `TRIAGED`: `id`, `title`, `address`, `kind`, `level`, `time`, `x, y`, `remaining: number`, `extra: number` (`supporters`), `badPhoto?: boolean` | `GET /api/v1/incidents?status=SUBMITTED` & `GET /api/v1/incidents?status=TRIAGED` | **Cần adapter** | Gọi danh sách cho cả 2 trạng thái `SUBMITTED` và `TRIAGED` (hoặc mở rộng backend nhận nhiều `status`), tính `remaining` từ `sla_due_at`. |
| Phát hiện & Gộp phiếu trùng lặp $\le 50\text{m}$ trên bàn điều phối (`merge`) | `cur.id`, `dup.id` $\rightarrow$ ẩn phiếu trùng và tăng `+1` vào `cur.extra` | `GET /api/v1/incidents/nearby` & `POST /api/v1/incidents/{id}/vote-duplicate` | **Thiếu backend (cho gộp 2 phiếu đã tạo)** | `vote-duplicate` chỉ tăng bộ đếm `duplicate_count` của 1 phiếu, **chưa cập nhật phiếu thứ 2** (`dup`) với `is_duplicate_of_id = cur.id` và đóng/ẩn phiếu `dup` (dù cột `is_duplicate_of_id` đã có trong model `Incident`). |
| Thẻ AI gợi ý & Chỉnh sửa phân loại (`AiSuggestCard`) | `kind: Kind`, `level: Level`, `unit: string` (chọn từ danh sách đơn vị) | `GET /api/v1/incidents/{ticket_code}`, `GET /api/v1/categories`, `GET /api/v1/departments` | **Cần adapter** | Map `ai_classification_raw`, `category`, `priority`, `assigned_department` từ `IncidentDetailOut`. Danh sách đơn vị lấy từ `GET /api/v1/departments`. |
| Nút "Duyệt & Giao việc" (`approve`) | Cập nhật loại, mức độ, đơn vị phụ trách và chuyển trạng thái sang `ASSIGNED` | `PATCH /api/v1/incidents/{id}/triage` **và** `PATCH /api/v1/incidents/{id}/assign` | **Cần adapter** | Trên UI là 1 nút bấm duy nhất chuyển thẳng sang `ASSIGNED`; trên Backend đang tách làm 2 API (`/triage` chuyển sang `TRIAGED`, `/assign` chuyển sang `ASSIGNED`). |
| Nút "Từ chối tiếp nhận" (`reject`) | Chuyển trạng thái sang `REJECTED` | `PATCH /api/v1/incidents/{id}/status` (`to_status="REJECTED"`, `note=...`) | **Cần adapter** | Backend **bắt buộc phải có `note` không rỗng** khi chuyển sang `REJECTED` (nếu thiếu trả 400), trong khi nút "Từ chối tiếp nhận" ở `CommandCenterScreen.tsx` hiện bấm trực tiếp không có ô nhập lý do `note`. |

#### Màn 15: Nghiệm thu & Đối chiếu Minh chứng (`/dispatcher/verify`) — `VerifyScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Danh sách phiếu chờ nghiệm thu (`cases`) | Phiếu có `status == 'RESOLVED'`: `id`, `title`, `address`, `gps: number` (lệch m), `ax, ay, bx, by`, `measure: string`, `material: string`, `time: string`, `minutes: number`, `hash: string`, `onTime: boolean` | `GET /api/v1/incidents?status=RESOLVED` & `GET /api/v1/incidents/{ticket_code}` | **Cần adapter / Thiếu dữ liệu phụ** | Backend có `status=RESOLVED`, `created_at`, `resolved_at`, `sla_due_at`, `media` (`BEFORE_ANONYMIZED`, `AFTER_PROOF`) và `history`. Tuy nhiên backend **không có các trường** `measure` (biện pháp), `material` (vật tư), tọa độ ảnh sau (`bx, by` / `gps` deviation), mã thiết bị và `hash` SHA256. |
| Nút "Duyệt nghiệm thu" (`approve`) | Chuyển trạng thái sang `CONFIRMED` | `PATCH /api/v1/incidents/{id}/status` | **Lệch hành vi (Cần sửa backend)** | Theo `lifecycle.md` và `VerifyScreen.tsx`, nút này chuyển phiếu sang `CONFIRMED`. Nhưng `PATCH /api/v1/incidents/{id}/status` hiện chỉ cho phép `{"IN_PROGRESS", "RESOLVED", "REJECTED", "CLOSED"}` (chưa cho phép `CONFIRMED`). |
| Nút "Yêu cầu làm lại" (`redo`) | Chuyển trạng thái sang `REOPENED` | `PATCH /api/v1/incidents/{id}/status` (`to_status="IN_PROGRESS"`) | **Cần adapter / Lệch trạng thái** | Backend không có `REOPENED` trong `allowed_statuses`, mà cho phép chuyển từ `RESOLVED` về `IN_PROGRESS` (reset `resolved_at = None`). |
| Nút "Lưu nháp" (`draft`) | `drafts: string[]` (lưu tạm trạng thái rà soát của điều phối viên) | Không có | **Chỉ mock** | Lưu tạm ở state/localStorage phía client. |

#### Màn 16: Giám sát Hạn SLA & Cảnh báo Trễ (`/dispatcher/sla-watch`) — `SlaWatchScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Bảng 3 cột theo mức độ (`urgent`, `high`, `normal`) | Các phiếu đang mở (`isOpen`): `code`, `title`, `street`, `level`, `hours`, `deadline: number` (ms), `unit: string` | `GET /api/v1/incidents` | **Cần adapter** | Lọc các phiếu chưa kết thúc và `priority != "LOW"`. Chuyển `sla_due_at` sang timestamp `deadline`, `assigned_department_code` sang tên đơn vị `unit`. |
| Nút "Chuyển đơn vị" (`onTransfer`) | Chọn đơn vị mới cho phiếu đang theo dõi | `PATCH /api/v1/incidents/{id}/assign` | **Cần adapter** | Truyền `id: UUID` của phiếu và `assigned_department_id: UUID` của đơn vị mới. |
| Nút "Đôn đốc" (`onNudge`) | Gửi nhắc nhở tới đơn vị phụ trách (`nudged: boolean`) | Không có | **Chỉ mock / Thiếu backend** | Backend chưa có endpoint gửi thông báo đôn đốc SLA cho đơn vị/KTV. |

#### Màn 17: Bản đồ Điều động Đội Cơ động (`/dispatcher/field-units`) — `FieldUnitsScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Danh sách & Vị trí thời gian thực của các đội hiện trường (`Unit[]`) | `id: string`, `name: string`, `status: 'idle'\|'moving'\|'working'`, `x, y` (GPS), `crew: number`, `note: string`, `mats: { label: string, qty: number, low?: boolean }[]` | `GET /api/v1/departments` (chỉ có thông tin tĩnh) | **Chỉ mock / Thiếu backend** | Backend model `Department` chỉ có `id, code, name, level, contact_email, contact_phone`; không có vị trí GPS thời gian thực của đội, trạng thái `idle/moving/working`, quân số `crew` hay tồn kho vật tư `mats`. |
| Nút "Điều động" / "Điều sang" (`dispatch`) | Gán đội được chọn cho sự cố | `PATCH /api/v1/incidents/{id}/assign` | **Cần adapter** | Nếu gắn với `Department`, truyền `assigned_department_id: UUID` vào `PATCH /api/v1/incidents/{id}/assign`. |

#### Màn 18: Danh bạ & Lịch sử Điều phối Tổng hợp (`/dispatcher/incidents`) — `IncidentsScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Bảng sổ bộ sự cố có phân trang & tìm kiếm (`Row[]`) | `code: string`, `type: string`, `street: string`, `district: string`, `level: Level`, `unit: string`, `sla: string`, `status: string` | `GET /api/v1/incidents?page=...&page_size=...` | **Cần adapter** | - Map `IncidentOut` sang `Row`.<br>- Backend hỗ trợ lọc theo `status`, `district`, `category_code`, nhưng **chưa có tham số `q` (search text)** theo mã phiếu/tên đường/đơn vị và chưa có tham số lọc theo `priority` (`level`). |
| Xuất file CSV (`exportCsv`) | Xuất danh sách phiếu đang lọc ra file `.csv` | Thực hiện tại client từ dữ liệu bảng | **Khớp (Client-side)** | Không cần endpoint riêng nếu xuất trên dữ liệu đã tải, hoặc cần lấy toàn bộ trang trước khi xuất. |

---

### Nhóm V: Kỹ Thuật Viên Hiện Trường (`05-ky-thuat-vien`)

#### Màn 19: Danh sách Nhiệm vụ Hiện trường (`/technician/tasks`) — `TaskListScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Thống kê ca trực (3 thẻ `MetricBentoCard`) | `Được giao: number`, `Xong hôm nay: number`, `Đúng hạn: number (%)` | `GET /api/v1/incidents/analytics/summary` | **Cần adapter** | Cần số liệu lọc riêng cho kỹ thuật viên/đơn vị đang đăng nhập (hiện `/analytics/summary` đang tính trên toàn thành phố). |
| Danh sách nhiệm vụ (`Đang thực hiện` & `Lịch sử`) | `Task[]`: `id`, `title`, `address`, `kind`, `level`, `remaining: number`, `distance: string`, `eta: string`, `x, y`, `done?: string`, `status`, `statusText`, `finished: boolean` | `GET /api/v1/incidents` | **Cần adapter / Thiếu filter** | `GET /api/v1/incidents` hiện chưa có query parameter `assigned_technician_id` hoặc `assigned_department_id`. Khoảng cách `distance` và `eta` tính ở client từ tọa độ GPS của KTV tới `latitude, longitude` của sự cố. |

#### Màn 20: Chi tiết Nhiệm vụ & Dẫn đường GPS (`/technician/tasks/[id]`) — `TaskDetailScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Chi tiết nhiệm vụ, ảnh hiện trường, bản đồ dẫn đường, timeline 3 mốc | `task: Task` (`id`, `title`, `address`, `level`, `remaining`, `distance`, `eta`, `assigned`, `startedAt`, `resolvedAt`), ảnh Trước | `GET /api/v1/incidents/{ticket_code}` | **Cần adapter** | Lấy giờ `assigned`, `startedAt`, `resolvedAt` từ `IncidentDetailOut.history` (ứng với `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`). |
| Khối "AI đề xuất" vật tư & các bước thi công (`plan[task.kind]`) | `materials: string[]`, `steps: string[]` | Không có (Backend `ai_classification_raw` chỉ có `summary_vi`, `hazard_warning`) | **Chỉ mock** | Danh mục vật tư & bước thi công gợi ý đang lấy từ bảng tĩnh `plan[kind]` ở client (`technicianData.ts`). |
| Nút "Bắt đầu xử lý" (`start`) | Chuyển trạng thái từ `ASSIGNED` sang `IN_PROGRESS` | `PATCH /api/v1/incidents/{id}/status` (`to_status="IN_PROGRESS"`) | **Cần adapter** | Dùng `IncidentDetailOut.id` (UUID) để gọi `multipart/form-data` với `to_status="IN_PROGRESS"`. |

#### Màn 21: Báo cáo Nghiệm thu & Nộp Minh chứng (`/technician/tasks/[id]/resolve`) — `TaskResolveScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Tải ảnh minh chứng sau khắc phục & kiểm tra độ lệch GPS $< 50\text{m}$ | `photo: File`, `meters: number` (`gpsOk = meters < 50`), tag `NĐ13 Đã mờ` | `PATCH /api/v1/incidents/{id}/status` (`to_status="RESOLVED"`, `proof_image`) | **Cần adapter** | Client trích xuất GPS từ EXIF / Geolocation API để tính khoảng cách Haversine so với `(latitude, longitude)` của sự cố trước khi cho phép bấm gửi. |
| Biểu mẫu biên bản & Nút "Gửi biên bản" (`submit`) | `measure: string` (Biện pháp), `material: string` (Vật tư), `note: string` (Ghi chú lưu thông), `hash: string` (SHA256) | `PATCH /api/v1/incidents/{id}/status` (`to_status="RESOLVED"`, `note`, `proof_image`) | **Cần adapter** | Backend chỉ có 1 trường `note: str \| None` khi cập nhật `RESOLVED`. Nếu không mở rộng DB, adapter phải gộp `measure + material + note` vào trường `note`. |

#### Màn 22: Nhật ký Công tác & Vật tư Thi công (`/technician/history`) — `TechnicianHistoryScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Thống kê cá nhân KTV & Biểu đồ số vụ theo ngày trong tuần | `Đã sửa: number`, `Tỷ lệ đạt: number (%)`, `Vật tư dùng: number`, `weeks: { d: string, n: number }[]` | Không có endpoint thống kê riêng cho KTV | **Chỉ mock / Thiếu backend** | Backend chưa có API thống kê hiệu suất, vật tư tiêu hao và biểu đồ theo ngày của từng kỹ thuật viên. |
| Danh sách vụ việc đã xong (`jobs: Job[]`) | `code`, `title`, `address`, `time`, `mats: string`, `ok: boolean` (`Đạt` / `Làm lại`), ảnh Trước & Sau | `GET /api/v1/incidents` | **Cần adapter / Thiếu filter** | Cần lọc theo `assigned_technician_id` và trạng thái hoàn thành. `IncidentOut` trong danh sách chỉ có `anonymized_image_url` (ảnh Trước), chưa có `after_proof_image_url` (ảnh Sau nằm trong `IncidentDetailOut.media`). |

#### Màn 23: Trạng thái Trực ban & Vị trí KTV (`/technician/profile`) — `TechnicianProfileScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Công tắc Bật/Tắt ca trực (`on: boolean`, `secs: number`) | Trạng thái sẵn sàng nhận việc (`Đang trực` / `Ngoài ca`), thời gian trực | Không có | **Chỉ mock / Thiếu backend** | Model `User` chưa có trường trạng thái trực ban (`is_on_duty`) hay thời gian ca trực. |
| Trạng thái thiết bị & Định vị GPS hiện tại | Pin, mạng, đồng bộ dữ liệu, tọa độ GPS hiện tại của KTV | Không có (Browser APIs tại client) | **Chỉ mock** | Lấy từ Web APIs (`navigator.geolocation`, `navigator.getBattery`, `navigator.onLine`) hoặc mock tại client. |

---

### Nhóm VI: Quản Trị & Phân Tích (`06-quan-tri`)

#### Màn 24: Dashboard Chỉ số & GIS Heatmap (`/admin/analytics`) — `AnalyticsScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| 4 thẻ KPI tổng quan theo kỳ (`7 ngày` / `30 ngày`) | `Tổng sự cố: number`, `Đúng hạn SLA: number (%)`, `Giải quyết TB: number (phút)`, `Hài lòng: number (/100)` | `GET /api/v1/incidents/analytics/summary?from_date=...&to_date=...` | **Cần adapter / Thiếu 2 chỉ số** | Backend trả `total_incidents` và `sla_compliance.compliance_rate` (`Đúng hạn SLA`). Tuy nhiên backend **chưa trả** thời gian giải quyết trung bình (`Giải quyết TB` tính từ `resolved_at - created_at`) và điểm hài lòng trung bình (`Hài lòng` tính từ bảng `incident_feedback`). |
| Bản đồ Heatmap mật độ sự cố & Biểu đồ cột hoàn thành theo Quận | `districts: { name: string, count: number, done: number (%) }[]`, tọa độ các điểm sự cố để vẽ heatmap | `GET /api/v1/incidents/analytics/summary` & `GET /api/v1/incidents/map` | **Cần adapter** | `by_district` trong `/analytics/summary` trả tổng số sự cố theo quận (`count`), nhưng **chưa trả tỷ lệ % hoàn thành (`done`) theo từng quận**. Tọa độ điểm heatmap có thể lấy từ `GET /api/v1/incidents/map`. |

#### Màn 25: Quản lý Người dùng & Ma trận RBAC (`/admin/users`) — `UsersScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Danh sách người dùng, lọc theo vai trò & tìm kiếm | `User[]`: `id`, `name`, `contact` (email/SĐT), `role: 'CITIZEN'\|'DISPATCHER'\|'TECHNICIAN'\|'ADMIN'`, `unit: string`, `locked: boolean` | Không có (`GET /api/v1/users` chưa tồn tại) | **Thiếu backend** | Backend đã có model `User` (`id, email, phone, full_name, role, department_id`), nhưng **chưa có cột `is_locked`/`is_active`** và **chưa có bất kỳ endpoint quản trị người dùng nào** (`GET/POST/PATCH /api/v1/users`). |
| Thêm / Sửa người dùng, Đổi vai trò, Khóa / Mở khóa tài khoản | `name`, `contact`, `role`, `unit`, `locked` | Không có | **Thiếu backend** | Cần bổ sung CRUD `/api/v1/users` (yêu cầu quyền `ADMIN`). |

#### Màn 26: Quản lý Phân vùng Không gian GIS (`/admin/zones`) — `ZonesScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Bản đồ đa giác phân vùng & Danh sách vùng (`Zone[]`) | `id: string`, `name: string`, `open: number` (số phiếu đang mở trong vùng), `pts` (GeoJSON polygon), `on: boolean` (`is_active`) | `GET /api/v1/zones/active` & `GET /api/v1/incidents/analytics/summary` | **Cần adapter / Thiếu vùng tắt** | - `GET /api/v1/zones/active` chỉ trả các vùng đang có `is_active == True` (không trả các vùng đang tạm dừng `is_active == False`).<br>- Trong DB hiện tại, `system_zones` lưu 1 vùng lõi `DANANG_CORE` (8.007 đỉnh), trong khi UI hiển thị 7 vùng cấp Quận/Huyện (`Hải Châu`, `Thanh Khê`, ..., `Hòa Vang`). |
| Bật / Tắt tiếp nhận phản ánh tại từng vùng (`flip`) | `id: string`, `on: boolean` | Không có (`PATCH /api/v1/zones/{id}` chưa tồn tại) | **Thiếu backend** | Backend chưa có endpoint bật/tắt `is_active` của phân vùng. |

#### Màn 27: Cấu hình Danh mục, SLA & Đơn vị (`/admin/settings`) — `SettingsScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Cấu hình thời hạn SLA theo 4 mức độ (`urgent, high, normal, low`) | `{ urgent: number, high: number, normal: number, low: number }` (giờ) | Không có | **Thiếu backend** | Trong Backend, `default_sla_hours` hiện đang lưu trên từng dòng của bảng `categories`, không có bảng cấu hình SLA theo 4 mức `priority`. |
| Danh sách Danh mục sự cố & Công tắc Bật/Tắt | `name: string`, `code: string`, `sla: string`, `n: number` (số phiếu), `on: boolean` | `GET /api/v1/categories` (chỉ đọc) | **Thiếu backend (cho cập nhật)** | `GET /api/v1/categories` trả `id, code, name, default_sla_hours, default_department_id`. Model `Category` chưa có trường `is_active` (`on`) và chưa có endpoint `PATCH /api/v1/categories/{id}`. |
| Danh bạ Đơn vị & Thêm đơn vị mới (`units`) | `name: string`, `head: string` (người phụ trách), `phone: string`, `size: number` (số thành viên) | `GET /api/v1/departments` (chỉ đọc) | **Thiếu backend (cho tạo mới & trường phụ)** | `GET /api/v1/departments` trả `id, code, name, level, contact_email, contact_phone` (chưa có `head` và `size`). Chưa có `POST /api/v1/departments` để thêm đơn vị mới. |

#### Màn 28: Nhật ký Kiểm toán An toàn Audit Logs (`/admin/audit-logs`) — `AuditLogsScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Bảng tra cứu nhật ký hệ thống có phân trang & bộ lọc (`Log[]`) | `at: string`, `who: string`, `action: string`, `code: string`, `before: string`, `after: string`, `ip: string`, `today: boolean` | Không có (`GET /api/v1/audit-logs` chưa tồn tại) | **Thiếu backend** | Backend mới chỉ có bảng `incident_history` (lưu `from_status`, `to_status`, `actor_id`, `note`, `created_at` gắn với từng phiếu, chưa có `ip` hay log tác vụ quản trị user) và chưa có endpoint liệt kê toàn bộ lịch sử trên toàn hệ thống. |

#### Màn 29: Quản lý Kênh Ngoại vi & Webhook (`/admin/integrations`) — `IntegrationsScreen.tsx`
| Hạng mục UI | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Trạng thái 3 dịch vụ tích hợp (`DeepSeek Vision`, `Goong Maps`, `Messenger Webhook`) & Nút "Kiểm tra kết nối" | `id`, `name`, `status: 'ok'\|'slow'\|'down'`, `reqs: string` (lưu lượng 24h), `ms: number` (độ trễ), `series: number[]`, `checked: string` | `GET /api/health` (chỉ kiểm tra app chung) | **Chỉ mock / Thiếu backend** | Backend chưa có endpoint thống kê lưu lượng gọi API ngoại vi hay health-check từng dịch vụ tích hợp. |

---

### Nhóm VII: Hệ Thống & Ngoại Lệ (`07-ngoai-le`)

#### Màn 30–34: Các màn hình Ngoại lệ (`ExceptionScreens.tsx`)
| Màn hình & Route | Dữ liệu UI cần (trường, kiểu) | Endpoint Backend tương ứng | Trạng thái | Chi tiết chuyển đổi (Adapter) / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Màn 30: 404 Không tìm thấy trang** (`/404`) | Ô tìm kiếm mã phiếu `code: string` (`DN-YYYYMM-XXXX`) $\rightarrow$ chuyển tới `/tracking/{code}` | `GET /api/v1/incidents/{ticket_code}` | **Khớp** | Kiểm tra tồn tại mã phiếu hoặc điều hướng thẳng sang `/tracking/{code}`. |
| **Màn 31: 403 Từ chối quyền truy cập** (`/403`) | `role: string` từ phiên đăng nhập hiện tại để điều hướng về trang chủ theo vai trò | `GET /api/v1/auth/me` (hoặc đọc từ state auth đã lưu) | **Khớp** | Đọc `user.role` (chuyển chữ hoa `CITIZEN/DISPATCHER/TECHNICIAN/ADMIN` về chữ thường). |
| **Màn 32: 500 Lỗi máy chủ nội bộ** (`/500`) | `trace: string` (Trace ID tham chiếu lỗi) | Không có | **Chỉ mock (Client-side)** | Sinh mã tham chiếu tại client hoặc đọc từ header lỗi response nếu có. |
| **Màn 33: Bảo trì định kỳ** (`/maintenance`) | Đồng hồ đếm ngược thời gian bảo trì `left: number` (giây) | `GET /api/health` | **Chỉ mock (Client-side)** | Có thể dùng `GET /api/health` để kiểm tra khi nào máy chủ hoạt động trở lại. |
| **Màn 34: Mất kết nối ngoại tuyến** (`/offline`) | Hàng đợi phiếu lưu cục bộ `pending` (IndexedDB/localStorage) & nút "Thử gửi lại ngay" | `POST /api/v1/incidents` & `PATCH /api/v1/incidents/{id}/status` | **Cần adapter** | Khi có mạng trở lại (`navigator.onLine`), lặp qua hàng đợi offline để gọi API gửi phiếu / biên bản tương ứng. |

---

## 3. Tổng Hợp Quy Tắc Vòng Đời, SLA, Bảo Mật & Trạng Thái Đã Đồng Bộ Trên Backend

### 3.1. Vòng đời 9 trạng thái (`Status`) và ma trận phân quyền chuyển trạng thái
1. **Tập 9 trạng thái hợp lệ:** `SUBMITTED`, `TRIAGED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CONFIRMED`, `CLOSED`, `REJECTED`, `REOPENED` (đã đồng bộ đầy đủ trên `incidents.py`, `analytics/summary` và `open311.py`).
2. **Ma trận chuyển trạng thái hợp lệ (kiểm tra quyền `403` trước trạng thái nguồn `400`):**
   - `SUBMITTED -> TRIAGED`: Hệ thống AI (`process_incident_ai_triage`) hoặc `DISPATCHER`/`ADMIN` qua `PATCH /api/v1/incidents/{id_or_code}/triage` (từ `SUBMITTED` hoặc `TRIAGED`).
   - `{TRIAGED, ASSIGNED, REOPENED} -> ASSIGNED`: `DISPATCHER`/`ADMIN` qua `PATCH /api/v1/incidents/{id_or_code}/assign`. Khi `/triage` hoặc `/assign` được gọi, cờ `is_priority_suggested` chuyển về `False`.
   - `{SUBMITTED, TRIAGED, ASSIGNED} -> REJECTED`: `DISPATCHER`/`ADMIN` qua `PATCH /api/v1/incidents/{id_or_code}/status` (bắt buộc có `note` giải trình lý do).
   - `{ASSIGNED, REOPENED} -> IN_PROGRESS`: Chỉ `TECHNICIAN` được giao (`assigned_technician_id == current_user.id`) hoặc thuộc cùng đơn vị khi chưa gán đích danh (`assigned_technician_id is None and assigned_department_id == current_user.department_id`, tự động gán `assigned_technician_id = current_user.id`).
   - `IN_PROGRESS -> RESOLVED`: Chỉ `TECHNICIAN` phụ trách, bắt buộc tải ảnh `AFTER_PROOF` (hỗ trợ kèm `proof_latitude`, `proof_longitude`), ghi nhận `resolved_at = now`.
   - `RESOLVED -> CONFIRMED` và `RESOLVED -> REOPENED`: Chỉ `DISPATCHER`/`ADMIN` qua `PATCH /api/v1/incidents/{id_or_code}/status`.
   - `CONFIRMED -> CLOSED`:
     - Với phiếu có chủ (`citizen_id is not None`): chỉ chính công dân chủ phiếu (`citizen_id == current_user.id`) xác nhận qua `POST /api/v1/incidents/{id_or_code}/feedback` với `action="CONFIRM"` (`rating: 1..5` là tùy chọn, đóng phiếu không phụ thuộc số sao).
     - Với phiếu khách vãng lai (`citizen_id is None`): `DISPATCHER`/`ADMIN` được phép chuyển `CONFIRMED -> CLOSED` qua `PATCH /api/v1/incidents/{id_or_code}/status`.
     - Không có cơ chế tự đóng theo thời gian.
   - `CONFIRMED -> REOPENED`: Công dân chủ phiếu khiếu nại qua `POST /api/v1/incidents/{id_or_code}/feedback` với `action="DISPUTE"` và lý do `comment` bắt buộc (hỗ trợ cập nhật tại chỗ bản ghi `IncidentFeedback` khi lặp lại chu trình khiếu nại — xử lý lại — nghiệm thu lại — xác nhận đóng, và luôn ghi lý do vào `incident_history.note`).

### 3.2. Định danh phiếu (`UUID` hoặc `ticket_code`), AI trước khi gửi & Cam kết SLA
1. **Định danh linh hoạt (`{id_or_code}`):** Toàn bộ các endpoint `/api/v1/incidents/{id_or_code}/...` (`vote-duplicate`, `triage`, `assign`, `status`, `feedback`, `GET /{id_or_code}`) đều nhận trực tiếp cả `UUID` hoặc mã phiếu `DN-YYYYMM-XXXX`.
2. **Phân tích ảnh AI trước khi gửi (`POST /api/v1/incidents/analyze-image`) & Mức độ ưu tiên đề xuất:**
   - Làm mờ khuôn mặt/biển số xe theo Nghị định 13 trong thư mục tạm trước khi gọi DeepSeek Vision (xóa tệp tạm ngay trong `finally`, không lưu ảnh, không ghi nội dung ảnh/phân tích vào log; trả `502` thông điệp ngắn khi DeepSeek lỗi).
   - Giới hạn tần suất trong bộ nhớ tiến trình (mặc định 10 lần/phút qua `ANALYZE_IMAGE_RATE_LIMIT_PER_MINUTE`): khóa theo `user_id` khi đăng nhập, hoặc theo IP khách (chỉ lấy `X-Forwarded-For` khi nguồn kết nối thuộc `TRUSTED_PROXIES`).
   - `POST /api/v1/incidents` nhận thêm `category_code` và `priority` do người dân xác nhận kèm cờ `is_priority_suggested: bool` (`True` khi mới gửi/AI gợi ý, chuyển về `False` khi `/triage` hoặc `/assign` được gọi).
3. **Cách tính thời hạn cam kết `sla_due_at`:**
   - Hằng số theo mức độ ưu tiên: `EMERGENCY = 4h`, `HIGH = 12h`, `NORMAL = 24h`, `LOW = 48h`.
   - Tính từ `created_at` khi tạo phiếu và tính lại từ `created_at` khi đổi `priority` ở bước `/triage`.
   - **Đặt lại hạn khi mở lại (`REOPENED`):** Khi phiếu chuyển sang `REOPENED` (do điều phối yêu cầu làm lại từ `RESOLVED` hoặc công dân khiếu nại từ `CONFIRMED`), hệ thống xóa `resolved_at = None` và **tính hạn `sla_due_at` mới bắt đầu từ thời điểm mở lại** theo `priority` hiện tại.

### 3.3. Thứ tự tọa độ GIS (`lat, lon` vs `lon, lat`)
- Trong CSDL PostGIS (`ST_MakePoint(longitude, latitude)`) và endpoint bản đồ GeoJSON `GET /api/v1/incidents/map` (`IncidentMapGeometry.coordinates`), thứ tự luôn là **`[longitude, latitude]`**.
- Trong các form/query/schema REST khác của Backend (`POST /api/v1/incidents`, `GET /api/v1/incidents/nearby`, `POST /api/v1/zones/validate-location`, `IncidentOut`, `IncidentMediaOut`), hai trường được tách tường minh là `latitude` và `longitude`.

### 3.4. Phân loại ảnh hiện trường & Quyền riêng tư
- 3 nhãn `media_type` chuẩn trong CSDL:
  - `BEFORE_ORIGINAL`: Ảnh gốc trước khi làm mờ (lưu ở `/uploads/private/`, chỉ trả về cho `ADMIN` và `DISPATCHER`).
  - `BEFORE_ANONYMIZED`: Ảnh trước xử lý đã làm mờ khuôn mặt/biển số theo Nghị định 13 (lưu ở `/uploads/public/`, trả về công khai).
  - `AFTER_PROOF`: Ảnh minh chứng sau khi kỹ thuật viên khắc phục (đã làm mờ Nghị định 13, lưu ở `/uploads/public/`, kèm `latitude`/`longitude` hiện trường).
- Quy tắc bảo mật trường nhạy cảm:
  - `rejection_reason` (và `note` của bước `REJECTED` trong `history`): chỉ trả về cho công dân chủ phiếu, `DISPATCHER`, hoặc `ADMIN`.
  - `assigned_technician_name`: trả họ tên đầy đủ khi người gọi đã đăng nhập, hoặc rút gọn (họ + chữ cái đầu tên đệm/tên, ví dụ `"Trần V. K."`) khi truy vấn ẩn danh.


