# BÁO CÁO TIẾN ĐỘ THỰC HIỆN ĐỒ ÁN TỐT NGHIỆP (CHECKPOINT)

**Đề tài:** Phát triển nền tảng tiếp nhận, phân loại và quản lý sự cố hạ tầng đô thị tích hợp trí tuệ nhân tạo tại thành phố Đà Nẵng  
**Mã dự án:** `DATN-HK10-URBAN-INCIDENT`  
**Sinh viên thực hiện:** Đoàn Văn Trí - Bùi Quốc Tuấn  
**Thời gian cập nhật:** 17/11/2026  
**Tiến độ ước tính tổng thể:** **100% Hoàn thành Backend, CSDL Không gian 7 Quận/Huyện, AI Pipeline & Tích hợp 34 Màn hình Next.js V2**

---

## 1. TỔNG QUAN TIẾN ĐỘ & KẾT QUẢ ĐÃ ĐẠT ĐƯỢC

Đến thời điểm hiện tại, nhóm đã hoàn thành **100% Hạ tầng Backend & CSDL Không gian (PostGIS 7 Quận/Huyện)**, **Động cơ AI DeepSeek Vision & Làm mờ Nghị định 13/2023/NĐ-CP**, **Máy trạng thái 9 bước khép kín**, **Các API Quản trị & Điều hành phụ trợ**, **Chuyển đổi & Ghép nối toàn bộ 34 Màn hình Bento V2 + Component Library sang Next.js 16 App Router (`frontend/`)** và bộ kiểm thử tự động **`612 passed, 0 failed`**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIẾN ĐỘ TRIỂN KHAI DỰ ÁN                        │
├──────────────────────────────────────────────────────┬─────────────────┤
│ Phân hệ / Hạng mục công việc                         │ Trạng thái      │
├──────────────────────────────────────────────────────┼─────────────────┤
│ 1. Hạ tầng CSDL Không gian (PostGIS & 7 Quận/Huyện)  │ 100% Hoàn thành │
│ 2. AI Thị giác phân loại sự cố (DeepSeek Vision)     │ 100% Hoàn thành │
│ 3. Bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP) │ 100% Hoàn thành │
│ 4. Tiếp nhận đa kênh: Facebook Messenger Bot         │ 100% Hoàn thành │
│ 5. Chuẩn giao tiếp quốc tế Open311 GeoReport v2      │ 100% Hoàn thành │
│ 6. Máy trạng thái 9 bước, SLA & API Điều phối IOC    │ 100% Hoàn thành │
│ 7. API Kỹ thuật viên hiện trường & Đối chiếu GPS     │ 100% Hoàn thành │
│ 8. API Quản trị (Users, Zones, SLA, Audit, Analytics)│ 100% Hoàn thành │
│ 9. Chuyển đổi 34 màn hình V2 sang Next.js & Ghép API │ 100% Hoàn thành │
└──────────────────────────────────────────────────────┴─────────────────┘
```

---

## 2. CHI TIẾT CÁC HẠNG MỤC ĐÃ HOÀN THÀNH

### 2.1. Hạ tầng Không gian Địa lý (Spatial GIS) & Chống trùng lặp 50m
- **Công nghệ:** PostgreSQL 16 + PostGIS 3.4 (`postgis/postgis:16-3.4-alpine`), hệ tọa độ chuẩn WGS84 (`SRID 4326`), thứ tự `Point(longitude, latitude)`.
- **Hàng rào địa lý (Geo-fencing) Vùng Đô thị Lõi:** Đa giác ranh giới khép kín chuẩn xác **8.007 đỉnh trắc địa** (bao trọn 6 quận nội thành và huyện Hòa Vang). Tự động kiểm tra bằng `ST_Contains` tại cả `/api/v1/incidents`, `/api/v1/zones/validate-location` và `/open311/v2/requests.json`.
- **Chống trùng lặp không gian (`ST_DWithin` 50m) & Gộp phiếu:**
  - Quét sự cố lân cận trong bán kính 50m (`GET /api/v1/incidents/nearby` trả kèm `category_code`, `distance_meters`).
  - Hỗ trợ cả công dân bấm "+1 Tôi cũng gặp" (`POST /api/v1/incidents/{id_or_code}/vote-duplicate`) lẫn Điều phối viên IOC gộp 2 phiếu trùng (`POST /api/v1/incidents/{id_or_code}/merge-duplicate`).

### 2.2. Trí tuệ Nhân tạo Phân loại Trước & Sau Khi Gửi (DeepSeek Vision API)
- **Phân tích ảnh trước khi gửi (`POST /api/v1/incidents/analyze-image`):**
  - Giới hạn tần suất trong bộ nhớ tiến trình theo `user_id` (khi đã đăng nhập) hoặc IP khách (chỉ tin cậy `X-Forwarded-For` khi nguồn kết nối thuộc `TRUSTED_PROXIES`).
  - Thực hiện làm mờ khuôn mặt/biển số xe theo Nghị định 13 trong thư mục tạm **trước** khi gửi sang DeepSeek Vision, xóa sạch tệp tạm ngay trong khối `finally` kể cả khi lỗi/timeout, không ghi ảnh/nội dung phân tích vào log, và trả mã `502` rõ ràng khi dịch vụ AI gián đoạn.
- **Lưu mức độ ưu tiên đề xuất (`is_priority_suggested`):**
  - `POST /api/v1/incidents` nhận `category_code` và `priority` do người dân xác nhận với cờ `is_priority_suggested = True`; khi Điều phối viên gọi `/triage` hoặc `/assign`, cờ này tự động chuyển về `False`.

### 2.3. Bảo vệ Quyền riêng tư Hình ảnh & Dữ liệu Cá nhân (Nghị định 13/2023/NĐ-CP)
- Tự động nhận diện và làm mờ khuôn mặt/biển số xe bằng OpenCV Haar Cascade + Gaussian Blur trên cả ảnh trước (`BEFORE_ANONYMIZED`) và ảnh minh chứng sau khắc phục (`AFTER_PROOF`).
- Bảo mật trường nhạy cảm theo vai trò:
  - Ẩn ảnh gốc `BEFORE_ORIGINAL` và che số điện thoại công dân (`0905***004`) với người dùng không phải `DISPATCHER`/`ADMIN`.
  - Chỉ hiển thị lý do từ chối (`rejection_reason`) cho chủ phiếu, `DISPATCHER`, hoặc `ADMIN`.
  - Rút gọn tên kỹ thuật viên (dạng `"Trần V. K."`) đối với khách truy cập không đăng nhập.

### 2.4. Máy Trạng thái 9 Bước, Cam kết SLA & Chu trình Khiếu nại Khép kín
- **Vòng đời 9 trạng thái:**
  `SUBMITTED` $\rightarrow$ `TRIAGED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CONFIRMED` $\rightarrow$ `CLOSED` (nhánh từ chối: `REJECTED` từ `{SUBMITTED, TRIAGED, ASSIGNED}`; nhánh mở lại: `REOPENED` từ `RESOLVED` hoặc `CONFIRMED`).
- **Quyền sở hữu kỹ thuật viên & Nghiệm thu/Đóng phiếu:**
  - Chỉ `TECHNICIAN` được giao đích danh hoặc thuộc cùng đơn vị phụ trách (khi chưa gán đích danh, tự động nhận việc) mới được chuyển `IN_PROGRESS` / `RESOLVED` (kèm tọa độ GPS ảnh `AFTER_PROOF`).
  - Chỉ công dân chủ phiếu mới được xác nhận đóng (`CONFIRMED -> CLOSED` với `action="CONFIRM"`, điểm sao tùy chọn) hoặc khiếu nại mở lại (`CONFIRMED -> REOPENED` với `action="DISPUTE"` và lý do bắt buộc). Phiếu khách vãng lai (`citizen_id` rỗng) cho phép `DISPATCHER`/`ADMIN` đóng từ `CONFIRMED`.
- **Cam kết SLA (`4h / 12h / 24h / 48h`):**
  - Tính từ `created_at` theo `priority` (`EMERGENCY=4h, HIGH=12h, NORMAL=24h, LOW=48h`), tính lại khi đổi `priority` ở bước `/triage`, và **đặt lại hạn `sla_due_at` mới tính từ thời điểm mở lại (`REOPENED`)**.

### 2.5. Hệ thống Quản trị, Nhật ký Kiểm toán, Đa kênh Messenger & Open311 v2
- **Quản trị & Hồ sơ:** Cập nhật hồ sơ (`PATCH /api/v1/auth/me`), đổi mật khẩu (`POST /api/v1/auth/change-password`), quản lý người dùng & khóa tài khoản (`GET/POST/PATCH /api/v1/users` với `is_locked`), bật/tắt phân vùng (`GET/PATCH /api/v1/zones`), cấu hình danh mục & đơn vị (`PATCH /api/v1/categories/{id}`, `POST/PATCH /api/v1/departments`), và nhật ký kiểm toán toàn hệ thống (`GET /api/v1/audit-logs`).
- **Analytics IOC (`/api/v1/incidents/analytics/summary`):** Trả đầy đủ phân bổ 9 trạng thái, 4 mức ưu tiên, tỷ lệ tuân thủ SLA, thời gian giải quyết trung bình (`avg_resolution_time_minutes`), điểm hài lòng (`avg_satisfaction_rating`, `satisfaction_score`), và tỷ lệ hoàn tất theo quận (`completion_rate_by_district` tính `CONFIRMED + CLOSED`).
- **Open311 GeoReport v2 & Messenger Bot:** Đầy đủ `GET /open311/v2/services.json`, `GET /open311/v2/requests.json`, `POST /open311/v2/requests.json`, `GET /open311/v2/requests/{id}.json` và Webhook Facebook Messenger (`/api/v1/webhooks/facebook`).

---

## 3. MINH CHỨNG KIỂM THỬ & DỮ LIỆU DEMO

1. **Bộ kiểm thử tự động (`pytest` & `next build`):**
   - Backend vượt qua **612 / 612 tests (`0 failed`)** bao gồm kiểm thử đơn vị, ma trận 380 tổ hợp chuyển trạng thái/vai trò, kiểm thử 7 đa giác GIS Quận/Huyện (`HC`, `TK`, `ST`, `CL`, `NHS`, `LC`, `HV`), kiểm thử OpenAPI (`docs/openapi.json`), và kiểm thử End-to-End trên container PostgreSQL + PostGIS thật (`test_e2e_lifecycle_db.py`).
   - Frontend Next.js 16 App Router vượt qua **`npx tsc --noEmit` (0 lỗi)** và **`npm run build` (34 route + `/gallery` biên dịch thành công)**.
2. **Kịch bản dữ liệu Demo (`scripts/seed_demo.py`):**
   - Khởi tạo tự động 4 vai trò (`CITIZEN`, `DISPATCHER`, `TECHNICIAN` có `department_id`, `ADMIN`), 7 đa giác GIS Quận/Huyện và đẩy 9 phiếu sự cố đi qua đúng các API của máy trạng thái bao phủ đủ 9 trạng thái, nổi bật là phiếu mẫu xuyên suốt **`DN-202610-0129`** (Ngập úng nút giao Nguyễn Văn Linh - Hàm Nghi, mức Cao).

---

## 4. LỘ TRÌNH KẾ TIẾP

1. **Chạy Demo End-to-End trực quan** giữa `frontend/` (Next.js port 3000) và `backend/` (FastAPI port 8000 + PostGIS 5432).
2. **Đóng gói Docker Compose & Hoàn thiện Thuyết minh Đồ án Tốt nghiệp.**
