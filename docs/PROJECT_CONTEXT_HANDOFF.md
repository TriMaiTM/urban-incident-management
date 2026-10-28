# TÀI LIỆU TỔNG HỢP TOÀN DIỆN DỰ ÁN & BÀN GIAO BỐI CẢNH (PROJECT CONTEXT HANDOFF)

**Dự án:** Nền tảng tiếp nhận, phân loại và quản lý sự cố hạ tầng đô thị tích hợp trí tuệ nhân tạo tại thành phố Đà Nẵng  
**Mã đề tài:** `DATN-HK10-URBAN-INCIDENT`  
**Sinh viên thực hiện:** Đoàn Văn Trí - Bùi Quốc Tuấn  
**Thời gian cập nhật:** 28/10/2026  
**Mục đích tài liệu:** Lưu giữ toàn vẹn bối cảnh kỹ thuật, kiến trúc, mã nguồn, cơ sở dữ liệu, bộ quy tắc bất biến, chi tiết các màn hình Figma đã thiết kế và lộ trình triển khai tiếp theo (Màn hình 4 Nghiệm thu sự cố) để sẵn sàng bắt đầu phiên làm việc mới mà không bị gián đoạn context.

---

## 1. TỔNG QUAN ĐỀ TÀI & PHẠM VI ỨNG DỤNG

### 1.1. Mục tiêu cốt lõi
Xây dựng nền tảng GovTech thông minh phục vụ tiếp nhận, phân loại, cảnh báo trùng lặp và điều phối xử lý sự cố hạ tầng đô thị (sụt lún, ngập úng, cây đổ, rác thải, hỏng đèn chiếu sáng...) tại Thành phố Đà Nẵng, tích hợp trí tuệ nhân tạo (AI Vision) và hệ thống thông tin địa lý chính xác cao (Spatial GIS).

### 1.2. Phạm vi địa lý & Ranh giới trắc địa
- **Khu vực áp dụng:** Vùng Đô thị Lõi TP. Đà Nẵng (gồm 6 quận nội thành: Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Cẩm Lệ, Liên Chiểu và huyện Hòa Vang).
- **Ranh giới GIS Đô thị Lõi:** Đa giác khép kín chính xác **8.007 đỉnh trắc địa** (chu vi 236,4 km, diện tích 1.002 km²), khoảng cách trung bình giữa các đỉnh là 29,5m, bám sát địa giới tự nhiên sông Hàn, đèo Hải Vân, bờ biển và các tuyến đường vành đai.
- **Hệ tọa độ chuẩn:** Toàn bộ dữ liệu không gian lưu trữ theo chuẩn WGS84 (`SRID 4326`). PostGIS sử dụng thứ tự `Point(longitude, latitude)` trong khi bản đồ Goong Maps và UI dùng `(lat, lon)`. Tọa độ hợp lệ của Đà Nẵng nằm trong dải: `107.8 <= lon <= 108.4`, `15.9 <= lat <= 16.3`.

---

## 2. NGĂN XẾP CÔNG NGHỆ (TECH STACK)

- **Backend:** Python 3.11+, FastAPI (RESTful API & Webhook), Pydantic v2 (Strict validation), SQLAlchemy 2.0 (Asyncio + asyncpg, `expire_on_commit=False`), GeoAlchemy2, OpenCV (Haar Cascades + Gaussian Blur).
- **Frontend:** Next.js (App Router), React 19, TypeScript (Strict mode, no `any`), Tailwind CSS v4, shadcn/ui.
- **Cơ sở dữ liệu:** PostgreSQL 16 + PostGIS 3.4 + pgvector (`postgis/postgis:16-3.4-alpine`).
- **Dịch vụ tích hợp bên ngoài:**
  - **DeepSeek Multimodal/Vision API:** Phân tích ảnh hiện trường, phân loại tự động loại sự cố, mức độ nghiêm trọng và đề xuất đơn vị xử lý theo cơ chế Structured JSON Output.
  - **Goong Maps API:** Bản đồ số Việt Nam (Vector Tiles, Geocoding, Reverse Geocoding, hiển thị 3D nhà cao tầng và mạng lưới kiệt hẻm).
  - **Facebook Messenger Graph API:** Webhook bot tiếp nhận phản ánh tự động 24/7 từ công dân.
