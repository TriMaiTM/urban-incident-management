# Kế hoạch: Chuẩn hóa Giao diện theo Figma @shadcn/ui Kit & Khắc phục Lỗi Kết nối Backend

> **Nhánh Git:** `feat/citizen-incident-reporting-ui`  
> **Tài liệu tham chiếu:** Figma Node `75:45` [Components (light)](https://www.figma.com/design/L1X2g1JwTNxfW1np6Ot6kM/-shadcn-ui---Full-Design-System--Updated-25-Jul-2024---Community-?node-id=75-45&m=dev), `.agents/rules/frontend-nextjs-maplibre.md`, [docs/spec.md](file:///D:/HK10/DATN/docs/plans/citizen-incident-reporting-ui.md)  
> **Mục tiêu:** 
> 1. Xử lý triệt để lỗi `TypeError: Failed to fetch` tại `src/lib/api.ts` bằng cơ chế Graceful Error Handling & Fallback khi Backend/Docker chưa bật.
> 2. Loại bỏ hoàn toàn phong cách bố cục thô cứng ("AI Slop" lồng ghép nhiều hộp xám con, label viết hoa toàn bộ, viền xơ cứng); tái thiết kế toàn bộ Form và Layout theo **chuẩn Figma @shadcn/ui Full Design System (Node 75:45)**:
>    - **Card & Shell:** Card trắng nguyên khối (`bg-card rounded-lg border border-border shadow-xs p-6 space-y-6`), phân cấp CardHeader/Title/Description thanh thoát.
>    - **Typography & Labels:** Sentence case chuẩn mực (`text-sm font-medium text-foreground`), bỏ toàn bộ nhãn in hoa gay gắt (`VỊ TRÍ HIỆN TRƯỜNG *`).
>    - **Primitives:** Button `rounded-md h-9 text-sm font-medium`, Input/Select `rounded-md h-9 border-input bg-background shadow-xs focus-visible:ring-1 focus-visible:ring-ring`, Badge `rounded-full px-2.5 py-0.5 text-xs font-medium` (chuẩn Figma radius: 9999), Tabs `bg-muted p-1 rounded-md`.
>    - **Layout:** Bố cục hành chính hiện đại: Header mỏng tinh gọn (`h-14 border-b border-border bg-background/95`), Cột trái Card tiếp nhận phản ánh chuẩn Figma (cuộn mượt mà), Cột phải Bản đồ MapLibre GL tích hợp viền bo và đổ bóng đồng bộ.

---

## 1. Đối chiếu Chuẩn Thiết kế Figma (Figma Node `75:45` Audit)

| Thành phần | Figma Node `75:45` Chuẩn | Lỗi "AI Slop" Cũ Cần Xóa Bỏ | Giải pháp Khắc phục |
| :--- | :--- | :--- | :--- |
| **Card / Shell** | `rounded-lg (8px)`, `border #E4E4E7`, `shadow-xs`, padding `24px` (`p-6`) | Lồng 6-7 `section` xám con (`bg-slate-50`, `p-3.5`), viền phân mảnh | Dùng 1 `Card` lớn nguyên khối đồng nhất, phân khoảng cách `space-y-5` |
| **Labels** | `text-sm font-medium text-foreground`, Sentence case | In hoa gắt (`VỊ TRÍ HIỆN TRƯỜNG *`, `ẢNH CHỤP HIỆN TRƯỜNG *`) | Đổi sang nhãn tự nhiên: `Vị trí hiện trường`, `Mô tả sự cố`, `Ảnh đính kèm` |
| **Badge** | `rounded-full (radius 9999)`, `px-2.5 py-0.5`, viền mỏng | `rounded-md (radius 6)`, màu xám đậm | Đổi toàn bộ Badge sang `rounded-full` chuẩn Figma |
| **Inputs / Select** | `h-9 rounded-md border-input bg-background shadow-xs` | Ô input thô, nút GPS kẹp lệch hàng | Chuẩn hóa chiều cao `h-9`, căn chỉnh `inline-flex` tinh tế |
| **Alert / Notices** | `rounded-lg border p-4 bg-muted/40` với icon 16px thanh lịch | Hộp cảnh báo màu lòe loẹt, chữ dày cộm | Dùng `Alert` chuẩn shadcn với icon `AlertCircle` / `Info` |

---

## 2. Phạm vi Tập tin Cho phép Thay đổi (Allowed Files)

- `frontend/src/lib/api.ts` (Thêm cơ chế Graceful Fallback & Offline Demo Data cho zones và categories)
- `frontend/src/components/citizen/report-form.tsx` (Tái thiết kế toàn bộ Form theo chuẩn Figma Card & Field spacing)
- `frontend/src/app/page.tsx` (Tái cấu trúc bố cục Split-Screen chuyên nghiệp, đồng bộ design tokens Figma)
- `docs/plans/figma-shadcn-citizen-ui.md`

### Ngoài phạm vi nghiêm ngặt (Strict Non-goals)
- Không chỉnh sửa backend (`backend/`).
- Không phá vỡ các hợp đồng API (`/zones/active`, `/incidents/nearby`, `/incidents/`, v.v.).

---

## 3. Các bước Triển khai Tuần tự (Ordered Small Steps)

### [x] Bước 1: Xử lý Triệt để Lỗi Fetch & Xây dựng Cơ chế Offline Fallback trong `api.ts`
- **Mục tiêu:** Đảm bảo `getActiveZones()`, `getCategories()`, `validateLocation()` luôn an toàn khi Backend offline.
- **Thực hiện:**
  - Nhúng ranh giới vùng lõi Đà Nẵng mẫu (`FALLBACK_DANANG_ZONES`) và danh mục mẫu (`FALLBACK_CATEGORIES`).
  - Bọc `try / catch` trong các hàm gọi API: nếu kết nối thất bại (`TypeError: Failed to fetch` do backend tắt), tự động trả về fallback data mà không bung console error hoặc crash Next.js Dev Overlay.
  - Cung cấp hàm kiểm tra nhanh `isInsideDanangCore(lat, lon)` chạy trực tiếp trên client khi offline.
- **Kiểm tra cơ học:**
  - `npx tsc --noEmit`
  - `npm run lint`

### Bước 2: Tái thiết kế Form Báo cáo theo Chuẩn Figma `@shadcn/ui` (`report-form.tsx`)
- **Mục tiêu:** Xóa bỏ hoàn toàn các hộp xám con lồng ghép; áp dụng thiết kế Card nguyên khối, labels tự nhiên, inputs/badges chuẩn Figma.
- **Thực hiện:**
  - Định dạng lại Form bên trong một `Card` chuẩn shadcn:
    - `CardHeader`: `CardTitle` ("Gửi phản ánh sự cố đô thị"), `CardDescription` ("Hệ thống tiếp nhận thông tin hiện trường tại khu vực đô thị lõi TP. Đà Nẵng").
    - `CardContent`: Cấu trúc form thoáng đãng (`space-y-4`):
      - Nhóm Vị trí: Label tự nhiên kèm nút "Định vị GPS" thanh thoát, hiển thị tọa độ trên chip `font-mono tabular-nums`, badge trạng thái vùng `rounded-full`.
      - Nhóm Thông tin: Tiêu đề, Danh mục (`Select`), Mô tả chi tiết (`Textarea`), Địa chỉ hiện trường (`Input`).
      - Nhóm Đính kèm: Khung tải ảnh tối giản `border-dashed border-border rounded-lg p-4 text-center`, thumbnail preview có nút xóa gọn gàng.
      - Thông báo NĐ 13/2023: Thiết kế dạng caption nhỏ nhẹ mờ (`text-xs text-muted-foreground flex items-center gap-1.5`).
    - `CardFooter`: Button "Gửi phản ánh" kích thước chuẩn `h-10 w-full font-medium`.
- **Kiểm tra cơ học:**
  - `npx tsc --noEmit`
  - `npm run lint`

### Bước 3: Đồng bộ Giao diện Trang Chính & Bản đồ (`page.tsx`)
- **Mục tiêu:** Hoàn thiện bố cục trang chính hài hòa, chuyên nghiệp, hiển thị mượt mà cả khi Online lẫn Offline.
- **Thực hiện:**
  - Header `h-14 border-b border-border bg-background/95 backdrop-blur-sm px-6 flex items-center justify-between`:
    - Logo biểu tượng Tòa thị chính/Đô thị, Tên hệ thống rõ ràng, Badge trạng thái mạng ("Kết nối máy chủ" / "Chế độ mô phỏng ngoại tuyến" `rounded-full`).
  - Split View:
    - Cột trái (`w-[460px] lg:w-[500px] shrink-0 p-4 overflow-y-auto`): Chứa Card Form chuẩn Figma.
    - Cột phải: Bản đồ MapLibre GL toàn cảnh, tích hợp điều hướng và marker sự cố lân cận.
  - Modal tiếp nhận thành công: `Dialog` chuẩn shadcn với mã tra cứu `font-mono tabular-nums` và nút sao chép.
- **Kiểm tra cơ học:**
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`

### Bước 4: Kiểm định Độc lập & Nghiệm thu (Reviewer Subagent)
- **Mục tiêu:** Đảm bảo không còn lỗi console nào khi mở `http://localhost:3000`, UI đạt chuẩn Figma.
- **Kiểm tra:**
  - Chạy `npx tsc --noEmit`, `npm run lint`, `npm run build`.
  - Điều phối subagent `reviewer` audit toàn bộ mã nguồn.

---

## 4. Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
| :--- | :--- |
| Backend bật lại khi đang ở Offline Fallback | Viết hàm fetch thử ngầm, nếu backend online sẽ ưu tiên đồng bộ dữ liệu thật tự động. |
| Cache của Next.js lưu lỗi fetch cũ | Dọn dẹp Next.js cache và kiểm tra kỹ phản hồi trả về. |
