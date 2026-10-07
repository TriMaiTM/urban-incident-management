import asyncio
import json
import os
import sys
from uuid import uuid4

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from geoalchemy2.shape import from_shape
from shapely.geometry import shape

from app.core.database import AsyncSessionLocal, engine
from app.models.category import Category
from app.models.department import Department
from app.models.user import User
from app.models.zone import SystemZone


async def seed_all_data():
    print("Starting data seeding for Danang Core Urban Incident Platform...\n")
    async with AsyncSessionLocal() as session:
        # 1. Seed System Zone (Danang Core)
        geojson_path = os.path.join(os.path.dirname(__file__), "..", "data", "danang_core_boundary.geojson")
        with open(geojson_path, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)

        feature = geojson_data["features"][0]
        props = feature["properties"]
        geom_shape = shape(feature["geometry"])
        wkb_geom = from_shape(geom_shape, srid=4326)

        existing_zone = await session.execute(
            select(SystemZone).where(SystemZone.id == props["zone_id"])
        )
        zone_obj = existing_zone.scalar_one_or_none()

        bounding_box = {
            "min_lon": props["min_lon"],
            "min_lat": props["min_lat"],
            "max_lon": props["max_lon"],
            "max_lat": props["max_lat"]
        }

        if not zone_obj:
            zone_obj = SystemZone(
                id=props["zone_id"],
                name=props["name"],
                boundary=wkb_geom,
                is_active=True,
                bounding_box=bounding_box,
                description=props["description"]
            )
            session.add(zone_obj)
            print(f"1. [CREATED] SystemZone: {props['name']} ({props['zone_id']})")
        else:
            zone_obj.boundary = wkb_geom
            zone_obj.bounding_box = bounding_box
            zone_obj.is_active = True
            print(f"1. [UPDATED] SystemZone: {props['name']} ({props['zone_id']})")

        # 2. Seed Departments
        dept_data = [
            {"code": "SGTVT_DN", "name": "Sở Giao thông Vận tải TP. Đà Nẵng", "level": "CITY_DEPT", "email": "sgtvt@danang.gov.vn", "phone": "02363822058"},
            {"code": "CTN_DN", "name": "Công ty Thoát nước và Xử lý nước thải Đà Nẵng", "level": "UTILITY_COMPANY", "email": "thoatnuoc@danang.gov.vn", "phone": "02363821043"},
            {"code": "CCX_DN", "name": "Công ty Công viên - Cây xanh Đà Nẵng", "level": "UTILITY_COMPANY", "email": "cayxanh@danang.gov.vn", "phone": "02363822180"},
            {"code": "CMT_DN", "name": "Công ty Cổ phần Môi trường Đô thị Đà Nẵng", "level": "UTILITY_COMPANY", "email": "moitruong@danang.gov.vn", "phone": "02363822245"},
            {"code": "CCS_DN", "name": "Công ty Quản lý Vận hành Chiếu sáng Công cộng", "level": "UTILITY_COMPANY", "email": "chieusang@danang.gov.vn", "phone": "02363822555"},
            {"code": "UBND_HC", "name": "Ủy ban Nhân dân Quận Hải Châu", "level": "DISTRICT_GOV", "email": "haichau@danang.gov.vn", "phone": "02363821234"},
            {"code": "UBND_TK", "name": "Ủy ban Nhân dân Quận Thanh Khê", "level": "DISTRICT_GOV", "email": "thanhkhe@danang.gov.vn", "phone": "02363821567"},
        ]

        dept_map = {}
        for d in dept_data:
            existing = await session.execute(select(Department).where(Department.code == d["code"]))
            dept_obj = existing.scalar_one_or_none()
            if not dept_obj:
                dept_obj = Department(
                    id=uuid4(),
                    code=d["code"],
                    name=d["name"],
                    level=d["level"],
                    contact_email=d["email"],
                    contact_phone=d["phone"]
                )
                session.add(dept_obj)
                print(f"2. [CREATED] Department: {d['name']}")
            dept_map[d["code"]] = dept_obj

        await session.flush()

        # 3. Seed Incident Categories
        cat_data = [
            {"code": "ROAD_DAMAGE", "name": "Hư hỏng mặt đường / Ổ gà / Lún sụt", "sla": 48, "dept": "SGTVT_DN"},
            {"code": "FLOODING", "name": "Ngập úng đô thị / Tắc cống rãnh", "sla": 12, "dept": "CTN_DN"},
            {"code": "FALLEN_TREE", "name": "Cây xanh gãy đổ / Nguy cơ ngã", "sla": 4, "dept": "CCX_DN"},
            {"code": "GARBAGE", "name": "Rác thải ứ đọng / Điểm tập kết rác tự phát", "sla": 12, "dept": "CMT_DN"},
            {"code": "STREETLIGHT", "name": "Đèn chiếu sáng công cộng hỏng", "sla": 24, "dept": "CCS_DN"},
            {"code": "OTHER", "name": "Sự cố trật tự / Hạ tầng đô thị khác", "sla": 48, "dept": "UBND_HC"},
        ]

        for c in cat_data:
            existing = await session.execute(select(Category).where(Category.code == c["code"]))
            cat_obj = existing.scalar_one_or_none()
            dept_id = dept_map.get(c["dept"]).id if c["dept"] in dept_map else None

            if not cat_obj:
                cat_obj = Category(
                    id=uuid4(),
                    code=c["code"],
                    name=c["name"],
                    default_sla_hours=c["sla"],
                    default_department_id=dept_id
                )
                session.add(cat_obj)
                print(f"3. [CREATED] Category: {c['name']} (SLA: {c['sla']}h)")
            else:
                cat_obj.default_sla_hours = c["sla"]
                cat_obj.default_department_id = dept_id

        # 4. Seed 4 Demo Users with Hashed Passwords
        from app.core.security import get_password_hash
        default_pwd_hash = get_password_hash("Password123@")

        users_to_seed = [
            {
                "email": "admin@danang.gov.vn",
                "phone": "0905000001",
                "full_name": "Quản Trị Viên Trung Tâm IOC Đà Nẵng",
                "role": "ADMIN",
                "dept": "UBND_HC"
            },
            {
                "email": "dispatcher@danang.gov.vn",
                "phone": "0905000002",
                "full_name": "Điều Phối Viên Tổng Đài 1022 Đà Nẵng",
                "role": "DISPATCHER",
                "dept": "UBND_HC"
            },
            {
                "email": "technician@danang.gov.vn",
                "phone": "0905000003",
                "full_name": "Kỹ Thuật Viên Xử Lý Thoát Nước Hiện Trường",
                "role": "TECHNICIAN",
                "dept": "CTN_DN"
            },
            {
                "email": "citizen@danang.gov.vn",
                "phone": "0905000004",
                "full_name": "Nguyễn Văn Công Dân Đà Nẵng",
                "role": "CITIZEN",
                "dept": None
            },
        ]

        for u in users_to_seed:
            existing_user = await session.execute(
                select(User).where(User.email == u["email"])
            )
            user_obj = existing_user.scalar_one_or_none()
            user_dept_id = dept_map.get(u["dept"]).id if u["dept"] and u["dept"] in dept_map else None

            if not user_obj:
                user_obj = User(
                    id=uuid4(),
                    email=u["email"],
                    phone=u["phone"],
                    full_name=u["full_name"],
                    password_hash=default_pwd_hash,
                    auth_provider="LOCAL",
                    role=u["role"],
                    department_id=user_dept_id
                )
                session.add(user_obj)
                print(f"4. [CREATED] User: {u['email']} (Role: {u['role']})")
            else:
                user_obj.password_hash = default_pwd_hash
                user_obj.role = u["role"]
                user_obj.department_id = user_dept_id
                print(f"4. [UPDATED] User: {u['email']} (Role: {u['role']})")

        await session.commit()
        print("\nAll seed data committed successfully!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_all_data())
