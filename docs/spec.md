# ĐẶC TẢ HỆ THỐNG (SYSTEM SPECIFICATION)

## Nền tảng Tiếp nhận, Phân loại và Quản lý Sự cố Hạ tầng Đô thị TP. Đà Nẵng

- **Mã dự án:** DATN-HK10-URBAN-INCIDENT
- **Phiên bản:** 1.1.0
- **Ngày cập nhật:** 06/10/2026
- **Đội ngũ phát triển:** Nhóm 2 thành viên (Sinh viên Đồ án tốt nghiệp)
- **Phạm vi địa lý triển khai:**
  - **Vùng Đô thị Trung tâm Thí điểm (Core Urban Pilot Zone):** Giới hạn trong địa giới hành chính đô thị Đà Nẵng truyền thống (gồm 6 quận nội thành: Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Liên Chiểu, Cẩm Lệ và huyện Hòa Vang).
  - **Cơ chế mở rộng (Extensibility):** Hệ thống được thiết kế theo kiến trúc **Đa phân vùng động (Dynamic Multi-zone & Geo-fencing)**. Khi vùng thí điểm vận hành ổn định, hệ thống sẵn sàng mở rộng tiếp nhận cho các khu vực đô thị mở rộng khác (như TP. Hội An, TX. Điện Bàn, TP. Tam Kỳ...) thông qua việc nạp thêm dữ liệu GeoJSON ranh giới mà không cần thay đổi kiến trúc mã nguồn.

---

## 1. MỤC TIÊU VÀ PHẠM VI (GOALS & SCOPE)

### 1.1 Mục tiêu tổng quát & Cơ sở giới hạn phạm vi đề tài

1. **Mục tiêu tổng quát:** Xây dựng nền tảng số đa kênh (Web/PWA và Facebook Messenger) phục vụ công tác phản ánh hiện trường, tự động hóa phân loại hư hại hạ tầng đô thị thông qua mô hình thị giác đa phương thức (DeepSeek Vision API), chống trùng lặp dữ liệu không gian thời gian thực (PostGIS) và quản lý quy trình xử lý sự cố khép kín theo cam kết thời gian (SLA).
2. **Cơ sở khoa học về giới hạn phạm vi (Scope Delimitation):**
   - _Đặc thù bài toán Hạ tầng Đô thị (Urban Infrastructure):_ Vùng Đô thị Đà Nẵng truyền thống có tỷ lệ đô thị hóa cao (> 87%), mật độ dân cư và kết cấu hạ tầng kỹ thuật (cấp thoát nước, chiếu sáng thông minh, thảm mặt đường, cây xanh đường phố) đồng bộ và tập trung.
   - _Tránh phân tán nguồn lực:_ Việc giới hạn vào vùng đô thị lõi giúp đồ án tập trung giải quyết triệt để các bài toán công nghệ chuyên sâu (AI Computer Vision, Real-time Spatial Deduplication, SLA Tracking) thay vì bị dàn trải sang các bài toán hạ tầng nông thôn, lâm nghiệp, vùng sâu vùng xa.
   - _Khả năng nhân rộng (Scalability):_ Cơ chế Hàng rào địa lý (Geo-fencing) trong CSDL PostGIS cho phép kích hoạt/vô hiệu hóa các phân vùng độc lập, sẵn sàng chuyển giao hoặc mở rộng phạm vi theo nhu cầu thực tế của chính quyền.

### 1.2 Các vai trò trong hệ thống (Actor & Role Matrix)

Do dự án gồm 2 thành viên thực hiện, toàn bộ 4 vai trò sẽ được giả định đầy đủ tài khoản để phục vụ kiểm thử và demo:

1. **Công dân (Citizen):**
   - Đăng nhập qua Google OAuth hoặc Số điện thoại/Email.
   - Gửi phản ánh kèm hình ảnh và vị trí GPS qua Web hoặc qua Facebook Messenger.
   - Nhận cảnh báo trùng lặp trước khi gửi (Pre-submission alert) để gộp phiếu.
   - Tra cứu tiến độ, xem ảnh hiện trường sau khắc phục và chấm điểm hài lòng (1-5 sao).
