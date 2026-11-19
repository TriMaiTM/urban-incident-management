# Kế Hoạch Khắc Phục 5 Lỗi Giao Diện, Định Vị GPS, Hook Crash, Phân Quyền RBAC & Menu Demo (`fix-5-frontend-ux-and-rbac-issues.md`)

> **Nhánh thực hiện:** `feat/fix-5-frontend-ux-and-rbac`  
> **Mục tiêu:** Giải quyết triệt để 5 vấn đề người dùng phản hồi trong quá trình kiểm thử thực tế trên trình duyệt Desktop.

---

## 1. Phân Tích Nguyên Nhân Gốc Rễ Của 5 Lỗi

### Lỗi 1: Tràn chiều dọc màn hình Desktop (phải cuộn trang mới thấy hết Form và Bản đồ)
- **Nguyên nhân:** Các màn hình xuất từ Figma được thiết kế cho khung canvas cao `960px–1024px` (với `min-h-[760px]` cho bản đồ, `p-8` cho khung ngoài, và 3 thẻ cột trái cao tổng cộng `~920px`). Trong khi đó, cửa sổ trình duyệt thực tế trên màn hình laptop/desktop (đặc biệt ở tỷ lệ phóng đại 125% của Windows) chỉ có chiều cao hiển thị (`100dvh`) khoảng **`720px–820px`**, khiến phần thẻ nhập mô tả/SĐT và nút **"Gửi phản ánh"** bị đẩy tụt xuống dưới đáy màn hình.
- **Giải pháp:** Chuyển bố cục Desktop (`>= 768px`) của `ReportScreen` và các màn điều hành (`AdminShell`, `DispatcherShell`, `ZonesScreen`, `FieldUnitsScreen`, `VerifyScreen`, `AnalyticsScreen`) sang chế độ **Full-Viewport (`h-dvh overflow-hidden` hoặc khớp gọn trong `100dvh`)**: thu gọn padding ngoài (`md:px-6 md:py-3`), thu gọn chiều cao thẻ tải ảnh/AI/form vừa khít khung nhìn để **nhìn thấy toàn cảnh 100% Bản đồ + Form + Nút Gửi trong 1 màn hình duy nhất mà không cần cuộn trang**.

### Lỗi 2: Định vị ghim sai về Sân bay Đà Nẵng và hiển thị địa chỉ không khớp vị trí ghim
- **Nguyên nhân:**
  1. Trong `ReportScreen.tsx` dòng 229, khi quét ảnh xong code đang gán cứng `setPin({ x: 46.5, y: 60.5 })`. Khi quy đổi qua `xyToLngLat(46.5, 60.5)` thì tọa độ rơi vào `(108.2037, 16.0574)` — đúng ngay khu vực **Sân bay Quốc tế Đà Nẵng**.
  2. Nút định vị trên bản đồ chưa gọi Web Geolocation API (`navigator.geolocation.getCurrentPosition`) để lấy tọa độ GPS thực của thiết bị.
  3. Ô địa chỉ đang dùng hàm `addressAt` tra bảng cố định 1 tên đường cho cả 1 quận (`'Hải Châu' -> 'Lê Duẩn, Hải Châu'`), nên dù ghim nằm ở Sân bay hay Hòa Cường thì ô tìm kiếm vẫn hiện `"Lê Duẩn, Hải Châu"`.
- **Giải pháp:**
  1. Tích hợp **Web Geolocation API (`navigator.geolocation.getCurrentPosition`)** vào nút định vị trên `GoongBentoMap` và tự động lấy GPS thật của trình duyệt khi tải ảnh (nếu vị trí thật của bạn nằm trong Đà Nẵng sẽ ghim đúng tọa độ thật của bạn; nếu từ chối quyền GPS hoặc đang ở ngoài Đà Nẵng thì đặt mặc định tại đúng số 124 Lê Duẩn `[108.2208, 16.0712]`, không bao giờ nhảy vào Sân bay).
  2. Tích hợp **Reverse Geocoding thời gian thực** (Nominatim OpenStreetMap tiếng Việt + Goong Geocoding) và cho phép **kéo thả ghim (draggable marker)** trên bản đồ: ghim đặt ở đâu thì ô địa chỉ hiển thị đúng tên đường, phường, quận thực tế tại tọa độ đó.

