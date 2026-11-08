### NHÓM VI: PHÂN HỆ QUẢN TRỊ & PHÂN TÍCH

#### 24. Dashboard Chỉ số & GIS Heatmap (`/admin/analytics`)
- **Thiết bị:** Desktop 1440px.
- **Người dùng:** Quản trị viên, Lãnh đạo IOC và UBND thành phố.
- **Mục đích:** Đánh giá chất lượng dịch vụ đô thị và phát hiện các điểm nóng hư hại hạ tầng.
- **Khối giao diện chính:**
  - 4 Khối số liệu: Tổng sự cố tiếp nhận, Tỷ lệ đúng hạn SLA, Thời gian giải quyết trung bình, Điểm hài lòng công dân.
  - Bản đồ nhiệt GIS Heatmap: Thể hiện vùng mật độ sự cố cao trên địa bàn 6 quận nội thành.
  - Biểu đồ so sánh tiến độ và tỷ lệ hoàn thành giữa các sở ngành, quận/huyện.

#### 25. Quản lý Người dùng & Phân quyền (`/admin/users`)
- **Thiết bị:** Desktop 1440px.
- **Người dùng:** Quản trị viên hệ thống.
- **Mục đích:** Cấp phát tài khoản, phân quyền thao tác cho cán bộ và kỹ thuật viên.
- **Khối giao diện chính:**
  - Danh sách người dùng: Họ tên, tài khoản, vai trò, đơn vị trực thuộc, trạng thái hoạt động.
  - Form thêm/sửa tài khoản: Gán vai trò (`CITIZEN`, `DISPATCHER`, `TECHNICIAN`, `ADMIN`), phân bổ phòng ban.
  - Nút khóa/mở khóa tài khoản.

#### 26. Quản lý Phân vùng Không gian GIS (`/admin/zones`)
- **Thiết bị:** Desktop 1440px.
- **Người dùng:** Quản trị viên hệ thống / Kỹ sư GIS.
- **Mục đích:** Quản lý ranh giới hàng rào địa lý tiếp nhận sự cố và nạp thêm phân vùng mới.
- **Khối giao diện chính:**
  - Bản đồ hiển thị đa giác ranh giới Vùng Đô thị Lõi Đà Nẵng (8.007 đỉnh trắc địa).
  - Danh sách phân vùng địa lý kèm nút bật/tắt tiếp nhận sự cố cho từng vùng.
  - Nút tải lên file GeoJSON để mở rộng vùng tiếp nhận mà không cần chỉnh sửa mã nguồn.

#### 27. Cấu hình Danh mục, SLA & Đơn vị (`/admin/settings`)
- **Thiết bị:** Desktop 1440px.
- **Người dùng:** Quản trị viên hệ thống.
- **Mục đích:** Thiết lập quy chuẩn vận hành của toàn bộ hệ thống.
- **Khối giao diện chính:**
  - Quản lý danh mục sự cố (mã sự cố, tên tiếng Việt, đơn vị xử lý mặc định).
  - Cấu hình số giờ cam kết SLA theo 4 cấp độ: Khẩn cấp, Cao, Tiêu chuẩn, Thấp.
  - Danh bạ các sở, ban, ngành, doanh nghiệp công ích và UBND các quận/huyện.

#### 28. Nhật ký Kiểm toán An ninh (`/admin/audit-logs`)
- **Thiết bị:** Desktop 1440px.
- **Người dùng:** Quản trị viên bảo mật, thanh tra công vụ.
- **Mục đích:** Lưu trữ lịch sử không thể thay đổi để truy vết mọi hành vi tác động dữ liệu.
- **Khối giao diện chính:**
  - Bảng log thời gian thực: Thời điểm, người thực hiện, hành động, giá trị trước/sau khi đổi, địa chỉ IP.
  - Bộ lọc log theo mã phiếu sự cố hoặc theo tên cán bộ thao tác.

#### 29. Quản lý Kênh Ngoại vi & Webhook (`/admin/integrations`)
- **Thiết bị:** Desktop 1440px.
- **Người dùng:** Quản trị viên kỹ thuật.
- **Mục đích:** Giám sát trạng thái hoạt động và hạn mức của các dịch vụ bên ngoài.
- **Khối giao diện chính:**
  - Theo dõi kết nối và lưu lượng: DeepSeek Vision API, Goong Maps Geocoding & Tiles, Facebook Messenger Webhook.
  - Nút kiểm tra kết nối (Ping Test) trực tiếp cho từng dịch vụ.

---

