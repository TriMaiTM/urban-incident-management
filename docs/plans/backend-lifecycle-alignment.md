# Kế Hoạch Đồng Bộ Backend Theo Vòng Đời Mới & Đặc Tả UI-API (`backend-lifecycle-alignment.md`)

## 1. Mục tiêu (Goal)
Đồng bộ toàn bộ máy trạng thái (State Machine), cách tính hạn SLA, bộ lọc truy vấn, schema phản hồi, chỉ số thống kê Analytics và endpoint phân tích ảnh AI trên Backend (`backend/app`) theo đúng quyết định nghiệp vụ tại `ui-prototype/guidelines/lifecycle.md` và bảng đối chiếu `docs/ui-api-mapping.md`, mỗi bước thực hiện là một commit độc lập có kiểm thử tự động (`pytest`).

## 2. Kết quả Kiểm tra Bước 0 (Read-Only Audit)

### 2.1. Hiện trạng `REOPENED` trên Backend
- **Database Model & Migration (`backend/app/models/incident.py`, `backend/scripts/init_db.py`):**
  - Cột `Incident.status`, `IncidentHistory.from_status`, `IncidentHistory.to_status` đều khai báo kiểu `String(50)` (`VARCHAR(50)`), **không dùng PostgreSQL native `ENUM`** và không có ràng buộc `CHECK` cứng trong DB. Do đó không cần migration đổi kiểu `ENUM` cho `REOPENED`.
  - Cập nhật model `IncidentFeedback.rating` sang `nullable=True` (cho phép đánh giá sao tùy chọn khi xác nhận đóng phiếu) và thêm `latitude`, `longitude` (`Float, nullable=True`) vào `IncidentMedia` (lưu tọa độ GPS ảnh minh chứng `AFTER_PROOF`).
  - Trong `backend/scripts/init_db.py`, bổ sung hàm migration idempotent chạy lệnh `ALTER TABLE incident_media ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`, `ALTER TABLE incident_media ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`, và `ALTER TABLE incident_feedback ALTER COLUMN rating DROP NOT NULL` để chạy an toàn nhiều lần trên DB đã có dữ liệu.
- **Endpoints & State Machine (`backend/app/api/v1/endpoints/incidents.py`, `backend/app/api/open311.py`):**
  - Toàn bộ thư mục `backend/` hiện **chưa có chuỗi `"REOPENED"`** (0 kết quả khi tìm kiếm).
  - `PATCH /api/v1/incidents/{id}/status` (dòng 764) chỉ cho phép `allowed_statuses = {"IN_PROGRESS", "RESOLVED", "REJECTED", "CLOSED"}` — thiếu `CONFIRMED` và `REOPENED`. Khi mở lại từ `RESOLVED`, code cũ chuyển thẳng `RESOLVED -> IN_PROGRESS`.
  - `POST /api/v1/incidents/{id}/feedback` (dòng 992–1039) chỉ cho phép khi `status == "RESOLVED"`; nếu `rating >= 3` chuyển sang `CONFIRMED`, nếu `rating <= 2` chuyển thẳng về `IN_PROGRESS` và chưa kiểm tra quyền chủ phiếu (`incident.citizen_id == current_user.id`).
  - `GET /api/v1/incidents/analytics/summary` (dòng 1210) mới khởi tạo 8 trạng thái trong `by_status` (thiếu `"REOPENED": 0`).
  - `OPEN311_STATUS_NOTES` tại `backend/app/api/open311.py` (dòng 32) mới có 8 trạng thái (thiếu `"REOPENED"`).
- **Tests:** Chưa có bất kỳ test nào trong `backend/tests/` kiểm thử trạng thái `REOPENED`.

