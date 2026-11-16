# Kế Hoạch Tách Đa Giác Phân Vùng GIS Cấp Quận/Huyện Đà Nẵng (`district-gis-zones.md`)

> **Nhánh thực hiện:** `feat/backend-auxiliary-completion`  
> **Mục tiêu:** Tách vùng lõi Đà Nẵng (`DANANG_CORE`, 8.007 đỉnh) thành **7 đa giác phân vùng GIS cấp Quận/Huyện chuẩn WGS84 (`SRID 4326`)** (`HC`, `TK`, `ST`, `CL`, `NHS`, `LC`, `HV`) để khớp hoàn toàn với màn hình Quản lý Phân vùng GIS (`/admin/zones` — Màn 26) và cơ chế bật/tắt tiếp nhận sự cố theo từng Quận/Huyện bằng PostGIS `ST_Contains`.

---

## 1. Mục tiêu & Phạm vi (Goal & Scope)

### 1.1. Mục tiêu nghiệp vụ & kỹ thuật
1. **Bộ đa giác GIS 7 Quận/Huyện khớp tuyệt đối với đường bờ biển & ranh giới Đà Nẵng (`backend/data/danang_districts_boundary.geojson`):**
   - Cắt/phân hoạch hình học chính xác trên nền đa giác chuẩn GADM 8.007 đỉnh (`DANANG_CORE`) thành 7 phân vùng khép kín, không chồng lấn, hợp nhất bằng đúng `DANANG_CORE`:
     - `HC`: **Hải Châu** (`is_active = True`)
     - `TK`: **Thanh Khê** (`is_active = True`)
     - `ST`: **Sơn Trà** (`is_active = True`)
     - `CL`: **Cẩm Lệ** (`is_active = True`)
     - `NHS`: **Ngũ Hành Sơn** (`is_active = True`)
     - `LC`: **Liên Chiểu** (`is_active = True`)
     - `HV`: **Hòa Vang** (`is_active = True` khi seed mặc định để mọi điểm kiểm thử Đà Nẵng hợp lệ, hỗ trợ Admin bật/tắt tức thì qua `PATCH /api/v1/zones/HV`).
   - Giữ nguyên file `backend/data/danang_core_boundary.geojson` để toàn bộ 12 bài test trắc địa gốc trong `backend/tests/test_zones.py` tiếp tục pass 100%.
2. **Đồng bộ CSDL `system_zones` (`backend/scripts/seed_data.py`):**
   - Seed 7 phân vùng cấp Quận/Huyện (`HC`, `TK`, `ST`, `CL`, `NHS`, `LC`, `HV`) vào bảng `system_zones` (và xóa bản ghi gộp `DANANG_CORE` cũ trong DB nếu tồn tại để việc tắt 1 quận không bị `DANANG_CORE` ghi đè).
3. **Đồng bộ API `/api/v1/zones` & Kiểm soát Geofence theo Quận/Huyện (`zones.py`, `incidents.py`):**
   - `GET /api/v1/zones`: Trả danh sách 7 Quận/Huyện kèm `geojson_geometry` (đa giác WGS84 thật), `bounding_box`, `is_active`, và `open_incident_count` đếm riêng số phiếu đang mở của từng Quận/Huyện.
   - `POST /api/v1/zones/validate-location`: Kiểm tra `ST_Contains(SystemZone.boundary, point)` trên các vùng có `is_active == True`, trả về đúng `zone_id` (mã quận) và `zone_name` (tên Quận/Huyện). Nếu điểm thuộc Quận/Huyện đang tạm dừng (`is_active == False`) hoặc nằm ngoài Đà Nẵng thì trả `is_inside = False`.
   - `POST /api/v1/incidents`: Khi kiểm tra `ST_Contains`, lấy luôn `SystemZone.name` của vùng khớp để tự động điền `incident.district` nếu người gửi chưa truyền `district`.
4. **Bảo mật tài liệu (`docs/plans/goong-map-and-gadm-boundary.md`):**
   - Che (`<REDACTED_GOONG_MAPTILES_KEY>`) chuỗi API key Goong bị ghi cứng trong file kế hoạch cũ.

### 1.2. Vùng cấm tuyệt đối (Non-goals)
- **KHÔNG** sửa các file trong `ui-prototype/` hoặc `frontend/`.
- **KHÔNG** sửa `backend/data/danang_core_boundary.geojson` hay xóa bất kỳ test cũ nào trong `backend/tests/test_zones.py`.

