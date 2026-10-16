# Kế hoạch Triển khai: Bộ Phân tích Tọa độ Thông minh Đa nền tảng cho Facebook Messenger Bot

**Nhánh phát triển:** `feat/messenger-smart-location-parser`  
**Mục tiêu:** Bổ sung cơ chế trích xuất tọa độ thông minh từ Apple Maps URL, Google Maps URL, và văn bản tự do nhằm khắc phục triệt để việc Meta ẩn nút chia sẻ vị trí native khi chat với Fanpage trên iOS và Android.  
**Cẩm nang bài học:** [docs/lessons-learned.md](file:///D:/HK10/DATN/docs/lessons-learned.md) (Lỗi 7: `ST_MakePoint(long, lat)`, Lỗi 13, 15)  

---

## 1. Mục tiêu & Phạm vi

### 1.1 Mục tiêu
1. Xây dựng hàm trích xuất tọa độ thông minh `extract_coordinates_from_text(text: str) -> tuple[float, float] | None`:
   - Nhận diện link chia sẻ từ **Apple Maps** trên iPhone (`maps.apple.com/?ll=...` hoặc `?sll=...` hoặc `?q=...`).
   - Nhận diện link chia sẻ từ **Google Maps** (`google.com/maps?q=...`, `@lat,long`, `maps.app.goo.gl`).
   - Nhận diện tọa độ số trực tiếp: `16.0611, 108.2208`, `16.0611 108.2208`, có/không có tiền tố `lat:`, `long:`, `vĩ độ`, `kinh độ`.
   - Cơ chế tự động đảo vị trí thông minh dựa trên phạm vi địa lý Việt Nam (vĩ độ ~8-24, kinh độ ~102-112).
2. Tích hợp bộ phân tích vào luồng xử lý Webhook tại `backend/app/api/v1/endpoints/webhooks.py`:
   - Quét tọa độ trong nội dung tin nhắn text của người dùng.
   - Quét tọa độ trong URL đính kèm (attachments fallback/link khi share từ app bản đồ).
   - Tự động thẩm định Hàng rào địa lý PostGIS `system_zones` Đà Nẵng.
   - Cập nhật lời nhắc hướng dẫn chi tiết người dùng cách chia sẻ vị trí từ Apple Maps / Google Maps hoặc gõ tọa độ.
3. Bộ kiểm thử tự động toàn diện kiểm tra mọi định dạng link và text.

### 1.2 Tệp tin cho phép chỉnh sửa
- `backend/app/services/messenger.py` (Bổ sung `extract_coordinates_from_text`).
- `backend/app/services/__init__.py` (Export helper mới).
- `backend/app/api/v1/endpoints/webhooks.py` (Tích hợp quét tọa độ từ text & attachments).
- `backend/tests/test_messenger_service.py` (Unit tests cho `extract_coordinates_from_text`).
- `backend/tests/test_messenger_webhook.py` (Integration tests qua Webhook endpoint).
- `docs/plans/messenger-smart-location-parser.md` (Tài liệu kế hoạch này).

---

## 2. Thứ tự Các Bước Triển khai

### [x] Bước 1: Xây dựng hàm `extract_coordinates_from_text` (`services/messenger.py`)
* Hỗ trợ Apple Maps URL, Google Maps URL, raw coordinates, regex lat/long tiền tố, tự động phân loại vĩ độ/kinh độ Việt Nam.
* Export trong `services/__init__.py`.
* Bổ sung unit tests trong `test_messenger_service.py`.

### [ ] Bước 2: Tích hợp Quét Tọa độ Thông minh vào Webhook Ingestion (`endpoints/webhooks.py`)
* Quét text và attachment URLs qua `extract_coordinates_from_text`.
* Nếu phát hiện tọa độ: Thẩm định PostGIS `system_zones` Đà Nẵng `ST_MakePoint(long, lat)`.
* Cập nhật tin nhắn hướng dẫn người dùng khi chưa có vị trí.
* Tự động hoàn tất sự cố nếu đã có ảnh.

### [ ] Bước 3: Viết Tests Bổ sung & Reviewer Audit
* Bổ sung integration test cases trong `test_messenger_webhook.py`:
  - Người dùng gửi link Apple Maps kèm ảnh $\rightarrow$ tạo sự cố thành công.
  - Người dùng gửi link Google Maps $\rightarrow$ tạo sự cố thành công.
  - Người dùng gửi tọa độ text thuần túy `16.0611, 108.2208` $\rightarrow$ tạo sự cố thành công.
* Chạy toàn bộ test suite dự án (`pytest`).
* Subagent Reviewer audit độc lập và nghiệm thu.