2. **Điều phối viên IOC (Dispatcher / Operator):**
   - Theo dõi danh sách phản ánh mới từ tất cả các kênh (Web, Messenger).
   - Kiểm duyệt kết quả đề xuất tự động từ AI (loại sự cố, mức độ khẩn cấp, cơ quan xử lý).
   - Chuyển phiếu (Dispatch) về đúng đơn vị chịu trách nhiệm theo ranh giới hành chính quận/phường.
3. **Cán bộ / Kỹ thuật viên Hiện trường (Field Worker / Department Officer):**
   - Tiếp nhận phiếu công việc được phân công từ sở/ban ngành hoặc UBND quận.
   - Cập nhật trạng thái thi công (`Đang xử lý` $\rightarrow$ `Đã hoàn thành`).
   - Bắt buộc chụp và tải lên hình ảnh minh chứng đã khắc phục (Proof of Work) tại tọa độ sự cố.
4. **Quản trị viên Hệ thống (System Admin):**
   - Quản lý người dùng, phân quyền theo vai trò (RBAC).
   - Quản lý phân vùng địa lý (kích hoạt/nạp mới GeoJSON các vùng đô thị).
   - Cấu hình danh mục sự cố, ranh giới hành chính Đà Nẵng, định mức SLA cho từng nhóm sự cố.
   - Theo dõi Dashboard thống kê hiệu suất giải quyết (KPI/SLA) và bản đồ nhiệt (GIS Heatmap).

---

## 2. KIẾN TRÚC HỆ THỐNG VÀ CÔNG NGHỆ (ARCHITECTURE & TECH STACK)

### 2.1 Kiến trúc tổng thể (System Overview)

```
[Công dân qua Web/PWA]       [Công dân qua Messenger]
         │                               │
         │ (HTTPS / REST)                │ (Graph API Webhook)
         ▼                               ▼
┌────────────────────────────────────────────────────────┐
│               API Gateway / Backend (FastAPI)          │
│  - Auth Service (JWT, Google OAuth 2.0, Phone/Email)   │
│  - Incident Management Engine (State Machine)          │
│  - Messenger Webhook Handler                           │
│  - Open311 GeoReport v2 Compliance Layer               │
│  - SLA Monitoring & Escalation Service                 │
└────────┬───────────────────────────────┬───────────────┘
         │                               │
         ▼ (Async Tasks)                 ▼ (Queries)
┌────────────────────────┐      ┌────────────────────────┐
│    AI & Vision Engine   │      │ Database (PostgreSQL)  │
│ - DeepSeek Vision API  │      │ - PostGIS (Spatial GIS)│
│ - OpenCV Anonymization │      │ - pgvector (Similarity)│
│   (Face/Plate Blurring)│      │ - Relational Data      │
└────────────────────────┘      └────────────────────────┘
```

### 2.2 Ngăn xếp công nghệ chi tiết (Tech Stack)

