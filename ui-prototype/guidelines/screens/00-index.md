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

