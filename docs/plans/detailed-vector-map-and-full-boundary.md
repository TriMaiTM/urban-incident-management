# Kế hoạch Triển khai: Bản đồ Vector Chi tiết (Khối nhà, Kiệt hẻm, Số nhà) & Đa giác Ranh giới Toàn vẹn 8.007 Điểm

> **Nhánh Git:** `feat/detailed-vector-map-and-full-boundary` (tạo mới từ `main`)  
> **Tài liệu tham chiếu:** `docs/spec.md`, `.agents/rules/frontend-nextjs-maplibre.md`, `AGENTS.md`  
> **Mục tiêu:** 
> 1. Chuyển đổi bản đồ sang Carto Voyager Vector GL Style hiển thị đầy đủ hình khối tòa nhà (`building`), số nhà (`housenumber`), mạng lưới kiệt hẻm (`roadname_minor`, `road_path`), điểm tiện ích công cộng (`poi`), kèm hiệu ứng khối nhà 3D khi zoom sát.
> 2. Cập nhật ranh giới địa lý hành chính Đà Nẵng với **toàn bộ 8.007 điểm trắc địa nguyên bản (không nén sai số)**, đảm bảo khít tuyệt đối 100% từng khúc cua bờ biển, đèo Hải Vân và ranh giới giáp Quảng Nam khi zoom cực đại.

---

## 1. Mục tiêu & Phạm vi (Goal & Scope)

### Mục tiêu chính
1. **Đa giác ranh giới toàn vẹn (8.007 điểm):**
   - Hợp nhất nguyên bản toàn bộ 15 đơn vị cấp xã/phường thuộc 7 quận/huyện đất liền Đà Nẵng từ bộ dữ liệu hành chính chuẩn 2025 (`diaphanhanhchinhcapxa`).
   - Giữ nguyên 100% tọa độ trắc địa (8.007 điểm, không chạy giải thuật nén Douglas-Peucker) để loại bỏ hoàn toàn sai số ~11m khi zoom gần.
   - Dung lượng JSON chỉ ~199 KB, thời gian phân tích cú pháp < 5ms.
   - Đồng bộ giữa `backend/data/danang_core_boundary.geojson` và `frontend/src/data/danang_core_boundary.json`.
2. **Bản đồ Vector Chi tiết (Carto Voyager GL Style):**
   - Kích hoạt mặc định chế độ Vector (`NEXT_PUBLIC_MAP_STYLE_TYPE=vector`) khi có Carto API Key.
   - Hiển thị rõ ràng khối nhà 2D/3D (`fill-extrusion`), tên kiệt/hẻm, số nhà và các điểm mốc (bệnh viện, trường học, cơ quan hành chính) giúp công dân và điều phối viên dễ dàng định vị hiện trường ("đối diện tòa nhà nào", "ở kiệt nào").
   - Bổ sung nút chuyển đổi góc nhìn trực quan trên bản đồ: Chế độ 3D Khối nhà (3D Pitch & Building Extrusion) vs 2D Phẳng.

### Ranh giới nghiêm ngặt (Non-goals)
- Tuyệt đối không thay đổi schema cơ sở dữ liệu hoặc logic Backend API (`backend/app/`).
- Không phá vỡ hệ tọa độ chuẩn WGS84 `[longitude, latitude]` của GeoJSON và MapLibre GL.
- Không thêm bất kỳ thư viện ngoài nặng nề nào vào frontend (tận dụng MapLibre GL JS và Carto Vector Tiles hiện có).

---

## 2. Danh sách Tập tin Được phép Thay đổi

| STT | Tập tin | Mục đích |
| :--- | :--- | :--- |
| 1 | `backend/data/danang_core_boundary.geojson` | Cập nhật đa giác ranh giới 8.007 điểm gốc |
| 2 | `frontend/src/data/danang_core_boundary.json` | Đồng bộ dữ liệu ranh giới 8.007 điểm cho frontend |
| 3 | `frontend/src/components/map/map-view.tsx` | Kích hoạt Carto Vector Style, thêm layer 3D Buildings và nút toggle 3D |
| 4 | `frontend/.env.local` | Thiết lập `NEXT_PUBLIC_MAP_STYLE_TYPE=vector` |
| 5 | `frontend/.env.example` | Cập nhật tài liệu hướng dẫn biến môi trường |

