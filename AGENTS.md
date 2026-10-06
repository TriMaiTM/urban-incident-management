# AGENTS.md

Urban Incident Management Platform for Danang Core Urban Zone (DATN HK10).

## 1. Stack
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (asyncio + asyncpg), GeoAlchemy2, OpenCV (automated face and license plate blurring for Decree 13/2023/ND-CP privacy compliance).
- **Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS v4.
- **Database:** PostgreSQL 16 + PostGIS 3.4 + pgvector (`postgis/postgis:16-3.4-alpine`).
- **External APIs:** DeepSeek Multimodal/Vision API (automated incident classification and department triage), Goong Maps Geocoding & Tiles, Facebook Messenger Graph API.
- **DevOps:** Docker Compose.

## 2. Commands
Run commands from the respective service folder or repo root:
- **Database:** `docker compose up -d db` (starts PostGIS on port 5432)
- **All Services:** `docker compose up -d` / `docker compose down`
- **Backend Install:** `py -m pip install -r backend/requirements.txt`
- **Backend Dev:** `uvicorn app.main:app --reload --port 8000` (inside `backend/`)
- **Backend Syntax Check:** `py -m py_compile backend/app/main.py`
- **Backend Tests:** `py -m pytest` (inside `backend/`)
- **Frontend Install:** `npm install` (inside `frontend/`)
- **Frontend Dev:** `npm run dev` (inside `frontend/`, port 3000)
- **Frontend Lint & Build:** `npm run lint` / `npm run build` (inside `frontend/`)

## 3. Structure
- `backend/app/`: FastAPI application
  - `core/`: Config (`config.py`), database engine & session (`database.py`), security
  - `api/v1/`: Versioned endpoints (`router.py`, `auth/`, `incidents/`, `zones/`, `webhooks/`)
  - `models/`: SQLAlchemy ORM models (`users`, `incidents`, `departments`, `system_zones`)
  - `schemas/`: Pydantic request/response schemas
  - `services/`: Business logic (DeepSeek Vision, Geofencing, Anonymization, Deduplication)
- `frontend/src/app/`: Next.js App Router (pages, layout, components)
- `docs/`: System documentation (`spec.md`, `research/`, `plans/`)
- `docker-compose.yml`: Local multi-container development environment

## 4. Conventions
- **Language:** Code, comments, commit messages, and variable names in English. User communication in Vietnamese.
- **Typing:** Strict typing everywhere (Pydantic v2 models on backend, TypeScript on frontend). Avoid `Any`.
- **Database Access:** Always asynchronous (`AsyncSession`, `select`, `await session.commit()`).
- **GIS Operations:** All coordinates formatted as WGS84 (`SRID 4326`). Spatial validation via PostGIS (`ST_Contains`, `ST_DWithin`).
- **AI Integration:** Use DeepSeek Multimodal/Vision API with structured JSON output schema; never execute inference synchronously in request threads.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). Work on feature branches.

## 5. Boundaries (Do not touch)
- Never hardcode or commit API keys/tokens (`DEEPSEEK_API_KEY`, `GOONG_API_KEY`, `SECRET_KEY`).
- Do not bypass PostGIS geofence checks (incidents outside active Danang Core zones must be rejected).
- Do not store unblurred faces/license plates in public media (`BEFORE_ANONYMIZED`).
- Never perform destructive database actions (`DROP DATABASE`, force reset) without approval.

## 6. Definition of Done
1. Code conforms to project architecture in `docs/spec.md`.
2. Syntax check and typecheck pass without errors.
3. Applicable tests green (or verified via API / browser inspection).
4. Feature step ticked in `docs/plans/<feature>.md`.
5. `.env.example` kept in sync if new environment variables were introduced.
