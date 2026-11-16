# Kế Hoạch Hoàn Thiện Pha Backend Phụ Trợ & Dọn Dẹp Tài Liệu (`backend-auxiliary-completion.md`)

> **Nhánh thực hiện:** `feat/backend-auxiliary-completion` (tách từ `main` sau khi đã merge `feat/backend-lifecycle-alignment`)  
> **Mục tiêu:** Hoàn tất toàn bộ các endpoint Backend phụ trợ còn thiếu trong bảng đối chiếu `docs/ui-api-mapping.md` (Quản trị Users/RBAC, Zones, Categories/Departments, Audit Logs, Hồ sơ cá nhân `/auth/me`, Gộp 2 phiếu trùng lặp cho Điều phối viên, và Danh sách `GET /open311/v2/requests.json`), đồng thời dọn dẹp các tài liệu cũ/lỗi thời trong `docs/` để sẵn sàng ráp nối UI và Backend suôn sẻ.

---

## 1. Phạm vi & Giới hạn (Scope & Non-goals)

### 1.1. Phạm vi thực hiện (In-Scope)
1. **Dọn dẹp tài liệu (`docs/`):** Lược bỏ các file kế hoạch UI/Figma v1 cũ, các kế hoạch scaffolding giai đoạn đầu đã lỗi thời và bản sao thừa (`de_cuong_chi_tiet copy.md`); cập nhật `docs/checkpoint.md` và mục màu sắc trong `docs/PROJECT_CONTEXT_HANDOFF.md`.
2. **Hồ sơ cá nhân & Mật khẩu (Màn 9 — `/profile`):**
   - `PATCH /api/v1/auth/me`: Cập nhật `full_name`, `phone`, `avatar_url`.
   - `POST /api/v1/auth/change-password`: Đổi mật khẩu (xác minh `current_password`, cập nhật `new_password`).
3. **Quản trị Người dùng & Khóa tài khoản RBAC (Màn 25 — `/admin/users`):**
   - Thêm cột `is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)` vào `User` (`backend/app/models/user.py`) kèm câu lệnh idempotent `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;` trong `backend/scripts/init_db.py`.
   - Chặn đăng nhập (`403 Forbidden`) tại `/auth/login`, `/auth/google` và dependency `get_current_user` khi `user.is_locked == True`.
   - Tạo router `/api/v1/users` (chỉ `ADMIN`):
     - `GET /api/v1/users`: Danh sách người dùng (lọc theo `role`, `department_id`, `q`, `is_locked`, có phân trang).
     - `POST /api/v1/users`: Tạo tài khoản cán bộ/người dùng mới (`email`, `phone`, `full_name`, `password`, `role`, `department_id`).
     - `PATCH /api/v1/users/{user_id}`: Cập nhật `full_name`, `phone`, `role`, `department_id`, `is_locked` (chặn tự khóa chính mình).
4. **Quản trị Phân vùng GIS, Danh mục & Đơn vị (Màn 26 & 27 — `/admin/zones`, `/admin/settings`):**
   - Thêm cột `is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)` vào `Category` (`backend/app/models/category.py`) kèm migration `ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;`.
   - `GET /api/v1/zones` (trả toàn bộ phân vùng cả đang bật và đang tắt kèm số phiếu đang mở `open_incident_count`) và `PATCH /api/v1/zones/{zone_id}` (chỉ `ADMIN`, bật/tắt `is_active`, cập nhật `name`/`description`).
   - `PATCH /api/v1/categories/{category_id}` (chỉ `ADMIN`, cập nhật `name`, `default_sla_hours`, `default_department_id`, `is_active`).
   - `POST /api/v1/departments` và `PATCH /api/v1/departments/{department_id}` (chỉ `ADMIN`, thêm/cập nhật đơn vị xử lý).
5. **Nhật ký Kiểm toán Toàn hệ thống & Gộp phiếu trùng cho Điều phối (Màn 14 & 28 — `/dispatcher/command-center`, `/admin/audit-logs`):**
   - `GET /api/v1/audit-logs` (chỉ `ADMIN` và `DISPATCHER`): Truy vấn phân trang toàn bộ lịch sử biến động `IncidentHistory` kết hợp thông tin `ticket_code`, `actor_name`, `actor_role`, lọc theo `ticket_code`, `actor_id`, `to_status`, `from_date`, `to_date`.
   - `POST /api/v1/incidents/{id_or_code}/merge-duplicate` (chỉ `ADMIN` và `DISPATCHER`): Gộp một phiếu trùng lặp (`duplicate_incident_id_or_code`) vào phiếu gốc (`id_or_code`), gán `dup.is_duplicate_of_id = primary.id`, chuyển `dup.status = "REJECTED"` (kèm ghi chú gộp trùng vào `IncidentHistory`), và tăng `primary.duplicate_count += 1`.
