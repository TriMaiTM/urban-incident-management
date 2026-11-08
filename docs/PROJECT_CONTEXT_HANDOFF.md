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

## 4. QUY HOẠCH & THIẾT KẾ LẠI TOÀN BỘ UI/UX TRÊN FIGMA (RESET V2)

> **Thông báo quan trọng về trạng thái UI/UX:**  
> Toàn bộ giao diện mẫu cũ trên Figma được đưa về trạng thái **Reset làm lại từ đầu**. Dự án tái quy hoạch toàn diện hệ thống UI/UX thành **34 màn hình** theo tài liệu chuẩn tại [docs/screen.md](file:///d:/HK10/DATN/docs/screen.md).  
> - **Tiến độ UI hiện tại:** 0 / 34 màn hình (Bắt đầu thiết kế lại từ đầu trên Figma).  
> - **Nguyên tắc thiết kế mới:** Tối giản, trực diện, loại bỏ toàn bộ các badge, tag, chữ thừa và chi tiết trang trí rườm rà; người dùng ở từng vai trò chỉ cần nhìn vào màn hình là biết ngay mình đang làm gì và cần thao tác gì.  
> - **Hỗ trợ vai trò Kỹ thuật viên (Technician):** Hỗ trợ đầy đủ cả **Desktop** (tại văn phòng/đội xe) và **Mobile** (ngoài hiện trường).

### 4.1. Kiến trúc phân hệ 34 Màn hình (Tham chiếu `docs/screen.md`)
1. **Phân hệ Công cộng (Screens 1 - 5):** Trang chủ & Bản đồ đô thị (`/`), Báo cáo hiện trường (`/report`), Tra cứu tiến độ (`/tracking/[code]`), Danh sách sự cố (`/incidents`), Tài liệu Open311 (`/developers/open311`).
2. **Phân hệ Xác thực & Danh tính (Screens 6 - 9):** Đăng nhập (`/auth/login`), Đăng ký công dân (`/auth/register`), Quên mật khẩu (`/auth/forgot-password`), Hồ sơ cá nhân (`/profile`).
3. **Phân hệ Công dân (Screens 10 - 13):** Phản ánh của tôi (`/citizen/my-reports`), Chi tiết phản ánh (`/citizen/reports/[id]`), Đánh giá & khiếu nại (`/citizen/feedback/[code]`), Thông báo (`/citizen/notifications`).
4. **Phân hệ Điều phối viên IOC (Screens 14 - 18):** Bàn tác chiến & điều phối (`/dispatcher/command-center`), Bàn nghiệm thu & đối chiếu minh chứng (`/dispatcher/verify`), Giám sát hạn SLA (`/dispatcher/sla-watch`), Bản đồ điều động đội cơ động (`/dispatcher/field-units`), Sổ bộ & lịch sử điều phối (`/dispatcher/incidents`).
5. **Phân hệ Kỹ thuật viên Hiện trường (Screens 19 - 23 - Desktop & Mobile):** Danh sách nhiệm vụ phân công (`/technician/tasks`), Chi tiết nhiệm vụ & dẫn đường (`/technician/tasks/[id]`), Báo cáo nghiệm thu & nộp minh chứng (`/technician/tasks/[id]/resolve`), Nhật ký công tác & vật tư (`/technician/history`), Trực ban & trạng thái đội (`/technician/profile`).
6. **Phân hệ Quản trị & Phân tích (Screens 24 - 29):** Dashboard chỉ số & GIS Heatmap (`/admin/analytics`), Quản lý người dùng & phân quyền (`/admin/users`), Quản lý phân vùng GIS (`/admin/zones`), Cấu hình danh mục/SLA/đơn vị (`/admin/settings`), Nhật ký kiểm toán an ninh (`/admin/audit-logs`), Quản lý kênh ngoại vi & webhook (`/admin/integrations`).
7. **Phân hệ Ngoại lệ & Hệ thống (Screens 30 - 34):** 404 Không tìm thấy trang, 403 Từ chối truy cập, 500 Lỗi máy chủ, Màn hình bảo trì, Màn hình ngoại tuyến (PWA Offline).

---

## 5. BỘ QUY TẮC THIẾT KẾ UI/UX TINH GỌN (LEAN DESIGN INVARIANTS)

Mọi màn hình thiết kế mới trên Figma bắt buộc tuân thủ bộ nguyên tắc:

1. **Ngôn ngữ & Kiểu chữ:**
   - 100% tiếng Việt có dấu đầy đủ, chuẩn xác, văn phong hành chính hiện đại.
   - **Tuyệt đối KHÔNG sử dụng emoji** trong text layer, code hay chú thích.
   - Chữ viết ngắn gọn, tường minh, dứt khoát; loại bỏ các cụm từ giải thích dài dòng.
2. **Quy tắc Màu sắc & Tương phản:**
   - **Một màu nhấn chính (Primary Action):** Nút hành động cốt lõi mang màu xanh dương đậm (`#1051a6` / `#1d4ed8`) hoặc xanh lá nghiệm thu (`#15803d`).
   - Các nút phụ, nút hủy dùng viền outline trung tính (`#e2e8f0`, chữ `#0f172a`).
   - Cắt giảm tối đa các badge, tag màu mè không cần thiết để tránh làm phân tán thị giác người dùng.
3. **Quy tắc Bố cục & Khung nhìn:**
   - Desktop chuẩn 1440px cố định, Mobile chuẩn 390x844px.
   - Bố cục lưới rõ ràng, phân vùng tác chiến mạch lạc giữa Form nhập liệu - Bản đồ GIS - Hàng nút hành động.
4. **Quy chuẩn Pháp lý & Nghiệp vụ Bất biến:**
   - Hình ảnh hiện trường công khai luôn tuân thủ Nghị định 13/2023/NĐ-CP (làm mờ mặt và biển số xe).
   - Kiểm tra định vị không gian PostGIS trong bán kính kiểm soát $\le 50\text{m}$.
   - Khóa phạm vi địa lý tiếp nhận trong Vùng Đô thị Lõi Đà Nẵng (8.007 đỉnh trắc địa).

---

## 6. LỘ TRÌNH THIẾT KẾ LẠI UI TRÊN FIGMA

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LỘ TRÌNH THIẾT KẾ LẠI TỪ ĐẦU                   │
├────────────────────────────────────────────────────────────────────────┤
│ Giai đoạn 1: Chuẩn hóa Design System & Bộ UI Primitives trên Figma     │
│              - Bảng màu GovTech Đà Nẵng, Typography, Bố cục Grid       │
│              - Bộ UI components cơ bản (Button, Input, Card, Modal)     │
│                                                                        │
│ Giai đoạn 2: Thiết kế Nhóm 1 - Phân hệ Công cộng & Tiếp nhận (1 - 5)   │
│              - Báo cáo hiện trường (/report), Tra cứu (/tracking)      │
│                                                                        │
│ Giai đoạn 3: Thiết kế Nhóm 2 & 3 - Xác thực & Công dân (6 - 13)        │
│              - Đăng nhập/Đăng ký, Sổ tay phản ánh, Đánh giá/Khiếu nại  │
│                                                                        │
│ Giai đoạn 4: Thiết kế Nhóm 4 - Bàn Tác chiến Điều phối IOC (14 - 18)   │
│              - Command Center (/dispatcher/command-center), Nghiệm thu │
│                                                                        │
│ Giai đoạn 5: Thiết kế Nhóm 5 - Kỹ thuật viên Hiện trường (19 - 23)     │
│              - Thiết kế đồng thời bản Desktop & Mobile                 │
│                                                                        │
│ Giai đoạn 6: Thiết kế Nhóm 6 & 7 - Quản trị, Phân tích & Lỗi (24 - 34) │
│              - Dashboard Heatmap, Quản trị Users/Zones/SLA, Trang Lỗi  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. HƯỚNG DẪN DÀNH CHO CONVERSATION MỚI (QUICK CONTEXT RESTORE)

Khi bắt đầu một cuộc trò chuyện mới, hãy gửi thông điệp sau cho trợ lý AI:

> *"Tôi đang tiếp tục dự án Đồ án Tốt nghiệp DATN-HK10-URBAN-INCIDENT (Nền tảng Quản lý Sự cố Đô thị Đà Nẵng). Đọc file `docs/PROJECT_CONTEXT_HANDOFF.md` và `docs/screen.md`. Toàn bộ Backend, CSDL PostGIS và AI Pipeline đã hoàn thiện. Toàn bộ phần UI/UX đang được thiết kế lại từ đầu trên Figma theo quy chuẩn tinh gọn 34 màn hình (Kỹ thuật viên hỗ trợ cả Desktop & Mobile). Hãy bắt đầu tiến hành thiết kế lại UI từ Giai đoạn 1."*
