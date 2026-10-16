# Kế hoạch Triển khai: Điều phối & Vòng đời Xử lý Sự cố Hiện trường (Incident Workflow, Triage & Field Resolution)

> **Mã kế hoạch:** `incident-workflow-and-resolution`  
> **Tài liệu đặc tả liên quan:** `docs/spec.md` (Mục 1.2, Mục 4.1, Mục 4.2, Mục 6.3)  
> **Quy tắc tuân thủ:** `AGENTS.md`, `.agents/rules/backend-fastapi-postgis.md`, `.agents/rules/incident-domain-invariants.md`

---

## 1. Mục tiêu & Phạm vi (Goals & Scope)

### Mục tiêu chính
Hoàn thiện toàn bộ quy trình nghiệp vụ khép kín của sự cố hạ tầng đô thị Đà Nẵng từ khi tiếp nhận đến khi hoàn thành và đánh giá:
1. **Duyệt phân loại & Điều phối (Triage & Dispatch):** Điều phối viên duyệt kết quả gợi ý từ AI hoặc điều chỉnh danh mục, mức độ ưu tiên, hạn xử lý SLA và cơ quan/đơn vị xử lý (`PATCH /api/v1/incidents/{id}/triage`).
2. **Giao việc cán bộ kỹ thuật (Assign):** Phân công kỹ thuật viên hiện trường cụ thể (`PATCH /api/v1/incidents/{id}/assign`).
3. **Quản lý Vòng đời & Minh chứng hoàn thành (State Machine & Proof of Work):**
   - Chuyển `ASSIGNED` $\rightarrow$ `IN_PROGRESS` khi cán bộ nhận việc.
   - Chuyển `IN_PROGRESS` $\rightarrow$ `RESOLVED`: Bắt buộc tải lên ảnh minh chứng sau sửa chữa (`media_type = AFTER_PROOF`) và lưu thời điểm `resolved_at`.
   - Từ chối phản ánh không hợp lệ (`REJECTED`) kèm lý do giải trình.
4. **Đánh giá Hài lòng & Khiếu nại mở lại sự cố (Citizen Feedback & Dispute Reopen):**
   - Công dân đánh giá 1-5 sao qua `POST /api/v1/incidents/{id}/feedback`.
   - Nếu $\ge 3$ sao: Chuyển trạng thái sang `CONFIRMED`.
   - Nếu $\le 2$ sao (khiếu nại): Tự động Reopen sự cố quay về `IN_PROGRESS`, đặt lại `resolved_at = NULL` và ghi audit trail.
5. **Bản đồ số GeoJSON & Thống kê Điều hành IOC:**
   - `GET /api/v1/incidents/map`: Trả về GeoJSON FeatureCollection các điểm sự cố phục vụ hiển thị trực tiếp trên MapLibre GL.
   - `GET /api/v1/incidents/analytics/summary`: Thống kê tổng số, theo trạng thái, theo quận/huyện và tỷ lệ tuân thủ hạn cam kết SLA.

### Phạm vi ảnh hưởng (Allowed Files)
- `docs/plans/incident-workflow-and-resolution.md`: Kế hoạch chi tiết và tiến độ.
- `backend/app/schemas/incident.py`: Pydantic v2 schemas cho Triage, Assign, StatusUpdate, Feedback, GeoJSON Map và Analytics.
- `backend/app/schemas/__init__.py`: Export các schemas mới.
- `backend/app/api/v1/endpoints/incidents.py`: Cập nhật logic các endpoints điều phối, trạng thái, feedback, map và analytics.
- `backend/tests/test_incident_workflow.py`: Bộ kiểm thử tự động toàn diện độc lập (mock 100%).

### Giới hạn nghiêm ngặt (Non-goals)
- Không sửa đổi database models hay chạy destructive migrations (các bảng `incidents`, `incident_media`, `incident_history`, `incident_feedback` đã có đầy đủ trường).
- Không sửa đổi logic xác thực auth/RBAC nền tảng (`backend/app/api/v1/endpoints/auth.py`).
- Không làm giao diện Web Next.js hay Facebook Bot trong tính năng này (dành cho các phase tiếp theo).

---

## 2. Thứ tự Các Bước Triển khai (Ordered Steps)

