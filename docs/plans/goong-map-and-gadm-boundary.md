# Kế hoạch Triển khai: Tích hợp Goong Maps & Khôi phục Ranh giới GIS Chuẩn Toàn vẹn (GADM 4.1)

> **Nhánh Git:** `feat/goong-map-and-gadm-boundary` (tạo từ `main`)  
> **Tài liệu tham chiếu:** `docs/spec.md`, `.agents/rules/frontend-nextjs-maplibre.md`, `AGENTS.md`  
> **Mục tiêu:** 
> 1. Chuyển đổi nền bản đồ MapLibre sang **Goong Maps** (`https://tiles.goong.io/assets/goong_map_web.json?api_key=...`) sử dụng key hợp lệ của người dùng để hiển thị 100% mạng lưới kiệt/hẻm chi tiết, số nhà, khối nhà (2D/3D) và điểm tham chiếu (POI) tiếng Việt tại Đà Nẵng.
> 2. Thay thế đa giác 8.007 đỉnh bị lỗi khuyết thiếu trước đó bằng **Đa giác hành chính chuẩn quốc gia GADM 4.1 Đà Nẵng (`VNM.19_1`)**, bao bọc trọn vẹn 100% lãnh thổ 7 quận/huyện và 56 xã/phường của Đà Nẵng theo chuẩn WGS84, ôm khít đèo Hải Vân, đường bờ biển và ranh giới với tỉnh Quảng Nam.

---

## 1. Mục tiêu & Phạm vi (Goal & Scope)

### Mục tiêu chính
1. **Khôi phục Đa giác GIS Chuẩn Toàn vẹn (GADM 4.1):**
   - Trích xuất dữ liệu ranh giới chính thức của Thành phố Đà Nẵng từ cơ sở dữ liệu trắc địa GADM 4.1 (`VNM.19_1`).
   - Đảm bảo đa giác khép kín, chuẩn WGS84 `[longitude, latitude]`, bao trọn toàn bộ đất liền Đà Nẵng với bounding box `[107.8167, 15.9181, 108.3384, 16.2254]`.
   - Vượt qua 100% các bài kiểm tra ranh giới trong `backend/tests/test_zones.py` (Cầu Rồng, Cầu Sông Hàn, Ngũ Hành Sơn, Hòa Khánh đều nằm bên trong; Quảng Nam, Huế, Biển Đông nằm bên ngoài).
   - Đồng bộ giữa `backend/data/danang_core_boundary.geojson`, `frontend/src/data/danang_core_boundary.json` và `frontend/src/lib/api.ts`.
