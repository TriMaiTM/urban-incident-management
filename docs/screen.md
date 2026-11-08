# DANH MỤC & ĐẶC TẢ GIAO DIỆN HỆ THỐNG (DATN-HK10-URBAN-INCIDENT)

Hệ thống Quản lý, Phân loại và Tiếp nhận Sự cố Hạ tầng Đô thị TP. Đà Nẵng gồm **34 màn hình**, chia theo 7 nhóm chức năng và 4 nhóm vai trò.

---

## BẢNG TỔNG MỤC 34 MÀN HÌNH

| STT | Tên Màn hình | Route URL | Vai trò truy cập | Thiết bị (Viewport) |
| :---: | :--- | :--- | :--- | :--- |
| **I** | **PHÂN HỆ CÔNG CỘNG** | | | |
| 1 | Trang chủ & Bản đồ Đô thị | `/` | Công khai | Desktop & Mobile |
| 2 | Báo cáo Hiện trường | `/report` | Công khai | Desktop & Mobile |
| 3 | Tra cứu Tiến độ Xử lý | `/tracking/[code]` | Công khai | Desktop & Mobile |
| 4 | Danh sách Sự cố Đô thị | `/incidents` | Công khai | Desktop & Mobile |
| 5 | Tài liệu Chuẩn mở Open311 | `/developers/open311` | Lập trình viên / Đối tác | Desktop |
| **II** | **XÁC THỰC & DANH TÍNH** | | | |
| 6 | Đăng nhập | `/auth/login` | Mọi vai trò | Desktop & Mobile |
| 7 | Đăng ký Công dân | `/auth/register` | Công dân | Desktop & Mobile |
| 8 | Quên & Đặt lại Mật khẩu | `/auth/forgot-password` | Mọi vai trò | Desktop & Mobile |
| 9 | Hồ sơ Cá nhân & Bảo mật | `/profile` | Mọi vai trò | Desktop & Mobile |
| **III** | **PHÂN HỆ CÔNG DÂN** | | | |
| 10 | Phản ánh của Tôi | `/citizen/my-reports` | Công dân | Desktop & Mobile |
| 11 | Chi tiết Phản ánh Cá nhân | `/citizen/reports/[id]` | Công dân | Desktop & Mobile |
| 12 | Đánh giá & Khiếu nại | `/citizen/feedback/[code]`| Công dân | Desktop & Mobile |
| 13 | Thông báo Cá nhân | `/citizen/notifications` | Công dân | Desktop & Mobile |
| **IV** | **ĐIỀU PHỐI VIÊN IOC** | | | |
| 14 | Bàn Tác chiến & Điều phối | `/dispatcher/command-center`| Điều phối viên IOC | Desktop 1440px |
| 15 | Bàn Nghiệm thu & Đối chiếu Minh chứng | `/dispatcher/verify` | Điều phối viên IOC | Desktop 1440px |
| 16 | Giám sát Hạn Xử lý SLA | `/dispatcher/sla-watch` | Điều phối viên IOC | Desktop 1440px |
| 17 | Bản đồ Điều động Đội Cơ động | `/dispatcher/field-units` | Điều phối viên IOC | Desktop 1440px |
| 18 | Sổ bộ & Lịch sử Điều phối | `/dispatcher/incidents` | Điều phối viên IOC | Desktop 1440px |
| **V** | **KỸ THUẬT VIÊN HIỆN TRƯỜNG** | | | |
| 19 | Danh sách Nhiệm vụ Phân công | `/technician/tasks` | Kỹ thuật viên | Desktop & Mobile |
| 20 | Chi tiết Nhiệm vụ & Dẫn đường | `/technician/tasks/[id]` | Kỹ thuật viên | Desktop & Mobile |
| 21 | Báo cáo Nghiệm thu & Nộp Minh chứng | `/technician/tasks/[id]/resolve` | Kỹ thuật viên | Desktop & Mobile |
| 22 | Nhật ký Công tác & Vật tư | `/technician/history` | Kỹ thuật viên | Desktop & Mobile |
| 23 | Trực ban & Trạng thái Đội | `/technician/profile` | Kỹ thuật viên | Desktop & Mobile |
| **VI** | **QUẢN TRỊ & PHÂN TÍCH** | | | |
| 24 | Dashboard Chỉ số & GIS Heatmap | `/admin/analytics` | Quản trị viên / Lãnh đạo | Desktop 1440px |
| 25 | Quản lý Người dùng & Phân quyền | `/admin/users` | Quản trị viên | Desktop 1440px |
| 26 | Quản lý Phân vùng Không gian GIS | `/admin/zones` | Quản trị viên GIS | Desktop 1440px |
| 27 | Cấu hình Danh mục, SLA & Đơn vị | `/admin/settings` | Quản trị viên | Desktop 1440px |
| 28 | Nhật ký Kiểm toán An ninh | `/admin/audit-logs` | Quản trị viên | Desktop 1440px |
| 29 | Quản lý Kênh Ngoại vi & Webhook | `/admin/integrations` | Quản trị viên Kỹ thuật | Desktop 1440px |
| **VII** | **NGOẠI LỆ & HỆ THỐNG** | | | |
| 30 | 404 Không tìm thấy Trang | `/404` | Mọi vai trò | Desktop & Mobile |
| 31 | 403 Từ chối Truy cập | `/403` | Mọi vai trò | Desktop & Mobile |
| 32 | 500 Lỗi Máy chủ | `/500` | Mọi vai trò | Desktop & Mobile |
| 33 | Màn hình Bảo trì Định kỳ | `/maintenance` | Mọi vai trò | Desktop & Mobile |
| 34 | Màn hình Ngoại tuyến Mất mạng | `/offline` | Mọi vai trò | Desktop & Mobile |

