# Kế hoạch Triển khai: CSDL PostGIS, SQLAlchemy Models lõi và Hàng rào Địa lý Đà Nẵng

* **Mã tính năng:** `db-and-system-zones`
* **Nhánh dự kiến:** `feat/db-and-system-zones`
* **Mục tiêu:** Thiết lập kết nối PostGIS 16, định nghĩa toàn bộ SQLAlchemy ORM Models lõi theo kiến trúc trong `docs/spec.md`, viết script nạp GeoJSON ranh giới hành chính Đà Nẵng vào bảng `system_zones`, và cung cấp API kiểm tra hàng rào địa lý (`ST_Contains`).
* **Trạng thái:** Chờ phê duyệt (Pending Approval)

---

## 1. Phạm vi (Scope & Non-goals)

### Trong phạm vi (In-scope):
* Khởi động và kiểm tra CSDL PostgreSQL + PostGIS qua Docker.
* Kích hoạt các extension PostGIS trong CSDL: `postgis`, `pgcrypto`.
* Xây dựng đầy đủ các SQLAlchemy 2.0 Async ORM Models:
  * `system_zones` (Phân vùng địa lý và đa giác ranh giới `MultiPolygon`)
  * `departments` (Sở/ban ngành & đơn vị quản lý hạ tầng Đà Nẵng)
  * `categories` (Danh mục sự cố & định mức SLA mặc định)
  * `users` (Công dân, Điều phối viên, Cán bộ hiện trường, Quản trị viên)
  * `incidents` (Phiếu phản ánh sự cố kèm tọa độ `Point` 4326)
  * `incident_media` (Tập tin đính kèm trước/sau làm mờ và minh chứng hoàn thành)
  * `incident_history` (Nhật ký kiểm toán chuyển trạng thái)
  * `incident_feedback` (Đánh giá mức độ hài lòng của công dân)
* Tạo tệp GeoJSON ranh giới Vùng Đô thị Trung tâm Đà Nẵng (tổng hợp 6 quận nội thành & Hòa Vang).
* Viết script nạp dữ liệu mồi (`seed_data.py`): Tạo các sở ban ngành, danh mục sự cố, tài khoản quản trị mẫu và nạp đa giác vùng `DANANG_CORE`.
* Xây dựng router `/api/v1/zones`:
  * `GET /api/v1/zones/active`: Lấy danh sách vùng đang kích hoạt kèm GeoJSON ranh giới.
  * `POST /api/v1/zones/validate-location`: Thẩm định tọa độ $(lat, lon)$ có nằm trong ranh giới Đà Nẵng bằng PostGIS `ST_Contains`.

### Ngoài phạm vi (Non-goals):
* API xác thực người dùng (Auth JWT/OAuth) - làm ở feature tiếp theo.
* Gọi DeepSeek Vision API xử lý ảnh - làm ở feature tiếp theo.
* Giao diện người dùng Web Map - làm ở feature tiếp theo.

---

## 2. Danh sách các tệp thay đổi & tạo mới

* **Tạo mới:**
  * `backend/app/models/__init__.py`: Export toàn bộ models.
  * `backend/app/models/zone.py`: Model `SystemZone`.
  * `backend/app/models/department.py`: Model `Department`.
  * `backend/app/models/category.py`: Model `Category`.
  * `backend/app/models/user.py`: Model `User`.
  * `backend/app/models/incident.py`: Models `Incident`, `IncidentMedia`, `IncidentHistory`, `IncidentFeedback`.
  * `backend/app/schemas/zone.py`: Pydantic schemas cho Zone và Geofence check.
  * `backend/app/api/v1/endpoints/zones.py`: Endpoint `/zones`.
  * `backend/data/danang_core_boundary.geojson`: Dữ liệu ranh giới không gian Vùng Đô thị Trung tâm Đà Nẵng.
  * `backend/scripts/init_db.py`: Script khởi tạo bảng và kích hoạt extension PostGIS.
  * `backend/scripts/seed_data.py`: Script nạp dữ liệu khởi tạo.
  * `backend/tests/test_zones.py`: Kiểm thử API hàng rào địa lý.
