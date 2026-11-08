### NHÓM VII: NGOẠI LỆ & HỆ THỐNG

#### 30. 404 Không tìm thấy Trang (`/404`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Người dùng truy cập nhầm liên kết hoặc phiếu không tồn tại.
- **Mục đích:** Điều hướng người dùng quay lại luồng thao tác hợp lệ.
- **Khối giao diện chính:**
  - Thông báo: *"Đường dẫn hoặc mã phiếu sự cố không tồn tại"*.
  - Ô tìm kiếm nhanh mã phiếu.
  - Nút: **Về Trang chủ** và **Gửi phản ánh mới**.

#### 31. 403 Từ chối Truy cập (`/403`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Người dùng vào trang không thuộc thẩm quyền của vai trò.
- **Mục đích:** Thông báo lý do phân quyền và cung cấp tùy chọn chuyển đổi tài khoản.
- **Khối giao diện chính:**
  - Thông báo: *"Khu vực tác chiến nội bộ - Bạn không có quyền truy cập"*.
  - Nút: **Đăng xuất đổi tài khoản** và **Về trang làm việc của bạn**.

#### 32. 500 Lỗi Máy chủ (`/500`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Người dùng gặp sự cố hệ thống đột xuất.
- **Mục đích:** Xử lý ngoại lệ thân thiện và cung cấp mã lỗi hỗ trợ kỹ thuật.
- **Khối giao diện chính:**
  - Thông báo: *"Máy chủ đang xử lý lỗi đột xuất, vui lòng thử lại sau"*.
  - Mã tham chiếu lỗi (Trace ID).
  - Nút: **Tải lại trang** và **Gọi hotline hỗ trợ 1022**.

#### 33. Màn hình Bảo trì Định kỳ (`/maintenance`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Mọi người dùng khi hệ thống nâng cấp.
- **Mục đích:** Thông báo lịch bảo trì và hướng dẫn kênh báo tin dự phòng.
- **Khối giao diện chính:**
  - Đồng hồ đếm lùi thời gian dự kiến mở lại dịch vụ.
  - Hướng dẫn kênh dự phòng gửi phản ánh: Tổng đài 1022 Đà Nẵng hoặc Fanpage Facebook IOC.

#### 34. Màn hình Ngoại tuyến Mất mạng (`/offline`)
- **Thiết bị:** Desktop & Mobile (PWA Cache).
- **Người dùng:** Kỹ thuật viên hoặc công dân bị mất kết nối mạng.
- **Mục đích:** Báo cho người dùng biết dữ liệu đã được lưu tạm vào máy và sẽ tự động gửi khi có mạng.
- **Khối giao diện chính:**
  - Thông báo: *"Bạn đang ngoại tuyến. Dữ liệu và ảnh chụp đã được lưu an toàn trên máy"*.
  - Danh sách số lượng phiếu đang chờ gửi lên máy chủ.
  - Nút: **Thử gửi lại ngay**.
