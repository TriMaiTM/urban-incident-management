"""Unit and integration tests for Open311 GeoReport v2 endpoints."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
import httpx
import pytest
from shapely.geometry import Point

from app.core.database import get_db
from app.main import app
from app.models.category import Category
from app.models.department import Department
from app.models.incident import Incident, IncidentHistory, IncidentMedia


class MockOpen311Session:
    """Mock async database session for Open311 endpoints."""

    def __init__(
        self,
        categories: list[Category] | None = None,
        category: Category | None = None,
        zone_id: str | None = "DANANG_CORE",
        incident: Incident | None = None,
    ) -> None:
        self.categories = categories or []
        self.category = category
        self.zone_id = zone_id
        self.incident = incident
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

        # Incident query by ticket_code (GET /requests/{service_request_id}.json)
        if "incidents" in stmt_str and "ticket_code" in stmt_str:
            res.scalar_one_or_none.return_value = self.incident
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


@pytest.mark.asyncio
async def test_open311_get_request_by_id_open():
    """Verify GET /open311/v2/requests/{id}.json returns open status for IN_PROGRESS incident."""
    cat = Category(
        id=uuid4(),
        code="FALLEN_TREE",
        name="Cây xanh gãy đổ",
        default_sla_hours=4,
    )
    dept = Department(
        id=uuid4(),
        code="DEPT_CTP",
        name="Công ty Công viên Cây xanh Đà Nẵng",
        level="UTILITY_COMPANY",
    )
    ticket_code = "DN-202610-OPEN1"
    now = datetime(2026, 10, 16, 8, 30, 0, tzinfo=timezone.utc)
    sla_time = datetime(2026, 10, 16, 12, 30, 0, tzinfo=timezone.utc)

    incident = Incident(
        id=uuid4(),
        ticket_code=ticket_code,
        title="Phản ánh Open311: Cây xanh gãy đổ",
        description="Cây ngã đổ chắn ngang ngã tư Nguyễn Văn Linh - Hoàng Diệu",
        category_id=cat.id,
        priority="HIGH",
        status="IN_PROGRESS",
        channel="WEB",
        address_text="Ngã tư Nguyễn Văn Linh - Hoàng Diệu, Hải Châu, Đà Nẵng",
        location=Point(108.2185, 16.0601),
        duplicate_count=0,
        sla_due_at=sla_time,
        created_at=now,
        updated_at=now,
    )
    incident.category = cat
    incident.assigned_department = dept
    incident.media = [
        IncidentMedia(
            id=uuid4(),
            incident_id=incident.id,
            media_type="BEFORE_ANONYMIZED",
            file_url="https://danang.gov.vn/media/tree_anon.jpg",
            created_at=now,
        )
    ]

    mock_session = MockOpen311Session(incident=incident)

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(f"/open311/v2/requests/{ticket_code}.json")
            assert res.status_code == 200
            assert res.headers["content-type"].startswith("application/json")

            data = res.json()
            assert isinstance(data, list)
            assert len(data) == 1

            item = data[0]
            assert item["service_request_id"] == ticket_code
            assert item["status"] == "open"
            assert item["status_notes"] == "Đang xử lý (IN_PROGRESS)"
            assert item["service_name"] == "Cây xanh gãy đổ"
            assert item["service_code"] == "FALLEN_TREE"
            assert item["description"] == incident.description
            assert item["agency_responsible"] == "Công ty Công viên Cây xanh Đà Nẵng"
            assert item["lat"] == pytest.approx(16.0601, abs=1e-4)
            assert item["long"] == pytest.approx(108.2185, abs=1e-4)
            assert item["media_url"] == "https://danang.gov.vn/media/tree_anon.jpg"
            assert item["address"] == "Ngã tư Nguyễn Văn Linh - Hoàng Diệu, Hải Châu, Đà Nẵng"
            assert item["expected_datetime"] is not None
            assert item["requested_datetime"] is not None
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_open311_get_request_by_id_closed():
    """Verify GET /open311/v2/requests/{id}.json returns closed status for RESOLVED incident and prioritizes AFTER_PROOF."""
    cat = Category(
        id=uuid4(),
        code="ROAD_DAMAGE",
        name="Hư hỏng mặt đường",
        default_sla_hours=48,
    )
    dept = Department(
        id=uuid4(),
        code="DEPT_GTVT",
        name="Sở Giao thông Vận tải Đà Nẵng",
        level="CITY_DEPT",
    )
    ticket_code = "DN-202610-CLOS1"
    now = datetime(2026, 10, 15, 9, 0, 0, tzinfo=timezone.utc)

    incident = Incident(
        id=uuid4(),
        ticket_code=ticket_code,
        title="Phản ánh Open311: Hư hỏng mặt đường",
        description="Ổ gà sâu trước số nhà 100 Lê Duẩn",
        category_id=cat.id,
        priority="NORMAL",
        status="RESOLVED",
        channel="WEB",
        address_text="100 Lê Duẩn, Hải Châu, Đà Nẵng",
        location=Point(108.2150, 16.0720),
        duplicate_count=0,
        sla_due_at=now,
        created_at=now,
        updated_at=now,
    )
    incident.category = cat
    incident.assigned_department = dept
    # Có cả ảnh BEFORE_ANONYMIZED và AFTER_PROOF -> ưu tiên AFTER_PROOF
    incident.media = [
        IncidentMedia(
            id=uuid4(),
            incident_id=incident.id,
            media_type="BEFORE_ANONYMIZED",
            file_url="https://danang.gov.vn/media/pothole_anon.jpg",
            created_at=now,
        ),
        IncidentMedia(
            id=uuid4(),
            incident_id=incident.id,
            media_type="AFTER_PROOF",
            file_url="https://danang.gov.vn/media/pothole_fixed_proof.jpg",
            created_at=now,
        ),
    ]

    mock_session = MockOpen311Session(incident=incident)

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(f"/open311/v2/requests/{ticket_code}.json")
            assert res.status_code == 200

            data = res.json()
            assert len(data) == 1
            item = data[0]
            assert item["service_request_id"] == ticket_code
            assert item["status"] == "closed"
            assert item["status_notes"] == "Đã khắc phục (RESOLVED)"
            assert item["agency_responsible"] == "Sở Giao thông Vận tải Đà Nẵng"
            assert item["media_url"] == "https://danang.gov.vn/media/pothole_fixed_proof.jpg"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_open311_get_request_by_id_not_found():
    """Verify GET /open311/v2/requests/{id}.json returns 404 for non-existent ticket."""
    mock_session = MockOpen311Session(incident=None)

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/open311/v2/requests/DN-999999-NOTFOUND.json")
            assert res.status_code == 404
            data = res.json()
            assert "DN-999999-NOTFOUND" in data["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_open311_privacy_media_url_no_raw_original():
    """Verify GET /open311/v2/requests/{id}.json hides BEFORE_ORIGINAL to protect citizen privacy."""
    ticket_code = "DN-202610-PRIV01"
    now = datetime(2026, 10, 16, 10, 0, 0, tzinfo=timezone.utc)

    incident = Incident(
        id=uuid4(),
        ticket_code=ticket_code,
        title="Phản ánh có chứa ảnh gốc",
        description="Sự cố chứa ảnh gốc có khuôn mặt công dân",
        priority="NORMAL",
        status="SUBMITTED",
        channel="WEB",
        address_text="Bạch Đằng, Đà Nẵng",
        location=Point(108.2200, 16.0600),
        created_at=now,
    )
    # Chỉ có ảnh gốc BEFORE_ORIGINAL, chưa có ảnh làm mờ
    incident.media = [
        IncidentMedia(
            id=uuid4(),
            incident_id=incident.id,
            media_type="BEFORE_ORIGINAL",
            file_url="https://danang.gov.vn/private/raw_sensitive_faces.jpg",
            created_at=now,
        )
    ]

    mock_session = MockOpen311Session(incident=incident)

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(f"/open311/v2/requests/{ticket_code}.json")
            assert res.status_code == 200

            data = res.json()
            assert len(data) == 1
            item = data[0]
            # media_url phải là None, tuyệt đối không được để lộ URL ảnh gốc
            assert item["media_url"] is None
            assert "raw_sensitive_faces.jpg" not in res.text
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
@pytest.mark.parametrize("closed_status", ["CONFIRMED", "CLOSED", "REJECTED"])
async def test_open311_get_request_by_id_other_closed_statuses(closed_status: str):
    """Verify GET /open311/v2/requests/{id}.json marks all terminal statuses as closed."""
    ticket_code = f"DN-202610-{closed_status[:4]}"
    now = datetime(2026, 10, 16, 10, 0, 0, tzinfo=timezone.utc)

    incident = Incident(
        id=uuid4(),
        ticket_code=ticket_code,
        title=f"Sự cố {closed_status}",
        description="Kiểm tra trạng thái đóng",
        priority="NORMAL",
        status=closed_status,
        channel="WEB",
        address_text="Đà Nẵng",
        location=Point(108.2200, 16.0600),
        created_at=now,
    )
    mock_session = MockOpen311Session(incident=incident)

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(f"/open311/v2/requests/{ticket_code}.json")
            assert res.status_code == 200
            data = res.json()
            assert data[0]["status"] == "closed"
    finally:
        app.dependency_overrides.pop(get_db, None)
