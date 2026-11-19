# Kế Hoạch: Thêm Mục "Cài Đặt" (Hình Bánh Răng) Chứa Công Cụ Vẽ Đa Giác GIS & Cài Đặt Lõi, Làm Sạch "Map Trơn" Công Dân & Xóa 100% Dữ Liệu Mock (`custom-zone-drawer-clean-map-and-remove-admin-mocks.md`)

> **Nhánh thực hiện:** `feat/custom-zone-drawer-and-no-admin-mocks`  
> **Mục tiêu:**  
> 1. Thêm mục **Cài đặt** (biểu tượng hình bánh răng `Settings`) vào thanh điều hướng Sidebar (`AdminRail`) làm nơi tập trung các cài đặt cốt lõi của hệ thống, mở đầu bằng **Trình vẽ & Hiệu chỉnh Đa giác Ranh giới GIS (`GIS Polygon Studio`)** bên cạnh các thông số lõi hệ thống.  
> 2. Đảm bảo bản đồ của Công dân là **"Map trơn 100%"** (chỉ Admin mới thấy ranh giới phân vùng) và khi Công dân chọn vào khu vực đã tắt ở `/report` sẽ báo lỗi **`"Ngoài ranh giới Đà Nẵng hoặc vùng đang tạm dừng"`**.  
> 3. Xóa sạch 100% dữ liệu mock còn sót lại trong tất cả các màn hình Admin và hệ thống.

---

## 1. Thiết Kế Chi Tiết 3 Hạng Mục

### Hạng mục 1: Thêm mục Sidebar "Cài đặt" (Hình bánh răng `Settings` — `/admin/system-settings`) chứa Công cụ Vẽ lại Đa giác GIS & Cài đặt lõi hệ thống
- **Thanh điều hướng Sidebar (`frontend/src/components/nav.tsx` & `DevMenu.tsx`):**
  - Thêm mục mới **`{ icon: Settings, label: 'Cài đặt', path: '/admin/system-settings' }`** (biểu tượng hình bánh răng) vào `AdminRail` (và giữ nguyên `/admin/zones` chỉ để bật/tắt nhanh tiếp nhận phản ánh).
- **Màn hình Cài đặt hệ thống (`frontend/src/screens/SystemSettingsScreen.tsx` tại route `/admin/system-settings`):**
  - Được thiết kế làm trung tâm cài đặt cốt lõi của hệ thống (Core System Settings) với các phân khu rõ ràng:
    1. **Công cụ Vẽ & Hiệu chỉnh Đa giác GIS (`GIS Polygon Boundary Studio`):**
       - Chọn khu vực cần vẽ lại (`Hải Châu`, `Thanh Khê`, `Sơn Trà`, `Cẩm Lệ`, `Ngũ Hành Sơn`, `Liên Chiểu`, `Hòa Vang` hoặc toàn vùng `DANANG_CORE`).
       - **Chế độ "Vẽ mới từ đầu" (`Draw Polygon`):** Click trực tiếp từng điểm trên bản đồ Goong Map để tự vẽ đa giác ranh giới mới theo ý muốn; hiển thị đường nối trực tiếp, số lượng đỉnh, và tự động khép kín vùng.
       - **Chế độ "Kéo chỉnh từng điểm đỉnh" (`Edit Vertices`):** Hiển thị các chốt đỉnh (`draggable vertex handles`) trên bản đồ để kéo thả vị trí từng điểm, click điểm giữa cạnh để chèn thêm đỉnh mới, hoặc xóa đỉnh bất kỳ.
       - **Thao tác & Lưu trữ:** `Hoàn tác điểm vừa chấm`, `Xóa toàn bộ điểm đang vẽ`, `Khôi phục ranh giới gốc`, `Nhập/Xuất GeoJSON`, và **`Lưu ranh giới vào PostGIS`** (`PATCH /api/v1/zones/{zone_id}`). Khi bấm Lưu, hình học đa giác mới được ghi trực tiếp vào cột `SystemZone.boundary` trong PostGIS và đồng bộ ngay lập tức sang trang `/admin/zones` cũng như bộ kiểm tra tọa độ trên `/report`.
    2. **Các cài đặt cốt lõi khác của hệ thống (Core Engine Settings) đặt cạnh công cụ GIS:**
       - Cấu hình ngưỡng không gian & AI lõi: Bán kính gom trùng sự cố (`50m`), Ngưỡng sai lệch GPS nghiệm thu KTV (`50m`), Chế độ làm mờ Nghị định 13/2023/NĐ-CP (`OpenCV Blur`), Chế độ AI Phân loại (`DeepSeek Vision` / `OpenCV Visual Feature Analyzer`), và liên kết đồng bộ với cấu hình SLA / Danh mục / Đơn vị.
