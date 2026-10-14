# ĐỀ CƯƠNG CHI TIẾT ĐỒ ÁN TỐT NGHIỆP

**Tên đề tài:** Phát triển nền tảng tiếp nhận, phân loại và quản lý sự cố hạ tầng đô thị tích hợp trí tuệ nhân tạo tại thành phố Đà Nẵng  
**Ngành:** Công nghệ thông tin / Kỹ thuật phần mềm  
**Sinh viên thực hiện:**  
1. Đoàn Văn Trí  
2. Bùi Quốc Tuấn  
**Thời gian thực hiện:** 14/09/2026 – 20/12/2026 (14 tuần)  

---

### 1. Lý do chọn đề tài

Thành phố Đà Nẵng đang định hướng phát triển trở thành đô thị thông minh kiểu mẫu, đòi hỏi công tác quản lý và vận hành hạ tầng kỹ thuật (đường bộ, chiếu sáng, cấp thoát nước, cây xanh, vệ sinh môi trường) phải phản ứng nhanh và minh bạch. Tuy nhiên, quy trình tiếp nhận và xử lý phản ánh hiện trường hiện nay vẫn tồn tại nhiều hạn chế:
- **Tiếp nhận phân tán và nhập liệu thủ công:** Người dân phản ánh qua nhiều kênh nhưng nội dung thiếu tính chuẩn hóa, địa chỉ mô tả mơ hồ, gây khó khăn cho khâu rà soát hiện trường.
- **Quá tải trong phân loại và điều phối:** Bộ phận điều phối trung tâm (IOC) phải xử lý khối lượng lớn tin báo mỗi ngày theo phương pháp thủ công, dễ dẫn đến chậm trễ hoặc điều phối sai đơn vị chức năng có thẩm quyền.
- **Trùng lặp phản ánh tại cùng một vị trí:** Một sự cố hạ tầng lớn (như ổ gà sâu trên trục đường chính, cây xanh gãy đổ sau bão) thường nhận được hàng chục phản ánh giống nhau từ nhiều người dân, dẫn đến tình trạng phân mảnh dữ liệu và lãng phí nhân lực kiểm tra.
- **Thiếu giám sát SLA và minh bạch minh chứng khắc phục:** Tiến độ xử lý giữa các sở, ban ngành và UBND các quận chưa được ràng buộc chặt chẽ theo cam kết thời gian (SLA), việc nghiệm thu chưa có quy trình kiểm chứng bằng hình ảnh hiện trường đáng tin cậy.

Xuất phát từ các vấn đề thực tiễn trên, đề tài **"Phát triển nền tảng tiếp nhận, phân loại và quản lý sự cố hạ tầng đô thị tích hợp trí tuệ nhân tạo tại thành phố Đà Nẵng"** được xây dựng nhằm ứng dụng mô hình ngôn ngữ - thị giác đa phương thức (Multimodal AI), hệ thống thông tin địa lý (GIS/PostGIS) và cơ chế xử lý dữ liệu tự động, góp phần tối ưu hóa quy trình nghiệp vụ đô thị số.

---

### 2. Mục tiêu và nhiệm vụ đề tài

#### 2.1. Mục tiêu đề tài
- **Mục tiêu tổng quát:** Xây dựng một nền tảng chuyển đổi số toàn diện hỗ trợ tiếp nhận đa kênh, tự động phân loại mức độ khẩn cấp, lọc trùng lặp theo không gian địa lý thời gian thực, và quản lý quy trình xử lý sự cố hạ tầng đô thị khép kín cho vùng đô thị trung tâm thành phố Đà Nẵng.
- **Mục tiêu cụ thể:**
  1. Phát triển kênh tiếp nhận thân thiện qua Web/PWA và chatbot Facebook Messenger cho phép gửi phản ánh kèm ảnh hiện trường và tọa độ GPS chính xác.
  2. Tích hợp AI thị giác (DeepSeek Multimodal/Vision API) tự động nhận diện loại hư hỏng, đánh giá mức độ rủi ro và gợi ý cơ quan chức năng tiếp nhận.
  3. Xây dựng thuật toán lọc trùng lặp không gian (PostGIS `ST_DWithin` bán kính 50m) nhằm gộp các phản ánh cùng vụ việc, giảm tải cho cán bộ hiện trường.
  4. Đảm bảo tuân thủ bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP thông qua module tự động làm mờ khuôn mặt và biển số xe trước khi công khai hình ảnh.
  5. Cung cấp bảng điều hành thông minh (IOC Dashboard) với bản đồ nhiệt (Heatmap), theo dõi hạn xử lý (SLA) và đánh giá độ hài lòng của công dân.

