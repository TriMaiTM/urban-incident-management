# Kế Hoạch Big Update: Dọn Sạch Dữ Liệu Mock (Ảnh & Phiếu Thật 100%), Chuẩn Hóa Ranh Giới GIS Theo OpenStreetMap/Goong Map & Tinh Chỉnh Giao Diện (`big-update-real-data-osm-gis-and-ui-polish.md`)

> **Nhánh thực hiện:** `feat/real-data-osm-gis-and-ui-polish`  
> **Mục tiêu:** Giải quyết triệt để 4 hạng mục lớn theo phản hồi và 3 ảnh chụp màn hình thực tế của người dùng.

---

## 1. Phân Tích Chi Tiết & Giải Pháp Cho 4 Hạng Mục

### Hạng mục 1 (Hình 1 — `/citizen/my-reports`): Thẻ "Tổng phiếu của tôi" bị kéo giãn khổng lồ đẩy các thẻ khác xuống dưới
- **Nguyên nhân:** Trong `frontend/src/components/data.tsx` (dòng 76), component `MetricBentoCard` đang đặt class `h-full` (`height: 100%`). Khi đặt trong cột trái của `MyReportsScreen.tsx` (`grid-cols-[360px_1fr]`), chiều cao cột trái bị kéo giãn bằng với danh sách 8–10 thẻ phản ánh ở cột phải (`~650px`), khiến thẻ **"Tổng phiếu của tôi"** phình to chiếm trọn `450px` chiều dọc và đẩy 2 thẻ **"Đang xử lý"**, **"Hoàn tất"** cùng nút **"Báo sự cố mới"** tụt xuống đáy màn hình.
- **Giải pháp:**
  - Bỏ `h-full` ở trạng thái mặc định của `MetricBentoCard` (hoặc cố định chiều cao gọn `h-[136px]` cho thẻ thường và `h-[92px]` cho thẻ `compact`).
  - Đặt `md:self-start md:sticky md:top-6` cho cột thống kê bên trái của `MyReportsScreen.tsx` để cả 3 thẻ thống kê + nút **"Báo sự cố mới"** luôn nằm gọn gàng trong tầm mắt.

---

### Hạng mục 2: Dẹp toàn bộ dữ liệu Mock (cả Ảnh lẫn Phiếu sự cố) & Kiểm tra trạng thái DeepSeek AI
- **Trạng thái hiện tại của DeepSeek AI (`backend/app/services/deepseek_vision.py`):**
  - Qua kiểm tra trực tiếp cấu hình runtime của Backend: `DEEPSEEK_API_KEY` trong `backend/.env` hiện đang **trống (`configured: False`)**.
  - Khi không có `DEEPSEEK_API_KEY`, hàm `classify_incident_image()` trong `deepseek_vision.py` đang chạy nhánh dự phòng `_heuristic_classify()` (chỉ đọc từ khóa trong `description`). Đặc biệt, ở `ReportScreen.tsx` dòng 227–228 trước đó vẫn còn lệnh `setTimeout` gán cứng `setType('Ngập úng')` và `setLevelLabel('Cao')` sau khi quét ảnh!
