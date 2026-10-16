# Kế hoạch Triển khai: Chuẩn Mở Quốc tế Open311 GeoReport v2 (`open311-georeport-v2`)

> **Mã kế hoạch:** `open311-georeport-v2`  
> **Tài liệu đặc tả liên quan:** `docs/spec.md` (Mục 2.1, Mục 6.4)  
> **Quy tắc tuân thủ:** `AGENTS.md`, `.agents/rules/backend-fastapi-postgis.md`, `.agents/rules/incident-domain-invariants.md`, `docs/lessons-learned.md`

---

## 1. Mục tiêu & Phạm vi (Goals & Scope)

### Mục tiêu chính
Tích hợp lớp tương thích chuẩn mở quốc tế **Open311 GeoReport v2** (`/open311/v2`), cho phép các ứng dụng đô thị thông minh bên thứ ba hoặc các cơ quan đối tác gửi yêu cầu phản ánh hiện trường và tra cứu tiến độ xử lý sự cố tại Đà Nẵng:
1. **Danh mục Dịch vụ công (`GET /open311/v2/services.json`):** Trả về danh sách loại sự cố hạ tầng đô thị tương thích với bảng `categories` trong CSDL.
2. **Tiếp nhận Yêu cầu Phản ánh (`POST /open311/v2/requests.json`):**
   - Hỗ trợ payload chuẩn Open311 (`service_code`, `lat`, `long`, `address_string`, `description`, `first_name`, `last_name`, `phone`, `email`, `media_url`).
   - Thẩm định hàng rào địa lý PostGIS WGS84 SRID 4326 (`ST_Contains` với vùng `DANANG_CORE` trên `system_zones`).
   - Sinh `service_request_id` theo format `DN-YYYYMM-XXXX`.
   - Lưu trữ bản ghi `incidents` và `incident_history`.
   - Trả về danh sách JSON chứa `service_request_id` theo chuẩn RFC Open311 GeoReport v2.
3. **Tra cứu Tiến độ Quốc tế (`GET /open311/v2/requests/{service_request_id}.json`):**
   - Tra cứu theo mã phiếu công khai.
   - Chuẩn hóa trạng thái Open311: `"open"` hoặc `"closed"`.
   - Cung cấp `status_notes`, `service_name`, `agency_responsible`, `requested_datetime`, `expected_datetime` (từ `sla_due_at`), tọa độ `lat, long`.
   - **Bảo mật tuyệt đối:** Chỉ trả về ảnh ẩn danh `BEFORE_ANONYMIZED` trong `media_url`, tuyệt đối không để lộ ảnh gốc `BEFORE_ORIGINAL` (tuân thủ Lỗi 3 trong `docs/lessons-learned.md`).

### Phạm vi ảnh hưởng (Allowed Files)
- `docs/plans/open311-georeport-v2.md`: Kế hoạch và tiến độ.
- `backend/app/schemas/open311.py`: Pydantic v2 schemas cho Open311.
- `backend/app/schemas/__init__.py`: Export các schemas Open311.
- `backend/app/api/v1/endpoints/open311.py` (hoặc `backend/app/api/open311.py`): Router xử lý các endpoints Open311.
- `backend/app/main.py`: Mount Open311 router tại prefix `/open311/v2`.
- `backend/tests/test_open311.py`: Bộ kiểm thử tự động toàn diện (mock 100%).

### Giới hạn nghiêm ngặt (Non-goals)
- Không sửa đổi database models hay chạy migrations (dữ liệu tận dụng toàn bộ bảng `categories`, `incidents`, `system_zones`, `incident_history`).
- Không sửa đổi logic các endpoints `/api/v1/incidents`.
- Không hỗ trợ định dạng XML (Open311 hỗ trợ JSON và XML; theo spec đồ án chỉ cần chuẩn JSON `.json`).

---

## 2. Thứ tự Các Bước Triển khai (Ordered Steps)