#### 2.2. Nhiệm vụ đề tài
- Khảo sát các quy trình tiếp nhận phản ánh hiện trường (như Cổng Góp ý Đà Nẵng, mô hình Open311 chuẩn quốc tế).
- Thiết kế kiến trúc hệ thống phân tầng (Client - API Gateway - Async AI Worker - Spatial Database).
- Thiết kế cơ sở dữ liệu quan hệ kết hợp không gian trên PostgreSQL 16 + PostGIS 3.4.
- Hiện thực hóa Backend RESTful API bằng FastAPI (Python 3.11+) và Frontend bằng Next.js (TypeScript, Tailwind CSS, MapLibre GL).
- Huấn luyện ngữ cảnh/tối ưu Prompt kỹ thuật cho DeepSeek Vision API và tích hợp thuật toán xử lý ảnh OpenCV.
- Triển khai thử nghiệm với dữ liệu GeoJSON ranh giới đô thị Đà Nẵng, đánh giá hiệu năng và lập hồ sơ báo cáo.

---

### 3. Đối tượng và phạm vi đề tài

#### 3.1. Đối tượng nghiên cứu
- Quy trình tiếp nhận, điều phối, khắc phục và nghiệm thu sự cố hạ tầng đô thị (giao thông, thoát nước, cây xanh, chiếu sáng, rác thải).
- Mô hình thị giác máy tính đa phương thức (Multimodal LLM / Vision AI) trong nhận diện khuyết tật công trình hạ tầng.
- Kỹ thuật truy vấn không gian địa lý (Spatial Query) và thuật toán phát hiện trùng lặp dữ liệu GPS.
- Các chuẩn dữ liệu dịch vụ đô thị mở (Open311 GeoReport v2).

#### 3.2. Phạm vi đề tài
- **Phạm vi không gian (Không gian địa lý):** Thí điểm tại Vùng Đô thị Trung tâm TP. Đà Nẵng (6 quận nội thành gồm Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Liên Chiểu, Cẩm Lệ và huyện Hòa Vang). Hệ thống hỗ trợ cơ chế Hàng rào địa lý (Geo-fencing) cho phép kích hoạt mở rộng địa giới linh hoạt.
- **Phạm vi đối tượng quản lý:** Tập trung vào 5 nhóm sự cố hạ tầng kỹ thuật ngoài trời phổ biến: Hư hỏng mặt đường/ổ gà, ngập úng đô thị, cây xanh gãy đổ cản trở giao thông, rác thải ứ đọng, sự cố đèn chiếu sáng công cộng.
- **Phạm vi người dùng (4 nhóm vai trò):** Công dân (Citizen), Điều phối viên IOC (Dispatcher), Cán bộ kỹ thuật hiện trường (Technician), Quản trị viên hệ thống (Admin).
- **Phạm vi kỹ thuật:** Hệ thống cung cấp Web/PWA, Webhook Facebook Messenger, và API chuẩn Open311. Không triển khai thiết bị IoT phần cứng tại hiện trường.

---

### 4. Phương pháp thực hiện

1. **Phương pháp nghiên cứu lý thuyết & khảo sát tài liệu:**
   - Nghiên cứu chuẩn quốc tế Open311 GeoReport v2 về giao tiếp dịch vụ công đô thị.
   - Nghiên cứu cơ chế trích xuất đặc trưng hình ảnh và khả năng suy luận của các mô hình Vision-Language (VLM).
   - Nghiên cứu các chỉ mục không gian R-Tree, GiST trong PostgreSQL/PostGIS.
