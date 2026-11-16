# Kế Hoạch Chuyển Đổi 34 Màn Hình Từ `ui-prototype` Sang Next.js (`frontend/`) & Ghép Nối Backend API (`nextjs-34-screens-migration-and-integration.md`)

> **Nhánh thực hiện:** `feat/nextjs-34-screens-integration` (tách từ `main`)  
> **Mục tiêu:** Chuyển toàn bộ **34 màn hình Bento V2 + Component Library** từ `ui-prototype/` (Vite/React xuất từ Figma Make) sang ứng dụng chính **`frontend/` (Next.js App Router, React 19, TypeScript, Tailwind CSS v4)**, đồng thời ghép nối toàn diện với **FastAPI Backend (`http://localhost:8000`)** và **7 đa giác phân vùng GIS Quận/Huyện thực tế**.

---

## 1. Mục Tiêu & Phạm Vi (Goal & Scope)

### 1.1. Mục tiêu cốt lõi
1. **Chuyển đổi 100% Design System & 34 Màn hình sang Next.js App Router (`frontend/src`):**
   - Đồng bộ toàn bộ biến CSS `@theme` (Be Vietnam Pro, màu Bento `#E9E9EB`, `#111111`, `#E5251B`, `#F97316`, `#F5B400`, `#9CA3AF`, `#16A34A`, radius `20px/12px`, shadow mềm, keyframes) vào `frontend/src/app/globals.css`.
   - Chuyển đổi bộ primitives & shells (`primitives.tsx`, `data.tsx`, `nav.tsx`, `MapArt.tsx`, `SamplePhoto.tsx`, `DevMenu.tsx`, `CitizenShell`, `DispatcherShell`, `TechnicianShell`, `AdminShell`, `AuthShell`, `ExceptionShell`) sang Client Components (`'use client'`) tương thích SSR/Hydration của Next.js 16 (dùng `usePathname()` từ `next/navigation` thay cho `window.location.pathname` trực tiếp khi render).
   - Tạo đủ **34 route Next.js App Router** (cùng `/gallery` và `not-found.tsx`) khớp 1-1 với danh mục trong `docs/screen.md` và `docs/ui-api-mapping.md`.
   - Dọn bỏ các route giao diện v1 cũ trong `frontend/src/app/citizen/page.tsx` và `frontend/src/app/ioc-sample/page.tsx`.
2. **Tầng Adapter & Đồng bộ Dữ liệu Thời gian thực (`frontend/src/lib/backend-api.ts` & `frontend/src/data/tickets.ts`):**
   - Xây dựng API Client có kiểu tĩnh nghiêm ngặt (Strict TypeScript, không dùng `any`) khớp với `docs/openapi.json`, tự động đính kèm JWT Bearer Token từ `localStorage` (`urbana.token`).
   - Kết nối `tickets.ts` với Backend thực (`GET /api/v1/incidents`, `GET /api/v1/incidents/{id_or_code}`) theo mô hình **Live API + Reactive Store + Graceful Fallback**:
     - Khi Backend đang chạy: tự động tải danh sách phiếu thật từ PostgreSQL/PostGIS (bao gồm phiếu demo `DN-202610-0129` và toàn bộ 9 trạng thái từ `seed_demo.py`), chuyển đổi sang cấu trúc `Ticket` của UI và cập nhật tức thì mọi màn hình qua hook `useTicketVersion()`.
     - Khi chạy chế độ kiểm thử ngoại tuyến (`/offline` hoặc chưa bật Backend): tự động fallback về bộ dữ liệu mẫu để giao diện không bao giờ bị treo/trắng trang.
