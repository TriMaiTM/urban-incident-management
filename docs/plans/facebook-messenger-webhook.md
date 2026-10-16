# Kế hoạch Triển khai: Kênh Tiếp nhận Sự cố qua Facebook Messenger Webhook

**Nhánh phát triển:** `feat/facebook-messenger-webhook`  
**Đặc tả đối chiếu:** [docs/spec.md](file:///D:/HK10/DATN/docs/spec.md) (Mục 2.1, Mục 5.5, Mục 6.5)  
**Cẩm nang bài học:** [docs/lessons-learned.md](file:///D:/HK10/DATN/docs/lessons-learned.md) (Lỗi 1, 3, 4, 7, 11, 13, 14)  

---

## 1. Mục tiêu & Phạm vi (Goal & Scope)

### 1.1 Mục tiêu
Xây dựng trọn vẹn kênh tiếp nhận phản ánh sự cố đa phương tiện thông qua **Facebook Messenger Webhook (`/api/v1/webhooks/facebook`)**:
- Xác thực webhook với Meta Developer Platform (`hub.verify_token`, `hub.challenge`).
- Tiếp nhận tin nhắn văn bản, hình ảnh đính kèm (`image`), và vị trí GPS (`location`).
- Quản lý phiên tạm 2 bước theo `sender_psid` (TTL 15 phút) hỗ trợ công dân gửi ảnh và vị trí theo bất kỳ thứ tự nào.
- Thẩm định hàng rào địa lý PostGIS `system_zones` Đà Nẵng (từ chối tọa độ ngoài phạm vi).
- Tải ảnh, áp dụng thuật toán làm mờ khuôn mặt/biển số xe bằng OpenCV (Nghị định 13/2023/NĐ-CP), lưu trữ ảnh gốc riêng tư (`BEFORE_ORIGINAL`) và ảnh mờ công khai (`BEFORE_ANONYMIZED`).
- Khởi tạo sự cố (`channel="MESSENGER"`), sinh mã phiếu `DN-YYYYMM-XXXX` (Base36 collision guard), kích hoạt DeepSeek Vision chạy nền phân loại.
- Phản hồi tin nhắn hướng dẫn và thông báo mã phiếu tự động cho công dân qua Graph API Send Message (mock 100% khi kiểm thử).

### 1.2 Phạm vi tệp tin được phép thay đổi
- Tạo mới:
  - `backend/app/schemas/webhook.py` (Schemas sự kiện webhook Meta Facebook Messenger).
  - `backend/app/services/messenger.py` (Service xử lý phiên tạm, tải ảnh, gửi tin nhắn Graph API).
  - `backend/app/api/v1/endpoints/webhooks.py` (Router GET/POST `/webhooks/facebook`).
  - `backend/tests/test_messenger_webhook.py` (Bộ kiểm thử tự động toàn diện).
  - `docs/plans/facebook-messenger-webhook.md` (Tài liệu kế hoạch này).
- Chỉnh sửa:
  - `backend/app/api/v1/router.py` (Mount webhook router).
  - `backend/app/schemas/__init__.py` (Export schemas webhook mới).
  - `docs/lessons-learned.md` (Ghi nhận bài học nếu phát sinh lỗi).

### 1.3 Điều nghiêm cấm (Non-goals)
- Không gọi trực tiếp Meta Graph API thực tế khi chạy unit/integration tests (phải mock `httpx.AsyncClient` hoặc monkeypatch service gửi tin).
- Không sửa đổi database models hay chạy migrations (tận dụng toàn bộ trường đã có trên bảng `incidents`, `incident_media`, `incident_history`, `system_zones`).
- Không làm gián đoạn hay sửa đổi logic các endpoint hiện có tại `/api/v1/incidents` và `/open311/v2`.
- Không lưu ảnh chưa làm mờ vào thư mục công khai `backend/uploads/public/`.

---

## 2. Thứ tự Các Bước Triển khai (Ordered Steps)

### [x] Bước 1: Định nghĩa Pydantic Schemas tiếp nhận Webhook Facebook (`schemas/webhook.py`)
* **Mục tiêu:** Xây dựng các model dữ liệu phân tích cú pháp (parsing) payload webhook từ Meta Graph API với strict typing (không `Any`), Pydantic v2.
* **Hành động:**
  * Tạo `backend/app/schemas/webhook.py`:
    * Schemas tọa độ: `FacebookLocationPayload`, `FacebookAttachment`.
    * Schemas tin nhắn: `FacebookMessage`, `FacebookMessagingItem`, `FacebookEntry`, `FacebookWebhookPayload`.
    * Schemas phản hồi xác minh: `FacebookVerifyQuery`.
  * Export trong `backend/app/schemas/__init__.py`.
  * Viết unit tests kiểm tra parsing payload tại `backend/tests/test_schemas_webhook.py`.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app backend/tests`
  * `py -m pytest backend/tests/test_schemas_webhook.py -v`

---

### [x] Bước 2: Xây dựng Service Quản lý Phiên Tạm & Gửi Tin nhắn Messenger (`services/messenger.py`)
* **Mục tiêu:** Quản lý phiên tạm 2 bước theo `sender_psid` (ảnh + tọa độ) với TTL 15 phút và wrapper gửi tin nhắn qua Facebook Send API (hỗ trợ mock cách ly 100%).
* **Hành động:**
  * Tạo `backend/app/services/messenger.py`:
    * `MessengerSessionManager`: Quản lý session dict (`psid` $\rightarrow$ `{image_url, lat, lon, updated_at}`). Tự động dọn dẹp các session hết hạn (> 15 phút).
    * `send_facebook_message(psid: str, text: str)`: Gửi HTTP POST tới Graph API `https://graph.facebook.com/v21.0/me/messages` (dùng `httpx.AsyncClient`).
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`

---

### [x] Bước 3: Xây dựng Endpoint Xác minh Webhook (`GET /api/v1/webhooks/facebook`)
* **Mục tiêu:** Hỗ trợ Meta Developer Platform bắt tay xác thực (Webhook Verification).
* **Hành động:**
  * Tạo `backend/app/api/v1/endpoints/webhooks.py`:
    * Endpoint `GET /facebook`:
      * Query parameters: `hub.mode`, `hub.verify_token`, `hub.challenge`.
      * Nếu `hub.mode == "subscribe"` và `hub.verify_token == settings.FACEBOOK_VERIFY_TOKEN`: trả về `int(hub.challenge)` (hoặc string plain text).
      * Nếu sai token: trả về `HTTPException(403, "Xác minh Webhook thất bại")`.
  * Gắn router vào `backend/app/api/v1/router.py`.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`

---

### [x] Bước 4: Xây dựng Endpoint Xử lý Sự kiện Messenger (`POST /api/v1/webhooks/facebook`)
* **Mục tiêu:** Tiếp nhận sự kiện tin nhắn từ Facebook Messenger, thẩm định hàng rào địa lý, tải ảnh và ẩn danh OpenCV, tạo `Incident(channel="MESSENGER")`, kích hoạt DeepSeek Vision chạy nền, và phản hồi mã `DN-YYYYMM-XXXX`.
* **Hành động:**
  * Endpoint `POST /facebook`:
    * Nhận payload JSON từ Meta (`object == "page"`).
    * Duyệt qua các message events:
      * **Trường hợp 1 - Chỉ gửi text / Lời chào:** Phản hồi tin nhắn hướng dẫn: *"Chào bạn! Vui lòng gửi 01 ảnh hiện trường và chia sẻ vị trí của bạn để hệ thống tiếp nhận sự cố."*
      * **Trường hợp 2 - Nhận ảnh (`image`):** Lưu `image_url` vào phiên tạm. Nếu chưa có tọa độ $\rightarrow$ phản hồi: *"Hệ thống đã nhận được ảnh. Vui lòng chia sẻ vị trí hiện trường sự cố."*
      * **Trường hợp 3 - Nhận vị trí (`location`):** Thẩm định PostGIS `ST_Contains` trên `system_zones` Đà Nẵng (với `ST_MakePoint(long, lat)`).
        * Nếu ngoài vùng $\rightarrow$ hủy phiên và thông báo từ chối phạm vi thử nghiệm.
        * Nếu hợp lệ và chưa có ảnh $\rightarrow$ phản hồi: *"Hệ thống đã nhận được vị trí. Vui lòng gửi 01 bức ảnh hiện trường sự cố."*
      * **Trường hợp 4 - Đủ cả Ảnh và Vị trí:**
        * Tải ảnh về bytes, gọi `anonymize_image` (làm mờ mặt & biển số).
        * Lưu ảnh gốc vào `backend/uploads/private/` và ảnh làm mờ vào `backend/uploads/public/`.
        * Sinh mã tra cứu `service_request_id` dạng `DN-YYYYMM-XXXX` (Base36 collision guard).
        * Lưu bản ghi `Incident`, `IncidentMedia`, `IncidentHistory`.
        * Thêm BackgroundTask gọi `process_incident_ai_triage`.
        * Phản hồi tin nhắn: *"Cảm ơn bạn! Sự cố đã được tiếp nhận với mã tra cứu: DN-YYYYMM-XXXX..."*.
        * Xóa phiên tạm của `psid`.
    * Trả về HTTP `200 OK` (chuỗi `"EVENT_RECEIVED"` theo quy định của Meta).
* **Kiểm chứng:**
  * `py -m compileall -q backend/app`

---

### [ ] Bước 5: Viết Bộ Test Suite Tự động Toàn diện (`backend/tests/test_messenger_webhook.py`) & Reviewer Audit
* **Mục tiêu:** Kiểm thử 100% độc lập không gọi Meta Graph API thực tế hay CSDL live.
* **Hành động:**
  * Tạo `backend/tests/test_messenger_webhook.py`:
    1. `test_webhook_verification_success`: Gọi GET với đúng `verify_token` $\rightarrow$ 200 OK, trả về challenge.
    2. `test_webhook_verification_invalid_token`: Gọi GET với sai `verify_token` $\rightarrow$ 403 Forbidden.
    3. `test_webhook_text_message_sends_guidance`: Gửi text chào hỏi $\rightarrow$ bot phản hồi hướng dẫn gửi ảnh và vị trí.
    4. `test_webhook_image_first_then_location`: Gửi ảnh trước $\rightarrow$ lưu session; sau đó gửi vị trí $\rightarrow$ tạo sự cố thành công, trả mã `DN-`.
    5. `test_webhook_location_first_then_image`: Gửi vị trí trước $\rightarrow$ lưu session; sau đó gửi ảnh $\rightarrow$ tạo sự cố thành công.
    6. `test_webhook_location_outside_danang_rejected`: Gửi vị trí tại Hà Nội $\rightarrow$ từ chối hàng rào địa lý, gửi tin nhắn giải thích.
    7. `test_webhook_session_expiration_cleanup`: Kiểm tra tự động xóa session cũ quá 15 phút.
  * Chạy toàn bộ test suite hệ thống (`pytest`).
  * Gọi subagent `reviewer` thẩm định toàn diện.
* **Kiểm chứng:**
  * `py -m compileall -q backend/app backend/tests`
  * `py -m pytest backend/tests/test_messenger_webhook.py -v`
  * `py -m pytest`

---

## 3. Rủi ro & Biện pháp Xử lý (Risks & Mitigations)

1. **Thứ tự Tọa độ trong Facebook Messenger Location Payload:**
   * *Rủi ro:* Meta Graph API gửi payload dạng `{"coordinates": {"lat": 16.0611, "long": 108.2208}}`, nếu truyền nhầm vào `ST_MakePoint` sẽ gây lỗi không gian.
   * *Biện pháp:* Áp dụng triệt để Bài học 7 (`docs/lessons-learned.md`): `ST_MakePoint(coordinates.long, coordinates.lat)`.
2. **Quyền riêng tư Hình ảnh từ Messenger:**
   * *Rủi ro:* Ảnh người dân gửi từ Messenger có thể chứa khuôn mặt hoặc biển số xe.
   * *Biện pháp:* Bắt buộc chạy qua hàm `anonymize_image` (OpenCV Gaussian Blur) trước khi lưu bản ghi `BEFORE_ANONYMIZED` vào `uploads/public/` (Bài học 3, 4, 14).
3. **Tiêu tốn Quota / Block mạng khi Test:**
   * *Rủi ro:* Các hàm gửi tin nhắn Facebook hoặc tải ảnh từ CDN Meta có thể bị timeout hoặc tiêu tốn mạng thực tế.
   * *Biện pháp:* 100% lệnh gọi ngoài được mock bằng `unittest.mock.patch` hoặc `monkeypatch` trong fixture test.