- **Chuẩn giao tiếp quốc tế:** Open311 GeoReport v2 (`/open311/v2/services`, `requests.json`).
- **DevOps:** Docker Compose đa container (`db`, `backend`, `frontend`).

---

## 3. CÁC HẠNG MỤC ĐÃ HOÀN THÀNH (BACKEND & GIS CỐT LÕI)

### 3.1. Cơ sở dữ liệu Không gian & Quản lý Phân vùng
- Đã khởi tạo schema PostGIS hoàn chỉnh: `users`, `departments`, `system_zones`, `incidents`, `incident_media`, `incident_history`.
- Kiểm soát phân vùng tự động bằng PostGIS `ST_Contains`: Tự động từ chối các sự cố nằm ngoài vùng đô thị lõi.
- Chống trùng lặp không gian thời gian thực bằng PostGIS `ST_DWithin(geom, 50)`: Phát hiện sự cố tương tự trong bán kính 50m gửi trong vòng 24h, hỗ trợ gộp phiếu "+1 Trùng lặp" thay vì tạo phiếu rác.

### 3.2. AI Vision Triage Tự động (DeepSeek Vision API)
- Phân loại chính xác 6 danh mục sự cố hạ tầng đô thị:
  - `ROAD_DAMAGE`: Sụt lún, ổ gà, nứt mặt đường, hư hỏng gờ giảm tốc.
  - `FLOODING`: Ngập úng mặt đường, tắc cống thoát nước.
  - `FALLEN_TREE`: Cây xanh gãy đổ, cành cây cản trở giao thông.
  - `GARBAGE`: Điểm tập kết rác tự phát, tràn rác thải đô thị.
  - `STREETLIGHT`: Đèn chiếu sáng đô thị tắt, chập cháy, gãy cột đèn.
  - `OTHER`: Sự cố hạ tầng đô thị khác.
- Đánh giá mức độ ưu tiên: `EMERGENCY` (Khẩn cấp), `HIGH` (Cao), `NORMAL` (Trung bình), `LOW` (Thấp).
- Đề xuất đơn vị phụ trách trực thuộc: Sở GTVT, Sở Xây dựng, Công ty CP Cầu đường Đà Nẵng, Công ty Thoát nước và Xử lý nước thải, Công ty Công viên Cây xanh...

### 3.3. Bảo vệ Dữ liệu Cá nhân Hình ảnh Hiện trường (Nghị định 13/2023/NĐ-CP)
- Pipeline xử lý ảnh OpenCV tự động quét ảnh trước khi lưu trữ công khai:
  - Nhận diện khuôn mặt người đi đường và làm mờ bảo mật.
  - Nhận diện biển số xe cơ giới và làm mờ bảo mật.
  - Ẩn danh số điện thoại người phản ánh (dạng `0905***123`).
  - Phân tách rõ ràng luồng `BEFORE_ANONYMIZED` (nội bộ điều phối) và `AFTER_ANONYMIZED` (công khai).

### 3.4. Máy Trạng thái Sự cố (Incident State Machine) & Cam kết SLA
- Vòng đời 8 trạng thái nghiêm ngặt:
  $$\text{SUBMITTED} \rightarrow \text{TRIAGED} \rightarrow \text{ASSIGNED} \rightarrow \text{IN_PROGRESS} \rightarrow \text{RESOLVED} \rightarrow \text{CONFIRMED} \rightarrow \text{CLOSED}$$
  *(Nhánh hủy: `REJECTED`, Nhánh mở lại: `REOPENED`)*.
- Thời hạn cam kết giải quyết (SLA Due At):
  - `EMERGENCY`: 4 giờ
  - `HIGH`: 12 giờ
  - `NORMAL`: 24 giờ
  - `LOW`: 48 giờ

### 3.5. Kết quả Kiểm thử Tự động Backend
- Vượt qua **197 / 201 unit & integration tests** trong `backend/tests/`.
- 100% các bài test trắc địa, GIS containment, deduplication 50m, OpenCV anonymization, State Machine và Open311 đều đạt `PASSED`.

---

## 4. BÁO CÁO THỰC THI THIẾT KẾ UI/UX TRÊN FIGMA (PAGE: "Screens")

Toàn bộ các màn hình được xây dựng trực tiếp trên file Figma qua plugin TalkToFigma (kênh `8hhye5g9`), tuân thủ hệ thống Design System của shadcn/ui kit và nhận diện GovTech IOC Đà Nẵng.

