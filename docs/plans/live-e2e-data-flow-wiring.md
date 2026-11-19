# Kế Hoạch Kết Nối Luồng Dữ Liệu Thật Xuyên Suốt 4 Vai Trò (PostgreSQL <-> Frontend) (`live-e2e-data-flow-wiring.md`)

> **Nhánh thực hiện:** `feat/live-e2e-data-flow-wiring`  
> **Mục tiêu:** Loại bỏ các chốt chặn dữ liệu giả lập (mock) đang che khuất dữ liệu thật từ PostgreSQL, đảm bảo khi Công dân tạo báo cáo mới trên `/report`, phiếu đó được ghi thật vào PostgreSQL và xuất hiện ngay lập tức ở **Bàn tác chiến IOC (`/dispatcher/command-center`)**, **Sổ bộ (`/dispatcher/incidents`)**, **Nhiệm vụ Kỹ thuật viên (`/technician/tasks`)**, **Nghiệm thu (`/dispatcher/verify`)**, **Phản ánh của tôi (`/citizen/my-reports`)** và **Bảng chỉ số (`/admin/analytics`, `/admin/audit-logs`)**.

---

## 1. Nguyên Nhân Khiến Luồng Dữ Liệu Hiện Tại Vẫn Giống Mock

Qua rà soát trực tiếp mã nguồn `frontend/src/`, có **4 điểm nghẽn** đang chặn luồng dữ liệu thật giữa các vai trò:

1. **Màn Công dân gửi báo cáo (`ReportScreen.tsx`) chưa tạo phiếu thật khi dùng "Ảnh mẫu":**
   - Khi bấm nút **"Ảnh mẫu"** (`onSample`), biến `selectedFile` đang là `null`, nên khi bấm **"Gửi phản ánh"** hàm `submit()` bỏ qua `apiCreateIncident()` và nhảy sang hàm mock `submitDemoTicket()` (chỉ lưu localStorage).
   - Mã danh mục `'Rác'` đang gửi `'WASTE'` thay vì `'GARBAGE'` (mã thật trong bảng `categories` của PostgreSQL).
2. **`citizenData.ts` đang khóa cứng 6 mã phiếu mẫu (`MINE`):**
   - Trong `frontend/src/screens/citizenData.ts` dòng 22: `const MINE = ['DN-202610-0129', ...]` chỉ lấy đúng 6 mã cố định này, khiến mọi phiếu mới do người dùng tạo (`DN-202611-...`) không bao giờ hiện ra ở `/citizen/my-reports`, `/citizen/reports/[id]` hay `/citizen/feedback/[code]`.
3. **Chuyển trạng thái ở Bàn tác chiến IOC (`ASSIGNED`) & Kỹ thuật viên (`RESOLVED`) chưa gọi đủ tham số Backend (`tickets.ts`):**
   - Khi Điều phối viên bấm **"Duyệt & Giao việc"** (`setStatus(id, 'ASSIGNED')`), hàm `setStatus()` trong `tickets.ts` chưa gọi chuỗi `POST /api/v1/incidents/{id}/triage` $\rightarrow$ `POST /api/v1/incidents/{id}/assign` của Backend, nên trạng thái trong PostgreSQL vẫn đứng yên ở `SUBMITTED`.
   - Khi Kỹ thuật viên bấm **"Gửi biên bản"** (`setStatus(id, 'RESOLVED')`), Backend yêu cầu đính kèm `after_image` + `after_latitude` + `after_longitude` trong `FormData`, nhưng `setStatus()` chưa truyền ảnh/tọa độ nên Backend trả `422`.
4. **Thiếu cơ chế tự động cấp Token theo vai trò khi chuyển màn hình nhanh (`backend-api.ts`):**
   - Các API của IOC, Kỹ thuật viên và Admin (`/triage`, `/assign`, `/status`, `/users`, `/audit-logs`, `/analytics/summary`) bắt buộc JWT Token đúng vai trò (`DISPATCHER`, `TECHNICIAN`, `ADMIN`). Khi bạn chuyển màn hình qua thanh điều hướng hoặc `Menu 34 màn hình` mà chưa đăng nhập lại đúng tài khoản từng vai trò, các request bị chặn `401/403`.

---

## 2. Phạm Vi & Vùng Cấm (Scope & Non-goals)

### 2.1. Phạm vi thực hiện

1. **Tự động xác thực đúng vai trò (`ensureRoleToken`) & Hỗ trợ tên đăng nhập ngắn (`backend-api.ts`, `LoginScreen.tsx`):**
   - Bổ sung `ensureRoleToken(role)` trong `frontend/src/lib/backend-api.ts` để tự động lấy JWT thật từ `/api/v1/auth/login` ứng với 4 tài khoản chuẩn trong PostgreSQL (`citizen@danang.gov.vn`, `dispatcher@danang.gov.vn`, `technician@danang.gov.vn`, `admin@danang.gov.vn`) khi thực hiện thao tác của vai trò đó.
   - Hỗ trợ đăng nhập nhanh trên `/auth/login` bằng cả tên ngắn (`admin`, `ioc`, `dispatcher`, `kt`, `kt.hung`, `citizen`) lẫn email đầy đủ.
2. **Tạo phiếu thật 100% trên `ReportScreen.tsx` & Mở khóa `citizenData.ts`:**
   - Khi bấm **"Ảnh mẫu"** trên `/report`, tự động nạp file `/field-photo.jpg` thành `File` thật để gọi `/api/v1/incidents/analyze-image` và `POST /api/v1/incidents` tạo bản ghi thật trong PostgreSQL, trả về đúng mã phiếu thật (`DN-YYYYMM-XXXX`) do PostgreSQL sinh ra.
   - Sửa `citizenData.ts` để lấy toàn bộ danh sách phiếu thật từ `getTickets()` (sắp xếp phiếu mới tạo lên đầu) thay vì khóa cứng mảng `MINE`.