2. **Phương pháp phân tích và thiết kế hệ thống:**
   - Sử dụng mô hình tuần tự cải tiến (Agile/Scrum rút gọn phù hợp nhóm 2 người).
   - Phân tích ca sử dụng (Use Case), sơ đồ trạng thái (State Machine) quản lý vòng đời phiếu phản ánh.
   - Thiết kế mô hình dữ liệu quan hệ kết hợp kiểu dữ liệu hình học WGS84 (`SRID 4326`).
3. **Phương pháp xây dựng phần mềm và tích hợp kỹ thuật:**
   - **Backend:** FastAPI, SQLAlchemy 2.0 (bất đồng bộ asyncio), Pydantic v2, JWT Security, OpenCV.
   - **Cơ sở dữ liệu:** PostgreSQL 16 + PostGIS 3.4 chạy trên môi trường Docker Compose.
   - **Frontend:** Next.js (App Router, React 19), MapLibre GL JS, Goong Geocoding API.
   - **AI/Vision:** Tích hợp DeepSeek Multimodal/Vision API thông qua structured JSON output.
4. **Phương pháp thử nghiệm và đánh giá:**
   - Kiểm thử đơn vị (Unit Test) và kiểm thử tích hợp (Integration Test) tự động với `pytest`.
   - Kiểm thử thực địa bằng kịch bản giả lập các tọa độ và hình ảnh hư hại hạ tầng trên địa bàn Đà Nẵng.
   - Đo lường độ chính xác phân loại của AI (Confusion Matrix) và thời gian truy vấn không gian PostGIS.

---

### 5. Dự kiến kết quả

1. **Sản phẩm phần mềm hoàn chỉnh:**
   - Nền tảng Web/PWA cho công dân: Cho phép chụp ảnh, cắm ghim tọa độ, kiểm tra cảnh báo trùng lặp trước khi gửi, tra cứu tiến độ công khai và đánh giá sao hài lòng.
   - Cổng tiếp nhận Facebook Messenger Chatbot: Tự động tương tác nhận ảnh và vị trí GPS qua tin nhắn Fanpage.
   - Cổng điều hành IOC và Cán bộ hiện trường: Bảng Kanban quản lý phiếu, kiểm duyệt gợi ý phân loại từ AI, giám sát hạn cam kết xử lý (SLA), tải ảnh minh chứng nghiệm thu (Proof of Work).
   - Cổng quản trị Admin: Quản lý người dùng theo vai trò RBAC, cấu hình GeoJSON phân vùng hàng rào địa lý, Dashboard biểu đồ thống kê và bản đồ nhiệt.
   - Hệ thống API RESTful đáp ứng chuẩn Open311 GeoReport v2.
2. **Module trí tuệ nhân tạo và xử lý ảnh:**
   - Pipeline phân loại tự động sự cố và khuyến nghị cơ quan xử lý với thời gian phản hồi dưới 5 giây.
   - Pipeline tự động ẩn danh hóa khuôn mặt và biển số xe bằng OpenCV trước khi xuất bản ảnh.
3. **Tài liệu và báo cáo khoa học:**
   - Đề cương chi tiết và thuyết minh đồ án tốt nghiệp đầy đủ (khoảng 70–90 trang).
   - Tài liệu đặc tả yêu cầu kỹ thuật (System Specification) và tài liệu hướng dẫn cài đặt/vận hành qua Docker.

---

### 6. Ý nghĩa khoa học và thực tiễn

#### 6.1. Ý nghĩa khoa học
- Đóng góp giải pháp kết hợp giữa mô hình thị giác ngôn ngữ lớn (Multimodal AI) và hệ thống thông tin không gian (Spatial GIS) trong việc tự động hóa xử lý bài toán phản ánh dịch vụ công đô thị.
- Đề xuất mô hình phân loại và lọc trùng lặp kết hợp đa chiều: vừa xét khoảng cách không gian địa lý (`ST_DWithin`), vừa xét tương đồng ngữ nghĩa phản ánh và trạng thái xử lý.
- Áp dụng các kỹ thuật bảo vệ quyền riêng tư số (Digital Privacy Preservation) trong các hệ thống tiếp nhận dữ liệu cộng đồng (Crowdsourcing).

