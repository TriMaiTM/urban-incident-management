### NHÓM I: PHÂN HỆ CÔNG CỘNG

#### 1. Trang chủ & Bản đồ Đô thị (`/`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Mọi công dân, khách vãng lai.
- **Mục đích:** Xem nhanh các sự cố đang diễn ra trên địa bàn Đà Nẵng và điều hướng phản ánh mới.
- **Khối giao diện chính:**
  - Bản đồ toàn màn hình hiển thị các điểm sự cố kèm bộ lọc: Quận/Huyện, Loại sự cố, Tình trạng.
  - Bộ 3 số liệu: Tiếp nhận hôm nay, Đang xử lý, Đã hoàn tất.
  - Ô tìm kiếm mã phiếu trên thanh menu.
  - Nút chính: **Báo sự cố ngay** (dẫn tới `/report`).

#### 2. Báo cáo Hiện trường (`/report`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Công dân gửi phản ánh.
- **Mục đích:** Tải ảnh, cắm vị trí bản đồ và gửi sự cố về Trung tâm IOC.
- **Khối giao diện chính:**
  - Khung tải ảnh: Kéo thả hoặc chụp trực tiếp từ camera.
  - Tự động điền AI: DeepSeek Vision đọc ảnh và tự chọn loại sự cố, mức độ khẩn cấp (cho phép người dùng sửa lại).
  - Bản đồ cắm ghim: Chọn vị trí, tự điền địa chỉ; báo đỏ nếu nằm ngoài ranh giới Đà Nẵng.
  - Cảnh báo trùng lặp 50m: Tự hiện thông báo nếu có sự cố lân cận kèm nút **Tôi cũng gặp sự cố này** (+1 phiếu, không tạo phiếu trùng).
  - Form ngắn: Mô tả hiện trường và Số điện thoại.
  - Nút chính: **Gửi phản ánh**.
  - Màn hình kết quả: Hiện mã phiếu (VD: `DN-202610-0001`) và nút **Theo dõi tiến độ**.

#### 3. Tra cứu Tiến độ Xử lý (`/tracking/[code]`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Người dân theo dõi phiếu.
- **Mục đích:** Xem lộ trình giải quyết sự cố và đánh giá kết quả sau khi hoàn thành.
- **Khối giao diện chính:**
  - Dòng tiến độ: Tiếp nhận $\rightarrow$ Phân loại $\rightarrow$ Giao việc $\rightarrow$ Đang xử lý $\rightarrow$ Đã khắc phục.
  - Khối đơn vị: Tên đơn vị phụ trách, thời hạn cam kết xử lý.
  - Khối đối chiếu: Ảnh chụp lúc báo và ảnh chụp sau khi sửa xong kèm ghi chú kỹ thuật viên.
  - Khối đánh giá: Đánh giá 1 - 5 sao và ô nhập phản hồi (1-2 sao tự động kích hoạt khiếu nại làm lại).

#### 4. Danh sách Sự cố Đô thị (`/incidents`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Mọi công dân.
- **Mục đích:** Xem danh sách tổng hợp các điểm sự cố công khai để chủ động lộ trình đi lại.
- **Khối giao diện chính:**
  - Bộ lọc: Quận/Huyện, Loại sự cố, Trạng thái.
  - Nút chuyển chế độ: Xem dạng Lưới thẻ hoặc xem trên Bản đồ.
  - Thẻ sự cố: Ảnh thu nhỏ, địa chỉ, thời gian, số người cùng bấm xác nhận.

#### 5. Tài liệu Chuẩn mở Open311 (`/developers/open311`)
- **Thiết bị:** Desktop.
- **Người dùng:** Lập trình viên, đơn vị đối tác liên thông.
- **Mục đích:** Hướng dẫn kết nối dữ liệu theo chuẩn Open311 GeoReport v2.
- **Khối giao diện chính:**
  - Danh mục endpoint: Lấy dịch vụ, gửi sự cố, tra cứu tiến độ.
  - Khung kiểm thử API trực tiếp và tải file GeoJSON ranh giới Đà Nẵng.

---