### 2.2. Hiện trạng tính hạn `sla_due_at` trên Backend
- **`POST /api/v1/incidents` (dòng 274–289) & `POST /api/v1/webhooks/facebook` (dòng 254–267):** Không gán `sla_due_at` lúc tạo phiếu (`sla_due_at = None`).
- **`POST /open311/v2/requests.json` (dòng 134–135):** Tính theo `category.default_sla_hours` (hoặc 24h) cộng từ `now`.
- **`process_incident_ai_triage` (dòng 149–150):** Tính `sla_due_at = datetime.now(timezone.utc) + timedelta(hours=matched_cat.default_sla_hours)`.
- **`PATCH /api/v1/incidents/{id}/triage` (dòng 516–521):** Lấy `sla_hours = category.default_sla_hours or 24`, nếu `priority == "EMERGENCY"` thì giảm một nửa `max(1, sla_hours // 2)`, cộng từ thời điểm duyệt `now` (không tính từ `created_at` và không theo 4 mốc cố định `4h / 12h / 24h / 48h`).
- **Khi mở lại phiếu:** Chưa có logic tính lại `sla_due_at` từ thời điểm mở lại.

### 2.3. Danh sách các Test hiện tại khẳng định hành vi cũ (sẽ sửa trong Bước 2 & Bước 3)
1. `backend/tests/test_incident_workflow.py::test_status_transition_to_closed_dispatcher_success` (dòng 898): Khẳng định `DISPATCHER` đóng thẳng `RESOLVED -> CLOSED` qua `PATCH /{id}/status`. Sẽ đổi sang `DISPATCHER` đóng `CONFIRMED -> CLOSED` đối với phiếu không có `citizen_id` (`citizen_id=None`), và thêm test `DISPATCHER` duyệt nghiệm thu `RESOLVED -> CONFIRMED`.
2. `backend/tests/test_incident_workflow.py::test_status_transition_to_closed_technician_forbidden` (dòng 916) & `backend/tests/test_incident_workflow.py::test_status_transition_to_closed_invalid_source_status_fails` (dòng 934): Khẳng định quyền và trạng thái nguồn khi gọi `to_status="CLOSED"` ở endpoint cán bộ. Sẽ cập nhật trạng thái nguồn hợp lệ của `CLOSED` qua `PATCH /status` là `CONFIRMED` (với `citizen_id=None`), đồng thời kiểm tra `CONFIRMED` và `REOPENED` chỉ cho phép `DISPATCHER`/`ADMIN` từ `RESOLVED`.
3. `backend/tests/test_incident_workflow.py::test_status_transition_reopen_from_resolved_resets_resolved_at` (dòng 952): Khẳng định `DISPATCHER` chuyển thẳng `RESOLVED -> IN_PROGRESS`. Sẽ đổi sang `DISPATCHER` chuyển `RESOLVED -> REOPENED` (reset `resolved_at = None`, đặt lại `sla_due_at`) và sau đó `TECHNICIAN` chuyển `REOPENED -> IN_PROGRESS`.
4. `backend/tests/test_incident_workflow.py::test_citizen_feedback_satisfied_confirmed_success` (dòng 1023): Khẳng định công dân gửi feedback ở `RESOLVED` chuyển sang `CONFIRMED`. Sẽ đổi sang công dân chủ phiếu (`incident.citizen_id == citizen.id`) xác nhận ở `CONFIRMED` chuyển sang `CLOSED` (với `rating` tùy chọn).
5. `backend/tests/test_incident_workflow.py::test_citizen_feedback_disputed_reopens_to_in_progress` (dòng 1063): Khẳng định chấm `rating = 2` ở `RESOLVED` chuyển về `IN_PROGRESS`. Sẽ đổi sang hành động khiếu nại (`action="DISPUTE"`, bắt buộc có lý do `comment`) của chủ phiếu ở `CONFIRMED` chuyển sang `REOPENED`, reset `resolved_at = None` và đặt lại `sla_due_at`.
6. `backend/tests/test_incident_workflow.py::test_citizen_feedback_on_unresolved_incident_fails` (dòng 1096) & `backend/tests/test_incident_workflow.py::test_citizen_feedback_duplicate_submission_fails` (dòng 1112): Cập nhật trạng thái tiền điều kiện từ `RESOLVED` sang `CONFIRMED` và gán `citizen_id` khớp chủ phiếu.
7. `backend/tests/test_incident_workflow.py::test_triage_incident_emergency_sla_reduction` (dòng 414): Khẳng định SLA lấy `category.default_sla_hours = 8` chia đôi còn `4h` tính từ `now`. Sẽ cập nhật sang kiểm tra quy tắc SLA mới theo `priority` (`EMERGENCY = 4h, HIGH = 12h, NORMAL = 24h, LOW = 48h`) tính từ `created_at`.
8. `backend/tests/test_schemas_incident.py::test_incident_feedback_create_in` (dòng 416): Mở rộng để kiểm tra `rating` tùy chọn (`None` hoặc `1..5`) và tách hành động xác nhận (`CONFIRM`) / khiếu nại (`DISPUTE` bắt buộc có lý do).

