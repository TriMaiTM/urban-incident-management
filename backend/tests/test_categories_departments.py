"""Tests for Incident Categories and Departments Endpoints."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
import httpx
import pytest

from app.core.database import get_db
from app.main import app
from app.models.category import Category
from app.models.department import Department


def _create_mock_session(items: list[object]) -> AsyncMock:
    """Create a mock async session returning given items for scalars().all()."""
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = items
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.close = AsyncMock()
    return mock_session


@pytest.mark.asyncio
async def test_get_categories_success():
    """Verify GET /api/v1/categories returns list of categories with correct attributes."""
    cat1_id = uuid4()
    cat2_id = uuid4()
    dept_id = uuid4()

    mock_categories = [
        Category(
            id=cat1_id,
            code="FALLEN_TREE",
            name="Cây xanh gãy đổ",
            default_sla_hours=4,
            default_department_id=dept_id,
        ),
        Category(
            id=cat2_id,
            code="ROAD_DAMAGE",
            name="Hư hỏng mặt đường",
            default_sla_hours=48,
            default_department_id=None,
        ),
    ]

    mock_session = _create_mock_session(mock_categories)

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/v1/categories")
            assert res.status_code == 200
            assert res.headers["content-type"].startswith("application/json")

            data = res.json()
            assert isinstance(data, list)
            assert len(data) == 2

            assert data[0]["id"] == str(cat1_id)
            assert data[0]["code"] == "FALLEN_TREE"
            assert data[0]["name"] == "Cây xanh gãy đổ"
            assert data[0]["default_sla_hours"] == 4
            assert data[0]["default_department_id"] == str(dept_id)

            assert data[1]["id"] == str(cat2_id)
            assert data[1]["code"] == "ROAD_DAMAGE"
            assert data[1]["name"] == "Hư hỏng mặt đường"
            assert data[1]["default_sla_hours"] == 48
            assert data[1]["default_department_id"] is None

            # Verify query contains order by category code
            executed_stmt = mock_session.execute.call_args[0][0]
            stmt_str = str(executed_stmt).lower()
            assert "categories.code" in stmt_str
            assert "order by" in stmt_str
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_get_categories_empty():
    """Verify GET /api/v1/categories returns empty list when no categories exist."""
    mock_session = _create_mock_session([])

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/v1/categories")
            assert res.status_code == 200
            assert res.json() == []
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_get_categories_trailing_slash():
    """Verify GET /api/v1/categories/ with trailing slash works identically."""
    mock_session = _create_mock_session([])

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/v1/categories/")
            assert res.status_code == 200
            assert res.json() == []
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_get_departments_success():
    """Verify GET /api/v1/departments returns list of departments with correct attributes."""
    dept1_id = uuid4()
    dept2_id = uuid4()

    mock_departments = [
        Department(
            id=dept1_id,
            code="SGTVT_DN",
            name="Sở Giao thông Vận tải Đà Nẵng",
            level="CITY_DEPT",
            contact_email="sgtvt@danang.gov.vn",
            contact_phone="02363822222",
        ),
        Department(
            id=dept2_id,
            code="UBND_HC",
            name="Ủy ban Nhân dân Quận Hải Châu",
            level="DISTRICT_GOV",
            contact_email="haichau@danang.gov.vn",
            contact_phone="02363821234",
        ),
    ]

    mock_session = _create_mock_session(mock_departments)

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/v1/departments")
            assert res.status_code == 200
            assert res.headers["content-type"].startswith("application/json")

            data = res.json()
            assert isinstance(data, list)
            assert len(data) == 2

            assert data[0]["id"] == str(dept1_id)
            assert data[0]["code"] == "SGTVT_DN"
            assert data[0]["name"] == "Sở Giao thông Vận tải Đà Nẵng"
            assert data[0]["level"] == "CITY_DEPT"
            assert data[0]["contact_email"] == "sgtvt@danang.gov.vn"
            assert data[0]["contact_phone"] == "02363822222"

            assert data[1]["id"] == str(dept2_id)
            assert data[1]["code"] == "UBND_HC"
            assert data[1]["name"] == "Ủy ban Nhân dân Quận Hải Châu"
            assert data[1]["level"] == "DISTRICT_GOV"
            assert data[1]["contact_email"] == "haichau@danang.gov.vn"
            assert data[1]["contact_phone"] == "02363821234"

            # Verify query contains order by level and name
            executed_stmt = mock_session.execute.call_args[0][0]
            stmt_str = str(executed_stmt).lower()
            assert "departments.level" in stmt_str
            assert "departments.name" in stmt_str
            assert "order by" in stmt_str
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_get_departments_empty():
    """Verify GET /api/v1/departments returns empty list when no departments exist."""
    mock_session = _create_mock_session([])

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/v1/departments")
            assert res.status_code == 200
            assert res.json() == []
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_get_departments_trailing_slash():
    """Verify GET /api/v1/departments/ with trailing slash works identically."""
    mock_session = _create_mock_session([])

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/v1/departments/")
            assert res.status_code == 200
            assert res.json() == []
    finally:
        app.dependency_overrides.pop(get_db, None)
