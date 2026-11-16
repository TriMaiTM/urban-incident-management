# Kế Hoạch Nhúng Goong Map Toàn Hệ Thống & Chuẩn Hóa Ranh Giới Hành Chính GADM Cấp Quận/Huyện (`goong-map-everywhere-and-gadm-districts.md`)

> **Nhánh thực hiện:** `feat/goong-map-everywhere-and-gadm-districts`  
> **Mục tiêu:**  
> 1. **Thay thế 100% bản đồ ảnh tĩnh (`/danang-map.png` / SVG giả lập) trên toàn bộ 34 màn hình** bằng **Goong Maps (`maplibre-gl` + Goong Vector Tiles `https://tiles.goong.io/assets/goong_map_web.json`)** có đầy đủ đường phố, kiệt/hẻm, sông cầu, khối nhà 3D và địa danh Đà Nẵng.  
> 2. **Xóa bỏ hoàn toàn ranh giới GIS hardcode cũ** (viền xanh vẽ chết trong ảnh `/danang-map.png`, đa giác 5 đỉnh `zoneSeed` trong `ZonesScreen.tsx`, và các nhát cắt đường thẳng nhân tạo giữa các quận) — thay bằng **ranh giới hành chính chuẩn GADM 4.1 Level-2 (cấp Quận/Huyện)** cho 7 Quận/Huyện Đà Nẵng (`Hải Châu`, `Thanh Khê`, `Sơn Trà`, `Cẩm Lệ`, `Ngũ Hành Sơn`, `Liên Chiểu`, `Hòa Vang`).

---

## 1. Nguyên Nhân Của 2 Vấn Đề Bạn Vừa Phát Hiện Trên Giao Diện

1. **Vì sao bản đồ vẫn là ảnh mẫu tĩnh và có 2 đường ranh giới đè lên nhau?**
   - Các component bản đồ được chuyển từ `ui-prototype/` (`MapBentoViewport` trong `frontend/src/components/data.tsx`, `MapCanvas` trong `frontend/src/components/MapArt.tsx`, `ZonesScreen.tsx`, `FieldUnitsScreen.tsx`) vẫn đang render thẻ `<img src="/danang-map.png" />`.
   - Bản thân bức ảnh `/danang-map.png` đã có **một đường viền màu xanh dương vẽ chết trên ảnh**. Khi vẽ thêm lớp đa giác GIS màu đỏ lên trên, đường màu đỏ và đường màu xanh trong ảnh tĩnh đè lên nhau.
2. **Vì sao ranh giới giữa các quận lại là các đường thẳng cắt chéo/vuông góc?**
   - File `backend/data/danang_districts_boundary.geojson` ở bước trước được tạo bằng cách dùng các hộp/đoạn thẳng cắt đa giác tổng `DANANG_CORE` (vốn chỉ có biên ngoài của TP Đà Nẵng), thay vì lấy ranh giới hành chính cấp Quận/Huyện (`ADM_2` — GADM 4.1 Level 2) bám dọc theo sông Hàn, sông Cẩm Lệ, sông Cu Đê và ranh giới hành chính thật.
   - Ngoài ra, `ZonesScreen.tsx` vẫn giữ `zoneSeed` (các đa giác 5–8 đỉnh hardcode theo tọa độ pixel cũ) làm giá trị khởi tạo trước khi API trả về.

---

## 2. Phạm Vi & Vùng Cấm (Scope & Non-goals)

### 2.1. Phạm vi thực hiện
1. **Chuẩn hóa dữ liệu GIS 7 Quận/Huyện theo GADM 4.1 Level-2 (`ADM_2`):**
   - Cập nhật `backend/data/danang_districts_boundary.geojson` và tạo bản đồng bộ `frontend/src/data/danang_districts_boundary.json` từ dữ liệu hành chính cấp Quận/Huyện GADM 4.1 (`Hải Châu`, `Thanh Khê`, `Sơn Trà`, `Ngũ Hành Sơn`, `Liên Chiểu`, `Cẩm Lệ`, `Hòa Vang`), đồng bộ biên ngoài với `danang_core_boundary.geojson` để giữ 100% tương thích với toàn bộ bài test trắc địa PostGIS.
   - Chạy lại `backend/scripts/seed_data.py` để cập nhật 7 đa giác GADM Quận/Huyện thật vào bảng `system_zones` trong PostGIS.