3. **Khép kín vòng đời trạng thái thật trên PostgreSQL trong `tickets.ts`, `CommandCenterScreen.tsx`, `TaskResolveScreen.tsx`, `VerifyScreen.tsx`, `FeedbackScreen.tsx`:**
   - Ưu tiên dữ liệu thật từ PostgreSQL (`liveTicketsById`) lên đầu danh sách và tự động đồng bộ lại (`syncTicketsFromBackend`) mỗi khi chuyển màn hình hoặc sau mỗi thao tác cập nhật.
   - Khi IOC bấm **"Duyệt & Giao việc"** (`ASSIGNED`): gọi thật `apiTriageIncident` + `apiAssignIncident` trên Backend rồi đồng bộ lại từ DB.
   - Khi KTV bấm **"Bắt đầu xử lý"** (`IN_PROGRESS`) và **"Gửi biên bản"** (`RESOLVED`): đính kèm ảnh nghiệm thu + tọa độ GPS thật gọi `PATCH /api/v1/incidents/{id}/status` trên Backend.
   - Khi IOC bấm **"Duyệt nghiệm thu"** (`CONFIRMED`) / **"Yêu cầu làm lại"** (`REOPENED`) và khi Công dân bấm **"Xác nhận hài lòng"** (`CLOSED`) / **"Gửi khiếu nại"** (`REOPENED`): gọi thật lên Backend và cập nhật lại từ PostgreSQL.

### 2.2. Vùng cấm tuyệt đối (Non-goals)

- **KHÔNG** sửa `ui-prototype/`.
- **KHÔNG** thay đổi giao diện hay bố cục Bento V2.

---

## 3. Danh Sách File Được Phép Thay Đổi (Allowed Files)

- `frontend/src/lib/backend-api.ts`
- `frontend/src/data/tickets.ts`
- `frontend/src/screens/citizenData.ts`
- `frontend/src/screens/ReportScreen.tsx`
- `frontend/src/screens/CommandCenterScreen.tsx`
- `frontend/src/screens/TaskResolveScreen.tsx`
- `frontend/src/screens/VerifyScreen.tsx`
- `frontend/src/screens/LoginScreen.tsx`
- `docs/plans/live-e2e-data-flow-wiring.md`

---

## 4. Các Bước Thực Hiện Tuần Tự (2 Commits)

### [x] Bước 1: Nâng Cấp `backend-api.ts`, `tickets.ts`, `citizenData.ts` Để Đồng Bộ 100% Vòng Đời Thật Với PostgreSQL

- Thêm `ensureRoleToken(role)` và helper nạp ảnh mẫu `/field-photo.jpg` trong `frontend/src/lib/backend-api.ts`.
- Nâng cấp `setStatus()` và `syncTicketsFromBackend()` trong `frontend/src/data/tickets.ts`:
  - Xử lý đầy đủ `ASSIGNED` (`/triage` + `/assign`), `IN_PROGRESS`, `RESOLVED` (kèm `after_image` + GPS), `CONFIRMED`, `REOPENED`, `REJECTED`, `CLOSED` (`/feedback`) trực tiếp với FastAPI + PostgreSQL.
  - Sắp xếp phiếu thật từ PostgreSQL mới nhất lên đầu.
- Bỏ mảng khóa cứng `MINE` trong `frontend/src/screens/citizenData.ts` để mọi phiếu mới tạo đều hiển thị ngay tại `/citizen/my-reports`, `/citizen/reports/[id]`, `/citizen/feedback/[code]`.
- **Lệnh kiểm tra:** `npx tsc --noEmit` (trong `frontend/`)
- **Commit 1:** `feat(frontend): wire full 9-state incident lifecycle mutations to PostgreSQL backend`

### [x] Bước 2: Kết Nối Tạo Phiếu Thật Trên `ReportScreen` & Đồng Bộ Tức Thì Sang IOC / KTV / Nghiệm Thu

- Cập nhật `ReportScreen.tsx`: cả nút "Ảnh mẫu" lẫn tải ảnh từ máy đều tạo phiếu thật trong PostgreSQL qua `POST /api/v1/incidents`, nhận mã phiếu thật và đồng bộ tức thì sang hàng đợi IOC.
- Cập nhật `CommandCenterScreen.tsx`, `TaskResolveScreen.tsx`, `VerifyScreen.tsx`, `LoginScreen.tsx` để chờ (`await`) phản hồi từ Backend và chọn ngay phiếu mới nhất vừa chuyển sang ở từng bước.
- Kiểm thử luồng End-to-End thực tế: tạo phiếu mới $\rightarrow$ kiểm tra xuất hiện tại IOC $\rightarrow$ giao việc $\rightarrow$ KTV xử lý $\rightarrow$ IOC nghiệm thu $\rightarrow$ Công dân đánh giá đóng phiếu.
- **Lệnh kiểm tra:** `npx tsc --noEmit` (trong `frontend/`) và kiểm thử API thực tế trên `http://localhost:8000`
- **Commit 2:** `feat(frontend): enable live end-to-end report creation and cross-role synchronization`

---

## 5. Rủi Ro & Giải Pháp

- **Rủi ro thiếu phòng ban / danh mục khi giao việc (`ASSIGNED`):** Hàm `setStatus(id, 'ASSIGNED')` tự động truy vấn danh sách `departments` và `categories` thật từ `/api/v1/departments` và `/api/v1/categories` (có cache) để truyền đúng UUID `department_id` và `category_id` vào `/triage` và `/assign`.
