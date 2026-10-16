# Kế hoạch Triển khai: API Tiếp nhận & Phân loại Sự cố Hiện trường (Incident Ingestion & AI Triage)

* **Mã tính năng:** `incident-ingestion-api`
* **Nhánh làm việc:** `feat/incident-ingestion-api`
* **Mục tiêu:** Xây dựng hoàn chỉnh luồng tiếp nhận phản ánh sự cố đa phương tiện: thẩm định hàng rào địa lý Đà Nẵng (PostGIS Geo-fencing), làm mờ mặt và biển số xe bảo vệ quyền riêng tư (OpenCV Gaussian Blur theo Nghị định 13/2023/NĐ-CP), phát hiện và gộp sự cố trùng lặp bán kính 50m (`ST_DWithin`), tự động phân loại sự cố chạy ngầm qua mô hình thị giác AI (DeepSeek Vision API), và cung cấp API tra cứu chi tiết/danh sách sự cố.
* **Trạng thái:** Chờ phê duyệt (Pending Approval)

---

## 1. Phạm vi (Scope & Non-goals)

### Trong phạm vi (In-scope):
1. **Dịch vụ Làm mờ ảnh Bảo vệ Quyền riêng tư (`app/services/anonymizer.py`):**
   - Quét khuôn mặt (`haarcascade_frontalface_default.xml`) và biển số xe (`haarcascade_russian_plate_number.xml`).
   - Áp dụng bộ lọc Gaussian Blur (`ksize=(35, 35)`) lên các vùng bounding box phát hiện được.
   - Lưu trữ phân tách bảo mật: Ảnh gốc (`BEFORE_ORIGINAL`) lưu tại `backend/uploads/private/` (không public); ảnh đã làm mờ (`BEFORE_ANONYMIZED`) lưu tại `backend/uploads/public/` (phục vụ cộng đồng và bản đồ).
2. **Dịch vụ Phân loại AI Thị giác ngầm (`app/services/deepseek_vision.py`):**
   - Đọc ảnh hiện trường và mã hóa Base64 Data URI (`data:image/jpeg;base64,...`).
   - Xây dựng prompt chứa ngữ cảnh đô thị Đà Nẵng cùng danh sách `code` động từ bảng `categories` và `departments`.
   - Gọi DeepSeek Vision API qua `httpx.AsyncClient` không chặn luồng chính (FastAPI `BackgroundTasks`).
   - Phân tích JSON trả về (strict schema): `category_code`, `priority`, `suggested_department_code`, `summary_vi`, `hazard_warning`, `confidence`.
   - Cập nhật bản ghi sự cố: gán `category_id`, `priority`, `assigned_department_id`, `ai_classification_raw`, `ai_confidence`, tự động chuyển trạng thái `SUBMITTED` $\rightarrow$ `TRIAGED` và ghi vào `incident_history`.
3. **Phát hiện & Lọc trùng lặp Không gian (`Spatial Deduplication`):**
   - Endpoint `GET /api/v1/incidents/nearby?latitude=...&longitude=...&radius=50`: Quét các sự cố chưa đóng trong bán kính 50m (`ST_DWithin`, `::geography`, SRID 4326).
   - Endpoint `POST /api/v1/incidents/{id}/vote-duplicate`: Tăng `duplicate_count += 1` khi người dân xác nhận gặp sự cố tương tự.
4. **Endpoint Tiếp nhận & Quản lý Sự cố (`/api/v1/incidents`):**
   - `POST /api/v1/incidents`: Tiếp nhận phản ánh dạng `multipart/form-data` (ảnh hiện trường, tiêu đề, mô tả, tọa độ GPS `latitude`/`longitude`, địa chỉ `address_text`, thông tin liên hệ).
   - Thẩm định hàng rào địa lý qua PostGIS `ST_Contains` với vùng `DANANG_CORE` (`is_active = True`). Nếu ngoài ranh giới, từ chối ngay với mã `422 Unprocessable Entity`.
   - Sinh mã tra cứu công khai `ticket_code` tự động theo định dạng `DN-YYYYMM-XXXX`.
   - Ghi bản ghi khởi tạo vào `incident_history` (`from_status=None`, `to_status='SUBMITTED'`, `note='Incident created by citizen'`).
   - `GET /api/v1/incidents/{ticket_code}`: Tra cứu chi tiết sự cố theo mã phiếu, trả về thông tin danh mục, trạng thái, cơ quan, ảnh làm mờ công khai, nhật ký xử lý.
   - `GET /api/v1/incidents`: Lấy danh sách sự cố phân trang, hỗ trợ lọc theo `status`, `district`, `category_id`.
5. **Danh mục hỗ trợ (`/api/v1/categories`, `/api/v1/departments`):**
   - `GET /api/v1/categories`: Lấy danh sách danh mục sự cố và SLA mặc định.
   - `GET /api/v1/departments`: Lấy danh sách các đơn vị tiếp nhận xử lý tại Đà Nẵng.