#### 6.2. Ý nghĩa thực tiễn
- **Đối với người dân:** Giúp việc gửi phản ánh sự cố trở nên nhanh chóng chỉ với vài thao tác trên điện thoại, nắm bắt tiến độ minh bạch và chủ động đóng góp cho cộng đồng.
- **Đối với cơ quan quản lý và các đơn vị công ích:** Giảm thiểu trên 60% khối lượng rà soát thủ công của bộ phận điều phối, tránh lãng phí nguồn lực nhờ loại trừ phản ánh trùng lặp, nâng cao trách nhiệm giải trình thông qua giám sát hạn SLA và ảnh minh chứng nghiệm thu.
- **Đối với chính quyền thành phố Đà Nẵng:** Cung cấp nguồn dữ liệu bản đồ nhiệt thời gian thực về các điểm đen hạ tầng, làm căn cứ số liệu phục vụ quy hoạch bảo trì đô thị bền vững.

---

### 7. Dự kiến nội dung đồ án/khóa luận tốt nghiệp

- **Lời mở đầu & Lời cảm ơn**
- **Mục lục, Danh mục hình vẽ, bảng biểu và thuật ngữ viết tắt**
- **MỞ ĐẦU:** Tính cấp thiết, mục tiêu, đối tượng, phương pháp và cấu trúc báo cáo.
- **CHƯƠNG 1: TỔNG QUAN VÀ CƠ SỞ LÝ THUYẾT**
  - 1.1. Hiện trạng công tác tiếp nhận và quản lý sự cố đô thị tại TP. Đà Nẵng.
  - 1.2. Khảo sát các hệ thống liên quan và chuẩn mở Open311 GeoReport v2.
  - 1.3. Tổng quan về Hệ thống Thông tin Địa lý (GIS) và công nghệ PostgreSQL/PostGIS.
  - 1.4. Mô hình Trí tuệ Nhân tạo Đa phương thức (Multimodal AI / Vision-Language Models) trong phân loại hình ảnh.
  - 1.5. Các kỹ thuật thị giác máy tính (OpenCV) trong bảo vệ dữ liệu cá nhân theo quy định pháp luật.
- **CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG**
  - 2.1. Phân tích yêu cầu chức năng theo 4 nhóm tác nhân (Citizen, Dispatcher, Technician, Admin) và yêu cầu phi chức năng.
  - 2.2. Thiết kế kiến trúc tổng thể hệ thống (System Architecture & Pipeline).
  - 2.3. Thiết kế cơ sở dữ liệu quan hệ và không gian (Spatial ERD & PostGIS Tables).
  - 2.4. Thiết kế quy trình nghiệp vụ và máy trạng thái (State Machine) vòng đời sự cố.
  - 2.5. Thiết kế chi tiết các cơ chế cốt lõi: Hàng rào địa lý (Geo-fencing), Pipeline phân loại AI, Lọc trùng lặp không gian, và Quản lý cam kết SLA.
- **CHƯƠNG 3: HIỆN THỰC HÓA NỀN TẢNG VÀ TÍCH HỢP HỆ THỐNG**
  - 3.1. Xây dựng dịch vụ máy chủ Backend (FastAPI, JWT/OAuth2, RBAC, RESTful API).
  - 3.2. Hiện thực hóa module AI DeepSeek Vision và module ẩn danh hóa ảnh OpenCV.
  - 3.3. Xây dựng giao diện ứng dụng Web/PWA bằng Next.js và tích hợp bản đồ số MapLibre GL.
  - 3.4. Xây dựng kênh tiếp nhận tương tác tự động qua Facebook Messenger Webhook.
  - 3.5. Xây dựng giao diện điều phối IOC, bảng theo dõi SLA và báo cáo thống kê.
- **CHƯƠNG 4: THỬ NGHIỆM, ĐÁNH GIÁ VÀ TRIỂN KHAI**
  - 4.1. Môi trường triển khai và kịch bản thử nghiệm đa vai trò tại vùng đô thị Đà Nẵng.
  - 4.2. Đánh giá độ chính xác của mô hình AI trong phân loại sự cố và gán đơn vị xử lý.
  - 4.3. Đánh giá hiệu năng truy vấn không gian, thuật toán lọc trùng lặp và khả năng đáp ứng hệ thống.
  - 4.4. Đóng gói và hướng dẫn triển khai nền tảng với Docker Compose.
