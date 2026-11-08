### NHÓM V: PHÂN HỆ KỸ THUẬT VIÊN HIỆN TRƯỜNG (DESKTOP & MOBILE)

#### 19. Danh sách Nhiệm vụ Phân công (`/technician/tasks`)
- **Thiết bị:** Desktop (tại văn phòng đội) & Mobile (ngoài hiện trường).
- **Người dùng:** Kỹ thuật viên, đội trưởng đội thi công.
- **Mục đích:** Xem danh sách công việc được giao trong ca trực và thứ tự ưu tiên.
- **Khối giao diện chính:**
  - 2 Tab chuyển đổi: **Đang thực hiện** và **Lịch sử hoàn tất**.
  - Danh sách thẻ công việc: Mức độ ưu tiên, địa chỉ số nhà/tên đường, hạn còn lại, khoảng cách tới hiện trường.
  - Nút thao tác: Bấm mở bản đồ dẫn đường và chi tiết nhiệm vụ.

#### 20. Chi tiết Nhiệm vụ & Dẫn đường (`/technician/tasks/[id]`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Kỹ thuật viên tiếp nhận công việc.
- **Mục đích:** Xem ảnh hiện trường ban đầu, lộ trình đường đi và xác nhận bắt đầu làm.
- **Khối giao diện chính:**
  - Ảnh phóng to sự cố lúc tiếp nhận ban đầu.
  - Bản đồ dẫn đường tới vị trí sự cố.
  - Phương án đề xuất xử lý của AI (vật tư dự kiến, biện pháp gợi ý).
  - Nút chính: **Bắt đầu xử lý** (ghi nhận thời gian có mặt và đổi trạng thái sang `IN_PROGRESS`).

#### 21. Báo cáo Nghiệm thu & Nộp Minh chứng (`/technician/tasks/[id]/resolve`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Kỹ thuật viên sau khi sửa chữa xong.
- **Mục đích:** Tải ảnh chụp kết quả, nhập biên bản kỹ thuật và nộp nghiệm thu đóng việc.
- **Khối giao diện chính:**
  - Khung tải/chụp ảnh sau xử lý (`AFTER_PROOF`): Tự động lấy tọa độ GPS EXIF, kiểm tra sai lệch $\le 50\text{m}$, tự động làm mờ mặt/biển số.
  - 3 Ô biên bản: Biện pháp thi công, Vật tư/máy móc đã dùng, Ghi chú mở làn/lưu thông.
  - Dòng ký số nội bộ: Tên KTV, mã thiết bị, mã băm SHA256.
  - Nút chính: **Gửi biên bản nghiệm thu** (chuyển trạng thái sang `RESOLVED`).

#### 22. Nhật ký Công tác & Vật tư (`/technician/history`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Kỹ thuật viên, đội trưởng đội thi công.
- **Mục đích:** Thống kê khối lượng công việc và kiểm soát vật tư tiêu hao trong ca trực.
- **Khối giao diện chính:**
  - Tổng kết tháng: Số lượng sự cố đã sửa xong, tỷ lệ đạt yêu cầu, tổng khối lượng vật tư đã sử dụng.
  - Bảng danh sách các vụ việc đã làm xong kèm ảnh trước/sau thu nhỏ để đối chiếu.

#### 23. Trực ban & Trạng thái Đội (`/technician/profile`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Kỹ thuật viên.
- **Mục đích:** Cập nhật trạng thái sẵn sàng nhận việc và liên lạc khẩn cấp về tổng đài IOC.
- **Khối giao diện chính:**
  - Nút bật/tắt: **Sẵn sàng nhận nhiệm vụ** / **Nghỉ ca**.
  - Trạng thái thiết bị công tác và định vị GPS.
  - Nút gọi nhanh hotline hỗ trợ tác chiến IOC.

---