- **Giải pháp nâng cấp AI Phân tích ảnh & Dẹp sạch 100% Mock (Ảnh + Phiếu):**
  1. **Nâng cấp bộ phân tích thị giác OpenCV thực tế trong `backend/app/services/deepseek_vision.py` (hoạt động ngay cả khi chưa có `DEEPSEEK_API_KEY` và sẵn sàng cho hướng tự xây AI riêng):**
     - Khi chưa cấu hình `DEEPSEEK_API_KEY`, bên cạnh việc phân tích từ khóa mô tả, bổ sung hàm **OpenCV Visual Feature Analyzer (`_analyze_image_visual_features`)** phân tích trực tiếp mảng pixel BGR/HSV và mật độ cạnh Canny của bức ảnh thật người dùng tải lên (nhận diện vùng nước ngập/phản chiếu `FLOODING`, tán lá/thân cây đổ `FALLEN_TREE`, mặt đường nhựa nứt vỡ/ổ gà `ROAD_DAMAGE`, túi rác thải đa sắc `GARBAGE`, cảnh ban đêm/đèn chiếu sáng `STREETLIGHT`), trả về đúng `category_code`, `priority`, `confidence` thật từ ảnh.
     - Trên `ReportScreen.tsx`: xóa bỏ hoàn toàn việc gán cứng `setType('Ngập úng')` / `setLevelLabel('Cao')`; hiển thị **100% kết quả thực tế** do API `/api/v1/incidents/analyze-image` trả về.
  2. **Hiển thị 100% Ảnh thật do Công dân & Kỹ thuật viên tải lên (xóa bỏ ảnh mẫu giả `<SamplePhoto />`):**
     - Bỏ nút **"Ảnh mẫu"** trên `ReportScreen.tsx` và `TaskResolveScreen.tsx` — người dùng chọn ảnh thật từ máy (hoặc chụp ảnh).
     - Lưu URL ảnh thật từ Backend (`http://localhost:8000/uploads/public/...` từ `anonymized_image_url` và `media` `BEFORE_ANONYMIZED` / `AFTER_PROOF`) vào `Ticket.imageUrl` và `Ticket.afterImageUrl` trong `frontend/src/data/tickets.ts`.
     - Truyền `previewUrl` (ảnh vừa chọn trên máy qua `URL.createObjectURL`) và `imageUrl` / `afterImageUrl` thật từ Backend vào `EvidenceUploadCard`, `CompareEvidence` (ảnh Trước & Sau ở màn Nghiệm thu IOC, Chi tiết phản ánh, Đánh giá công dân), `IncidentListItem`, và `IncidentListScreen`.
  3. **Xóa sổ mảng 15 phiếu Mock trong `frontend/src/data/tickets.ts`:**
     - Xóa hoàn toàn mảng 15 phiếu giả `specs` / `base` và hàm `submitDemoTicket()` trong `frontend/src/data/tickets.ts`. Toàn bộ ứng dụng chỉ đọc và hiển thị **100% phiếu sự cố thật từ PostgreSQL (`GET /api/v1/incidents`)**.

---

### Hạng mục 3 (Hình 2): Vì sao khi zoom kỹ lên trên Goong Map thì các điểm đa giác ranh giới Quận/Huyện chưa khớp với ranh giới gốc trên bản đồ?
- **Nguyên nhân kỹ thuật:**
  1. Bộ dữ liệu GADM 4.1 (`gadm41_VNM_2.json`) đang dùng được số hóa ở tỷ lệ bản đồ quốc gia (1:250.000), nên mỗi quận nội thành chỉ có **70–150 đỉnh** (mỗi đoạn thẳng nối 2 đỉnh dài 300m–600m). Khi nhìn toàn cảnh Đà Nẵng (zoom 10–12) thì khớp, nhưng khi zoom sâu xuống cấp khu đô thị/đường phố (zoom 15–17 như tại KĐT Lakeside Place / đường Mê Linh ở Hình 2), đoạn thẳng thô của GADM cắt chéo qua các dãy phố.
  2. Bản đồ nền **Goong Map** được render từ dữ liệu hình học của **OpenStreetMap (OSM) Việt Nam**. Qua truy vấn trực tiếp OpenStreetMap (`relation 19403874..19403879`), bộ đa giác 6 quận nội thành của OSM có tới **4.951 đỉnh** (riêng quận Liên Chiểu ở Hình 2 có **2.007 đỉnh**, bám chính xác từng mét theo đường Mê Linh, bờ Hồ Bàu Tràm, sông Cu Đê, sông Hàn, sông Cẩm Lệ).
  3. Ngoài ra, trên các màn hình bản đồ sự cố thông thường (`HomeScreen`, `ReportScreen`), việc vẽ đường viền đỏ tươi `#e5251b` đè lên mọi quận nội thành gây rối mắt khi zoom sát xuống đường phố (vì bản thân nền Goong Map đã có đường ranh giới hành chính nét đứt xám chuẩn).
