# Kế hoạch Thiết kế Màn hình 4: Nghiệm thu sự cố & Báo cáo hiện trường trên Figma

> **Trạng thái:** ĐÃ LƯU TRỮ (Archived - Đưa về giai đoạn chuẩn bị cho Đợt Thiết kế lại toàn diện V2)  
> **Ghi chú quyết định:** Toàn bộ hệ thống UI/UX được quy hoạch lại từ đầu thành danh mục 34 màn hình tinh gọn tại [docs/screen.md](file:///d:/HK10/DATN/docs/screen.md). Màn hình 4 sẽ được thiết kế lại ở Giai đoạn 4 & 5 cùng với toàn bộ các màn hình khác.  
> **Route quy hoạch mới:**  
> - 4A: `/dispatcher/verify` (Desktop 1440px - Bàn nghiệm thu & Đối chiếu minh chứng)  
> - 4B: `/technician/tasks/[id]/resolve` (Desktop & Mobile - Báo cáo nghiệm thu & Nộp minh chứng)  
> **Tài liệu tham chiếu:** [docs/PROJECT_CONTEXT_HANDOFF.md](file:///d:/HK10/DATN/docs/PROJECT_CONTEXT_HANDOFF.md), [docs/screen.md](file:///d:/HK10/DATN/docs/screen.md), [docs/spec.md](file:///d:/HK10/DATN/docs/spec.md)  

---

## 1. Mục tiêu & Phạm vi (Goal & Scope)

### 1.1. Mục tiêu
Thiết kế hoàn chỉnh **Màn hình 4: Nghiệm thu sự cố & Báo cáo hiện trường** trên Figma (Page "Screens", kênh TalkToFigma `oennp8oe`), đáp ứng trọn vẹn nghiệp vụ chuyển đổi trạng thái `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CONFIRMED` của máy trạng thái State Machine và tuân thủ Nghị định 13/2023/NĐ-CP.

### 1.2. Hai biến thể vai trò cốt lõi
1. **Biến thể 4A – Cán bộ Điều phối IOC Nghiệm thu Đối chiếu (Desktop 1440px):**
   - Vị trí: `x = 1640, y = 5500` (Node: `147:1688`, w: 1440, h: 1020).
   - Tái sử dụng Header chuẩn IOC (`147:1689`, Avatar KTV/ĐP `147:1694`, Tìm kiếm `147:1691`).
   - Cột Trái (`147:1698`, 760px):
     - Breadcrumb & Ticket Header (Mã phiếu `DN-202610-0001`, Badge `CHỜ NGHIỆM THU` `147:1701`).
     - Card 1: Khối đối chiếu minh chứng hiện trường Trước / Sau (`147:1704`, 760x360px), Trước (`147:1707`, che mờ NĐ13 `147:1713`) vs Sau (`147:1717`, thảm nhựa phẳng `147:1721`), kèm banner GPS sai lệch 12.4m hợp lệ (`147:1727`).
     - Card 2: Biên bản xử lý kỹ thuật (`147:1730`, 760x350px): Biện pháp C12.5 (`147:1733`), Vật tư xe lu 4T (`147:1736`), Thời gian 2h15' (`147:1739`), Ghi chú hiện trường (`147:1743`), Ký số PKI SHA256 (`147:1745`).
     - Card 3: Thanh Hành động (`147:1751`, 760x76px):
       - Nút Primary đậm: `"Xác nhận nghiệm thu & Đóng phiếu"` (`147:1752`, solid `#15803d`).
       - Nút Outline cảnh báo: `"Yêu cầu xử lý lại (Không đạt)"` (`147:1754`, `#b91c1c` / bg `#fef2f2`).
       - Nút Outline phụ: `"Lưu nháp biên bản"` (`147:1756`, border `#cbd5e1`).
   - Cột Phải (`147:1758`, 576px):
     - Card 1: Bản đồ giám sát GIS 50m (`147:1759`, 576x490px): Bản đồ canvas (`147:1762`), Sông Hàn (`147:1763`), Bạch Đằng (`147:1765`), Vòng kiểm soát R=50m (`147:1768`), Pin gốc A (`147:1770`), Pin nghiệm thu B (`147:1772`), Tag khoảng cách 12.4m (`147:1774`), Bảng thông số tọa độ WGS84 PostGIS (`147:1776`).
     - Card 2: Tiến độ SLA & Đơn vị phụ trách (`147:1782`, 576x382px): Thẻ SLA vượt tiến độ 79% (`147:1785`), Thanh tiến độ xanh (`147:1787`, fill `147:1788`), Đơn vị Cty CP Cầu đường (`147:1791`), Lịch sử tác chiến Audit Trail (`147:1796`).

2. **Biến thể 4B – Kỹ thuật viên Hiện trường Nộp Minh chứng (Mobile 390x844):**
   - Vị trí: `x = 3080, y = 1078` (Node: `147:1801`, w: 390, h: 844).
   - Top Bar Mobile (`147:1802`, h: 52px): Nút Back `<` (`147:1803`), Tiêu đề `"Báo cáo hoàn tất sự cố"` (`147:1805`), Badge mã phiếu `DN-202610-0001` (`147:1806`).
   - Scrollable Body (`147:1808`, h: 728px):
     - Card 1: Thẻ tóm tắt thông tin sự cố (`147:1809`, h: 104px): Sạt lở lún nứt, Badge `ĐANG XỬ LÝ` (`147:1811`), 120 Bạch Đằng, hạn SLA 24h.
     - Card 2: Chụp ảnh minh chứng hoàn tất `AFTER_PROOF` (`147:1816`, h: 272px): Khung preview (`147:1818`), Thảm nhựa (`147:1819`), Badge Đã chụp (`147:1821`), Badge GPS 12.4m (`147:1823`), Nút chụp lại (`147:1826`), Banner kiểm soát GPS <= 50m (`147:1828`).
     - Card 3: Biểu mẫu biên bản hiện trường (`147:1830`, h: 248px): 3 trường (Biện pháp `147:1833`, Vật tư `147:1836`, Ghi chú `147:1839`), Thông tin ký số PKI & Tablet (`147:1841`, `147:1842`).
     - Nút hành động chính: `"GỬI BIÊN BẢN NGHIỆM THU (CHUYỂN RESOLVED)"` (`147:1843`, solid `#1d4ed8`, h: 48px).
   - Bottom Navigation Bar (`147:1845`, h: 64px): Tab Nhiệm vụ Active (`147:1846`), Bản đồ (`147:1849`), Cá nhân (`147:1851`).

---

## 2. Quy tắc Bất biến Bắt buộc Tuân thủ (Design Invariants)

1. **Toán học pixel & Bố cục:**
   - 4A Desktop: Chiều rộng 1440px cố định, Cột trái 760px, Cột phải 576px, Gap 24px, Padding lề 40px, Top 76px.
   - 4B Mobile: Chiều rộng 390px, cao 844px, padding lề 16px, Card rộng 358px.
   - Mọi Card: Nền `#ffffff`, viền `#e2e8f0` 1px, bo góc 8px.
2. **Typography & Màu sắc:**
   - 100% tiếng Việt có dấu, KHÔNG emoji.
   - 1 nút Primary duy nhất cho mỗi màn hình (Desktop: Nút Nghiệm thu xanh `#15803d`; Mobile: Nút Gửi xanh `#1d4ed8`).
3. **Pháp lý & Dữ liệu:**
   - Ảnh Before/After có nhãn NĐ13/2023.
   - Kiểm tra định vị GPS trong bán kính 50m (PostGIS `ST_DWithin` trả về 12.4m hợp lệ).

---

## 3. Các bước Triển khai Tuần tự (Ordered Steps)

### [x] Bước 1: Dựng khung Shell & Cấu trúc gốc Màn hình 4A (Desktop 1440px)
- Tạo Frame `Screen: Nghiệm thu & Đối chiếu Minh chứng (/dispatcher/verify)` tại `x = 1640, y = 5500` (`147:1688`).
- Tích hợp Top Bar (`147:1689`, Logo `147:1690`, Search Box `147:1691`, Avatar & User Profile `147:1693`).
- Phân chia bố cục 2 cột: Cột Trái 760px (`147:1698`), Cột Phải 576px (`147:1758`).

### [x] Bước 2: Thiết kế Cột Trái Màn hình 4A (Minh chứng Trước/Sau & Biên bản Kỹ thuật)
- Ticket Header: Breadcrumb (`147:1699`), Tiêu đề phiếu (`147:1700`), Badge `CHỜ NGHIỆM THU` (`147:1701`), Metadata (`147:1703`).
- Card 1 (Đối chiếu Before/After `147:1704`): Box Ảnh Trước (`147:1707`), Mock sụt lún & làm mờ NĐ13 (`147:1710` - `147:1714`), Box Ảnh Sau (`147:1717`), Mock thảm nhựa C12.5 (`147:1721`), Banner kiểm tra PostGIS 50m (`147:1727`).
- Card 2 (Biên bản xử lý kỹ thuật `147:1730`): 3 thông số kỹ thuật (`147:1733`, `147:1736`, `147:1739`), Ghi chú hoàn trả (`147:1743`), Ký số PKI KTV (`147:1745`).

### [x] Bước 3: Thiết kế Cột Phải & Thanh Hành động Bottom Action Bar Màn hình 4A
- Card 1: Bản đồ Goong Maps / GIS 50m (`147:1759`): Khung canvas (`147:1762`), Sông Hàn (`147:1763`), Bạch Đằng (`147:1765`), Vòng đệm 50m (`147:1768`), Pin A (`147:1770`), Pin B (`147:1772`), Khoảng cách 12.4m (`147:1774`), Bảng thông số tọa độ WGS84 (`147:1776`).
- Card 2: Tiến độ SLA & Đơn vị phụ trách (`147:1782`): Banner SLA hoàn thành sớm 79% (`147:1785`), Thanh tiến độ (`147:1787`), Thông tin Cty CP Cầu đường (`147:1791`), Lịch sử tác chiến Audit Log (`147:1796`).
- Bottom Action Bar (`147:1751`): Nút Xác nhận nghiệm thu (`147:1752`, solid `#15803d`), Nút Yêu cầu xử lý lại (`147:1754`), Nút Lưu nháp (`147:1756`).

### [x] Bước 4: Thiết kế Màn hình 4B dành cho Kỹ thuật viên (Mobile 390x844)
- Tạo Frame `Screen: Báo cáo Nghiệm thu Hiện trường (/technician/tasks/[id]/resolve)` tại `x = 3080, y = 1078` (`147:1801`).
- Header mobile (`147:1802`): Nút quay lại (`147:1803`), Tiêu đề (`147:1805`), Badge phiếu (`147:1806`).
- Thẻ thông tin sự cố (`147:1809`): Mã sự cố, Badge `ĐANG XỬ LÝ` (`147:1811`), 120 Bạch Đằng.
- Khung nộp ảnh `AFTER_PROOF` (`147:1816`): Preview ảnh sau xử lý (`147:1818`), Nút chụp lại (`147:1826`), Banner GPS hợp lệ 12.4m (`147:1828`).
- Form biên bản hiện trường (`147:1830`): 3 trường thông số + Ký số PKI KTV.
- Nút gửi hoàn tất (`147:1843`): `"GỬI BIÊN BẢN NGHIỆM THU (CHUYỂN RESOLVED)"` (solid `#1d4ed8`).
- Bottom Navigation Bar (`147:1845`): Tab Nhiệm vụ Active, Bản đồ, Cá nhân.

### [x] Bước 5: Kiểm toán toán học & Nghiệm thu Trực quan
- Xuất PNG độ nét cao cho cả 4A (`147:1688`) và 4B (`147:1801`).
- Kiểm tra 0 lỗi tràn lề, 0 emoji, typography 100% tiếng Việt có dấu, tuân thủ chặt chẽ tỷ lệ màu GovTech IOC Đà Nẵng và chuẩn PostGIS 50m / NĐ13. Trạng thái: PASS.