| Thành phần                | Công nghệ lựa chọn                                                    | Lý do và Giá trị                                                                                                                                  |
| :------------------------ | :-------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend Web**          | Next.js 14+ (TypeScript, App Router), Tailwind CSS, Lucide Icons, PWA | Giao diện hiện đại, responsive hoàn hảo trên Mobile & Desktop; hỗ trợ cài đặt PWA trực tiếp không qua kho ứng dụng.                               |
| **GIS / Bản đồ**          | MapLibre GL JS + OpenStreetMap Tiles + Goong Geocoding API            | Hiển thị bản đồ vector mượt mà, định vị chính xác tên đường/kiệt/hẻm tại Đà Nẵng với chi phí 0đ (Gói Free Goong 30.000 req/tháng).                |
| **Backend API**           | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (asyncio)          | Tốc độ cao, cú pháp chặt chẽ, tích hợp bất đồng bộ xuất sắc với các thư viện xử lý ảnh và API AI.                                                 |
| **Cơ sở dữ liệu**         | PostgreSQL 16 + PostGIS 3.4 + pgvector                                | Lưu trữ toàn bộ dữ liệu quan hệ, tính toán không gian địa lý (`ST_DWithin`, `ST_Contains`) và tìm kiếm vector trùng lặp trong 1 cụm duy nhất.     |
| **Mô hình Thị giác & AI** | DeepSeek Vision API (`deepseek-flash` multimodal endpoint)            | Phân loại loại khuyết tật hạ tầng từ ảnh, trích xuất thực thể, xác định mức độ khẩn cấp và đề xuất đơn vị xử lý mà không tốn chi phí GPU máy chủ. |
| **Bảo vệ quyền riêng tư** | OpenCV (Gaussian Blur)                                                | Tự động quét và làm mờ khuôn mặt, biển số xe trong ảnh hiện trường trước khi lưu trữ công khai (Tuân thủ Nghị định 13/2023/NĐ-CP).                |
| **Kênh phụ trợ**          | Facebook Graph API & Messenger Webhook                                | Tiếp nhận sự cố qua tin nhắn Fanpage (ảnh + định vị GPS) và phản hồi mã tra cứu tự động cho công dân.                                             |

---

## 3. CƠ SỞ DỮ LIỆU VÀ MÔ HÌNH THỰC THỂ (DATA MODELS & SCHEMA)

### 3.1 Sơ đồ thực thể chính (ERD Outline)

#### 1. Bảng `users`

- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique, Nullable)
- `phone` (VARCHAR, Unique, Nullable)
- `full_name` (VARCHAR, Not Null)
- `password_hash` (VARCHAR, Nullable - null nếu đăng nhập qua Google OAuth)
- `auth_provider` (ENUM: `LOCAL`, `GOOGLE`, `FACEBOOK`)
- `role` (ENUM: `CITIZEN`, `DISPATCHER`, `TECHNICIAN`, `ADMIN`)
- `department_id` (UUID, Foreign Key `departments.id`, Nullable)
- `avatar_url` (VARCHAR, Nullable)
- `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

#### 2. Bảng `departments` (Đơn vị quản lý tại Đà Nẵng)

- `id` (UUID, Primary Key)
- `name` (VARCHAR): Ví dụ _"Công ty Thoát nước và Xử lý nước thải Đà Nẵng"_, _"Công ty Công viên - Cây xanh"_, _"UBND Quận Hải Châu"_...
- `code` (VARCHAR, Unique): `SXD_DN`, `SGTVT_DN`, `CTN_DN`, `CCX_DN`, `UBND_HC`...
- `level` (ENUM: `CITY_DEPT`, `UTILITY_COMPANY`, `DISTRICT_GOV`, `WARD_GOV`)
- `contact_email`, `contact_phone` (VARCHAR)

#### 3. Bảng `categories` (Danh mục sự cố)

- `id` (UUID, Primary Key)
- `code` (VARCHAR, Unique): `ROAD_DAMAGE`, `FLOODING`, `FALLEN_TREE`, `GARBAGE`, `STREETLIGHT`, `OTHER`
- `name` (VARCHAR): _"Hư hỏng mặt đường / Ổ gà"_, _"Ngập úng đô thị"_, _"Cây xanh gãy đổ"_, _"Rác thải ứ đọng"_...
- `default_sla_hours` (INTEGER): Định mức giờ xử lý mặc định (Ví dụ: Ổ gà = 48h, Cây đổ = 4h, Rác = 12h)
- `default_department_id` (UUID, Foreign Key `departments.id`)

#### 4. Bảng `incidents` (Phiếu phản ánh sự cố)

- `id` (UUID, Primary Key)
- `ticket_code` (VARCHAR, Unique, Not Null): Mã tra cứu công khai (Ví dụ: `DN-202610-0042`)
- `title` (VARCHAR, Not Null)
- `description` (TEXT, Not Null)
- `category_id` (UUID, Foreign Key `categories.id`, Nullable khi mới tạo chờ AI)
- `priority` (ENUM: `LOW`, `NORMAL`, `HIGH`, `EMERGENCY`)
- `status` (ENUM: `SUBMITTED`, `TRIAGED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CONFIRMED`, `CLOSED`, `REJECTED`)
- `channel` (ENUM: `WEB`, `MESSENGER`, `ZALO`)
- `citizen_id` (UUID, Foreign Key `users.id`, Nullable nếu nguồn từ webhook ngoài)
- `citizen_contact` (VARCHAR): Lưu SĐT/FB ID của người gửi để nhắn tin cập nhật
- `location` (GEOMETRY(Point, 4326), Not Null): Tọa độ WGS84
- `address_text` (VARCHAR, Not Null): Địa chỉ dạng văn bản (được Reverse Geocoding qua Goong)
- `district` (VARCHAR): Quận/Huyện (Hải Châu, Sơn Trà...)
- `ward` (VARCHAR): Phường/Xã (Hải Châu 1, Hòa Cường Nam...)
- `assigned_department_id` (UUID, Foreign Key `departments.id`, Nullable)
- `assigned_technician_id` (UUID, Foreign Key `users.id`, Nullable)
- `ai_classification_raw` (JSONB): Kết quả thô từ DeepSeek Vision API
- `ai_confidence` (FLOAT): Điểm tin cậy của AI (0.0 - 1.0)
- `is_duplicate_of_id` (UUID, Foreign Key `incidents.id`, Nullable): Gán nếu sự cố là con của một vụ việc lớn
- `duplicate_count` (INTEGER, Default 0): Số người cùng bấm xác nhận gặp sự cố này
- `sla_due_at` (TIMESTAMP WITH TIME ZONE, Nullable)
- `resolved_at` (TIMESTAMP WITH TIME ZONE, Nullable)
- `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