---

## 2. Danh Sách File Được Phép Thay Đổi (Allowed Files)

- `backend/data/danang_districts_boundary.geojson` *(tạo mới)*
- `backend/scripts/seed_data.py`
- `backend/app/api/v1/endpoints/zones.py`
- `backend/app/api/v1/endpoints/incidents.py`
- `backend/tests/test_zones.py`
- `backend/tests/test_auxiliary_admin_and_open311.py`
- `docs/plans/goong-map-and-gadm-boundary.md`
- `docs/plans/district-gis-zones.md`

---

## 3. Các Bước Thực Hiện Tuần Tự (2 Commits)

### [x] Bước 1: Tạo `backend/data/danang_districts_boundary.geojson` & Cập nhật `seed_data.py`
- Sử dụng Shapely cắt đa giác chuẩn `DANANG_CORE` (8.007 đỉnh) theo ranh giới địa lý thực tế của 7 Quận/Huyện Đà Nẵng (`HC`, `TK`, `ST`, `CL`, `NHS`, `LC`, `HV`), đảm bảo:
  - Mỗi đa giác hợp lệ (`is_valid`), chuẩn WGS84 `[longitude, latitude]`.
  - Các địa danh thực tế khớp đúng Quận/Huyện: Cầu Rồng / TTHC Đà Nẵng $\in$ `HC`, Điện Biên Phủ $\in$ `TK`, Bán đảo Sơn Trà / Ngô Quyền $\in$ `ST`, Ngũ Hành Sơn $\in$ `NHS`, Cẩm Lệ $\in$ `CL`, Hòa Khánh $\in$ `LC`, Bà Nà / Hòa Phong $\in$ `HV`.
- Cập nhật `backend/scripts/seed_data.py` để nạp 7 Quận/Huyện vào `system_zones` (và dọn bản ghi `DANANG_CORE` cũ trong bảng `system_zones`).
- Che key bị lộ trong `docs/plans/goong-map-and-gadm-boundary.md`.
- **Lệnh kiểm tra:** `py backend/scripts/seed_data.py && py -m pytest backend/tests/test_zones.py`
- **Commit 1:** `feat(gis): partition Danang core boundary into 7 district GIS polygons and seed system_zones`

### [x] Bước 2: Đếm `open_incident_count` theo Quận tại `GET /zones`, Tự động suy ra `district` qua `ST_Contains` & Viết Tests
- Trong `backend/app/api/v1/endpoints/zones.py`:
  - Tại `GET /api/v1/zones`: tính `open_incident_count` theo từng Quận/Huyện (dựa trên `Incident.district` hoặc `ST_Contains`), trả đầy đủ 7 phân vùng Quận/Huyện kèm `geojson_geometry`.
- Trong `backend/app/api/v1/endpoints/incidents.py`:
  - Tại `POST /api/v1/incidents`: truy vấn `select(SystemZone.id, SystemZone.name).where(SystemZone.is_active.is_(True), ST_Contains(SystemZone.boundary, point_geom))`; nếu `district` chưa được gửi lên form thì gán tự động theo tên Quận/Huyện khớp.
- Thêm kiểm thử trong `backend/tests/test_zones.py` và `backend/tests/test_auxiliary_admin_and_open311.py` xác nhận:
  - 7 đa giác Quận/Huyện hợp lệ, bao phủ đúng các tọa độ đặc trưng từng quận.
  - Khi tắt 1 quận (`PATCH /api/v1/zones/HV` với `is_active=False`), điểm trong quận đó bị từ chối trong khi các quận đang bật vẫn hoạt động bình thường.
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest`
- **Commit 2:** `feat(zones): enforce per-district geofence toggle and open incident counts`

---

## 4. Rủi ro & Câu hỏi Mở
- **Rủi ro:** Các bài test hiện có (`test_e2e_lifecycle_db.py`, `seed_demo.py`) gửi sự cố tại Hải Châu, Thanh Khê, Sơn Trà.
- **Giảm thiểu:** Mặc định khi chạy `seed_data.py`, cả 7 Quận/Huyện đều có `is_active=True` để không làm gãy bất kỳ luồng test nào; Admin có thể bật/tắt từng Quận/Huyện qua `PATCH /api/v1/zones/{zone_id}`.