- **Giải pháp:**
  1. **Nâng cấp bộ đa giác 7 Quận/Huyện (`backend/data/danang_districts_boundary.geojson` & `frontend/src/data/danang_districts_boundary.json`) sang chuẩn OpenStreetMap độ phân giải cao (`relation 19403874..19403879` — ~12.000 đỉnh tổng cộng)** và nạp lại vào PostGIS qua `seed_data.py`. Khi zoom sát ở `/admin/zones`, đường ranh giới đa giác sẽ khớp 100% với đường ranh giới vẽ trên nền Goong Map.
  2. **Làm sạch hiển thị bản đồ trên các màn hình tác nghiệp (`GoongBentoMap.tsx`):**
     - Ở màn Quản lý Phân vùng GIS (`/admin/zones`): hiển thị đầy đủ lớp tô màu và đường viền 7 Quận/Huyện độ phân giải cao để Admin bật/tắt.
     - Ở các màn bản đồ sự cố (`HomeScreen`, `ReportScreen`, `CommandCenterScreen`, v.v.): chỉ tô xám cảnh báo đối với Quận/Huyện nào đang bị Admin **Tạm dừng tiếp nhận (`on === false`)**, không vẽ đè lưới viền đỏ lên các quận đang hoạt động để bản đồ Goong Map trong trẻo, sắc nét.

---

### Hạng mục 4 (Hình 3 — `/report`): Bố cục Báo cáo hiện trường bên trái quá khít, panel ảnh bị lồng 2 lớp, 3 thẻ KPI chiếm chỗ, và cụm tab `Ảnh / AI / Ghim / Gửi` vô nghĩa
- **Nguyên nhân:**
  1. **Panel ảnh bị lồng 2 lớp (`nested panel`):** Trong `ReportScreen.tsx`, `photoCard` đã bọc `<section className="rounded-card bg-card p-1.5 shadow-card">`, bên trong `EvidenceUploadCard` (`data.tsx`) lại bọc tiếp `<div className="min-h-[220px] rounded-card bg-surface p-3">` rồi mới tới khung ảnh `rounded-tile`, tạo thành 3 lớp khung lồng nhau và `min-h-[220px]` ép cột trái tràn chiều dọc làm xuất hiện thanh cuộn dọc sát mép bản đồ.
  2. **3 thẻ KPI (`Tiếp nhận / Đang xử lý / Đã hoàn tất`) trên Header `/report`:** Chiếm mảng diện tích lớn (`600px x 100px`) đẩy toàn bộ phần nội dung chính xuống thấp, trong khi các thẻ này đã có ở Trang chủ (`/`).
  3. **Cụm nút `Ảnh | AI | Ghim | Gửi` trên góc phải bản đồ:** Là `PillTab` tĩnh không có tác dụng tương tác, gây chật chội phần顶 của bản đồ.
- **Giải pháp:**
  1. **Làm phẳng `EvidenceUploadCard` (1 lớp thẻ duy nhất):** Xóa lớp `<section>` bọc ngoài dư thừa, bỏ `min-h-[220px]` cứng để khung tải ảnh hiển thị 1 lớp card trắng tinh gọn, khi chọn ảnh thật sẽ hiển thị ảnh tràn viền sắc nét kèm nút **"Đổi ảnh"** gọn ở góc.
  2. **Bỏ 3 thẻ KPI to trên Header `/report`** và **bỏ cụm `PillTab` (`Ảnh / AI / Ghim / Gửi`)** trên bản đồ.
  3. Nhờ giải phóng được `~95px` chiều cao từ Header, cột trái (Khung Ảnh + Thẻ AI gợi ý + Form Mô tả & SĐT + Nút Gửi) và Bản đồ Goong Map bên phải sẽ thoáng đãng, khoảng cách `gap-4` rộng rãi, không còn thanh cuộn phụ bên trong cột trái và vừa khít 1 màn hình Desktop.

---

## 2. Danh Sách File Được Phép Thay Đổi (Allowed Files)

- `backend/data/danang_districts_boundary.geojson`
- `frontend/src/data/danang_districts_boundary.json`
- `backend/app/services/deepseek_vision.py`
- `frontend/src/data/tickets.ts`
- `frontend/src/components/data.tsx`
- `frontend/src/components/GoongBentoMap.tsx`
- `frontend/src/screens/MyReportsScreen.tsx`
- `frontend/src/screens/ReportScreen.tsx`
- `frontend/src/screens/TaskResolveScreen.tsx`
- `frontend/src/screens/CommandCenterScreen.tsx`
- `frontend/src/screens/VerifyScreen.tsx`
- `frontend/src/screens/TrackingScreen.tsx`
- `frontend/src/screens/ReportDetailScreen.tsx`
- `frontend/src/screens/FeedbackScreen.tsx`
- `frontend/src/screens/IncidentListScreen.tsx`
- `docs/plans/big-update-real-data-osm-gis-and-ui-polish.md`

