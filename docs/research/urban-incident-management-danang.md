# Nghiên cứu và Phát triển Nền tảng Tiếp nhận, Phân loại và Quản lý Sự cố Hạ tầng Đô thị (Phạm vi TP. Đà Nẵng)

> **Tài liệu nghiên cứu kỹ thuật & tiền khả thi (Pre-implementation Research Report)**  
> **Ngữ cảnh:** Đồ án tốt nghiệp (DATN / Capstone Project - HK10)  
> **Ngày thực hiện:** 06/10/2026  
> **Phạm vi địa lý:** Thành phố Đà Nẵng (6 quận nội thành & 2 huyện)

---

## 1. Ý tưởng và Các giả định ban đầu (Idea & Assumptions)

### 1.1 Tái cấu trúc bài toán (Problem Restatement)
* **Vấn đề cốt lõi:** Người dân tại Đà Nẵng gặp khó khăn trong việc báo cáo nhanh các sự cố hạ tầng đô thị (ngập úng mùa mưa bão, sụt lún/ổ gà, cây xanh gãy đổ, ùn ứ rác thải, hỏng đèn chiếu sáng); cán bộ điều hành (IOC/Sở/Quận/Phường) bị quá tải do tiếp nhận đơn lẻ, xử lý thủ công, thiếu cơ chế tự động phân loại, thiếu lọc trùng lặp khi có sự cố diện rộng và khó giám sát cam kết thời hạn xử lý (SLA).
* **Đối tượng sử dụng:** 
  1. *Công dân/Du khách Đà Nẵng:* Người gửi phản ánh hiện trường kèm ảnh/GPS, theo dõi tiến độ công khai và đánh giá kết quả xử lý.
  2. *Cán bộ điều phối (Tổng đài 1022 / Trung tâm IOC):* Tiếp nhận, phê duyệt đề xuất phân loại tự động của hệ thống, chuyển tiếp sự cố đến đúng đơn vị quản lý chuyên ngành theo ranh giới hành chính.
  3. *Đơn vị quản lý & Đội ngũ hiện trường (Sở GTVT, Sở Xây dựng, Cty Cây xanh, Cty Môi trường, Cty Thoát nước, UBND Quận/Huyện):* Tiếp nhận phiếu công việc (ticket), điều động công nhân sửa chữa, cập nhật ảnh chứng minh kết quả xử lý tại hiện trường.
* **Ngữ cảnh & Ràng buộc:**
  * Giới hạn địa bàn: **Vùng Đô thị Trung tâm Thí điểm (Core Urban Pilot Zone)** - tương ứng địa giới hành chính đô thị Đà Nẵng truyền thống (6 quận: Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Liên Chiểu, Cẩm Lệ và huyện Hòa Vang).
  * Luận điểm khoa học về giới hạn phạm vi (Scope Delimitation): Tránh nguy cơ phình to bài toán khi địa giới hành chính liên kết vùng/sáp nhập mở rộng diện tích ra toàn tỉnh; tập trung chuyên sâu vào giải quyết bài toán "Hạ tầng Đô thị" (mật độ đô thị hóa > 87%, hạ tầng đồng bộ) thay vì bị dàn trải sang hạ tầng nông thôn, lâm nghiệp, vùng sâu vùng xa.
  * Tính mở rộng kiến trúc (Extensibility): Hệ thống áp dụng cơ chế Hàng rào địa lý (Geo-fencing) trong CSDL PostGIS. Khi vùng thí điểm thành công, việc mở rộng sang các khu vực đô thị khác (Hội An, Điện Bàn, Tam Kỳ...) chỉ cần nạp thêm GeoJSON ranh giới mà không cần thay đổi mã nguồn.
  * Ràng buộc nguồn lực: Nhóm 2 sinh viên làm đồ án tốt nghiệp, thời gian 3-4 tháng, ngân sách 0đ (ưu tiên open-source, API free-tier, cloud credits).

### 1.2 Giả định (Assumptions)
* `[Inference]` Hệ thống không thay thế pháp lý toàn diện của hệ thống Cổng Góp ý 1022 Đà Nẵng hay Danang Smart City hiện tại, mà đóng vai trò là giải pháp công nghệ thế hệ mới (Next-Gen Prototype) chứng minh tính khả thi của việc ứng dụng AI Multi-modal, GIS không gian và tự động hóa điều phối sự cố có thể tích hợp qua API chuẩn mở (như Open311).
* `[Inference]` Người dân sử dụng smartphone có kết nối Internet (4G/5G/Wifi) và GPS để chụp ảnh tại vị trí xảy ra sự cố.
* `[Inference]` Cơ quan chuyên trách tại Đà Nẵng phân định theo danh mục sự cố: Giao thông & mặt đường (Sở GTVT/Cty Quản lý Cầu đường); Ngập úng & cống rãnh (Cty Thoát nước & Xử lý nước thải Đà Nẵng); Cây xanh (Cty Công viên - Cây xanh); Rác thải (Cty CP Môi trường Đô thị); Chiếu sáng (Cty Chiếu sáng công cộng); Trật tự đô thị & lấn chiếm (UBND Phường/Quận).

---

## 2. Câu hỏi nghiên cứu (Research Questions)

