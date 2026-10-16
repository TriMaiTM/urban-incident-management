"""Unit and integration tests for Open311 GeoReport v2 endpoints."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
import httpx
import pytest

from app.core.database import get_db
from app.main import app
from app.models.category import Category


def _create_mock_session(items: list[object]) -> AsyncMock:
    """Create a mock async session returning given items for scalars().all()."""
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = items
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.close = AsyncMock()
    return mock_session


@pytest.mark.asyncio
async def test_open311_get_services_success():
    """Verify GET /open311/v2/services.json returns standard Open311 services list."""
    mock_categories = [
        Category(
            id=uuid4(),
            code="FALLEN_TREE",
            name="Cây xanh gãy đổ",
            default_sla_hours=4,
        ),
        Category(
            id=uuid4(),
            code="ROAD_DAMAGE",
            name="Hư hỏng mặt đường",
            default_sla_hours=48,
        ),
        Category(
            id=uuid4(),
            code="DRAINAGE_BLOCK",
            name="Ngập úng thoát nước",
            default_sla_hours=12,
        ),
    ]

    mock_session = _create_mock_session(mock_categories)

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/open311/v2/services.json")
            assert res.status_code == 200
            assert res.headers["content-type"].startswith("application/json")

            data = res.json()
            assert isinstance(data, list)
            assert len(data) == 3

            # Verify first item fields according to Open311 GeoReport v2
            assert data[0]["service_code"] == "FALLEN_TREE"
            assert data[0]["service_name"] == "Cây xanh gãy đổ"
            assert data[0]["description"] == "Phản ánh hiện trường về Cây xanh gãy đổ"
            assert data[0]["metadata"] is False
            assert data[0]["type"] == "realtime"
            assert data[0]["keywords"] == "fallen_tree"
            assert data[0]["group"] == "Hạ tầng đô thị"

            # Verify second item fields
            assert data[1]["service_code"] == "ROAD_DAMAGE"
            assert data[1]["service_name"] == "Hư hỏng mặt đường"
            assert data[1]["description"] == "Phản ánh hiện trường về Hư hỏng mặt đường"
            assert data[1]["metadata"] is False
            assert data[1]["type"] == "realtime"
            assert data[1]["keywords"] == "road_damage"
            assert data[1]["group"] == "Hạ tầng đô thị"

            # Verify third item fields
            assert data[2]["service_code"] == "DRAINAGE_BLOCK"
            assert data[2]["service_name"] == "Ngập úng thoát nước"
            assert data[2]["description"] == "Phản ánh hiện trường về Ngập úng thoát nước"
            assert data[2]["metadata"] is False
            assert data[2]["type"] == "realtime"
            assert data[2]["keywords"] == "drainage_block"
            assert data[2]["group"] == "Hạ tầng đô thị"

            # Verify SQL query executed with ordering by code
            executed_stmt = mock_session.execute.call_args[0][0]
            stmt_str = str(executed_stmt).lower()
            assert "categories.code" in stmt_str
            assert "order by" in stmt_str
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_open311_get_services_empty():
    """Verify GET /open311/v2/services.json returns empty list when no categories exist."""
    mock_session = _create_mock_session([])

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/open311/v2/services.json")
            assert res.status_code == 200
            assert res.headers["content-type"].startswith("application/json")

            data = res.json()
            assert isinstance(data, list)
            assert data == []
    finally:
        app.dependency_overrides.pop(get_db, None)
