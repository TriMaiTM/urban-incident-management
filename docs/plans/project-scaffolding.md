# Kế hoạch Triển khai: Khởi tạo Khung Dự án (Project Scaffolding)

* **Tính năng:** Khởi tạo cấu trúc monorepo cho Nền tảng Quản lý Sự cố Hạ tầng Đô thị Đà Nẵng
* **Mục tiêu:** Thiết lập cấu trúc thư mục hoàn chỉnh, cấu hình `.gitignore` toàn diện, dựng khung Backend (FastAPI), Frontend (Next.js), CSDL (Docker PostGIS), và cấu hình biến môi trường `.env.example`.
* **Trạng thái:** Đang thực hiện

---

## 1. Danh sách các file & thư mục tạo mới
- [x] `.gitignore`: Bao quát Python, Node/Next.js, PostGIS data, upload media, OS, IDEs, .env.
- [x] `docker-compose.yml`: Dịch vụ PostgreSQL 16 + PostGIS 3.4, Backend FastAPI, Frontend Next.js.
- [x] `backend/`:
  - [x] `backend/requirements.txt`: FastAPI, Uvicorn, SQLAlchemy, asyncpg, GeoAlchemy2, Shapely, Pydantic, HTTPX, PyJWT, passlib, OpenCV, python-multipart.
  - [x] `backend/Dockerfile`
  - [x] `backend/.env.example`
  - [x] `backend/app/main.py`: Entrypoint FastAPI với CORS, health check endpoint.
  - [x] `backend/app/core/config.py`: Cấu hình Pydantic settings.
  - [x] `backend/app/core/database.py`: Async engine & sessionmaker kết nối PostGIS.
  - [x] `backend/app/api/v1/router.py`: Bộ định tuyến chính API v1.
- [x] `frontend/`:
  - [x] Cấu trúc Next.js App Router (TypeScript, Tailwind CSS).
  - [x] `frontend/.env.example`
- [x] `docs/plans/project-scaffolding.md`: Tài liệu theo dõi tiến độ.

---

## 2. Các bước thực hiện tuần tự

### Bước 1: Thiết lập `.gitignore` toàn diện
* **Hành động:** Viết file `.gitignore` bao quát đầy đủ mọi thành phần môi trường (Python virtualenv, cache bytecode, node_modules, .next, .env, docker volume data, upload files, OS artifacts).
* **Kiểm chứng:** Chạy `git status` xác nhận các file nhạy cảm và cache không bị track.

### Bước 2: Thiết lập Docker Compose cho Cơ sở dữ liệu PostGIS
* **Hành động:** Tạo `docker-compose.yml` với image `postgis/postgis:16-3.4-alpine`, expose port 5432, cấu hình persistent volume và healthcheck.
* **Kiểm chứng:** Cú pháp docker-compose hợp lệ (`docker compose config`).

### Bước 3: Khởi tạo khung Backend (FastAPI)
* **Hành động:** Tạo cấu trúc thư mục `backend/app/`, file `requirements.txt`, `backend/.env.example`, `backend/Dockerfile`, và `main.py` với endpoint `/api/health`.
* **Kiểm chứng:** Kiểm tra cấu trúc code bằng lệnh `py` syntax check.

### Bước 4: Khởi tạo khung Frontend (Next.js)
* **Hành động:** Khởi tạo Next.js App Router với TypeScript và Tailwind CSS trong thư mục `frontend/`.
* **Kiểm chứng:** Kiểm tra file `package.json`, cấu hình Tailwind, và file layout/page.

### Bước 5: Báo cáo kết quả và danh mục tệp cho User commit
* **Hành động:** Liệt kê các tệp đã tạo, kiểm tra `git status` và thông báo cho người dùng để commit.