2. **Tích hợp Goong Maps vào Frontend:**
   - Cấu hình `NEXT_PUBLIC_GOONG_MAPTILES_KEY=QkzX9ARUi7eycq2Q3KdJqJF4EFooRHCfDJfubhXJ` trong `frontend/.env.local`.
   - Trong `frontend/src/components/map/map-view.tsx`:
     - Ưu tiên tải Goong Map Vector Style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPTILES_KEY}`.
     - Tận dụng lớp khối nhà 3D (`fill-extrusion`, source-layer `VN_Building`) và các lớp đường kiệt/hẻm, số nhà, địa danh POI bản địa của Goong.
     - Đồng bộ nút toggle 3D (pitch 55° vs 0°) để hiển thị trực quan các tòa nhà 3D nổi bật.
     - Giữ Carto / OSM làm fallback dự phòng khi không có Goong key hoặc mạng gặp sự cố.

### Ranh giới nghiêm ngặt (Non-goals)
- Tuyệt đối không thay đổi schema cơ sở dữ liệu hoặc logic Backend API (`backend/app/`).
- Không phá vỡ hệ tọa độ chuẩn WGS84 `[longitude, latitude]` của GeoJSON và MapLibre GL.
- Không thêm bất kỳ thư viện ngoài nào (Goong Maps hoàn toàn tương thích 100% với MapLibre GL JS hiện có).
- Không hardcode API key vào mã nguồn (chỉ đọc qua `process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY`).

---

## 2. Danh sách Tập tin Được phép Thay đổi

| STT | Tập tin | Mục đích |
| :--- | :--- | :--- |
| 1 | `backend/data/danang_core_boundary.geojson` | Cập nhật đa giác chuẩn GADM 4.1 Đà Nẵng |
| 2 | `frontend/src/data/danang_core_boundary.json` | Đồng bộ đa giác chuẩn GADM 4.1 cho frontend |
| 3 | `frontend/src/lib/api.ts` | Cập nhật tọa độ fallback và bounding box chuẩn |
| 4 | `frontend/src/components/map/map-view.tsx` | Tích hợp Goong Map Vector Style và đồng bộ 3D mode |
| 5 | `frontend/.env.local` | Điền `NEXT_PUBLIC_GOONG_MAPTILES_KEY` của người dùng |
| 6 | `frontend/.env.example` | Cập nhật tài liệu biến môi trường mẫu |

---

## 3. Các bước Thực hiện Chi tiết

### Bước 1: Cập nhật Đa giác Hành chính Chuẩn GADM 4.1 Đà Nẵng - [x] ĐÃ HOÀN THÀNH (Reviewer: STATUS: PASS)
- Trích xuất geometry chuẩn từ GADM 4.1 (`VNM.19_1` Đà Nẵng).
- Ghi đè vào `backend/data/danang_core_boundary.geojson` và `frontend/src/data/danang_core_boundary.json`.
- Cập nhật bounding box và tọa độ fallback trong `frontend/src/lib/api.ts`.
- Chạy kiểm tra:
  - `py -m pytest backend/tests/test_zones.py` (12/12 passed)
  - `py -m compileall -q backend/app` (Passed 0 errors)
  - `npx tsc --noEmit` trong `frontend/` (Passed 0 errors)
  - Thẩm định độc lập qua Reviewer subagent `0a7d9dee-45a4-4628-afac-5f0451b1ce56`: STATUS: PASS.

### Bước 2: Tích hợp Goong Map Vector Style & Khối nhà 3D vào `map-view.tsx`
- Thêm `NEXT_PUBLIC_GOONG_MAPTILES_KEY=QkzX9ARUi7eycq2Q3KdJqJF4EFooRHCfDJfubhXJ` vào `frontend/.env.local`.
- Cập nhật `frontend/src/components/map/map-view.tsx`:
  - Khai báo hằng số `GOONG_MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY?.trim() || ""`.
  - Trong `getInitialMapStyle()`: Nếu có `GOONG_MAPTILES_KEY`, trả về URL style vector `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodeURIComponent(GOONG_MAPTILES_KEY)}`.
  - Điều chỉnh layer 3D khối nhà: Goong style đã tích hợp sẵn layer `building` (`VN_Building`), đảm bảo hiển thị hài hòa khi chuyển đổi góc nhìn 3D (pitch 55° / 0°).
  - Đảm bảo các lớp vùng đa giác `danang-active-zones` và vòng tròn 50m hiển thị rõ ràng trên nền Goong Map.
- Kiểm tra cơ học:
  - `npx tsc --noEmit` trong `frontend/`
  - `npm run lint` trong `frontend/`

### Bước 3: Thẩm định Độc lập qua Reviewer Subagent
- Khởi tạo subagent `reviewer` thẩm định toàn bộ `git diff` theo quy định Rule 4:
  - Kiểm tra tính chuẩn xác của GeoJSON GADM 4.1 (WGS84 `[lon, lat]`).
  - Kiểm tra tích hợp Goong Map, không lộ secret vào mã nguồn.
  - Strict TypeScript, không vi phạm `any`.
- Đạt `STATUS: PASS` trước khi nghiệm thu.

### Bước 4: Nghiệm thu Toàn diện, Gộp vào `main` & Push lên GitHub
- Chạy toàn bộ test suite (`npm run build` và `py -m pytest`).
- Commit các thay đổi với Conventional Commits.
- Gộp vào nhánh `main` và push lên GitHub.

---

## 4. Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
| :--- | :--- |
| **Goong Map quota (50.000 requests/tháng):** Hết hạn mức request trong quá trình phát triển | Giữ cơ chế fallback sang Carto Voyager / OSM tự động khi Goong key không hợp lệ hoặc gặp sự cố mạng. |
| **Lớp đa giác che mất nhãn tên đường của Goong:** Đa giác fill che mất các kiệt hẻm | Giữ `fill-opacity: 0.08` cực kỳ mờ và chèn layer ranh giới bên dưới các lớp `symbol` của Goong style. |

---

## 5. Câu hỏi Mở
- Người dùng đã cung cấp key Goong MapTiles: `QkzX9ARUi7eycq2Q3KdJqJF4EFooRHCfDJfubhXJ`. Bạn có muốn tôi tiến hành thực hiện kế hoạch trên ngay bây giờ không?