2. **Nâng cấp `MapBentoViewport` (`frontend/src/components/data.tsx`) sang Goong Map (`maplibre-gl`) thật:**
   - Thay thế hoàn toàn `<img src="/danang-map.png">` và `<svg>` giả lập trong `MapBentoViewport` bằng bản đồ tương tác **Goong Map (`maplibre-gl`)** sử dụng `NEXT_PUBLIC_GOONG_MAPTILES_KEY` (tự động fallback sang Carto Voyager @2x nếu thiếu key hoặc lỗi mạng).
   - Hỗ trợ đầy đủ mọi chế độ mà 10 màn hình đang truyền vào `MapBentoViewport`:
     - Hiển thị ranh giới các Quận/Huyện đang hoạt động (`activeZones`) bằng lớp GeoJSON mượt dưới nhãn tên đường Goong Map.
     - Hiển thị các ghim sự cố (`pins`) theo đúng màu mức độ (`urgent`, `high`, `normal`, `low`, `done`), hỗ trợ click chọn ghim (`onPinClick`) và hiệu ứng pulse.
     - Hiển thị ghim vị trí người dùng/sự cố đang chọn (`userPin`) kèm vòng tròn bán kính 50m chuẩn trắc địa (`createCircleGeoJSON`) và cho phép chạm/click chọn tọa độ thực trên bản đồ (`onPick`).
     - Hiển thị tuyến đường dẫn đường (`route`) cho Kỹ thuật viên (Màn 20 `TaskDetailScreen`) và lớp nhiệt mật độ sự cố (`heat`) cho Admin Analytics (Màn 24 `AnalyticsScreen`).
     - Các nút điều khiển `+`, `-`, định vị/reset góc nhìn và nút `3D` nghiêng 55° xem khối nhà 3D của Goong Map.
3. **Nâng cấp Màn 26 (`ZonesScreen.tsx` — `/admin/zones`) & Màn 17 (`FieldUnitsScreen.tsx` — `/dispatcher/field-units`) sang Goong Map thật:**
   - Trong `ZonesScreen.tsx`:
     - Bỏ hoàn toàn `MapCanvas` (`/danang-map.png`) và bỏ `zoneSeed` 5 đỉnh hardcode cũ.
     - Vẽ trực tiếp 7 đa giác Quận/Huyện GADM (`HC`, `TK`, `ST`, `CL`, `NHS`, `LC`, `HV`) lên nền **Goong Map** bằng MapLibre GeoJSON `fill` + `line` layer:
       - Quận đang bật (`on = true`): viền đỏ `#e5251b`, nền đỏ trong suốt.
       - Quận tạm dừng (`on = false`): viền xám nét đứt `#6b6b70`, nền xám.
       - Quận đang chọn (`sel`): tăng độ dày viền, nổi bật nhãn tên Quận trên Goong Map và hỗ trợ click trực tiếp vào từng Quận trên bản đồ hoặc từ danh sách bên phải.
   - Trong `FieldUnitsScreen.tsx`:
     - Bỏ `MapCanvas` (`/danang-map.png`), hiển thị 7 đội ứng trực và sự cố trên nền **Goong Map** thật kèm đường điều động đội gần nhất bằng GeoJSON `LineString`.

### 2.2. Vùng cấm tuyệt đối (Non-goals)
- **KHÔNG** chỉnh sửa bất kỳ file nào trong `ui-prototype/`.
- **KHÔNG** hardcode `NEXT_PUBLIC_GOONG_MAPTILES_KEY` vào mã nguồn (chỉ đọc từ `process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY`).
- **KHÔNG** làm thay đổi thiết kế Bento V2 (bố cục card, bảng màu, font `Be Vietnam Pro`, hay cấu trúc 34 route).

---

## 3. Danh Sách File Được Phép Thay Đổi (Allowed Files)

- `backend/data/danang_districts_boundary.geojson`
- `frontend/src/data/danang_districts_boundary.json` *(tạo mới)*
- `frontend/src/components/GoongBentoMap.tsx` *(tạo mới — component Goong Map dùng chung cho Bento V2)*
- `frontend/src/components/data.tsx`
- `frontend/src/components/MapArt.tsx`
- `frontend/src/screens/ZonesScreen.tsx`
- `frontend/src/screens/FieldUnitsScreen.tsx`
- `frontend/src/screens/ReportScreen.tsx`
- `docs/plans/goong-map-everywhere-and-gadm-districts.md`

---

## 4. Các Bước Thực Hiện Tuần Tự (3 Commits)

