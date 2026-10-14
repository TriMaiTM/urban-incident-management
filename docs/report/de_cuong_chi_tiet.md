# ĐỀ CƯƠNG CHI TIẾT ĐỒ ÁN TỐT NGHIỆP

**Tên đề tài:** Phát triển nền tảng tiếp nhận, phân loại và quản lý sự cố hạ tầng đô thị tích hợp trí tuệ nhân tạo tại thành phố Đà Nẵng  
**Ngành:** Công nghệ thông tin / Kỹ thuật phần mềm  
**Sinh viên thực hiện:**  
1. Đoàn Văn Trí  
2. Bùi Quốc Tuấn  
**Thời gian thực hiện:** 14/09/2026 – 20/12/2026 (14 tuần)  

---

### 1. Lý do chọn đề tài

Trong lộ trình xây dựng đô thị thông minh tại TP. Đà Nẵng, công tác tiếp nhận và xử lý sự cố hạ tầng kỹ thuật (đường sá, thoát nước, cây xanh, chiếu sáng, vệ sinh) vẫn gặp nhiều trở ngại:
- Tiếp nhận phản ánh phân tán, mô tả vị trí thiếu chính xác, xử lý thủ công tốn nhiều nhân lực.
- Tình trạng trùng lặp thông tin khi nhiều người cùng phản ánh một sự cố tại cùng địa điểm gây quá tải hệ thống.
- Thiếu công cụ AI tự động phân loại, đánh giá độ khẩn cấp và giám sát tiến độ theo thời gian cam kết (SLA).

Đề tài được lựa chọn nhằm ứng dụng mô hình thị giác AI (DeepSeek Vision) và hệ thống thông tin không gian (PostGIS) để tự động hóa quy trình phân loại, lọc trùng lặp và nâng cao hiệu quả quản trị đô thị số.

---

### 2. Mục tiêu và nhiệm vụ đề tài

#### 2.1. Mục tiêu đề tài
- **Mục tiêu tổng quát:** Xây dựng nền tảng tiếp nhận, tự động phân loại, lọc trùng lặp và quản lý quy trình khắc phục sự cố hạ tầng khép kín tại TP. Đà Nẵng.
- **Mục tiêu cụ thể:**
  - Tiếp nhận phản ánh đa kênh qua Web/PWA và Facebook Messenger kèm ảnh hiện trường, tọa độ GPS.
  - Tích hợp AI thị giác tự động nhận diện khuyết tật, mức độ khẩn cấp và gợi ý cơ quan xử lý.
  - Tự động phát hiện và cảnh báo trùng lặp không gian (PostGIS bán kính 50m).
  - Tự động làm mờ khuôn mặt và biển số xe bảo vệ quyền riêng tư (Nghị định 13/2023/NĐ-CP).
  - Cung cấp Dashboard điều hành IOC theo dõi hạn SLA, bản đồ nhiệt và đánh giá hài lòng.

#### 2.2. Nhiệm vụ đề tài
- Khảo sát bài toán quản lý phản ánh đô thị và chuẩn giao tiếp dịch vụ công Open311 GeoReport v2.
- Thiết kế kiến trúc hệ thống phân tầng và CSDL quan hệ - không gian (PostgreSQL/PostGIS).
- Hiện thực hóa Backend (FastAPI), Frontend (Next.js, MapLibre GL) và tích hợp AI (DeepSeek Vision, OpenCV).
- Xây dựng kịch bản kiểm thử giả lập 4 vai trò tại Đà Nẵng, đánh giá độ chính xác và hiệu năng hệ thống.

---

### 3. Đối tượng và phạm vi đề tài

- **Đối tượng nghiên cứu:** Quy trình xử lý sự cố hạ tầng; mô hình AI thị giác đa phương thức; kỹ thuật truy vấn không gian GIS; chuẩn dịch vụ công Open311.
- **Phạm vi không gian:** Vùng Đô thị Trung tâm TP. Đà Nẵng (6 quận nội thành: Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Liên Chiểu, Cẩm Lệ và huyện Hòa Vang) thông qua cơ chế hàng rào địa lý Geo-fencing.
- **Phạm vi loại sự cố:** 5 nhóm sự cố hạ tầng ngoài trời phổ biến: Hư hỏng mặt đường, ngập úng đô thị, cây xanh gãy đổ, rác thải ứ đọng, sự cố chiếu sáng công cộng.
- **Phạm vi người dùng (4 vai trò):** Công dân (Citizen), Điều phối viên IOC (Dispatcher), Cán bộ kỹ thuật hiện trường (Technician), Quản trị viên (Admin).