#### 5. Bảng `incident_media` (Tập tin đính kèm hiện trường)

- `id` (UUID, Primary Key)
- `incident_id` (UUID, Foreign Key `incidents.id`, Cascade Delete)
- `media_type` (ENUM: `BEFORE_ORIGINAL`, `BEFORE_ANONYMIZED`, `AFTER_PROOF`)
- `file_url` (VARCHAR, Not Null)
- `created_at` (TIMESTAMP WITH TIME ZONE)

#### 6. Bảng `incident_history` (Nhật ký xử lý - Audit Trail)

- `id` (UUID, Primary Key)
- `incident_id` (UUID, Foreign Key `incidents.id`)
- `actor_id` (UUID, Foreign Key `users.id`, Nullable nếu hệ thống tự chuyển)
- `from_status` (VARCHAR)
- `to_status` (VARCHAR)
- `note` (TEXT)
- `created_at` (TIMESTAMP WITH TIME ZONE)

#### 7. Bảng `incident_feedback` (Đánh giá mức độ hài lòng)

- `id` (UUID, Primary Key)
- `incident_id` (UUID, Unique, Foreign Key `incidents.id`)
- `citizen_id` (UUID, Foreign Key `users.id`)
- `rating` (INTEGER, Check 1..5)
- `comment` (TEXT, Nullable)
- `created_at` (TIMESTAMP WITH TIME ZONE)

#### 8. Bảng `system_zones` (Phân vùng địa lý & Hàng rào Geo-fencing)

