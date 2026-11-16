"""Seed 4 roles and demo incidents across all 9 statuses by driving the real FastAPI state machine."""

from __future__ import annotations

import asyncio
from pathlib import Path
import sys
from unittest.mock import AsyncMock, patch

import cv2
import httpx
import numpy as np
from sqlalchemy import delete

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import AsyncSessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.incident import Incident  # noqa: E402
from scripts.init_db import init_database  # noqa: E402
from scripts.seed_data import seed_all_data  # noqa: E402


DEMO_TICKETS: list[dict[str, object]] = [
    {
        "ticket_code": "DN-202610-0129",
        "title": "Ngập úng sâu nút giao Nguyễn Văn Linh - Hàm Nghi",
        "description": "Mưa lớn làm nước ngập sâu hơn 40cm tại nút giao Nguyễn Văn Linh - Hàm Nghi, gây chết máy hàng loạt phương tiện.",
        "latitude": 16.0606,
        "longitude": 108.2162,
        "address_text": "Nút giao Nguyễn Văn Linh - Hàm Nghi, Hải Châu, Đà Nẵng",
        "district": "Hải Châu",
        "ward": "Vĩnh Trung",
        "category_code": "FLOODING",
        "priority": "HIGH",
        "dept_code": "CTN_DN",
        "target_status": "CONFIRMED",
    },
    {
        "ticket_code": "DN-202610-0101",
        "title": "Ổ gà lớn trên đường Điện Biên Phủ",
        "description": "Mặt đường bong tróc tạo ổ gà sâu gây nguy hiểm cho người đi xe máy vào ban đêm.",
        "latitude": 16.0655,
        "longitude": 108.1985,
        "address_text": "120 Điện Biên Phủ, Thanh Khê, Đà Nẵng",
        "district": "Thanh Khê",
        "ward": "Chính Gián",
        "category_code": "ROAD_DAMAGE",
        "priority": "NORMAL",
        "dept_code": "SGTVT_DN",
        "target_status": "SUBMITTED",
    },
    {
        "ticket_code": "DN-202610-0102",
        "title": "Cây xanh nghiêng nguy hiểm trên đường Bạch Đằng",
        "description": "Cây phượng lớn bị nghiêng gốc sau gió mạnh, có nguy cơ đổ xuống lòng đường.",
        "latitude": 16.0712,
        "longitude": 108.2242,
        "address_text": "84 Bạch Đằng, Hải Châu, Đà Nẵng",
        "district": "Hải Châu",
        "ward": "Hải Châu 1",
        "category_code": "FALLEN_TREE",
        "priority": "EMERGENCY",
        "dept_code": "CCX_DN",
        "target_status": "TRIAGED",
    },
    {
        "ticket_code": "DN-202610-0103",
        "title": "Rác thải tồn đọng kéo dài tại kiệt Lê Duẩn",
        "description": "Điểm tập kết rác tự phát gây mùi hôi và cản trở lối đi của khu dân cư.",
        "latitude": 16.0695,
        "longitude": 108.2155,
        "address_text": "250 Lê Duẩn, Thanh Khê, Đà Nẵng",
        "district": "Thanh Khê",
        "ward": "Tân Chính",
        "category_code": "GARBAGE",
        "priority": "NORMAL",
        "dept_code": "CMT_DN",
        "target_status": "ASSIGNED",
    },
    {
        "ticket_code": "DN-202610-0104",
        "title": "Tắc cống thoát nước đường Trần Phú",
        "description": "Cửa thu nước bị rác và bùn đất bít kín làm nước tràn mặt đường.",
        "latitude": 16.0680,
        "longitude": 108.2230,
        "address_text": "156 Trần Phú, Hải Châu, Đà Nẵng",
        "district": "Hải Châu",
        "ward": "Phước Ninh",
        "category_code": "FLOODING",
        "priority": "HIGH",
        "dept_code": "CTN_DN",
        "target_status": "IN_PROGRESS",
    },
    {
        "ticket_code": "DN-202610-0105",
        "title": "Nắp hố ga hư hỏng trên đường Nguyễn Tất Thành",
        "description": "Nắp cống thoát nước bị sập một góc, cần thay mới để đảm bảo an toàn.",
        "latitude": 16.0760,
        "longitude": 108.2050,
        "address_text": "310 Nguyễn Tất Thành, Thanh Khê, Đà Nẵng",
        "district": "Thanh Khê",
        "ward": "Xuân Hà",
        "category_code": "FLOODING",
        "priority": "HIGH",
        "dept_code": "CTN_DN",
        "target_status": "RESOLVED",
    },
    {
        "ticket_code": "DN-202610-0106",
        "title": "Đèn đường chiếu sáng tắt nguyên dãy đường Ngô Quyền",
        "description": "Hệ thống đèn cao áp không hoạt động từ 19h tối gây mất an toàn giao thông.",
        "latitude": 16.0660,
        "longitude": 108.2350,
        "address_text": "412 Ngô Quyền, Sơn Trà, Đà Nẵng",
        "district": "Sơn Trà",
        "ward": "An Hải Bắc",
        "category_code": "STREETLIGHT",
        "priority": "LOW",
        "dept_code": "CTN_DN",
        "target_status": "CLOSED",
    },
    {
        "ticket_code": "DN-202610-0107",
        "title": "Báo cáo thử nghiệm không có sự cố thực tế",
        "description": "Hình ảnh tải lên là ảnh chụp trong nhà, không phải hiện trường đô thị.",
        "latitude": 16.0630,
        "longitude": 108.2200,
        "address_text": "10 Lý Tự Trọng, Hải Châu, Đà Nẵng",
        "district": "Hải Châu",
        "ward": "Thạch Thang",
        "category_code": "OTHER",
        "priority": "LOW",
        "dept_code": "UBND_HC",
        "target_status": "REJECTED",
    },
    {
        "ticket_code": "DN-202610-0108",
        "title": "Ngập nước cục bộ sau mưa tại đường Hùng Vương",
        "description": "Nước rút chậm sau khi khơi thông lần đầu, người dân yêu cầu kiểm tra lại lòng cống.",
        "latitude": 16.0685,
        "longitude": 108.2190,
        "address_text": "195 Hùng Vương, Hải Châu, Đà Nẵng",
        "district": "Hải Châu",
        "ward": "Hải Châu 2",
        "category_code": "FLOODING",
        "priority": "HIGH",
        "dept_code": "CTN_DN",
        "target_status": "REOPENED",
    },
]