- **KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN**
  - Tóm tắt các kết quả đạt được so với mục tiêu ban đầu.
  - Những hạn chế tồn tại của hệ thống.
  - Định hướng phát triển mở rộng (Tích hợp Zalo OA, Ứng dụng di động Native, IoT cảm biến ngập úng).
- **TÀI LIỆU THAM KHẢO**
- **PHỤ LỤC:** Danh mục API và Cấu trúc GeoJSON vùng Đà Nẵng.

---

### 8. Phân chia nhiệm vụ (đối với đề tài làm nhóm sinh viên)

#### a) Phần nhiệm vụ chung:
| TT | Họ tên sinh viên | Nội dung thực hiện |
| :-: | :--- | :--- |
| 1 | **Đoàn Văn Trí** | - Khảo sát bài toán quản lý sự cố hạ tầng tại Đà Nẵng và các tiêu chuẩn dịch vụ công đô thị (Open311).<br>- Phân tích yêu cầu chức năng, phi chức năng và thiết kế kiến trúc tổng thể hệ thống.<br>- Tham gia xây dựng kịch bản kiểm thử, thử nghiệm thực địa và viết tài liệu thuyết minh đồ án. |
| 2 | **Bùi Quốc Tuấn** | - Khảo sát bài toán quản lý sự cố hạ tầng tại Đà Nẵng và các tiêu chuẩn dịch vụ công đô thị (Open311).<br>- Phân tích yêu cầu người dùng, luồng trải nghiệm UI/UX và ma trận phân quyền 4 vai trò.<br>- Tham gia xây dựng kịch bản kiểm thử, chuẩn bị dữ liệu mẫu và viết tài liệu thuyết minh đồ án. |

#### b) Phần nhiệm vụ cụ thể:
| TT | Họ tên sinh viên | Nội dung thực hiện |
| :-: | :--- | :--- |
| 1 | **Đoàn Văn Trí** | - **Backend & CSDL:** Thiết kế và hiện thực hóa cơ sở dữ liệu PostgreSQL + PostGIS (8 bảng thực thể quan hệ & không gian); cấu hình Docker container.<br>- **Bảo mật & Phân quyền:** Xây dựng hệ thống xác thực JWT, Google OAuth 2.0 và phân quyền RBAC cho 4 vai trò.<br>- **Core GIS Engine:** Xây dựng cơ chế hàng rào địa lý Geo-fencing (`ST_Contains`) và thuật toán lọc trùng lặp không gian (`ST_DWithin` bán kính 50m).<br>- **Tích hợp AI & Thị giác máy tính:** Xây dựng pipeline kết nối DeepSeek Multimodal/Vision API tự động phân loại sự cố; hiện thực hóa module làm mờ khuôn mặt/biển số xe bằng OpenCV.<br>- **Kiểm thử Backend:** Viết test suite tự động với `pytest` cho GIS, Auth và nghiệp vụ sự cố. |
| 2 | **Bùi Quốc Tuấn** | - **Frontend Web/PWA:** Xây dựng toàn bộ giao diện phía máy khách bằng Next.js (App Router, Tailwind CSS) tương thích Mobile & Desktop.<br>- **Tích hợp Bản đồ số:** Tích hợp MapLibre GL JS, hiển thị GeoJSON ranh giới vùng Đà Nẵng, công cụ cắm ghim vị trí, hiển thị cảnh báo trùng lặp và bản đồ nhiệt Heatmap.<br>- **Kênh Tiếp nhận Mạng xã hội:** Xây dựng Webhook kết nối Facebook Messenger Graph API và kịch bản chatbot tự động tiếp nhận ảnh và vị trí.<br>- **Phân hệ Điều hành & Nghiệp vụ:** Thiết kế giao diện Dashboard IOC cho điều phối viên, bảng Kanban trạng thái, bộ đếm ngược SLA và form tải ảnh nghiệm thu hiện trường.<br>- **Kiểm thử Frontend:** Kiểm thử giao diện người dùng, độ tương thích đa màn hình và trải nghiệm PWA. |