### 4.1. Shell Điều hướng Chung (App Shells)
1. **Shell Công khai (`105:1307`):** Desktop 1440x56px.
   - Logo & Brand: Icon siren đỏ, tiêu đề "IOC ĐÀ NẴNG", phụ đề "Cổng phản ánh sự cố đô thị".
   - Thanh tra cứu nhanh: Ô tìm kiếm bo góc với placeholder `"Nhập mã phiếu (VD: DN-202610-0001)"`.
   - Nút Đăng nhập: Chuyển đổi linh hoạt giữa Solid (khi không có action chính) và Outline trung tính (khi trên trang đã có một nút hành động chính).
2. **Shell Nhân viên (`105:1334`):** Thanh điều hướng dành cho cán bộ Điều phối IOC.
3. **Shell Kỹ thuật viên (`105:1409`):** Thanh điều hướng dành cho cán bộ/kỹ thuật viên hiện trường.

### 4.2. Bộ Component: Trạng thái Phiếu (Badge) (`131:1484`)
Đã tạo một Component Set duy nhất với thuộc tính `Trạng thái`, gồm 9 biến thể màu nền nhạt, chữ cùng tông màu đậm hơn (không dùng chữ đen, khác biệt với nút bấm solid):
- `Mới tiếp nhận (SUBMITTED)`: Nền xám `#f1f5f9`, chữ `#475569`.
- `Đã phân loại (TRIAGED)`: Nền xám `#f1f5f9`, chữ `#475569`.
- `Đã phân công (ASSIGNED)`: Nền xanh dương nhạt `#e0f2fe`, chữ `#0369a1`.
- `Đang xử lý (IN_PROGRESS)`: Nền xanh dương nhạt `#e0f2fe`, chữ `#0369a1`.
- `Đã xử lý (RESOLVED)`: Nền xanh lá nhạt `#dcfce7`, chữ `#15803d`.
- `Đã xác nhận (CONFIRMED)`: Nền xanh lá nhạt `#dcfce7`, chữ `#15803d`.
- `Đã đóng (CLOSED)`: Nền xanh lá nhạt `#dcfce7`, chữ `#15803d`.
- `Từ chối (REJECTED)`: Nền đỏ nhạt `#fee2e2`, chữ `#b91c1c`.
- `Mở lại (REOPENED)`: Nền cam nhạt `#ffedd5`, chữ `#c2410c`.

---

### 4.3. Chi tiết 3 Màn hình đã Hoàn thành trên Figma

#### Màn hình 1: Báo cáo Hiện trường (`/report`)
Thiết kế split-screen (Cột trái: Form phản ánh, Cột phải: Khung bản đồ Goong Maps định vị). Gồm 4 biến thể:
1. **Form trống ban đầu:** Ô tải ảnh hiện trường (placeholder), ô Loại sự cố ở trạng thái disabled, các trường nhập liệu trống, nút "Gửi phản ánh" đậm, khung bản đồ bên phải phủ kín không có viền/nền trắng thừa.
2. **AI đang phân tích:** Khung ảnh hiển thị hiệu ứng Skeleton loading, ô Loại sự cố bị vô hiệu hóa đang chờ kết quả phân tích AI.
3. **Đã tải ảnh & AI Triage xong:** Ảnh hiện trường thật, ô Loại sự cố tự động điền giá trị kèm dòng phụ nhỏ `"Đã gợi ý tự động từ ảnh, bạn có thể sửa"`, tọa độ hiển thị thu nhỏ thành dòng phụ `"16.068412° N, 108.224538° E"`, thẻ cảnh báo trùng lặp 50m (`"Có phản ánh tương tự cách 35m, gửi 12 phút trước"`) kèm 2 nút outline `"Đây là cùng sự cố"` và `"Không phải"`.
4. **Xác nhận thành công:** Bỏ cột bản đồ phải, thẻ xác nhận căn giữa tối đa 560px, hiển thị mã phiếu lớn `DN-202610-0001`, nút đậm `"Theo dõi phiếu"`, phía dưới có dòng nhỏ `"Đăng nhập để lưu phiếu này vào hồ sơ của bạn"` kèm liên kết Đăng nhập.