### [x] Bước 1: Định nghĩa Pydantic Schemas cho Điều phối, Trạng thái, Feedback, Map & Analytics
* **Mục tiêu:** Bổ sung các schema chuẩn Pydantic v2, strict typing (không dùng `Any`).
* **Hành động:**
  * Tại `backend/app/schemas/incident.py`:
    * `IncidentTriageIn`: `category_id: UUID`, `priority: str`, `assigned_department_id: UUID`, `note: str | None = None`.
    * `IncidentAssignIn`: `assigned_department_id: UUID | None = None`, `assigned_technician_id: UUID | None = None`, `note: str | None = None`.
    * `IncidentStatusUpdateIn`: `status: str`, `note: str | None = None`.
    * `IncidentFeedbackCreateIn`: `rating: int = Field(..., ge=1, le=5)`, `comment: str | None = None`.
    * `IncidentFeedbackOut`: `id: UUID`, `incident_id: UUID`, `citizen_id: UUID`, `rating: int`, `comment: str | None`, `created_at: datetime`.
    * `IncidentMapProperties`: Thông tin thuộc tính điểm sự cố trên bản đồ (`id`, `ticket_code`, `title`, `status`, `priority`, `category_code`, `category_name`, `district`, `address_text`, `sla_due_at`, `is_overdue`, `anonymized_image_url`, `created_at`).
    * `IncidentMapFeature`: GeoJSON Feature chuẩn RFC 7946 (`type: "Feature"`, `geometry: dict`, `properties: IncidentMapProperties`).
    * `IncidentMapFeatureCollectionOut`: GeoJSON FeatureCollection (`type: "FeatureCollection"`, `features: list[IncidentMapFeature]`).
    * `IncidentAnalyticsSummaryOut`: Thống kê tổng thể (`total_incidents`, `by_status: dict[str, int]`, `by_priority: dict[str, int]`, `by_district: dict[str, int]`, `sla_compliance: dict[str, object]`).
  * Export trong `backend/app/schemas/__init__.py`.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`
  * `py -m pytest backend/tests/test_schemas_incident.py -v`
* **Kết quả:** Đã hoàn thành, Reviewer audit: `STATUS: PASS`, 23/23 unit tests passed.

---

### [x] Bước 2: Xây dựng Endpoint Điều phối Triage & Phân công (`PATCH /{id}/triage`, `PATCH /{id}/assign`)
* **Mục tiêu:** Cung cấp API cho Điều phối viên (IOC Dispatcher) duyệt phân loại và giao đơn vị chịu trách nhiệm.
* **Hành động:**
  * Thêm `PATCH /api/v1/incidents/{id}/triage` vào `backend/app/api/v1/endpoints/incidents.py`:
    * Kiểm tra quyền RBAC: `current_user` phải có role `DISPATCHER` hoặc `ADMIN`.
    * Kiểm tra `category_id` và `assigned_department_id` hợp lệ trong CSDL.
    * Terminal status guard: Chặn không cho triage sự cố đã `CLOSED` hoặc `REJECTED`.
    * Tính toán `sla_due_at`: lấy `default_sla_hours` từ category, tính `now + timedelta(hours=sla_hours)` (nếu `priority == "EMERGENCY"` có thể rút ngắn 50%).
    * Chuyển trạng thái `status = "TRIAGED"`.
    * Ghi `IncidentHistory` (`from_status`, `to_status`, `actor_id = current_user.id`, `note`).
  * Thêm `PATCH /api/v1/incidents/{id}/assign`:
    * Kiểm tra quyền RBAC: `DISPATCHER` hoặc `ADMIN`.
    * Terminal status guard: Chặn không cho assign sự cố đã `CLOSED` hoặc `REJECTED`.
    * Gán `assigned_department_id` và/hoặc `assigned_technician_id` (xác thực role thuộc `TECHNICIAN`, `DISPATCHER`, `ADMIN`).
    * Chuyển trạng thái sang `"ASSIGNED"`.
    * Ghi `IncidentHistory`.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app backend/tests`
  * `py -m pytest backend/tests/test_incident_workflow.py -v`
* **Kết quả:** Đã hoàn thành, Reviewer audit: `STATUS: PASS`, 13/13 unit tests passed.

---