---

### 4. Phương pháp thực hiện

- **Nghiên cứu tài liệu:** Tiêu chuẩn Open311, quy định bảo vệ dữ liệu cá nhân, thuật toán chỉ mục không gian R-Tree/GiST.
- **Phân tích & Thiết kế:** Phương pháp linh hoạt (Agile rút gọn), mô hình hóa ca sử dụng (Use Case) và máy trạng thái (State Machine) vòng đời sự cố.
- **Công nghệ phát triển:**
  - *Backend:* Python 3.11+, FastAPI, SQLAlchemy 2.0 (asyncio), OpenCV.
  - *Cơ sở dữ liệu:* PostgreSQL 16 + PostGIS 3.4 (triển khai qua Docker).
  - *Frontend:* Next.js (TypeScript, Tailwind CSS), MapLibre GL JS, Goong Geocoding API.
  - *Trí tuệ nhân tạo:* DeepSeek Multimodal/Vision API.
- **Kiểm thử & Đánh giá:** Kiểm thử tự động với `pytest`, thử nghiệm thực địa giả lập tại Đà Nẵng, đo lường độ chính xác AI và thời gian truy vấn.

---

### 5. Dự kiến kết quả

1. **Ứng dụng Web/PWA:** Cho phép công dân gửi phản ánh, cắm ghim GPS, nhận cảnh báo trùng lặp, tra cứu tiến độ và chấm điểm hài lòng.
2. **Kênh tiếp nhận Facebook Messenger Chatbot:** Tự động nhận ảnh và vị trí từ người dùng Fanpage, đồng bộ vào hệ thống.
3. **Phân hệ điều hành IOC & Cán bộ hiện trường:** Quản lý phiếu theo bảng Kanban, duyệt gợi ý từ AI, đếm ngược hạn SLA, cập nhật ảnh minh chứng sau sửa chữa.
4. **Phân hệ quản trị Admin:** Quản lý người dùng RBAC, kích hoạt GeoJSON phân vùng hàng rào địa lý, hiển thị bản đồ nhiệt Heatmap.
5. **Dịch vụ API:** Đạt chuẩn quốc tế Open311 GeoReport v2.
6. **Báo cáo thuyết minh đồ án:** Hoàn chỉnh theo quy định của nhà trường.

---

### 6. Ý nghĩa khoa học và thực tiễn

- **Ý nghĩa khoa học:** Kết hợp hiệu quả giữa mô hình thị giác AI đa phương thức và hệ thống thông tin địa lý (Spatial GIS) trong bài toán quản lý dịch vụ công đô thị số; ứng dụng kỹ thuật bảo vệ dữ liệu cá nhân trong thu thập dữ liệu cộng đồng.
- **Ý nghĩa thực tiễn:** Giúp người dân phản ánh sự cố nhanh chóng, minh bạch; giảm trên 60% tải rà soát thủ công cho điều phối viên; hạn chế phân mảnh nguồn lực nhờ phát hiện trùng lặp; nâng cao trách nhiệm giải trình của đơn vị xử lý qua giám sát SLA.

---

### 7. Dự kiến nội dung đồ án/khóa luận tốt nghiệp

- **MỞ ĐẦU**
- **CHƯƠNG 1: KHẢO SÁT VÀ TỔNG QUAN ĐỀ TÀI**
  - 1.1. Bối cảnh chuyển đổi số và thực trạng tiếp nhận, quản lý sự cố hạ tầng đô thị tại TP. Đà Nẵng.
  - 1.2. Khảo sát các hệ thống tương tự (Cổng Góp ý Đà Nẵng, Danang Smart City) và những hạn chế tồn tại.
  - 1.3. Khảo sát tiêu chuẩn dịch vụ công đô thị mở Open311 GeoReport v2.
  - 1.4. Mục tiêu, đối tượng và phạm vi giới hạn của đề tài.
