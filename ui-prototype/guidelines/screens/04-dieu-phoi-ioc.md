### NHÓM IV: PHÂN HỆ ĐIỀU PHỐI VIÊN IOC

#### 14. Bàn Tác chiến & Điều phối (`/dispatcher/command-center`)
- **Thiết bị:** Desktop 1440px.
- **Người dùng:** Điều phối viên IOC Đà Nẵng.
- **Mục đích:** Tiếp nhận, duyệt phân loại tự động của AI và giao việc cho các đơn vị xử lý.
- **Khối giao diện chính:**
  - Cột 1 (Hàng đợi): Danh sách phiếu mới phân cấp theo độ khẩn cấp kèm thời hạn SLA.
  - Cột 2 (Bản đồ): Vị trí sự cố, hiển thị các phiếu trùng lặp trong bán kính 50m kèm nút **Gộp phiếu**.
  - Cột 3 (Kiểm duyệt): Ảnh lớn đã làm mờ mặt/biển số, kết quả phân loại AI, menu chọn đơn vị xử lý.
  - 2 Nút tác chiến: **Từ chối tiếp nhận** và **Duyệt & Giao việc**.

#### 15. Bàn Nghiệm thu & Đối chiếu Minh chứng (`/dispatcher/verify`)
- **Thiết bị:** Desktop 1440px.
- **Người dùng:** Điều phối viên IOC phụ trách nghiệm thu.
- **Mục đích:** Đối chiếu ảnh Trước/Sau, kiểm tra khoảng cách GPS thi công và đóng phiếu.
- **Khối giao diện chính:**
  - Cặp ảnh đối chiếu: Ảnh tiếp nhận ban đầu đặt cạnh Ảnh chụp sau khi hoàn thành.
  - Bảng kiểm tra GPS: Tọa độ gốc vs Tọa độ sau sửa; báo đạt/không đạt theo ngưỡng 50m.
  - Biên bản kỹ thuật: Biện pháp, vật tư, thời gian thi công, chữ ký số KTV.
  - Bản đồ kiểm soát: Vòng tròn bán kính 50m và vị trí 2 điểm ghim A/B.
  - 3 Nút hành động: **Duyệt nghiệm thu & Đóng phiếu**, **Yêu cầu làm lại**, **Lưu nháp**.

#### 16. Giám sát Hạn Xử lý SLA (`/dispatcher/sla-watch`)
- **Thiết bị:** Desktop 1440px.
- **Người dùng:** Điều phối viên trưởng, trực ban IOC.
- **Mục đích:** Giám sát các sự cố sắp trễ hạn hoặc đã quá hạn để can thiệp đôn đốc.
- **Khối giao diện chính:**
  - Bảng 3 cột: Khẩn cấp (SLA 4h), Cao (SLA 12h), Tiêu chuẩn (SLA 24h).
  - Đồng hồ đếm lùi thời gian theo từng phiếu; tự đổi màu khi sắp hết hạn.
  - Nút thao tác nhanh trên mỗi dòng: **Phát lệnh đôn đốc** và **Chuyển đơn vị phối hợp**.

#### 17. Bản đồ Điều động Đội Cơ động (`/dispatcher/field-units`)
- **Thiết bị:** Desktop 1440px.
- **Người dùng:** Cán bộ điều phối đội cơ động.
- **Mục đích:** Theo dõi vị trí các đội sửa chữa và gán việc cho đội ở gần hiện trường nhất.
- **Khối giao diện chính:**
  - Bản đồ GPS hiển thị vị trí các đội sửa chữa kèm trạng thái (Đang rảnh / Đang di chuyển / Đang thi công).
  - Danh sách đội xe, thông tin liên lạc bộ đàm, vật tư máy móc mang theo.
  - Nút: **Gợi ý đội gần hiện trường nhất**.

#### 18. Sổ bộ & Lịch sử Điều phối (`/dispatcher/incidents`)
- **Thiết bị:** Desktop 1440px.
- **Người dùng:** Điều phối viên, thanh tra giao thông đô thị.
- **Mục đích:** Tra cứu toàn bộ hồ sơ sự cố trong hệ thống và trích xuất dữ liệu.
- **Khối giao diện chính:**
  - Bảng dữ liệu tổng hợp: Mã phiếu, ngày giờ, loại hư hỏng, địa chỉ, đơn vị thực hiện, thời gian đóng, điểm đánh giá.
  - Bộ lọc tìm kiếm đa tiêu chí.
  - Nút: **Xuất file Excel / PDF**.

---

