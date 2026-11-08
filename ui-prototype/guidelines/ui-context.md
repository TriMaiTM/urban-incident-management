# Bối cảnh dự án (chỉ phần ảnh hưởng tới giao diện)

Nền tảng web/PWA để công dân Đà Nẵng phản ánh sự cố hạ tầng đô thị, AI tự phân loại, điều phối viên IOC duyệt và giao việc, kỹ thuật viên xử lý, công dân đánh giá kết quả. Phản ánh cũng đến từ Facebook Messenger.
Phạm vi tiếp nhận: Vùng đô thị lõi Đà Nẵng (6 quận nội thành và huyện Hòa Vang). Vị trí ngoài ranh giới thì báo lỗi màu đỏ.

## 4 vai trò
- Công dân: gửi phản ánh, tra cứu tiến độ, đánh giá, khiếu nại.
- Điều phối viên IOC: duyệt kết quả AI, giao việc, giám sát SLA, nghiệm thu. Chỉ dùng desktop 1440px.
- Kỹ thuật viên hiện trường: nhận nhiệm vụ, dẫn đường, nộp minh chứng. Có cả desktop và mobile.
- Quản trị viên: phân tích, người dùng, phân vùng GIS, cấu hình, nhật ký, tích hợp. Chỉ dùng desktop.

## 6 loại sự cố
ROAD_DAMAGE: Hư hỏng mặt đường | FLOODING: Ngập úng | FALLEN_TREE: Cây đổ | GARBAGE: Rác thải | STREETLIGHT: Đèn chiếu sáng | OTHER: Khác

## 4 mức ưu tiên và thời hạn SLA
EMERGENCY Khẩn cấp 4 giờ | HIGH Cao 12 giờ | NORMAL Trung bình 24 giờ | LOW Thấp 48 giờ

## Vòng đời phiếu (nhãn tiếng Việt đề xuất)
SUBMITTED Đã tiếp nhận -> TRIAGED Đã phân loại -> ASSIGNED Đã giao -> IN_PROGRESS Đang xử lý -> RESOLVED Đã xử lý -> CONFIRMED Đã xác nhận -> CLOSED Đã đóng
Nhánh phụ: REJECTED Từ chối, REOPENED Mở lại.

## Quy tắc nghiệp vụ ảnh hưởng giao diện
- Ảnh công khai luôn đã làm mờ mặt và biển số (Nghị định 13/2023). Ảnh gốc chỉ hiện ở màn nội bộ của điều phối. Chip hiển thị: "NĐ13 Đã mờ".
- Số điện thoại người phản ánh luôn ẩn dạng 0905***123 ở màn công khai.
- Sự cố trùng trong bán kính 50m trong 24 giờ: hiện cảnh báo "Trùng lặp 35m", công dân chọn "Tôi cũng gặp" (+1), điều phối viên chọn "Gộp phiếu".
- AI gợi ý loại sự cố, mức ưu tiên, đơn vị xử lý. Người dùng và điều phối viên được sửa lại. Chip hiển thị: "AI gợi ý".
- Nghiệm thu: ảnh trước và sau, kèm kiểm tra GPS, ví dụ "GPS: 12m Đạt" (đạt khi dưới 50m).
- Công dân đánh giá 1-5 sao sau khi hoàn tất.
- Mã phiếu: DN-YYYYMM-NNNN.
