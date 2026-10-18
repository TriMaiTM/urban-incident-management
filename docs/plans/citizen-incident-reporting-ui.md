# Kế hoạch Triển khai: Module 1 - Bản đồ GIS MapLibre & Giao diện Báo cáo Hiện trường Công dân

> **Nhánh Git:** `feat/citizen-incident-reporting-ui`  
> **Tài liệu tham chiếu:** `docs/spec.md`, `.agents/rules/frontend-nextjs-maplibre.md`, `docs/lessons-learned.md`  
> **Mục tiêu:** Xây dựng giao diện Web/PWA chuẩn hành chính công Đà Nẵng dành cho Công dân (`/` và `/citizen`) với kiến trúc Split-Screen Full-Viewport, tích hợp bản đồ MapLibre GL JS, ranh giới vùng đô thị lõi, định vị GPS, quét lân cận 50m khử trùng lặp và form gửi phản ánh hiện trường trực tiếp tới Backend.

---

## 1. Mục tiêu & Phạm vi (Goal & Scope)

### Mục tiêu chính
- Thay thế trang showcase tạm thời bằng Kiến trúc Split-Screen Full-Viewport (`h-screen overflow-hidden`) chuẩn IOC:
  - Header hành chính `h-14` (`border-b border-slate-200`): Logo, Hotline 1022, trạng thái kết nối.
  - Bản đồ GIS tương tác MapLibre GL JS chiếm 65% màn hình (Desktop) hoặc tab chuyển đổi (Mobile):
    - Tọa độ trung tâm Đà Nẵng (`16.0544, 108.2022`), `maxBounds: [[107.80, 15.80], [108.50, 16.35]]`.
    - Lớp GeoJSON ranh giới vùng lõi đô thị (nạp từ `GET /api/v1/zones/active`).
    - Marker định vị vị trí công dân chọn, kèm vòng tròn bán kính 50m.
    - Marker các sự cố lân cận đang mở tại hiện trường.
  - Panel Báo cáo Hiện trường Công dân chiếm 35% màn hình (cuộn độc lập):
    - Nút "Lấy vị trí GPS hiện tại" (HTML5 Geolocation).
    - Thẩm định hàng rào địa lý (`POST /api/v1/zones/validate-location`): Cảnh báo đỏ ngay nếu ngoài Đà Nẵng.
    - Tự động quét trùng lặp 50m (`GET /api/v1/incidents/nearby?latitude=...&longitude=...&radius=50`): Hiển thị Alert cảnh báo kèm nút "Tôi cũng gặp sự cố này" (`POST /api/v1/incidents/{id}/vote-duplicate`).
    - Tải ảnh hiện trường kèm thông báo tự động làm mờ khuôn mặt / biển số xe (Nghị định 13/2023/NĐ-CP).
    - Danh mục sự cố nạp động từ `GET /api/v1/categories/`.
    - Form gửi phản ánh (`POST /api/v1/incidents/` dạng `multipart/form-data`).
    - Dialog tiếp nhận thành công hiển thị mã phiếu `DN-YYYYMM-XXXX` (`font-mono tabular-nums`).

### Phạm vi tập tin cho phép chỉnh sửa (Allowed Files)
- `frontend/package.json` & `frontend/package-lock.json`
- `frontend/src/app/page.tsx`
- `frontend/src/app/citizen/page.tsx` (tùy chọn hoặc alias của `/`)
- `frontend/src/components/map/map-view.tsx`
- `frontend/src/components/citizen/report-form.tsx`
- `frontend/src/components/citizen/nearby-incidents-dialog.tsx`
- `frontend/src/types/incident.ts`
- `frontend/src/types/zone.ts`
- `frontend/src/lib/api.ts`
- `docs/plans/citizen-incident-reporting-ui.md`