### Lỗi 3: Crash `Uncaught Error: Rendered fewer hooks than expected` khi bấm "Gửi phản ánh"
- **Nguyên nhân:** Trong `ReportScreen.tsx`, câu lệnh `if (result) return (<ScreenFrame>...</ScreenFrame>)` nằm ở dòng 303, nhưng hai hook `const allTickets = useMemo(...)` và `const stat = useMemo(...)` lại được khai báo ở dòng 369–374 (**phía sau** lệnh `return` sớm!). Khi bấm **"Gửi phản ánh"**, state `result` chuyển từ `null` sang `{ code, merged }`, component thoát sớm ở dòng 303 và bỏ qua 2 hook `useMemo` ở dòng 369, vi phạm Rules of Hooks của React.
- **Giải pháp:** Đưa toàn bộ các hook `useMemo` lên phía trên câu lệnh `if (result) return (...)`.

### Lỗi 4: Thiếu cơ chế Phân quyền (RBAC) chặn giữa các Role và bắt buộc Login
- **Nguyên nhân:**
  1. `ClientRouteShell.tsx` đang render trực tiếp mọi màn hình mà không kiểm tra người dùng đã đăng nhập hay chưa và `user.role` có khớp với phân hệ của route đó không.
  2. Hàm `ensureRoleToken` trước đó tự động chuyển đổi token ngầm giữa các role khiến một người dùng chưa đăng nhập hoặc đang ở role `CITIZEN` vẫn mở được trang của `DISPATCHER`, `TECHNICIAN`, `ADMIN`.
- **Giải pháp:**
  1. Bỏ cơ chế tự động đổi token ngầm trái phép; giữ đúng phiên đăng nhập của người dùng hiện tại trong `localStorage`.
  2. Thiết lập **Route Guard phân quyền chặt chẽ trong `ClientRouteShell.tsx`**:
     - **Route Công khai:** `/`, `/incidents`, `/tracking/[code]`, `/developers/open311`, `/auth/*`, `/403`, `/404`, `/500`, `/maintenance`, `/offline`, `/gallery`.
     - **Route Công dân (`CITIZEN`):** `/report`, `/citizen/*`.
     - **Route Điều phối viên IOC (`DISPATCHER`):** `/dispatcher/*`.
     - **Route Kỹ thuật viên (`TECHNICIAN`):** `/technician/*`.
     - **Route Quản trị (`ADMIN`):** `/admin/*`.
     - **Route Hồ sơ (`/profile`):** yêu cầu bất kỳ role nào đã đăng nhập.
  3. Nếu **chưa đăng nhập** mà truy cập route cần quyền $\rightarrow$ tự động chuyển hướng sang `/auth/login?next=<đường_dẫn>` (trên màn Login có sẵn gợi ý/nút điền nhanh tài khoản demo của từng role để thuận tiện khi chấm đồ án).
  4. Nếu **đã đăng nhập nhưng sai Role** (ví dụ đang là `CITIZEN` mà vào `/dispatcher/command-center` hoặc `/admin/users`) $\rightarrow$ chặn ngay và hiển thị màn hình **403 Từ chối truy cập** kèm thông tin role hiện tại, role yêu cầu, nút **"Về trang đúng vai trò"** và nút **"Đổi tài khoản"**.

### Lỗi 5: Nút Menu Demo (3 gạch tròn góc dưới phải) gộp chung 35 màn hình gây rối
- **Nguyên nhân:** `DevMenu.tsx` đang để 1 mảng phẳng `routes` gồm 35 phần tử không theo thứ tự vai trò.
- **Giải pháp:** Thiết kế lại `DevMenu.tsx` chia thành **5 nhóm (sections) rõ ràng theo từng Role** (có thể thu gọn/mở rộng từng nhóm) kèm thanh trạng thái phiên đăng nhập ở trên cùng:
  - **Phiên đăng nhập Demo nhanh:** Hiển thị tài khoản hiện tại + nút chuyển nhanh 4 tài khoản (`Công dân`, `Điều phối IOC`, `Kỹ thuật viên`, `Quản trị`, `Đăng xuất`).
  - **Nhóm 1 — Công dân (`CITIZEN`):** 8 màn hình.
  - **Nhóm 2 — Điều phối viên IOC (`DISPATCHER`):** 5 màn hình.
  - **Nhóm 3 — Kỹ thuật viên (`TECHNICIAN`):** 5 màn hình.
  - **Nhóm 4 — Quản trị hệ thống (`ADMIN`):** 6 màn hình.
  - **Nhóm 5 — Xác thực, Open311 & Ngoại lệ:** 11 màn hình.

---

## 2. Danh Sách File Được Phép Thay Đổi (Allowed Files)