3. **Ghép nối API Backend cho toàn bộ các luồng nghiệp vụ chính & quản trị:**
   - **Xác thực & Hồ sơ (Màn 6, 7, 9):** `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/google`, `GET/PATCH /api/v1/auth/me`, `POST /api/v1/auth/change-password`.
   - **Công cộng & Công dân (Màn 1, 2, 3, 4, 10, 11, 12):**
     - Màn 2 (`/report`): Quét ảnh AI trước khi gửi (`POST /api/v1/incidents/analyze-image`), kiểm tra tọa độ trong 7 Quận/Huyện (`POST /api/v1/zones/validate-location`), quét trùng lặp 50m (`GET /api/v1/incidents/nearby`), bấm "+1 Tôi cũng gặp" (`POST /api/v1/incidents/{code}/vote-duplicate`), và gửi phiếu mới (`POST /api/v1/incidents` kèm `category_code`, `priority`).
     - Màn 3, 10, 11, 12 (`/tracking/[code]`, `/citizen/my-reports`, `/citizen/reports/[id]`, `/citizen/feedback/[code]`): Tra cứu tiến độ thực, danh sách phiếu của tôi (`mine=true`), xác nhận hài lòng đóng phiếu (`action="CONFIRM"` $\rightarrow$ `CLOSED`) hoặc gửi khiếu nại mở lại (`action="DISPUTE"` $\rightarrow$ `REOPENED`).
   - **Điều phối viên IOC (Màn 14, 15, 16, 18):**
     - Màn 14 (`/dispatcher/command-center`): Duyệt & Giao việc (`PATCH /triage` + `PATCH /assign`), Từ chối tiếp nhận (`PATCH /status` với `to_status="REJECTED"` và lý do bắt buộc), Gộp phiếu trùng (`POST /merge-duplicate`).
     - Màn 15 (`/dispatcher/verify`): Duyệt nghiệm thu (`RESOLVED` $\rightarrow$ `CONFIRMED`) hoặc Yêu cầu làm lại (`RESOLVED` $\rightarrow$ `REOPENED`), sửa nhãn hiển thị thành `"Đã xác nhận"` theo đúng `lifecycle.md`.
     - Màn 16 & 18 (`/dispatcher/sla-watch`, `/dispatcher/incidents`): Đổi nhãn `"Tiêu chuẩn"` thành `"Trung bình"` theo đúng `lifecycle.md`, lọc đa trạng thái/mức độ/từ khóa `q`.
   - **Kỹ thuật viên Hiện trường (Màn 19, 20, 21, 22):**
     - Nhận xử lý (`{ASSIGNED, REOPENED}` $\rightarrow$ `IN_PROGRESS`) và gửi biên bản nghiệm thu kèm ảnh minh chứng `AFTER_PROOF` + tọa độ GPS (`IN_PROGRESS` $\rightarrow$ `RESOLVED`).
   - **Quản trị & Open311 (Màn 5, 24, 25, 26, 27, 28):**
     - Màn 5 (`/developers/open311`): Gọi trực tiếp `/open311/v2/services.json`, `GET/POST /open311/v2/requests.json` và tải GeoJSON phân vùng từ `/api/v1/zones`.
     - Màn 24 (`/admin/analytics`): Hiển thị KPI thực từ `GET /api/v1/incidents/analytics/summary`.
     - Màn 25 (`/admin/users`): Danh sách, tạo mới, đổi vai trò và khóa/mở khóa tài khoản qua `/api/v1/users`.
     - Màn 26 (`/admin/zones`): Hiển thị và vẽ **7 đa giác ranh giới Quận/Huyện thực tế** (`HC`, `TK`, `ST`, `CL`, `NHS`, `LC`, `HV`) từ `GET /api/v1/zones` (kèm проекция tọa độ WGS84 `[lon, lat]` lên khung bản đồ) và bật/tắt tiếp nhận thực tế qua `PATCH /api/v1/zones/{zone_id}`.
     - Màn 27 & 28 (`/admin/settings`, `/admin/audit-logs`): Kết nối `/api/v1/categories`, `/api/v1/departments`, và `/api/v1/audit-logs`.

### 1.2. Vùng cấm tuyệt đối (Non-goals)
- **KHÔNG** sửa hay xóa bất kỳ file nào trong thư mục `ui-prototype/` (giữ nguyên làm bản tham chiếu gốc).
- **KHÔNG** thay đổi logic máy trạng thái hay schema CSDL trên Backend (`backend/`).

---

## 2. Danh Sách Tập Tin Được Phép Thay Đổi / Tạo Mới Trong `frontend/`

- **Cấu hình & Styles:**
  - `frontend/src/app/globals.css`
  - `frontend/src/app/layout.tsx`
  - `frontend/public/danang-map.png` *(copy từ `ui-prototype/public/danang-map.png` nếu có)*
