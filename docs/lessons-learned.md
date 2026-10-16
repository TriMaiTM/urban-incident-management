# Sổ tay Bài học Kinh nghiệm & Danh mục Chống Lỗi (Lessons Learned & Anti-patterns)

> **Mục đích:** Ghi nhận các lỗi phát sinh trong quá trình thực thi, kết quả REJECT từ Reviewer, các trường hợp sai lệch so với `docs/spec.md`, và các bẫy kỹ thuật (gotchas) nhằm **tuyệt đối không để lặp lại** trên toàn bộ dự án.

---

## 1. Kiến trúc, Định tuyến & FastAPI (Routing & Async)

### 🔴 Lỗi 1: Xung đột Thứ tự Khai báo Route động (Path Parameter Shadowing)
- **Triệu chứng / Nguy cơ:** Khai báo route động như `GET /{ticket_code}` hoặc `GET /{id}` trước các route tĩnh như `GET /map`, `GET /nearby`, `GET /analytics/summary`. FastAPI sẽ coi chuỗi `"map"` là một `ticket_code` và trả về lỗi `404 Not Found`.
- **Quy tắc ngăn chặn:** 
  - Mọi route tĩnh (`/nearby`, `/map`, `/analytics/summary`, v.v.) **BẮT BUỘC** phải được đặt **PHÍA TRÊN** các route động (`/{ticket_code}`, `/{id}`).

### 🔴 Lỗi 2: Thiếu `selectinload` gây lỗi `MissingGreenlet` trong Async SQLAlchemy
- **Triệu chứng:** Khi truy cập quan hệ lazy-loading (ví dụ `incident.category`, `incident.media`, `incident.history`, `incident.feedback`) ngoài phiên làm việc async, SQLAlchemy ném `MissingGreenlet: greenlet_spawn has not been called`.
- **Quy tắc ngăn chặn:**
  - Mọi câu lệnh `select(Incident)` trả về cho Pydantic schemas chi tiết **BẮT BUỘC** nạp tường minh:
    ```python
    .options(
        selectinload(Incident.category),
        selectinload(Incident.assigned_department),
        selectinload(Incident.media),
        selectinload(Incident.history),
        selectinload(Incident.feedback),
    )
    ```

---

## 2. Bảo vệ Quyền riêng tư & An toàn Dữ liệu (Privacy & PII)

### 🔴 Lỗi 3: Rò rỉ ảnh gốc chưa làm mờ (`BEFORE_ORIGINAL`) cho người dùng công khai
- **Triệu chứng (Từng bị Reviewer Block):** Khi gọi `GET /incidents/{ticket_code}`, danh sách `media` trả về cả bản ghi `BEFORE_ORIGINAL` chứa ảnh khuôn mặt/biển số xe rõ nét.
- **Quy tắc ngăn chặn:**
  - Nếu `current_user` không có vai trò đặc quyền (`ADMIN`, `DISPATCHER`), **BẮT BUỘC** lọc bỏ toàn bộ `BEFORE_ORIGINAL`:
    ```python
    if not is_privileged:
        detail_out.media = [m for m in detail_out.media if m.media_type != "BEFORE_ORIGINAL"]
    ```
  - Thư mục `backend/uploads/private/` **TUYỆT ĐỐI KHÔNG ĐƯỢC MOUNT** qua `StaticFiles`. Chỉ mount `backend/uploads/public/`.

### 🔴 Lỗi 4: Lộ số điện thoại / thông tin liên hệ công dân (PII Masking)
- **Triệu chứng:** Trả về số điện thoại gốc `citizen_contact` trong API công khai cho phép kẻ xấu thu thập dữ liệu người phản ánh.
- **Quy tắc ngăn chặn:**
  - Áp dụng hàm `mask_citizen_contact` (ví dụ `0905***678`) cho tất cả người dùng không thuộc `ADMIN` hoặc `DISPATCHER`.

---

## 3. Xử lý Ảnh & Thị giác Máy tính (OpenCV & Windows Platform)