6. **Kiểm thử tự động (`backend/tests/test_incidents.py`):**
   - Kiểm thử unit test service làm mờ ảnh OpenCV (phát hiện và làm mờ khuôn mặt).
   - Kiểm thử hàng rào geofence khi tạo sự cố (chấp thuận điểm nội thành Đà Nẵng, từ chối điểm ngoài Đà Nẵng với mã 422).
   - Kiểm thử lọc trùng lặp 50m qua PostGIS.
   - Kiểm thử tích hợp DeepSeek Vision API với 100% Mocked responses (không tiêu tốn quota thật khi chạy test).

### Ngoài phạm vi (Non-goals):
* Kênh webhook Facebook Messenger (`/api/v1/webhooks/facebook`) — chuyển sang feature tiếp theo.
* Chuẩn mở Open311 GeoReport v2 (`/open311/v2`) — chuyển sang feature tiếp theo.
* Đổi trạng thái thi công của Kỹ thuật viên (`IN_PROGRESS` $\rightarrow$ `RESOLVED` kèm ảnh `AFTER_PROOF`) — thuộc quy trình điều phối & hiện trường (Dispatcher & Field Worker Workflow).
* Giao diện người dùng Web Map frontend (thực hiện sau khi hoàn tất API backend).

---

## 2. Danh sách các tệp thay đổi & tạo mới

* **Tạo mới:**
  * `backend/app/services/__init__.py`: Export các service module.
  * `backend/app/services/anonymizer.py`: OpenCV Face & Plate Anonymization service.
  * `backend/app/services/deepseek_vision.py`: DeepSeek Multimodal/Vision client service.
  * `backend/app/schemas/incident.py`: Pydantic schemas cho Incident Ingestion, Detail, List, Nearby, Category, Department.
  * `backend/app/api/v1/endpoints/incidents.py`: Router `/incidents`.
  * `backend/app/api/v1/endpoints/categories.py`: Router `/categories`.
  * `backend/app/api/v1/endpoints/departments.py`: Router `/departments`.
  * `backend/tests/test_anonymizer.py`: Kiểm thử service làm mờ ảnh OpenCV.
  * `backend/tests/test_incidents.py`: Kiểm thử bộ API tạo sự cố, geofence, deduplication, AI mock triage.
* **Cập nhật:**
  * `backend/app/schemas/__init__.py`: Export các schema mới.
  * `backend/app/api/v1/router.py`: Đăng ký router `incidents`, `categories`, `departments`.
  * `backend/app/main.py`: Cập nhật mount static files bảo đảm chỉ public thư mục `uploads/public/`.
  * `docs/plans/incident-ingestion-api.md`: Cập nhật tiến độ thực hiện.

---

## 3. Các bước triển khai tuần tự (Ordered Steps)

### [x] Bước 1: Xây dựng Module Làm mờ Ảnh Bảo vệ Quyền riêng tư (`anonymizer.py`)
* **Hành động:**
  * Tạo `backend/app/services/anonymizer.py`.
  * Sử dụng OpenCV `cv2.CascadeClassifier` với `cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'` và `haarcascade_russian_plate_number.xml`.
  * Cung cấp hàm `anonymize_image(input_path: Path, output_path: Path) -> AnonymizationResult` áp dụng Gaussian Blur `ksize=(35, 35)` lên các tọa độ phát hiện được.
  * Cập nhật `backend/app/main.py` để tách bạch `backend/uploads/public/` và `backend/uploads/private/`.
* **Kết quả:** Đã hoàn thành, Reviewer audit: `STATUS: PASS`, 8/8 unit tests đạt 100%.

### [ ] Bước 2: Xây dựng Service Tích hợp DeepSeek Vision API (`deepseek_vision.py`)
* **Hành động:**
  * Tạo `backend/app/services/deepseek_vision.py`.
  * Hàm `classify_incident_image(image_path: Path, description: str, categories: list, departments: list) -> dict`.
  * Mã hóa ảnh thành Base64 Data URI, gửi request bất đồng bộ tới `https://api.deepseek.com/chat/completions` (hoặc cấu hình trong `Settings`).
  * Xử lý structured JSON response với các trường: `category_code`, `priority`, `suggested_department_code`, `summary_vi`, `hazard_warning`, `confidence`.
  * Hỗ trợ mock mode khi `DEBUG=True` hoặc khi gọi từ pytest fixture.
* **Kiểm chứng:**
  * Lệnh: `py -m compileall -q backend/app`.

### [ ] Bước 3: Định nghĩa Pydantic Schemas (`schemas/incident.py`)
* **Hành động:**
  * Tạo `backend/app/schemas/incident.py`:
    * `IncidentCreateForm`: Nhận dữ liệu multipart từ request.
    * `IncidentOut`: Dữ liệu tóm tắt sự cố (kèm `ticket_code`, `status`, `priority`, `distance_meters`, `anonymized_image_url`).
    * `IncidentDetailOut`: Dữ liệu chi tiết đầy đủ (kèm lịch sử `history`, thông tin cơ quan, danh mục, tọa độ).
    * `IncidentNearbyOut`: Danh sách sự cố lân cận trong 50m.
    * `CategoryOut`, `DepartmentOut`: Schema danh mục và phòng ban.
  * Export trong `backend/app/schemas/__init__.py`.
