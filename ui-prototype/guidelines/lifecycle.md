# Vòng đời phiếu

SUBMITTED "Đã tiếp nhận": công dân gửi ở màn 2.
TRIAGED "Đã phân loại": hệ thống tự chuyển sau khi gửi (AI phân loại).
ASSIGNED "Đã giao": điều phối, màn 14 nút "Duyệt & Giao việc".
REJECTED "Từ chối": điều phối, màn 14 nút "Từ chối tiếp nhận", bắt buộc nhập lý do.
IN_PROGRESS "Đang xử lý": kỹ thuật viên, màn 20 nút "Bắt đầu xử lý".
RESOLVED "Đã xử lý": kỹ thuật viên, màn 21 nút "Gửi biên bản".
CONFIRMED "Đã xác nhận": điều phối, màn 15 nút "Duyệt nghiệm thu".
CLOSED "Đã đóng": công dân, màn 12 nút "Xác nhận hài lòng". Số sao 1-5 là tùy chọn, chỉ để lưu điểm.
REOPENED "Mở lại": điều phối ở màn 15 nút "Yêu cầu làm lại" (từ RESOLVED), hoặc công dân ở màn 12 nút "Gửi khiếu nại" (từ CONFIRMED, bắt buộc nhập lý do). Kỹ thuật viên bấm "Bắt đầu xử lý" thì REOPENED chuyển lại IN_PROGRESS.

Công dân chỉ đánh giá và khiếu nại khi phiếu đang ở CONFIRMED.
SLA: Khẩn cấp 4 giờ, Cao 12 giờ, Trung bình 24 giờ, Thấp 48 giờ, tính từ lúc tạo phiếu theo mức ưu tiên hiện tại. Mở lại thì tính hạn mới từ lúc mở lại.
Công dân thấy timeline rút gọn 5 mốc: Tiếp nhận, Phân loại, Giao việc, Đang xử lý, Đã khắc phục. "Đã khắc phục" gộp RESOLVED và CONFIRMED.
Số "Đã hoàn tất" ở trang chủ và dashboard đếm phiếu CLOSED. Mức NORMAL luôn gọi là "Trung bình".