6. **Danh sách Yêu cầu Open311 (Màn 5 — `/developers/open311`):**
   - `GET /open311/v2/requests.json`: Liệt kê danh sách yêu cầu theo chuẩn Open311 GeoReport v2, hỗ trợ lọc `service_code`, `status` (`open` / `closed`), `start_date`, `end_date`, `limit` (mặc định 20, tối đa 100).
7. **Cập nhật `docs/openapi.json` & `docs/ui-api-mapping.md`:** Tái xuất `docs/openapi.json` và cập nhật trạng thái các màn hình tương ứng trong `docs/ui-api-mapping.md` sang **Khớp / Đã có backend**.

### 1.2. Các vùng cấm tuyệt đối (Non-goals)
- **KHÔNG** sửa bất kỳ file nào trong `ui-prototype/` hoặc `frontend/`.
- **KHÔNG** làm backend cho OTP SMS/Email (`/auth/forgot-password`, OTP đăng nhập/đăng ký — đã chốt không làm ở pha trước).
- **KHÔNG** làm hệ thống chat thời gian thực (WebSocket) hay GPS telemetry thời gian thực của xe cơ động.

---

## 2. Danh Sách Tài Liệu Lược Bỏ & Cập Nhật

### 2.1. Các file XÓA (10 file: 1 bản sao thừa + 9 kế hoạch UI/Figma v1 cũ đã hủy bỏ)
1. **Bản sao thừa trong `docs/report/` (1 file):**
   - `docs/report/de_cuong_chi_tiet copy.md` (bản copy trùng lặp với `docs/report/de_cuong_chi_tiet.md`).
2. **Các kế hoạch UI / Figma v1 cũ (shadcn, AppShell `#1051A6`, Linear Dark Mode) trước khi Reset UI V2 (9 file):**
   - `docs/plans/citizen-incident-reporting-ui.md`
   - `docs/plans/danang-core-appshell-and-map.md`
   - `docs/plans/detailed-vector-map-and-full-boundary.md`
   - `docs/plans/figma-shadcn-citizen-ui.md`
   - `docs/plans/fix-maplibre-worker-load.md`
   - `docs/plans/frontend-shadcn-design-system.md`
   - `docs/plans/linear-style-ioc-sample.md`
   - `docs/plans/modern-linear-citizen-ui.md`
   - `docs/plans/screen-4-technician-resolution-and-verification.md`

### 2.2. Các file GIỮ LẠI & CẬP NHẬT trong `docs/`
- **Giữ nguyên toàn bộ các kế hoạch tính năng Backend, GIS, Goong Maps, Facebook Messenger Webhook, Open311:**
  - `docs/plans/project-scaffolding.md`
  - `docs/plans/db-and-system-zones.md`
  - `docs/plans/auth-and-rbac.md`
  - `docs/plans/incident-ingestion-api.md`
  - `docs/plans/incident-workflow-and-resolution.md`
  - `docs/plans/open311-georeport-v2.md`
  - `docs/plans/facebook-messenger-webhook.md`
  - `docs/plans/messenger-smart-location-parser.md`
  - `docs/plans/goong-map-and-gadm-boundary.md`
  - `docs/plans/high-precision-gis-boundary-and-zone-delineation.md`
  - `docs/plans/backend-lifecycle-alignment.md`
  - `docs/plans/backend-auxiliary-completion.md`
- **Tài liệu cốt lõi & Cập nhật ở Bước 1 và Bước 5:**
  - `docs/spec.md`, `docs/screen.md`, `docs/design-direction.md`, `docs/lessons-learned.md`, `docs/research/urban-incident-management-danang.md`, `docs/report/de_cuong_chi_tiet.md`
  - `docs/PROJECT_CONTEXT_HANDOFF.md` (Cập nhật mục màu sắc theo `design-direction.md` và tiến độ mới)
  - `docs/checkpoint.md` (Cập nhật toàn diện ở Bước 5 sau khi hoàn tất pha Backend phụ trợ)
  - `docs/openapi.json` & `docs/ui-api-mapping.md` (Cập nhật ở Bước 5)

---

## 3. Danh Sách File Được Phép Thay Đổi (Allowed Files)

- `backend/app/api/deps.py`
- `backend/app/api/open311.py`
- `backend/app/api/v1/router.py`
- `backend/app/api/v1/endpoints/auth.py`
- `backend/app/api/v1/endpoints/users.py` *(tạo mới)*
- `backend/app/api/v1/endpoints/zones.py`
- `backend/app/api/v1/endpoints/categories.py`
- `backend/app/api/v1/endpoints/departments.py`
- `backend/app/api/v1/endpoints/incidents.py`
- `backend/app/api/v1/endpoints/audit_logs.py` *(tạo mới)*
- `backend/app/models/user.py`
- `backend/app/models/category.py`
- `backend/app/schemas/auth.py`
- `backend/app/schemas/zone.py`
- `backend/app/schemas/incident.py`
- `backend/scripts/init_db.py`
- `backend/tests/test_auth.py`
- `backend/tests/test_auxiliary_admin_and_open311.py` *(tạo mới)*
- `backend/tests/test_e2e_lifecycle_db.py`
- `docs/openapi.json`
- `docs/ui-api-mapping.md`
- `docs/PROJECT_CONTEXT_HANDOFF.md`
- `docs/checkpoint.md`
- `docs/plans/backend-auxiliary-completion.md`
- *(Cùng 10 file kế hoạch UI v1 cũ & bản sao thừa được xóa tại mục 2.1)*