---

## 3. Các Bước Thực Hiện Tuần Tự (3 Commits)

### [x] Bước 1: Cập Nhật Đa Giác GIS 7 Quận/Huyện Chuẩn OpenStreetMap Độ Phân Giải Cao & Tinh Gọn Lớp Bản Đồ Goong Map (Hạng mục 3)
- Tải và chuẩn hóa bộ đa giác 7 Quận/Huyện Đà Nẵng từ OpenStreetMap (`relation 19403874..19403879` kết hợp biên ngoài 8.007 đỉnh cho Hòa Vang) vào `backend/data/danang_districts_boundary.geojson` và `frontend/src/data/danang_districts_boundary.json`.
- Chạy `py backend/scripts/seed_data.py` để cập nhật vào PostGIS.
- Cập nhật `GoongBentoMap.tsx`: chỉ vẽ lớp đa giác đỏ đầy đủ trên màn Quản lý Phân vùng GIS (`/admin/zones`), còn trên các màn bản đồ sự cố chỉ tô cảnh báo vùng bị tạm dừng để không đè lên ranh giới gốc của Goong Map.
- **Lệnh kiểm tra:** `py backend/scripts/seed_data.py && py -m pytest backend/tests/test_zones.py`
- **Commit 1:** `feat(gis): upgrade 7 district boundaries to high-resolution OpenStreetMap geometry matching Goong Map`

### [x] Bước 2: Xóa Toàn Bộ Dữ Liệu & Ảnh Mock, Hiển Thị 100% Ảnh/Phiếu Thật & Bổ Sung Phân Tích Thị Giác OpenCV (Hạng mục 2)
- Trong `backend/app/services/deepseek_vision.py`: bổ sung bộ phân tích đặc trưng hình ảnh OpenCV (`_analyze_image_visual_features`) kết hợp mô tả văn bản khi `DEEPSEEK_API_KEY` trống.
- Trong `frontend/src/data/tickets.ts`: xóa hoàn toàn 15 phiếu mock `specs`/`base` và `submitDemoTicket()`; ánh xạ `imageUrl` (`BEFORE_ANONYMIZED`) và `afterImageUrl` (`AFTER_PROOF`) thật từ Backend (`http://localhost:8000/uploads/public/...`).
- Cập nhật `EvidenceUploadCard`, `CompareEvidence`, `IncidentListItem`, `IncidentListScreen`, `TrackingScreen`, `ReportDetailScreen`, `CommandCenterScreen`, `TaskResolveScreen`, `VerifyScreen`, `FeedbackScreen` để hiển thị ảnh thật do người dùng tải lên và xóa nút "Ảnh mẫu".
- **Lệnh kiểm tra:** `npx tsc --noEmit` (trong `frontend/`) và `py -m pytest backend/tests/test_ai_vision.py`
- **Commit 2:** `feat(full-stack): remove all mock tickets and sample photos in favor of real uploaded images and OpenCV visual triage`

### [x] Bước 3: Sửa Thẻ Thống Kê Khổng Lồ Ở `/citizen/my-reports` & Thiết Kế Lại Bố Cục `/report` Thoáng Đãng (Hạng mục 1 & 4)
- Trong `frontend/src/components/data.tsx` & `frontend/src/screens/MyReportsScreen.tsx`: bỏ `h-full` gây phình thẻ `MetricBentoCard`, cố định cột trái với `md:self-start` để thẻ **"Tổng phiếu của tôi"** gọn chuẩn thiết kế và không đẩy các thẻ dưới.
- Trong `frontend/src/screens/ReportScreen.tsx` & `EvidenceUploadCard`: bỏ lớp panel lồng nhau, bỏ 3 thẻ KPI chiếm chỗ trên header, bỏ thanh `PillTab` (`Ảnh / AI / Ghim / Gửi`) vô nghĩa trên bản đồ, giúp cột trái và bản đồ thoáng đãng, không còn thanh cuộn phụ.
- **Lệnh kiểm tra:** `npx tsc --noEmit` (trong `frontend/`)
- **Commit 3:** `fix(frontend): fix oversized metric card on MyReportsScreen and declutter ReportScreen layout`
