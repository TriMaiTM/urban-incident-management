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

## 6. Subagent Orchestration & Definition of Done (agy CLI)

All complex tasks must be orchestrated through context-isolated subagents defined in `.agents/agents/`:

- **`planner`**: Explore the codebase in strictly Read-Only mode and write the implementation plan to `docs/plans/<feature>.md`.
- **`builder`**: Execute each atomic step in the plan, write tests (mocking all external APIs), and run mechanical checks.
- **`reviewer`**: Perform an independent audit in a clean context, verifying `git diff` against `docs/plans/<feature>.md` and `docs/spec.md`.
- **`investigator`**: Reproduce bugs and trace root causes for `/fix-bug`, and gather real repository evidence for `/report`.

No step may be marked as completed `[x]` or committed until the **`reviewer`** subagent returns `STATUS: PASS`.
