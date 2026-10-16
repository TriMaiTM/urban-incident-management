"""Unit and integration tests for Incident Ingestion, AI Triage, and Management API.

100% independent mock tests: no live Docker database or external DeepSeek Vision API calls needed.
"""

from datetime import datetime, timezone
from pathlib import Path
import re
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

import cv2
import httpx
import numpy as np
import pytest
from shapely.geometry import Point

from app.api.deps import get_current_user_optional
from app.core.config import settings
from app.core.database import get_db
from app.main import app
from app.models.category import Category
from app.models.department import Department
from app.models.incident import Incident, IncidentHistory, IncidentMedia
from app.models.user import User
from app.models.zone import SystemZone
from app.api.v1.endpoints.incidents import process_incident_ai_triage


# ============================================================================
# Helpers & Synthetic Data
# ============================================================================

def _create_synthetic_image_bytes(width: int = 120, height: int = 120) -> bytes:
    """Helper creating valid JPEG image bytes in memory."""
    img = np.full((height, width, 3), 180, dtype=np.uint8)
    cv2.circle(img, (width // 2, height // 2), 25, (0, 0, 255), -1)
    cv2.rectangle(img, (10, 10), (40, 40), (0, 255, 0), -1)
    success, buf = cv2.imencode(".jpg", img)
    assert success, "Failed to encode synthetic JPEG image"
    return buf.tobytes()


def _make_mock_incident(
    id: UUID | None = None,
    ticket_code: str = "DN-202610-TEST",
    title: str = "Sự cố kiểm thử tại Cầu Rồng",
    description: str = "Mô tả chi tiết sự cố kiểm thử tự động",
    status: str = "SUBMITTED",
    priority: str = "NORMAL",
    channel: str = "WEB",
    latitude: float = 16.0611,
    longitude: float = 108.2208,
    address_text: str = "Cầu Rồng, Phước Ninh, Hải Châu, Đà Nẵng",
    district: str = "Hải Châu",
    ward: str = "Phước Ninh",
    citizen_contact: str | None = "0905123456",
    duplicate_count: int = 0,
    media: list[IncidentMedia] | None = None,
    history: list[IncidentHistory] | None = None,
    category: Category | None = None,
    assigned_department: Department | None = None,
) -> Incident:
    """Helper constructing an Incident model instance with populated relationships."""
    inc_id = id or uuid4()
    now = datetime.now(timezone.utc)
    inc = Incident(
        id=inc_id,
        ticket_code=ticket_code,
        title=title,
        description=description,
        status=status,
        priority=priority,
        channel=channel,
        address_text=address_text,
        district=district,
        ward=ward,
        citizen_contact=citizen_contact,
        duplicate_count=duplicate_count,
        created_at=now,
        updated_at=now,
    )
    inc.latitude = latitude
    inc.longitude = longitude
    inc.location = Point(longitude, latitude)

    if media is not None:
        inc.media = media
    else:
        inc.media = [
            IncidentMedia(
                id=uuid4(),
                incident_id=inc_id,
                media_type="BEFORE_ORIGINAL",
                file_url=f"/uploads/private/{inc_id.hex}_orig.jpg",
                created_at=now,
            ),
            IncidentMedia(
                id=uuid4(),
                incident_id=inc_id,
                media_type="BEFORE_ANONYMIZED",
                file_url=f"/uploads/public/{inc_id.hex}_anon.jpg",
                created_at=now,
            ),
        ]

    if history is not None:
        inc.history = history
    else:
        inc.history = [
            IncidentHistory(
                id=uuid4(),
                incident_id=inc_id,
                actor_id=None,
                from_status=None,
                to_status="SUBMITTED",
                note="Sự cố được tiếp nhận từ phản ánh của người dân",
                created_at=now,
            )
        ]

    inc.category = category
    inc.assigned_department = assigned_department
    return inc


# ============================================================================
# Mock Result & Mock Async Session
# ============================================================================

class MockResult:
    """SQLAlchemy result mock returning configured data across all query styles."""

    def __init__(self, data=None):
        self._data = data

    def scalar_one_or_none(self):
        if self._data is None:
            return None
        if isinstance(self._data, list):
            return self._data[0] if self._data else None
        return self._data

    def scalar_one(self):
        if isinstance(self._data, list):
            if not self._data:
                raise ValueError("No rows found")
            return self._data[0]
        if self._data is None:
            raise ValueError("No rows found")
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


class MockAsyncSession:
    """Mock async database session avoiding live Docker DB dependencies."""

    def __init__(self):
        self.added = []
        self.committed = False
        self.flushed = False
        self.refreshed = []
        self.zone_id: str | None = "DANANG_CORE"
        self.execute_queue: list[MockResult] = []
        self.get_item = None

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        self.flushed = True
        for obj in self.added:
            if hasattr(obj, "id") and getattr(obj, "id", None) is None:
                obj.id = uuid4()
            if hasattr(obj, "created_at") and getattr(obj, "created_at", None) is None:
                obj.created_at = datetime.now(timezone.utc)
            if hasattr(obj, "updated_at") and getattr(obj, "updated_at", None) is None:
                obj.updated_at = datetime.now(timezone.utc)

    async def commit(self):
        self.committed = True
        await self.flush()

    async def rollback(self):
        pass

    async def refresh(self, obj):
        self.refreshed.append(obj)

    async def get(self, entity_cls, ident):
        if self.get_item is not None:
            return self.get_item
        for obj in self.added:
            if isinstance(obj, entity_cls) and getattr(obj, "id", None) == ident:
                return obj
        return None

    async def execute(self, stmt, *args, **kwargs):
        if self.execute_queue:
            return self.execute_queue.pop(0)

        stmt_str = str(stmt).lower()

        # System zone geofence query
        if "system_zones" in stmt_str:
            return MockResult(self.zone_id)

        # Ticket code existence query during creation
        if "ticket_code" in stmt_str and "limit" in stmt_str and "selectinload" not in stmt_str:
            return MockResult(None)

        # Reload incident query after creation
        if "from incidents" in stmt_str and ("where incidents.id =" in stmt_str or "incidents.id ==" in stmt_str):
            inc = next((o for o in self.added if isinstance(o, Incident)), None)
            if inc:
                if not hasattr(inc, "id") or inc.id is None:
                    inc.id = uuid4()
                if not hasattr(inc, "created_at") or inc.created_at is None:
                    inc.created_at = datetime.now(timezone.utc)
                if not hasattr(inc, "updated_at") or inc.updated_at is None:
                    inc.updated_at = datetime.now(timezone.utc)
                inc.media = [m for m in self.added if isinstance(m, IncidentMedia)]
                inc.history = [h for h in self.added if isinstance(h, IncidentHistory)]
                inc.category = None
                inc.assigned_department = None
                return MockResult(inc)

        # Count query (check count( to avoid matching duplicate_count column)
        if "count(" in stmt_str:
            return MockResult(0)

        return MockResult(None)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_db_session():
    """Fixture providing a fresh isolated MockAsyncSession instance."""
    session = MockAsyncSession()
    return session


@pytest.fixture(autouse=True)
def setup_overrides(mock_db_session: MockAsyncSession, tmp_path: Path, monkeypatch):
    """Setup clean dependency overrides and temp upload dirs for every test."""
    app.dependency_overrides[get_db] = lambda: mock_db_session
    app.dependency_overrides[get_current_user_optional] = lambda: None

    # Isolate upload directories to tmp_path
    private_dir = tmp_path / "uploads" / "private"
    public_dir = tmp_path / "uploads" / "public"
    private_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(
        "app.api.v1.endpoints.incidents._get_upload_dirs",
        lambda: (private_dir, public_dir),
    )

    yield

    app.dependency_overrides.clear()


# ============================================================================
# Test Scenarios
# ============================================================================

@pytest.mark.asyncio
async def test_create_incident_success_danang(client: httpx.AsyncClient, mock_db_session: MockAsyncSession):
    """Test 1: Report incident at Dragon Bridge Da Nang -> 201 Created, ticket code DN-YYYYMM-XXXX, AI triage added."""
    image_bytes = _create_synthetic_image_bytes()
    form_data = {
        "title": "Hư hỏng lan can Cầu Rồng",
        "description": "Lan can thành cầu bị móp méo sau va chạm giao thông cần sửa chữa gấp",
        "latitude": "16.0611",
        "longitude": "108.2208",
        "address_text": "Cầu Rồng, Phước Ninh, Hải Châu, Đà Nẵng",
        "district": "Hải Châu",
        "ward": "Phước Ninh",
        "citizen_contact": "0905123456",
    }
    files = {
        "image": ("incident.jpg", image_bytes, "image/jpeg"),
    }

    with patch(
        "app.api.v1.endpoints.incidents.process_incident_ai_triage",
        new_callable=AsyncMock,
    ) as mock_triage:
        response = await client.post("/api/v1/incidents", data=form_data, files=files)

        assert response.status_code == 201, f"Failed: {response.text}"
        data = response.json()

        # 1. Ticket code validation
        ticket_code = data["ticket_code"]
        assert re.match(r"^DN-\d{6}-[A-Z0-9]{4}$", ticket_code), f"Invalid ticket_code: {ticket_code}"

        # 2. Status & Details
        assert data["title"] == "Hư hỏng lan can Cầu Rồng"
        assert data["status"] == "SUBMITTED"
        assert data["priority"] == "NORMAL"
        assert data["latitude"] == pytest.approx(16.0611, abs=1e-4)
        assert data["longitude"] == pytest.approx(108.2208, abs=1e-4)

        # 3. Media & Anonymization
        assert data["anonymized_image_url"] is not None
        assert "_anon.jpg" in data["anonymized_image_url"]
        media_types = [m["media_type"] for m in data["media"]]
        assert "BEFORE_ANONYMIZED" in media_types
        assert "BEFORE_ORIGINAL" in media_types

        # 4. Background task AI triage scheduled
        mock_triage.assert_called_once()
        triage_args = mock_triage.call_args[0]
        assert str(triage_args[0]) == data["id"]
        assert triage_args[2] == form_data["description"]


@pytest.mark.asyncio
async def test_create_incident_out_of_bounds_geofence(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
):
    """Test 2: Report incident outside Da Nang (Hanoi) -> 422 Unprocessable Entity."""
    mock_db_session.zone_id = None  # Simulate point outside geofence boundary

    image_bytes = _create_synthetic_image_bytes()
    form_data = {
        "title": "Sự cố tại Hà Nội",
        "description": "Vị trí này nằm ở hồ Hoàn Kiếm Hà Nội, không thuộc Đà Nẵng",
        "latitude": "21.0285",
        "longitude": "105.8542",
        "address_text": "Hoàn Kiếm, Hà Nội",
    }
    files = {
        "image": ("hanoi_test.jpg", image_bytes, "image/jpeg"),
    }

    response = await client.post("/api/v1/incidents", data=form_data, files=files)

    assert response.status_code == 422
    data = response.json()
    assert "nằm ngoài phạm vi Vùng Đô thị Trung tâm Đà Nẵng" in data["detail"]


@pytest.mark.asyncio
async def test_create_incident_empty_image(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
):
    """Test 3: Submit empty 0-byte image file -> 400 Bad Request."""
    mock_db_session.zone_id = "DANANG_CORE"

    form_data = {
        "title": "Sự cố ảnh rỗng",
        "description": "Tải lên tệp ảnh 0 byte để kiểm tra lỗi",
        "latitude": "16.0611",
        "longitude": "108.2208",
        "address_text": "Cầu Rồng, Đà Nẵng",
    }
    files = {
        "image": ("empty.jpg", b"", "image/jpeg"),
    }

    response = await client.post("/api/v1/incidents", data=form_data, files=files)

    assert response.status_code == 400
    data = response.json()
    assert "Tệp hình ảnh rỗng" in data["detail"]


@pytest.mark.asyncio
async def test_create_incident_file_too_large(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
    monkeypatch,
):
    """Test 4: Submit image exceeding MAX_UPLOAD_SIZE_MB -> 413 Request Entity Too Large."""
    mock_db_session.zone_id = "DANANG_CORE"

    # Set threshold to 1KB (0.001MB) for fast memory testing
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 0.001)

    # 3KB content exceeds 1KB limit
    oversized_bytes = b"X" * 3000

    form_data = {
        "title": "Sự cố tệp quá lớn",
        "description": "Tải lên tệp vượt quá giới hạn dung lượng cho phép",
        "latitude": "16.0611",
        "longitude": "108.2208",
        "address_text": "Cầu Rồng, Đà Nẵng",
    }
    files = {
        "image": ("large.jpg", oversized_bytes, "image/jpeg"),
    }

    response = await client.post("/api/v1/incidents", data=form_data, files=files)

    assert response.status_code == 413
    data = response.json()
    assert "vượt quá giới hạn cho phép" in data["detail"]


@pytest.mark.asyncio
async def test_get_nearby_incidents(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
):
    """Test 5: Query nearby incidents within radius -> 200 OK, ordered by distance, safe image URLs."""
    inc1 = _make_mock_incident(
        id=uuid4(),
        ticket_code="DN-202610-NEAR1",
        title="Ổ gà Cầu Rồng",
        status="SUBMITTED",
        priority="HIGH",
        latitude=16.0612,
        longitude=108.2209,
    )
    inc2 = _make_mock_incident(
        id=uuid4(),
        ticket_code="DN-202610-NEAR2",
        title="Cây nghiêng gần Cầu Rồng",
        status="TRIAGED",
        priority="NORMAL",
        latitude=16.0613,
        longitude=108.2210,
    )

    # Mock execute returns rows: (incident, distance_meters)
    mock_db_session.execute_queue = [
        MockResult([(inc1, 14.25), (inc2, 38.60)])
    ]

    response = await client.get(
        "/api/v1/incidents/nearby",
        params={"latitude": 16.0611, "longitude": 108.2208, "radius": 50, "limit": 10},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 2
    items = data["items"]

    assert items[0]["ticket_code"] == "DN-202610-NEAR1"
    assert items[0]["distance_meters"] == 14.25
    assert "_anon.jpg" in items[0]["image_url"]
    assert "private" not in items[0]["image_url"]

    assert items[1]["ticket_code"] == "DN-202610-NEAR2"
    assert items[1]["distance_meters"] == 38.60


@pytest.mark.asyncio
async def test_vote_duplicate_incident(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
):
    """Test 6: Citizen votes duplicate incident -> 200 OK, duplicate_count increments by 1."""
    inc_id = uuid4()
    incident = _make_mock_incident(
        id=inc_id,
        ticket_code="DN-202610-VOTE",
        duplicate_count=3,
    )
    mock_db_session.get_item = incident

    response = await client.post(f"/api/v1/incidents/{inc_id}/vote-duplicate")

    assert response.status_code == 200
    data = response.json()
    assert data["incident_id"] == str(inc_id)
    assert data["ticket_code"] == "DN-202610-VOTE"
    assert data["duplicate_count"] == 4
    assert "Ghi nhận phản ánh trùng lặp thành công" in data["message"]
    assert mock_db_session.committed is True


@pytest.mark.asyncio
async def test_get_incident_by_ticket_code_public(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
):
    """Test 7: Unauthenticated public lookup -> PII masked (0905***...), BEFORE_ORIGINAL stripped."""
    inc_id = uuid4()
    incident = _make_mock_incident(
        id=inc_id,
        ticket_code="DN-202610-PUB1",
        citizen_contact="0905123456",
    )
    # Ensure media has both original and anonymized files
    incident.media = [
        IncidentMedia(
            id=uuid4(),
            incident_id=inc_id,
            media_type="BEFORE_ORIGINAL",
            file_url="/uploads/private/orig_secret.jpg",
            created_at=datetime.now(timezone.utc),
        ),
        IncidentMedia(
            id=uuid4(),
            incident_id=inc_id,
            media_type="BEFORE_ANONYMIZED",
            file_url="/uploads/public/anon_public.jpg",
            created_at=datetime.now(timezone.utc),
        ),
    ]

    mock_db_session.execute_queue = [MockResult(incident)]

    response = await client.get("/api/v1/incidents/DN-202610-PUB1")

    assert response.status_code == 200
    data = response.json()

    # 1. PII citizen contact must be masked (0905***456)
    assert data["citizen_contact"] == "0905***456"
    assert data["citizen_contact"] != "0905123456"

    # 2. BEFORE_ORIGINAL must be filtered out completely from public view
    media_list = data["media"]
    assert len(media_list) == 1
    assert media_list[0]["media_type"] == "BEFORE_ANONYMIZED"
    assert media_list[0]["file_url"] == "/uploads/public/anon_public.jpg"
    assert not any(m["media_type"] == "BEFORE_ORIGINAL" for m in media_list)


@pytest.mark.asyncio
async def test_get_incident_by_ticket_code_dispatcher(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
):
    """Test 8: Authenticated DISPATCHER/ADMIN lookup -> full phone number & BEFORE_ORIGINAL visible."""
    inc_id = uuid4()
    incident = _make_mock_incident(
        id=inc_id,
        ticket_code="DN-202610-DISP",
        citizen_contact="0905123456",
    )
    incident.media = [
        IncidentMedia(
            id=uuid4(),
            incident_id=inc_id,
            media_type="BEFORE_ORIGINAL",
            file_url="/uploads/private/orig_secret.jpg",
            created_at=datetime.now(timezone.utc),
        ),
        IncidentMedia(
            id=uuid4(),
            incident_id=inc_id,
            media_type="BEFORE_ANONYMIZED",
            file_url="/uploads/public/anon_public.jpg",
            created_at=datetime.now(timezone.utc),
        ),
    ]

    mock_db_session.execute_queue = [MockResult(incident)]

    # Override current user as DISPATCHER
    dispatcher_user = User(
        id=uuid4(),
        email="dispatcher@danang.gov.vn",
        role="DISPATCHER",
        full_name="Điều phối viên Đà Nẵng",
    )
    app.dependency_overrides[get_current_user_optional] = lambda: dispatcher_user

    response = await client.get("/api/v1/incidents/DN-202610-DISP")

    assert response.status_code == 200
    data = response.json()

    # 1. Unmasked phone number for dispatcher
    assert data["citizen_contact"] == "0905123456"

    # 2. Both original and anonymized media files accessible
    media_list = data["media"]
    assert len(media_list) == 2
    types = [m["media_type"] for m in media_list]
    assert "BEFORE_ORIGINAL" in types
    assert "BEFORE_ANONYMIZED" in types


@pytest.mark.asyncio
async def test_list_incidents_pagination_and_filter(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
):
    """Test 9: List incidents with pagination and filtering -> 200 OK with correct total and slice."""
    cat_id = uuid4()
    category = Category(
        id=cat_id,
        code="ROAD_DAMAGE",
        name="Hư hỏng mặt đường",
        default_sla_hours=24,
        created_at=datetime.now(timezone.utc),
    )

    incidents = [
        _make_mock_incident(
            id=uuid4(),
            ticket_code=f"DN-202610-P{i:03d}",
            title=f"Sự cố mặt đường số {i}",
            status="SUBMITTED",
            district="Hải Châu",
            category=category,
        )
        for i in range(1, 4)
    ]

    # First query count -> 15; second query items -> slice of 3
    mock_db_session.execute_queue = [
        MockResult(15),
        MockResult(incidents),
    ]

    response = await client.get(
        "/api/v1/incidents",
        params={
            "page": 2,
            "page_size": 3,
            "status": "SUBMITTED",
            "district": "Hải Châu",
            "category_code": "ROAD_DAMAGE",
            "category_id": str(cat_id),
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 15
    assert data["page"] == 2
    assert data["page_size"] == 3
    assert len(data["items"]) == 3

    for item in data["items"]:
        assert item["status"] == "SUBMITTED"
        assert item["district"] == "Hải Châu"
        assert item["category_code"] == "ROAD_DAMAGE"


@pytest.mark.asyncio
async def test_get_incident_by_ticket_code_not_found(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
):
    """Test 10: Lookup non-existent ticket code -> 404 Not Found."""
    mock_db_session.execute_queue = [MockResult(None)]

    response = await client.get("/api/v1/incidents/DN-999999-NONE")

    assert response.status_code == 404
    data = response.json()
    assert "Không tìm thấy sự cố" in data["detail"]


@pytest.mark.asyncio
async def test_vote_duplicate_not_found(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
):
    """Test 11: Vote duplicate on non-existent incident id -> 404 Not Found."""
    mock_db_session.get_item = None

    random_id = uuid4()
    response = await client.post(f"/api/v1/incidents/{random_id}/vote-duplicate")

    assert response.status_code == 404
    data = response.json()
    assert "Không tìm thấy sự cố" in data["detail"]


@pytest.mark.asyncio
async def test_create_incident_anonymization_failure(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
    monkeypatch,
):
    """Test 12: Handle anonymizer error gracefully -> 400 Bad Request."""
    mock_db_session.zone_id = "DANANG_CORE"

    def _failing_anonymize(input_path, output_path):
        raise ValueError("Corrupted image stream")

    monkeypatch.setattr("app.api.v1.endpoints.incidents.anonymize_image", _failing_anonymize)

    form_data = {
        "title": "Sự cố ảnh hỏng",
        "description": "Thử nghiệm khi thuật toán OpenCV ném lỗi",
        "latitude": "16.0611",
        "longitude": "108.2208",
        "address_text": "Cầu Rồng, Đà Nẵng",
    }
    files = {
        "image": ("corrupted.jpg", b"SOME_CORRUPTED_BYTES", "image/jpeg"),
    }

    response = await client.post("/api/v1/incidents", data=form_data, files=files)

    assert response.status_code == 400
    data = response.json()
    assert "Không thể xử lý hình ảnh tải lên" in data["detail"]


@pytest.mark.asyncio
async def test_process_incident_ai_triage_task_execution(
    mock_db_session: MockAsyncSession,
):
    """Test 13: Background AI triage function execution with mock classification."""
    inc_id = uuid4()
    incident = _make_mock_incident(id=inc_id, status="SUBMITTED")

    cat_id = uuid4()
    category = Category(
        id=cat_id,
        code="ROAD_DAMAGE",
        name="Hư hỏng mặt đường",
        default_sla_hours=48,
        created_at=datetime.now(timezone.utc),
    )

    dept_id = uuid4()
    department = Department(
        id=dept_id,
        code="SGTVT_DN",
        name="Sở GTVT Đà Nẵng",
        level="CITY_DEPT",
        created_at=datetime.now(timezone.utc),
    )

    # Responses: 1. categories, 2. departments, 3. incident
    mock_db_session.execute_queue = [
        MockResult([category]),
        MockResult([department]),
        MockResult(incident),
    ]

    mock_ai_output = {
        "category_code": "ROAD_DAMAGE",
        "priority": "HIGH",
        "suggested_department_code": "SGTVT_DN",
        "confidence": 0.94,
        "summary_vi": "Hố sụt nguy hiểm cần sửa chữa",
        "hazard_warning": "Có thể gây tai nạn xe máy",
    }

    with patch(
        "app.api.v1.endpoints.incidents.classify_incident_image",
        new_callable=AsyncMock,
        return_value=mock_ai_output,
    ):
        await process_incident_ai_triage(
            incident_id=inc_id,
            image_path="/fake/uploads/test.jpg",
            description="Có hố sụt lớn",
            db_session=mock_db_session,
        )

        assert incident.status == "TRIAGED"
        assert incident.priority == "HIGH"
        assert incident.category_id == cat_id
        assert incident.assigned_department_id == dept_id
        assert incident.ai_confidence == 0.94
        assert incident.sla_due_at is not None
        assert mock_db_session.committed is True

        # Verify audit history transition
        histories = [o for o in mock_db_session.added if isinstance(o, IncidentHistory)]
        assert len(histories) >= 1
        last_hist = histories[-1]
        assert last_hist.from_status == "SUBMITTED"
        assert last_hist.to_status == "TRIAGED"