### Ngoài phạm vi nghiêm ngặt (Strict Non-goals)
- **Tuyệt đối KHÔNG sửa Backend:** Không sửa đổi các tệp trong `backend/` (FastAPI endpoints, models, tests).
- **Không tự chế thẻ HTML thô:** Sử dụng 100% `@/components/ui/*` primitives đã cài đặt.
- **Không dùng AI Slop:** Không gradient màu mè, không bo góc `rounded-2xl`/`3xl`.

---

## 2. Các bước triển khai tuần tự (Ordered Small Steps)

### [x] Bước 1: Cài đặt Thư viện MapLibre GL & Định nghĩa Typescript Types
- **Trạng thái:** HOÀN THÀNH (Reviewer: STATUS: PASS)
- **Mục tiêu:** Cài đặt `maplibre-gl` và định nghĩa các TypeScript interfaces khớp 100% với Pydantic Schemas Backend.
- **Thực hiện:**
  - Chạy `npm install maplibre-gl` trong `frontend/`.
  - Tạo file `frontend/src/types/incident.ts`:
    - `IncidentNearbyItem`, `IncidentNearbyOut`, `CategoryOut`, `IncidentCreateResponse`, `IncidentVoteDuplicateOut`.
  - Tạo file `frontend/src/types/zone.ts`:
    - `SystemZoneOut`, `LocationValidateIn`, `LocationValidateOut`.
  - Tạo client API helper `frontend/src/lib/api.ts` bọc các lệnh gọi `fetch` bất đồng bộ tới backend `http://localhost:8000/api/v1/*` kèm xử lý lỗi chặt chẽ.
- **Lệnh kiểm tra cơ học:**
  - `npx tsc --noEmit` (Exit code 0)
  - `npm run lint` (Exit code 0)

### [x] Bước 2: Xây dựng Component Bản đồ GIS MapLibre GL (`map-view.tsx`)
- **Trạng thái:** HOÀN THÀNH (Reviewer: STATUS: PASS)
- **Mục tiêu:** Xây dựng component bản đồ hiệu năng cao, hỗ trợ WGS84, ranh giới Đà Nẵng và marker vị trí.
- **Thực hiện:**
  - Tạo `frontend/src/components/map/map-view.tsx`:
    - Khởi tạo MapLibre map với `maxBounds: [[107.80, 15.80], [108.50, 16.35]]` và center `[108.2022, 16.0544]`.
    - Sử dụng vector tile style chuẩn mở hoặc Carto Positron.
    - Vẽ lớp GeoJSON ranh giới vùng lõi Đà Nẵng (nạp từ API `GET /api/v1/zones/active`).
    - Hiển thị draggable marker cho vị trí người dùng chọn và vẽ vòng tròn buffer bán kính 50m (GeoJSON Polygon).
    - Hiển thị các marker màu cam/đỏ cho các sự cố lân cận xung quanh.
    - Cho phép click lên bản đồ để cập nhật tọa độ chọn.
- **Lệnh kiểm tra cơ học:**
  - `npx tsc --noEmit` (Exit code 0)
  - `npm run lint` (Exit code 0)
  - `npm run build` (Exit code 0)

### [x] Bước 3: Xây dựng Component Form Báo cáo Hiện trường & Khử trùng lặp (`report-form.tsx`)
- **Trạng thái:** HOÀN THÀNH (Reviewer: STATUS: PASS)
- **Mục tiêu:** Tạo form báo cáo hiện trường tương tác cao, kết nối trực tiếp với bản đồ và backend API.
- **Thực hiện:**
  - Tạo `frontend/src/components/citizen/report-form.tsx`:
    - Nút "Lấy GPS hiện tại" (Geolocation API) với feedback trạng thái loading.
    - Hiển thị tọa độ WGS84 với `font-mono tabular-nums`.
    - Tự động gọi `validateLocation` khi tọa độ thay đổi. Nếu ngoài Đà Nẵng, hiển thị Alert đỏ và vô hiệu hóa nút gửi.
    - Tự động gọi `getNearbyIncidents(lat, lon, 50)`: nếu có sự cố lân cận, hiển thị Alert cảnh báo trùng lặp với nút xem chi tiết và nút "Tôi cũng gặp sự cố này" (`voteDuplicate`).
    - Nạp danh mục từ `getCategories()` vào `Select` component.
    - Input địa chỉ (gợi ý tự động hoặc nhập tay), Title, Textarea mô tả hiện trường.
    - Khu vực kéo thả / chọn ảnh hiện trường kèm ghi chú: "Hệ thống tự động nhận diện và làm mờ khuôn mặt, biển số xe theo Nghị định 13/2023/NĐ-CP".
    - Xử lý submit form (`multipart/form-data`) gọi `createIncident`.