*(Mốc kiểm thử ban đầu: `197 passed, 4 failed` trên tổng 201 tests trong `backend/tests` khi không bật container PostgreSQL cho 4 test tích hợp trong `test_auth.py`).*

---

## 3. Phạm vi & Giới hạn (Scope & Non-goals)

### 3.1. Các file được phép thay đổi (Allowed Files)
- `backend/app/core/config.py`
- `backend/app/models/incident.py`
- `backend/app/schemas/incident.py`
- `backend/app/api/v1/endpoints/incidents.py`
- `backend/app/api/v1/endpoints/webhooks.py`
- `backend/app/api/open311.py`
- `backend/scripts/init_db.py`
- `backend/tests/test_incidents.py`
- `backend/tests/test_incident_workflow.py`
- `backend/tests/test_schemas_incident.py`
- `backend/tests/test_open311.py`
- `docs/ui-api-mapping.md`
- `docs/PROJECT_CONTEXT_HANDOFF.md`
- `docs/plans/backend-lifecycle-alignment.md`

### 3.2. Các vùng cấm tuyệt đối (Non-goals)
- **KHÔNG** sửa bất kỳ file nào trong `ui-prototype/` hoặc `frontend/`.
- **KHÔNG** làm backend cho OTP (`/auth/*`).
- **KHÔNG** thêm cơ chế tự đóng phiếu theo thời gian (auto-close cron/scheduler).
- **KHÔNG** sửa các test cũ ngoài danh sách các test khẳng định hành vi đã thay đổi ở mục 2.3.

---

## 4. Các Bước Thực Hiện Chi Tiết (7 Commits + 1 Docs Commit)

Trước khi bắt đầu Bước 1, tạo nhánh làm việc mới `feat/backend-lifecycle-alignment` từ nhánh hiện tại (giữ nguyên thay đổi của `ui-prototype/guidelines/lifecycle.md`). Sau mỗi 2 commit sẽ dừng lại báo cáo kết quả cho người dùng.

### [x] Bước 1: Hỗ trợ nhận `UUID` hoặc `ticket_code` tại `/api/v1/incidents/{id_or_code}/...`
- **Thay đổi trong `backend/app/api/v1/endpoints/incidents.py`:**
  - Viết hàm helper `_resolve_incident(db: AsyncSession, id_or_code: str, load_relations: bool = True) -> Incident | None`:
    - Thử parse `UUID(id_or_code.strip())`: nếu hợp lệ thì truy vấn theo `Incident.id == parsed_uuid` (hoặc `db.get(Incident, parsed_uuid)` khi `load_relations=False` kèm fallback `select(Incident)`).
    - Nếu không phải UUID thì truy vấn theo `Incident.ticket_code == id_or_code.strip()`.
  - Áp dụng cho tất cả các endpoint định danh đơn lẻ:
    - `POST /api/v1/incidents/{id_or_code}/vote-duplicate`
    - `PATCH /api/v1/incidents/{id_or_code}/triage`
    - `PATCH /api/v1/incidents/{id_or_code}/assign`
    - `PATCH /api/v1/incidents/{id_or_code}/status`
    - `POST /api/v1/incidents/{id_or_code}/feedback`
    - `GET /api/v1/incidents/{id_or_code}`