---

## 3. Các bước Thực hiện Chi tiết

### Bước 1: Tạo Nhánh & Cập nhật Dữ liệu Ranh giới Toàn vẹn 8.007 Điểm - [x] ĐÃ HOÀN THÀNH (Reviewer: STATUS: PASS)
- Tạo nhánh `feat/detailed-vector-map-and-full-boundary` từ `main`.
- Chạy script Python hợp nhất nguyên bản 15 file GeoJSON xã/phường (không chạy `simplify`), sinh ra `MultiPolygon` với đúng 8.007 đỉnh tọa độ.
- Ghi vào `backend/data/danang_core_boundary.geojson` và `frontend/src/data/danang_core_boundary.json`.
- Chạy kiểm tra backend:
  - `py -m pytest backend/tests/test_zones.py` (12/12 passed)
  - `py -m compileall -q backend/app` (Passed)
  - `npx tsc --noEmit` (Passed)
  - Thẩm định độc lập qua Reviewer subagent `a66b0f67-6df3-4c6f-8d3c-01637a50954a`: STATUS: PASS.

### Bước 2: Nâng cấp Bản đồ Vector Chi tiết & Lớp Khối nhà 3D (`map-view.tsx`)
- Cấu hình `NEXT_PUBLIC_MAP_STYLE_TYPE=vector` trong `frontend/.env.local`.
- Trong `frontend/src/components/map/map-view.tsx`:
  - Khởi tạo MapLibre với Carto Voyager Vector Style (`https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json?key=${CARTO_API_KEY}`).
  - Trong sự kiện `map.on("load")`, khi đang ở chế độ vector:
    - Thêm layer `3d-buildings` (`type: "fill-extrusion"`, `source: "carto"`, `source-layer: "building"`, `minzoom: 15`) giúp các khối nhà tự động dựng hình 3D khi người dùng zoom gần vào khu phố.
    - Bổ sung nút điều khiển nhỏ góc trên phải: Chuyển đổi nhanh giữa chế độ nhìn "3D Nghiêng" (pitch 55°) và "2D Phẳng" (pitch 0°).
- Kiểm tra cơ học:
  - `npx tsc --noEmit` trong `frontend/`
  - `npm run lint` trong `frontend/`

### Bước 3: Thẩm định Độc lập qua Reviewer Subagent
- Khởi tạo subagent `reviewer` thẩm định toàn bộ `git diff`:
  - Kiểm tra tính hợp lệ của GeoJSON 8.007 điểm (WGS84 `[lon, lat]`).
  - Kiểm tra layer 3d-buildings và vector style trong MapLibre.
  - Đảm bảo tuân thủ Strict TypeScript, không có `any`.
- Đạt `STATUS: PASS` trước khi bước sang hoàn tất.

### Bước 4: Nghiệm thu, Gộp vào `main` & Push lên GitHub
- Chạy toàn bộ test suite (`npm run build` và `pytest`).
- Commit các thay đổi với Conventional Commits.
- Gộp vào nhánh `main` và thực hiện `git push origin main`.

---

## 4. Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
| :--- | :--- |
| **Hiệu năng khi vẽ 8.007 điểm:** Lo ngại WebGL giật lag khi render đa giác nhiều điểm. | GeoJSON của MapLibre được biên dịch sang GPU vertex buffers một lần duy nhất khi tải, 8.007 điểm (~199 KB) chỉ tiêu tốn < 1MB RAM card đồ họa, duy trì tốc độ 60fps mượt mà. |
| **Layer thứ tự khi thêm 3D buildings:** Khối nhà 3D có thể che lấp đa giác ranh giới hoặc marker. | Đặt `minzoom: 15` cho 3D buildings (chỉ hiện khi zoom sát mặt đất) và gắn marker HTML lên trên canvas WebGL. |