- **Lệnh kiểm tra cơ học:**
  - `npx tsc --noEmit` (Exit code 0)
  - `npm run lint` (Exit code 0)
  - `npm run build` (Exit code 0)

### Bước 4: Tích hợp Layout Split-Screen Full-Viewport vào `page.tsx`
- **Mục tiêu:** Xóa bỏ trang showcase cũ, tích hợp `MapView` và `ReportForm` vào layout Split-Screen hoàn chỉnh.
- **Thực hiện:**
  - Cập nhật `frontend/src/app/page.tsx`:
    - Shell `h-screen overflow-hidden flex flex-col`.
    - Top Header `h-14` với logo Đà Nẵng IOC, tiêu đề hệ thống, số điện thoại khẩn cấp/hotline 1022.
    - Thân trang chia 2 cột trên Desktop (Panel 35% bên trái cuộn độc lập `overflow-y-auto`, Bản đồ 65% bên phải chiếm trọn `h-[calc(100vh-3.5rem)]`).
    - Trên Mobile: Tab chuyển đổi mượt mà giữa "Bản đồ" và "Báo cáo".
    - Dialog chúc mừng báo cáo thành công: hiển thị mã tra cứu phiếu `DN-YYYYMM-XXXX` (`font-mono tabular-nums`) kèm nút copy.
- **Lệnh kiểm tra cơ học:**
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`

### Bước 5: Audit Độc lập qua Reviewer Subagent & Nghiệm thu
- **Mục tiêu:** Spawn subagent `reviewer` thẩm định toàn diện tính năng so với `AGENTS.md` và `.agents/rules/frontend-nextjs-maplibre.md`.
- **Tiêu chuẩn nghiệm thu:**
  - Strict TypeScript (0 lỗi `any`, interface chuẩn).
  - Tọa độ đúng thứ tự: MapLibre `[lon, lat]` vs API params `(lat, lon)` không bị nhầm lẫn.
  - Tuân thủ 100% tiêu chuẩn chống AI Slop.
  - Build tĩnh App Router thành công hoàn hảo.

---

## 3. Rủi ro & Giải pháp Phòng ngừa (Risks & Mitigations)

| Rủi ro | Giải pháp |
| :--- | :--- |
| **Thứ tự tọa độ đảo ngược:** MapLibre dùng `[longitude, latitude]` trong khi một số form hay nhầm `[lat, lon]`. | Áp dụng đúng Bài học 7 (`docs/lessons-learned.md`): Hàm helper chuyển đổi rõ ràng, gắn tên biến tường minh `longitude` và `latitude`. |
| **MapLibre GL SSR Hydration:** MapLibre truy cập đối tượng `window` nên có thể gây lỗi SSR trong Next.js App Router. | Sử dụng `"use client"` directive và dynamic import với `{ ssr: false }` hoặc chỉ khởi tạo instance trong `useEffect`. |
| **Map Style Loading:** Style tile bên thứ ba có thể bị chặn CORS hoặc mạng chậm. | Cung cấp fallback style chuẩn mở (Carto Positron / OSM) với cấu hình vector/raster tiles an toàn. |
