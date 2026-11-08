# Danh sách component (17). Chỉ dùng các component này.

Mọi component hiển thị dữ liệu phải có state: bình thường, đang tải, rỗng, lỗi.

1. Button: Primary đen, Secondary viền, Subtle xám nhạt, Ghost, Danger. Riêng nút hero "Gửi báo cáo" của công dân màu đỏ. Size SM 32 / MD 40 / LG 48. Chữ 1-3 từ.
2. PillTab (SegmentedControl): nền capsule #F4F4F5, mục đang chọn là pill trắng hoặc đen. Chữ 1-2 từ.
3. StatusPill: Khẩn cấp (đỏ đặc kèm icon), Cao, Trung bình, Thấp, Hoàn tất. Bo 999px. Chữ 1-2 từ.
4. MetricBentoCard: số lớn + nhãn nhỏ, có biến thể kèm sparkline hoặc mini bar. Tiêu đề 2-3 từ.
5. IncidentListItem: dạng hàng gọn hoặc dạng card, có ảnh nhỏ. Tiêu đề 3-5 từ, địa chỉ 3-4 từ, thời gian 2 từ. Trạng thái: thường, chọn, quá hạn (viền đỏ mảnh).
6. InputField: text, mật khẩu, textarea, select, ô tìm kiếm bo 999px. Placeholder 2-4 từ. Lỗi tối đa 5 từ.
7. EvidenceUploadCard: trống (chụp hoặc chọn ảnh), đang quét AI, hoàn tất kèm chip "NĐ13 Đã mờ".
8. MapBentoViewport: bản đồ toàn khối hoặc widget nhỏ, ghim sự cố theo màu mức ưu tiên, nút điều khiển chỉ icon.
9. SidebarNav: icon rail 64px (desktop), mở rộng có nhãn, tab bar dưới đáy (mobile). Nhãn 1-2 từ.
10. TopPillNav: thanh pill nổi phía trên cho các màn công khai và công dân.
11. ModalDialog: modal giữa màn hình (desktop), bottom sheet (mobile). Tiêu đề 2-4 từ, 2 nút.
12. SideSheet: panel trượt từ phải để xem chi tiết sự cố (desktop).
13. DataTable: bảng gọn trong card trắng, tiêu đề cột 1-2 từ, nội dung dùng pill và icon.
14. CompareEvidence: ảnh Trước / Sau cạnh nhau kèm chip GPS.
15. Timeline (Stepper): vòng đời phiếu, mốc hiện tại nổi bật, có thời gian.
16. EmptyState, Toast: icon + 1 dòng chữ.
17. IconChip và Avatar: icon trong ô bo 12px, avatar tròn.