### [x] Bước 1: Chuẩn Hóa Ranh Giới Hành Chính 7 Quận/Huyện Đà Nẵng Theo GADM 4.1 (`ADM_2`)
- Trích xuất ranh giới hành chính cấp Quận/Huyện (`ADM_2`) thực tế của 7 Quận/Huyện Đà Nẵng (`HC`, `TK`, `ST`, `CL`, `NHS`, `LC`, `HV`) bám đúng sông Hàn, sông Cẩm Lệ, sông Cu Đê và ranh giới hành chính thật (loại bỏ hoàn toàn các đường cắt thẳng giả tạo).
- Cập nhật `backend/data/danang_districts_boundary.geojson` và đồng bộ sang `frontend/src/data/danang_districts_boundary.json`.
- Chạy `py backend/scripts/seed_data.py` để cập nhật bảng `system_zones` trong PostGIS.
- **Lệnh kiểm tra:** `py backend/scripts/seed_data.py && py -m pytest backend/tests/test_zones.py`
- **Commit 1:** `feat(gis): replace synthetic district cuts with real GADM level-2 administrative boundaries`

### [x] Bước 2: Xây Dựng `GoongBentoMap` & Tích Hợp Vào `MapBentoViewport` Cho Toàn Bộ Màn Hình Bản Đồ
- Tạo `frontend/src/components/GoongBentoMap.tsx` đóng gói `maplibre-gl` + Goong Map Vector Style (`https://tiles.goong.io/assets/goong_map_web.json?api_key=...`) với cơ chế tự động fallback sang Carto Voyager @2x nếu tile Goong lỗi.
- Hỗ trợ đầy đủ:
  - Lớp ranh giới Quận/Huyện Đà Nẵng đang mở tiếp nhận (tự động ẩn vùng bị Admin tắt).
  - Markers sự cố (`pins`), marker người dùng (`userPin`) + vòng bán kính 50m thực, tuyến đường (`route`), biểu đồ nhiệt (`heat`), và chọn vị trí (`onPick`).
  - Nút điều khiển `+`, `-`, định vị trung tâm Đà Nẵng và bật/tắt góc nhìn khối nhà `3D`.
- Thay thế phần render ảnh tĩnh trong `MapBentoViewport` (`frontend/src/components/data.tsx`) bằng `GoongBentoMap`.
- **Lệnh kiểm tra:** `npx tsc --noEmit` (trong `frontend/`)
- **Commit 2:** `feat(frontend): embed interactive Goong Map across MapBentoViewport screens`

### [ ] Bước 3: Tích Hợp Goong Map & Đa Giác Quận/Huyện Thực Vào `ZonesScreen` (`/admin/zones`) và `FieldUnitsScreen` (`/dispatcher/field-units`)
- Cập nhật `frontend/src/screens/ZonesScreen.tsx`:
  - Xóa `zoneSeed` 5 đỉnh hardcode cũ và xóa nền ảnh tĩnh `MapCanvas`.
  - Hiển thị trực tiếp 7 đa giác Quận/Huyện GADM trên nền Goong Map tương tác; khi click vào đa giác quận hoặc gạt nút bật/tắt, cập nhật tức thì màu sắc đa giác trên Goong Map và gọi `PATCH /api/v1/zones/{id}`.
- Cập nhật `frontend/src/screens/FieldUnitsScreen.tsx`:
  - Hiển thị các đội hiện trường và tuyến điều động trên nền Goong Map thật.
- Chạy kiểm tra toàn diện TypeScript, Next.js build và Backend pytest.
- **Lệnh kiểm tra:** `npx tsc --noEmit && npm run build` (trong `frontend/`) và `py -m pytest -q` (trong `backend/`)
- **Commit 3:** `feat(frontend): render interactive GADM district polygons and field units on Goong Map`

---

## 5. Rủi Ro & Giải Pháp
- **Rủi ro thiếu hoặc hết hạn mức khóa Goong MapTiles:** Nếu `NEXT_PUBLIC_GOONG_MAPTILES_KEY` gặp lỗi tải style hoặc hết quota, `GoongBentoMap` lắng nghe sự kiện `error` của MapLibre và tự động chuyển mượt sang Vector/Raster style dự phòng để bản đồ và lớp GIS 7 Quận/Huyện luôn hiển thị 100%.
- **Đồng bộ tọa độ giữa các màn hình dùng hệ `x, y` (0–100) và `[lng, lat]` WGS84:** `GoongBentoMap` hỗ trợ cả tọa độ thực `[lng, lat]` lẫn quy đổi hai chiều chính xác với hệ `(x, y)` của dữ liệu mẫu để không làm gãy bất kỳ tương tác nào trên cả 34 màn hình.
