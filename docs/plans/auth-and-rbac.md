# Kế hoạch Triển khai: Hệ thống Xác thực JWT, Google OAuth và Phân quyền RBAC

* **Mã tính năng:** `auth-and-rbac`
* **Nhánh dự kiến:** `feat/auth-and-rbac`
* **Mục tiêu:** Xây dựng đầy đủ dịch vụ xác thực người dùng (đăng ký/đăng nhập Email & SĐT, đăng nhập Google OAuth 2.0, cấp phát JWT Access Token), middleware phân quyền RBAC cho 4 vai trò (`CITIZEN`, `DISPATCHER`, `TECHNICIAN`, `ADMIN`), và thiết lập 4 tài khoản giả định phục vụ demo kịch bản đồ án.
* **Trạng thái:** Đã hoàn thành (Completed)

---

## 1. Phạm vi (Scope & Non-goals)

### Trong phạm vi (In-scope):
* **Bảo mật & Mã hóa:**
  * Băm và so khớp mật khẩu bằng `bcrypt`.
  * Cấp phát và giải mã JWT Token (thuật toán HS256, thời hạn cấu hình qua `ACCESS_TOKEN_EXPIRE_MINUTES`).
* **Endpoints Xác thực (`/api/v1/auth`):**
  * `POST /api/v1/auth/register`: Đăng ký tài khoản công dân mới bằng Email hoặc SĐT + Mật khẩu.
  * `POST /api/v1/auth/login`: Đăng nhập (hỗ trợ nhập email hoặc SĐT), trả về JWT `access_token` và thông tin vai trò.
  * `POST /api/v1/auth/google`: Đăng nhập một chạm qua Google ID Token (tự động tạo user mới nếu chưa tồn tại).
  * `GET /api/v1/auth/me`: Lấy thông tin chi tiết của người dùng đang đăng nhập.
* **Hệ thống Phân quyền RBAC (Role-Based Access Control):**
  * Dependency `get_current_user`: Trích xuất và xác thực JWT token từ Header `Authorization: Bearer <token>`.
  * Dependency `require_roles(allowed_roles: List[str])`: Kiểm tra vai trò của người dùng; trả về `403 Forbidden` nếu không đủ thẩm quyền.
* **Dữ liệu Mồi Tài khoản Giả định (4 Roles):**
  * Cập nhật `seed_data.py` nạp sẵn 4 tài khoản mẫu chuẩn để nhóm 2 người dễ dàng demo chuyển đổi vai trò:
    1. Admin IOC: `admin@danang.gov.vn` (`ADMIN`)
    2. Điều phối viên IOC: `dispatcher@danang.gov.vn` (`DISPATCHER`)
    3. Cán bộ hiện trường Thoát nước: `technician@danang.gov.vn` (`TECHNICIAN`, gán phòng ban `CTN_DN`)
    4. Công dân Đà Nẵng: `citizen@danang.gov.vn` (`CITIZEN`)
* **Kiểm thử tự động:**
  * Bộ test suite `test_auth.py` kiểm tra: Đăng ký thành công/trùng lặp, đăng nhập đúng/sai mật khẩu, giải mã token, chặn truy cập sai quyền (RBAC guard).

### Ngoài phạm vi (Non-goals):
* Gửi email/SMS OTP thật (tốn phí dịch vụ SMS gateway; dùng mật khẩu và Google OAuth để xác thực).
* Tạo phiếu sự cố (chuyển sang feature tiếp theo).

---

## 2. Danh sách các tệp thay đổi & tạo mới

* **Tạo mới:**
  * `backend/app/core/security.py`: Logic băm mật khẩu `bcrypt` và ký/giải mã JWT.
  * `backend/app/schemas/auth.py`: Pydantic request/response schemas cho auth.
  * `backend/app/api/deps.py`: FastApi dependencies (`get_db`, `get_current_user`, `require_roles`).
  * `backend/app/api/v1/endpoints/auth.py`: Router `/auth`.
  * `backend/tests/conftest.py`: Fixture tái chế database connection pool giữa các async tests.
  * `backend/tests/test_auth.py`: Kiểm thử tự động luồng xác thực & phân quyền.
* **Cập nhật:**
  * `backend/app/schemas/__init__.py`: Export schemas auth mới.
  * `backend/app/api/v1/router.py`: Gắn router `auth`.
  * `backend/scripts/seed_data.py`: Cập nhật mật khẩu hash cho các tài khoản demo.
  * `backend/requirements.txt`: Bổ sung `email-validator`.
  * `docs/plans/auth-and-rbac.md`: Theo dõi tiến độ.