---

### 9. Dự kiến tiến độ thực hiện (14/09/2026 – 20/12/2026)

| TT | Thời gian | Nội dung thực hiện | Người thực hiện chính | Sản phẩm dự kiến |
| :-: | :---: | :--- | :---: | :--- |
| 1 | **Tuần 1**<br>(14/09 – 20/09/2026) | - Khảo sát thực trạng tiếp nhận sự cố đô thị tại Đà Nẵng và các giải pháp hiện có.<br>- Xác định mục tiêu, phạm vi và hoàn thiện đề cương chi tiết đề tài. | Cả nhóm | Bản đề cương chi tiết đồ án |
| 2 | **Tuần 2**<br>(21/09 – 27/09/2026) | - Thu thập tài liệu quy chuẩn (Open311, Nghị định 13/2023/NĐ-CP).<br>- Phân tích yêu cầu chức năng, phi chức năng và thiết kế sơ đồ Use Case cho 4 vai trò. | Cả nhóm | Tài liệu phân tích yêu cầu (SRS) |
| 3 | **Tuần 3**<br>(28/09 – 04/10/2026) | - Thiết kế kiến trúc tổng thể hệ thống (Architecture) và quy trình chuyển đổi trạng thái (State Machine).<br>- Thiết kế cơ sở dữ liệu quan hệ và không gian ERD (PostGIS). | Đoàn Văn Trí (Lead),<br>Bùi Quốc Tuấn | Sơ đồ kiến trúc & Tài liệu thiết kế CSDL |
| 4 | **Tuần 4**<br>(05/10 – 11/10/2026) | - Thiết lập môi trường Docker Compose (PostgreSQL 16 + PostGIS 3.4).<br>- Khởi tạo khung dự án FastAPI backend và Next.js frontend.<br>- Nạp dữ liệu GeoJSON ranh giới Đà Nẵng và xây dựng API thẩm định Geo-fencing. | Đoàn Văn Trí (DB, Backend),<br>Bùi Quốc Tuấn (Scaffold UI) | Khung mã nguồn dự án, Container CSDL hoạt động |
| 5 | **Tuần 5**<br>(12/10 – 18/10/2026) | - Xây dựng hệ thống xác thực JWT, Google OAuth 2.0 và middleware RBAC 4 vai trò.<br>- Thiết kế giao diện khung Frontend, luồng đăng nhập/đăng ký và cấu hình bản đồ MapLibre. | Đoàn Văn Trí (Auth Backend),<br>Bùi Quốc Tuấn (Auth Frontend) | Module Auth & RBAC hoàn chỉnh, chạy qua test suite |
| 6 | **Tuần 6**<br>(19/10 – 25/10/2026) | - Xây dựng API tiếp nhận sự cố, tải lên tập tin đa phương tiện và tra cứu ticket.<br>- Xây dựng giao diện báo cáo sự cố (Form nhập liệu + cắm ghim bản đồ GPS). | Đoàn Văn Trí (Incident API),<br>Bùi Quốc Tuấn (Report UI) | Kênh tạo phản ánh cơ bản trên Web |
| 7 | **Tuần 7**<br>(26/10 – 01/11/2026) | - Tích hợp DeepSeek Multimodal/Vision API tự động phân loại sự cố và mức độ khẩn cấp.<br>- Xây dựng module OpenCV tự động làm mờ khuôn mặt và biển số xe trước khi lưu trữ công khai. | Đoàn Văn Trí | Module AI Triage & OpenCV Anonymization |
| 8 | **Tuần 8**<br>(02/11 – 08/11/2026) | - Hiện thực hóa thuật toán lọc trùng lặp không gian (PostGIS `ST_DWithin` bán kính 50m).<br>- Xây dựng tính năng cảnh báo trùng lặp trước khi gửi (Pre-submission alert) và gộp phiếu trên Web. | Đoàn Văn Trí (Spatial logic),<br>Bùi Quốc Tuấn (Giao diện gợi ý gộp) | Tính năng chống trùng lặp hoạt động hoàn chỉnh |
| 9 | **Tuần 9**<br>(09/11 – 15/11/2026) | - Xây dựng cổng tiếp nhận qua Facebook Messenger Webhook (Graph API).<br>- Phát triển kịch bản Chatbot tiếp nhận ảnh, định vị GPS và phản hồi mã tra cứu tự động. | Bùi Quốc Tuấn (Lead Webhook),<br>Đoàn Văn Trí (Hỗ trợ API) | Kênh tiếp nhận Messenger Fanpage hoạt động |
| 10 | **Tuần 10**<br>(16/11 – 22/11/2026) | - Xây dựng phân hệ IOC Dispatcher: Bảng Kanban điều phối, duyệt gợi ý AI, phân bổ đơn vị.<br>- Xây dựng phân hệ Cán bộ hiện trường: Nhận việc, cập nhật tiến độ, tải ảnh bằng chứng sau khắc phục. | Bùi Quốc Tuấn (UI Dashboard),<br>Đoàn Văn Trí (API Dispatch & SLA) | Phân hệ điều phối và xử lý hiện trường hoàn thành |
| 11 | **Tuần 11**<br>(23/11 – 29/11/2026) | - Xây dựng hệ thống giám sát thời hạn xử lý (SLA Monitoring) và cảnh báo quá hạn.<br>- Xây dựng tính năng công dân đánh giá hài lòng (1–5 sao) và bản đồ nhiệt (Heatmap) trên IOC. | Đoàn Văn Trí (SLA Worker),<br>Bùi Quốc Tuấn (Heatmap UI) | Module SLA & Heatmap phân tích hoàn thành |
| 12 | **Tuần 12**<br>(30/11 – 06/12/2026) | - Tích hợp toàn diện các phân hệ (End-to-End Testing).<br>- Chạy thử nghiệm kịch bản đa vai trò với tập dữ liệu sự cố thực tế tại Đà Nẵng; đánh giá độ chính xác AI. | Cả nhóm | Báo cáo kết quả thử nghiệm và đánh giá chất lượng |
| 13 | **Tuần 13**<br>(07/12 – 13/12/2026) | - Tối ưu hóa hiệu năng truy vấn CSDL, kiểm tra bảo mật API.<br>- Viết bản thảo thuyết minh đồ án tốt nghiệp (Chương 1, 2, 3, 4). | Cả nhóm | Bản thảo thuyết minh đồ án tốt nghiệp |
| 14 | **Tuần 14**<br>(14/12 – 20/12/2026) | - Hoàn thiện tài liệu thuyết minh, đóng gói mã nguồn và Docker Compose.<br>- Chuẩn bị slide thuyết trình và video demo hệ thống để bảo vệ trước hội đồng. | Cả nhóm | Toàn bộ hồ sơ đồ án hoàn chỉnh sẵn sàng bảo vệ |