1. **Hiện trạng giải pháp:** Đà Nẵng và các đô thị tại Việt Nam (Huế, Hà Nội) cùng các nền tảng quốc tế (FixMyStreet, Mark-a-Spot, OneService Singapore) đang tiếp nhận và quản lý phản ánh hiện trường ra sao?
2. **Quy trình & Nhu cầu người dùng:** Vòng đời (lifecycle) chuẩn của một sự cố hạ tầng từ lúc phát hiện, báo cáo, phân loại, giải quyết đến xác thực hiện trường gồm những bước nào?
3. **Tính năng bắt buộc (Table Stakes) vs. Tính năng tạo khác biệt (Differentiators):** Đâu là những tính năng cơ bản bắt buộc phải có, và tính năng nào (AI, chống trùng lặp, SLA realtime) giúp nền tảng giải quyết được các nút thắt cổ chai thực tế?
4. **Giải pháp AI & Tự động hóa phân loại:** Mô hình Computer Vision và NLP/LLM nào khả thi để vừa nhận diện ảnh khuyết tật hạ tầng (ổ gà, rác, ngập, cây đổ), vừa trích xuất thực thể và gán nhãn thẩm quyền cơ quan xử lý tiếng Việt?
5. **Cơ chế lọc trùng lặp đa phương thức (Multi-modal Deduplication):** Làm thế nào để gom cụm không gian - thời gian (Spatial-Temporal Clustering) kết hợp so khớp ngữ nghĩa ảnh/văn bản khi có hàng chục người cùng báo cáo một vụ ngập lụt/cây đổ?
6. **Kiến trúc GIS & Bản đồ mở:** Lựa chọn nền tảng bản đồ nào (Leaflet, MapLibre GL, OpenStreetMap, Goong Maps, Mapbox) tối ưu về chi phí (tiệm cận 0đ), độ chính xác địa chỉ tại Đà Nẵng và hiệu năng hiển thị heatmap sự cố?
7. **Pháp lý, Quyền riêng tư & Đánh giá hiệu quả:** Làm thế nào để tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (ẩn danh thông tin người báo, làm mờ khuôn mặt/biển số xe trong ảnh), và hệ thống đo lường hiệu quả (KPI/SLA) như thế nào?

---

## 3. Khảo sát bức tranh giải pháp hiện có (Landscape: Existing Solutions)

