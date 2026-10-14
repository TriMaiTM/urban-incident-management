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
- **Backend Syntax & Compile Check:** `py -m compileall -q backend/app` (verifies all Python files, not just `main.py`)
- **Backend Tests:** `py -m pytest` (inside `backend/`)
- **Frontend Install:** `npm install` (inside `frontend/`)
- **Frontend Dev:** `npm run dev` (inside `frontend/`, port 3000)
- **Frontend Fast Typecheck:** `npx tsc --noEmit` (inside `frontend/`)
- **Frontend Lint & Full Build:** `npm run lint` / `npm run build` (inside `frontend/`)

## 3. Structure

- `backend/app/`: FastAPI application
  - `core/`: Config (`config.py`), database engine & session (`database.py`), security
  - `api/v1/`: Versioned endpoints (`router.py`, `auth/`, `incidents/`, `zones/`, `webhooks/`)
  - `models/`: SQLAlchemy ORM models (`users`, `incidents`, `departments`, `system_zones`)
  - `schemas/`: Pydantic request/response schemas
  - `services/`: Business logic (DeepSeek Vision, Geofencing, Anonymization, Deduplication)
- `frontend/src/app/`: Next.js App Router (pages, layout, components)
- `docs/`: System documentation (`spec.md`, `research/`, `plans/`, `report/`)
- `docker-compose.yml`: Local multi-container development environment

## 4. Conventions

- **Language:** Code, comments, commit messages, and variable names in English. User communication in Vietnamese.
- **Typing:** Strict typing everywhere (Pydantic v2 models on backend, TypeScript on frontend). Avoid `Any` / `any`.
- **Database Access (Async Safety):** Always asynchronous (`AsyncSession`, `select`, `await session.commit()`). Keep `expire_on_commit=False` on `async_sessionmaker` and use explicit `selectinload`/`joinedload` for relationships to prevent `MissingGreenlet` errors.
- **GIS & Coordinate Order:** All geometries use WGS84 (`SRID 4326`). PostGIS `Point(lon, lat)` strictly takes `(longitude, latitude)` order (Da Nang bounds: `107.8 <= lon <= 108.4`, `15.9 <= lat <= 16.3`), whereas UI/Goong Maps often use `(lat, lon)`. Validate spatial containment via PostGIS (`ST_Contains`, `ST_DWithin`).
- **AI Integration:** Use DeepSeek Multimodal/Vision API with structured JSON output schema; never execute inference synchronously in blocking request threads.
- **Testing & Mocking:** Automated `pytest` suites MUST mock external calls to DeepSeek Vision, Goong Maps, and Facebook Graph API by default so verification loops never consume live quota.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). Work on feature/fix branches.

## 5. Boundaries (Do not touch)

- Never hardcode or commit API keys/tokens (`DEEPSEEK_API_KEY`, `GOONG_API_KEY`, `SECRET_KEY`).
- Do not bypass PostGIS geofence checks (incidents outside active Danang Core zones must be rejected).
- Do not store unblurred faces/license plates in public media (`BEFORE_ANONYMIZED`).
- Never perform destructive database actions (`DROP DATABASE`, force reset) without approval.

## 6. Subagent Orchestration & Definition of Done

No plan step or task is complete until an isolated **Reviewer Subagent** (`invoke_subagent`) independently verifies and returns `STATUS: PASS` on all criteria:

1. **Architecture & Scope:** Changes strictly match `docs/plans/<feature>.md` and `docs/spec.md` with zero edits to files listed under Non-goals.
2. **Mechanical Checks Pass:**
   - Backend: `py -m compileall -q backend/app` and relevant `py -m pytest` pass.
   - Frontend: `npx tsc --noEmit` and `npm run lint` pass (plus `npm run build` after the final step).
3. **UI Verification:** If `frontend/src/` changed and the dev server is running, verify via the Browser subagent (`http://localhost:3000`); otherwise explicitly state it was not visually verified.
4. **State Synced:** Step checkbox is ticked `[x]` in `docs/plans/<feature>.md` and `.env.example` is updated if new env vars were added.