---

### Ghi chú cho tác giả (xóa trước khi nộp)
- **Số liệu cần đo đạc thực nghiệm bổ sung:** Độ chính xác phân loại của DeepSeek Vision trên tập ảnh thực nghiệm tại Đà Nẵng (Precision, Recall, F1-score); thời gian xử lý trung bình của thuật toán lọc trùng lặp PostGIS khi tải tăng cao.
- **Ảnh chụp màn hình cần chụp khi nộp báo cáo chính thức:**
  1. Giao diện công dân cắm ghim vị trí và cảnh báo trùng lặp hiện trường.
  2. Giao diện Chatbot Facebook Messenger nhận ảnh và tọa độ.
  3. Giao diện điều phối viên IOC với bảng Kanban và kết quả phân loại từ AI.
  4. Giao diện Bản đồ nhiệt (Heatmap) các điểm nóng sự cố tại 6 quận nội thành Đà Nẵng.
  5. Minh chứng ảnh trước và sau khi xử lý (ảnh đã làm mờ mặt/biển số xe và ảnh hoàn thành).
- **Trích dẫn cần hoàn thiện:** Chuẩn hóa danh mục tài liệu tham khảo theo định dạng IEEE (các tài liệu về PostGIS, chuẩn Open311, bài báo khoa học về DeepSeek VLM, Nghị định 13/2023/NĐ-CP).