### [x] Bước 1: Định nghĩa Pydantic Schemas chuẩn Open311 GeoReport v2 (`schemas/open311.py`)
* **Mục tiêu:** Xây dựng các model dữ liệu đầu vào và đầu ra tuân thủ chuẩn Open311 GeoReport v2 và Pydantic v2.
* **Hành động:**
  * Tạo `backend/app/schemas/open311.py`:
    * `Open311ServiceOut`: `service_code: str`, `service_name: str`, `description: str`, `metadata: bool = False`, `type: str = "realtime"`, `keywords: str | None = None`, `group: str = "Hạ tầng đô thị"`.
    * `Open311CreateRequestIn`: `service_code: str`, `lat: float`, `long: float`, `address_string: str | None = None`, `email: str | None = None`, `phone: str | None = None`, `first_name: str | None = None`, `last_name: str | None = None`, `description: str`, `media_url: str | None = None`.
    * `Open311CreateRequestResponseItem`: `service_request_id: str`, `service_notice: str | None = None`, `account_id: str | None = None`.
    * `Open311RequestItemOut`: `service_request_id: str`, `status: str` (`"open"` hoặc `"closed"`), `status_notes: str | None`, `service_name: str`, `service_code: str`, `description: str`, `agency_responsible: str | None`, `service_notice: str | None = None`, `requested_datetime: datetime`, `updated_datetime: datetime | None`, `expected_datetime: datetime | None`, `address: str`, `address_id: str | None = None`, `zipcode: str | None = None`, `lat: float`, `long: float`, `media_url: str | None = None`.
  * Export trong `backend/app/schemas/__init__.py`.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`

---

### [x] Bước 2: Xây dựng Endpoint Danh mục Dịch vụ Công (`GET /open311/v2/services.json`)
* **Mục tiêu:** Cung cấp danh sách các loại sự cố/dịch vụ công tiếp nhận theo chuẩn Open311.
* **Hành động:**
  * Tạo router `backend/app/api/open311.py` với `router = APIRouter(tags=["Open311 GeoReport v2"])`.
  * Endpoint `GET /services.json`:
    * Response model: `list[Open311ServiceOut]`.
    * Truy vấn bất đồng bộ `select(Category).order_by(Category.code)`.
    * Ánh xạ `service_code = Category.code`, `service_name = Category.name`, `description = f"Phản ánh hiện trường về {Category.name}"`.
  * Gắn router vào `backend/app/main.py`: `app.include_router(open311_router, prefix="/open311/v2")`.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`

---

### [x] Bước 3: Xây dựng Endpoint Tiếp nhận Phản ánh Chuẩn Open311 (`POST /open311/v2/requests.json`)
* **Mục tiêu:** Tiếp nhận tạo mới phản ánh sự cố theo chuẩn Open311 GeoReport v2 kèm hàng rào địa lý PostGIS Đà Nẵng.
* **Hành động:**
  * Thêm `POST /requests.json` vào `backend/app/api/open311.py`:
    * Hỗ trợ nhận body JSON hoặc Form data.
    * Thẩm định `service_code`: tìm `Category` theo `code`. Nếu không tìm thấy $\rightarrow$ trả về `404 Not Found`.
    * Hàng rào địa lý PostGIS:
      * Tạo `point_geom = ST_SetSRID(ST_MakePoint(long, lat), 4326)` (Lỗi 7: strictly thứ tự lon, lat!).
      * Kiểm tra `ST_Contains(boundary, point_geom)` trên `system_zones` có `is_active = True`.
      * Nếu ngoài vùng $\rightarrow$ trả về `422 Unprocessable Entity` ("Tọa độ bạn chọn nằm ngoài phạm vi Vùng Đô thị Trung tâm Đà Nẵng").
    * Sinh `service_request_id` dạng `DN-YYYYMM-XXXX`.
    * Lưu bản ghi `Incident`:
      * `ticket_code = service_request_id`
      * `title = f"Phản ánh Open311: {category.name}"`
      * `description = payload.description`
      * `category_id = category.id`
      * `priority = "NORMAL"`
      * `status = "SUBMITTED"`
      * `channel = "WEB"`
      * `citizen_contact = phone or email or f"{first_name or ''} {last_name or ''}".strip()`
      * `address_text = address_string or "Đà Nẵng"`
      * `location = point_geom`
      * `duplicate_count = 0`
    * Lưu bản ghi `IncidentHistory(incident_id, from_status=None, to_status="SUBMITTED", note="Tiếp nhận phản ánh từ chuẩn mở Open311 GeoReport v2")`.
    * Nếu có `media_url`: lưu bản ghi `IncidentMedia(media_type="BEFORE_ANONYMIZED", file_url=media_url)`.
    * `await db.commit()`.
    * Trả về `list[Open311CreateRequestResponseItem]` (mảng 1 phần tử theo chuẩn Open311).
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`

---

### [ ] Bước 4: Xây dựng Endpoint Tra cứu Trạng thái Chuẩn Open311 (`GET /open311/v2/requests/{service_request_id}.json`)
* **Mục tiêu:** Tra cứu tiến độ sự cố theo mã phiếu và chuẩn hóa trạng thái open/closed theo đặc tả Open311.
* **Hành động:**
  * Thêm `GET /requests/{service_request_id}.json` vào `backend/app/api/open311.py`:
    * Response model: `list[Open311RequestItemOut]`.
    * Tải `Incident` theo `ticket_code == service_request_id` với `selectinload` (`category`, `assigned_department`, `media`).
    * Nếu không tìm thấy $\rightarrow$ trả về `404 Not Found`.
    * Chuẩn hóa trạng thái:
      * Nếu `incident.status in ("RESOLVED", "CONFIRMED", "CLOSED", "REJECTED")` $\rightarrow$ `status = "closed"`.
      * Ngược lại $\rightarrow$ `status = "open"`.
    * `status_notes`: Tên trạng thái chi tiết tiếng Việt (ví dụ: `Đang xử lý (IN_PROGRESS)`).
    * `agency_responsible`: `incident.assigned_department.name if incident.assigned_department else None`.
    * `expected_datetime`: `incident.sla_due_at`.
    * `media_url`: Trích xuất ảnh `BEFORE_ANONYMIZED` (hoặc `AFTER_PROOF`). Tuyệt đối không để lộ `BEFORE_ORIGINAL`.
    * Trả về mảng chứa 1 đối tượng `Open311RequestItemOut`.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`