---

## 3. Các bước triển khai tuần tự (Ordered Steps)

### [x] Bước 1: Xây dựng Module Bảo mật & Hash Mật khẩu (`security.py`)
* **Hành động:** 
  * Tạo `backend/app/core/security.py` sử dụng thư viện `bcrypt` và `jose` (hoặc `PyJWT`).
  * Cung cấp các hàm: `verify_password(plain, hashed)`, `get_password_hash(password)`, `create_access_token(subject, role, expires_delta)`, `decode_access_token(token)`.
* **Kết quả:** Đã hoàn thành và xác thực với thuật toán HS256 và bcrypt.

### [x] Bước 2: Xây dựng Pydantic Schemas cho Xác thực (`schemas/auth.py`)
* **Hành động:** 
  * Định nghĩa `UserRegisterIn` (email, phone, full_name, password), `UserLoginIn` (username, password), `GoogleLoginIn` (id_token), `TokenOut` (access_token, token_type, user), `UserOut` (id, email, phone, full_name, role, department_id).
* **Kết quả:** Đã hoàn thành và export tại `backend/app/schemas/__init__.py`.

### [x] Bước 3: Xây dựng Middleware Dependencies (`deps.py`)
* **Hành động:**
  * Tạo `backend/app/api/deps.py`.
  * Hàm `get_current_user`: Đọc Bearer token từ header, giải mã `sub` (user_id), truy vấn `User` từ database.
  * Hàm `require_roles(roles)`: Trả về sub-dependency kiểm tra `user.role in roles`.
* **Kết quả:** Đã hoàn thành và có test case `test_rbac_require_roles_guard`.

### [x] Bước 4: Xây dựng Endpoints Xác thực (`/api/v1/auth`) & Tích hợp Router
* **Hành động:**
  * Tạo `backend/app/api/v1/endpoints/auth.py`:
    * `POST /register`: Kiểm tra trùng email/phone $\rightarrow$ Lưu user với mật khẩu đã hash $\rightarrow$ Cấp token.
    * `POST /login`: Kiểm tra tồn tại user $\rightarrow$ Kiểm tra mật khẩu $\rightarrow$ Cấp token.
    * `POST /google`: Xác minh token qua Google API (hỗ trợ dev mock khi `DEBUG=True`) $\rightarrow$ Tạo/cập nhật user $\rightarrow$ Cấp token.
    * `GET /me`: Trả về thông tin user từ `get_current_user`.
  * Gắn `auth.router` vào `backend/app/api/v1/router.py`.
* **Kết quả:** Đã hoàn thành và liên kết router API v1.

### [x] Bước 5: Cập nhật Dữ liệu Mồi (4 Tài khoản Giả định theo Roles)
* **Hành động:**
  * Cập nhật `backend/scripts/seed_data.py` để tạo sẵn 4 tài khoản tương ứng 4 vai trò với mật khẩu mặc định `Password123@`:
    * `admin@danang.gov.vn` (Admin)
    * `dispatcher@danang.gov.vn` (Điều phối viên)
    * `technician@danang.gov.vn` (Kỹ thuật viên)
    * `citizen@danang.gov.vn` (Công dân)
  * Chạy `py backend/scripts/seed_data.py`.
* **Kết quả:** Đã nạp thành công vào CSDL PostGIS đang chạy trên Docker.

### [x] Bước 6: Viết Bộ Kiểm thử Tự động & Chạy Toàn bộ Test Suite
* **Hành động:**
  * Tạo `backend/tests/test_auth.py` bao quát: đăng ký mới, đăng nhập thành công, đăng nhập sai mật khẩu, gọi `/me` thành công, chặn quyền không hợp lệ.
  * Chạy `py -m pytest`.
* **Kết quả:** 8/8 tests xanh (auth + zones).

---

## 4. Rủi ro & Biện pháp Xử lý (Risks & Mitigations)

* **Rủi ro:** Khi dev local chưa cấu hình Google Client ID/Secret thật trên Google Cloud Console, lệnh gọi Google API có thể thất bại.
  * *Biện pháp:* Trong endpoint `/google`, khi `DEBUG = True` và client gửi token dạng `mock_google_token:<email>`, backend cho phép tạo/đăng nhập user dev để không làm gián đoạn quá trình kiểm thử tự động.