### 🔴 Lỗi 5: `cv2.imread` / `cv2.imwrite` gặp sự cố với đường dẫn Unicode tiếng Việt trên Windows
- **Triệu chứng:** Khi đường dẫn tệp chứa ký tự có dấu tiếng Việt, `cv2.imread` trả về `None` và `cv2.imwrite` trả về `False` trong âm thầm.
- **Quy tắc ngăn chặn:**
  - Bắt buộc dùng `np.fromfile` kết hợp `cv2.imdecode` để đọc ảnh, và `cv2.imencode` kết hợp `.tofile()` để ghi ảnh:
    ```python
    # Đọc:
    raw_bytes = np.fromfile(str(path), dtype=np.uint8)
    image = cv2.imdecode(raw_bytes, cv2.IMREAD_COLOR)

    # Ghi:
    _, buf = cv2.imencode(ext, image)
    buf.tofile(str(output_path))
    ```

### 🔴 Lỗi 6: Không thể mock trực tiếp `detectMultiScale` trên đối tượng C-Extension của OpenCV
- **Triệu chứng:** `unittest.mock.patch.object(clf, "detectMultiScale")` ném lỗi `TypeError: can't set attributes of built-in/extension type 'cv2.CascadeClassifier'`.
- **Quy tắc ngăn chặn:**
  - Mock ở tầng Python factory helper, ví dụ: `patch("app.services.anonymizer._get_classifiers")`.

---

## 4. Không gian Địa lý PostGIS & Tọa độ GIS

### 🔴 Lỗi 7: Đảo ngược thứ tự Tọa độ `(lat, lon)` vs `(lon, lat)`
- **Triệu chứng:** Gửi nhầm vĩ độ trước kinh độ vào `ST_MakePoint` khiến điểm rơi xuống Ấn Độ Dương thay vì TP. Đà Nẵng.
- **Quy tắc ngăn chặn:**
  - PostGIS WGS84 SRID 4326 strictly tuân thủ thứ tự: `ST_MakePoint(longitude, latitude)`.
  - Khung giới hạn Đà Nẵng: `107.8 <= longitude <= 108.4` và `15.9 <= latitude <= 16.3`.

### 🔴 Lỗi 8: Tính khoảng cách mét trên Geometry thay vì Geography
- **Triệu chứng:** Sử dụng `ST_DWithin` hoặc `ST_Distance` trên kiểu `Geometry(Point, 4326)` dẫn đến đơn vị tính bằng độ (degree) thay vì mét, làm sai lệch bán kính lọc trùng 50m.
- **Quy tắc ngăn chặn:**
  - Luôn ép kiểu sang `Geography`: `cast(Incident.location, Geography)`.

---

## 5. Quy trình Vòng đời Phiếu & Đánh giá (State Machine & Feedback)

### 🔴 Lỗi 9: Chuyển sang `RESOLVED` mà không có ảnh minh chứng `AFTER_PROOF`
- **Triệu chứng:** Cán bộ đánh dấu hoàn thành mà không có chứng cứ thực địa, vi phạm cam kết chất lượng của chính quyền.
- **Quy tắc ngăn chặn:**
  - Bắt buộc kiểm tra: Có tệp ảnh `proof_image` gửi kèm hoặc đã tồn tại bản ghi `IncidentMedia` với `media_type = 'AFTER_PROOF'`. Nếu không có, từ chối với lỗi `400 Bad Request`.
  - Ảnh `AFTER_PROOF` cũng phải qua bộ lọc làm mờ khuôn mặt/biển số nếu có người/xe trong ảnh trước khi lưu công khai vào `backend/uploads/public/`.

### 🔴 Lỗi 10: Xử lý Khiếu nại (Dispute Reopen) quên đặt lại `resolved_at`
- **Triệu chứng:** Khi công dân chấm điểm $\le 2$ sao, sự cố chuyển lại `IN_PROGRESS` nhưng trường `resolved_at` vẫn giữ mốc thời gian cũ, dẫn đến sai lệch báo cáo SLA.
- **Quy tắc ngăn chặn:**
  - Bắt buộc gán `incident.resolved_at = None` khi Reopen và ghi chú rõ trong `IncidentHistory`.