* **Kiểm chứng:**
  * Lệnh: `py -m compileall -q backend/app`.

### [ ] Bước 4: Xây dựng Endpoints Danh mục (`/categories`, `/departments`)
* **Hành động:**
  * Tạo `backend/app/api/v1/endpoints/categories.py`: `GET /categories`.
  * Tạo `backend/app/api/v1/endpoints/departments.py`: `GET /departments`.
  * Đăng ký vào `backend/app/api/v1/router.py`.
* **Kiểm chứng:**
  * Lệnh: `py -m compileall -q backend/app`.

### [ ] Bước 5: Xây dựng Endpoints Tiếp nhận Sự cố & Lọc Trùng lặp (`/incidents`)
* **Hành động:**
  * Tạo `backend/app/api/v1/endpoints/incidents.py`:
    * `POST /`: Tiếp nhận upload ảnh, kiểm tra hàng rào địa lý `ST_Contains(boundary, ST_SetSRID(ST_MakePoint(lon, lat), 4326))` trên `system_zones` (`is_active = True`), từ chối `422` nếu ngoài vùng; lưu ảnh gốc vào `uploads/private/`, chạy làm mờ lưu vào `uploads/public/`; sinh `ticket_code` (`DN-YYYYMM-XXXX`); lưu bản ghi `incidents`, `incident_media` (`BEFORE_ORIGINAL`, `BEFORE_ANONYMIZED`), `incident_history`; đưa tác vụ phân loại DeepSeek Vision vào `BackgroundTasks`.
    * `GET /nearby`: Quét sự cố trong bán kính bằng `ST_DWithin(location, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, 50)`.
    * `POST /{id}/vote-duplicate`: Tăng `duplicate_count += 1`.
    * `GET /{ticket_code}`: Tra cứu chi tiết sự cố theo mã công khai.
    * `GET /`: Danh sách sự cố hỗ trợ phân trang và lọc theo trạng thái, quận/huyện.
  * Gắn router vào `backend/app/api/v1/router.py`.
* **Kiểm chứng:**
  * Lệnh: `py -m compileall -q backend/app`.

### [ ] Bước 6: Viết Bộ Test Suite Tự động & Reviewer Audit
* **Hành động:**
  * Tạo `backend/tests/test_incidents.py`:
    * Mock toàn bộ DeepSeek Vision API (không gọi external API thật).
    * Test tiếp nhận sự cố thành công tại Đà Nẵng (Cầu Rồng, Cầu Sông Hàn).
    * Test từ chối sự cố ngoài Đà Nẵng (422 Unprocessable Entity).
    * Test phát hiện sự cố lân cận 50m (`/nearby`) và vote trùng lặp (`/vote-duplicate`).
    * Test tra cứu chi tiết sự cố theo `ticket_code`.
  * Chạy toàn bộ test suite.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`
  * `py -m pytest backend/tests/test_anonymizer.py -v`
  * `py -m pytest backend/tests/test_incidents.py -v`

---

## 4. Rủi ro & Biện pháp Xử lý (Risks & Mitigations)

1. **Rủi ro phụ thuộc Haarcascade XML:** Đường dẫn tệp XML có thể khác nhau giữa các nền tảng OS.
   * *Biện pháp:* Sử dụng `cv2.data.haarcascades` đã được kiểm chứng có sẵn trên Python Windows/Linux để định vị chính xác đường dẫn tệp XML.
2. **Rủi ro ảnh dung lượng lớn làm chậm HTTP request:** Quá trình làm mờ ảnh và gọi AI có thể gây timeout nếu xử lý đồng bộ.
   * *Biện pháp:* Lưu trữ ảnh gốc nhanh chóng, làm mờ đồng bộ tối ưu kích thước ảnh (resize nếu kích thước quá lớn $>1920px$), và đưa việc gọi DeepSeek Vision API vào `BackgroundTasks` chạy nền.
3. **Rủi ro rò rỉ hình ảnh chưa làm mờ:** Người dùng có thể truy cập URL ảnh gốc nếu thư mục upload được mount công khai.
   * *Biện pháp:* Tách bạch `backend/uploads/public/` (chỉ mount thư mục này qua StaticFiles) và `backend/uploads/private/` (chỉ cho phép truy cập qua endpoint có RBAC role `DISPATCHER` / `ADMIN`).
4. **Rủi ro cạn hạn mức API khi chạy test tự động:**
   * *Biện pháp:* Áp dụng triệt để Mocking cho DeepSeek Vision API trong tất cả các bài test tự động (`pytest` fixture `monkeypatch` / `unittest.mock`).