- **CHƯƠNG 2: TỔNG QUAN CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ LIÊN QUAN**
  - 2.1. Hệ thống thông tin địa lý (GIS) và hệ quản trị CSDL không gian PostgreSQL/PostGIS.
  - 2.2. Mô hình thị giác máy tính và trí tuệ nhân tạo đa phương thức (DeepSeek Multimodal/Vision API).
  - 2.3. Kỹ thuật xử lý ảnh làm mờ bảo vệ dữ liệu cá nhân (OpenCV) theo Nghị định 13/2023/NĐ-CP.
  - 2.4. Công nghệ phát triển ứng dụng Web/PWA hiện đại (Next.js, MapLibre GL) và kênh tích hợp Messenger Webhook.
- **CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG**
  - 3.1. Phân tích yêu cầu chức năng theo 4 nhóm tác nhân (Citizen, Dispatcher, Technician, Admin) và yêu cầu phi chức năng.
  - 3.2. Thiết kế kiến trúc tổng thể hệ thống (System Architecture).
  - 3.3. Thiết kế cơ sở dữ liệu quan hệ và không gian (PostGIS ERD).
  - 3.4. Thiết kế quy trình nghiệp vụ và máy trạng thái (State Machine) vòng đời sự cố.
  - 3.5. Thiết kế các cơ chế cốt lõi: Hàng rào địa lý Geo-fencing, AI Triage, lọc trùng lặp bán kính 50m và kiểm soát SLA.
- **CHƯƠNG 4: TRIỂN KHAI ỨNG DỤNG VÀ KẾT QUẢ**
  - 4.1. Môi trường cài đặt và cấu hình hệ thống (Docker Compose, FastAPI, Next.js).
  - 4.2. Hiện thực hóa các giao diện và chức năng chính của 4 vai trò.
  - 4.3. Kịch bản thử nghiệm giả lập tại vùng đô thị Đà Nẵng và đánh giá kết quả (độ chính xác AI, hiệu năng lọc trùng lặp PostGIS).
  - 4.4. Đánh giá mức độ hoàn thành so với mục tiêu đề ra.
- **KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN**
- **TÀI LIỆU THAM KHẢO & PHỤ LỤC**

---

### 8. Phân chia nhiệm vụ (đối với đề tài làm nhóm sinh viên)

#### a) Phần nhiệm vụ chung:
| TT | Họ tên sinh viên | Nội dung thực hiện |
| :-: | :--- | :--- |
| 1 | **Đoàn Văn Trí** | Khảo sát bài toán thực tế; phân tích yêu cầu; thiết kế kiến trúc hệ thống; tham gia thử nghiệm thực địa và viết báo cáo đồ án. |
| 2 | **Bùi Quốc Tuấn** | Khảo sát chuẩn Open311; phân tích luồng người dùng (UI/UX); ma trận phân quyền 4 vai trò; tham gia thử nghiệm và viết báo cáo đồ án. |

#### b) Phần nhiệm vụ cụ thể:
| TT | Họ tên sinh viên | Nội dung thực hiện |
| :-: | :--- | :--- |
| 1 | **Đoàn Văn Trí** | - Thiết kế và xây dựng CSDL PostgreSQL + PostGIS (8 bảng thực thể) trên Docker.<br>- Xây dựng Backend FastAPI: Xác thực JWT/Google OAuth, phân quyền RBAC 4 vai trò.<br>- Hiện thực hóa thuật toán hàng rào địa lý Geo-fencing và lọc trùng lặp không gian (bán kính 50m).<br>- Tích hợp DeepSeek Vision API (phân loại sự cố) và module OpenCV (làm mờ mặt, biển số).<br>- Viết test suite tự động Backend với `pytest`. |
| 2 | **Bùi Quốc Tuấn** | - Xây dựng giao diện Frontend Web/PWA (Next.js, Tailwind CSS) cho Mobile & Desktop.<br>- Tích hợp bản đồ số MapLibre GL, công cụ cắm ghim GPS, hiển thị cảnh báo trùng lặp.<br>- Xây dựng kênh tiếp nhận Facebook Messenger Webhook và kịch bản Chatbot tự động.<br>- Xây dựng phân hệ điều phối IOC (bảng Kanban, duyệt gợi ý AI, bộ đếm ngược SLA, Heatmap).<br>- Kiểm thử giao diện Frontend và tối ưu trải nghiệm người dùng. |

---

### 9. Dự kiến tiến độ thực hiện (14/09/2026 – 20/12/2026)