- **Tầng API Adapter & Data Store:**
  - `frontend/src/lib/backend-api.ts` *(tạo mới)*
  - `frontend/src/data/tickets.ts` *(chuyển đổi từ `ui-prototype` + gắn Live API sync)*
- **Bộ UI Primitives, Shells & Shared Components:**
  - `frontend/src/components/primitives.tsx`
  - `frontend/src/components/data.tsx`
  - `frontend/src/components/nav.tsx`
  - `frontend/src/components/MapArt.tsx`
  - `frontend/src/components/SamplePhoto.tsx`
  - `frontend/src/components/DevMenu.tsx`
  - `frontend/src/components/ExceptionShell.tsx`
  - `frontend/src/ComponentGallery.tsx`
  - `frontend/src/screens/*.tsx` & `frontend/src/screens/*.ts` *(toàn bộ 30 file màn hình & shells được chuyển sang Next.js Client Components và gắn API)*
- **Hệ thống Route Next.js App Router (`frontend/src/app/`):**
  - `frontend/src/app/page.tsx` (`/`)
  - `frontend/src/app/not-found.tsx` & `frontend/src/app/404/page.tsx`
  - `frontend/src/app/403/page.tsx`, `500/page.tsx`, `maintenance/page.tsx`, `offline/page.tsx`, `gallery/page.tsx`
  - `frontend/src/app/report/page.tsx`
  - `frontend/src/app/tracking/[code]/page.tsx`
  - `frontend/src/app/incidents/page.tsx`
  - `frontend/src/app/developers/open311/page.tsx`
  - `frontend/src/app/auth/login/page.tsx`, `auth/register/page.tsx`, `auth/forgot-password/page.tsx`
  - `frontend/src/app/profile/page.tsx`
  - `frontend/src/app/citizen/my-reports/page.tsx`, `citizen/reports/[id]/page.tsx`, `citizen/feedback/[code]/page.tsx`, `citizen/notifications/page.tsx`
  - `frontend/src/app/dispatcher/command-center/page.tsx`, `dispatcher/verify/page.tsx`, `dispatcher/sla-watch/page.tsx`, `dispatcher/field-units/page.tsx`, `dispatcher/incidents/page.tsx`
  - `frontend/src/app/technician/tasks/page.tsx`, `technician/tasks/[id]/page.tsx`, `technician/tasks/[id]/resolve/page.tsx`, `technician/history/page.tsx`, `technician/profile/page.tsx`
  - `frontend/src/app/admin/analytics/page.tsx`, `admin/users/page.tsx`, `admin/zones/page.tsx`, `admin/settings/page.tsx`, `admin/audit-logs/page.tsx`, `admin/integrations/page.tsx`
  - *(Xóa 2 route v1 cũ: `frontend/src/app/citizen/page.tsx` và `frontend/src/app/ioc-sample/page.tsx`)*

---

## 3. Các Bước Thực Hiện Tuần Tự (4 Commits)

### [x] Bước 1: Chuyển Nền Tảng Design System, Primitives, Shells & 34 Route Sang Next.js (`frontend/`)
- Copy tài nguyên tĩnh từ `ui-prototype/public` sang `frontend/public`.
- Cập nhật `frontend/src/app/globals.css` và `frontend/src/app/layout.tsx` với bộ token `@theme` Bento V2 và font `Be Vietnam Pro`.
- Chuyển toàn bộ `components/` (`primitives.tsx`, `data.tsx`, `nav.tsx`, `MapArt.tsx`, `SamplePhoto.tsx`, `DevMenu.tsx`, `ExceptionShell.tsx`), `ComponentGallery.tsx` và `screens/` sang `frontend/src/`, thêm `'use client'` và chuẩn hóa điều hướng SSR-safe (`usePathname()`).
- Tạo đầy đủ 34 route trong `frontend/src/app/` và xóa 2 route mẫu v1 cũ (`app/citizen/page.tsx`, `app/ioc-sample/page.tsx`).
- **Lệnh kiểm tra:** `npx tsc --noEmit` (trong `frontend/`)
- **Commit 1:** `feat(frontend): migrate 34 Bento V2 screens and component library to Next.js App Router`

