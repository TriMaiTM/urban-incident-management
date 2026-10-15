---
trigger: glob
globs: frontend/**/*.{ts,tsx,js,jsx}
---

# Frontend Next.js (App Router), TypeScript & MapLibre GL Guardrails

1. **Strict TypeScript:** Never use `any`. Define explicit interfaces matching backend Pydantic schemas for all `/api/v1/*` responses.
2. **MapLibre GL & Da Nang Viewport:**
   - Restrict MapLibre GL `maxBounds` to `[[107.80, 15.80], [108.50, 16.35]]`.
   - Carefully convert between MapLibre/GeoJSON `[lng, lat]` arrays and `{lat, lon}` query/body parameters when calling `/api/v1/zones/validate-location` or `/api/v1/incidents/nearby?lat=...&lon=...&radius=50`.
3. **Mechanical Verification:** Run `npx tsc --noEmit` and `npm run lint` inside `frontend/` after every UI change.