* **Cập nhật:**
  * `backend/app/api/v1/router.py`: Gắn router `zones`.
  * `backend/app/core/database.py`: Hỗ trợ đăng ký models.
  * `backend/.env.example`: Đồng bộ cấu hình kết nối.

---

## 3. Các bước triển khai tuần tự (Ordered Steps)

### [x] Bước 2: Xây dựng các SQLAlchemy 2.0 ORM Models
* **Hành động:** 
  * Tạo các file model trong `backend/app/models/` sử dụng cú pháp SQLAlchemy 2.0 (`Mapped`, `mapped_column`, `relationship`).
  * Tích hợp `Geometry(geometry_type='MULTIPOLYGON', srid=4326)` cho `SystemZone` và `Geometry(geometry_type='POINT', srid=4326)` cho `Incident`.
* **Cách kiểm chứng:** `py -m py_compile backend/app/models/*.py` đạt exit code 0.

### [x] Bước 3: Chuẩn bị GeoJSON ranh giới Đà Nẵng & Script nạp dữ liệu mẫu
* **Hành động:**
  * Tạo `backend/data/danang_core_boundary.geojson` chứa đa giác không gian tọa độ bao quát 6 quận nội thành và huyện Hòa Vang.
  * Viết `backend/scripts/seed_data.py` nạp vùng `DANANG_CORE`, các sở/công ty hạ tầng tại Đà Nẵng và danh mục sự cố cơ bản kèm SLA.
* **Cách kiểm chứng:** File GeoJSON hợp lệ và cú pháp script `seed_data.py` đạt chuẩn.

### [x] Bước 4: Xây dựng Schemas & Endpoints `/api/v1/zones`
* **Hành động:**
  * Xây dựng Pydantic v2 schemas: `ZoneOut`, `LocationValidateIn`, `LocationValidateOut`.
  * Tạo router `backend/app/api/v1/endpoints/zones.py`:
    * `GET /api/v1/zones/active`: Trả về thông tin phân vùng và GeoJSON ranh giới.
    * `POST /api/v1/zones/validate-location`: Nhận `{lat, lon}`, thực thi câu lệnh PostGIS `ST_Contains` kiểm tra vị trí.
  * Gắn vào `backend/app/api/v1/router.py`.
* **Cách kiểm chứng:** Cú pháp chuẩn, tích hợp vào API v1.

### [x] Bước 5: Chạy toàn bộ kiểm thử và kiểm tra cú pháp
* **Hành động:** Chạy `py -m py_compile` toàn bộ backend và chạy test suite `test_zones.py`.
* **Cách kiểm chứng:** Kiểm thử không gian tự động 3/3 passed với pytest (`cau_rong`, `cau_song_han`, `ngu_hanh_son`, `hoa_khanh` nằm trong vùng; `ha_noi`, `hcm`, `bien_dong` bị loại).

### [ ] Bước 1 (Chờ bật Docker Desktop): Khởi động PostGIS và nạp dữ liệu vào Database
* **Hành động:** Bật Docker Desktop trên Windows, chạy `docker compose up -d db` và thực thi:
  * `py backend/scripts/init_db.py`
  * `py backend/scripts/seed_data.py`
* **Cách kiểm chứng:** Kiểm tra các bảng và bản ghi trong PostgreSQL qua lệnh query.

---

## 4. Rủi ro & Câu hỏi Mở (Risks & Open Questions)

* **Rủi ro:** Docker Desktop trên máy người dùng có thể chưa được bật khi chạy lệnh `docker compose up -d db`.
  * *Biện pháp:* Kiểm tra trạng thái Docker daemon trước khi chạy lệnh, nếu Docker chưa mở sẽ hướng dẫn người dùng bật Docker Desktop.
* **Rủi ro:** Driver `asyncpg` tương thích với kiểu `Geometry` của `GeoAlchemy2`.
  * *Biện pháp:* Sử dụng `ST_AsGeoJSON` hoặc truy vấn WKB chuẩn của PostGIS để serialize sang Pydantic schema mà không phụ thuộc vào adapter driver nhị phân phức tạp.