### [x] Bước 3: Xây dựng Endpoint Cập nhật Tiến độ & Minh chứng Hoàn thành (`PATCH /{id}/status`)
* **Mục tiêu:** Quản lý vòng đời xử lý và bắt buộc có minh chứng hình ảnh (`AFTER_PROOF`) khi chuyển sang `RESOLVED`.
* **Hành động:**
  * Thêm `PATCH /api/v1/incidents/{id}/status`:
    * Nhận dữ liệu qua Form: `to_status: str = Form(...)`, `note: str | None = Form(None)`, `proof_image: UploadFile | None = File(None)`.
    * RBAC: `TECHNICIAN`, `DISPATCHER`, `ADMIN` (riêng `REJECTED` và `CLOSED` chỉ `DISPATCHER`, `ADMIN`).
    * Terminal status guard: Chặn cập nhật với sự cố đã ở trạng thái kết thúc (`CLOSED`, `REJECTED`).
    * Kiểm tra chuyển đổi trạng thái hợp lệ:
      * Sang `IN_PROGRESS`: Chỉ cho phép khi trạng thái hiện tại là `ASSIGNED` hoặc `RESOLVED` (mở lại; tự động đặt lại `resolved_at = None`).
      * Sang `RESOLVED`: BẮT BUỘC phải cung cấp `proof_image` (hoặc đã có `IncidentMedia` với `media_type = AFTER_PROOF`).
        * Xử lý file ảnh minh chứng: Lưu vào `backend/uploads/public/{id}_proof_{filename}`, áp dụng làm mờ nếu phát hiện khuôn mặt/biển số xe (NĐ 13/2023) để người dân kiểm tra an toàn.
        * Tạo bản ghi `IncidentMedia` với `media_type = "AFTER_PROOF"`.
        * Cập nhật `resolved_at = datetime.now(timezone.utc)`.
      * Sang `REJECTED`: Bắt buộc phải có `note` giải trình lý do từ chối.
      * Sang `CLOSED`: Chỉ đóng từ `RESOLVED` hoặc `CONFIRMED`.
    * Ghi bản ghi vào `IncidentHistory`.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app backend/tests`
  * `py -m pytest backend/tests/test_incident_workflow.py -v`
* **Kết quả:** Đã hoàn thành, Reviewer audit: `STATUS: PASS`, 26/26 unit tests passed.

---

### [ ] Bước 4: Xây dựng Endpoint Đánh giá Hài lòng & Khiếu nại Mở lại (`POST /{id}/feedback`)
* **Mục tiêu:** Cho phép người dân chấm điểm sau khắc phục và tự động kích hoạt cơ chế mở lại nếu không hài lòng.
* **Hành động:**
  * Thêm `POST /api/v1/incidents/{id}/feedback`:
    * Dependency: `current_user: User = Depends(get_current_user)`.
    * Kiểm tra điều kiện: Sự cố phải ở trạng thái `RESOLVED`. Nếu chưa `RESOLVED`, trả về `400 Bad Request`.
    * Kiểm tra sự cố chưa từng được đánh giá (tránh vote lặp nhiều lần).
    * Tạo bản ghi `IncidentFeedback`: `incident_id`, `citizen_id = current_user.id`, `rating`, `comment`.
    * State machine transition:
      * Nếu `rating >= 3`: Chuyển `status = "CONFIRMED"`, ghi `IncidentHistory` (`note="Citizen accepted resolution"`).
      * Nếu `rating <= 2` (khiếu nại): Chuyển ngược `status = "IN_PROGRESS"`, đặt lại `resolved_at = None`, ghi `IncidentHistory` (`note=f"Khiếu nại chưa hài lòng ({rating} sao): {comment or ''}"`).
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`

---