### 🔴 Lỗi 11: Thiếu `selectinload` cho `assigned_technician` trong khối Reload
- **Triệu chứng:** Khi gán quan hệ mới (`assigned_technician`), nếu câu query `reload_stmt` thiếu `selectinload(Incident.assigned_technician)` mà code lại đọc `if loaded_incident.assigned_technician is None:`, SQLAlchemy AsyncSession sẽ ném `MissingGreenlet`.
- **Quy tắc ngăn chặn:**
  - Mọi quan hệ được kiểm tra hoặc truy cập sau khi reload **bắt buộc** phải có `selectinload` tương ứng trong `.options(...)` (`category`, `assigned_department`, `assigned_technician`, `media`, `history`, `feedback`).

### 🔴 Lỗi 12: Thiếu Terminal Status Guard khi điều phối/phân công sự cố
- **Triệu chứng:** Cho phép gọi `PATCH /{id}/triage` hoặc `PATCH /{id}/assign` trên sự cố đã kết thúc (`CLOSED` hoặc `REJECTED`), làm sai lệch máy trạng thái (state machine) và sinh lịch sử sai.
- **Quy tắc ngăn chặn:**
  - Bắt buộc kiểm tra `if incident.status in {"CLOSED", "REJECTED"}: raise HTTPException(400, "Không thể điều phối/phân công sự cố đã kết thúc.")`.

### 🔴 Lỗi 13: Thiếu vòng lặp kiểm tra trùng lặp (Collision Guard) khi sinh mã phiếu `DN-YYYYMM-XXXX`
- **Triệu chứng:** Khi tiếp nhận phản ánh từ các cổng mở (như Open311 hoặc Webhook), việc sinh mã phiếu chỉ dùng 4 ký tự hexa mà không kiểm tra trùng lặp có thể gây lỗi `IntegrityError` (500 Internal Server Error) tại tầng CSDL do vi phạm ràng buộc `unique=True` trên `Incident.ticket_code`.
- **Quy tắc ngăn chặn:**
  - Sử dụng không gian ký tự Base36 (`string.ascii_uppercase + string.digits` $\approx 1.68$ triệu mã/tháng) và áp dụng vòng lặp kiểm tra tồn tại `select(Incident.id).where(Incident.ticket_code == code).limit(1)` tối đa 5 lần trước khi gán.

### 🔴 Lỗi 14: Thứ tự ưu tiên trích xuất Media đa hình cho Open311 & Cổng dữ liệu mở
- **Triệu chứng:** Khi một sự cố có nhiều bản ghi `IncidentMedia` (gồm ảnh gốc `BEFORE_ORIGINAL`, ảnh ẩn danh `BEFORE_ANONYMIZED`, và ảnh nghiệm thu `AFTER_PROOF`), nếu trích xuất tùy tiện (như lấy phần tử đầu `media[0]`), cổng thông tin công cộng có thể trả về đường dẫn ảnh gốc chứa khuôn mặt/biển số chưa làm mờ, vi phạm Nghị định 13/2023/NĐ-CP.
- **Quy tắc ngăn chặn:**
  - Thứ tự ưu tiên trích xuất bắt buộc theo trình tự: `AFTER_PROOF` > `BEFORE_ANONYMIZED` > `None`.
  - Tuyệt đối lọc bỏ và không fallback về `BEFORE_ORIGINAL` dù danh sách không có ảnh nào khác.

### 🔴 Lỗi 15: Định dạng Response và Chốt chặn Token rỗng trong Xác minh Meta Webhook
- **Triệu chứng 1:** Dùng `return hub_challenge` trực tiếp trong FastAPI khiến response mặc định là `application/json` và bọc chuỗi trong dấu ngoặc kép (`"11582012"`), dẫn đến Meta Developer Platform báo lỗi xác thực bắt tay.
- **Triệu chứng 2:** Nếu server chưa cấu hình `FACEBOOK_VERIFY_TOKEN=""` và không kiểm tra `not settings.FACEBOOK_VERIFY_TOKEN`, một request gửi `hub.verify_token=""` sẽ được `secrets.compare_digest("", "") == True`, kích hoạt webhook giả mạo ngoài ý muốn.
- **Quy tắc ngăn chặn:**
  - Luôn trả về `Response(content=str(hub_challenge or ""), media_type="text/plain")`.
  - Bắt buộc kiểm tra `if not settings.FACEBOOK_VERIFY_TOKEN or not secrets.compare_digest(...)` trước khi chấp thuận.