- **Tests:** Thêm test gọi `vote-duplicate`, `triage`, `assign`, `status`, `feedback`, và `GET /{id_or_code}` bằng cả `UUID` lẫn `ticket_code` (`DN-YYYYMM-XXXX`).
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 1:** `feat(incidents): accept UUID or ticket_code across incident endpoints`

### [x] Bước 2: Máy trạng thái mới (`REOPENED`, `CONFIRMED`, `CLOSED`), Migration `ALTER COLUMN rating DROP NOT NULL` & Tách hành động Xác nhận / Khiếu nại
- **Thay đổi trong `backend/app/models/incident.py` & `backend/scripts/init_db.py`:**
  - Cập nhật comment trạng thái trên `Incident.status` bao gồm `REOPENED`.
  - Đổi `IncidentFeedback.rating` thành `Mapped[Optional[int]] = mapped_column(Integer, nullable=True)`.
  - Trong `backend/scripts/init_db.py`: tách hàm `apply_schema_migrations(conn)` thực thi `ALTER TABLE incident_feedback ALTER COLUMN rating DROP NOT NULL;` (idempotent, chạy nhiều lần trên DB đã có dữ liệu không lỗi).
- **Thay đổi trong `backend/app/schemas/incident.py`:**
  - `IncidentStatusUpdateIn`: cập nhật mô tả trạng thái mục tiêu `IN_PROGRESS, RESOLVED, CONFIRMED, REOPENED, REJECTED, CLOSED`.
  - `IncidentFeedbackCreateIn`:
    - Thêm `action: Literal["CONFIRM", "DISPUTE"] = Field("CONFIRM", description="Hành động của công dân: CONFIRM (xác nhận đóng phiếu) hoặc DISPUTE (khiếu nại mở lại)")`.
    - Đổi `rating: int | None = Field(None, ge=1, le=5, description="Điểm đánh giá tùy chọn từ 1 đến 5 sao")`.
    - `comment: str | None = Field(None, max_length=1000, description="Nhận xét hoặc lý do khiếu nại (bắt buộc khi action=DISPUTE)")`.
    - Thêm `@model_validator(mode="after")`: nếu `action == "DISPUTE"` mà không có `comment` (hoặc `comment.strip() == ""`) thì raise `ValueError("Bắt buộc phải nhập lý do khi gửi khiếu nại.")`.
  - `IncidentFeedbackOut`: đổi `rating: int | None = None`.
