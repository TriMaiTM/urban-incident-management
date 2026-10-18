---
trigger: glob
globs: frontend/**/*.{ts,tsx,js,jsx}
---

# Frontend Next.js (App Router), TypeScript & MapLibre GL Guardrails

1. **Strict TypeScript:**
   - Never use `any`. Define explicit interfaces matching backend Pydantic schemas for all `/api/v1/*` responses.

2. **MapLibre GL & Da Nang Viewport:**
   - Restrict MapLibre GL `maxBounds` to `[[107.80, 15.80], [108.50, 16.35]]`.
   - Carefully convert between MapLibre/GeoJSON `[lng, lat]` arrays and `{lat, lon}` query/body parameters when calling `/api/v1/zones/validate-location` or `/api/v1/incidents/nearby?lat=...&lon=...&radius=50`.

3. **Mechanical Verification:**
   - Run `npx tsc --noEmit` and `npm run lint` inside `frontend/` after every UI change.

4. **Figma MCP & `shadcn/ui` Usage (Prevent Token Overflow):**
   - When given a full-page Figma link (such as `@shadcn/ui` `Components (light)`), NEVER call `get_design_context` recursively on the entire page canvas.
   - Only call `get_variable_defs` (for color/font/radius tokens) or top-level `get_metadata` to look up specific component `node-id`s, and inspect individual frames only when needed.
   - Prefer installing official `shadcn/ui` primitives via `npx shadcn@latest add <component>` into `frontend/src/components/ui/` rather than recreating base components from scratch.

5. **Banned "AI Slop" Patterns (Reviewer MUST REJECT if found):**
   - **NO decorative gradients or neon glows:** Never use `bg-gradient-to-*`, `from-indigo-*`, `via-purple-*`, or colored drop shadows (`shadow-blue-500/*`).
   - **NO exaggerated rounding or heavy shadows:** Never use `rounded-2xl` or `rounded-3xl` on cards, tables, or panels. Stick to `rounded-md` / `rounded-lg`, crisp `1px` borders (`border-slate-200`), and `shadow-none` or `shadow-sm`.
   - **NO raw HTML UI primitives:** Never build custom unstyled `<button>`, `<select>`, `<dialog>`, or `<table>` when `@/components/ui/*` equivalents exist.
   - **NO marketing fluff:** No hero banners, fake marketing copy, or decorative emojis in headings/buttons.

6. **Da Nang GovTech / IOC Visual & Layout Standards:**
   - **Color Palette:** Clean administrative `slate` base (`bg-slate-50` / `bg-white`), Primary Blue `#1051A6`, and strict semantic status badges:
     - `SUBMITTED` / `TRIAGED`: `slate` / `blue`
     - `ASSIGNED` / `IN_PROGRESS`: `amber`
     - `RESOLVED` / `CONFIRMED` / `CLOSED`: `emerald`
     - `EMERGENCY` / SLA Breach / `422 Geofence Error`: `rose` / `red`
   - **Data Typography:** Always apply `font-mono tabular-nums` to ticket codes (`DN-202610-XXXX`), WGS84 coordinates (`lon, lat`), SLA countdown timers, and AI confidence scores (`%`).
   - **Operational Viewport Architecture:**
     - **Citizen (`/citizen` or `/`) & Dispatcher (`/dispatcher`):** Full-viewport split-screen shell (`h-screen overflow-hidden`), top header `h-14` (`border-b border-slate-200`), scrollable left queue/list panel, and full-height MapLibre GL JS canvas (`h-[calc(100vh-3.5rem)]`).
     - **Technician (`/technician`):** Mobile-first actionable task cards (`max-w-2xl mx-auto`) with status progression and mandatory after-fix photo upload.
     - **Admin (`/admin`):** 4-card KPI strip + department SLA performance table + GIS heatmap/zone layer toggles.