- `id` (VARCHAR(50), Primary Key): Ví dụ `DANANG_CORE` (Vùng Đô thị Trung tâm Đà Nẵng)
- `name` (VARCHAR, Not Null): Tên vùng hiển thị công khai
- `boundary` (GEOMETRY(MultiPolygon, 4326), Not Null): Đa giác không gian định nghĩa ranh giới vùng
- `is_active` (BOOLEAN, Default True): Trạng thái kích hoạt tiếp nhận sự cố
- `bounding_box` (JSONB): Giới hạn khung nhìn bản đồ `[min_lon, min_lat, max_lon, max_lat]` phục vụ frontend zoom
- `description` (TEXT): Ghi chú phạm vi (Ví dụ: 6 quận nội thành và huyện Hòa Vang - Đà Nẵng)
- `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

---

## 4. QUY TRÌNH NGHIỆP VỤ VÀ STATE MACHINE (WORKFLOWS)

### 4.1 Vòng đời phiếu phản ánh (Incident Lifecycle)

```
[Công dân tạo] ──▶ SUBMITTED (Đã gửi)
                         │
                         ▼ (DeepSeek AI Triage + Điều phối viên duyệt)
                   TRIAGED (Đã phân loại & xác định cơ quan)
                         │
                         ▼ (Điều phối viên gán phòng ban/đội kỹ thuật)
                   ASSIGNED (Đã giao việc)
                         │
                         ▼ (Cán bộ hiện trường bấm nhận việc)
                   IN_PROGRESS (Đang xử lý)
                         │
                         ▼ (Cán bộ tải ảnh hiện trường sau sửa)
                   RESOLVED (Đã khắc phục)
                         │
        ┌────────────────┴────────────────┐
        │                                 │
(Công dân đánh giá / Hài lòng)   (Công dân khiếu nại / Chưa hài lòng)
        ▼                                 ▼
   CONFIRMED ──▶ CLOSED               REOPENED ──▶ IN_PROGRESS
