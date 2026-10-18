# Kế hoạch Nâng cấp: Sửa lỗi Kết nối & Tái thiết kế Giao diện Chuẩn Linear / Modern Shadcn UI

> **Nhánh Git:** `feat/citizen-incident-reporting-ui`  
> **Tài liệu tham chiếu:** `.agents/rules/frontend-nextjs-maplibre.md`, [docs/spec.md](file:///D:/HK10/DATN/docs/plans/citizen-incident-reporting-ui.md)  
> **Mục tiêu:** 
> 1. Xử lý triệt để lỗi `TypeError: Failed to fetch` bằng cơ chế Graceful Error Handling & Fallback khi Backend ngoại tuyến.
> 2. Xóa bỏ hoàn toàn bố cục chia đôi thô cứng ("AI Slop"); tái thiết kế giao diện theo phong cách **Linear.app / Modern GIS Dashboard**: Bản đồ toàn cảnh tràn viền (Immersive Fullscreen Map) kết hợp Thanh điều hướng nổi (Floating Island Header) và Bảng tác vụ kính mờ (Floating Glassmorphic Panel).

---

## 1. Nguyên nhân Sự cố & Phân tích Thiết kế (Root Cause & Design Critique)

### A. Nguyên nhân Lỗi `TypeError: Failed to fetch`
- **Thực tế:** Backend FastAPI (`port 8000`) và Database Docker chưa chạy khi người dùng mở `http://localhost:3000`.
- **Lỗi logic Frontend:** Trong `src/lib/api.ts` và `src/app/page.tsx`, các hàm `getActiveZones()`, `getCategories()`, `validateLocation()` chưa có lớp bọc bắt lỗi an toàn (Graceful degradation). Khi network request bị từ chối (`ERR_CONNECTION_REFUSED`), `fetch` ném `TypeError` khiến Next.js Dev Overlay bung màn hình lỗi đỏ lòm.
- **Giải pháp:** Bổ sung cơ chế **Safe API Wrapper & Offline Demo Fallback**: Khi không kết nối được tới Backend, hệ thống tự động sử dụng dữ liệu ranh giới Đà Nẵng và danh mục sự cố offline mẫu, đồng thời hiển thị badge cảnh báo nhỏ nhẹ nhàng *"Máy chủ đang ngoại tuyến - Chế độ mô phỏng"* thay vì sập giao diện.

### B. Phân tích Khuyết điểm Giao diện ("AI Slop") và Định hướng "Linear-like"
- **Tại sao giao diện cũ bị đánh giá là "slop":**
  - Cắt đôi màn hình thô kệch bằng 1 cột form xám xịt 500px nhồi nhét hàng loạt card lồng card, chữ nghĩa dày đặc như web hành chính cũ.
  - Bản đồ bị bó hẹp trong khung nhỏ bên phải, mất đi cảm giác điều hành đô thị hiện đại.
- **Phong cách Linear / Modern Shadcn UI đích thực:**
  1. **Immersive Full-Bleed Map:** Bản đồ MapLibre chiếm trọn 100% diện tích màn hình toàn vẹn (`w-full h-full absolute inset-0`).
  2. **Floating Island Header:** Thay vì header ngang dày cộm, dùng thanh điều hướng nổi (Floating Island Pill) ở góc trên màn hình: `backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border border-slate-200/80 shadow-sm rounded-full px-4 py-2`.
  3. **Floating Glassmorphic Action Panel (Kiểu Linear / Apple Maps / Dynamic Island):**
     - Panel báo cáo nằm nổi tinh tế ở góc trái màn hình (`absolute top-20 left-6 z-20 w-[420px] max-h-[calc(100vh-6.5rem)] rounded-xl border border-slate-200/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden`).
     - Có nút thu gọn/mở rộng (Collapse/Expand) chỉ bằng 1 click để nhường toàn bộ không gian cho bản đồ khi công dân muốn khám phá.
     - Segmented Control Tabs siêu mượt: **"Gửi phản ánh"** và **"Sự cố quanh đây (Feed)"**.
  4. **Micro-interactions & Tinh tế từng pixel:**
     - Tọa độ GPS hiển thị dưới dạng chip badge có chấm LED nhấp nháy (pulsing green dot) khi hợp lệ.
     - Ô tải ảnh kéo thả dạng viền đứt nét tối giản, hỗ trợ xem trước ảnh tinh tế có nút xóa nổi.
     - Cảnh báo trùng lặp 50m hiển thị dưới dạng notification card mềm mại kèm nút tác vụ nhanh "+1 Xác nhận trùng lặp".

---

## 2. Phạm vi Tập tin Được phép Thay đổi (Allowed Files)

- `frontend/src/lib/api.ts` (Thêm cơ chế Graceful Fallback & Error Handling)
- `frontend/src/app/page.tsx` (Tái cấu trúc bố cục Linear Immersive Full-Bleed Map + Floating Island Header + Floating Panel)
- `frontend/src/components/citizen/report-form.tsx` (Tái thiết kế form theo chuẩn Linear tinh gọn)
- `frontend/src/components/map/map-view.tsx` (Tối ưu full-bleed canvas và controls)
- `docs/plans/modern-linear-citizen-ui.md`

### Ngoài phạm vi nghiêm ngặt (Strict Non-goals)
- Không chỉnh sửa backend (`backend/`).
- Không phá vỡ các hợp đồng API (`/zones/active`, `/incidents/nearby`, `/incidents/`, v.v.).

---

## 3. Các bước triển khai tuần tự (Ordered Small Steps)

### Bước 1: Xử lý Triệt để Lỗi Fetch & Xây dựng Cơ chế Offline / Demo Fallback trong `api.ts`
- **Mục tiêu:** Đảm bảo toàn bộ các hàm gọi API không bao giờ làm bung unhandled exception khi backend chưa khởi động.
- **Thực hiện:**
  - Trong `frontend/src/lib/api.ts`:
    - Tạo dữ liệu mẫu offline: `FALLBACK_DANANG_ZONES` (Ranh giới quận Hải Châu, Thanh Khê, Sơn Trà...), `FALLBACK_CATEGORIES` (Giao thông, Cây xanh, Thoát nước, Chiếu sáng, Vệ sinh môi trường).
    - Bọc `try / catch` trong `getActiveZones()`, `getCategories()`, `validateLocation()`: nếu kết nối thất bại (`fetch error`), tự động trả về fallback data hợp lệ và gán cờ `isOfflineMode = true`.
- **Lệnh kiểm tra:**
  - `npx tsc --noEmit`
  - `npm run lint`

### Bước 2: Tái thiết kế Form Báo cáo theo Phong cách Linear Tinh gọn (`report-form.tsx`)
- **Mục tiêu:** Loại bỏ hoàn toàn cảm giác "form hành chính cũ", thiết kế lại form tối giản, hiện đại, khoảng cách thở chuẩn mực.
- **Thực hiện:**
  - Tái cấu trúc `frontend/src/components/citizen/report-form.tsx`:
    - Bỏ các khối Card xám xịt dày đặc.
    - Segmented Tabs chuyển đổi mượt mà giữa Tab "Báo cáo sự cố mới" và Tab "Sự cố lân cận ({count})".
    - Ô nhập địa chỉ & GPS tinh gọn: Chip tọa độ `font-mono tabular-nums` kèm nút "Lấy vị trí GPS" thanh thoát.
    - Ô chọn danh mục: Dùng `Select` với các icon phân loại sắc nét (Cây xanh, Giao thông, Chiếu sáng...).
    - Ô kéo thả ảnh: Khung đứt nét tối giản, preview ảnh có nút xóa glassmorphism.
    - Cảnh báo trùng lặp 50m: Card thông báo màu amber tinh tế, nút "+1 Tôi cũng gặp sự cố này" phản hồi animation mượt.
- **Lệnh kiểm tra:**
  - `npx tsc --noEmit`
  - `npm run lint`

### Bước 3: Tái thiết kế Bố cục Linear Fullscreen Map & Floating Island Header (`page.tsx`)
- **Mục tiêu:** Triển khai kiến trúc Immersive Full-Bleed Map với các thành phần nổi kính mờ.
- **Thực hiện:**
  - Cập nhật `frontend/src/app/page.tsx`:
    - Bản đồ MapLibre chiếm 100% viewport nền (`absolute inset-0 w-full h-full z-0`).
    - **Floating Island Header (`top-4 left-4 right-4 md:left-6 md:right-auto z-20`):**
      - Thanh pill nổi kính mờ `backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 shadow-md rounded-full px-4 py-2 flex items-center gap-3`.
      - Logo `Building2` xanh `#1051A6`, tiêu đề *"IOC ĐÀ NẴNG"*, badge trạng thái mạng (Online / Demo Offline Mode).
      - Hotline phản ánh 1022.
    - **Floating Glass Panel (`top-20 left-4 md:left-6 z-20 w-[calc(100vw-2rem)] md:w-[440px]`):**
      - Thẻ kính mờ nổi bo góc `rounded-2xl border border-slate-200/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden`.
      - Có nút thu gọn/mở rộng (chevron toggle) để ẩn panel sang bên trái khi người dùng muốn xem trọn bản đồ.
    - Tối ưu Mobile: Nút nổi "Báo cáo sự cố" ở góc dưới màn hình mở Bottom Sheet tiện lợi như ứng dụng di động bản địa.
- **Lệnh kiểm tra:**
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`

### Bước 4: Kiểm định Toàn diện, Loại trừ 100% "AI Slop" & Nghiệm thu
- **Mục tiêu:** Kiểm tra trải nghiệm thực tế trên trình duyệt, đảm bảo không còn lỗi console và giao diện đạt chuẩn thẩm mỹ cao cấp.
- **Lệnh kiểm tra:**
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`
  - Spawn subagent `reviewer` audit toàn bộ mã nguồn.

---

## 4. Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
| :--- | :--- |
| **Bản đồ MapLibre không nhận click khi có floating panel:** | Sử dụng `pointer-events-none` trên container cha và `pointer-events-auto` trên floating island/panel. |
| **Lỗi hydrate khi Next.js render Floating UI:** | Sử dụng client-side state và `"use client"`. |
