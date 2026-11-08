# Vòng đời phiếu

Trạng thái, nhãn hiển thị (dùng đúng một nhãn trên mọi màn), người chuyển, màn và nút:
- SUBMITTED "Đã tiếp nhận": công dân gửi ở màn 2.
- TRIAGED "Đã phân loại": hệ thống (AI) tự chuyển sau khi gửi.
- ASSIGNED "Đã giao": điều phối, màn 14 nút "Duyệt & Giao việc".
- REJECTED "Từ chối": điều phối, màn 14 nút "Từ chối tiếp nhận". Công dân thấy ở màn 10 tab "Bị từ chối".
- IN_PROGRESS "Đang xử lý": kỹ thuật viên, màn 20 nút "Bắt đầu xử lý".
- RESOLVED "Đã xử lý": kỹ thuật viên, màn 21 nút "Gửi biên bản".
- CONFIRMED "Đã xác nhận": điều phối, màn 15 nút "Duyệt nghiệm thu".
- CLOSED "Đã đóng": công dân bấm "Xác nhận hài lòng" ở màn 12, hoặc tự đóng sau 3 ngày.
- REOPENED "Mở lại": điều phối bấm "Yêu cầu làm lại" ở màn 15, hoặc công dân chấm 1-2 sao ở màn 12.

SLA tính từ lúc gửi: Khẩn cấp 4 giờ, Cao 12 giờ, Trung bình 24 giờ, Thấp 48 giờ. Gọi mức NORMAL là "Trung bình" ở mọi nơi.
Công dân thấy timeline rút gọn 5 mốc (Tiếp nhận, Phân loại, Giao việc, Đang xử lý, Đã khắc phục). "Đã khắc phục" là nhãn công dân cho RESOLVED và CONFIRMED.
Số "Đã hoàn tất" ở trang chủ và dashboard đếm phiếu CLOSED.