- **Thay đổi trong `backend/app/api/v1/endpoints/incidents.py`:**
  - Tại `PATCH /api/v1/incidents/{id_or_code}/status`:
    - `allowed_statuses = {"IN_PROGRESS", "RESOLVED", "CONFIRMED", "REOPENED", "REJECTED", "CLOSED"}`.
    - `to_status == "IN_PROGRESS"`: chỉ cho phép từ `{"ASSIGNED", "REOPENED"}`.
    - `to_status == "RESOLVED"`: chỉ cho phép từ `"IN_PROGRESS"`, bắt buộc có ảnh `AFTER_PROOF`, gán `resolved_at = now`.
    - `to_status == "CONFIRMED"`: chỉ `DISPATCHER` hoặc `ADMIN` có quyền (`403` nếu `TECHNICIAN`); chỉ cho phép từ `"RESOLVED"`.
    - `to_status == "REOPENED"`: chỉ `DISPATCHER` hoặc `ADMIN` có quyền (`403` nếu `TECHNICIAN`); chỉ cho phép từ `"RESOLVED"`; đặt `incident.resolved_at = None`.
    - `to_status == "REJECTED"`: chỉ `DISPATCHER` hoặc `ADMIN` có quyền; **chỉ cho phép khi trạng thái hiện tại thuộc `{"SUBMITTED", "TRIAGED", "ASSIGNED"}`** (nếu ở trạng thái khác trả `400`); bắt buộc có `note` không rỗng.
    - `to_status == "CLOSED"`: chỉ `DISPATCHER` hoặc `ADMIN` có quyền; chỉ cho phép khi `incident.status == "CONFIRMED"` **và** phiếu không có `citizen_id` (`incident.citizen_id is None`). Nếu phiếu có `citizen_id` thì trả `400` (vì chỉ công dân chủ phiếu mới được xác nhận đóng).
  - Tại `POST /api/v1/incidents/{id_or_code}/feedback`:
    - Kiểm tra chủ phiếu: `if incident.citizen_id is None or incident.citizen_id != current_user.id:` trả `403 Forbidden` (`"Chỉ người dân tạo phản ánh mới có quyền xác nhận hoặc khiếu nại phiếu này."`).
    - Kiểm tra trạng thái: chỉ cho phép khi `incident.status == "CONFIRMED"` (nếu khác trả `400 Bad Request`).
    - Nếu `payload.action == "CONFIRM"`:
      - Chuyển `incident.status = "CLOSED"` (không phụ thuộc số sao `rating`).
      - Lưu `IncidentFeedback` (với `rating=payload.rating`, `comment=payload.comment`).
      - Ghi `IncidentHistory` (`from_status="CONFIRMED"`, `to_status="CLOSED"`).
    - Nếu `payload.action == "DISPUTE"`:
      - Bắt buộc `payload.comment` không rỗng.
      - Chuyển `incident.status = "REOPENED"`, đặt `incident.resolved_at = None`.
      - Lưu/cập nhật `IncidentFeedback` và ghi `IncidentHistory` (`from_status="CONFIRMED"`, `to_status="REOPENED"`, `note=payload.comment.strip()`).
  - Cập nhật `by_status` trong `get_incidents_analytics_summary` có thêm `"REOPENED": 0`, và `OPEN311_STATUS_NOTES` trong `backend/app/api/open311.py` có `"REOPENED": "Mở lại (REOPENED)"`.