- `frontend/src/screens/ReportScreen.tsx`
- `frontend/src/components/GoongBentoMap.tsx`
- `frontend/src/components/ClientRouteShell.tsx`
- `frontend/src/components/DevMenu.tsx`
- `frontend/src/lib/backend-api.ts`
- `frontend/src/data/tickets.ts`
- `frontend/src/screens/LoginScreen.tsx`
- `frontend/src/screens/AdminShell.tsx`
- `frontend/src/screens/DispatcherShell.tsx`
- `frontend/src/screens/CommandCenterScreen.tsx`
- `frontend/src/screens/VerifyScreen.tsx`
- `frontend/src/screens/ZonesScreen.tsx`
- `frontend/src/screens/FieldUnitsScreen.tsx`
- `frontend/src/screens/AnalyticsScreen.tsx`
- `docs/plans/fix-5-frontend-ux-and-rbac-issues.md`

### Vùng cấm (Non-goals)
- Không chỉnh sửa `ui-prototype/`.
- Không thay đổi logic Backend Python (`backend/`).

---

## 3. Các Bước Thực Hiện Tuần Tự (3 Commits)

### [x] Bước 1: Sửa Lỗi Crash Hook Trên `ReportScreen`, Định Vị GPS Thực + Reverse Geocoding & Tối Ưu Khung Nhìn Desktop 1 Màn Hình (Lỗi 1, 2, 3)
- Trong `ReportScreen.tsx`:
  - Di chuyển seluruh `useMemo` lên trước `if (result) return (...)` để sửa dứt điểm lỗi `Rendered fewer hooks than expected`.
  - Tích hợp lấy tọa độ GPS thực của trình duyệt (`navigator.geolocation.getCurrentPosition`) và Reverse Geocoding thực tế (tên đường, phường, quận tại điểm ghim) thay cho tọa độ Sân bay Đà Nẵng `(46.5, 60.5)`.
  - Tinh chỉnh bố cục Desktop (`md:h-dvh md:overflow-hidden`) để toàn bộ Header + 3 thẻ KPI + Ảnh + AI gợi ý + Form nhập + Bản đồ hiển thị trọn vẹn trong 1 màn hình duy nhất không cần cuộn.
- Đồng bộ chiều cao khung nhìn Desktop trên `AdminShell.tsx`, `DispatcherShell.tsx`, `CommandCenterScreen.tsx`, `VerifyScreen.tsx`, `ZonesScreen.tsx`, `FieldUnitsScreen.tsx`, `AnalyticsScreen.tsx`.
- **Lệnh kiểm tra:** `npx tsc --noEmit` (trong `frontend/`)
- **Commit 1:** `fix(frontend): resolve ReportScreen hook crash, fit desktop layouts in single viewport, and fix GPS geocoding`

### [x] Bước 2: Triển Khai Phân Quyền RBAC Chặt Chẽ Giữa Các Role & Bắt Buộc Đăng Nhập (Lỗi 4)
- Trong `ClientRouteShell.tsx`: kiểm tra JWT Token và `user.role` trước khi cho phép truy cập các route thuộc `/citizen/*`, `/report`, `/dispatcher/*`, `/technician/*`, `/admin/*`, `/profile`.
- Nếu chưa đăng nhập: chuyển hướng về `/auth/login?next=...`.
- Nếu đăng nhập sai role: hiển thị màn chắn `403 Từ chối truy cập` kèm nút chuyển về đúng phân hệ hoặc đăng nhập tài khoản đúng quyền.
- Trong `LoginScreen.tsx`: hỗ trợ tự động chuyển về trang `?next=...` sau khi đăng nhập thành công và thêm dãy chip điền nhanh tài khoản demo của 4 role để tiện kiểm thử.
- **Lệnh kiểm tra:** `npx tsc --noEmit` (trong `frontend/`)
- **Commit 2:** `feat(auth): enforce strict role-based access control and login guards across all routes`

### [ ] Bước 3: Phân Nhóm Menu Demo (3 Gạch Tròn) Theo Từng Role & Kiểm Thử Build Toàn Diện (Lỗi 5)
- Thiết kế lại `DevMenu.tsx` thành 5 nhóm rõ ràng theo từng Role (`Công dân`, `Điều phối IOC`, `Kỹ thuật viên`, `Quản trị`, `Xác thực & Ngoại lệ`) kèm bộ chuyển đổi nhanh phiên đăng nhập Demo ở đầu menu.
- Chạy `npx tsc --noEmit && npm run build` để kiểm chứng toàn bộ 34 route.
- **Lệnh kiểm tra:** `npx tsc --noEmit && npm run build` (trong `frontend/`)
- **Commit 3:** `feat(frontend): organize DevMenu into role-based sections with quick role switcher`
