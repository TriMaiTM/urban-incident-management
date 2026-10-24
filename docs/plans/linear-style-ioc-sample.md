# Kế hoạch Xây dựng Trang Mẫu Bàn Điều phối IOC Phong cách Linear.app

> **Nhánh Git:** `feat/linear-style-sample-page`  
> **Tài liệu tham chiếu:** `AGENTS.md`, `docs/spec.md`, `RULE[user_global]`  
> **Mục tiêu:** Xây dựng **01 trang mẫu độc lập** tại đường dẫn `frontend/src/app/ioc-sample/page.tsx` (truy cập tại `http://localhost:3000/ioc-sample`) tái hiện trọn vẹn ngôn ngữ thiết kế của **Linear.app** dành cho Trung tâm Giám sát Điều hành Đô thị Thông minh (IOC Đà Nẵng).

---

## 1. Mục tiêu & Định hình Phong cách (Visual Philosophy)

### A. Triết lý Thiết kế Linear.app áp dụng cho Đô thị Thông minh
- **Nền Dark Mode chuyên nghiệp:** Sử dụng tone màu đen sâu (`#08090a`), các panel điều khiển xám tối (`#0d0e11`, `#141518`) và đường viền siêu mỏng 1px (`border-white/10` hoặc `#23252a`).
- **Thông tin mật độ cao (High Information Density):** Loại bỏ toàn bộ viền hộp lồng ghép thừa thãi ("AI Slop"); dữ liệu sắp xếp gãy gọn theo hàng, chữ sắc nét, căn lề thẳng hàng.
- **Biểu tượng & Trạng thái chuẩn Linear:**
  - Cột độ ưu tiên với biểu tượng sóng tín hiệu đặc trưng (`Urgent`: cam đỏ nhấp nháy, `High`: vàng hổ phách, `Medium`: xanh, `Low`: xám).
  - Mã phiếu tra cứu `DN-202610-042` hiển thị `font-mono tabular-nums`.
  - Bộ đếm thời gian cam kết SLA (ví dụ: `2h 15m còn lại` hoặc cảnh báo `Trễ hạn`).
- **Thẻ DeepSeek Vision AI phong cách Terminal:**
  - Hiển thị kết quả suy luận AI với thanh đo độ tin cậy (`confidence 94%`), tóm tắt hiện trường và cảnh báo nguy cơ an toàn giao thông.
- **Tương tác mượt mà (Micro-interactions):**
  - Thanh tìm kiếm Command Bar (`⌘K` / `Ctrl + K`).
  - Chuyển đổi chọn sự cố tức thì với bảng chi tiết (Detail Inspector Pane).
  - Tích hợp khung bản đồ số Goong Map / MapLibre góc nhìn đêm (Dark GIS vector).

---

## 2. Phạm vi Tập tin Được phép Thay đổi (Allowed Files)

- `frontend/src/app/ioc-sample/page.tsx` (Tạo mới - trang mẫu độc lập 100%)
- `docs/plans/linear-style-ioc-sample.md`

### Ngoài phạm vi nghiêm ngặt (Strict Non-goals)
- Không chỉnh sửa hay làm xáo trộn trang Công dân hiện tại (`frontend/src/app/page.tsx`).
- Không chỉnh sửa backend (`backend/app/`).
- Không cài đặt thêm thư viện ngoài (sử dụng Tailwind CSS, Lucide icons, và components Radix/shadcn hiện có).

---

## 3. Các bước triển khai tuần tự (Ordered Small Steps)

### Bước 1: Xây dựng Component & Dữ liệu Mô phỏng Chuẩn Linear trong `ioc-sample/page.tsx`
- [x] Tạo toàn bộ cấu trúc giao diện trang mẫu bao gồm:
  1. **Top Navigation Bar:** Logo IOC Đà Nẵng, bộ chuyển workspace, thanh Command Bar `Ctrl + K` (có hotkey listener), avatar cán bộ trực ban, bộ đếm sự cố đang mở.
  2. **Filter & View Toolbar:** Bộ lọc nhanh theo mức độ khẩn cấp (Urgent, High), quận/huyện (Hải Châu, Sơn Trà...), danh mục (Mặt đường, Ngập úng, Cây xanh...) và số lượng sự cố hiển thị.
  3. **Linear Issue Stream (Cột trái):** Danh sách sự cố thời gian thực, hover effect tinh tế, badge SLA countdown, avatar đơn vị phụ trách.
  4. **Mission Inspector (Cột phải):**
     - Chi tiết sự cố được chọn.
     - DeepSeek Vision AI Triage Card (hiển thị phân tích đa phương thức của AI và thanh đo confidence).
     - Bộ ảnh hiện trường tuân thủ NĐ 13 (OpenCV làm mờ khuôn mặt/biển số xe).
     - Khung radar trắc địa WGS84 với bán kính khử trùng lặp 50m.
     - Cụm nút tác vụ nhanh: "Phê duyệt AI (1-Click)" với phản hồi tức thì, "Phân công".
- **Lệnh kiểm tra cơ học:**
  - `npx tsc --noEmit`: Đạt 100% (Exit code 0).
  - `npm run lint`: Đạt 0 errors, 0 warnings (Exit code 0).

### Bước 2: Thẩm định Độc lập & Nghiệm thu
- [x] Đã chạy `npm run build`: Pre-rendered `/ioc-sample` thành công 100%.
- [x] Reviewer Subagent thẩm định: `STATUS: PASS`.

---

## 4. Rủi ro & Giải pháp (Risks & Mitigation)
- **Rủi ro:** MapLibre canvas có thể bị kích thước không chuẩn trong container ẩn.
- **Giải pháp:** Sử dụng hook `resize` hoặc render bản đồ tĩnh vector tối màu tinh tế kết hợp Marker định vị để đảm bảo độ mượt 60fps trên mọi thiết bị.

---

## 5. Hướng dẫn xem trang mẫu sau khi hoàn thành
Sau khi duyệt và triển khai, bạn chỉ cần mở:
👉 **`http://localhost:3000/ioc-sample`** để trải nghiệm trực tiếp trên trình duyệt.
