# Kế hoạch: Sửa lỗi Web Worker MapLibre GL & Hiển thị Bản đồ trên Next.js Turbopack

> **Nhánh Git:** `feat/citizen-incident-reporting-ui`  
> **Tài liệu tham chiếu:** `.agents/rules/frontend-nextjs-maplibre.md`, [docs/spec.md](file:///D:/HK10/DATN/docs/plans/figma-shadcn-citizen-ui.md)  
> **Mục tiêu:** 
> 1. Triệt tiêu dứt điểm lỗi `Worker failed to load. Check that the worker URL is correct.` trên Next.js 16 (Turbopack).
> 2. Đảm bảo Bản đồ GIS MapLibre GL hiển thị trọn vẹn lớp nền bản đồ Đà Nẵng, ranh giới vùng lõi đô thị, marker và vòng đệm 50m (không còn hiện tượng màn hình trắng chỉ có chấm xanh).
> 3. Cung cấp cơ chế Style Fallback ngoại tuyến (Offline Raster Style) phòng trường hợp thiết bị mất kết nối Internet khi tải CartoCDN vector style.

---

## 1. Nguyên nhân Gốc rễ Sự cố (Root Cause Analysis)

1. **Cơ chế tải Web Worker của MapLibre GL v6:**
   - Trong `maplibre-gl` v6 (`web_worker.ts`), nếu không thiết lập `WORKER_URL`, hàm `defaultWorkerUrl()` sẽ tính toán đường dẫn tệp worker theo `new URL('./maplibre-gl-worker.mjs', import.meta.url)`.
2. **Xung đột với Next.js Turbopack:**
   - Khi Next.js Turbopack đóng gói module client, `import.meta.url` trỏ về `http://localhost:3000/_next/static/chunks/...`.
   - Trình duyệt cố gắng tìm nạp `http://localhost:3000/_next/static/chunks/maplibre-gl-worker-dev.mjs`, nhưng Next.js không sinh file này trong `_next/static/chunks/` mà trả về trang HTML 404.
   - Trình duyệt ném lỗi cú pháp khi thực thi HTML trong Web Worker -> MapLibre bắt lỗi và thông báo: `Worker failed to load. Check that the worker URL is correct.`
3. **Hậu quả hiển thị:**
   - Worker giải mã vector tiles bị chết, khiến MapLibre không thể render bất kỳ tile bản đồ nào (gây màn hình trắng xóa).
   - Marker điểm chọn (chấm xanh) là phần tử DOM HTML riêng biệt nên vẫn nổi lên trên container trống.

---

## 2. Phạm vi Tập tin Cho phép Thay đổi (Allowed Files)

- `frontend/public/maplibre-gl-worker.mjs` (Tệp static worker chính thức trích xuất từ `node_modules/maplibre-gl/dist/`)
- `frontend/public/maplibre-gl-worker-dev.mjs` (Tệp dev worker phục vụ môi trường phát triển)
- `frontend/src/components/map/map-view.tsx` (Thiết lập `maplibregl.setWorkerUrl` và Offline Style Fallback)
- `docs/plans/fix-maplibre-worker-load.md`

### Ngoài phạm vi nghiêm ngặt (Strict Non-goals)
- Không chỉnh sửa backend (`backend/`).
- Không sửa `frontend/src/components/citizen/report-form.tsx` hay `frontend/src/lib/api.ts`.

---

## 3. Các bước Triển khai Tuần tự (Ordered Small Steps)

### Bước 1: Trích xuất & Thiết lập Tệp Static Web Worker vào `frontend/public/`
- **Mục tiêu:** Cung cấp worker bundle tĩnh tại root URL `/maplibre-gl-worker.mjs` để trình duyệt tải trực tiếp 100% tin cậy, không phụ thuộc vào chunking của Next.js hay CDN bên ngoài.
- **Thực hiện:**
  - Sao chép `maplibre-gl-worker.mjs` và `maplibre-gl-worker-dev.mjs` từ `frontend/node_modules/maplibre-gl/dist/` vào `frontend/public/`.
- **Kiểm tra cơ học:**
  - `Test-Path "frontend/public/maplibre-gl-worker.mjs"`
  - `Test-Path "frontend/public/maplibre-gl-worker-dev.mjs"`

### Bước 2: Cấu hình `setWorkerUrl` và Offline Style Fallback trong `map-view.tsx`
- **Mục tiêu:** Cấu hình MapLibre sử dụng worker nội bộ và đảm bảo style luôn nạp thành công dù online hay offline.
- **Thực hiện:**
  - Trong `frontend/src/components/map/map-view.tsx`:
    - Gọi `maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs")` ngay trước khi khởi tạo bản đồ.
    - Định nghĩa cấu trúc `FALLBACK_OFFLINE_STYLE: maplibregl.StyleSpecification` (Raster tiles OpenStreetMap hoặc nền hành chính tối giản) để khi không tải được CartoCDN style (do mạng offline), bản đồ tự động chuyển sang fallback style thay vì sập trắng.
    - Xử lý sự kiện `map.on("error", (e) => ...)` một cách êm ái, ghi log cảnh báo thay vì làm đơ giao diện.
- **Kiểm tra cơ học:**
  - `npx tsc --noEmit`
  - `npm run lint`

### Bước 3: Khởi động lại Dev Server, Kiểm định Bản đồ Trực tiếp & Nghiệm thu
- **Mục tiêu:** Xác nhận bản đồ tải đầy đủ lớp nền, đường phố Đà Nẵng, ranh giới vùng lõi và marker tương tác.
- **Kiểm tra:**
  - Chạy `npx tsc --noEmit`, `npm run lint`, `npm run build`.
  - Khởi động lại `npm run dev` trên port 3000.
  - Điều phối subagent `reviewer` audit toàn bộ mã nguồn (`STATUS: PASS`).

---

## 4. Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
| :--- | :--- |
| Trình duyệt cache lại worker lỗi 404 cũ | Thêm query param phiên bản `/maplibre-gl-worker.mjs?v=6.14.0` khi truyền vào `setWorkerUrl`. |
| Trình duyệt chặn Module Worker trên HTTP cũ | `maplibre-gl` có cơ chế tự động thử module worker rồi fallback về classic worker. |
