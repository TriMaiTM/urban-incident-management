---
trigger: model_decision
description: Domain invariants from docs/spec.md: exact database ENUMs, Incident State Machine transitions, OpenCV Decree 13 blurring, DeepSeek Vision JSON schema, and 50m spatial deduplication.
---

# Core Domain & Schema Invariants (from docs/spec.md)

1. **Strict Database ENUM Values (Never invent unlisted values):**
   - `User.role`: `CITIZEN`, `DISPATCHER`, `TECHNICIAN`, `ADMIN` (Seeded demo accounts: `admin@danang.gov.vn`, `dispatcher@danang.gov.vn`, `technician@danang.gov.vn`, `citizen@danang.gov.vn`).
   - `User.auth_provider`: `LOCAL`, `GOOGLE`, `FACEBOOK`.
   - `Department.level`: `CITY_DEPT`, `UTILITY_COMPANY`, `DISTRICT_GOV`, `WARD_GOV`.
   - `Category.code`: `ROAD_DAMAGE`, `FLOODING`, `FALLEN_TREE`, `GARBAGE`, `STREETLIGHT`, `OTHER`.
   - `Incident.priority`: `LOW`, `NORMAL`, `HIGH`, `EMERGENCY`.
   - `Incident.status`: `SUBMITTED`, `TRIAGED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CONFIRMED`, `CLOSED`, `REJECTED`.
   - `Incident.channel`: `WEB`, `MESSENGER`, `ZALO`.
   - `IncidentMedia.media_type`: `BEFORE_ORIGINAL`, `BEFORE_ANONYMIZED`, `AFTER_PROOF`.

2. **Incident State Machine & Audit Trail (`incident_history`):**
   - Every `status` transition on `incidents` MUST insert an audit record into `incident_history` (`incident_id`, `actor_id`, `from_status`, `to_status`, `note`).
   - Transition `IN_PROGRESS` -> `RESOLVED`: MUST verify that at least one `incident_media` record with `media_type = 'AFTER_PROOF'` exists for the incident; otherwise reject with `400`/`422`.
   - Citizen Feedback (`incident_feedback`):
     - If `rating >= 3`: Transition `status` from `RESOLVED` to `CONFIRMED`.
     - If `rating <= 2` (Disputed): Revert `status` directly from `RESOLVED` back to `IN_PROGRESS`, reset `resolved_at = NULL`, and log `incident_history` with `note = 'Citizen rejected resolution'`.

3. **Privacy Anonymization (OpenCV - Decree 13/2023/ND-CP):**
   - Store unblurred original uploads (`BEFORE_ORIGINAL`) in `backend/uploads/private/` — NEVER mount publicly; restrict access to `DISPATCHER` and `ADMIN`.
   - Blur faces and license plates using OpenCV Gaussian Blur (`ksize=(35, 35)`) and store as `BEFORE_ANONYMIZED` in `backend/uploads/public/` for public viewing.

4. **DeepSeek Vision API Schema:**
   - Execute asynchronously in background tasks using Base64 Data URI images plus active `categories.code` and `departments.code` from DB.
   - Strict JSON output keys: `category_code`, `priority`, `suggested_department_code`, `summary_vi`, `hazard_warning`, `confidence`.