#### Màn hình 2: Trung tâm Tiếp nhận & Điều phối Sự cố (`/dispatcher/command-center`)
Thiết kế bảng điều phối chuyên dụng dành cho cán bộ IOC:
- **Thang màu mức độ ưu tiên:**
  - Khẩn cấp: Đỏ `#ef4444`.
  - Cao: Cam `#f97316`.
  - Trung bình: Vàng nhạt `#eab308`.
  - Thấp: Xám `#64748b`.
  - Xanh dương `#1d4ed8`: Chỉ dùng cho mục đang chọn (Active selection) và nút hành động chính.
- **Thống nhất mã phiếu & SLA:** Mã phiếu chuẩn `DN-202610-0001`, mốc gửi 28/10/2026 11:25, hạn SLA 24h là 29/10/2026 11:25.
- **Bản đồ điều phối:** Bỏ nền trắng thừa quanh các icon bản đồ, nhãn sự cố trùng lặp rút gọn thành `#0004 - 35m` không bị che khuất, thẻ cảnh báo trùng lặp ghim trên cùng của vùng bản đồ.
- **Thẻ phiếu & Panel chi tiết:** Ô ảnh hiện trường nhỏ vuông bo góc 56x56, khung ảnh lớn 16:9 có icon ảnh ở giữa kèm dòng nhỏ `"Đã che mờ mặt và biển số theo NĐ13"`, bỏ toàn bộ các pill/label không cần thiết, 2 nút hành động tinh gọn `"Từ chối"` (outline) và `"Duyệt"` (solid).

#### Màn hình 3: Tra cứu & Chi tiết Phiếu (`/tracking/[code]`)
Thiết kế 2 cột chuẩn desktop 1440px theo toán học Auto Layout không tràn pixel:
- **Cấu trúc khung:** Rộng đúng 1440px, chiều cao ôm sát nội dung (`HUG`). Khung nội dung trang có padding Trái 64px, Phải 64px, Trên 32px, Dưới 48px, khoảng cách giữa 2 cột là 32px (`64 + 720 + 32 + 560 + 64 = 1440px`).
- **Mọi nhóm nội dung:** Đều là một instance Card của kit (nền trắng `#ffffff`, viền mảnh `#e2e8f0` 1px, bo góc 10px, padding đúng 24px cả 4 phía, khoảng cách giữa các thẻ trong cột là 16px).
- **3 Biến thể hoàn chỉnh:**
  1. **`Tra cứu - Đang xử lý` (`134:1503`):**
     - Cột Trái (720px): Nhóm tiêu đề nằm ngoài thẻ (Breadcrumb + Title + Badge "Đang xử lý" + Subtitle); Thẻ "Tiến độ xử lý" (Timeline dọc 5 mốc: Tiếp nhận, Đã phân loại, Đã phân công, Đang xử lý, Đã xử lý với đường nối đậm hoàn thành, đường nối nhạt tương lai, mốc 4 active, có ghi chú kỹ thuật viên); Thẻ "Đơn vị phụ trách & Cam kết xử lý" (Công ty CP Cầu đường Đà Nẵng, Hạn 24h).
     - Cột Phải (560px): Thẻ "Vị trí sự cố phản ánh" (Bản đồ chỉ đọc 512x200px + Địa chỉ 120 Bạch Đằng); Thẻ "Ảnh chụp hiện trường tiếp nhận" (Ảnh 16:9 kích thước 512x288px + Người phản ánh ẩn danh `0905***123`).
  2. **`Tra cứu - Đã xử lý` (`134:1604`):**
     - Cột Trái bổ sung Thẻ thứ 3: "Kết quả xử lý hiện trường" (gồm 2 khung ảnh 16:9 Trước / Sau kích thước 329x185px, Khung ghi chú kỹ thuật viên `"Đội phản ứng nhanh đã có mặt, rào chắn cảnh báo và tiến hành dặm vá mặt đường."`, Hàng đánh giá kết quả có nút `"Hài lòng"` và `"Khiếu nại"` kèm dòng phụ `"Cần xác thực số điện thoại để đánh giá"`).
     - Dòng SLA cập nhật: `"Hạn: 11:25 ngày 29/10/2026 • Hoàn tất lúc 09:15, trước hạn 2 giờ 10 phút"`.
  3. **`Tra cứu - Không tìm thấy` (`134:1725`):**
     - Thẻ thông báo căn giữa rộng tối đa 560px, nút Đăng nhập trên header chuyển sang outline, duy nhất 1 nút đậm `"Gửi phản ánh mới"`.