def _make_demo_jpeg(color_bgr: tuple[int, int, int] = (40, 90, 200)) -> bytes:
    """Create a valid synthetic JPEG image in memory for demo seeding."""
    img = np.full((160, 240, 3), color_bgr, dtype=np.uint8)
    cv2.rectangle(img, (20, 20), (220, 140), (255, 255, 255), 2)
    ok, buf = cv2.imencode(".jpg", img)
    if not ok:
        raise RuntimeError("Failed to encode demo JPEG")
    return buf.tobytes()


async def _clean_existing_incidents() -> None:
    """Remove existing incidents so demo seeding can be re-run cleanly."""
    async with AsyncSessionLocal() as session:
        await session.execute(delete(Incident))
        await session.commit()


async def seed_demo(clean_incidents: bool = True) -> dict[str, str]:
    """Seed 4 roles and transition demo incidents across all 9 statuses via FastAPI endpoints."""
    await init_database()
    await seed_all_data()
    if clean_incidents:
        await _clean_existing_incidents()

    before_bytes = _make_demo_jpeg((30, 80, 210))
    after_bytes = _make_demo_jpeg((40, 160, 60))

    transport = httpx.ASGITransport(app=app)
    seeded_statuses: dict[str, str] = {}

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Authenticate the 4 roles via /api/v1/auth/login
        tokens: dict[str, str] = {}
        user_ids: dict[str, str] = {}
        for role_key, email in [
            ("ADMIN", "admin@danang.gov.vn"),
            ("DISPATCHER", "dispatcher@danang.gov.vn"),
            ("TECHNICIAN", "technician@danang.gov.vn"),
            ("CITIZEN", "citizen@danang.gov.vn"),
        ]:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"username": email, "password": "Password123@"},
            )
            if resp.status_code != 200:
                raise RuntimeError(f"Failed to login {email}: {resp.text}")
            body = resp.json()
            tokens[role_key] = body["access_token"]
            user_ids[role_key] = body["user"]["id"]

        cit_headers = {"Authorization": f"Bearer {tokens['CITIZEN']}"}
        disp_headers = {"Authorization": f"Bearer {tokens['DISPATCHER']}"}
        tech_headers = {"Authorization": f"Bearer {tokens['TECHNICIAN']}"}

        # 2. Fetch categories & departments via public endpoints
        cat_resp = await client.get("/api/v1/categories")
        cat_map = {c["code"]: c["id"] for c in cat_resp.json()}

        dept_resp = await client.get("/api/v1/departments")
        dept_map = {d["code"]: d["id"] for d in dept_resp.json()}

        # 3. Create and transition each demo ticket strictly through state machine endpoints
        for spec in DEMO_TICKETS:
            code = str(spec["ticket_code"])
            target = str(spec["target_status"])
            cat_code = str(spec["category_code"])
            prio = str(spec["priority"])
            dept_code = str(spec["dept_code"])

            with (
                patch("app.api.v1.endpoints.incidents.generate_ticket_code", return_value=code),
                patch("app.api.v1.endpoints.incidents.process_incident_ai_triage", new_callable=AsyncMock),
            ):
                create_res = await client.post(
                    "/api/v1/incidents",
                    headers=cit_headers,
                    data={
                        "title": str(spec["title"]),
                        "description": str(spec["description"]),
                        "latitude": str(spec["latitude"]),
                        "longitude": str(spec["longitude"]),
                        "address_text": str(spec["address_text"]),
                        "district": str(spec["district"]),
                        "ward": str(spec["ward"]),
                        "citizen_contact": "0905000004",
                        "category_code": cat_code,
                        "priority": prio,
                    },
                    files={"image": (f"{code.lower()}_before.jpg", before_bytes, "image/jpeg")},
                )
                if create_res.status_code != 201:
                    raise RuntimeError(f"Failed to create {code}: {create_res.text}")

            if target == "SUBMITTED":
                seeded_statuses[code] = "SUBMITTED"
                continue

            if target == "REJECTED":
                rej_res = await client.patch(
                    f"/api/v1/incidents/{code}/status",
                    headers=disp_headers,
                    data={
                        "to_status": "REJECTED",
                        "note": "Hình ảnh phản ánh không thuộc phạm vi hạ tầng công cộng ngoài hiện trường.",
                    },
                )
                if rej_res.status_code != 200:
                    raise RuntimeError(f"Failed to reject {code}: {rej_res.text}")
                seeded_statuses[code] = rej_res.json()["status"]
                continue

            # Step: SUBMITTED -> TRIAGED
            triage_res = await client.patch(
                f"/api/v1/incidents/{code}/triage",
                headers=disp_headers,
                json={
                    "category_id": cat_map[cat_code],
                    "priority": prio,
                    "assigned_department_id": dept_map[dept_code],
                    "note": f"Điều phối viên IOC xác nhận phân loại {cat_code} mức {prio}",
                },
            )
            if triage_res.status_code != 200:
                raise RuntimeError(f"Failed to triage {code}: {triage_res.text}")

            if target == "TRIAGED":
                seeded_statuses[code] = triage_res.json()["status"]
                continue

            # Step: TRIAGED -> ASSIGNED
            assign_res = await client.patch(
                f"/api/v1/incidents/{code}/assign",
                headers=disp_headers,
                json={
                    "assigned_department_id": dept_map[dept_code],
                    "assigned_technician_id": user_ids["TECHNICIAN"],
                    "note": "Giao kỹ thuật viên hiện trường tiếp nhận xử lý",
                },
            )
            if assign_res.status_code != 200:
                raise RuntimeError(f"Failed to assign {code}: {assign_res.text}")

            if target == "ASSIGNED":
                seeded_statuses[code] = assign_res.json()["status"]
                continue

            # Step: ASSIGNED -> IN_PROGRESS
            inprog_res = await client.patch(
                f"/api/v1/incidents/{code}/status",
                headers=tech_headers,
                data={
                    "to_status": "IN_PROGRESS",
                    "note": "Kỹ thuật viên đã có mặt tại hiện trường và bắt đầu xử lý",
                },
            )
            if inprog_res.status_code != 200:
                raise RuntimeError(f"Failed to start {code}: {inprog_res.text}")

            if target == "IN_PROGRESS":
                seeded_statuses[code] = inprog_res.json()["status"]
                continue

            # Step: IN_PROGRESS -> RESOLVED
            resolve_res = await client.patch(
                f"/api/v1/incidents/{code}/status",
                headers=tech_headers,
                data={
                    "to_status": "RESOLVED",
                    "note": "Đã hoàn thành khắc phục sự cố tại hiện trường và vệ sinh khu vực",
                    "proof_latitude": str(spec["latitude"]),
                    "proof_longitude": str(spec["longitude"]),
                },
                files={"proof_image": (f"{code.lower()}_after.jpg", after_bytes, "image/jpeg")},
            )
            if resolve_res.status_code != 200:
                raise RuntimeError(f"Failed to resolve {code}: {resolve_res.text}")

            if target == "RESOLVED":
                seeded_statuses[code] = resolve_res.json()["status"]
                continue

            # Step: RESOLVED -> CONFIRMED
            confirm_res = await client.patch(
                f"/api/v1/incidents/{code}/status",
                headers=disp_headers,
                data={
                    "to_status": "CONFIRMED",
                    "note": "Điều phối viên IOC đã đối chiếu ảnh Trước/Sau và duyệt nghiệm thu",
                },
            )
            if confirm_res.status_code != 200:
                raise RuntimeError(f"Failed to confirm {code}: {confirm_res.text}")

            if target == "CONFIRMED":
                seeded_statuses[code] = confirm_res.json()["status"]
                continue

            if target == "CLOSED":
                fb_close = await client.post(
                    f"/api/v1/incidents/{code}/feedback",
                    headers=cit_headers,
                    json={
                        "action": "CONFIRM",
                        "rating": 5,
                        "comment": "Sự cố đã được khắc phục nhanh chóng, người dân hoàn toàn hài lòng.",
                    },
                )
                if fb_close.status_code != 201:
                    raise RuntimeError(f"Failed to close {code} via citizen feedback: {fb_close.text}")
                detail_after = await client.get(f"/api/v1/incidents/{code}", headers=cit_headers)
                seeded_statuses[code] = detail_after.json()["status"]
                continue

            if target == "REOPENED":
                fb_dispute = await client.post(
                    f"/api/v1/incidents/{code}/feedback",
                    headers=cit_headers,
                    json={
                        "action": "DISPUTE",
                        "rating": 2,
                        "comment": "Nước vẫn còn ứ đọng tại miệng cống, đề nghị kiểm tra xử lý triệt để.",
                    },
                )
                if fb_dispute.status_code != 201:
                    raise RuntimeError(f"Failed to dispute/reopen {code}: {fb_dispute.text}")
                detail_after = await client.get(f"/api/v1/incidents/{code}", headers=cit_headers)
                seeded_statuses[code] = detail_after.json()["status"]
                continue

    await engine.dispose()
    print("Seeded demo tickets across all 9 statuses successfully:")
    for k, v in seeded_statuses.items():
        print(f"  - {k}: {v}")
    return seeded_statuses


if __name__ == "__main__":
    asyncio.run(seed_demo())