### [ ] Bước 2: Xây Dựng Tầng API Client (`backend-api.ts`) & Đồng Bộ Store `tickets.ts` Với Backend
- Tạo `frontend/src/lib/backend-api.ts` định nghĩa đầy đủ các hàm gọi FastAPI (`auth`, `incidents`, `analyze-image`, `nearby`, `vote-duplicate`, `merge-duplicate`, `triage`, `assign`, `status`, `feedback`, `analytics`, `users`, `zones`, `categories`, `departments`, `audit-logs`, `open311`).
- Nâng cấp `frontend/src/data/tickets.ts`:
  - Tự động đồng bộ danh sách phiếu từ `GET /api/v1/incidents` vào store khi khởi chạy và sau mỗi thao tác cập nhật.
  - Cung cấp các hàm bất đồng bộ gọi API thật kèm cập nhật optimistic (`apiCreateIncident`, `apiAnalyzeImage`, `apiVoteDuplicate`, `apiTriageAndAssign`, `apiUpdateStatus`, `apiSubmitFeedback`, `apiMergeDuplicate`).
- **Lệnh kiểm tra:** `npx tsc --noEmit`
- **Commit 2:** `feat(frontend): add typed FastAPI client and live reactive ticket synchronization`

### [ ] Bước 3: Ghép Nối API Cho Luồng Công Dân, Điều Phối IOC & Kỹ Thuật Viên (Màn 1–23)
- Kết nối Màn 6, 7, 9 (`LoginScreen`, `RegisterScreen`, `ProfileScreen`) với `/api/v1/auth/*`.
- Kết nối Màn 1, 2, 3, 4, 10, 11, 12 (`HomeScreen`, `ReportScreen`, `TrackingScreen`, `IncidentListScreen`, `MyReportsScreen`, `ReportDetailScreen`, `FeedbackScreen`) với `/analyze-image`, `/zones/validate-location`, `/incidents/nearby`, `/vote-duplicate`, `POST /incidents`, và `POST /feedback` (`CONFIRM` / `DISPUTE`).
- Kết nối Màn 14, 15, 16, 18 (`CommandCenterScreen`, `VerifyScreen`, `SlaWatchScreen`, `IncidentsScreen`) và Màn 19, 20, 21, 22 (`TaskListScreen`, `TaskDetailScreen`, `TaskResolveScreen`, `TechnicianHistoryScreen`) với `/triage`, `/assign`, `/status`, `/merge-duplicate`; đồng bộ nhãn `"Đã xác nhận"` (Màn 15) và `"Trung bình"` (Màn 16, 27).
- **Lệnh kiểm tra:** `npx tsc --noEmit`
- **Commit 3:** `feat(frontend): wire citizen, dispatcher, and technician screens to live backend APIs`

### [ ] Bước 4: Ghép Nối API Quản Trị, 7 Đa Giác GIS Quận/Huyện & Open311 (Màn 5, 24–28) + Kiểm Thử Build Toàn Diện
- Kết nối Màn 26 (`ZonesScreen`) với `GET /api/v1/zones` và `PATCH /api/v1/zones/{zone_id}`, chuyển đổi tọa độ đa giác WGS84 `[lon, lat]` của 7 Quận/Huyện (`HC`, `TK`, `ST`, `CL`, `NHS`, `LC`, `HV`) lên bản đồ SVG để chọn và bật/tắt theo đúng ranh giới thực tế.
- Kết nối Màn 5 (`Open311Screen`), Màn 24 (`AnalyticsScreen`), Màn 25 (`UsersScreen`), Màn 27 (`SettingsScreen`), Màn 28 (`AuditLogsScreen`) với các API tương ứng.
- Chạy kiểm tra biên dịch và build toàn diện cả Frontend lẫn Backend.
- **Lệnh kiểm tra:** `npx tsc --noEmit && npm run build` (trong `frontend/`) và `py -m pytest` (trong `backend/`)
- **Commit 4:** `feat(frontend): connect admin GIS zones, users, analytics, audit logs, and Open311 screens`

---

## 4. Rủi Ro & Giải Pháp
- **Rủi ro Hydration Mismatch trên Next.js App Router:** `ui-prototype` đọc `window.location.pathname` và `localStorage` trực tiếp trong hàm render.
- **Giải pháp:** Chuyển sang hook `usePathname()` của `next/navigation` cho việc tô sáng menu/route và chỉ đọc `localStorage` an toàn kèm state đồng bộ sau khi mount.
