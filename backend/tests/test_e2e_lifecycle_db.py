"""OpenAPI schema verification, seed_demo verification, and live-DB End-to-End lifecycle tests."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import cv2
import httpx
import numpy as np
import pytest
from sqlalchemy import text

from app.core.database import engine
from app.main import app
from scripts.export_openapi import export_openapi
from scripts.init_db import init_database
from scripts.seed_data import seed_all_data
from scripts.seed_demo import seed_demo


def _create_jpeg_bytes() -> bytes:
    img = np.full((120, 160, 3), (50, 120, 200), dtype=np.uint8)
    cv2.circle(img, (80, 60), 25, (255, 255, 255), -1)
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


async def _is_live_db_available() -> bool:
    """Return True if the PostgreSQL + PostGIS database is reachable."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def test_export_openapi_json_and_verify_new_schemas():
    """Verify docs/openapi.json is generated reproducibly and includes all new lifecycle schemas and fields."""
    out_path = export_openapi()
    assert out_path.is_file(), f"Expected OpenAPI file at {out_path}"

    raw_text = out_path.read_text(encoding="utf-8")
    spec = json.loads(raw_text)

    assert spec["openapi"].startswith("3.")
    paths = spec["paths"]
    assert "/api/v1/incidents/analyze-image" in paths
    assert "post" in paths["/api/v1/incidents/analyze-image"]
    assert "/api/v1/incidents/{id_or_code}" in paths
    assert "/api/v1/incidents/{id_or_code}/triage" in paths
    assert "/api/v1/incidents/{id_or_code}/assign" in paths
    assert "/api/v1/incidents/{id_or_code}/status" in paths
    assert "/api/v1/incidents/{id_or_code}/feedback" in paths
    assert "/api/v1/incidents/{id_or_code}/vote-duplicate" in paths
    assert "/api/v1/incidents/{id_or_code}/merge-duplicate" in paths
    assert "/api/v1/users" in paths
    assert "/api/v1/users/{user_id}" in paths
    assert "/api/v1/zones" in paths
    assert "/api/v1/zones/{zone_id}" in paths
    assert "/api/v1/categories/{category_id}" in paths
    assert "/api/v1/departments" in paths
    assert "/api/v1/departments/{department_id}" in paths
    assert "/api/v1/audit-logs" in paths
    assert "/api/v1/auth/change-password" in paths
    assert "patch" in paths["/api/v1/auth/me"]
    assert "get" in paths["/open311/v2/requests.json"]
    assert "post" in paths["/open311/v2/requests.json"]

    schemas = spec["components"]["schemas"]
    assert "IncidentAnalyzeImageOut" in schemas
    analyze_props = schemas["IncidentAnalyzeImageOut"]["properties"]
    for key in [
        "category_code",
        "priority",
        "suggested_department_code",
        "summary_vi",
        "hazard_warning",
        "confidence",
        "sla_hours",
        "is_blurred",
        "faces_detected",
        "plates_detected",
    ]:
        assert key in analyze_props, f"Missing {key} in IncidentAnalyzeImageOut"

    inc_out_props = schemas["IncidentOut"]["properties"]
    assert "is_priority_suggested" in inc_out_props
    assert "rejection_reason" in inc_out_props

    detail_props = schemas["IncidentDetailOut"]["properties"]
    assert "assigned_technician_name" in detail_props
    assert "is_priority_suggested" in detail_props
    assert "rejection_reason" in detail_props

    media_props = schemas["IncidentMediaOut"]["properties"]
    assert "latitude" in media_props
    assert "longitude" in media_props

    nearby_props = schemas["IncidentNearbyItem"]["properties"]
    assert "category_code" in nearby_props

    map_props = schemas["IncidentMapProperties"]["properties"]
    assert "duplicate_count" in map_props

    analytics_props = schemas["IncidentAnalyticsSummaryOut"]["properties"]
    for key in [
        "avg_resolution_time_minutes",
        "avg_satisfaction_rating",
        "satisfaction_score",
        "completion_rate_by_district",
    ]:
        assert key in analytics_props, f"Missing {key} in IncidentAnalyticsSummaryOut"

    fb_in_props = schemas["IncidentFeedbackCreateIn"]["properties"]
    assert "action" in fb_in_props
    assert "rating" in fb_in_props
    assert "comment" in fb_in_props