| TT | Thời gian | Nội dung thực hiện | Người thực hiện chính | Sản phẩm dự kiến |
| :-: | :---: | :--- | :---: | :--- |
| 1 | **Tuần 1** (14/09 – 20/09) | Khảo sát hiện trạng tại Đà Nẵng, xác định phạm vi và lập đề cương đồ án. | Cả nhóm | Bản đề cương chi tiết |
| 2 | **Tuần 2** (21/09 – 27/09) | Thu thập tài liệu quy chuẩn, phân tích yêu cầu SRS và vẽ Use Case 4 vai trò. | Cả nhóm | Tài liệu đặc tả yêu cầu |
| 3 | **Tuần 3** (28/09 – 04/10) | Thiết kế kiến trúc tổng thể, sơ đồ máy trạng thái và CSDL PostGIS ERD. | Cả nhóm | Sơ đồ kiến trúc & CSDL |
| 4 | **Tuần 4** (05/10 – 11/10) | Khởi tạo Docker CSDL PostGIS, khung FastAPI & Next.js, nạp ranh giới GeoJSON. | Trí (DB, API), Tuấn (UI) | Khung mã nguồn & Container CSDL |
| 5 | **Tuần 5** (12/10 – 18/10) | Xây dựng hệ thống xác thực JWT, Google OAuth và phân quyền RBAC 4 vai trò. | Trí (Auth Backend), Tuấn (Auth UI) | Module Auth & RBAC hoàn chỉnh |
| 6 | **Tuần 6** (19/10 – 25/10) | Xây dựng API tiếp nhận sự cố, upload ảnh và màn hình báo cáo sự cố Web. | Trí (API Incident), Tuấn (UI Report) | Chức năng gửi phản ánh cơ bản |
| 7 | **Tuần 7** (26/10 – 01/11) | Tích hợp DeepSeek Vision API phân loại sự cố và module OpenCV làm mờ ảnh. | Đoàn Văn Trí | Module AI Triage & Làm mờ ảnh |
| 8 | **Tuần 8** (02/11 – 08/11) | Hiện thực hóa thuật toán lọc trùng lặp PostGIS (50m) và cảnh báo trên giao diện. | Trí (Logic GIS), Tuấn (UI Cảnh báo) | Chức năng lọc trùng lặp hoàn chỉnh |
| 9 | **Tuần 9** (09/11 – 15/11) | Xây dựng Facebook Messenger Webhook và kịch bản Chatbot nhận ảnh, vị trí. | Bùi Quốc Tuấn | Kênh tiếp nhận Messenger hoạt động |
| 10 | **Tuần 10** (16/11 – 22/11) | Xây dựng bảng Kanban điều phối IOC, duyệt AI và giao diện Cán bộ hiện trường. | Tuấn (UI Dashboard), Trí (API Dispatch) | Phân hệ điều phối IOC & Hiện trường |
| 11 | **Tuần 11** (23/11 – 29/11) | Xây dựng giám sát thời hạn SLA, bản đồ nhiệt Heatmap và form đánh giá 1-5 sao. | Trí (SLA Worker), Tuấn (UI Heatmap) | Module SLA & Heatmap phân tích |
| 12 | **Tuần 12** (30/11 – 06/12) | Kiểm thử tích hợp toàn hệ thống, đánh giá độ chính xác AI trên dữ liệu Đà Nẵng. | Cả nhóm | Báo cáo kiểm thử & Đánh giá |
| 13 | **Tuần 13** (07/12 – 13/12) | Tối ưu hiệu năng, bảo mật và soạn thảo thuyết minh đồ án (Chương 1, 2, 3, 4). | Cả nhóm | Bản thảo thuyết minh đồ án |
| 14 | **Tuần 14** (14/12 – 20/12) | Hoàn thiện tài liệu, đóng gói Docker Compose, chuẩn bị slide và video demo. | Cả nhóm | Toàn bộ hồ sơ đồ án hoàn chỉnh |

---

### Ghi chú cho tác giả (xóa trước khi nộp)
- **Cần bổ sung:** Tên Giảng viên hướng dẫn trên trang bìa theo mẫu quy định của khoa/trường.
- **Số liệu thực nghiệm cần điền vào Chương 4:** Độ chính xác phân loại của mô hình AI (%) và thời gian đáp ứng của truy vấn lọc trùng lặp (ms).