- **Số liệu nghiệm thu kiểm tra bằng toán học:**
  - Số thẻ có padding < 20: **0 / 9 thẻ** (100% đạt chuẩn 24px).
  - Số phần tử con tràn lòng thẻ (`x + w > w_thẻ - padding_phải`): **0 phần tử**.
  - Số frame có chiều rộng khác 1440px: **0 frame**.

---

## 5. BỘ QUY TẮC BẤT BIẾN TRONG THIẾT KẾ UI/UX (DESIGN INVARIANTS)

Bất kỳ màn hình nào thiết kế mới hoặc hiệu chỉnh đều phải tuân thủ nghiêm ngặt các quy tắc sau:

1. **Ngôn ngữ & Kiểu chữ:**
   - 100% tiếng Việt có dấu đầy đủ và chính xác.
   - **Tuyệt đối KHÔNG sử dụng emoji** trong text layer, code hay chú thích.
   - Text layer tắt fill (nền trong suốt), không để dải màu trắng thừa phía sau chữ.
2. **Quy tắc Màu sắc & Tương phản:**
   - **Một màu nhấn đậm duy nhất:** Chỉ nút hành động chính (Primary Action) mang màu nhấn xanh dương đậm (`#1d4ed8` / `#1051a6`).
   - Các nút phụ, nút lựa chọn phân vân đều dùng viền outline trung tính (`#e2e8f0`, chữ `#0f172a`).
   - Icon trên nút bấm phải có độ tương phản chuẩn: Nút nền đậm thì icon và chữ màu trắng `#ffffff`.
   - Badge trạng thái dùng tông chữ đậm trên nền nhạt cùng họ màu (không dùng chữ đen).
3. **Quy tắc Auto Layout & Bố cục:**
   - Desktop chuẩn 1440px, chiều cao tự động co giãn (`HUG`).
   - Khoảng cách lề trang: Trái 64px, Phải 64px, Trên 32px, Dưới 48px.
   - Khoảng cách giữa 2 cột: 32px. Cột Trái 720px, Cột Phải 560px.
   - Mọi nhóm nội dung phải nằm trong instance Card kit (nền `#ffffff`, viền `#e2e8f0` 1px, bo góc 10px, padding 24px cả 4 phía).
   - Phần tử con bên trong thẻ dùng `FILL` container theo chiều ngang, không đặt chiều rộng cố định lớn hơn lòng thẻ, tắt `clipsContent`.
4. **Quy tắc An toàn Dữ liệu (Nghị định 13/2023/NĐ-CP):**
   - Mọi khung ảnh hiện trường công khai đều có ghi chú `"Đã che mờ mặt và biển số theo NĐ13"`.
   - Thông tin cá nhân người phản ánh luôn ẩn danh dạng `0905***123`.

---

## 6. KẾ HOẠCH & YÊU CẦU MÀN HÌNH TIẾP THEO: MÀN HÌNH 4 - NGHIỆM THU SỰ CỐ

### 6.1. Mục tiêu Màn hình 4
Màn hình **Nghiệm thu sự cố & Báo cáo hoàn thành hiện trường** (`/technician/resolve` hoặc `/dispatcher/verify`):
Dành cho **Kỹ thuật viên / Đội phản ứng nhanh hiện trường** hoàn tất công việc, tải ảnh chứng minh hiện trường (Proof of Work), và **Cán bộ Điều phối IOC** kiểm tra, đối chiếu ảnh Trước / Sau trước khi duyệt đóng hoặc chuyển trạng thái sang `RESOLVED` / `CONFIRMED`.

### 6.2. Các yêu cầu thiết kế dự kiến cho Màn hình 4
1. **Shell áp dụng:** `Shell Kỹ thuật viên` (`105:1409`) hoặc `Shell Nhân viên` (`105:1334`).
2. **Kích thước & Bố cục:** Desktop 1440px, Auto Layout HUG, 2 cột theo đúng tỷ lệ chuẩn (Cột Trái 720px, Cột Phải 560px, padding lề 64px, cách đỉnh 32px, gap 32px).
3. **Cột Trái (Thông tin xử lý & Đối chiếu Trước/Sau):**
   - Tiêu đề phiếu + Badge trạng thái (Đang xử lý / Đã xử lý).
   - Card 1: Khối đối chiếu minh chứng hiện trường (Before & After Proof of Work):
     - Khung ảnh 1: Hiện trường lúc tiếp nhận (chụp lúc 11:22 28/10/2026, đã làm mờ NĐ13).
     - Khung ảnh 2: Hiện trường sau khi dặm vá/khắc phục (tải lên từ camera điện thoại kỹ thuật viên, hiển thị tọa độ GPS trích xuất từ EXIF để xác thực trùng khớp bán kính 50m).
   - Card 2: Biên bản xử lý kỹ thuật:
     - Biện pháp khắc phục đã áp dụng (Select / Tag: Dặm vá mặt đường bê tông nhựa, rào chắn cảnh báo...).
     - Vật tư & Thiết bị sử dụng.
     - Thời gian bắt đầu thi công và thời gian hoàn tất thực tế.
     - Ghi chú hiện trường của đội phản ứng nhanh.
