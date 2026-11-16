"""Tests for Auxiliary Backend Phase: Profile Update, Password Change, Admin Users/Zones/Categories/Departments, Audit Logs, Duplicate Merge, and Open311 Requests List."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

import httpx
import pytest

from app.api.deps import get_current_user, get_db
from app.core.security import get_password_hash, verify_password
from app.main import app
from app.models.department import Department
from app.models.user import User


class _MockResult:
    def __init__(self, data=None):
        self._data = data

    def scalar_one_or_none(self):
        if isinstance(self._data, list):
            return self._data[0] if self._data else None
        return self._data

    def scalar(self):
        if isinstance(self._data, list):
            return self._data[0] if self._data else None
        return self._data

    def scalars(self):
        return self

    def all(self):
        if self._data is None:
            return []
        if isinstance(self._data, list):
            return self._data
        return [self._data]


class _MockSession:
    def __init__(self):
        self.entities: dict[tuple[type, object], object] = {}
        self.added: list[object] = []
        self.committed = False
        self.execute_queue: list[_MockResult] = []

    def seed(self, *objs: object) -> None:
        now = datetime.now(timezone.utc)
        for obj in objs:
            if hasattr(obj, "created_at") and getattr(obj, "created_at", None) is None:
                setattr(obj, "created_at", now)
            if hasattr(obj, "updated_at") and getattr(obj, "updated_at", None) is None:
                setattr(obj, "updated_at", now)
            self.entities[(type(obj), getattr(obj, "id"))] = obj

    def add(self, obj: object) -> None:
        now = datetime.now(timezone.utc)
        if hasattr(obj, "id") and getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid4())
        if hasattr(obj, "created_at") and getattr(obj, "created_at", None) is None:
            setattr(obj, "created_at", now)
        if hasattr(obj, "updated_at") and getattr(obj, "updated_at", None) is None:
            setattr(obj, "updated_at", now)
        self.added.append(obj)
        if hasattr(obj, "id"):
            self.entities[(type(obj), getattr(obj, "id"))] = obj

    async def commit(self) -> None:
        self.committed = True

    async def refresh(self, obj: object) -> None:
        now = datetime.now(timezone.utc)
        if hasattr(obj, "created_at") and getattr(obj, "created_at", None) is None:
            setattr(obj, "created_at", now)

    async def get(self, cls: type, ident: object) -> object | None:
        return self.entities.get((cls, ident))

    async def execute(self, stmt, *args, **kwargs) -> _MockResult:
        if self.execute_queue:
            return self.execute_queue.pop(0)
        return _MockResult(None)


@pytest.mark.asyncio
async def test_profile_update_and_change_password(client: httpx.AsyncClient):
    """Verify PATCH /api/v1/auth/me and POST /api/v1/auth/change-password."""
    session = _MockSession()
    user = User(
        id=uuid4(),
        email="citizen_prof@danang.gov.vn",
        phone="0905111222",
        full_name="Nguyễn Văn Cũ",
        password_hash=get_password_hash("OldPass123@"),
        auth_provider="LOCAL",
        role="CITIZEN",
        is_locked=False,
        created_at=datetime.now(timezone.utc),
    )
    session.seed(user)

    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        # 1. Update profile (full_name, phone, avatar_url)
        session.execute_queue = [_MockResult(None)]
        res_patch = await client.patch(
            "/api/v1/auth/me",
            json={
                "full_name": "Nguyễn Văn Mới",
                "phone": "0905333444",
                "avatar_url": "/uploads/public/avatar.jpg",
            },
        )
        assert res_patch.status_code == 200, res_patch.text
        body = res_patch.json()
        assert body["full_name"] == "Nguyễn Văn Mới"
        assert body["phone"] == "0905333444"
        assert body["avatar_url"] == "/uploads/public/avatar.jpg"

        # 2. Change password with wrong current_password -> 400
        res_bad_pw = await client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "WrongPassword", "new_password": "NewPass456@"},
        )
        assert res_bad_pw.status_code == 400

        # 3. Change password with valid current_password -> 200
        res_ok_pw = await client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "OldPass123@", "new_password": "NewPass456@"},
        )
        assert res_ok_pw.status_code == 200
        assert verify_password("NewPass456@", user.password_hash or "")
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_users_crud_and_account_lock_enforcement(client: httpx.AsyncClient):
    """Verify GET/POST/PATCH /api/v1/users, self-lock prevention, and 403 on locked account login."""
    session = _MockSession()
    dept = Department(id=uuid4(), code="CTN_DN", name="Công ty Thoát nước", level="UTILITY_COMPANY")
    admin = User(
        id=uuid4(),
        email="admin_u@danang.gov.vn",
        full_name="Quản Trị Viên",
        role="ADMIN",
        auth_provider="LOCAL",
        is_locked=False,
        created_at=datetime.now(timezone.utc),
    )
    citizen = User(
        id=uuid4(),
        email="cit_u@danang.gov.vn",
        phone="0905888999",
        full_name="Công Dân Thường",
        password_hash=get_password_hash("Pass123@"),
        role="CITIZEN",
        auth_provider="LOCAL",
        is_locked=False,
        created_at=datetime.now(timezone.utc),
    )
    session.seed(dept, admin, citizen)

    app.dependency_overrides[get_db] = lambda: session
    try:
        # 1. Non-admin forbidden (403)
        app.dependency_overrides[get_current_user] = lambda: citizen
        res_forbid = await client.get("/api/v1/users")
        assert res_forbid.status_code == 403

        # 2. Admin lists users
        app.dependency_overrides[get_current_user] = lambda: admin
        session.execute_queue = [_MockResult(2), _MockResult([admin, citizen])]
        res_list = await client.get("/api/v1/users", params={"role": "CITIZEN", "q": "Công Dân"})
        assert res_list.status_code == 200
        assert res_list.json()["total"] == 2

        # 3. Admin creates a new TECHNICIAN assigned to department
        session.execute_queue = [_MockResult(None), _MockResult(None)]
        res_create = await client.post(
            "/api/v1/users",
            json={
                "email": "new_tech@danang.gov.vn",
                "phone": "0905777666",
                "full_name": "Kỹ Thuật Viên Mới",
                "password": "Password123@",
                "role": "TECHNICIAN",
                "department_id": str(dept.id),
            },
        )
        assert res_create.status_code == 201, res_create.text
        created_u = res_create.json()
        assert created_u["role"] == "TECHNICIAN"
        assert created_u["department_id"] == str(dept.id)
        assert created_u["is_locked"] is False

        # 4. Admin cannot lock their own account -> 400
        res_self_lock = await client.patch(
            f"/api/v1/users/{admin.id}",
            json={"is_locked": True},
        )
        assert res_self_lock.status_code == 400
        assert "tự khóa" in res_self_lock.json()["detail"]

        # 5. Admin locks citizen account -> 200 and citizen login is rejected with 403
        res_lock = await client.patch(
            f"/api/v1/users/{citizen.id}",
            json={"is_locked": True, "role": "DISPATCHER"},
        )
        assert res_lock.status_code == 200
        assert res_lock.json()["is_locked"] is True
        assert res_lock.json()["role"] == "DISPATCHER"

        session.execute_queue = [_MockResult(citizen)]
        res_login_locked = await client.post(
            "/api/v1/auth/login",
            json={"username": "cit_u@danang.gov.vn", "password": "Pass123@"},
        )
        assert res_login_locked.status_code == 403
        assert "đã bị khóa" in res_login_locked.json()["detail"]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_zones_categories_and_departments_management(client: httpx.AsyncClient):
    """Verify GET/PATCH /api/v1/zones, PATCH /api/v1/categories/{id}, and POST/PATCH /api/v1/departments."""
    from types import SimpleNamespace
    from app.models.category import Category
    from app.models.zone import SystemZone

    session = _MockSession()
    admin = User(
        id=uuid4(),
        email="admin_cfg@danang.gov.vn",
        full_name="Quản Trị Cấu Hình",
        role="ADMIN",
        auth_provider="LOCAL",
        is_locked=False,
        created_at=datetime.now(timezone.utc),
    )
    dept = Department(
        id=uuid4(),
        code="CTN_DN",
        name="Cty Thoát Nước",
        level="UTILITY_COMPANY",
    )
    cat = Category(
        id=uuid4(),
        code="FLOODING",
        name="Ngập úng đô thị",
        default_sla_hours=12,
        default_department_id=dept.id,
        is_active=True,
    )
    zone = SystemZone(
        id="DANANG_CORE",
        name="Vùng Đô thị Lõi Đà Nẵng",
        is_active=True,
        bounding_box={"min_lon": 107.8, "min_lat": 15.9, "max_lon": 108.4, "max_lat": 16.3},
        description="Vùng lõi",
    )
    session.seed(admin, dept, cat, zone)

    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: admin
    try:
        # 1. GET /api/v1/zones returns all zones with open_incident_count
        row = SimpleNamespace(
            id="DANANG_CORE",
            name="Vùng Đô thị Lõi Đà Nẵng",
            is_active=True,
            bounding_box=zone.bounding_box,
            description="Vùng lõi",
            geojson_str='{"type": "Polygon", "coordinates": []}',
        )
        session.execute_queue = [_MockResult(5), _MockResult([row])]
        res_zones = await client.get("/api/v1/zones")
        assert res_zones.status_code == 200
        zones_body = res_zones.json()
        assert len(zones_body) == 1
        assert zones_body[0]["open_incident_count"] == 5

        # 2. PATCH /api/v1/zones/{zone_id} toggles is_active
        res_patch_zone = await client.patch(
            "/api/v1/zones/DANANG_CORE",
            json={"is_active": False, "description": "Tạm dừng bảo trì"},
        )
        assert res_patch_zone.status_code == 200
        assert res_patch_zone.json()["is_active"] is False

        # 3. PATCH /api/v1/categories/{category_id} updates SLA & is_active
        res_patch_cat = await client.patch(
            f"/api/v1/categories/{cat.id}",
            json={"default_sla_hours": 8, "is_active": False},
        )
        assert res_patch_cat.status_code == 200
        assert res_patch_cat.json()["default_sla_hours"] == 8
        assert res_patch_cat.json()["is_active"] is False

        # 4. POST /api/v1/departments & PATCH /api/v1/departments/{id}
        session.execute_queue = [_MockResult(None)]
        res_create_dept = await client.post(
            "/api/v1/departments",
            json={
                "code": "UBND_ST",
                "name": "UBND Quận Sơn Trà",
                "level": "DISTRICT_GOV",
                "contact_phone": "02363844555",
            },
        )
        assert res_create_dept.status_code == 201
        new_dept_id = res_create_dept.json()["id"]

        res_patch_dept = await client.patch(
            f"/api/v1/departments/{new_dept_id}",
            json={"name": "UBND Quận Sơn Trà - Đà Nẵng", "contact_email": "sontra@danang.gov.vn"},
        )
        assert res_patch_dept.status_code == 200
        assert res_patch_dept.json()["name"] == "UBND Quận Sơn Trà - Đà Nẵng"
        assert res_patch_dept.json()["contact_email"] == "sontra@danang.gov.vn"
    finally:
        app.dependency_overrides.clear()