---

## 4. Các Bước Thực Hiện Tuần Tự (5 Commits)

### [x] Bước 1: Dọn dẹp các tài liệu lỗi thời trong `docs/` & Cập nhật `PROJECT_CONTEXT_HANDOFF.md`
- Xóa các file tài liệu lỗi thời tại mục 2.1 (sau khi bạn xác nhận).
- Cập nhật mục 5 của `docs/PROJECT_CONTEXT_HANDOFF.md` theo đúng bảng màu trong `docs/design-direction.md` (`#111111` đen chủ đạo, `#E5251B` đỏ nhấn, `#16A34A` hoàn tất) và số lượng bài kiểm thử mới.
- **Commit 1:** `docs: remove obsolete v1 plans and align project handoff docs`

### [x] Bước 2: Hồ sơ cá nhân (`/auth/me`, `/auth/change-password`) & Quản trị Người dùng (`/api/v1/users` + `is_locked`)
- Thêm `is_locked` vào model `User` và `SCHEMA_ALTER_STATEMENTS` trong `backend/scripts/init_db.py`.
- Kiểm tra `user.is_locked` trong `/auth/login`, `/auth/google` và `get_current_user` (trả `403` nếu tài khoản bị khóa).
- Thêm `PATCH /api/v1/auth/me` và `POST /api/v1/auth/change-password` trong `backend/app/api/v1/endpoints/auth.py`.
- Tạo `backend/app/api/v1/endpoints/users.py` với `GET /api/v1/users`, `POST /api/v1/users`, `PATCH /api/v1/users/{user_id}` (chỉ `ADMIN`).
- Viết unit/integration tests kiểm tra đầy đủ các luồng trên.
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 2:** `feat(users): add profile update, password change, and admin user management with account lock`

### [ ] Bước 3: Quản trị Phân vùng GIS (`/zones`), Danh mục (`/categories`) & Đơn vị (`/departments`)
- Thêm `is_active` vào model `Category` và `SCHEMA_ALTER_STATEMENTS` trong `backend/scripts/init_db.py`.
- Mở rộng `backend/app/api/v1/endpoints/zones.py`: thêm `GET /api/v1/zones` (trả tất cả vùng kèm `open_incident_count`) và `PATCH /api/v1/zones/{zone_id}` (chỉ `ADMIN`).
- Mở rộng `backend/app/api/v1/endpoints/categories.py`: thêm `PATCH /api/v1/categories/{category_id}` (chỉ `ADMIN`).
- Mở rộng `backend/app/api/v1/endpoints/departments.py`: thêm `POST /api/v1/departments` và `PATCH /api/v1/departments/{department_id}` (chỉ `ADMIN`).
- Viết tests cho toàn bộ các endpoint quản trị cấu hình.
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 3:** `feat(admin): add zone toggle, category config update, and department management endpoints`

### [ ] Bước 4: Nhật ký Kiểm toán (`GET /api/v1/audit-logs`), Gộp phiếu trùng (`POST /incidents/{id_or_code}/merge-duplicate`) & Danh sách Open311 (`GET /open311/v2/requests.json`)
- Tạo `backend/app/api/v1/endpoints/audit_logs.py` (`GET /api/v1/audit-logs` có phân trang và bộ lọc cho `ADMIN`, `DISPATCHER`).
- Thêm `POST /api/v1/incidents/{id_or_code}/merge-duplicate` trong `backend/app/api/v1/endpoints/incidents.py` cho `ADMIN`, `DISPATCHER`.
- Thêm `GET /open311/v2/requests.json` trong `backend/app/api/open311.py` (lọc `service_code`, `status=open|closed`, `limit`).
- Viết tests cho cả 3 tính năng.
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 4:** `feat(ops): add system audit logs, dispatcher duplicate merge, and Open311 requests list`

### [ ] Bước 5: Cập nhật `docs/openapi.json` và `docs/ui-api-mapping.md`
- Chạy `py backend/scripts/export_openapi.py` để cập nhật `docs/openapi.json` và bổ sung kiểm tra schema mới trong `test_e2e_lifecycle_db.py`.
- Cập nhật bảng trạng thái trong `docs/ui-api-mapping.md` cho các màn hình 5, 9, 14, 25, 26, 27, 28.
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 5:** `docs(api): regenerate openapi.json and update ui-api-mapping for auxiliary endpoints`