4. **Cột Phải (Vị trí & Thông tin điều phối):**
   - Card 1: Bản đồ định vị hiện trường có bán kính kiểm soát 50m (đánh dấu vị trí tiếp nhận ban đầu và vị trí kỹ thuật viên đứng chụp ảnh hoàn tất).
   - Card 2: Thông tin SLA & Đơn vị phụ trách (Công ty CP Cầu đường Đà Nẵng, thời gian còn lại trước hạn).
5. **Hàng Nút Hành động Duyệt/Nghiệm thu (Bottom Action Bar):**
   - Nút chính đậm: `"Xác nhận nghiệm thu & Đóng phiếu"` (`#15803d` hoặc `#1d4ed8`).
   - Nút phụ outline: `"Yêu cầu xử lý lại"` (khi ảnh minh chứng chưa đạt chất lượng hoặc sai vị trí).
   - Nút chuyển tiếp: `"Lưu nháp biên bản"`.

---

## 7. LỘ TRÌNH KẾ TIẾP CỦA TOÀN DỰ ÁN

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LỘ TRÌNH TRIỂN KHAI TIẾP THEO                   │
├────────────────────────────────────────────────────────────────────────┤
│ Bước 1: Thiết kế Màn hình 4 - Nghiệm thu sự cố trên Figma               │
│         - Dựng biến thể dành cho Kỹ thuật viên (tải minh chứng)        │
│         - Dựng biến thể dành cho Điều phối IOC (nghiệm thu đối chiếu)  │
│                                                                        │
│ Bước 2: Thiết kế Màn hình 5 - Dashboard Thống kê & Phân tích SLA       │
│         - Biểu đồ nhiệt GIS (Heatmap) mật độ sự cố tại các quận        │
│         - Tỷ lệ hoàn thành đúng hạn SLA theo từng đơn vị hạ tầng       │
│                                                                        │
│ Bước 3: Ráp nối Frontend Next.js với Backend FastAPI                   │
│         - Kết nối API tiếp nhận `/api/v1/incidents/`                   │
│         - Tích hợp Goong Maps SDK trên Next.js App Router              │
│         - Kết nối State Machine và luồng tra cứu `/tracking/[code]`    │
│                                                                        │
│ Bước 4: Kiểm thử End-to-End toàn diện & Đóng gói Docker                │
│         - Chạy kiểm thử tự động e2e luồng từ Tiếp nhận -> Nghiệm thu   │
│         - Docker Compose hoàn chỉnh một lệnh khởi chạy toàn hệ thống   │
│                                                                        │
│ Bước 5: Hoàn thiện Thuyết minh Đồ án Tốt nghiệp & Slide Bảo vệ        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. HƯỚNG DẪN DÀNH CHO CONVERSATION MỚI (QUICK CONTEXT RESTORE)

Khi bắt đầu một cuộc trò chuyện mới, hãy gửi thông điệp sau cho trợ lý AI:

> *"Tôi đang tiếp tục dự án Đồ án Tốt nghiệp DATN-HK10-URBAN-INCIDENT (Nền tảng Quản lý Sự cố Đô thị Đà Nẵng). Đọc file `docs/PROJECT_CONTEXT_HANDOFF.md` để nắm toàn bộ kiến trúc, CSDL PostGIS, quy tắc thiết kế Figma và các màn hình đã hoàn thành. Hiện tại đã xong 3 màn hình (/report, /dispatcher/command-center, /tracking/[code]). Nhiệm vụ tiếp theo là triển khai Màn hình 4: Nghiệm thu sự cố & Báo cáo hiện trường. Hãy bắt đầu từ Màn hình 4."*
