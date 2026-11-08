# Hệ thống tiếp nhận và phân loại sự cố hạ tầng đô thị Đà Nẵng

## Cách làm việc (bắt buộc)
1. Luôn đọc ui-context.md, design-tokens.md và components.md trước khi tạo hoặc sửa bất cứ thứ gì.
2. Khi dựng một màn hình, chỉ đọc file nhóm tương ứng trong screens/ (xem screens/00-index.md để biết màn nào nằm trong file nào). Không đọc các file nhóm khác.
3. Chỉ dùng component trong components.md. Thiếu component thì hỏi, không tự chế.
4. Chỉ dùng màu, cỡ chữ, bo góc, spacing trong design-tokens.md. Không viết giá trị riêng.
5. Không tự thay đổi yêu cầu trong tài liệu. Mâu thuẫn hoặc thiếu thì hỏi.
6. Chỉ sửa những gì liên quan tới yêu cầu hiện tại.

## Hướng thiết kế
Giao diện sinh động, hiện đại, kiểu bento grid: nhiều card bo góc lớn trên nền xám nhạt, không giống dashboard khô cứng.
Bản đồ là khối chính ở các màn điều phối. Chi tiết mở bằng side sheet hoặc bottom sheet, không chuyển trang.
Điều hướng gọn: icon rail hoặc pill nav nổi (desktop), tab bar dưới đáy (mobile).
Chuyển động nhẹ: hover nâng card, sheet trượt, số đếm lên. Không hiệu ứng nặng.

## Ngân sách chữ
Mỗi màn hình: 1 tiêu đề, 1 dòng phụ. Tiêu đề card tối đa 3 từ. Nút 1-3 từ.
Không đoạn mô tả. Helper text chỉ hiện khi có lỗi. Ưu tiên icon, số, chip hơn chữ.
Mỗi card chỉ có 1 chip trạng thái chính, thông tin phụ gộp thành một dòng chữ nhỏ.

## Nội dung
100% tiếng Việt có dấu, văn phong hành chính hiện đại. Không emoji. Không lorem ipsum.
Dữ liệu mẫu dùng địa danh thật ở Đà Nẵng (quận, đường, phường) và mã phiếu dạng DN-202610-0001.
Responsive: Desktop 1440px, Mobile 390px. Màn nào ghi "Desktop & Mobile" phải có cả hai bố cục.

## Quy tắc code (để Extract designs ra layer sạch)
- Mỗi component và mỗi khối lớn là một component React riêng, tên PascalCase rõ nghĩa (ví dụ IncidentCard, MapPanel, SidebarNav).
- Dùng flex hoặc grid cho bố cục. Không dùng absolute positioning trừ ghim trên bản đồ và lớp phủ.
- Mỗi màn hình là một component gốc, đặt tên theo màn (ví dụ ReportScreen).

## Độ phong phú thị giác (bắt buộc)
Ít chữ không có nghĩa là trống. Mỗi màn hình phải có:
- Một khối nhấn làm điểm nhìn đầu tiên: card đen hoặc card gradient đen-đỏ nhẹ, hoặc bản đồ lớn chiếm ưu thế. Không để mọi card cùng trọng lượng.
- Hình ảnh thật hoặc minh họa ở khối chính (ảnh mẫu, bản đồ có tên đường và quận, thumbnail), không dùng khung nét đứt trống làm nội dung chính.
- Số liệu sống: ít nhất một cụm số lớn có đếm lên hoặc sparkline.
- Chuyển động có ý nghĩa: ghim bản đồ nhấp nháy nhẹ, skeleton shimmer khi AI đang quét, card nâng khi hover, bước chuyển mượt giữa các bước.
- Bố cục không đối xứng: card lớn xen card nhỏ, tránh lưới chia đều.
Trạng thái trống phải có minh họa hoặc ví dụ, không chỉ một dòng chữ xám.

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