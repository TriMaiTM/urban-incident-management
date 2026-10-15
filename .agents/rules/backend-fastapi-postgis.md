---
trigger: glob
globs: backend/**/*.py
---

# Backend FastAPI, SQLAlchemy 2.0 Async & PostGIS Guardrails

1. **Async SQLAlchemy Safety (`MissingGreenlet` Prevention):**
   - Always use `AsyncSession`, `select()`, and `await session.commit()`.
   - Keep `expire_on_commit=False` on `async_sessionmaker`.
   - Explicitly use `selectinload` or `joinedload` when querying relationships (e.g., `incident.media`, `incident.history`, `user.department`). Never access lazy-loaded attributes outside async context.
2. **PostGIS Spatial Standards (`SRID 4326`):**
   - All geometries use WGS84 (`SRID=4326`): `SystemZone.boundary` is `MULTIPOLYGON`, `Incident.location` is `POINT`.
   - PostGIS `ST_MakePoint(lon, lat)` strictly requires `(longitude, latitude)` order (Da Nang bounds: `107.8 <= lon <= 108.4`, `15.9 <= lat <= 16.3`).
   - Cast to `::geography` when computing meter distances (`ST_DWithin(location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 50)` or `ST_Distance`).
3. **Geofencing Validation (`system_zones`):**
   - Every new incident (Web, Open311, or Messenger) MUST verify `ST_Contains(boundary, point)` against active zones (`system_zones.is_active == True`, e.g., `DANANG_CORE`). Reject out-of-bounds coordinates with `422 Unprocessable Entity`.
4. **Testing & External API Mocking (`pytest`):**
   - Verify syntax with `py -m compileall -q backend/app` and run tests with `py -m pytest` (inside `backend/`).
   - Automated tests MUST mock 100% of external calls to DeepSeek Vision API, Goong Maps API, Facebook Graph API, and Google OAuth. Never consume live quota during tests.