- **Backend (`backend/app/schemas/zone.py` & `backend/app/api/v1/endpoints/zones.py`):**
  - Mở rộng `ZoneUpdateIn` nhận thêm `geojson_geometry: Optional[Dict[str, Any]] = None`.
  - Trong `PATCH /api/v1/zones/{zone_id}`: chuyển đổi `geojson_geometry` (`Polygon` / `MultiPolygon`) qua Shapely + GeoAlchemy2 (`from_shape(geom, srid=4326)`) để cập nhật trực tiếp `zone.boundary` và `zone.bounding_box` trong PostGIS.

---

### Hạng mục 2: Bản đồ Công dân là "Map trơn 100%" & Báo lỗi chính xác khi chọn vào khu vực đã tắt
- **Map trơn cho Công dân (`frontend/src/components/GoongBentoMap.tsx`):**
  - Khi không ở màn quản trị phân vùng (`!interactiveZones`, tức trên Trang chủ `/`, Báo cáo `/report`, v.v.): tắt hoàn toàn cả 3 lớp `LAYER_DISTRICTS_FILL`, `LAYER_DISTRICTS_ACTIVE_LINE`, `LAYER_DISTRICTS_PAUSED_LINE` (`opacity = 0`). Công dân sẽ thấy bản đồ Goong Map trơn hoàn toàn, không còn thấy border xám hay nền xám của các quận đã tắt.
- **Kiểm tra vùng đã tắt & ranh giới mới vẽ theo dữ liệu thật từ PostGIS (`GoongBentoMap.tsx` & `ReportScreen.tsx`):**
  - Cập nhật `findDistrictAtLngLat(lng, lat)` và bổ sung `ensureLiveZonesLoaded()` / `invalidateLiveZonesCache()` để luôn kiểm tra tọa độ dựa trên danh sách phân vùng thật từ Backend (`cachedLiveZones` gồm cả trạng thái `is_active` và `geojson_geometry` mà bạn vừa vẽ trong mục Cài đặt).
  - Trên `ReportScreen.tsx`: khi Công dân chấm hoặc kéo ghim vào bất kỳ khu vực nào đang bị tắt (`on === false`) hoặc nằm ngoài đa giác ranh giới mới vẽ, hệ thống lập tức hiện ghim đỏ kèm Toast **`"Ngoài ranh giới Đà Nẵng hoặc vùng đang tạm dừng"`** và khóa nút **"Gửi phản ánh"**.
  - Khi tự động ghim lúc mới chọn ảnh, nếu quận mặc định đang bị tắt thì tự động chuyển ghim mặc định về Quận/Huyện đang hoạt động (ví dụ `Ngũ Hành Sơn`).

---

### Hạng mục 3: Xóa sạch 100% dữ liệu Mock trong các màn hình Admin & Hệ thống
- **`AnalyticsScreen.tsx` (`/admin/analytics`):** Xóa mảng `districts` gắn cứng số liệu giả (`[64, 262]`, `[52, 215]`, `384 phút`, `94%`). Tính toán trực tiếp tổng sự cố, số sự cố & tỷ lệ hoàn thành từng Quận/Huyện, điểm nóng Heatmap, thời gian xử lý trung bình và SLA từ dữ liệu sự cố thật (`getTickets()` + `apiGetAnalyticsSummary()`).
- **`AuditLogsScreen.tsx` (`/admin/audit-logs`):** Xóa mảng 34 dòng nhật ký giả `logs = Array.from({ length: 34 }, ...)` và bỏ lệnh ghép `[...mapped, ...logs]`; lọc bỏ các mã mẫu `DN-202610-*`, chỉ hiển thị 100% nhật ký thật từ PostgreSQL (`GET /api/v1/audit-logs`).
- **`UsersScreen.tsx` (`/admin/users`):** Xóa mảng 12 người dùng giả `seed`; chỉ hiển thị tài khoản thật từ `GET /api/v1/users` và phòng ban thật từ `GET /api/v1/departments`.
- **`SettingsScreen.tsx` (`/admin/settings`) & `ZonesScreen.tsx` (`/admin/zones`):** Xóa các con số giả (`38, 21, 64...`, `24, 18, 11...`) và 5 đội giả `unitSeed`; đếm số phiếu thật từ `getTickets()` và hiển thị danh mục/đơn vị thật từ PostgreSQL.
- **`IntegrationsScreen.tsx`, `NotificationsScreen.tsx`, `TaskDetailScreen.tsx`, `TechnicianHistoryScreen.tsx`:** Xóa toàn bộ số liệu lưu lượng giả (`12.480`, `38.215`, `42 vụ`), thông báo giả `DN-202610-*` và `<SamplePhoto />`; dùng dữ liệu và ảnh thật 100%.