```

### 4.2 Các quy tắc chuyển đổi trạng thái (Transition Rules)

1. **Kiểm tra hợp lệ trước khi gửi (Pre-creation Validation):** Tọa độ GPS bắt buộc phải nằm trong phân vùng có `is_active = True` trong bảng `system_zones`. Nếu nằm ngoài, hệ thống từ chối tạo phiếu và gửi phản hồi giải thích phạm vi thử nghiệm.
2. **Từ `SUBMITTED` sang `TRIAGED`:** Hệ thống gọi DeepSeek Vision API chạy ngầm để điền trước nhãn sự cố, mức độ ưu tiên và gợi ý đơn vị. Điều phối viên bấm "Chấp thuận đề xuất" hoặc chỉnh sửa lại.
3. **Từ `IN_PROGRESS` sang `RESOLVED`:** Bắt buộc phải có ít nhất 1 bản ghi `incident_media` với `media_type = AFTER_PROOF` (Ảnh minh chứng sau khi hoàn thành sửa chữa). Hệ thống sẽ từ chối chuyển trạng thái nếu thiếu ảnh chứng minh.
4. **Từ `RESOLVED` sang `CLOSED`:** Tự động đóng sau 48 giờ nếu người dân không có khiếu nại hoặc đóng ngay khi người dân hoàn thành biểu mẫu đánh giá.

---

## 5. ĐẶC TẢ KỸ THUẬT CÁC CƠ CHẾ LÕI (CORE ENGINES)

### 5.1 Cơ chế Hàng rào Địa lý & Quản lý Phân vùng Thí điểm (Geo-fencing & Multi-zone Validation)

- **Mục đích:** Khóa phạm vi thử nghiệm vào Vùng Đô thị Trung tâm Đà Nẵng truyền thống nhằm ngăn chặn tình trạng phình to bài toán, đồng thời bảo đảm kiến trúc sẵn sàng mở rộng khi cần.
- **Quy trình thẩm định không gian:**
  1. Khi người dân chọn tọa độ trên bản đồ Web hoặc gửi vị trí qua Messenger, API thẩm định tọa độ qua PostGIS:
     ```sql
     SELECT id, name FROM system_zones
     WHERE is_active = TRUE
       AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
     LIMIT 1;
     ```
  2. **Nếu điểm nằm ngoài ranh giới:**
     - Trả về mã lỗi `422 Unprocessable Entity` (hoặc tin nhắn từ chối của Chatbot).
     - Thông điệp: _"Hiện tại hệ thống đang được triển khai thử nghiệm tại Khu vực Đô thị Trung tâm Đà Nẵng (Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Cẩm Lệ, Liên Chiểu, Hòa Vang). Vị trí bạn chọn hiện nằm ngoài phạm vi thí điểm đợt 1."_
  3. **Khung nhìn bản đồ (Map Viewport Restriction):** Frontend MapLibre GL áp dụng cấu hình `maxBounds` giới hạn trong khung tọa độ `[[107.80, 15.80], [108.50, 16.35]]` để người dùng không kéo bản đồ đi quá xa phạm vi đề tài.

### 5.2 DeepSeek Vision API Pipeline (Triage & Classification)

- **Kích hoạt:** Bất đồng bộ qua Background Task ngay khi tạo bản ghi sự cố.
- **Cấu trúc Prompt gửi DeepSeek:**
  - **Role:** System Prompt định nghĩa ngữ cảnh chuyên gia quản lý đô thị TP. Đà Nẵng.
  - **Input:** Ảnh hiện trường (URL công khai hoặc Base64) + Nội dung văn bản mô tả của công dân + Tọa độ (Quận/Phường).
  - **Output Schema (Strict JSON):**
    ```json
    {
      "category_code": "ROAD_DAMAGE | FLOODING | FALLEN_TREE | GARBAGE | STREETLIGHT | OTHER",
      "damage_severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "suggested_department_code": "SGTVT_DN | CTN_DN | CCX_DN | SXD_DN | UBND_DISTRICT",
      "summary_vi": "Tóm tắt ngắn gọn sự cố bằng tiếng Việt chuẩn",
      "hazard_warning": "Cảnh báo nguy hiểm nếu có (ví dụ: cản trở giao thông giờ cao điểm, nguy cơ điện giật...)",
      "confidence": 0.92
    }
    ```

### 5.3 Cơ chế Làm mờ ảnh (OpenCV Privacy Anonymization)

- Trước khi ảnh được công khai trên giao diện cộng đồng hoặc bản đồ sự cố:
  - Backend chạy luồng xử lý ảnh bằng OpenCV.
  - Nhận diện các vùng chứa khuôn mặt (Face detection) và biển số xe (License plate contours).
  - Áp dụng bộ lọc Gaussian Blur ($ksize=35$) lên các tọa độ bounding box phát hiện được.
  - Lưu ảnh đã làm mờ vào `media_type = BEFORE_ANONYMIZED` để hiển thị cho công chúng. Ảnh gốc `BEFORE_ORIGINAL` chỉ mở quyền truy cập cho cán bộ điều hành có thẩm quyền phục vụ xác minh.

### 5.4 Cơ chế Lọc trùng lặp Không gian & Ngữ nghĩa (Spatial-Semantic Deduplication)

- **Bước 1 (Pre-submission Map Check):** Khi người dân cắm ghim vị trí $(lat, lon)$ trên bản đồ:
  - Frontend gọi API `GET /api/v1/incidents/nearby?lat=...&lon=...&radius=50`.
  - PostGIS thực thi:
    ```sql
    SELECT id, ticket_code, title, category_id, status, created_at,
           ST_Distance(location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS distance_meters
    FROM incidents
    WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 50)
      AND status NOT IN ('RESOLVED', 'CONFIRMED', 'CLOSED')
    ORDER BY distance_meters ASC
    LIMIT 5;
    ```
  - Nếu phát hiện có sự cố đang mở, giao diện hiển thị: _"Đã có phản ánh tương tự ở vị trí này. Bạn có muốn bấm 'Tôi cũng gặp sự cố này' để nhận cập nhật tiến độ thay vì gửi phiếu mới?"_.
- **Bước 2 (Gộp phiếu):** Khi công dân chọn gộp phiếu, hệ thống tăng `duplicate_count += 1` trên sự cố gốc, lưu thông tin liên hệ của công dân vào danh sách theo dõi mà không sinh ra ticket mới làm quá tải cán bộ hiện trường.

### 5.5 Kênh Tiếp nhận Facebook Messenger (Messenger Webhook Ingestion)

- **Khai báo Webhook:** Endpoint `POST /api/v1/webhooks/facebook` xác thực token với Meta for Developers.
- **Kịch bản hội thoại tự động (Chatbot Flow):**
  1. Người dân gửi tin nhắn $\rightarrow$ Bot chào mừng và hướng dẫn: _"Vui lòng gửi 01 bức ảnh hiện trường sự cố và chia sẻ vị trí của bạn"_.
  2. Người dân gửi ảnh (Attachment type = `image`) $\rightarrow$ Bot lưu URL ảnh tạm.
  3. Người dân gửi vị trí (Attachment type = `location` chứa $lat, lon$) $\rightarrow$ Bot tạo bản ghi sự cố mới kênh `MESSENGER`, kích hoạt DeepSeek Vision phân loại.
  4. Bot phản hồi: _"Cảm ơn bạn! Phản ánh đã được tiếp nhận với mã tra cứu: [MÃ]. Bạn có thể theo dõi tiến độ tại: [LINK_WEB]"_.

---

## 6. DANH MỤC API CHÍNH (KEY REST ENDPOINTS)

### 6.1 Nhóm Xác thực & Người dùng (`/api/v1/auth`)

- `POST /api/v1/auth/register`: Đăng ký tài khoản bằng SĐT/Email + Mật khẩu.
- `POST /api/v1/auth/login`: Đăng nhập lấy Bearer JWT Token.
- `POST /api/v1/auth/google`: Đăng nhập một chạm với Google OAuth Token.
- `GET /api/v1/auth/me`: Lấy thông tin cá nhân và vai trò hiện tại.

### 6.2 Nhóm Quản lý Phân vùng & Hàng rào Địa lý (`/api/v1/zones`)

- `GET /api/v1/zones/active`: Lấy danh sách các phân vùng đang hoạt động kèm GeoJSON ranh giới và bounding box để hiển thị/zoom bản đồ.
- `POST /api/v1/zones/validate-location`: Kiểm tra nhanh một tọa độ $(lat, lon)$ có nằm trong phân vùng tiếp nhận hợp lệ hay không.

### 6.3 Nhóm Quản lý Sự cố (`/api/v1/incidents`)

- `GET /api/v1/incidents`: Lấy danh sách sự cố (hỗ trợ phân trang, lọc theo quận/huyện, danh mục, trạng thái).
- `GET /api/v1/incidents/map`: Lấy danh sách GeoJSON sự cố đang mở hiển thị trên bản đồ số.
- `GET /api/v1/incidents/nearby`: Quét các sự cố trong bán kính $R$ mét quanh tọa độ.
- `POST /api/v1/incidents`: Tạo mới phản ánh sự cố (kèm upload ảnh đa phương tiện; tự động validate geofence).
- `GET /api/v1/incidents/{ticket_code}`: Tra cứu chi tiết sự cố theo mã công khai.
- `PATCH /api/v1/incidents/{id}/triage`: Điều phối viên duyệt phân loại sự cố & giao đơn vị.
- `PATCH /api/v1/incidents/{id}/status`: Cập nhật trạng thái phiếu (kèm ảnh minh chứng sau sửa chữa).
- `POST /api/v1/incidents/{id}/vote-duplicate`: Bấm "Tôi cũng gặp sự cố này" (+1 phiếu).
- `POST /api/v1/incidents/{id}/feedback`: Công dân chấm điểm và đánh giá kết quả xử lý.

### 6.4 Nhóm Tương thích Chuẩn Mở Open311 (`/open311/v2`)

- `GET /open311/v2/services.json`: Danh sách dịch vụ công / loại sự cố.
- `POST /open311/v2/requests.json`: Gửi yêu cầu phản ánh hiện trường chuẩn Open311 GeoReport v2.
- `GET /open311/v2/requests/{service_request_id}.json`: Tra cứu tiến độ chuẩn quốc tế.

### 6.5 Nhóm Webhook Mạng xã hội (`/api/v1/webhooks`)

- `GET /api/v1/webhooks/facebook`: Endpoint xác minh Webhook với Meta Developer Portal.
- `POST /api/v1/webhooks/facebook`: Endpoint nhận sự kiện tin nhắn, ảnh, định vị từ Facebook Messenger.

---

## 7. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

1. **Hiệu năng & Khả năng đáp ứng:**
   - Thời gian tải bản đồ và hiển thị các điểm sự cố trên Web: $< 1.5$ giây.
   - Thời gian phản hồi API tra cứu trạng thái: $< 200$ms.
   - Thời gian xử lý AI DeepSeek Vision chạy nền: $< 5$ giây sau khi gửi phiếu.
2. **Bảo mật & Quyền riêng tư:**
   - Mật khẩu mã hóa bằng thuật toán `bcrypt` an toàn.
   - Toàn bộ API hoạt động qua giao thức mã hóa HTTPS.
   - Áp dụng cơ chế RBAC chặt chẽ (Role-Based Access Control) ngăn chặn việc cán bộ quận này can thiệp vào phiếu của quận khác.
   - 100% hình ảnh hiển thị công khai phải chạy qua bộ lọc làm mờ khuôn mặt và biển số xe (Nghị định 13/2023/NĐ-CP).
3. **Tính sẵn sàng & Khả năng sao lưu:**
   - Cơ sở dữ liệu PostgreSQL được cấu hình tự động sao lưu định kỳ hàng ngày.

---

## 8. LỘ TRÌNH THỰC HIỆN DỰ ÁN (ROADMAP & PHASES)

### Giai đoạn 1: Nền tảng Cốt lõi & Web App (Tuần 1 - Tuần 4)

- Thiết lập CSDL PostgreSQL + PostGIS trên Docker.
- Xây dựng Backend FastAPI: Xác thực (Google OAuth + Email/SĐT), CRUD Sự cố, Open311 API.
- Tích hợp DeepSeek Vision API cho quy trình phân loại ảnh và gợi ý cơ quan xử lý.
- Xây dựng Frontend Web/PWA bằng Next.js + MapLibre GL JS:
  - Trang công dân: Form báo cáo, cắm ghim bản đồ, kiểm tra trùng lặp pre-submission, tra cứu ticket.
  - Trang quản trị/điều hành: Bảng Kanban, duyệt phân loại AI, bộ đếm ngược SLA, bản đồ nhiệt Heatmap.

### Giai đoạn 2: Tích hợp Đa kênh - Facebook Fanpage (Tuần 5 - Tuần 6)

- Đăng ký Facebook App và cấu hình Fanpage Messenger Webhook.
- Xây dựng kịch bản Chatbot tự động hướng dẫn gửi ảnh và vị trí GPS.
- Liên thông dữ liệu tin nhắn Messenger trực tiếp vào CSDL hệ thống và trả mã tra cứu cho người dùng.

### Giai đoạn 3: Kiểm thử, Tối ưu & Chuẩn bị Báo cáo (Tuần 7 - Tuần 8)

- Triển khai kịch bản thử nghiệm giả lập 4 vai trò trên toàn địa bàn 8 quận/huyện Đà Nẵng.
- Đánh giá độ chính xác phân loại của DeepSeek Vision trên tập ảnh thực tế tại Đà Nẵng.
- Đo lường hiệu quả giảm tải trùng lặp của thuật toán PostGIS.
- Đóng gói mã nguồn Docker Compose hoàn chỉnh và hoàn thiện tài liệu thuyết minh Đồ án tốt nghiệp.

### Giai đoạn 4 (Mở rộng nếu còn thời gian):

- Tích hợp Zalo OA Webhook.
- Port tính năng Web sang ứng dụng di động Native Mobile (Flutter).