---

### [ ] Bước 5: Viết Bộ Test Suite Tự động Toàn diện (`backend/tests/test_open311.py`) & Reviewer Audit
* **Mục tiêu:** Kiểm thử độc lập 100% (mocking) và thẩm định nghiêm ngặt qua Reviewer subagent.
* **Hành động:**
  * Tạo `backend/tests/test_open311.py` kiểm thử các kịch bản:
    1. `test_open311_get_services_success`: `GET /open311/v2/services.json` trả về danh sách dịch vụ với đúng schema.
    2. `test_open311_create_request_success_danang`: Tạo sự cố tại Đà Nẵng (Cầu Rồng `lat=16.0611, long=108.2208`) $\rightarrow$ trả về mã `service_request_id` dạng `DN-YYYYMM-XXXX`.
    3. `test_open311_create_request_geofence_out_of_bounds`: Tọa độ ngoài Đà Nẵng (Hà Nội) $\rightarrow$ `422 Unprocessable Entity`.
    4. `test_open311_create_request_invalid_service_code`: Mã service không tồn tại $\rightarrow$ `404 Not Found`.
    5. `test_open311_get_request_by_id_open`: Tra cứu sự cố đang xử lý $\rightarrow$ `status = "open"`, `lat, long`, `expected_datetime`.
    6. `test_open311_get_request_by_id_closed`: Tra cứu sự cố đã hoàn thành (`RESOLVED`/`CLOSED`) $\rightarrow$ `status = "closed"`.
    7. `test_open311_get_request_by_id_not_found`: Mã không tồn tại $\rightarrow$ `404 Not Found`.
    8. `test_open311_privacy_media_url_no_raw_original`: Kiểm tra `media_url` không bao giờ để lộ ảnh `BEFORE_ORIGINAL`.
  * Chạy toàn bộ test suite dự án (`pytest`).
  * Subagent `reviewer` audit độc lập.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app backend/tests`
  * `py -m pytest backend/tests/test_open311.py -v`
  * `py -m pytest`

---

## 3. Rủi ro & Biện pháp Xử lý (Risks & Mitigations)

1. **Thứ tự Tọa độ trong Open311 (Lat, Long vs Long, Lat):**
   * *Rủi ro:* Open311 quy ước `lat` (vĩ độ) và `long` (kinh độ), trong khi PostGIS `ST_MakePoint` yêu cầu `(long, lat)`.
   * *Biện pháp:* Áp dụng chính xác `ST_MakePoint(payload.long, payload.lat)` tuân thủ Lỗi 7 trong `docs/lessons-learned.md`.
2. **Quyền riêng tư Hình ảnh:**
   * *Rủi ro:* `GET /requests/{id}.json` trả về `media_url` trỏ vào ảnh gốc chưa làm mờ `BEFORE_ORIGINAL`.
   * *Biện pháp:* Chỉ trích xuất media có `media_type in ("BEFORE_ANONYMIZED", "AFTER_PROOF")`, tuân thủ Lỗi 3 trong `docs/lessons-learned.md`.