### 3.1 Cổng Góp ý 1022 & Danang Smart City (Đà Nẵng, Việt Nam)
* **Tổng quan:** Hệ thống tiếp nhận phản ánh chính thức của UBND TP. Đà Nẵng qua cổng website [gopy.danang.gov.vn](https://gopy.danang.gov.vn) và app Danang Smart City `[Verified - dx.gov.vn, 2026]`.
* **Đối tượng:** Toàn bộ công dân, tổ chức và du khách tại Đà Nẵng.
* **Điểm mạnh:** Độ bao phủ pháp lý tuyệt đối; liên thông trực tiếp đến hơn 100 cơ quan, sở ban ngành, quận huyện, xã phường trên toàn thành phố `[Verified - danang.gov.vn, 2026]`.
* **Hạn chế & Điểm nghẽn:**
  * Người dùng phải tự chọn danh mục hoặc điều phối viên tại Trung tâm IOC phải đọc và phân loại thủ công `[Inference]`.
  * Khi xảy ra mưa bão hoặc sự cố lớn, hệ thống nhận nhiều phản ánh trùng lặp cho cùng một điểm ngập hoặc cây đổ, gây lãng phí nguồn lực kiểm tra hiện trường `[Inference]`.
  * Thời hạn xử lý quy định từ 1 ngày (khẩn cấp) đến 10 ngày làm việc (thông thường), khó đo lường tự động SLA chi tiết từng khâu thao tác `[Verified - danang.gov.vn, 2026]`.

### 3.2 Hệ thống Phản ánh Hiện trường Hue-S (Thừa Thiên Huế, Việt Nam)
* **Tổng quan:** Tính năng lõi trên nền tảng Smart City Hue-S, được xem là mô hình thành công điển hình nhất tại Việt Nam trong việc tiếp nhận và xử lý phản ánh đô thị `[Verified - dx.gov.vn, mst.gov.vn, 2026]`.
* **Đối tượng:** Người dân và chính quyền tỉnh Thừa Thiên Huế.
* **Điểm mạnh:** Quy trình minh bạch 5 bước khép kín (Gửi -> IOC Tiếp nhận & phân phối -> Xử lý & chụp ảnh chứng minh -> Công khai kết quả -> Người dân đánh giá hài lòng/không hài lòng) `[Verified - hue.gov.vn, 2026]`. Thời gian xử lý quy chuẩn không quá 7 ngày làm việc `[Verified - hue.gov.vn, 2026]`.
* **Hạn chế:** Phụ thuộc vào quy trình phân luồng con người tại HueIOC; tính năng gợi ý trùng lặp trước khi gửi chưa hỗ trợ phát hiện tự động bằng mô hình thị giác máy tính `[Inference]`.

### 3.3 iHanoi (Hà Nội, Việt Nam)
* **Tổng quan:** Ứng dụng công dân số của Thủ đô Hà Nội, triển khai tính năng phản ánh hiện trường tích hợp xác thực VNeID `[Verified - baodautu.vn, 2026]`.
* **Điểm mạnh:** Tiếp nhận phản ánh phân cấp rõ rệt; quy định thời gian tiếp nhận trong vòng 8 giờ làm việc, xử lý khẩn cấp trong vòng 4 giờ `[Verified - baodautu.vn, tienphong.vn, 2026]`.
* **Hạn chế:** Mới tập trung vào giao diện tiếp nhận cơ bản, chưa công bố cơ chế mở rộng tích hợp Open311 API cho các bên thứ ba khai thác `[Inference]`.

### 3.4 FixMyStreet (mySociety, Vương quốc Anh / Toàn cầu)
* **Tổng quan:** Nền tảng mã nguồn mở tiên phong về báo cáo sự cố đường phố và hạ tầng công cộng [github.com/mysociety/fixmystreet](https://github.com/mysociety/fixmystreet) `[Verified - fixmystreet.org, 2026]`.
* **Công nghệ:** Backend Perl (Catalyst Framework), PostgreSQL/PostGIS, frontend HTML/JS và Cordova mobile app `[Verified - fixmystreet.org, github.com, 2026]`. Giấy phép AGPLv3, hơn 620 stars trên GitHub `[Verified - github.com, 2026]`.
* **Điểm mạnh:** Kiến trúc chuẩn hóa theo giao thức Open311; tích hợp bản đồ số cho phép công dân cắm cờ sự cố trực tiếp; định tuyến theo ranh giới hành chính hội đồng địa phương (councils) `[Verified - fixmystreet.org, 2026]`.
* **Hạn chế:** Stack công nghệ Perl/Catalyst đã cũ, khó tuyển dụng và bảo trì trong các dự án hiện đại; thiếu mô hình AI Computer Vision để tự động nhận dạng tổn thất hạ tầng từ ảnh `[Inference]`.

### 3.5 Mark-a-Spot (Đức / Toàn cầu)
* **Tổng quan:** Nền tảng mã nguồn mở civic issue-tracking hiện đại dành cho chính quyền đô thị [github.com/markaspot/mark-a-spot](https://github.com/markaspot/mark-a-spot) `[Verified - mark-a-spot.com, 2026]`.
* **Công nghệ:** Backend Drupal 11 (PHP), Frontend Nuxt.js (Vue.js PWA), chuẩn Open311 GeoReport v2, giấy phép GPL-2.0+ `[Verified - github.com, 2026]`.
* **Điểm mạnh:** Hỗ trợ PWA mượt mà; tuân thủ đầy đủ Open311 Server & Client; tích hợp AI pipeline hỗ trợ phân loại ảnh và gợi ý mô tả sự cố cho người dân `[Verified - mark-a-spot.com, 2026]`.
* **Hạn chế:** Cấu hình và mở rộng module Drupal 11 đòi hỏi chuyên môn CMS cao; tính năng định tuyến hành chính chuyên sâu cho ngữ cảnh phân cấp Việt Nam (Sở - Quận - Phường) chưa có sẵn `[Inference]`.

### 3.6 OneService (Singapore)
* **Tổng quan:** Nền tảng tiếp nhận phản ánh dịch vụ đô thị hợp nhất của Singapore do Municipal Services Office (MSO) và GovTech phát triển [tech.gov.sg](https://www.tech.gov.sg) `[Verified - tech.gov.sg, 2026]`.
* **Công nghệ & Kiến trúc:** Ứng dụng mô hình AI 3 tầng phát triển bởi GovTech Data Science Division `[Verified - tech.gov.sg, 2026]`:
  1. *Case Type Classifier:* Phân loại bản chất sự cố từ văn bản/ảnh.
  2. *Case Details Extractor:* Trích xuất thực thể địa điểm, thời gian, mức độ nghiêm trọng.
  3. *Agency Classifier:* Tự động định tuyến đến đúng 1 trong 10 cơ quan công quyền hoặc 19 Town Councils dựa trên vị trí GPS và nội dung.
* **Điểm mạnh:** Chuẩn mực toàn cầu về tự động hóa điều phối sự cố hạ tầng; loại bỏ hoàn toàn việc công dân phải tự tìm cơ quan phụ trách; hỗ trợ cả Chatbot NLP tương tác trên WhatsApp/Telegram `[Verified - tech.gov.sg, 2026]`.
* **Hạn chế:** Hệ thống đóng (proprietary) của chính phủ Singapore, phụ thuộc hạ tầng đám mây và nguồn lực kỹ thuật rất lớn `[Inference]`.

### 3.7 SeeClickFix / CivicPlus 311 CRM (Hoa Kỳ)
* **Tổng quan:** Nền tảng thương mại 311 CRM hàng đầu tại Mỹ dành cho chính quyền thành phố [civicplus.com](https://www.civicplus.com) `[Verified - civicplus.com, 2026]`.
* **Điểm mạnh:** Cơ chế **Pre-Submission Duplicate Detection** nổi bật: ngay khi người dân định vị và chụp ảnh, hệ thống hiển thị danh sách các sự cố lân cận đã được báo cáo và gợi ý bấm "Tôi cũng gặp sự cố này" (+1 / Follow) thay vì tạo phiếu trùng `[Verified - civicplus.com, 2026]`.
* **Hạn chế:** Bản quyền phần mềm thương mại đắt đỏ (hàng chục nghìn USD/năm), không khả thi cho đồ án sinh viên hoặc triển khai mở `[Inference]`.

### 3.8 Chuẩn Mở Open311 (GeoReport v2 API)
* **Tổng quan:** Chuẩn API mở quốc tế do Open311.org xây dựng, định nghĩa các endpoint chuẩn (`GET /services`, `POST /requests`, `GET /requests/{id}`) để đồng bộ hóa dữ liệu sự cố công cộng giữa ứng dụng di động, cổng web và phần mềm điều hành nội bộ của chính quyền `[Verified - open311.org, 2026]`.
* **Giá trị ứng dụng:** Giúp nền tảng nghiên cứu dễ dàng kết nối hoặc chuyển giao dữ liệu với các hệ thống Smart City khác mà không bị vendor lock-in `[Verified - open311.org, 2026]`.

---

## 4. Phân tích Xu hướng & Quy luật (Patterns)

### 4.1 Tính năng cơ bản bắt buộc (Table Stakes)
1. **Tiếp nhận đa kênh kèm vị trí GPS chính xác:** Cho phép công dân chụp ảnh trực tiếp từ camera (lấy Exif GPS nếu có hoặc truy vấn Geolocation API của trình duyệt/thiết bị di động) kèm mô tả sự cố `[Verified - hue.gov.vn, fixmystreet.org, 2026]`.
2. **Bản đồ trực quan công khai (Public Incident Map):** Hiển thị các sự cố trên nền bản đồ số kèm trạng thái trực quan bằng mã màu (Chờ tiếp nhận - Đang xử lý - Đã hoàn thành) `[Verified - gopy.danang.gov.vn, fixmystreet.org, 2026]`.
3. **Quy trình State Machine khép kín:** Vòng đời phiếu phản ánh phải có ràng buộc chuyển trạng thái nghiêm ngặt, ghi vết kiểm toán (Audit Trail) ai chuyển, vào thời gian nào, kèm lý do `[Verified - hue.gov.vn, 2026]`.
4. **Minh chứng hoàn thành (Proof of Work):** Cán bộ hiện trường bắt buộc phải tải lên ảnh chụp sau khi khắc phục sự cố tại đúng tọa độ đó trước khi đóng phiếu `[Verified - hue.gov.vn, baodautu.vn, 2026]`.
5. **Cổng tra cứu & Đánh giá công dân:** Cho phép tra cứu tiến độ bằng mã tra cứu (Ticket Code) hoặc số điện thoại; cung cấp nút đánh giá mức độ hài lòng sau khi hoàn thành `[Verified - gopy.danang.gov.vn, hue.gov.vn, 2026]`.

### 4.2 Tính năng tạo khác biệt cạnh tranh (Differentiators)
1. **Phân loại sự cố tự động bằng Multi-modal AI:** Kết hợp nhận diện khuyết tật hạ tầng từ ảnh (Computer Vision) và phân loại ngữ nghĩa mô tả tiếng Việt (NLP) để tự động gán nhãn danh mục và đề xuất mức độ khẩn cấp (Emergency / Urgent / Normal) `[Inference, đối chiếu OneService Singapore & Mark-a-Spot]`.
2. **Bộ lọc trùng lặp thời gian thực đa chiều (Pre-submission & Post-submission Deduplication):**
   * *Pre-submission (Phía công dân):* Khi người dùng chọn vị trí trên bản đồ, hệ thống tự động quét trong bán kính 50m - 100m các sự cố cùng loại đang mở và gợi ý: *"Đã có người báo sự cố này cách đây 1 giờ, bạn có muốn đăng ký nhận thông báo kết quả thay vì tạo phiếu mới?"*.
   * *Post-submission (Phía hệ thống):* Tự động gom cụm (DBSCAN + Vector Similarity) các báo cáo phát sinh liên tục trong thiên tai, lũ lụt thành một "Sự cố cha" (Master Incident) kèm danh sách "Sự cố con" (Child Reports) để chỉ phân công một đội xử lý duy nhất.
3. **Định tuyến thông minh theo Ranh giới hành chính & Chuyên môn (Smart Dispatching Engine):** Tự động xác định điểm sự cố nằm trong ranh giới Phường/Quận nào của Đà Nẵng (dựa trên thuật toán Point-in-Polygon trên GeoJSON ranh giới Đà Nẵng) và thuộc thẩm quyền sở/ban ngành nào.
4. **Hệ thống giám sát SLA Real-time & Cảnh báo quá hạn (Escalation Alerts):** Đồng hồ đếm ngược SLA theo loại sự cố (ví dụ: Cây ngã đổ cản trở giao thông = 4h; Ổ gà = 48h; Rác thải ứ đọng = 12h); tự động bắn cảnh báo qua Webhook/Telegram/Zalo khi sắp quá hạn.
5. **GIS Heatmap & Phân tích dự báo (Predictive GIS Analytics):** Bản đồ nhiệt mật độ sự cố theo thời gian và không gian giúp cơ quan quản lý phát hiện các tuyến đường xuống cấp thường xuyên hoặc các điểm nghẽn thoát nước mùa lũ tại Đà Nẵng.

### 4.3 Các điểm gãy đổ và Thất bại phổ biến (Common Failures & Complaints)
1. **Tình trạng "Đùn đẩy trách nhiệm" giữa các cơ quan:** Khi sự cố nằm ở ranh giới giữa hai phường hoặc liên quan đến nhiều đơn vị (ví dụ: nắp cống hỏng thuộc thoát nước nhưng nằm trên mặt đường thuộc giao thông), phiếu bị chuyển qua lại làm trôi thời gian `[Inference từ thực tế 1022]`.
2. **Quá tải phản ánh rác / spam / giả mạo:** Người dùng gửi ảnh không liên quan, ảnh chụp màn hình cũ, hoặc báo cáo sai sự thật làm tốn công cán bộ đi kiểm tra hiện trường `[Inference]`.
3. **Trải nghiệm nhập liệu cồng kềnh:** Bắt công dân điền quá nhiều trường form, chọn danh mục phức tạp khiến họ bỏ cuộc giữa chừng `[Verified - tech.gov.sg, 2026]`.
4. **Không có phản hồi thực chất:** Báo cáo bị đóng với lý do "Đã ghi nhận, chờ kinh phí", gây ức chế và mất lòng tin của người dân `[Inference]`.
5. **Chi phí API bản đồ tăng vọt:** Sử dụng Google Maps Javascript API / Geocoding API khi số lượng người truy cập tăng dẫn đến chi phí vượt ngân sách `[Verified - developers.google.com, 2026]`.

---

## 5. Đánh giá Các Phương án Kỹ thuật & Kiến trúc (Technical Options & Trade-offs)

### 5.1 Kiến trúc Ứng dụng & Nền tảng (Application Architecture)

| Tiêu chí | Lựa chọn 1: Monolith Decoupled (FastAPI + React/Next.js PWA + PostGIS) | Lựa chọn 2: Microservices (NestJS + Python AI Service + Flutter Mobile + PostGIS) | Lựa chọn 3: Low-code / CMS (Drupal 11 / Mark-a-Spot) |
| :--- | :--- | :--- | :--- |
| **Độ phù hợp bài toán** | **Rất cao (9/10):** Tối ưu cho đồ án tốt nghiệp, dễ phát triển, kiểm thử và demo toàn diện. | **Khá (7/10):** Kiến trúc phân tán chuẩn doanh nghiệp nhưng overhead quản lý lớn. | **Trung bình (5/10):** Phụ thuộc CMS, khó tùy biến sâu logic AI tiếng Việt. |
| **Độ phức tạp kỹ thuật** | Trung bình, tập trung vào logic nghiệp vụ và thuật toán. | Cao (giao tiếp gRPC/RabbitMQ, đồng bộ auth, mobile release). | Cao trong việc học và override hook của Drupal. |
| **Chi phí hạ tầng** | **0đ:** Triển khai được trên 1 VPS giá rẻ (Hetzner / DigitalOcean) hoặc Free-tier (Render, Supabase). | Cần tối thiểu 2-3 VPS hoặc Kubernetes cluster để chạy mượt. | Cần máy chủ LAMP/LEMP chuẩn. |
| **Độ trưởng thành** | Rất cao, cộng đồng thư viện Python & React cực lớn. | Rất cao. | Rất cao ở châu Âu. |
| **Khả năng tự chủ mã nguồn** | Hoàn toàn làm chủ từ UI đến thuật toán xử lý dữ liệu. | Hoàn toàn làm chủ. | Bị gò bó bởi cấu trúc database Drupal. |

### 5.2 Nền tảng Bản đồ & Không gian (GIS & Mapping Stack)

* **Phương án A: OpenStreetMap + Leaflet / MapLibre GL + PostGIS (Khuyên dùng)**
  * *Chi phí:* Hoàn toàn miễn phí, mã nguồn mở `[Verified - leafletjs.com, maplibre.org, 2026]`.
  * *Dữ liệu bản đồ:* Tile server từ OpenStreetMap hoặc Vector Tiles miễn phí qua MapTiler (gói Free 100.000 requests/tháng) hoặc tự host PMTiles Đà Nẵng bằng Protomaps `[Verified - maptiler.com, protomaps.com, 2026]`.
  * *Spatial Query:* PostgreSQL với extension **PostGIS** hỗ trợ tính toán khoảng cách cầu học (`ST_DWithin`), chỉ mục không gian `GIST`, ranh giới hành chính đa giác `ST_Contains` với hiệu năng cực cao `[Verified - postgis.net, 2026]`.
* **Phương án B: Goong Maps API (Bản đồ số Việt Nam)**
  * *Ưu điểm:* Geocoding và Autocomplete địa chỉ tiếng Việt cực kỳ chính xác tại Đà Nẵng (nhận diện kiệt, hẻm, tên đường địa phương) `[Verified - goong.io, 2026]`.
  * *Chi phí:* Miễn phí 30.000 requests/tháng khi đăng ký mới (tặng $100 credits dùng thử) `[Verified - goong.io, 2026]`.
  * *Tích hợp:* Hoàn hảo làm dịch vụ Geocoding phụ trợ (Reverse Geocoding lấy địa chỉ từ GPS).
* **Phương án C: Google Maps Platform**
  * *Nhược điểm:* Giới hạn tín dụng $200/tháng, yêu cầu thẻ tín dụng quốc tế, chi phí tăng rất nhanh ($5.00/1000 lượt load bản đồ động), rủi ro khóa tài khoản hoặc phát sinh chi phí ngoài ý muốn `[Verified - developers.google.com/maps, 2026]`.

### 5.3 Lựa chọn Mô hình AI cho Phân loại & Chống trùng lặp (AI & Deduplication Models)

* **Khuyết tật mặt đường & Sự cố hạ tầng (Computer Vision):**
  * *Mô hình:* **YOLOv8 / YOLOv11 (Small/Nano)** fine-tune trên tập dữ liệu chuẩn **RDD2022 (Road Damage Dataset 2022)** kết hợp ảnh chụp thực tế tại Đà Nẵng `[Verified - arxiv.org, figshare.com, 2026]`.
  * *Khả năng:* Nhận diện 4 nhóm khuyết tật chính: D00 (nứt dọc), D10 (nứt ngang), D20 (nứt chân chim/alligator cracks), D40 (ổ gà/potholes) `[Verified - figshare.com, 2026]`.
  * *Thời gian suy luận (Inference):* ~15-30ms trên GPU phổ thông (hoặc ~100ms trên CPU với định dạng ONNX/OpenVINO), cực kỳ nhẹ và có thể host trực tiếp trên backend `[Verified - ultralytics.com, 2026]`.
* **Phân loại sự cố tổng hợp & Gợi ý thẩm quyền xử lý (Multi-modal VLM / LLM Triage):**
  * *Phương án 1 (Cloud API):* Sử dụng **Gemini 2.5 Flash / GPT-4o mini API** với zero-shot prompt tiếng Việt truyền vào ảnh và văn bản. Mô hình trả về JSON gồm: `{category, urgency, suggested_department, summary}`. Ưu điểm: Độ chính xác ngôn ngữ tiếng Việt rất cao, không tốn tài nguyên GPU máy chủ, chi phí rất rẻ trong giai đoạn thử nghiệm `[Inference]`.
  * *Phương án 2 (Local Open Model):* Fine-tune **PhoBERT** (cho text) hoặc mô hình đa phương thức mã nguồn mở (như Qwen2.5-VL-3B / 7B chạy qua Ollama/vLLM). Nhược điểm: Đòi hỏi máy chủ GPU tối thiểu 16GB VRAM `[Inference]`.
* **Cơ chế Chống trùng lặp đa tầng (Hybrid Spatial-Vector Deduplication):**
  * *Tầng 1 (Spatial Filter):* Sử dụng PostGIS truy vấn các sự cố chưa đóng trong bán kính $R \le 50m$ và thời gian $T \le 48h$:
    ```sql
    SELECT id, title, category, location 
    FROM incidents 
    WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 50)
      AND status NOT IN ('RESOLVED', 'CLOSED')
      AND created_at >= NOW() - INTERVAL '48 hours';
    ```
  * *Tầng 2 (Semantic & Visual Similarity via pgvector):*
    * So khớp đặc trưng ảnh: Trích xuất vector embedding của ảnh qua **CLIP (ViT-B/32)** hoặc **DINOv2**, lưu vào trường `image_embedding vector(512)` trong PostgreSQL.
    * So khớp đặc trưng văn bản: Trích xuất embedding mô tả qua **BKAI Foundation PhoBERT** hoặc **BGE-M3**, lưu vào trường `text_embedding vector(768)`.
    * Tính điểm tương đồng Cosine kết hợp:
      $$\text{Score} = \alpha \cdot \text{Sim}_{\text{image}} + \beta \cdot \text{Sim}_{\text{text}} + \gamma \cdot (1 - \frac{d}{R})$$
    * Nếu $\text{Score} \ge 0.85$, hệ thống cảnh báo nghi ngờ trùng lặp cao `[Inference]`.

---

## 6. Rủi ro, Vấn đề Pháp lý & Cách Kiểm chứng (Risks & Validation)

| Nhóm rủi ro | Mô tả chi tiết rủi ro | Mức độ | Phương án phòng ngừa & Kiểm chứng |
| :--- | :--- | :--- | :--- |
| **Pháp lý & Quyền riêng tư** | Vi phạm **Nghị định 13/2023/NĐ-CP** khi lưu trữ vị trí GPS và ảnh hiện trường dính khuôn mặt người dân, biển số phương tiện giao thông. | **Cao** | Tích hợp pipeline tự động phát hiện và làm mờ (Blurring) khuôn mặt và biển số xe trước khi lưu trữ công khai; bắt buộc có màn hình thông báo chấp thuận xử lý dữ liệu cá nhân (Consent Screen) `[Verified - Nghị định 13/2023/NĐ-CP]`. |
| **Chất lượng dữ liệu đầu vào** | Người dùng gửi ảnh mờ, tối, góc chụp không rõ ràng hoặc spam tọa độ giả mạo (Fake GPS). | **Trung bình** | Kiểm tra siêu dữ liệu ảnh Exif; chặn tọa độ nằm ngoài ranh giới địa lý hành chính TP. Đà Nẵng; sử dụng AI lọc ảnh spam/không hợp lệ trước khi đẩy vào hàng đợi `[Inference]`. |
| **Độ trễ suy luận AI** | Nếu gọi mô hình AI đồng bộ trong lúc công dân bấm gửi phiếu, request có thể bị timeout hoặc đơ giao diện. | **Trung bình** | Xử lý bất đồng bộ (Asynchronous Background Task) qua hàng đợi tác vụ (Celery / Redis Queue hoặc FastAPI BackgroundTasks). Công dân nhận Ticket ID ngay lập tức; AI phân loại và hoàn thiện nhãn sau 2-5 giây `[Inference]`. |
| **Chi phí vận hành API bản đồ** | Bị phát sinh chi phí ngoài tầm kiểm soát khi demo hoặc thử nghiệm người dùng. | **Thấp** | Dùng MapLibre GL với OpenStreetMap tiles hoàn toàn miễn phí; chỉ gọi Goong Geocoding API cho các trường hợp bắt buộc tra cứu địa chỉ văn bản và áp dụng cache Redis cho các tọa độ đã tra cứu `[Verified - goong.io, 2026]`. |
| **Khả năng tiếp nhận thực tế của cơ quan chính quyền** | Cơ quan chức năng không sử dụng phần mềm ngoài luồng của sinh viên. | **Cao** | Định vị rõ sản phẩm là "Nền tảng mô phỏng thế hệ mới đạt chuẩn Open311", cung cấp cổng xuất API chuẩn mở để chứng minh khả năng tích hợp vào hệ thống IOC Đà Nẵng trong tương lai `[Inference]`. |

---

## 7. Đề xuất Hướng đi Khả thi (Recommended Direction)

### 7.1 Phạm vi MVP (Minimum Viable Product Scope)
* **Kênh Công dân (Citizen Portal - Web/PWA responsive):**
  * Chụp ảnh hiện trường hoặc tải ảnh lên.
  * Tự động lấy tọa độ GPS từ trình duyệt và hiển thị vị trí trên bản đồ Đà Nẵng.
  * Tự động làm mờ mặt người/biển số xe bảo vệ quyền riêng tư.
  * Pre-submission duplicate check: Gợi ý các sự cố tương tự trong bán kính 50m kèm nút "Tôi cũng gặp sự cố này" (+1 phiếu).
  * Tra cứu tiến độ xử lý và xem ảnh minh chứng sau khi khắc phục.
* **Hệ thống AI Triage & Chống trùng lặp (Core Engine):**
  * Nhận diện tự động 4 nhóm sự cố hạ tầng phổ biến tại Đà Nẵng: (1) Mặt đường/Ổ gà hư hỏng, (2) Cây xanh gãy đổ/nguy hiểm, (3) Điểm ngập úng mùa mưa, (4) Rác thải ứ đọng/xả trộm.
  * Tự động xác định Quận/Huyện, Phường/Xã thuộc Đà Nẵng dựa trên bản đồ số ranh giới hành chính.
  * Gợi ý thẩm quyền đơn vị xử lý và thời hạn cam kết SLA.
* **Cổng Điều hành & Hiện trường (Dispatching & Operations Dashboard):**
  * Bảng điều khiển Kanban/List quản lý ticket theo trạng thái: `Tiếp nhận` -> `Đã phân công` -> `Đang xử lý` -> `Đã khắc phục` -> `Đóng phiếu`.
  * Bộ đếm thời gian thực SLA (đổi màu vàng khi còn 20% thời gian, màu đỏ khi trễ hạn).
  * Chức năng điều phối viên: duyệt/sửa kết quả AI phân loại chỉ với 1 cú click.
  * Giao diện dành cho đội hiện trường: nhận việc và upload ảnh minh chứng sau sửa chữa.
* **Bản đồ Giám sát Thông minh (GIS Analytics):**
  * Bản đồ nhiệt (Heatmap) thể hiện mật độ sự cố tại Đà Nẵng.
  * Lọc theo quận (Hải Châu, Thanh Khê, Liên Chiểu, Ngũ Hành Sơn, Sơn Trà, Cẩm Lệ, Hòa Vang).

### 7.2 Tính năng tạm hoãn sau MVP (What to Defer)
* Ứng dụng Native Mobile tải từ App Store / Google Play (sử dụng PWA để công dân có thể cài đặt trực tiếp không qua kho ứng dụng, tiết kiệm phí $99/năm của Apple Developer).
* Tích hợp thanh toán trực tuyến hoặc xử phạt vi phạm hành chính.
* Tích hợp sâu vào cổng đăng nhập VNeID quốc gia (thay thế bằng cơ chế xác thực OTP SMS/Zalo/Email hoặc tài khoản demo).

### 7.3 Yếu tố tạo Khác biệt Cạnh tranh (Differentiation)
* **Thấu hiểu đặc thù Đà Nẵng:** Tích hợp sẵn bản đồ các "điểm đen" ngập úng mùa mưa bão (khu vực Mẹ Suốt, Khe Cạn, Hàm Nghi, Đa Cô...) để tăng trọng số cảnh báo ngập khẩn cấp khi mùa mưa miền Trung bắt đầu `[Verified - baodanang.vn, 2026]`.
* **Chống trùng lặp thời gian thực:** Giải quyết dứt điểm vấn đề nghẽn đơn tiếp nhận của Trung tâm 1022 khi thiên tai xảy ra.
* **Tuân thủ chuẩn mở Open311:** Sẵn sàng kết nối API với mọi hệ thống thông minh khác của đô thị.

### 7.4 Ngăn xếp Công nghệ Được Đề xuất (Recommended Tech Stack)
* **Backend:** `Python (FastAPI)`
  * *Lý do:* Tốc độ xử lý bất đồng bộ cao, tích hợp trực tiếp và tự nhiên nhất với các thư viện AI/ML (PyTorch, Ultralytics YOLO, OpenCV, Transformers).
* **Database & Không gian:** `PostgreSQL` + `PostGIS` + `pgvector`
  * *Lý do:* Sự kết hợp mạnh mẽ nhất hiện nay để vừa lưu trữ quan hệ, vừa truy vấn không gian địa lý cực nhanh (`GIST index`), vừa so khớp vector chống trùng lặp `HNSW index` trên cùng một hệ cơ sở dữ liệu duy nhất mà không cần cài thêm Elasticsearch hay Pinecone.
* **Frontend:** `React / Next.js (TypeScript)` + `Tailwind CSS` + `PWA support`
  * *Lý do:* Đảm bảo giao diện hiện đại, thời thượng, tương tác mượt mà trên cả trình duyệt desktop của cán bộ và màn hình điện thoại của người dân.
* **GIS / Bản đồ:** `MapLibre GL JS` kết hợp dữ liệu nền `OpenStreetMap` + API `Goong Geocoding` (gói free) để tìm kiếm và định danh địa chỉ Việt Nam.
* **Mô hình AI:**
  * *Vision & NLP Triage:* Sử dụng **DeepSeek Vision API** (`deepseek-flash` multimodal endpoint) - tiếp nhận ảnh hiện trường và mô tả của công dân, tự động trích xuất JSON cấu trúc gồm: loại khuyết tật hạ tầng (ổ gà, ngập úng, cây đổ, rác thải), mức độ nghiêm trọng, tóm tắt sự cố và đề xuất cơ quan có thẩm quyền xử lý tại Đà Nẵng. Không cần tự huấn luyện hay tự host LLM/GPU phức tạp.
  * *Anonymization:* `OpenCV` (bộ lọc Gaussian Blur kết hợp HaarCascade/YOLO Face) chạy ngầm để tự động làm mờ khuôn mặt và biển số xe trước khi lưu trữ công khai.
* **Hạ tầng & Triển khai:** `Docker & Docker Compose` trên VPS Linux hoặc kết hợp Supabase (DB + PostGIS) + Vercel/Render (Frontend & Backend).

### 7.5 Các Lựa chọn Bị Loại bỏ và Lý do (Rejected Alternatives)
* *Loại bỏ Tự huấn luyện / Self-host LLM & Vision:* Chi phí máy chủ GPU quá lớn, công sức tinh chỉnh mô hình vượt quá khuôn khổ thời gian đồ án; thay thế hoàn toàn bằng DeepSeek Vision API ổn định, hiệu quả và chi phí cực thấp.
* *Loại bỏ Drupal / Mark-a-Spot:* Mặc dù hỗ trợ chuẩn Open311 sẵn có, việc tùy biến backend PHP/Drupal cho các thuật toán AI tiếng Việt và vector similarity phức tạp hơn nhiều so với việc xây dựng backend bằng Python.
* *Loại bỏ Perl / FixMyStreet:* Stack công nghệ lỗi thời, tài liệu phân tán, không phù hợp cho đồ án tốt nghiệp hiện đại.
* *Loại bỏ Google Maps API:* Nguy cơ phát sinh chi phí cao, thiếu tính tự chủ mã nguồn GIS so với MapLibre/PostGIS.
* *Loại bỏ Microservices phức tạp ngay từ đầu:* Dự án 2 thành viên trong 3-4 tháng nếu chia quá nhiều service sẽ sa đà vào việc quản lý hạ tầng thay vì tập trung vào giải quyết bài toán nghiệp vụ đô thị.

---

## 8. Các Thử nghiệm Kỹ thuật Đề xuất (Suggested Spikes)

1. **Spike 1: Thử nghiệm Truy vấn Không gian & Chống trùng lặp PostGIS + pgvector**
   * *Mục tiêu:* Tạo bảng chứa 500 điểm sự cố giả lập tại các quận Đà Nẵng, viết câu truy vấn kết hợp khoảng cách không gian `< 50m` và khoảng cách vector embedding `< 0.2`.
   * *Điều kiện Đạt (Pass):* Thời gian thực thi truy vấn `< 50ms`.
2. **Spike 2: Thử nghiệm Phân loại Sự cố & Đề xuất Đơn vị với DeepSeek Vision API**
   * *Mục tiêu:* Gửi 20 ảnh hiện trường thực tế (ổ gà QL14B, ngập đường Mẹ Suốt, cây đổ sau bão) vào `deepseek-flash` multimodal API kèm prompt tiếng Việt quy định các sở/ban ngành Đà Nẵng.
   * *Điều kiện Đạt (Pass):* Mô hình trả về đúng định dạng JSON, phân loại đúng loại sự cố $\ge 85\%$ và gợi ý đúng cơ quan xử lý.
3. **Spike 3: Thử nghiệm Trích xuất Ranh giới Hành chính Đà Nẵng (Point-in-Polygon)**
   * *Mục tiêu:* Nạp file GeoJSON ranh giới hành chính các quận/phường Đà Nẵng vào PostGIS, kiểm tra hàm `ST_Contains` với tọa độ GPS từ điện thoại.
   * *Điều kiện Đạt (Pass):* Trả về chính xác tên Phường và Quận tương ứng với 100% các điểm kiểm thử ngẫu nhiên.
4. **Spike 4: Thử nghiệm Pipeline Tự động Làm mờ Khuôn mặt & Biển số xe**
   * *Mục tiêu:* Viết script Python nhận ảnh chụp có người và xe, tự động phát hiện vùng mặt và biển số, áp dụng bộ lọc Gaussian Blur.
   * *Điều kiện Đạt (Pass):* Ẩn danh thành công các chi tiết nhạy cảm trong ảnh mà không làm giảm chi tiết của sự cố hạ tầng cần báo cáo.

---

## 9. Các Quyết định Đã Thống nhất (Finalized Decisions)

1. **Chiến lược Kênh tiếp cận Đa kênh (Multi-channel Intake Roadmap):**
   * *Ưu tiên 1 (Ngay lập tức):* Phát triển hoàn thiện nền tảng **Web Application** (cho cả công dân báo cáo và cán bộ quản lý/điều phối).
   * *Ưu tiên 2:* Tích hợp kênh **Fanpage Facebook qua Messenger Chatbot Webhook** (người dân nhắn tin cho Page gửi ảnh và chia sẻ vị trí GPS trực tiếp, webhook đẩy thẳng vào database hệ thống).
   * *Ưu tiên 3:* Mở rộng tích hợp **Zalo OA**.
   * *Ưu tiên 4 (Nếu còn thời gian):* Port các tính năng từ Web sang **Mobile App** (Flutter/React Native) để tiện lợi hơn cho người dân và đội hiện trường.
2. **Cơ chế Định danh & Xác thực Người dân trên Web:**
   * Bắt buộc đăng nhập hoặc cung cấp thông tin xác thực tối thiểu để hạn chế spam.
   * Hỗ trợ kết hợp: **Google OAuth 2.0** (một chạm, tiện lợi) và **Tài khoản Số điện thoại / Email + Mật khẩu**.
3. **Giải pháp AI & Thị giác Máy tính:**
   * Sử dụng **DeepSeek Vision API** (`deepseek-flash` multimodal endpoint) theo định hướng của Giảng viên hướng dẫn.
   * Loại bỏ việc tự train YOLO hay tự host LLM cục bộ, giúp tiết kiệm chi phí phần cứng và tập trung hoàn thiện trải nghiệm nghiệp vụ.
4. **Phân vai & Đội ngũ Thực hiện (Team & Roles):**
   * Nhóm gồm **2 thành viên** thực hiện toàn bộ đồ án.
   * Các vai trò trong hệ thống (Công dân, Điều phối viên IOC, Cán bộ sở/quận hiện trường, Quản trị viên) sẽ được giả định đầy đủ tài khoản để phục vụ thử nghiệm và demo kịch bản thực tế.

---

## 10. Danh mục Nguồn tham khảo (Sources)

1. **Cổng Góp ý Đà Nẵng:** *Hệ thống tiếp nhận, xử lý phản ánh, kiến nghị của tổ chức, công dân TP. Đà Nẵng*, URL: `https://gopy.danang.gov.vn`, truy cập ngày 06/10/2026.
2. **Chuyển đổi số TP. Đà Nẵng:** *Cổng Dữ liệu Mở thành phố Đà Nẵng*, URL: `https://opendata.danang.gov.vn` & `https://dx.gov.vn`, truy cập ngày 06/10/2026.
3. **UBND Thừa Thiên Huế:** *Quy trình tiếp nhận và xử lý phản ánh hiện trường trên Hue-S*, URL: `https://hue.gov.vn`, truy cập ngày 06/10/2026.
4. **Báo Đầu tư:** *Ứng dụng Công dân Thủ đô số iHanoi tiếp nhận phản ánh hiện trường*, URL: `https://baodautu.vn`, truy cập ngày 06/10/2026.
5. **mySociety:** *FixMyStreet Platform Source Code & Architecture*, URL: `https://github.com/mysociety/fixmystreet` & `https://fixmystreet.org`, truy cập ngày 06/10/2026.
6. **Mark-a-Spot:** *Open Source Civic Issue Tracking Platform for Municipalities*, URL: `https://github.com/markaspot/mark-a-spot` & `https://mark-a-spot.com`, truy cập ngày 06/10/2026.
7. **GovTech Singapore:** *OneService AI-Powered Routing Engine for Municipal Feedback*, URL: `https://tech.gov.sg`, truy cập ngày 06/10/2026.
8. **CivicPlus:** *SeeClickFix 311 Request Management and Duplicate Detection*, URL: `https://civicplus.com`, truy cập ngày 06/10/2026.
9. **Open311 Consortium:** *GeoReport v2 API Specification*, URL: `https://open311.org`, truy cập ngày 06/10/2026.
10. **Crowdsensing-based Road Damage Detection Challenge (CRDDC):** *RDD2022 Multi-national Road Damage Dataset*, URL: `https://figshare.com` & `https://arxiv.org`, truy cập ngày 06/10/2026.
11. **Chính phủ Việt Nam:** *Nghị định số 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân*, có hiệu lực từ ngày 01/07/2023.
12. **Goong Maps:** *Tài liệu tích hợp và bảng giá Geocoding API Việt Nam*, URL: `https://goong.io` & `https://docs.goong.io`, truy cập ngày 06/10/2026.
13. **Báo Đà Nẵng:** *Các điểm nóng ngập úng và hư hỏng hạ tầng giao thông mùa mưa bão tại Đà Nẵng*, URL: `https://baodanang.vn`, truy cập ngày 06/10/2026.
