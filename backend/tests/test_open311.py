"""Unit and integration tests for Open311 GeoReport v2 endpoints."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
import httpx
import pytest

from app.core.database import get_db
from app.main import app
from app.models.category import Category
from app.models.incident import Incident, IncidentHistory, IncidentMedia


class MockOpen311Session:
    """Mock async database session for Open311 endpoints."""

    def __init__(
        self,
        categories: list[Category] | None = None,
        category: Category | None = None,
        zone_id: str | None = "DANANG_CORE",
    ) -> None:
        self.categories = categories or []
        self.category = category
        self.zone_id = zone_id
        self.added: list[object] = []
        self.committed = False
        self.execute = AsyncMock(side_effect=self._execute)

    def add(self, obj: object) -> None:
        self.added.append(obj)

    async def commit(self) -> None:
        self.committed = True

    async def close(self) -> None:
        pass

    async def _execute(self, stmt: object, *args: object, **kwargs: object) -> MagicMock:
        stmt_str = str(stmt).lower()
        res = MagicMock()

        # Category query by code (POST /requests.json)
        if "categories.code" in stmt_str and "where" in stmt_str:
            res.scalar_one_or_none.return_value = self.category
            return res

        # Category list query (GET /services.json)
        if "categories" in stmt_str and "order by" in stmt_str:
            res.scalars.return_value.all.return_value = self.categories
            return res

        # System zone boundary query (POST /requests.json)
        if "system_zones" in stmt_str:
            res.scalar_one_or_none.return_value = self.zone_id
            return res

        # Incident ticket_code collision check query (POST /requests.json)
        if "ticket_code" in stmt_str and "limit" in stmt_str:
            res.scalar_one_or_none.return_value = None
            return res

        res.scalar_one_or_none.return_value = None
        res.scalars.return_value.all.return_value = []
        return res


def _create_mock_session(items: list[Category]) -> MockOpen311Session:
    """Create a mock async session returning given items for scalars().all()."""
    return MockOpen311Session(categories=items)


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


@pytest.mark.asyncio
async def test_open311_create_request_success_danang():
    """Verify POST /open311/v2/requests.json succeeds with Dragon Bridge coordinates."""
    cat = Category(
        id=uuid4(),
        code="FALLEN_TREE",
        name="Cây xanh gãy đổ",
        default_sla_hours=4,
    )
    mock_session = MockOpen311Session(category=cat, zone_id="DANANG_CORE")

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    payload = {
        "service_code": "FALLEN_TREE",
        "lat": 16.0611,
        "long": 108.2208,
        "address_string": "Cầu Rồng, Hải Châu, Đà Nẵng",
        "first_name": "Văn A",
        "last_name": "Nguyễn",
        "phone": "0905123456",
        "email": "vana@danang.gov.vn",
        "description": "Cây xà cừ lớn bị gãy cành chắn ngang đường",
    }

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/open311/v2/requests.json", json=payload)
            assert res.status_code == 201
            assert res.headers["content-type"].startswith("application/json")

            data = res.json()
            assert isinstance(data, list)
            assert len(data) == 1

            item = data[0]
            assert "service_request_id" in item
            assert item["service_request_id"].startswith("DN-")
            assert item["service_notice"] is not None
            assert "tiếp nhận thành công" in item["service_notice"]
            assert item["account_id"] is None

            # Verify Incident & IncidentHistory created and committed
            assert mock_session.committed is True
            created_incident = next((o for o in mock_session.added if isinstance(o, Incident)), None)
            assert created_incident is not None
            assert created_incident.ticket_code == item["service_request_id"]
            assert created_incident.title == "Phản ánh Open311: Cây xanh gãy đổ"
            assert created_incident.description == payload["description"]
            assert created_incident.category_id == cat.id
            assert created_incident.priority == "NORMAL"
            assert created_incident.status == "SUBMITTED"
            assert created_incident.channel == "WEB"
            assert "0905123456" in (created_incident.citizen_contact or "")
            assert "Nguyễn" in (created_incident.citizen_contact or "")
            assert created_incident.sla_due_at is not None

            created_history = next((o for o in mock_session.added if isinstance(o, IncidentHistory)), None)
            assert created_history is not None
            assert created_history.incident_id == created_incident.id
            assert created_history.to_status == "SUBMITTED"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_open311_create_request_geofence_out_of_bounds():
    """Verify POST /open311/v2/requests.json returns 422 for Hanoi coordinates."""
    cat = Category(
        id=uuid4(),
        code="ROAD_DAMAGE",
        name="Hư hỏng mặt đường",
        default_sla_hours=48,
    )
    # zone_id is None to simulate point outside active Da Nang zones
    mock_session = MockOpen311Session(category=cat, zone_id=None)

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    payload = {
        "service_code": "ROAD_DAMAGE",
        "lat": 21.0285,
        "long": 105.8542,
        "address_string": "Hồ Hoàn Kiếm, Hà Nội",
        "description": "Ổ gà lớn trên đường Đinh Tiên Hoàng",
    }

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/open311/v2/requests.json", json=payload)
            assert res.status_code == 422
            data = res.json()
            assert "Vùng Đô thị Trung tâm Đà Nẵng" in data["detail"]
            assert mock_session.committed is False
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_open311_create_request_invalid_service_code():
    """Verify POST /open311/v2/requests.json returns 404 for unknown service_code."""
    mock_session = MockOpen311Session(category=None, zone_id="DANANG_CORE")

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    payload = {
        "service_code": "UNKNOWN_XYZ",
        "lat": 16.0611,
        "long": 108.2208,
        "description": "Yêu cầu với dịch vụ không tồn tại",
    }

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/open311/v2/requests.json", json=payload)
            assert res.status_code == 404
            data = res.json()
            assert "UNKNOWN_XYZ" in data["detail"]
            assert mock_session.committed is False
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_open311_create_request_with_media_url():
    """Verify POST /open311/v2/requests.json saves IncidentMedia when media_url is provided."""
    cat = Category(
        id=uuid4(),
        code="DRAINAGE_BLOCK",
        name="Ngập úng thoát nước",
        default_sla_hours=12,
    )
    mock_session = MockOpen311Session(category=cat, zone_id="DANANG_CORE")

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    payload = {
        "service_code": "DRAINAGE_BLOCK",
        "lat": 16.0611,
        "long": 108.2208,
        "address_string": "Đường Bạch Đằng, Hải Châu, Đà Nẵng",
        "description": "Nước ngập cống tràn lên mặt đường",
        "media_url": "https://example.com/tree.jpg",
    }

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/open311/v2/requests.json", json=payload)
            assert res.status_code == 201

            data = res.json()
            assert len(data) == 1
            assert data[0]["service_request_id"].startswith("DN-")

            assert mock_session.committed is True
            media_obj = next((o for o in mock_session.added if isinstance(o, IncidentMedia)), None)
            assert media_obj is not None
            assert media_obj.file_url == "https://example.com/tree.jpg"
            assert media_obj.media_type == "BEFORE_ANONYMIZED"
    finally:
        app.dependency_overrides.pop(get_db, None)