### [ ] Bước 5: Xây dựng Endpoints Bản đồ GeoJSON (`GET /map`) & Thống kê Điều hành (`GET /analytics/summary`)
* **Mục tiêu:** Cung cấp API hiển thị không gian và thống kê KPI cho màn hình điều hành IOC / Bản đồ sự cố.
* **Hành động:**
  * **Lưu ý đặc biệt:** Đặt các routes này **TRƯỚC** route `GET /{ticket_code}` để tránh xung đột path routing.
  * `GET /api/v1/incidents/map`:
    * Query params lọc tùy chọn: `district`, `category_code`, `status`.
    * Lấy danh sách sự cố có trạng thái đang mở (`NOT IN ('CLOSED', 'REJECTED')`).
    * Trích xuất `coordinates: [lon, lat]` từ PostGIS location.
    * Tính toán `is_overdue`: `sla_due_at is not None and now > sla_due_at and status not in ('RESOLVED', 'CONFIRMED', 'CLOSED')`.
    * Trả về GeoJSON `FeatureCollection`.
  * `GET /api/v1/incidents/analytics/summary`:
    * Truy vấn tổng hợp từ CSDL:
      * Đếm theo từng `status`.
      * Đếm theo từng `priority`.
      * Đếm theo từng `district`.
      * Tỷ lệ tuân thủ SLA: số sự cố hoàn thành đúng hạn vs trễ hạn, phần trăm hoàn thành đúng hạn.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`

---

### [ ] Bước 6: Viết Bộ Test Suite Tự động Toàn diện (`backend/tests/test_incident_workflow.py`) & Reviewer Audit
* **Mục tiêu:** Kiểm thử toàn diện 100% các luồng nghiệp vụ trên mà không phụ thuộc hạ tầng live.
* **Hành động:**
  * Tạo `backend/tests/test_incident_workflow.py` bao phủ:
    1. `test_triage_incident_dispatcher_success`: Dispatcher duyệt triage gán category, SLA, department $\rightarrow$ status `TRIAGED`, ghi audit history.
    2. `test_triage_incident_citizen_forbidden`: Citizen gọi triage $\rightarrow$ `403 Forbidden`.
    3. `test_assign_incident_to_technician`: Dispatcher gán cán bộ hiện trường $\rightarrow$ status `ASSIGNED`.
    4. `test_status_transition_to_in_progress`: Technician nhận việc $\rightarrow$ status `IN_PROGRESS`.
    5. `test_status_transition_to_resolved_without_proof_fails`: Chuyển sang `RESOLVED` không gửi ảnh $\rightarrow$ `400 Bad Request`.
    6. `test_status_transition_to_resolved_with_proof_success`: Chuyển sang `RESOLVED` kèm ảnh minh chứng $\rightarrow$ lưu `AFTER_PROOF`, ghi `resolved_at`, status `RESOLVED`.
    7. `test_status_transition_to_rejected`: Từ chối sự cố kèm lý do $\rightarrow$ status `REJECTED`.
    8. `test_citizen_feedback_satisfied_confirmed`: Công dân đánh giá 5 sao $\rightarrow$ status `CONFIRMED`.
    9. `test_citizen_feedback_disputed_reopens_to_in_progress`: Công dân đánh giá 1 sao $\rightarrow$ revert sang `IN_PROGRESS`, `resolved_at` đặt về `None`.
    10. `test_citizen_feedback_on_unresolved_incident_fails`: Gửi feedback khi chưa `RESOLVED` $\rightarrow$ `400 Bad Request`.
    11. `test_get_incidents_map_geojson`: Gọi `GET /map` $\rightarrow$ chuẩn RFC 7946 GeoJSON FeatureCollection, tọa độ `[lon, lat]`, cờ `is_overdue`.
    12. `test_get_incidents_analytics_summary`: Gọi `GET /analytics/summary` $\rightarrow$ trả về thống kê `by_status`, `by_priority`, `by_district`, `sla_compliance`.
  * Chạy toàn bộ test suite dự án (`pytest`).
  * Spawn subagent `reviewer` thẩm định độc lập.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`
  * `py -m pytest backend/tests/test_incident_workflow.py -v`
  * `py -m pytest` (toàn bộ test suite)

---

## 3. Rủi ro & Biện pháp Xử lý (Risks & Mitigations)

1. **Xung đột URL Path trong FastAPI:**
   * *Rủi ro:* Route `GET /map` hoặc `GET /analytics/summary` bị bắt nhầm bởi route động `GET /{ticket_code}`.
   * *Biện pháp:* Khai báo tường minh các routes tĩnh (`/map`, `/analytics/summary`) phía trên route động `/{ticket_code}` trong router.
2. **Quyền riêng tư trong ảnh minh chứng `AFTER_PROOF`:**
   * *Rủi ro:* Cán bộ chụp ảnh sau sửa chữa có thể vô tình dính khuôn mặt người dân hoặc biển số xe trên đường.
   * *Biện pháp:* Tái sử dụng `anonymize_image` từ `app.services.anonymizer` làm mờ ảnh `AFTER_PROOF` trước khi lưu vào `backend/uploads/public/`.
3. **An toàn Bất đồng bộ & Quan hệ ORM (MissingGreenlet):**
   * *Rủi ro:* Truy cập các quan hệ `feedback`, `history`, `media`, `category`, `assigned_department` khi chưa nạp `selectinload`.
   * *Biện pháp:* Luôn dùng `selectinload` tường minh trong câu truy vấn SQLAlchemy.
