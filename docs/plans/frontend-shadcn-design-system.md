# Kế hoạch Triển khai: Nền tảng Frontend & Design System @shadcn/ui (Đà Nẵng GovTech)

> **Nhánh Git:** `feat/frontend-shadcn-design-system`  
> **Tài liệu tham chiếu:** `docs/spec.md`, `.agents/rules/frontend-nextjs-maplibre.md`, Figma `@shadcn/ui` `Components (light)` (node-id: `75-45`)  
> **Mục tiêu:** Khởi tạo môi trường Frontend, thiết lập nền tảng Design System `@shadcn/ui` (phong cách New York, Slate palette, Primary Blue `#1051A6`), cài đặt bộ UI primitives chính chủ và chuẩn hóa quy chuẩn Da Nang GovTech / IOC.

---

## 1. Mục tiêu & Phạm vi (Goal & Scope)

### Mục tiêu chính
- Khởi tạo `node_modules` và môi trường Next.js 16 + Tailwind CSS v4.
- Khởi tạo `@shadcn/ui` chính chủ (`components.json`, `@/lib/utils.ts`, `@/components/ui/*`).
- Thiết lập bảng màu hành chính Da Nang GovTech: Primary Blue (`#1051A6`), Slate surface (`bg-slate-50`, `bg-white`), Semantic status badges (`SUBMITTED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `EMERGENCY`).
- Cài đặt bộ 15 primitives thiết yếu: `button`, `badge`, `card`, `input`, `textarea`, `label`, `dialog`, `select`, `tabs`, `table`, `alert`, `sonner`, `dropdown-menu`, `skeleton`, `avatar`.
- Xây dựng trang Component Gallery / Verification tại `frontend/src/app/page.tsx` để kiểm chứng toàn bộ UI components, font typography (`font-mono tabular-nums`), loại bỏ 100% "AI Slop".

### Phạm vi ảnh hưởng (Allowed Files)
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/components.json`
- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/lib/utils.ts`
- `frontend/src/components/ui/*`
- `docs/plans/frontend-shadcn-design-system.md`

### Ngoài phạm vi (Strict Non-goals)
- **Tuyệt đối KHÔNG chạm vào Backend:** `backend/` (FastAPI, Alembic migrations, database models, API routers, tests).
- **Tuyệt đối KHÔNG chạm vào MapLibre GL JS:** Phần bản đồ định vị Đà Nẵng, WGS84 geofencing và layer sự cố sẽ được thực hiện độc lập ở Module tiếp theo (`feat/citizen-incident-reporting-ui`).
- **Không tự chế lại primitives:** Tuyệt đối không viết nút `<button>` hay `<select>` HTML chay khi đã có `@/components/ui/*`.

---

## 2. Tiêu chuẩn Thiết kế & Chống "AI Slop" (.agents/rules/frontend-nextjs-maplibre.md)

1. **Cấm tuyệt đối "AI Slop":**
   - Không gradient màu mè: Cấm `bg-gradient-to-*`, `from-indigo-*`, `via-purple-*`, không shadow màu.
   - Không bo tròn quá đà: Cấm `rounded-2xl`, `rounded-3xl` trên Card/Panel. Chỉ dùng `rounded-md` / `rounded-lg`.
   - Viền sắc nét: Đường viền hành chính `border border-slate-200`.
   - Không marketing fluff: Không banner chào mời, không emoji trang trí lộn xộn trong tiêu đề.
2. **Quy chuẩn IOC Đà Nẵng GovTech:**
   - **Màu chủ đạo (Primary Blue):** `#1051A6` (Xanh hành chính công Đà Nẵng).
   - **Semantic Status Badges:**
     - `SUBMITTED`, `TRIAGED`: `bg-slate-100 text-slate-700` / `bg-blue-50 text-blue-700`
     - `ASSIGNED`, `IN_PROGRESS`: `bg-amber-50 text-amber-700 border-amber-200`
     - `RESOLVED`, `CONFIRMED`, `CLOSED`: `bg-emerald-50 text-emerald-700 border-emerald-200`
     - `EMERGENCY`, `REJECTED`, SLA Breach: `bg-rose-50 text-rose-700 border-rose-200`
   - **Data Typography:** Toàn bộ ticket code (`DN-202610-XXXX`), tọa độ GPS WGS84, SLA timer đếm ngược, tỷ lệ AI confidence (%) bắt buộc phải gắn class `font-mono tabular-nums`.

---

## 3. Các bước triển khai chi tiết (Ordered Small Steps)

### [x] Bước 1: Khởi tạo Dependencies & Cấu hình shadcn/ui CLI
- **Trạng thái:** HOÀN THÀNH (Reviewer: STATUS: PASS)
- **Mục tiêu:** Cài đặt các gói cơ sở cho Next.js 16 + React 19 và khởi tạo file `components.json`.
- **Thực hiện:**
  - Chạy `npm install` bên trong `frontend/`.
  - Cài đặt `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`.
  - Tạo cấu hình `components.json` chuẩn `@shadcn/ui` cho Next.js App Router (style: `new-york`, baseColor: `slate`, cssVariables: `true`).
  - Tạo file `frontend/src/lib/utils.ts` chứa hàm `cn(...)`.
- **Lệnh kiểm tra cơ học:**
  - `npx tsc --noEmit` (Exit code 0)
  - `npm run lint` (Exit code 0)

### Bước 2: Thiết lập Theme CSS Variables & Typography tại `globals.css`
- **Mục tiêu:** Cập nhật `frontend/src/app/globals.css` với bảng mã màu GovTech Đà Nẵng và tương thích Tailwind CSS v4.
- **Thực hiện:**
  - Định nghĩa biến CSS `:root` và `.dark`:
    - `--primary: #1051A6` (Primary Blue)
    - `--primary-foreground: #FFFFFF`
    - `--background: #FFFFFF` / Dark `#090D16`
    - `--card: #FFFFFF` / Dark `#0F172A`
    - `--border: #E2E8F0` (`slate-200`)
    - `--radius: 0.5rem` (`rounded-md`)
  - Bổ sung các biến semantic cho status badges: `--status-submitted`, `--status-progress`, `--status-resolved`, `--status-emergency`.
  - Cập nhật `frontend/src/app/layout.tsx` với font Inter/Sans và JetBrains Mono/Geist Mono cho `tabular-nums`.
- **Lệnh kiểm tra cơ học:**
  - `npx tsc --noEmit`
  - `npm run build`

### Bước 3: Cài đặt Bộ Primitives `@shadcn/ui` Chính Chủ
- **Mục tiêu:** Cài đặt 15 UI primitives thiết yếu bằng CLI `shadcn` vào `frontend/src/components/ui/`.
- **Thực hiện:**
  - Cài đặt các primitives:
    - Cơ bản: `button`, `badge`, `card`, `label`
    - Nhập liệu: `input`, `textarea`, `select`
    - Tương tác / Phản hồi: `dialog`, `tabs`, `table`, `alert`, `sonner` (Toast), `dropdown-menu`
    - Hiển thị / Trạng thái: `skeleton`, `avatar`
  - Tinh chỉnh style các component đảm bảo tuân thủ Rule 5: bo góc `rounded-md`, border crisp `border-slate-200`, không shadow màu.
- **Lệnh kiểm tra cơ học:**
  - `npx tsc --noEmit`
  - `npm run lint`

### Bước 4: Xây dựng Trang Trưng bày & Kiểm định Thành phần (Component Showcase)
- **Mục tiêu:** Tạo trang kiểm định trực quan tại `frontend/src/app/page.tsx` minh họa các thành phần giao diện thực tế của Hệ thống Quản lý Sự cố Đô thị Đà Nẵng.
- **Nội dung hiển thị:**
  - Header hành chính IOC Đà Nẵng: Logo, Tên hệ thống "Nền tảng Tiếp nhận & Điều phối Sự cố Đô thị Lõi Đà Nẵng", Badge "Thử nghiệm Đợt 1".
  - Bảng mẫu Incident Status Badges (SUBMITTED, ASSIGNED, IN_PROGRESS, RESOLVED, EMERGENCY) kèm `font-mono tabular-nums`.
  - Thẻ tóm tắt sự cố mẫu (Incident Card): Mã phiếu `DN-202610-A1B2`, danh mục "Cây xanh ngã đổ", địa chỉ "Số 123 đường Bạch Đằng, Hải Châu", SLA timer đếm ngược, badge trạng thái.
  - Form phản ánh mẫu: Input địa chỉ, Textarea mô tả, Button "Gửi phản ánh" (Primary Blue `#1051A6`), Nút "Hủy".
  - Dialog xác nhận & Toast thông báo (Sonner).
- **Lệnh kiểm tra cơ học:**
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`

### Bước 5: Audit Độc lập qua Reviewer Subagent & Bàn giao
- **Mục tiêu:** Spawn subagent `reviewer` để audit toàn bộ diff so với `AGENTS.md` và `.agents/rules/frontend-nextjs-maplibre.md`.
- **Tiêu chí đánh giá:**
  - Strict TypeScript (0 lỗi `any`, 0 type warnings).
  - Không tồn tại bất kỳ "AI Slop" pattern nào (gradient, shadow màu, bo tròn quá mức).
  - Sử dụng 100% `@/components/ui/*` primitives chính chủ.
  - `npm run build` hoàn tất tạo bundle sạch sẽ.

---

## 4. Rủi ro & Giải pháp Phòng ngừa (Risks & Mitigations)

| Rủi ro Kỹ thuật | Giải pháp Phòng ngừa |
| :--- | :--- |
| **Tailwind CSS v4 compatibility:** `@shadcn/ui` phiên bản mới hỗ trợ Tailwind v4 nhưng cấu hình `@theme` có thể khác v3 (`tailwind.config.ts`). | Sử dụng trực tiếp cấu hình CSS variables trong `globals.css` theo chuẩn Tailwind v4 `@theme inline` hoặc `@import "tailwindcss";`. |
| **React 19 peer dependencies:** Một số thư viện Radix UI có thể cảnh báo peer dependency với React 19. | Sử dụng các gói chính chủ mới nhất từ `@shadcn/ui` đã được kiểm chứng tương thích React 19, hoặc cấu hình `package.json` overrides nếu cần. |
| **Token overflow khi dùng Figma MCP:** Người dùng đưa link cả trang lớn `Components (light)`. | Đã áp dụng Rule 4 trong rule frontend: Không gọi đệ quy toàn trang, chỉ lấy danh sách top-level metadata `depth=1` và cài đặt primitives trực tiếp qua `npx shadcn@latest add`. |

---

## 5. Câu hỏi mở cho Người dùng (Open Questions)

- Hiện tại hệ thống sử dụng bộ icon chuẩn `lucide-react` đi kèm `@shadcn/ui`. Bạn có muốn bổ sung thêm icon pack nào khác không, hay giữ nguyên `lucide-react` để đảm bảo bundle nhẹ và đồng nhất?