---

## 2. Danh Sách File Được Phép Thay Đổi (Allowed Files)

- `backend/app/schemas/zone.py`
- `backend/app/api/v1/endpoints/zones.py`
- `frontend/src/lib/backend-api.ts`
- `frontend/src/components/nav.tsx`
- `frontend/src/components/DevMenu.tsx`
- `frontend/src/components/GoongBentoMap.tsx`
- `frontend/src/screens/SystemSettingsScreen.tsx` *(mới)*
- `frontend/src/app/admin/system-settings/page.tsx` *(mới)*
- `frontend/src/screens/ZonesScreen.tsx`
- `frontend/src/screens/ReportScreen.tsx`
- `frontend/src/screens/AnalyticsScreen.tsx`
- `frontend/src/screens/AuditLogsScreen.tsx`
- `frontend/src/screens/UsersScreen.tsx`
- `frontend/src/screens/SettingsScreen.tsx`
- `frontend/src/screens/IntegrationsScreen.tsx`
- `frontend/src/screens/NotificationsScreen.tsx`
- `frontend/src/screens/TaskDetailScreen.tsx`
- `frontend/src/screens/TechnicianHistoryScreen.tsx`
- `docs/plans/custom-zone-drawer-clean-map-and-remove-admin-mocks.md`

---

## 3. Các Bước Thực Hiện Tuần Tự (2 Commits)

### [x] Bước 1: Thêm Mục Sidebar "Cài Đặt" (Hình Bánh Răng) Với Công Cụ Vẽ Đa Giác GIS, Làm Sạch "Map Trơn" Công Dân & Chuẩn Hóa Kiểm Tra Vùng Tạm Dừng (Hạng mục 1 & 2)
- Nâng cấp `ZoneUpdateIn` (`backend/app/schemas/zone.py`) và `PATCH /api/v1/zones/{zone_id}` (`backend/app/api/v1/endpoints/zones.py`) để lưu `geojson_geometry` mới vào PostGIS (`SystemZone.boundary`).
- Thêm mục **Cài đặt** (biểu tượng bánh răng `Settings`, route `/admin/system-settings`) vào `AdminRail` trong `frontend/src/components/nav.tsx` và `DevMenu.tsx`.
- Xây dựng `SystemSettingsScreen.tsx` và nâng cấp `GoongBentoMap.tsx` với công cụ **Trình vẽ & Hiệu chỉnh Đa giác GIS (`GIS Polygon Studio`)** (Vẽ mới từng điểm, Kéo thả/Thêm/Xóa điểm đỉnh, Hoàn tác, Khôi phục gốc, Lưu trực tiếp xuống PostGIS) bên cạnh các cài đặt lõi hệ thống.
- Cập nhật `GoongBentoMap.tsx` và `ReportScreen.tsx`: ẩn hoàn toàn border/fill phân vùng trên bản đồ Công dân (`opacity = 0`) và đồng bộ `findDistrictAtLngLat()` với dữ liệu vùng thời gian thực từ PostgreSQL để báo lỗi **`"Ngoài ranh giới Đà Nẵng hoặc vùng đang tạm dừng"`** ngay khi chọn vào vùng đã tắt hoặc ngoài đa giác vừa vẽ.
- **Lệnh kiểm tra:** `py -m compileall -q backend/app && py -m pytest backend/tests/test_zones.py -q` và `npx tsc --noEmit` (trong `frontend/`).
- **Commit 1:** `feat(admin): add gear settings sidebar item with interactive GIS polygon boundary editor and enforce clean citizen map`

### [x] Bước 2: Xóa Sạch 100% Dữ Liệu Mock Trong Toàn Bộ Các Màn Hình Admin & Hệ Thống (Hạng mục 3)
- Cập nhật `AnalyticsScreen.tsx`, `AuditLogsScreen.tsx`, `UsersScreen.tsx`, `SettingsScreen.tsx`, `ZonesScreen.tsx`, `IntegrationsScreen.tsx`, `NotificationsScreen.tsx`, `TaskDetailScreen.tsx`, `TechnicianHistoryScreen.tsx` để xóa toàn bộ mảng dữ liệu mock cứng và chỉ hiển thị dữ liệu, số liệu, nhật ký và hình ảnh thực tế từ PostgreSQL.
- **Lệnh kiểm tra:** `npx tsc --noEmit` (trong `frontend/`).
- **Commit 2:** `fix(admin): remove all remaining mock datasets across admin analytics, users, settings, audit logs, and technician screens`
