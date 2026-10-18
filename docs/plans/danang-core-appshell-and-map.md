# Kế hoạch: Hoàn thiện AppShell Điều hành & Sửa lỗi Bản đồ GIS Đà Nẵng

> **Nhánh Git:** `feat/citizen-incident-reporting-ui`  
> **Tài liệu tham chiếu:** `.agents/rules/frontend-nextjs-maplibre.md`, [docs/spec.md](file:///D:/HK10/DATN/docs/plans/figma-shadcn-citizen-ui.md)  
> **Mục tiêu:** 
> 1. Khắc phục triệt để lỗi Web Worker ("Worker failed to load") và màn hình trắng của MapLibre GL; hiển thị sắc nét bản đồ Đà Nẵng cấp đường phố kèm đường viền đa giác `DANANG_CORE` màu `#1051A6` (`fill-opacity: 0.08`, `line-width: 2`).
> 2. Loại bỏ hoàn toàn kiểu "Card lồng trong cột có khoảng trắng thừa"; biến Sidebar trái (`w-[420px] shrink-0`) thành một khối liền mạch chạm sát mép với thanh cuộn `overflow-y-auto` bên trong.
> 3. Tái cấu trúc Header `h-14` đúng chuẩn AppShell: Cụm chuyển đổi 4 phân hệ (`Công dân`, `Điều phối IOC`, `Kỹ thuật viên`, `Quản trị`), trạng thái tài khoản và nút CTA chính `+ Gửi phản ánh mới` (`bg-[#1051A6]`, `h-9`).
> 4. Tích hợp Tabs `shadcn/ui` ở đầu Sidebar với 2 tab:
>    - **Tab 1: Sự cố khu vực** (Thanh lọc Danh mục/Trạng thái + Feed danh sách sự cố kèm mã Ticket `font-mono tabular-nums`, khoảng cách, nút Upvote trùng lặp).
>    - **Tab 2: Gửi phản ánh mới** (Form compact chuẩn `shadcn/ui`, `Input` `h-9`, `Label` `text-xs font-medium`, `space-y-3`, tự động cảnh báo trùng lặp 50m khi chọn điểm).

---

## 1. Phạm vi Tập tin Được phép Thay đổi (Allowed Files)

- `frontend/public/maplibre-gl-worker.mjs` (Tệp worker tĩnh chính thức phục vụ tại root URL)
- `frontend/public/maplibre-gl-worker-dev.mjs` (Tệp worker dev)
- `frontend/src/components/map/map-view.tsx` (Cấu hình `setWorkerUrl`, style đường phố & polygon `DANANG_CORE`)
- `frontend/src/components/citizen/report-form.tsx` (Form phản ánh compact theo chuẩn tab)
- `frontend/src/components/citizen/incident-feed.tsx` (Component danh sách sự cố khu vực có bộ lọc & upvote)
- `frontend/src/app/page.tsx` (AppShell Header 4 phân hệ, Sidebar tabs & liên kết nút CTA)
- `docs/plans/danang-core-appshell-and-map.md`

### Ngoài phạm vi nghiêm ngặt (Strict Non-goals)
- Không chỉnh sửa backend (`backend/`).
- Không phá vỡ các hợp đồng API (`/zones/active`, `/incidents/nearby`, v.v.).

---

## 2. Các bước Triển khai Tuần tự (Ordered Small Steps)

### [x] Bước 1: Sửa lỗi Web Worker & Hiển thị Bản đồ Đường phố Đà Nẵng (`map-view.tsx` & `public/`)
- **Mục tiêu:** Bản đồ tải mượt mà không còn lỗi `Worker failed to load`, hiển thị rõ nét tên đường phố Đà Nẵng và đa giác `DANANG_CORE`.
- **Thực hiện:**
  - Sao chép `maplibre-gl-worker.mjs` và `maplibre-gl-worker-dev.mjs` từ `node_modules/maplibre-gl/dist/` sang `frontend/public/`.
  - Trong `map-view.tsx`:
    - Thiết lập `maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs")`.
    - Sử dụng nguồn style vector Carto Positron kết hợp nguồn raster OSM rõ nét tên đường tiếng Việt tại Đà Nẵng.
    - Cấu hình lớp đa giác `DANANG_CORE`: `fill-color: "#1051A6"`, `fill-opacity: 0.08`, `line-color: "#1051A6"`, `line-width: 2`.
- **Kiểm tra cơ học:** `npx tsc --noEmit` & `npm run lint`.

### [x] Bước 2: Xây dựng Component Feed Sự cố Khu vực (`incident-feed.tsx`) & Tinh gọn Form (`report-form.tsx`)
- **Mục tiêu:** Xây dựng danh sách sự cố có bộ lọc phục vụ Tab 1 và tối ưu form gọn gàng `space-y-3` cho Tab 2.
- **Thực hiện:**
  - Tạo `frontend/src/components/citizen/incident-feed.tsx`:
    - Bộ lọc nhanh: Danh mục (Tất cả, Giao thông, Cây xanh...) & Trạng thái (Tất cả, Mới tiếp nhận, Đang xử lý...).
    - Danh sách thẻ sự cố: Mã phiếu `font-mono tabular-nums`, Badge trạng thái semantic, nút "+1 Tôi cũng gặp sự cố này", nút xem vị trí trên bản đồ.
    - Dữ liệu demo dự phòng phong phú khi ngoại tuyến để kiểm thử trải nghiệm người dùng.
  - Tinh gọn `report-form.tsx`: Bỏ khung Card thừa bên ngoài để nhúng mượt vào Sidebar, khoảng cách `space-y-3`, `Input` `h-9 text-xs`, `Label` `text-xs text-slate-700`.
- **Kiểm tra cơ học:** `npx tsc --noEmit` & `npm run lint`.

### Bước 3: Tái cấu trúc AppShell Header 4 Phân hệ & Sidebar Liền mạch (`page.tsx`)
- **Mục tiêu:** Header chuẩn nghiệp vụ GovTech Đà Nẵng, Sidebar chạm sát viền với Tabs `shadcn/ui`.
- **Thực hiện:**
  - Header `h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between`:
    - Trái: Logo Đà Nẵng & Tên nền tảng.
    - Giữa: Cụm switcher 4 phân hệ: `Công dân` (Active), `Điều phối IOC`, `Kỹ thuật viên`, `Quản trị`.
    - Phải: Trạng thái tài khoản người dùng & Nút CTA `+ Gửi phản ánh mới` (`bg-[#1051A6] text-white h-9 rounded-md`). Khi click nút này sẽ tự động chuyển sang Tab "Gửi phản ánh".
  - Sidebar trái (`w-[420px] shrink-0 border-r border-slate-200 bg-white flex flex-col h-full`):
    - Khối Tabs `shadcn/ui` ở đầu: `Sự cố khu vực` và `Gửi phản ánh mới`.
    - Phần thân cuộn `overflow-y-auto flex-1`.
- **Kiểm tra cơ học:** `npx tsc --noEmit`, `npm run lint`, `npm run build`.

### Bước 4: Kiểm định Độc lập & Nghiệm thu Toàn diện (Reviewer Subagent)
- **Mục tiêu:** Xác nhận toàn bộ 4 lỗi UI/UX và bản đồ đã được khắc phục triệt để.
- **Kiểm tra:** Subagent `reviewer` audit mã nguồn và kiểm tra cơ học (`STATUS: PASS`).