---

## CHI TIẾT ĐẶC TẢ TỪNG MÀN HÌNH

---

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

### NHÓM II: XÁC THỰC & DANH TÍNH

#### 6. Đăng nhập (`/auth/login`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Mọi vai trò.
- **Mục đích:** Xác thực danh tính và chuyển hướng đúng không gian làm việc.
- **Khối giao diện chính:**
  - Tab Công dân: Đăng nhập Google hoặc Số điện thoại/OTP.
  - Tab Cán bộ / Kỹ thuật viên: Tên đăng nhập/Email công vụ + Mật khẩu.
  - Nút chính: **Đăng nhập**.

#### 7. Đăng ký Công dân (`/auth/register`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Công dân tạo tài khoản mới.
- **Mục đích:** Tạo tài khoản cá nhân để lưu giữ và quản lý lịch sử phản ánh.
- **Khối giao diện chính:**
  - 3 Ô nhập liệu: Họ tên, Số điện thoại (xác thực OTP), Mật khẩu.
  - Nút chính: **Đăng ký tài khoản**.

#### 8. Quên & Đặt lại Mật khẩu (`/auth/forgot-password`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Người dùng quên mật khẩu.
- **Mục đích:** Khôi phục mật khẩu tài khoản qua mã OTP.
- **Khối giao diện chính:**
  - Nhập SĐT/Email $\rightarrow$ Nhập mã OTP 6 số $\rightarrow$ Nhập mật khẩu mới.

#### 9. Hồ sơ Cá nhân & Bảo mật (`/profile`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Người dùng đã đăng nhập.
- **Mục đích:** Xem thông tin cá nhân và đổi mật khẩu.
- **Khối giao diện chính:**
  - Xem/Sửa họ tên, ảnh đại diện, số điện thoại.
  - Form đổi mật khẩu tài khoản.
  - Nút: **Đăng xuất**.

---

### NHÓM III: PHÂN HỆ CÔNG DÂN

#### 10. Phản ánh của Tôi (`/citizen/my-reports`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Công dân đã đăng nhập.
- **Mục đích:** Quản lý toàn bộ các phản ánh do chính mình gửi lên hệ thống.
- **Khối giao diện chính:**
  - Bộ lọc tab: Đang xử lý, Đã hoàn tất, Bị từ chối.
  - Danh sách thẻ phiếu: Ảnh thu nhỏ, mã phiếu, ngày gửi, địa chỉ, tình trạng xử lý.
  - Bấm vào thẻ để mở trang chi tiết.

#### 11. Chi tiết Phản ánh Cá nhân (`/citizen/reports/[id]`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Công dân chủ phiếu.
- **Mục đích:** Theo dõi chi tiết tiến trình và gửi thêm thông tin bổ sung cho điều phối viên.
- **Khối giao diện chính:**
  - Toàn bộ thông tin tiến độ, bản đồ và ảnh hiện trường.
  - Khung nhắn tin: Gửi thêm mô tả hoặc ảnh bổ sung cho IOC.
  - Nút: **Hủy phản ánh** (chỉ hiển thị khi phiếu chưa được tiếp nhận xử lý).

#### 12. Đánh giá & Khiếu nại (`/citizen/feedback/[code]`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Công dân sau khi sự cố được báo đã sửa xong.
- **Mục đích:** Nghiệm thu kết quả hoặc gửi khiếu nại yêu cầu làm lại.
- **Khối giao diện chính:**
  - Ảnh đối chiếu Trước / Sau để kiểm tra.
  - Đánh giá: Chọn từ 1 đến 5 sao.
  - Khung khiếu nại: Tự mở ra khi chọn 1-2 sao kèm ô nạp ảnh chụp bằng chứng chưa đạt.
  - Nút: **Xác nhận hài lòng** hoặc **Gửi khiếu nại làm lại**.

#### 13. Thông báo Cá nhân (`/citizen/notifications`)
- **Thiết bị:** Desktop & Mobile.
- **Người dùng:** Công dân.
- **Mục đích:** Nhận tin cập nhật trạng thái phiếu và cảnh báo đô thị khẩn cấp từ IOC.
- **Khối giao diện chính:**
  - Danh sách thông báo theo thứ tự thời gian.
  - Bấm vào thông báo dẫn thẳng đến phiếu sự cố tương ứng.

---

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