@pytest.mark.asyncio
async def test_live_db_end_to_end_full_lifecycle(client: httpx.AsyncClient, tmp_path: Path, monkeypatch):
    """End-to-End lifecycle test against live PostgreSQL + PostGIS database (skipped if DB unavailable).

    Flow: Citizen submits -> Dispatcher triages & assigns -> Technician starts & uploads proof ->
    Dispatcher confirms -> Citizen disputes (reopens) -> Technician re-works & uploads proof ->
    Dispatcher confirms again -> Citizen confirms & closes.
    """
    if not await _is_live_db_available():
        pytest.skip("PostgreSQL database is not reachable; skipping live DB E2E test.")

    await init_database()
    await seed_all_data()

    private_dir = tmp_path / "uploads" / "private"
    public_dir = tmp_path / "uploads" / "public"
    private_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(
        "app.api.v1.endpoints.incidents._get_upload_dirs",
        lambda: (private_dir, public_dir),
    )

    try:
        # 1. Login as Citizen, Dispatcher, and Technician
        cit_login = await client.post(
            "/api/v1/auth/login",
            json={"username": "citizen@danang.gov.vn", "password": "Password123@"},
        )
        assert cit_login.status_code == 200, cit_login.text
        cit_headers = {"Authorization": f"Bearer {cit_login.json()['access_token']}"}

        disp_login = await client.post(
            "/api/v1/auth/login",
            json={"username": "dispatcher@danang.gov.vn", "password": "Password123@"},
        )
        assert disp_login.status_code == 200, disp_login.text
        disp_headers = {"Authorization": f"Bearer {disp_login.json()['access_token']}"}

        tech_login = await client.post(
            "/api/v1/auth/login",
            json={"username": "technician@danang.gov.vn", "password": "Password123@"},
        )
        assert tech_login.status_code == 200, tech_login.text
        tech_body = tech_login.json()
        tech_headers = {"Authorization": f"Bearer {tech_body['access_token']}"}
        tech_id = tech_body["user"]["id"]

        # Lookup FLOODING category & CTN_DN department
        cats = (await client.get("/api/v1/categories")).json()
        flooding_cat = next(c for c in cats if c["code"] == "FLOODING")
        depts = (await client.get("/api/v1/departments")).json()
        ctn_dept = next(d for d in depts if d["code"] == "CTN_DN")

        img_bytes = _create_jpeg_bytes()

        # 2. Citizen submits incident (SUBMITTED)
        with patch("app.api.v1.endpoints.incidents.process_incident_ai_triage", new_callable=AsyncMock):
            res_create = await client.post(
                "/api/v1/incidents",
                headers=cit_headers,
                data={
                    "title": "Ngập sâu đường Nguyễn Văn Linh (E2E Live DB)",
                    "description": "Mưa lớn gây ngập sâu hơn 35cm tại nút giao Nguyễn Văn Linh",
                    "latitude": "16.0606",
                    "longitude": "108.2162",
                    "address_text": "Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
                    "district": "Hải Châu",
                    "ward": "Vĩnh Trung",
                    "citizen_contact": "0905000004",
                    "category_code": "FLOODING",
                    "priority": "HIGH",
                },
                files={"image": ("e2e_before.jpg", img_bytes, "image/jpeg")},
            )
        assert res_create.status_code == 201, res_create.text
        created = res_create.json()
        ticket_code = created["ticket_code"]
        assert created["status"] == "SUBMITTED"
        assert created["priority"] == "HIGH"
        assert created["category_code"] == "FLOODING"
        assert created["is_priority_suggested"] is True

        # 3. Dispatcher triages (SUBMITTED -> TRIAGED) and assigns (TRIAGED -> ASSIGNED)
        res_triage = await client.patch(
            f"/api/v1/incidents/{ticket_code}/triage",
            headers=disp_headers,
            json={
                "category_id": flooding_cat["id"],
                "priority": "HIGH",
                "assigned_department_id": ctn_dept["id"],
                "note": "Điều phối viên xác nhận ngập úng mức Cao",
            },
        )
        assert res_triage.status_code == 200, res_triage.text
        assert res_triage.json()["status"] == "TRIAGED"
        assert res_triage.json()["is_priority_suggested"] is False

        res_assign = await client.patch(
            f"/api/v1/incidents/{ticket_code}/assign",
            headers=disp_headers,
            json={
                "assigned_department_id": ctn_dept["id"],
                "assigned_technician_id": tech_id,
                "note": "Phân công kỹ thuật viên thoát nước xử lý",
            },
        )
        assert res_assign.status_code == 200, res_assign.text
        assert res_assign.json()["status"] == "ASSIGNED"

        # 4. Technician accepts (ASSIGNED -> IN_PROGRESS) and submits proof (IN_PROGRESS -> RESOLVED)
        res_inprog1 = await client.patch(
            f"/api/v1/incidents/{ticket_code}/status",
            headers=tech_headers,
            data={"to_status": "IN_PROGRESS", "note": "Kỹ thuật viên bắt đầu khơi thông cống"},
        )
        assert res_inprog1.status_code == 200, res_inprog1.text
        assert res_inprog1.json()["status"] == "IN_PROGRESS"

        res_resolve1 = await client.patch(
            f"/api/v1/incidents/{ticket_code}/status",
            headers=tech_headers,
            data={
                "to_status": "RESOLVED",
                "note": "Đã thông tắc miệng thu nước lần 1",
                "proof_latitude": "16.0607",
                "proof_longitude": "108.2163",
            },
            files={"proof_image": ("e2e_proof1.jpg", img_bytes, "image/jpeg")},
        )
        assert res_resolve1.status_code == 200, res_resolve1.text
        assert res_resolve1.json()["status"] == "RESOLVED"
        assert res_resolve1.json()["resolved_at"] is not None

        # 5. Dispatcher verifies (RESOLVED -> CONFIRMED)
        res_confirm1 = await client.patch(
            f"/api/v1/incidents/{ticket_code}/status",
            headers=disp_headers,
            data={"to_status": "CONFIRMED", "note": "Duyệt nghiệm thu lần 1"},
        )
        assert res_confirm1.status_code == 200, res_confirm1.text
        assert res_confirm1.json()["status"] == "CONFIRMED"

        # 6. Citizen disputes (CONFIRMED -> REOPENED)
        before_dispute = datetime.now(timezone.utc)
        res_dispute = await client.post(
            f"/api/v1/incidents/{ticket_code}/feedback",
            headers=cit_headers,
            json={
                "action": "DISPUTE",
                "rating": 2,
                "comment": "Nước vẫn còn đọng ở làn trong, đề nghị xử lý lại triệt để",
            },
        )
        assert res_dispute.status_code == 201, res_dispute.text

        detail_reopened = (await client.get(f"/api/v1/incidents/{ticket_code}", headers=cit_headers)).json()
        assert detail_reopened["status"] == "REOPENED"
        assert detail_reopened["resolved_at"] is None
        new_sla = datetime.fromisoformat(detail_reopened["sla_due_at"].replace("Z", "+00:00"))
        assert new_sla >= before_dispute + timedelta(hours=11, minutes=50)

        # 7. Technician re-works (REOPENED -> IN_PROGRESS -> RESOLVED) and Dispatcher confirms again (RESOLVED -> CONFIRMED)
        res_inprog2 = await client.patch(
            f"/api/v1/incidents/{ticket_code}/status",
            headers=tech_headers,
            data={"to_status": "IN_PROGRESS", "note": "Kỹ thuật viên xử lý lại hiện trường"},
        )
        assert res_inprog2.status_code == 200, res_inprog2.text
        assert res_inprog2.json()["status"] == "IN_PROGRESS"

        res_resolve2 = await client.patch(
            f"/api/v1/incidents/{ticket_code}/status",
            headers=tech_headers,
            data={
                "to_status": "RESOLVED",
                "note": "Đã hút bùn lòng cống và thoát nước hoàn toàn lần 2",
                "proof_latitude": "16.0606",
                "proof_longitude": "108.2162",
            },
            files={"proof_image": ("e2e_proof2.jpg", img_bytes, "image/jpeg")},
        )
        assert res_resolve2.status_code == 200, res_resolve2.text
        assert res_resolve2.json()["status"] == "RESOLVED"
        second_resolved_at = res_resolve2.json()["resolved_at"]
        assert second_resolved_at is not None

        res_confirm2 = await client.patch(
            f"/api/v1/incidents/{ticket_code}/status",
            headers=disp_headers,
            data={"to_status": "CONFIRMED", "note": "Duyệt nghiệm thu lần 2"},
        )
        assert res_confirm2.status_code == 200, res_confirm2.text
        assert res_confirm2.json()["status"] == "CONFIRMED"

        # 8. Citizen confirms satisfaction and closes (CONFIRMED -> CLOSED)
        res_close = await client.post(
            f"/api/v1/incidents/{ticket_code}/feedback",
            headers=cit_headers,
            json={
                "action": "CONFIRM",
                "rating": 5,
                "comment": "Mặt đường đã khô ráo hoàn toàn, cảm ơn đội ngũ kỹ thuật.",
            },
        )
        assert res_close.status_code == 201, res_close.text
        assert res_close.json()["rating"] == 5

        final_detail = (await client.get(f"/api/v1/incidents/{ticket_code}", headers=cit_headers)).json()
        assert final_detail["status"] == "CLOSED"
        assert final_detail["resolved_at"] == second_resolved_at
        assert final_detail["feedback"]["rating"] == 5
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_seed_demo_rerunnable_and_covers_all_9_statuses(client: httpx.AsyncClient):
    """Verify scripts/seed_demo.py can run twice after data cleanup and populates all 9 statuses + DN-202610-0129."""
    if not await _is_live_db_available():
        pytest.skip("PostgreSQL database is not reachable; skipping live DB seed_demo test.")

    try:
        first_run = await seed_demo(clean_incidents=True)
        second_run = await seed_demo(clean_incidents=True)

        expected_statuses = {
            "SUBMITTED",
            "TRIAGED",
            "ASSIGNED",
            "IN_PROGRESS",
            "RESOLVED",
            "CONFIRMED",
            "CLOSED",
            "REJECTED",
            "REOPENED",
        }
        assert set(first_run.values()) == expected_statuses
        assert set(second_run.values()) == expected_statuses
        assert second_run["DN-202610-0129"] == "CONFIRMED"

        hero_res = await client.get("/api/v1/incidents/DN-202610-0129")
        assert hero_res.status_code == 200
        hero = hero_res.json()
        assert hero["ticket_code"] == "DN-202610-0129"
        assert hero["category_code"] == "FLOODING"
        assert hero["priority"] == "HIGH"
        assert hero["status"] == "CONFIRMED"
        assert hero["is_priority_suggested"] is False

        # Verify 7 District GIS Zones and per-district toggle on live PostGIS DB
        zones_res = await client.get("/api/v1/zones")
        assert zones_res.status_code == 200
        zones_list = zones_res.json()
        zone_ids = {z["id"] for z in zones_list}
        assert {"HC", "TK", "ST", "CL", "NHS", "LC", "HV"}.issubset(zone_ids)

        # Validate point in Hoa Vang (108.0500, 16.0200) -> inside HV while active
        val_hv_ok = await client.post(
            "/api/v1/zones/validate-location",
            json={"latitude": 16.0200, "longitude": 108.0500},
        )
        assert val_hv_ok.status_code == 200
        assert val_hv_ok.json()["is_inside"] is True
        assert val_hv_ok.json()["zone_id"] == "HV"

        # Admin disables HV -> point in Hoa Vang rejected while Hai Chau remains active
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={"username": "admin@danang.gov.vn", "password": "Password123@"},
        )
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        off_res = await client.patch(
            "/api/v1/zones/HV",
            headers=admin_headers,
            json={"is_active": False},
        )
        assert off_res.status_code == 200
        assert off_res.json()["is_active"] is False

        val_hv_off = await client.post(
            "/api/v1/zones/validate-location",
            json={"latitude": 16.0200, "longitude": 108.0500},
        )
        assert val_hv_off.status_code == 200
        assert val_hv_off.json()["is_inside"] is False

        val_hc_still_ok = await client.post(
            "/api/v1/zones/validate-location",
            json={"latitude": 16.0606, "longitude": 108.2162},
        )
        assert val_hc_still_ok.status_code == 200
        assert val_hc_still_ok.json()["is_inside"] is True
        assert val_hc_still_ok.json()["zone_id"] == "HC"

        # Restore HV active
        await client.patch(
            "/api/v1/zones/HV",
            headers=admin_headers,
            json={"is_active": True},
        )
    finally:
        await engine.dispose()