- **Tests:** Cập nhật các test khẳng định hành vi cũ (mục 2.3 #1–#6, #8), thêm test kiểm tra chạy `apply_schema_migrations` 2 lần liên tiếp không lỗi, test chủ phiếu `CITIZEN`, `DISPATCHER` đóng phiếu `CONFIRMED` khi `citizen_id is None` (và bị chặn khi `citizen_id is not None`), `REJECTED` chỉ từ `SUBMITTED/TRIAGED/ASSIGNED`, `CONFIRMED -> CLOSED` không cần sao / có sao, `CONFIRMED -> REOPENED` bắt buộc lý do, `RESOLVED -> CONFIRMED`, `RESOLVED -> REOPENED -> IN_PROGRESS`.
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 2:** `feat(workflow): align incident state machine and citizen confirm/dispute rules`
- *(Dừng báo cáo lần 1 sau Commit 2).*

### [ ] Bước 3: Tính hạn SLA theo quyết định (`4h / 12h / 24h / 48h`)
- **Thay đổi trong `backend/app/api/v1/endpoints/incidents.py`, `webhooks.py`, `open311.py`:**
  - Định nghĩa bảng hằng số và hàm dùng chung `calculate_sla_due_at(priority: str, base_time: datetime) -> datetime`:
    - `SLA_HOURS_BY_PRIORITY = {"EMERGENCY": 4, "HIGH": 12, "NORMAL": 24, "LOW": 48}`.
  - Khi tạo phiếu mới (`POST /api/v1/incidents`, `POST /open311/v2/requests.json`, `POST /api/v1/webhooks/facebook`): gán `sla_due_at = calculate_sla_due_at(incident.priority, now)` tính từ `created_at`.
  - Khi AI Triage (`process_incident_ai_triage`) và khi Điều phối viên Triage (`PATCH /{id_or_code}/triage`): tính lại `incident.sla_due_at = calculate_sla_due_at(incident.priority, incident.created_at)` từ `incident.created_at` theo `priority` hiện tại.
  - Khi mở lại phiếu (`RESOLVED -> REOPENED` ở `PATCH /{id_or_code}/status` và `CONFIRMED -> REOPENED` ở `POST /{id_or_code}/feedback`): đặt lại `incident.sla_due_at = calculate_sla_due_at(incident.priority, now)` tính từ lúc mở lại (`now`).
- **Tests:** Cập nhật `test_triage_incident_emergency_sla_reduction` (mục 2.3 #7) và thêm bộ test kiểm tra đủ 4 mức SLA (`4h/12h/24h/48h`) từ `created_at`, tính lại khi đổi `priority` ở bước triage, và đặt lại `sla_due_at` từ lúc `REOPENED`.
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 3:** `feat(sla): compute sla_due_at by priority from created_at and reset on reopen`

### [ ] Bước 4: Mở rộng bộ lọc `GET /api/v1/incidents`
- **Thay đổi trong `backend/app/api/v1/endpoints/incidents.py`:**
  - Bổ sung tham số truy vấn cho `list_incidents`:
    - `status` (`list[str] | None = Query(None, alias="status")`): hỗ trợ truyền nhiều trạng thái qua query lặp (`?status=SUBMITTED&status=TRIAGED`) hoặc chuỗi phân cách dấu phẩy (`?status=SUBMITTED,TRIAGED`).
    - `priority: str | None = Query(None)`: hỗ trợ lọc 1 hoặc nhiều mức độ ưu tiên phân cách dấu phẩy.
    - `q: str | None = Query(None)`: tìm kiếm không phân biệt hoa thường trên `ticket_code` và `address_text` (cùng `title`).
    - `assigned_technician_id: UUID | None = Query(None)`: lọc theo kỹ thuật viên phụ trách.
    - `mine: bool = Query(False)`: nếu `mine=True`, yêu cầu `current_user` đã đăng nhập (trả `401` nếu chưa đăng nhập) và lọc `Incident.citizen_id == current_user.id`.
- **Tests:** Thêm test lọc nhiều `status`, lọc `priority`, tìm kiếm `q` theo mã phiếu/tên đường, lọc `assigned_technician_id`, và lọc `mine=true` (cả khi đã đăng nhập và khi chưa đăng nhập).
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 4:** `feat(incidents): add multi-status, priority, search q, technician, and mine filters`
- *(Dừng báo cáo lần 2 sau Commit 4).*

### [ ] Bước 5: Mở rộng Schema (`assigned_technician_name`, `category_code` ở `nearby`, `duplicate_count` ở `map`, `rejection_reason` bảo mật, GPS ảnh sau & Migration `init_db.py`)
- **Thay đổi trong `backend/app/models/incident.py` & `backend/scripts/init_db.py`:**
  - Thêm `latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)` và `longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)` vào `IncidentMedia`.
  - Trong `backend/scripts/init_db.py` (`apply_schema_migrations`): bổ sung `ALTER TABLE incident_media ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;` và `ALTER TABLE incident_media ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;`.
- **Thay đổi trong `backend/app/schemas/incident.py` & `backend/app/api/v1/endpoints/incidents.py`:**
  - `IncidentMediaOut`: thêm `latitude: float | None = None`, `longitude: float | None = None`.
  - `IncidentDetailOut`:
    - Thêm `assigned_technician_name: str | None = None`. Quy tắc bảo vệ thông tin:
      - Viết hàm rút gọn tên `abbreviate_person_name(full_name: str) -> str` (giữ họ và chữ cái đầu của tên đệm + tên, hoặc họ + chữ cái đầu các từ tiếp theo, ví dụ `"Trần Văn Kỹ"` $\rightarrow$ `"Trần V. K."`).
      - Khi người gọi đã đăng nhập (`current_user is not None`): trả tên kỹ thuật viên (hoặc bản rút gọn cho khách không đăng nhập). Cụ thể: nếu đã đăng nhập trả `full_name`, nếu chưa đăng nhập trả tên rút gọn `abbreviate_person_name(full_name)`.
  - `IncidentOut` & `IncidentDetailOut`:
    - Thêm `rejection_reason: str | None = None` (trích từ `note` của bản ghi `IncidentHistory` có `to_status == "REJECTED"`).
    - **Bảo mật `rejection_reason`**: Chỉ trả `rejection_reason` khi người gọi là chủ phiếu (`current_user is not None and incident.citizen_id == current_user.id`), `DISPATCHER`, hoặc `ADMIN`. Với khách vãng lai hoặc người dùng khác, đặt `rejection_reason = None` (và ẩn `note` từ chối trong `history` nếu không có quyền).
  - `IncidentNearbyItem`: thêm `category_code: str | None = None`.
  - `IncidentMapProperties`: thêm `duplicate_count: int = 0`.
  - `update_incident_status`: nhận thêm `proof_latitude: float | None = Form(None, ge=-90.0, le=90.0)` và `proof_longitude: float | None = Form(None, ge=-180.0, le=180.0)` khi tải ảnh `AFTER_PROOF`, lưu vào `IncidentMedia`.
- **Tests:** Thêm test kiểm tra `apply_schema_migrations` chạy 2 lần không lỗi, test `rejection_reason` chỉ hiển thị cho chủ phiếu / `DISPATCHER` / `ADMIN` (ẩn với khách hoặc công dân khác), test `assigned_technician_name` khi đăng nhập vs rút gọn khi không đăng nhập, `category_code` ở `nearby`, `duplicate_count` ở `map`, và `latitude/longitude` của `AFTER_PROOF`.
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 5:** `feat(schemas): expose technician name, nearby category_code, map duplicate_count, rejection reason, and proof GPS`

### [ ] Bước 6: Mở rộng Analytics (`GET /api/v1/incidents/analytics/summary`)
- **Thay đổi trong `backend/app/schemas/incident.py` & `backend/app/api/v1/endpoints/incidents.py`:**
  - Bổ sung vào `IncidentAnalyticsSummaryOut`:
    - `avg_resolution_time_minutes: float = 0.0` (thời gian giải quyết trung bình tính bằng phút từ `created_at` đến `resolved_at` của các sự cố có `resolved_at is not None`).
    - `avg_satisfaction_rating: float = 0.0` (điểm sao trung bình 1..5 từ `IncidentFeedback` có `rating is not None`) và `satisfaction_score: float = 0.0` (quy đổi thang 100: `round(avg_rating * 20.0, 1)`).
    - `completion_rate_by_district: dict[str, float] = Field(default_factory=dict)`: tỷ lệ % sự cố **"hoàn tất" (tính cả `CONFIRMED` và `CLOSED`)** trên tổng số sự cố tại mỗi quận/huyện.
- **Tests:** Thêm test kiểm tra tính toán `avg_resolution_time_minutes`, `avg_satisfaction_rating` / `satisfaction_score`, và `completion_rate_by_district` (tính cả `CONFIRMED` + `CLOSED`) trong `test_incident_workflow.py` và `test_schemas_incident.py`.
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 6:** `feat(analytics): add average resolution time, satisfaction score, and district completion rate`
- *(Dừng báo cáo lần 3 sau Commit 6).*

### [ ] Bước 7: Endpoint Phân tích ảnh AI trước khi gửi (có Rate Limit theo IP) & Lưu `priority` đề xuất tại `POST /api/v1/incidents`
- **Thay đổi trong `backend/app/core/config.py`, `backend/app/schemas/incident.py` & `backend/app/api/v1/endpoints/incidents.py`:**
  - Thêm cấu hình `ANALYZE_IMAGE_RATE_LIMIT_PER_MINUTE: int = 10` vào `Settings` (`backend/app/core/config.py`).
  - Tạo bộ giới hạn tần suất theo IP (in-memory sliding window 60 giây theo `request.client.host` / `X-Forwarded-For` dựa trên `settings.ANALYZE_IMAGE_RATE_LIMIT_PER_MINUTE`, mặc định 10 lần/phút; trả `429 Too Many Requests` khi vượt ngưỡng).
  - Tạo schema `IncidentAnalyzeImageOut`:
    - `category_code: str`, `priority: str`, `suggested_department_code: str`, `summary_vi: str`, `hazard_warning: str | None = None`, `confidence: float`, `sla_hours: int`, `is_blurred: bool`, `faces_detected: int`, `plates_detected: int`.
  - Tạo endpoint `POST /api/v1/incidents/analyze-image`:
    - Ghi chú rõ trong docstring của endpoint và `anonymizer.py` rằng thuật toán làm mờ OpenCV Haar Cascade theo Nghị định 13 chỉ mang tính hỗ trợ tự động (best-effort) và **không bắt hết mọi trường hợp** (góc nghiêng, che khuất, ánh sáng yếu).
    - Dùng `tempfile.TemporaryDirectory()` lưu tạm ảnh đầu vào, chạy `anonymize_image(temp_orig, temp_anon)` trước khi truyền `temp_anon` vào `classify_incident_image(...)`, xóa sạch file tạm ngay trong khối `finally`.
  - Cập nhật `POST /api/v1/incidents` và schema `IncidentOut` / `IncidentDetailOut`:
    - Nhận thêm `category_code: str | None = Form(None)` và `priority: str | None = Form(None)`.
    - Lưu `priority` do người dân chọn vào `incident.priority` như mức đề xuất (và lưu vào `ai_classification_raw["citizen_suggested_priority"]`).
    - Thêm cờ `is_priority_suggested: bool = True` trên `IncidentOut` / `IncidentDetailOut`: trả `True` khi điều phối viên chưa duyệt triage (phiếu chưa có lịch sử `TRIAGED` bởi cán bộ điều phối / đang ở `SUBMITTED` hoặc mới chỉ qua AI tự động), và chuyển thành `False` sau khi Điều phối viên duyệt tại `PATCH /{id_or_code}/triage`.
- **Tests:** Thêm test cho `POST /api/v1/incidents/analyze-image` (xác minh làm mờ trước khi gọi DeepSeek, không lưu ảnh, và chặn `429` khi vượt quá giới hạn tần suất theo IP) và test `POST /api/v1/incidents` với `category_code`, `priority` đề xuất cùng cờ `is_priority_suggested`.
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 7:** `feat(ai): add rate-limited pre-submit image analysis and suggested priority flag`

### [ ] Bước 8: Cập nhật Tài liệu `docs/ui-api-mapping.md` và `docs/PROJECT_CONTEXT_HANDOFF.md` (Mục 3.4)
- Cập nhật `docs/ui-api-mapping.md` và mục `3.4` của `docs/PROJECT_CONTEXT_HANDOFF.md` cho khớp hoàn toàn với vòng đời 9 trạng thái, quy tắc đóng phiếu/khiếu nại, cách tính SLA từ `created_at` và **ghi chú rõ rằng khi mở lại phiếu (`REOPENED`) hệ thống đặt lại hạn `sla_due_at` mới tính từ thời điểm mở lại**.
- **Commit 8:** `docs: update ui-api-mapping and project context handoff for new lifecycle and SLA`
- *(Báo cáo hoàn tất sau Commit 8).*
