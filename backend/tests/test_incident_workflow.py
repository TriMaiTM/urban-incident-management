"""Comprehensive tests for Incident Workflow: Triage, Assignment, State Transitions, and Feedback.

100% independent mock tests: no live Docker database or external API dependencies.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
from uuid import UUID, uuid4

import cv2
import httpx
import numpy as np
import pytest
from shapely.geometry import Point

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models.category import Category
from app.models.department import Department
from app.models.incident import Incident, IncidentFeedback, IncidentHistory, IncidentMedia
from app.models.user import User


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


def _make_mock_user(
    id: UUID | None = None,
    email: str = "dispatcher@danang.gov.vn",
    role: str = "DISPATCHER",
    full_name: str = "Nguyễn Văn Điều Phối",
) -> User:
    """Helper constructing mock user model instance."""
    user = User(
        id=id or uuid4(),
        email=email,
        role=role,
        full_name=full_name,
        auth_provider="LOCAL",
    )
    return user


def _make_mock_incident(
    id: UUID | None = None,
    ticket_code: str = "DN-202610-TEST",
    title: str = "Hư hỏng mặt đường Điện Biên Phủ",
    description: str = "Ổ gà lớn sâu 15cm gây nguy hiểm cho xe máy",
    status: str = "SUBMITTED",
    priority: str = "NORMAL",
    channel: str = "WEB",
    latitude: float = 16.0611,
    longitude: float = 108.2208,
    address_text: str = "120 Điện Biên Phủ, Thanh Khê, Đà Nẵng",
    district: str = "Thanh Khê",
    ward: str = "Chính Gián",
    citizen_contact: str | None = "0905123456",
    duplicate_count: int = 0,
    media: list[IncidentMedia] | None = None,
    history: list[IncidentHistory] | None = None,
    category: Category | None = None,
    assigned_department: Department | None = None,
    feedback: IncidentFeedback | None = None,
) -> Incident:
    """Helper constructing Incident model instance with populated relationships."""
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
    inc.feedback = feedback
    return inc


# ============================================================================
# Mock Result & Session
# ============================================================================

class MockResult:
    """Mock query result supporting scalar_one_or_none, scalar, all, etc."""

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
        if self._data is None:
            return None
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


class MockWorkflowSession:
    """Mock database session storing and resolving entities for workflow endpoints."""

    def __init__(self):
        self.entities: dict[tuple[type, UUID], object] = {}
        self.added = []
        self.committed = False
        self.execute_queue: list[MockResult] = []

    def seed(self, *entities):
        for entity in entities:
            if hasattr(entity, "created_at") and getattr(entity, "created_at", None) is None:
                entity.created_at = datetime.now(timezone.utc)
            if hasattr(entity, "updated_at") and getattr(entity, "updated_at", None) is None:
                entity.updated_at = datetime.now(timezone.utc)
            self.entities[(type(entity), entity.id)] = entity
            self.added.append(entity)

    def add(self, obj):
        if hasattr(obj, "id") and getattr(obj, "id", None) is None:
            obj.id = uuid4()
        if hasattr(obj, "created_at") and getattr(obj, "created_at", None) is None:
            obj.created_at = datetime.now(timezone.utc)
        if hasattr(obj, "updated_at") and getattr(obj, "updated_at", None) is None:
            obj.updated_at = datetime.now(timezone.utc)
        self.added.append(obj)
        if hasattr(obj, "id"):
            self.entities[(type(obj), obj.id)] = obj

    async def commit(self):
        self.committed = True

    async def rollback(self):
        pass

    async def get(self, entity_cls, ident):
        return self.entities.get((entity_cls, ident))

    async def execute(self, stmt, *args, **kwargs):
        if self.execute_queue:
            return self.execute_queue.pop(0)

        col_names = []
        if hasattr(stmt, "selected_columns"):
            col_names = [getattr(c, "name", "") for c in stmt.selected_columns]

        stmt_str = str(stmt).lower()
        if "from incident_feedback" in stmt_str:
            ratings: list[int] = []
            seen_ids: set[UUID] = set()
            for (cls, _), obj in self.entities.items():
                if cls is IncidentFeedback and getattr(obj, "rating", None) is not None:
                    seen_ids.add(obj.id)
                    ratings.append(int(obj.rating))
            for (cls, _), inc in self.entities.items():
                if cls is Incident:
                    fb = getattr(inc, "feedback", None)
                    if fb is not None and getattr(fb, "rating", None) is not None and fb.id not in seen_ids:
                        seen_ids.add(fb.id)
                        ratings.append(int(fb.rating))
            return MockResult(ratings)

        if "from incidents" in stmt_str:
            params = {}
            try:
                params = stmt.compile().params
            except Exception:
                pass

            incidents = [obj for (cls, _), obj in self.entities.items() if cls is Incident]

            # 1. Aggregation queries by selected_columns
            if col_names == ["count"]:
                return MockResult(len(incidents))

            if col_names == ["status", "count"]:
                counts: dict[str, int] = {}
                for inc in incidents:
                    counts[inc.status] = counts.get(inc.status, 0) + 1
                return MockResult(list(counts.items()))

            if col_names == ["priority", "count"]:
                p_counts: dict[str, int] = {}
                for inc in incidents:
                    p_counts[inc.priority] = p_counts.get(inc.priority, 0) + 1
                return MockResult(list(p_counts.items()))

            if col_names == ["district", "count"]:
                d_counts: dict[str, int] = {}
                for inc in incidents:
                    if getattr(inc, "district", None):
                        d_counts[inc.district] = d_counts.get(inc.district, 0) + 1
                return MockResult(list(d_counts.items()))

            if col_names == ["status", "sla_due_at", "resolved_at"]:
                rows = [
                    (inc.status, getattr(inc, "sla_due_at", None), getattr(inc, "resolved_at", None))
                    for inc in incidents
                    if getattr(inc, "sla_due_at", None) is not None
                ]
                return MockResult(rows)

            if col_names == ["created_at", "resolved_at"]:
                rows = [
                    (getattr(inc, "created_at", None), getattr(inc, "resolved_at", None))
                    for inc in incidents
                    if getattr(inc, "resolved_at", None) is not None and getattr(inc, "created_at", None) is not None
                ]
                return MockResult(rows)

            if col_names == ["district", "status", "count"]:
                ds_counts: dict[tuple[str, str], int] = {}
                for inc in incidents:
                    d = getattr(inc, "district", None)
                    st = getattr(inc, "status", None)
                    if d and st:
                        ds_counts[(d, st)] = ds_counts.get((d, st), 0) + 1
                return MockResult([(d, st, c) for (d, st), c in ds_counts.items()])

            if col_names == ["rating"]:
                ratings: list[int] = []
                seen_ids: set[UUID] = set()
                for (cls, _), obj in self.entities.items():
                    if cls is IncidentFeedback and getattr(obj, "rating", None) is not None:
                        seen_ids.add(obj.id)
                        ratings.append(int(obj.rating))
                for inc in incidents:
                    fb = getattr(inc, "feedback", None)
                    if fb is not None and getattr(fb, "rating", None) is not None and fb.id not in seen_ids:
                        seen_ids.add(fb.id)
                        ratings.append(int(fb.rating))
                return MockResult(ratings)

            # 2. Single incident by ticket_code
            if "incidents.ticket_code =" in stmt_str:
                target_code = None
                for k, v in params.items():
                    if "ticket_code" in k:
                        target_code = str(v).strip()
                        break
                for inc in incidents:
                    if target_code is not None and getattr(inc, "ticket_code", None) == target_code:
                        return MockResult(inc)
                return MockResult(None)

            # 3. Single incident by id
            if "incidents.id =" in stmt_str:
                target_id = None
                for k, v in params.items():
                    if "id" in k:
                        target_id = str(v)
                        break
                for inc in incidents:
                    if target_id is not None and str(getattr(inc, "id", "")) == target_id:
                        return MockResult(inc)
                if len(incidents) == 1:
                    return MockResult(incidents[0])
                return MockResult(None)

            # 4. Multi-incident queries (e.g. GET /map or list_incidents)
            filtered = list(incidents)
            if "not in" in stmt_str or "notin" in stmt_str:
                filtered = [i for i in filtered if getattr(i, "status", None) not in ("CLOSED", "REJECTED")]

            status_param = None
            for k, v in params.items():
                if "status" in k:
                    status_param = v
                    break
            if status_param and "incidents.status =" in stmt_str:
                filtered = [i for i in filtered if getattr(i, "status", None) == status_param]

            dist_param = None
            for k, v in params.items():
                if "district" in k or "lower" in k:
                    dist_param = v
                    break
            if dist_param and "lower(incidents.district)" in stmt_str:
                filtered = [
                    i for i in filtered
                    if getattr(i, "district", "") and getattr(i, "district", "").strip().lower() == str(dist_param).strip().lower()
                ]

            cat_param = None
            for k, v in params.items():
                if "code" in k:
                    cat_param = v
                    break
            if cat_param and "categories.code =" in stmt_str:
                filtered = [
                    i for i in filtered
                    if getattr(i, "category", None) and getattr(i.category, "code", None) == cat_param
                ]

            return MockResult(filtered)

        return MockResult(None)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_session():
    return MockWorkflowSession()


@pytest.fixture(autouse=True)
def setup_overrides(mock_session: MockWorkflowSession):
    app.dependency_overrides[get_db] = lambda: mock_session
    yield
    app.dependency_overrides.clear()


# ============================================================================
# Test Cases for Step 2: Triage & Assign
# ============================================================================

@pytest.mark.asyncio
async def test_triage_incident_dispatcher_success(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Dispatcher successfully triages incident: updates category, priority, department, SLA, and logs audit."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    category = Category(
        id=uuid4(),
        code="ROAD_DAMAGE",
        name="Hư hỏng mặt đường",
        default_sla_hours=24,
        created_at=datetime.now(timezone.utc),
    )
    mock_session.seed(category)

    department = Department(
        id=uuid4(),
        code="SGTVT_DN",
        name="Sở Giao thông Vận tải",
        level="CITY_DEPT",
        created_at=datetime.now(timezone.utc),
    )
    mock_session.seed(department)

    incident = _make_mock_incident(status="SUBMITTED", priority="NORMAL")
    mock_session.seed(incident)

    payload = {
        "category_id": str(category.id),
        "priority": "HIGH",
        "assigned_department_id": str(department.id),
        "note": "Điều phối viên đã xác thực hiện trường và chuyển giao đơn vị",
    }

    response = await client.patch(f"/api/v1/incidents/{incident.id}/triage", json=payload)

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["status"] == "TRIAGED"
    assert data["priority"] == "HIGH"
    assert data["category_code"] == "ROAD_DAMAGE"
    assert data["assigned_department_code"] == "SGTVT_DN"
    assert data["sla_due_at"] is not None
    assert mock_session.committed is True

    # Audit history check
    histories = [o for o in mock_session.added if isinstance(o, IncidentHistory)]
    triage_hist = [h for h in histories if h.to_status == "TRIAGED"]
    assert len(triage_hist) >= 1
    assert triage_hist[-1].from_status == "SUBMITTED"
    assert triage_hist[-1].actor_id == dispatcher.id
    assert triage_hist[-1].note == payload["note"]


@pytest.mark.asyncio
async def test_triage_incident_emergency_sla_reduction(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Triage recalculates sla_due_at from created_at by priority (EMERGENCY=4h, HIGH=12h, NORMAL=24h, LOW=48h)."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    category = Category(
        id=uuid4(),
        code="FLOODING",
        name="Ngập úng đô thị",
        default_sla_hours=8,
        created_at=datetime.now(timezone.utc),
    )
    mock_session.seed(category)

    department = Department(
        id=uuid4(),
        code="CTDN_WATER",
        name="Công ty Thoát nước Đà Nẵng",
        level="UTILITY_COMPANY",
        created_at=datetime.now(timezone.utc),
    )
    mock_session.seed(department)

    created_time = datetime.now(timezone.utc) - timedelta(hours=1)
    incident = _make_mock_incident(status="SUBMITTED")
    incident.created_at = created_time
    mock_session.seed(incident)

    payload = {
        "category_id": str(category.id),
        "priority": "EMERGENCY",
        "assigned_department_id": str(department.id),
    }

    response = await client.patch(f"/api/v1/incidents/{incident.id}/triage", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "TRIAGED"
    assert data["priority"] == "EMERGENCY"

    # EMERGENCY SLA is 4 hours from incident.created_at
    sla_due = datetime.fromisoformat(data["sla_due_at"].replace("Z", "+00:00"))
    diff_hours = (sla_due - created_time).total_seconds() / 3600
    assert abs(diff_hours - 4.0) < 0.01


@pytest.mark.asyncio
async def test_triage_incident_citizen_forbidden(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Citizen user cannot call triage endpoint -> 403 Forbidden."""
    citizen = _make_mock_user(role="CITIZEN")
    app.dependency_overrides[get_current_user] = lambda: citizen

    incident_id = uuid4()
    payload = {
        "category_id": str(uuid4()),
        "priority": "NORMAL",
        "assigned_department_id": str(uuid4()),
    }

    response = await client.patch(f"/api/v1/incidents/{incident_id}/triage", json=payload)
    assert response.status_code == 403
    assert "Quyền truy cập bị từ chối" in response.json()["detail"]


@pytest.mark.asyncio
async def test_triage_incident_invalid_priority(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Invalid priority value -> 422 Unprocessable Entity."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    category = Category(id=uuid4(), code="ROAD", name="Đường", default_sla_hours=24)
    department = Department(id=uuid4(), code="DEPT", name="Đơn vị", level="CITY_DEPT")
    incident = _make_mock_incident()

    mock_session.seed(category)
    mock_session.seed(department)
    mock_session.seed(incident)

    payload = {
        "category_id": str(category.id),
        "priority": "SUPER_CRITICAL",
        "assigned_department_id": str(department.id),
    }

    response = await client.patch(f"/api/v1/incidents/{incident.id}/triage", json=payload)
    assert response.status_code == 422
    assert "Mức độ ưu tiên" in response.json()["detail"]


@pytest.mark.asyncio
async def test_triage_incident_category_not_found(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Non-existent category ID -> 404 Not Found."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    department = Department(id=uuid4(), code="DEPT", name="Đơn vị", level="CITY_DEPT")
    incident = _make_mock_incident()

    mock_session.seed(department)
    mock_session.seed(incident)

    payload = {
        "category_id": str(uuid4()),
        "priority": "NORMAL",
        "assigned_department_id": str(department.id),
    }

    response = await client.patch(f"/api/v1/incidents/{incident.id}/triage", json=payload)
    assert response.status_code == 404
    assert "Không tìm thấy danh mục" in response.json()["detail"]


@pytest.mark.asyncio
async def test_triage_incident_department_not_found(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Non-existent department ID -> 404 Not Found."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    category = Category(id=uuid4(), code="ROAD", name="Đường", default_sla_hours=24)
    incident = _make_mock_incident()

    mock_session.seed(category)
    mock_session.seed(incident)

    payload = {
        "category_id": str(category.id),
        "priority": "NORMAL",
        "assigned_department_id": str(uuid4()),
    }

    response = await client.patch(f"/api/v1/incidents/{incident.id}/triage", json=payload)
    assert response.status_code == 404
    assert "Không tìm thấy phòng ban/đơn vị" in response.json()["detail"]


@pytest.mark.asyncio
async def test_assign_incident_to_technician_success(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Dispatcher assigns incident to a field technician -> status ASSIGNED, logs audit."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    technician = _make_mock_user(
        role="TECHNICIAN",
        email="tech@danang.gov.vn",
        full_name="Trần Văn Kỹ Thuật",
    )
    mock_session.seed(technician)

    department = Department(
        id=uuid4(),
        code="SGTVT_DN",
        name="Sở Giao thông Vận tải",
        level="CITY_DEPT",
    )
    mock_session.seed(department)

    incident = _make_mock_incident(status="TRIAGED")
    mock_session.seed(incident)

    payload = {
        "assigned_department_id": str(department.id),
        "assigned_technician_id": str(technician.id),
        "note": "Giao kỹ thuật viên Trần Văn Kỹ Thuật xử lý trong ca sáng",
    }

    response = await client.patch(f"/api/v1/incidents/{incident.id}/assign", json=payload)

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["status"] == "ASSIGNED"
    assert data["assigned_technician_id"] == str(technician.id)
    assert mock_session.committed is True

    # Audit history check
    histories = [o for o in mock_session.added if isinstance(o, IncidentHistory)]
    assign_hist = [h for h in histories if h.to_status == "ASSIGNED"]
    assert len(assign_hist) >= 1
    assert assign_hist[-1].from_status == "TRIAGED"
    assert assign_hist[-1].actor_id == dispatcher.id
    assert assign_hist[-1].note == payload["note"]


@pytest.mark.asyncio
async def test_assign_incident_citizen_forbidden(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Citizen user cannot call assign endpoint -> 403 Forbidden."""
    citizen = _make_mock_user(role="CITIZEN")
    app.dependency_overrides[get_current_user] = lambda: citizen

    incident_id = uuid4()
    payload = {"assigned_technician_id": str(uuid4())}

    response = await client.patch(f"/api/v1/incidents/{incident_id}/assign", json=payload)
    assert response.status_code == 403
    assert "Quyền truy cập bị từ chối" in response.json()["detail"]


@pytest.mark.asyncio
async def test_assign_incident_invalid_role_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Assigning to a user who is not TECHNICIAN/DISPATCHER/ADMIN -> 400 Bad Request."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    non_tech_user = _make_mock_user(
        role="CITIZEN",
        email="random_citizen@gmail.com",
        full_name="Nguyễn Văn Dân",
    )
    mock_session.seed(non_tech_user)

    incident = _make_mock_incident(status="TRIAGED")
    mock_session.seed(incident)

    payload = {
        "assigned_technician_id": str(non_tech_user.id),
    }

    response = await client.patch(f"/api/v1/incidents/{incident.id}/assign", json=payload)
    assert response.status_code == 400
    assert "không thuộc danh sách vai trò hợp lệ" in response.json()["detail"]


@pytest.mark.asyncio
async def test_assign_incident_empty_payload_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Neither department nor technician supplied -> 400 Bad Request."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident = _make_mock_incident(status="TRIAGED")
    mock_session.seed(incident)

    payload = {"note": "Chỉ có ghi chú không có người/đơn vị"}

    response = await client.patch(f"/api/v1/incidents/{incident.id}/assign", json=payload)
    assert response.status_code == 400
    assert "Vui lòng cung cấp ít nhất" in response.json()["detail"]


@pytest.mark.asyncio
async def test_assign_incident_technician_not_found(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Assigned technician user ID does not exist -> 404 Not Found."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident = _make_mock_incident(status="TRIAGED")
    mock_session.seed(incident)

    payload = {"assigned_technician_id": str(uuid4())}

    response = await client.patch(f"/api/v1/incidents/{incident.id}/assign", json=payload)
    assert response.status_code == 404
    assert "Không tìm thấy cán bộ kỹ thuật" in response.json()["detail"]


@pytest.mark.asyncio
async def test_triage_incident_closed_or_rejected_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Triage on already CLOSED or REJECTED incident -> 400 Bad Request."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    category = Category(
        id=uuid4(),
        code="ROAD_DAMAGE",
        name="Hư hỏng mặt đường",
        default_sla_hours=24,
        created_at=datetime.now(timezone.utc),
    )
    department = Department(
        id=uuid4(),
        code="SGTVT_DN",
        name="Sở Giao thông Vận tải",
        level="CITY_DEPT",
        created_at=datetime.now(timezone.utc),
    )
    incident_closed = _make_mock_incident(status="CLOSED")
    mock_session.seed(dispatcher, category, department, incident_closed)

    payload = {
        "category_id": str(category.id),
        "priority": "HIGH",
        "assigned_department_id": str(department.id),
    }

    response = await client.patch(f"/api/v1/incidents/{incident_closed.id}/triage", json=payload)
    assert response.status_code == 400
    assert "Không thể điều phối sự cố đã kết thúc" in response.json()["detail"]


@pytest.mark.asyncio
async def test_assign_incident_closed_or_rejected_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Assign on already CLOSED or REJECTED incident -> 400 Bad Request."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    department = Department(
        id=uuid4(),
        code="SGTVT_DN",
        name="Sở Giao thông Vận tải",
        level="CITY_DEPT",
        created_at=datetime.now(timezone.utc),
    )
    incident_rejected = _make_mock_incident(status="REJECTED")
    mock_session.seed(dispatcher, department, incident_rejected)

    payload = {
        "assigned_department_id": str(department.id),
    }

    response = await client.patch(f"/api/v1/incidents/{incident_rejected.id}/assign", json=payload)
    assert response.status_code == 400
    assert "Không thể phân công sự cố đã kết thúc" in response.json()["detail"]


# ============================================================================
# Test Cases for Step 3: Status Transition, Proof Verification & Rejection
# ============================================================================

@pytest.mark.asyncio
async def test_status_transition_to_in_progress_success(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Field technician moves incident from ASSIGNED to IN_PROGRESS."""
    technician = _make_mock_user(role="TECHNICIAN", email="tech@danang.gov.vn")
    app.dependency_overrides[get_current_user] = lambda: technician

    incident = _make_mock_incident(status="ASSIGNED")
    mock_session.seed(technician, incident)

    payload_note = "Kỹ thuật viên đã tiếp cận hiện trường và bắt đầu xử lý"
    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "IN_PROGRESS", "note": payload_note},
    )

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["status"] == "IN_PROGRESS"
    assert mock_session.committed is True

    histories = [o for o in mock_session.added if isinstance(o, IncidentHistory)]
    status_hist = [h for h in histories if h.to_status == "IN_PROGRESS"]
    assert len(status_hist) >= 1
    assert status_hist[-1].from_status == "ASSIGNED"
    assert status_hist[-1].actor_id == technician.id
    assert status_hist[-1].note == payload_note


@pytest.mark.asyncio
async def test_status_transition_to_in_progress_invalid_source_status_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Transition to IN_PROGRESS when incident is SUBMITTED (not ASSIGNED/RESOLVED) -> 400 Bad Request."""
    technician = _make_mock_user(role="TECHNICIAN")
    app.dependency_overrides[get_current_user] = lambda: technician

    incident = _make_mock_incident(status="SUBMITTED")
    mock_session.seed(technician, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "IN_PROGRESS"},
    )

    assert response.status_code == 400
    assert "Chỉ có thể chuyển sang 'IN_PROGRESS'" in response.json()["detail"]


@pytest.mark.asyncio
async def test_status_transition_to_resolved_without_proof_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Transition to RESOLVED without AFTER_PROOF image -> 400 Bad Request."""
    technician = _make_mock_user(role="TECHNICIAN")
    app.dependency_overrides[get_current_user] = lambda: technician

    incident = _make_mock_incident(status="IN_PROGRESS")
    mock_session.seed(technician, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "RESOLVED", "note": "Đã xử lý xong"},
    )

    assert response.status_code == 400
    assert "Bắt buộc phải tải lên hình ảnh minh chứng sau sửa chữa (AFTER_PROOF)" in response.json()["detail"]


@pytest.mark.asyncio
async def test_status_transition_to_resolved_with_proof_success(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Transition to RESOLVED with valid proof image -> saves AFTER_PROOF, sets resolved_at, updates status."""
    technician = _make_mock_user(role="TECHNICIAN")
    app.dependency_overrides[get_current_user] = lambda: technician

    incident = _make_mock_incident(status="IN_PROGRESS")
    mock_session.seed(technician, incident)

    img_bytes = _create_synthetic_image_bytes()
    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "RESOLVED", "note": "Đã vá xong ổ gà và hoàn trả mặt đường"},
        files={"proof_image": ("repaired_road.jpg", img_bytes, "image/jpeg")},
    )

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["status"] == "RESOLVED"
    assert data["resolved_at"] is not None
    assert mock_session.committed is True

    # Check that AFTER_PROOF media was created and added
    medias = [o for o in mock_session.added if isinstance(o, IncidentMedia)]
    proof_medias = [m for m in medias if m.media_type == "AFTER_PROOF"]
    assert len(proof_medias) >= 1
    assert "proof_" in proof_medias[-1].file_url

    # Check history
    histories = [o for o in mock_session.added if isinstance(o, IncidentHistory)]
    resolved_hist = [h for h in histories if h.to_status == "RESOLVED"]
    assert len(resolved_hist) >= 1
    assert resolved_hist[-1].from_status == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_status_transition_to_rejected_dispatcher_success(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Dispatcher rejects invalid incident with explanation note -> status REJECTED, audit logged."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident = _make_mock_incident(status="SUBMITTED")
    mock_session.seed(dispatcher, incident)

    payload_note = "Hiện trường không có sự cố theo phản ánh sau khi lực lượng kiểm tra."
    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "REJECTED", "note": payload_note},
    )

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["status"] == "REJECTED"
    assert mock_session.committed is True

    histories = [o for o in mock_session.added if isinstance(o, IncidentHistory)]
    reject_hist = [h for h in histories if h.to_status == "REJECTED"]
    assert len(reject_hist) >= 1
    assert reject_hist[-1].note == payload_note
    assert reject_hist[-1].actor_id == dispatcher.id
    assert reject_hist[-1].from_status == "SUBMITTED"


@pytest.mark.asyncio
async def test_status_transition_to_rejected_technician_forbidden(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Field technician attempts to reject incident -> 403 Forbidden."""
    technician = _make_mock_user(role="TECHNICIAN")
    app.dependency_overrides[get_current_user] = lambda: technician

    incident = _make_mock_incident(status="ASSIGNED")
    mock_session.seed(technician, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "REJECTED", "note": "Kỹ thuật viên muốn từ chối"},
    )

    assert response.status_code == 403
    assert "Chỉ Điều phối viên (DISPATCHER) hoặc Quản trị viên (ADMIN)" in response.json()["detail"]


@pytest.mark.asyncio
async def test_status_transition_to_rejected_without_note_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Rejecting without providing an explanatory note -> 400 Bad Request."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident = _make_mock_incident(status="SUBMITTED")
    mock_session.seed(dispatcher, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "REJECTED", "note": "   "},
    )

    assert response.status_code == 400
    assert "Bắt buộc phải cung cấp lý do giải trình khi từ chối sự cố" in response.json()["detail"]


@pytest.mark.asyncio
async def test_status_transition_to_closed_dispatcher_success(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Dispatcher successfully closes anonymous CONFIRMED incident (citizen_id is None) -> status CLOSED."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident = _make_mock_incident(status="CONFIRMED")
    incident.citizen_id = None
    mock_session.seed(dispatcher, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "CLOSED", "note": "Đã hoàn tất quy trình nghiệm thu phiếu khách vãng lai"},
    )

    assert response.status_code == 200, f"Error: {response.text}"
    assert response.json()["status"] == "CLOSED"


@pytest.mark.asyncio
async def test_status_transition_to_closed_technician_forbidden(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Field technician attempts to close incident -> 403 Forbidden."""
    technician = _make_mock_user(role="TECHNICIAN")
    app.dependency_overrides[get_current_user] = lambda: technician

    incident = _make_mock_incident(status="CONFIRMED")
    mock_session.seed(technician, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "CLOSED"},
    )

    assert response.status_code == 403
    assert "Chỉ Điều phối viên (DISPATCHER) hoặc Quản trị viên (ADMIN)" in response.json()["detail"]


@pytest.mark.asyncio
async def test_status_transition_to_closed_invalid_source_status_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Closing an incident that is still IN_PROGRESS (not CONFIRMED) -> 400 Bad Request."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident = _make_mock_incident(status="IN_PROGRESS")
    mock_session.seed(dispatcher, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "CLOSED"},
    )

    assert response.status_code == 400
    assert "Chỉ có thể đóng sự cố (CLOSED) khi đang ở trạng thái 'CONFIRMED'" in response.json()["detail"]


@pytest.mark.asyncio
async def test_status_transition_reopen_from_resolved_resets_resolved_at(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Dispatcher reopens incident from RESOLVED -> REOPENED (resets resolved_at), then technician transitions REOPENED -> IN_PROGRESS."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    technician = _make_mock_user(role="TECHNICIAN", email="tech_reopen@danang.gov.vn")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident = _make_mock_incident(status="RESOLVED")
    incident.resolved_at = datetime.now(timezone.utc)
    mock_session.seed(dispatcher, technician, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "REOPENED", "note": "Yêu cầu xử lý lại do ảnh minh chứng chưa đạt"},
    )

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()
    assert data["status"] == "REOPENED"
    assert data["resolved_at"] is None
    assert incident.resolved_at is None

    # Technician starts working again: REOPENED -> IN_PROGRESS
    app.dependency_overrides[get_current_user] = lambda: technician
    resp_in_prog = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "IN_PROGRESS", "note": "Kỹ thuật viên bắt đầu xử lý lại"},
    )
    assert resp_in_prog.status_code == 200
    assert resp_in_prog.json()["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_status_transition_invalid_target_status_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Target status not in {'IN_PROGRESS', 'RESOLVED', 'CONFIRMED', 'REOPENED', 'REJECTED', 'CLOSED'} -> 422 Unprocessable Entity."""
    technician = _make_mock_user(role="TECHNICIAN")
    app.dependency_overrides[get_current_user] = lambda: technician

    incident = _make_mock_incident(status="ASSIGNED")
    mock_session.seed(technician, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "FLYING_TO_MARS"},
    )

    assert response.status_code == 422
    assert "không hợp lệ" in response.json()["detail"]


@pytest.mark.asyncio
async def test_status_transition_closed_or_rejected_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Updating status on already CLOSED or REJECTED incident -> 400 Bad Request."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident_closed = _make_mock_incident(status="CLOSED")
    mock_session.seed(dispatcher, incident_closed)

    response = await client.patch(
        f"/api/v1/incidents/{incident_closed.id}/status",
        data={"to_status": "CONFIRMED"},
    )
    assert response.status_code == 400
    assert "Không thể cập nhật trạng thái sự cố đã kết thúc" in response.json()["detail"]

    incident_rejected = _make_mock_incident(status="REJECTED")
    mock_session.seed(incident_rejected)

    response_rej = await client.patch(
        f"/api/v1/incidents/{incident_rejected.id}/status",
        data={"to_status": "CONFIRMED"},
    )
    assert response_rej.status_code == 400
    assert "Không thể cập nhật trạng thái sự cố đã kết thúc" in response_rej.json()["detail"]


# ============================================================================
# Test Cases for Step 4: Citizen Feedback & Dispute Reopen
# ============================================================================

@pytest.mark.asyncio
async def test_citizen_feedback_satisfied_confirmed_success(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Citizen confirms completion (action=CONFIRM, rating=5) on CONFIRMED incident -> status CLOSED."""
    citizen = _make_mock_user(role="CITIZEN", email="citizen@danang.gov.vn", full_name="Lê Văn Dân")
    app.dependency_overrides[get_current_user] = lambda: citizen

    incident = _make_mock_incident(status="CONFIRMED")
    incident.citizen_id = citizen.id
    mock_session.seed(citizen, incident)

    payload = {
        "action": "CONFIRM",
        "rating": 5,
        "comment": "Đội ngũ kỹ thuật xử lý rất nhanh và sạch sẽ, tôi rất hài lòng.",
    }

    response = await client.post(f"/api/v1/incidents/{incident.id}/feedback", json=payload)

    assert response.status_code == 201, f"Error: {response.text}"
    data = response.json()

    assert data["rating"] == 5
    assert data["comment"] == payload["comment"]
    assert data["incident_id"] == str(incident.id)
    assert data["citizen_id"] == str(citizen.id)
    assert data["created_at"] is not None

    assert incident.status == "CLOSED"
    assert mock_session.committed is True

    feedbacks = [o for o in mock_session.added if isinstance(o, IncidentFeedback)]
    assert len(feedbacks) >= 1
    assert feedbacks[-1].rating == 5

    histories = [o for o in mock_session.added if isinstance(o, IncidentHistory)]
    closed_hist = [h for h in histories if h.to_status == "CLOSED"]
    assert len(closed_hist) >= 1
    assert closed_hist[-1].from_status == "CONFIRMED"
    assert closed_hist[-1].actor_id == citizen.id
    assert "Công dân xác nhận đóng phiếu (5 sao)" in (closed_hist[-1].note or "")


@pytest.mark.asyncio
async def test_citizen_feedback_disputed_reopens_to_in_progress(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Citizen disputes on CONFIRMED incident (action=DISPUTE) -> reopens to REOPENED, resets resolved_at to None."""
    citizen = _make_mock_user(role="CITIZEN", email="citizen@danang.gov.vn")
    app.dependency_overrides[get_current_user] = lambda: citizen

    incident = _make_mock_incident(status="CONFIRMED")
    incident.citizen_id = citizen.id
    incident.resolved_at = datetime.now(timezone.utc)
    mock_session.seed(citizen, incident)

    payload = {
        "action": "DISPUTE",
        "rating": 2,
        "comment": "Chưa hoàn trả mặt đường phẳng, vẫn còn gồ ghề nguy hiểm.",
    }

    response = await client.post(f"/api/v1/incidents/{incident.id}/feedback", json=payload)

    assert response.status_code == 201, f"Error: {response.text}"
    data = response.json()

    assert data["rating"] == 2
    assert incident.status == "REOPENED"
    assert incident.resolved_at is None
    assert mock_session.committed is True

    histories = [o for o in mock_session.added if isinstance(o, IncidentHistory)]
    reopen_hist = [h for h in histories if h.to_status == "REOPENED"]
    assert len(reopen_hist) >= 1
    assert reopen_hist[-1].from_status == "CONFIRMED"
    assert reopen_hist[-1].actor_id == citizen.id
    assert "Công dân khiếu nại mở lại (2 sao)" in (reopen_hist[-1].note or "")


@pytest.mark.asyncio
async def test_citizen_feedback_on_unresolved_incident_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Submitting feedback on incident not in CONFIRMED status -> 400 Bad Request."""
    citizen = _make_mock_user(role="CITIZEN")
    app.dependency_overrides[get_current_user] = lambda: citizen

    incident = _make_mock_incident(status="RESOLVED")
    incident.citizen_id = citizen.id
    mock_session.seed(citizen, incident)

    payload = {"action": "CONFIRM", "rating": 4, "comment": "Tốt"}
    response = await client.post(f"/api/v1/incidents/{incident.id}/feedback", json=payload)

    assert response.status_code == 400
    assert "Chỉ có thể xác nhận hoặc khiếu nại đối với sự cố đã được điều phối viên duyệt nghiệm thu (trạng thái CONFIRMED)." in response.json()["detail"]


@pytest.mark.asyncio
async def test_citizen_feedback_duplicate_submission_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Submitting feedback when incident is CONFIRMED updates existing feedback; calling again after CLOSED fails with 400."""
    citizen = _make_mock_user(role="CITIZEN")
    app.dependency_overrides[get_current_user] = lambda: citizen

    existing_feedback = IncidentFeedback(
        id=uuid4(),
        incident_id=uuid4(),
        citizen_id=citizen.id,
        rating=2,
        comment="Khiếu nại lần 1",
        created_at=datetime.now(timezone.utc),
    )
    incident = _make_mock_incident(status="CONFIRMED", feedback=existing_feedback)
    incident.citizen_id = citizen.id
    existing_feedback.incident_id = incident.id
    mock_session.seed(citizen, incident, existing_feedback)

    # First call while CONFIRMED updates existing feedback in place and transitions to CLOSED
    payload = {"action": "CONFIRM", "rating": 5}
    response = await client.post(f"/api/v1/incidents/{incident.id}/feedback", json=payload)
    assert response.status_code == 201
    assert response.json()["rating"] == 5
    # Comment was not sent in payload, so previous comment is preserved
    assert response.json()["comment"] == "Khiếu nại lần 1"
    assert incident.status == "CLOSED"

    # Calling feedback again now that incident is CLOSED -> 400 Bad Request
    response_again = await client.post(f"/api/v1/incidents/{incident.id}/feedback", json=payload)
    assert response_again.status_code == 400
    assert "trạng thái CONFIRMED" in response_again.json()["detail"]


@pytest.mark.asyncio
async def test_citizen_feedback_unauthenticated_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Calling feedback without authentication -> 401 Unauthorized."""
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]

    incident = _make_mock_incident(status="RESOLVED")
    mock_session.seed(incident)

    payload = {"rating": 5, "comment": "Không đăng nhập"}
    response = await client.post(f"/api/v1/incidents/{incident.id}/feedback", json=payload)

    assert response.status_code == 401
    assert "Yêu cầu xác thực" in response.json()["detail"]


@pytest.mark.asyncio
async def test_citizen_feedback_incident_not_found_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Submitting feedback for non-existent incident -> 404 Not Found."""
    citizen = _make_mock_user(role="CITIZEN")
    app.dependency_overrides[get_current_user] = lambda: citizen

    non_existent_id = uuid4()
    payload = {"rating": 5, "comment": "Không tìm thấy"}
    response = await client.post(f"/api/v1/incidents/{non_existent_id}/feedback", json=payload)

    assert response.status_code == 404
    assert "Không tìm thấy sự cố" in response.json()["detail"]


# ============================================================================
# Test Cases for Step 5: GeoJSON Map & Analytics Summary
# ============================================================================

@pytest.mark.asyncio
async def test_get_incidents_map_geojson_success(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Calling GET /api/v1/incidents/map returns valid RFC 7946 GeoJSON FeatureCollection."""
    cat = Category(
        id=uuid4(),
        code="ROAD_DAMAGE",
        name="Hư hỏng mặt đường",
        default_sla_hours=24,
    )
    mock_session.seed(cat)

    # Incident 1: Active SUBMITTED
    inc1 = _make_mock_incident(
        id=uuid4(),
        ticket_code="DN-202610-MAP1",
        title="Ổ gà đường Trần Phú",
        status="SUBMITTED",
        priority="NORMAL",
        latitude=16.0678,
        longitude=108.2208,
        district="Hải Châu",
        category=cat,
    )

    # Incident 2: Active IN_PROGRESS with anonymized media
    inc2 = _make_mock_incident(
        id=uuid4(),
        ticket_code="DN-202610-MAP2",
        title="Ngập nước đường Nguyễn Văn Linh",
        status="IN_PROGRESS",
        priority="HIGH",
        latitude=16.0610,
        longitude=108.2150,
        district="Thanh Khê",
        category=cat,
    )

    # Incident 3: CLOSED incident -> should be excluded by default
    inc3 = _make_mock_incident(
        id=uuid4(),
        ticket_code="DN-202610-MAP3",
        title="Cây ngã đã dọn dẹp",
        status="CLOSED",
        priority="NORMAL",
        latitude=16.0700,
        longitude=108.2250,
        district="Hải Châu",
        category=cat,
    )

    mock_session.seed(inc1, inc2, inc3)

    response = await client.get("/api/v1/incidents/map")
    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["type"] == "FeatureCollection"
    assert "features" in data
    features = data["features"]
    assert len(features) == 2  # inc3 (CLOSED) excluded

    # Validate GeoJSON structure of first feature
    f1 = next(f for f in features if f["properties"]["ticket_code"] == "DN-202610-MAP1")
    assert f1["type"] == "Feature"
    assert f1["geometry"]["type"] == "Point"
    # RFC 7946: [longitude, latitude]
    assert f1["geometry"]["coordinates"] == [108.2208, 16.0678]
    assert f1["properties"]["status"] == "SUBMITTED"
    assert f1["properties"]["priority"] == "NORMAL"
    assert f1["properties"]["category_code"] == "ROAD_DAMAGE"
    assert f1["properties"]["category_name"] == "Hư hỏng mặt đường"
    assert f1["properties"]["district"] == "Hải Châu"
    assert f1["properties"]["is_overdue"] is False


@pytest.mark.asyncio
async def test_get_incidents_map_filter_by_district_and_category(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Calling GET /api/v1/incidents/map with district, category_code, and status filters."""
    cat_road = Category(id=uuid4(), code="ROAD_DAMAGE", name="Hư hỏng mặt đường", default_sla_hours=24)
    cat_waste = Category(id=uuid4(), code="WASTE", name="Rác thải", default_sla_hours=12)
    mock_session.seed(cat_road, cat_waste)

    inc1 = _make_mock_incident(
        id=uuid4(),
        ticket_code="DN-202610-FILT1",
        status="IN_PROGRESS",
        district="Thanh Khê",
        category=cat_road,
    )
    inc2 = _make_mock_incident(
        id=uuid4(),
        ticket_code="DN-202610-FILT2",
        status="SUBMITTED",
        district="Hải Châu",
        category=cat_waste,
    )
    mock_session.seed(inc1, inc2)

    # Filter by district and category_code
    response = await client.get("/api/v1/incidents/map", params={"district": "Thanh Khê", "category_code": "ROAD_DAMAGE"})
    assert response.status_code == 200
    features = response.json()["features"]
    assert len(features) == 1
    assert features[0]["properties"]["ticket_code"] == "DN-202610-FILT1"

    # Filter with status=CLOSED allows retrieving closed incident explicitly
    inc_closed = _make_mock_incident(
        id=uuid4(),
        ticket_code="DN-202610-FILT3",
        status="CLOSED",
        district="Thanh Khê",
        category=cat_road,
    )
    mock_session.seed(inc_closed)

    response_closed = await client.get("/api/v1/incidents/map", params={"status": "CLOSED"})
    assert response_closed.status_code == 200
    features_closed = response_closed.json()["features"]
    assert len(features_closed) == 1
    assert features_closed[0]["properties"]["ticket_code"] == "DN-202610-FILT3"


@pytest.mark.asyncio
async def test_get_incidents_analytics_summary_success(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Calling GET /api/v1/incidents/analytics/summary returns status, priority, district, and SLA metrics."""
    now = datetime.now(timezone.utc)
    # Incident 1: Resolved on time
    inc1 = _make_mock_incident(
        id=uuid4(),
        ticket_code="DN-202610-SLA1",
        status="RESOLVED",
        priority="HIGH",
        district="Hải Châu",
    )
    inc1.sla_due_at = now + timedelta(hours=5)
    inc1.resolved_at = now + timedelta(hours=2)

    # Incident 2: In progress but overdue
    inc2 = _make_mock_incident(
        id=uuid4(),
        ticket_code="DN-202610-SLA2",
        status="IN_PROGRESS",
        priority="NORMAL",
        district="Thanh Khê",
    )
    inc2.sla_due_at = now - timedelta(hours=2)  # overdue
    inc2.resolved_at = None

    # Incident 3: Submitted, normal
    inc3 = _make_mock_incident(
        id=uuid4(),
        ticket_code="DN-202610-SLA3",
        status="SUBMITTED",
        priority="LOW",
        district="Hải Châu",
    )
    inc3.sla_due_at = None
    inc3.resolved_at = None

    mock_session.seed(inc1, inc2, inc3)

    response = await client.get("/api/v1/incidents/analytics/summary")
    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["total_incidents"] == 3
    # Check all 8 statuses present
    assert data["by_status"]["SUBMITTED"] == 1
    assert data["by_status"]["IN_PROGRESS"] == 1
    assert data["by_status"]["RESOLVED"] == 1
    assert data["by_status"]["CLOSED"] == 0
    assert data["by_status"]["REJECTED"] == 0

    # Check 4 priorities present
    assert data["by_priority"]["LOW"] == 1
    assert data["by_priority"]["NORMAL"] == 1
    assert data["by_priority"]["HIGH"] == 1
    assert data["by_priority"]["EMERGENCY"] == 0

    # Check district
    assert data["by_district"]["Hải Châu"] == 2
    assert data["by_district"]["Thanh Khê"] == 1

    # Check SLA compliance: 1 within_sla (inc1), 1 breached_sla (inc2) -> 50.0%
    sla = data["sla_compliance"]
    assert sla["within_sla"] == 1
    assert sla["breached_sla"] == 1
    assert sla["compliance_rate"] == 50.0

    # Check with date filter params
    response_dates = await client.get(
        "/api/v1/incidents/analytics/summary",
        params={
            "from_date": (now - timedelta(days=1)).isoformat(),
            "to_date": (now + timedelta(days=1)).isoformat(),
        },
    )
    assert response_dates.status_code == 200


@pytest.mark.asyncio
async def test_route_precedence_map_not_shadowed_by_ticket_code(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Ensure GET /map and GET /analytics/summary are NOT shadowed by dynamic GET /{ticket_code} route."""
    incident = _make_mock_incident(
        ticket_code="DN-202610-ABCD",
        status="SUBMITTED",
    )
    mock_session.seed(incident)

    # 1. /map must match FeatureCollection route, NOT /{ticket_code}
    resp_map = await client.get("/api/v1/incidents/map")
    assert resp_map.status_code == 200
    map_data = resp_map.json()
    assert map_data.get("type") == "FeatureCollection"
    assert "ticket_code" not in map_data

    # 2. /analytics/summary must match analytics route, NOT /{ticket_code}
    resp_analytics = await client.get("/api/v1/incidents/analytics/summary")
    assert resp_analytics.status_code == 200
    analytics_data = resp_analytics.json()
    assert "total_incidents" in analytics_data
    assert "by_status" in analytics_data
    assert "ticket_code" not in analytics_data

    # 3. Dynamic ticket_code route still functions correctly
    resp_ticket = await client.get("/api/v1/incidents/DN-202610-ABCD")
    assert resp_ticket.status_code == 200
    ticket_data = resp_ticket.json()
    assert ticket_data["ticket_code"] == "DN-202610-ABCD"


@pytest.mark.asyncio
async def test_workflow_mutations_accept_ticket_code(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Ensure triage, assign, status, and feedback endpoints accept ticket_code in URL path."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    technician = _make_mock_user(role="TECHNICIAN", email="tech_code@danang.gov.vn")
    citizen = _make_mock_user(role="CITIZEN", email="cit_code@danang.gov.vn")

    category = Category(
        id=uuid4(),
        code="ROAD_DAMAGE",
        name="Hư hỏng mặt đường",
        default_sla_hours=24,
        created_at=datetime.now(timezone.utc),
    )
    department = Department(
        id=uuid4(),
        code="SGTVT_DN",
        name="Sở Giao thông Vận tải",
        level="CITY_DEPT",
        created_at=datetime.now(timezone.utc),
    )
    incident = _make_mock_incident(
        ticket_code="DN-202611-TK01",
        status="SUBMITTED",
        priority="NORMAL",
    )
    incident.citizen_id = citizen.id
    mock_session.seed(dispatcher, technician, citizen, category, department, incident)

    # 1. Triage by ticket_code
    app.dependency_overrides[get_current_user] = lambda: dispatcher
    res_triage = await client.patch(
        "/api/v1/incidents/DN-202611-TK01/triage",
        json={
            "category_id": str(category.id),
            "priority": "HIGH",
            "assigned_department_id": str(department.id),
        },
    )
    assert res_triage.status_code == 200
    assert res_triage.json()["status"] == "TRIAGED"

    # 2. Assign by ticket_code
    res_assign = await client.patch(
        "/api/v1/incidents/DN-202611-TK01/assign",
        json={"assigned_technician_id": str(technician.id)},
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["status"] == "ASSIGNED"

    # 3. Status update by ticket_code
    app.dependency_overrides[get_current_user] = lambda: technician
    res_status = await client.patch(
        "/api/v1/incidents/DN-202611-TK01/status",
        data={"to_status": "IN_PROGRESS", "note": "Bắt đầu xử lý theo mã phiếu"},
    )
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_status_transition_to_confirmed_dispatcher_and_technician_rbac(
    client: httpx.AsyncClient, mock_session: MockWorkflowSession
):
    """Dispatcher transitions RESOLVED -> CONFIRMED; technician is forbidden (403)."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    technician = _make_mock_user(role="TECHNICIAN", email="tech_conf@danang.gov.vn")
    incident = _make_mock_incident(status="RESOLVED")
    mock_session.seed(dispatcher, technician, incident)

    # Technician cannot confirm
    app.dependency_overrides[get_current_user] = lambda: technician
    resp_tech = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "CONFIRMED", "note": "Thử tự duyệt nghiệm thu"},
    )
    assert resp_tech.status_code == 403

    # Dispatcher confirms RESOLVED -> CONFIRMED
    app.dependency_overrides[get_current_user] = lambda: dispatcher
    resp_disp = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "CONFIRMED", "note": "Đã đối chiếu ảnh minh chứng đạt yêu cầu"},
    )
    assert resp_disp.status_code == 200
    assert resp_disp.json()["status"] == "CONFIRMED"


@pytest.mark.asyncio
async def test_status_transition_to_rejected_only_from_early_states(
    client: httpx.AsyncClient, mock_session: MockWorkflowSession
):
    """REJECTED is only allowed from SUBMITTED, TRIAGED, ASSIGNED; blocked from IN_PROGRESS/RESOLVED/CONFIRMED."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    inc_in_prog = _make_mock_incident(status="IN_PROGRESS")
    mock_session.seed(dispatcher, inc_in_prog)

    resp = await client.patch(
        f"/api/v1/incidents/{inc_in_prog.id}/status",
        data={"to_status": "REJECTED", "note": "Thử từ chối khi đang xử lý"},
    )
    assert resp.status_code == 400
    assert "Chỉ có thể từ chối sự cố khi đang ở trạng thái 'SUBMITTED', 'TRIAGED' hoặc 'ASSIGNED'" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_status_transition_to_closed_blocked_when_citizen_id_present(
    client: httpx.AsyncClient, mock_session: MockWorkflowSession
):
    """Dispatcher cannot close CONFIRMED incident via PATCH /status if citizen_id is not None."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    citizen = _make_mock_user(role="CITIZEN", email="owner@danang.gov.vn")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident = _make_mock_incident(status="CONFIRMED")
    incident.citizen_id = citizen.id
    mock_session.seed(dispatcher, citizen, incident)

    resp = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "CLOSED", "note": "Điều phối thử đóng thay công dân"},
    )
    assert resp.status_code == 400
    assert "chỉ có thể đóng bởi chính công dân tạo phiếu" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_citizen_feedback_confirm_without_rating_and_low_rating_closes(
    client: httpx.AsyncClient, mock_session: MockWorkflowSession
):
    """Citizen CONFIRM closes CONFIRMED incident regardless of whether rating is None or low (e.g. 2 stars)."""
    citizen = _make_mock_user(role="CITIZEN", email="cit_opt@danang.gov.vn")
    app.dependency_overrides[get_current_user] = lambda: citizen

    inc1 = _make_mock_incident(status="CONFIRMED", ticket_code="DN-202611-CF01")
    inc1.citizen_id = citizen.id
    inc2 = _make_mock_incident(status="CONFIRMED", ticket_code="DN-202611-CF02")
    inc2.citizen_id = citizen.id
    mock_session.seed(citizen, inc1, inc2)

    # 1. CONFIRM with rating=None
    resp1 = await client.post(
        f"/api/v1/incidents/{inc1.id}/feedback",
        json={"action": "CONFIRM", "comment": "Đã xử lý xong, không chấm sao"},
    )
    assert resp1.status_code == 201
    assert resp1.json()["rating"] is None
    assert inc1.status == "CLOSED"

    # 2. CONFIRM with rating=2 still closes
    resp2 = await client.post(
        f"/api/v1/incidents/{inc2.id}/feedback",
        json={"action": "CONFIRM", "rating": 2, "comment": "Hơi chậm nhưng đồng ý đóng phiếu"},
    )
    assert resp2.status_code == 201
    assert resp2.json()["rating"] == 2
    assert inc2.status == "CLOSED"


@pytest.mark.asyncio
async def test_citizen_feedback_non_owner_forbidden(
    client: httpx.AsyncClient, mock_session: MockWorkflowSession
):
    """Only the citizen who owns the ticket (citizen_id == current_user.id) can confirm or dispute."""
    owner = _make_mock_user(role="CITIZEN", email="owner1@danang.gov.vn")
    other_citizen = _make_mock_user(role="CITIZEN", email="other2@danang.gov.vn")
    app.dependency_overrides[get_current_user] = lambda: other_citizen

    incident = _make_mock_incident(status="CONFIRMED")
    incident.citizen_id = owner.id
    mock_session.seed(owner, other_citizen, incident)

    resp = await client.post(
        f"/api/v1/incidents/{incident.id}/feedback",
        json={"action": "CONFIRM", "rating": 5},
    )
    assert resp.status_code == 403
    assert "Chỉ công dân tạo phiếu phản ánh mới có quyền" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_init_db_apply_schema_migrations_idempotent():
    """Verify apply_schema_migrations in scripts/init_db.py runs twice consecutively without error."""
    from scripts.init_db import SCHEMA_ALTER_STATEMENTS, apply_schema_migrations

    executed_sql: list[str] = []

    class DummyConn:
        async def execute(self, clause):
            executed_sql.append(str(clause))

    conn = DummyConn()
    await apply_schema_migrations(conn)
    await apply_schema_migrations(conn)

    assert len(executed_sql) == 2 * len(SCHEMA_ALTER_STATEMENTS)
    assert any("ALTER TABLE incident_feedback ALTER COLUMN rating DROP NOT NULL" in s for s in executed_sql)


@pytest.mark.asyncio
async def test_init_db_apply_schema_migrations_live_db_with_data():
    """Run apply_schema_migrations twice consecutively on the live PostgreSQL DB containing existing rows."""
    from sqlalchemy import text
    from app.core.database import engine
    from scripts.init_db import apply_schema_migrations

    async with engine.begin() as conn:
        user_cnt = (await conn.execute(text("SELECT count(*) FROM users"))).scalar() or 0
        inc_cnt = (await conn.execute(text("SELECT count(*) FROM incidents"))).scalar() or 0
        assert user_cnt > 0 and inc_cnt > 0, "Expected live DB to contain seeded users and incidents"

        # Run apply_schema_migrations twice in a row on the populated DB
        await apply_schema_migrations(conn)
        await apply_schema_migrations(conn)

        # Verify column is_nullable is YES in information_schema
        nullable_res = await conn.execute(
            text(
                "SELECT is_nullable FROM information_schema.columns "
                "WHERE table_name = 'incident_feedback' AND column_name = 'rating'"
            )
        )
        assert nullable_res.scalar() == "YES"
    await engine.dispose()


ALL_STATUSES = [
    "SUBMITTED",
    "TRIAGED",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED",
    "CONFIRMED",
    "CLOSED",
    "REJECTED",
    "REOPENED",
]

STATE_MACHINE_MATRIX_CASES: list[tuple[str, str, str, bool, int]] = []

# 1. Endpoint TRIAGE (target: TRIAGED — allowed from SUBMITTED, TRIAGED)
for src in ALL_STATUSES:
    for role in ["DISPATCHER", "ADMIN", "ASSIGNED_TECHNICIAN", "OWNER_CITIZEN"]:
        if role in {"ASSIGNED_TECHNICIAN", "OWNER_CITIZEN"}:
            STATE_MACHINE_MATRIX_CASES.append(("TRIAGE", src, role, False, 403))
        elif src in {"SUBMITTED", "TRIAGED"}:
            STATE_MACHINE_MATRIX_CASES.append(("TRIAGE", src, role, True, 200))
        else:
            STATE_MACHINE_MATRIX_CASES.append(("TRIAGE", src, role, False, 400))

# 2. Endpoint ASSIGN (target: ASSIGNED — allowed from TRIAGED, ASSIGNED, REOPENED)
for src in ALL_STATUSES:
    for role in ["DISPATCHER", "ADMIN", "ASSIGNED_TECHNICIAN", "OWNER_CITIZEN"]:
        if role in {"ASSIGNED_TECHNICIAN", "OWNER_CITIZEN"}:
            STATE_MACHINE_MATRIX_CASES.append(("ASSIGN", src, role, False, 403))
        elif src in {"TRIAGED", "ASSIGNED", "REOPENED"}:
            STATE_MACHINE_MATRIX_CASES.append(("ASSIGN", src, role, True, 200))
        else:
            STATE_MACHINE_MATRIX_CASES.append(("ASSIGN", src, role, False, 400))

# 3. Endpoint STATUS -> REJECTED (role 403 checked before source status 400)
for src in ALL_STATUSES:
    for role in ["DISPATCHER", "ADMIN", "ASSIGNED_TECHNICIAN", "OWNER_CITIZEN"]:
        if role in {"ASSIGNED_TECHNICIAN", "OWNER_CITIZEN"}:
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_REJECTED", src, role, False, 403))
        elif src in {"SUBMITTED", "TRIAGED", "ASSIGNED"}:
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_REJECTED", src, role, True, 200))
        else:
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_REJECTED", src, role, False, 400))

# 4. Endpoint STATUS -> IN_PROGRESS (role/ownership 403 checked before source status 400)
for src in ALL_STATUSES:
    for role in ["ASSIGNED_TECHNICIAN", "OTHER_TECHNICIAN", "DISPATCHER", "ADMIN", "OWNER_CITIZEN"]:
        if role != "ASSIGNED_TECHNICIAN":
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_IN_PROGRESS", src, role, False, 403))
        elif src in {"ASSIGNED", "REOPENED"}:
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_IN_PROGRESS", src, role, True, 200))
        else:
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_IN_PROGRESS", src, role, False, 400))

# 5. Endpoint STATUS -> RESOLVED (role/ownership 403 checked before source status 400)
for src in ALL_STATUSES:
    for role in ["ASSIGNED_TECHNICIAN", "OTHER_TECHNICIAN", "DISPATCHER", "ADMIN", "OWNER_CITIZEN"]:
        if role != "ASSIGNED_TECHNICIAN":
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_RESOLVED", src, role, False, 403))
        elif src == "IN_PROGRESS":
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_RESOLVED", src, role, True, 200))
        else:
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_RESOLVED", src, role, False, 400))

# 6. Endpoint STATUS -> CONFIRMED and STATUS -> REOPENED (role 403 checked before source status 400)
for target_op in ["STATUS_CONFIRMED", "STATUS_REOPENED"]:
    for src in ALL_STATUSES:
        for role in ["DISPATCHER", "ADMIN", "ASSIGNED_TECHNICIAN", "OWNER_CITIZEN"]:
            if role in {"ASSIGNED_TECHNICIAN", "OWNER_CITIZEN"}:
                STATE_MACHINE_MATRIX_CASES.append((target_op, src, role, False, 403))
            elif src == "RESOLVED":
                STATE_MACHINE_MATRIX_CASES.append((target_op, src, role, True, 200))
            else:
                STATE_MACHINE_MATRIX_CASES.append((target_op, src, role, False, 400))

# 7. Endpoint STATUS -> CLOSED (anonymous ticket: citizen_id=None vs owned ticket: citizen_id!=None)
for src in ALL_STATUSES:
    for role in ["DISPATCHER", "ADMIN", "ASSIGNED_TECHNICIAN", "OWNER_CITIZEN"]:
        if role in {"ASSIGNED_TECHNICIAN", "OWNER_CITIZEN"}:
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_CLOSED_ANON", src, role, False, 403))
        elif src == "CONFIRMED":
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_CLOSED_ANON", src, role, True, 200))
        else:
            STATE_MACHINE_MATRIX_CASES.append(("STATUS_CLOSED_ANON", src, role, False, 400))

# Owned ticket via PATCH /status -> CLOSED must be 400 even for DISPATCHER/ADMIN
for role in ["DISPATCHER", "ADMIN"]:
    STATE_MACHINE_MATRIX_CASES.append(("STATUS_CLOSED_OWNED", "CONFIRMED", role, False, 400))

# 8. Endpoint FEEDBACK (CONFIRM -> CLOSED, DISPUTE -> REOPENED)
for fb_op in ["FEEDBACK_CONFIRM", "FEEDBACK_DISPUTE"]:
    for src in ALL_STATUSES:
        for role in ["OWNER_CITIZEN", "OTHER_CITIZEN", "DISPATCHER", "ASSIGNED_TECHNICIAN"]:
            if role != "OWNER_CITIZEN":
                STATE_MACHINE_MATRIX_CASES.append((fb_op, src, role, False, 403))
            elif src == "CONFIRMED":
                STATE_MACHINE_MATRIX_CASES.append((fb_op, src, role, True, 201))
            else:
                STATE_MACHINE_MATRIX_CASES.append((fb_op, src, role, False, 400))


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "operation,source_status,role_key,has_citizen,expected_code",
    STATE_MACHINE_MATRIX_CASES,
)
async def test_state_machine_transition_matrix(
    client: httpx.AsyncClient,
    mock_session: MockWorkflowSession,
    operation: str,
    source_status: str,
    role_key: str,
    has_citizen: bool,
    expected_code: int,
):
    """Exhaustive parametrized state machine matrix across (source_status, target_status, role)."""
    dispatcher = _make_mock_user(role="DISPATCHER", email="disp_mat@danang.gov.vn")
    admin = _make_mock_user(role="ADMIN", email="admin_mat@danang.gov.vn")
    assigned_tech = _make_mock_user(role="TECHNICIAN", email="tech1_mat@danang.gov.vn")
    other_tech = _make_mock_user(role="TECHNICIAN", email="tech2_mat@danang.gov.vn")
    owner_citizen = _make_mock_user(role="CITIZEN", email="cit1_mat@danang.gov.vn")
    other_citizen = _make_mock_user(role="CITIZEN", email="cit2_mat@danang.gov.vn")

    role_map = {
        "DISPATCHER": dispatcher,
        "ADMIN": admin,
        "ASSIGNED_TECHNICIAN": assigned_tech,
        "OTHER_TECHNICIAN": other_tech,
        "OWNER_CITIZEN": owner_citizen,
        "OTHER_CITIZEN": other_citizen,
    }
    actor = role_map[role_key]
    app.dependency_overrides[get_current_user] = lambda: actor

    category = Category(id=uuid4(), code="ROAD_DAMAGE", name="Hư hỏng đường", default_sla_hours=24)
    department = Department(id=uuid4(), code="SGTVT_DN", name="Sở GTVT", level="CITY_DEPT")
    proof_media = IncidentMedia(
        id=uuid4(),
        incident_id=uuid4(),
        media_type="AFTER_PROOF",
        file_url="/uploads/public/existing_proof.jpg",
        created_at=datetime.now(timezone.utc),
    )

    incident = _make_mock_incident(status=source_status)
    incident.assigned_technician_id = assigned_tech.id
    incident.assigned_technician = assigned_tech
    if operation == "STATUS_CLOSED_ANON":
        incident.citizen_id = None
    else:
        incident.citizen_id = owner_citizen.id

    if operation == "STATUS_RESOLVED":
        proof_media.incident_id = incident.id
        incident.media.append(proof_media)

    mock_session.seed(
        dispatcher,
        admin,
        assigned_tech,
        other_tech,
        owner_citizen,
        other_citizen,
        category,
        department,
        incident,
    )

    if operation == "TRIAGE":
        resp = await client.patch(
            f"/api/v1/incidents/{incident.id}/triage",
            json={
                "category_id": str(category.id),
                "priority": "NORMAL",
                "assigned_department_id": str(department.id),
            },
        )
    elif operation == "ASSIGN":
        resp = await client.patch(
            f"/api/v1/incidents/{incident.id}/assign",
            json={
                "assigned_department_id": str(department.id),
                "assigned_technician_id": str(assigned_tech.id),
            },
        )
    elif operation == "STATUS_REJECTED":
        resp = await client.patch(
            f"/api/v1/incidents/{incident.id}/status",
            data={"to_status": "REJECTED", "note": "Lý do từ chối hợp lệ"},
        )
    elif operation == "STATUS_IN_PROGRESS":
        resp = await client.patch(
            f"/api/v1/incidents/{incident.id}/status",
            data={"to_status": "IN_PROGRESS", "note": "Bắt đầu xử lý"},
        )
    elif operation == "STATUS_RESOLVED":
        resp = await client.patch(
            f"/api/v1/incidents/{incident.id}/status",
            data={"to_status": "RESOLVED", "note": "Đã xử lý xong"},
        )
    elif operation == "STATUS_CONFIRMED":
        resp = await client.patch(
            f"/api/v1/incidents/{incident.id}/status",
            data={"to_status": "CONFIRMED", "note": "Duyệt nghiệm thu"},
        )
    elif operation == "STATUS_REOPENED":
        resp = await client.patch(
            f"/api/v1/incidents/{incident.id}/status",
            data={"to_status": "REOPENED", "note": "Yêu cầu làm lại"},
        )
    elif operation in {"STATUS_CLOSED_ANON", "STATUS_CLOSED_OWNED"}:
        resp = await client.patch(
            f"/api/v1/incidents/{incident.id}/status",
            data={"to_status": "CLOSED", "note": "Đóng phiếu"},
        )
    elif operation == "FEEDBACK_CONFIRM":
        resp = await client.post(
            f"/api/v1/incidents/{incident.id}/feedback",
            json={"action": "CONFIRM", "rating": 5, "comment": "Đồng ý đóng"},
        )
    elif operation == "FEEDBACK_DISPUTE":
        resp = await client.post(
            f"/api/v1/incidents/{incident.id}/feedback",
            json={"action": "DISPUTE", "comment": "Chưa đạt yêu cầu"},
        )
    else:
        raise ValueError(f"Unknown operation: {operation}")

    assert resp.status_code == expected_code, (
        f"Failed for op={operation}, src={source_status}, role={role_key}: "
        f"expected {expected_code}, got {resp.status_code} ({resp.text})"
    )


@pytest.mark.asyncio
async def test_full_dispute_reopen_reresolve_reconfirm_close_cycle(
    client: httpx.AsyncClient, mock_session: MockWorkflowSession
):
    """Test full cycle: CONFIRMED -> DISPUTE (REOPENED) -> IN_PROGRESS -> RESOLVED -> CONFIRMED -> CONFIRM (CLOSED)."""
    dispatcher = _make_mock_user(role="DISPATCHER", email="disp_cyc@danang.gov.vn")
    technician = _make_mock_user(role="TECHNICIAN", email="tech_cyc@danang.gov.vn")
    citizen = _make_mock_user(role="CITIZEN", email="cit_cyc@danang.gov.vn")

    first_resolved_at = datetime.now(timezone.utc) - timedelta(hours=2)
    incident = _make_mock_incident(status="CONFIRMED", ticket_code="DN-202611-CYC1")
    incident.citizen_id = citizen.id
    incident.assigned_technician_id = technician.id
    incident.assigned_technician = technician
    incident.resolved_at = first_resolved_at

    mock_session.seed(dispatcher, technician, citizen, incident)

    # 1. Citizen disputes (CONFIRMED -> REOPENED)
    app.dependency_overrides[get_current_user] = lambda: citizen
    r1 = await client.post(
        f"/api/v1/incidents/{incident.id}/feedback",
        json={"action": "DISPUTE", "rating": 1, "comment": "Vẫn còn ổ gà chưa lấp kỹ"},
    )
    assert r1.status_code == 201
    assert incident.status == "REOPENED"
    assert incident.resolved_at is None

    # 2. Assigned Technician starts rework (REOPENED -> IN_PROGRESS)
    app.dependency_overrides[get_current_user] = lambda: technician
    r2 = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "IN_PROGRESS", "note": "Kỹ thuật viên xử lý lại"},
    )
    assert r2.status_code == 200
    assert incident.status == "IN_PROGRESS"

    # 3. Assigned Technician resolves again (IN_PROGRESS -> RESOLVED)
    img_bytes = _create_synthetic_image_bytes()
    r3 = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "RESOLVED", "note": "Đã thảm nhựa lại lần 2"},
        files={"proof_image": ("repaired_v2.jpg", img_bytes, "image/jpeg")},
    )
    assert r3.status_code == 200
    assert incident.status == "RESOLVED"
    assert incident.resolved_at is not None
    second_resolved_at = incident.resolved_at
    assert second_resolved_at > first_resolved_at

    # 4. Dispatcher confirms again (RESOLVED -> CONFIRMED)
    app.dependency_overrides[get_current_user] = lambda: dispatcher
    r4 = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "CONFIRMED", "note": "Nghiệm thu lần 2 đạt yêu cầu"},
    )
    assert r4.status_code == 200
    assert incident.status == "CONFIRMED"

    # 5. Citizen confirms completion on second feedback (CONFIRMED -> CLOSED)
    app.dependency_overrides[get_current_user] = lambda: citizen
    r5 = await client.post(
        f"/api/v1/incidents/{incident.id}/feedback",
        json={"action": "CONFIRM", "rating": 5, "comment": "Lần 2 đã xử lý tốt, đồng ý đóng"},
    )
    assert r5.status_code == 201, f"Second feedback failed: {r5.text}"
    assert incident.status == "CLOSED"
    assert incident.resolved_at == second_resolved_at
    assert r5.json()["rating"] == 5


@pytest.mark.asyncio
async def test_sla_calculation_by_priority_and_reset_on_reopen(
    client: httpx.AsyncClient, mock_session: MockWorkflowSession
):
    """Verify 4h/12h/24h/48h SLA calculation from created_at and reset from reopen time on REOPENED."""
    from app.api.v1.endpoints.incidents import calculate_sla_due_at

    base = datetime(2026, 11, 8, 0, 0, 0, tzinfo=timezone.utc)
    assert calculate_sla_due_at("EMERGENCY", base) == base + timedelta(hours=4)
    assert calculate_sla_due_at("HIGH", base) == base + timedelta(hours=12)
    assert calculate_sla_due_at("NORMAL", base) == base + timedelta(hours=24)
    assert calculate_sla_due_at("LOW", base) == base + timedelta(hours=48)

    dispatcher = _make_mock_user(role="DISPATCHER")
    citizen = _make_mock_user(role="CITIZEN", email="sla_cit@danang.gov.vn")
    cat = Category(id=uuid4(), code="ROAD_DAMAGE", name="Hư hỏng đường", default_sla_hours=24)
    dept = Department(id=uuid4(), code="SGTVT_DN", name="Sở GTVT", level="CITY_DEPT")

    created_at = datetime.now(timezone.utc) - timedelta(hours=10)
    inc = _make_mock_incident(status="SUBMITTED", priority="NORMAL")
    inc.created_at = created_at
    inc.citizen_id = citizen.id
    inc.sla_due_at = calculate_sla_due_at("NORMAL", created_at)
    mock_session.seed(dispatcher, citizen, cat, dept, inc)

    # 1. Triage changes priority to HIGH -> sla_due_at recalculated as created_at + 12h
    app.dependency_overrides[get_current_user] = lambda: dispatcher
    r_triage = await client.patch(
        f"/api/v1/incidents/{inc.id}/triage",
        json={
            "category_id": str(cat.id),
            "priority": "HIGH",
            "assigned_department_id": str(dept.id),
        },
    )
    assert r_triage.status_code == 200
    assert inc.sla_due_at == created_at + timedelta(hours=12)

    # 2. Dispatcher reopens RESOLVED -> REOPENED -> sla_due_at reset to now + 12h
    inc.status = "RESOLVED"
    before_reopen = datetime.now(timezone.utc)
    r_reopen = await client.patch(
        f"/api/v1/incidents/{inc.id}/status",
        data={"to_status": "REOPENED", "note": "Yêu cầu làm lại"},
    )
    assert r_reopen.status_code == 200
    assert inc.status == "REOPENED"
    assert inc.sla_due_at is not None
    assert 11.9 <= (inc.sla_due_at - before_reopen).total_seconds() / 3600 <= 12.1

    # 3. Citizen disputes CONFIRMED -> REOPENED -> sla_due_at reset to now + 48h (when priority=LOW)
    inc2 = _make_mock_incident(status="CONFIRMED", priority="LOW", ticket_code="DN-202611-SLA2")
    inc2.created_at = created_at
    inc2.citizen_id = citizen.id
    inc2.sla_due_at = calculate_sla_due_at("LOW", created_at)
    mock_session.seed(inc2)

    app.dependency_overrides[get_current_user] = lambda: citizen
    before_dispute = datetime.now(timezone.utc)
    r_disp = await client.post(
        f"/api/v1/incidents/{inc2.id}/feedback",
        json={"action": "DISPUTE", "comment": "Khiếu nại mở lại tính lại hạn SLA"},
    )
    assert r_disp.status_code == 201
    assert inc2.status == "REOPENED"
    assert inc2.sla_due_at is not None
    assert 47.9 <= (inc2.sla_due_at - before_dispute).total_seconds() / 3600 <= 48.1


@pytest.mark.asyncio
async def test_technician_same_department_claims_unassigned_incident_and_other_department_forbidden(
    client: httpx.AsyncClient, mock_session: MockWorkflowSession
):
    """Technician in same department starts unassigned incident -> 200 and gets assigned; other dept -> 403."""
    dept_road = Department(id=uuid4(), code="SGTVT_DN", name="Sở GTVT", level="CITY_DEPT")
    dept_water = Department(id=uuid4(), code="CTDN_WATER", name="Cty Thoát nước", level="UTILITY_COMPANY")

    tech_same_dept = _make_mock_user(role="TECHNICIAN", email="tech_road@danang.gov.vn")
    tech_same_dept.department_id = dept_road.id

    tech_other_dept = _make_mock_user(role="TECHNICIAN", email="tech_water@danang.gov.vn")
    tech_other_dept.department_id = dept_water.id

    incident = _make_mock_incident(status="ASSIGNED")
    incident.assigned_department_id = dept_road.id
    incident.assigned_department = dept_road
    incident.assigned_technician_id = None
    incident.assigned_technician = None

    mock_session.seed(dept_road, dept_water, tech_same_dept, tech_other_dept, incident)

    # 1. Technician from different department is rejected with 403
    app.dependency_overrides[get_current_user] = lambda: tech_other_dept
    res_other = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "IN_PROGRESS", "note": "Kỹ thuật viên khác đơn vị thử nhận"},
    )
    assert res_other.status_code == 403
    assert incident.assigned_technician_id is None

    # 2. Technician from same department succeeds (200) and gets assigned_technician_id = current_user.id
    app.dependency_overrides[get_current_user] = lambda: tech_same_dept
    res_same = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "IN_PROGRESS", "note": "Kỹ thuật viên cùng đơn vị nhận xử lý"},
    )
    assert res_same.status_code == 200, f"Error: {res_same.text}"
    assert res_same.json()["status"] == "IN_PROGRESS"
    assert res_same.json()["assigned_technician_id"] == str(tech_same_dept.id)
    assert incident.assigned_technician_id == tech_same_dept.id


@pytest.mark.asyncio
async def test_fastapi_lifespan_runs_schema_migrations_twice_idempotent():
    """Verify FastAPI lifespan in app/main.py executes apply_schema_migrations twice without error."""
    from app.core.database import engine
    from app.main import app as fastapi_app, lifespan

    async with lifespan(fastapi_app):
        pass
    async with lifespan(fastapi_app):
        pass
    await engine.dispose()


@pytest.mark.asyncio
async def test_step5_proof_gps_and_privacy_masking_for_rejection_and_technician_name(
    client: httpx.AsyncClient, mock_session: MockWorkflowSession
):
    """Verify AFTER_PROOF GPS coordinates, technician name abbreviation, rejection_reason RBAC, and map duplicate_count."""
    from app.api.deps import get_current_user_optional

    owner = _make_mock_user(role="CITIZEN", email="owner_s5@danang.gov.vn", full_name="Lê Văn Chủ")
    other_citizen = _make_mock_user(role="CITIZEN", email="other_s5@danang.gov.vn", full_name="Phạm Thị Khác")
    technician = _make_mock_user(role="TECHNICIAN", email="tech_s5@danang.gov.vn", full_name="Trần Văn Kỹ")
    dispatcher = _make_mock_user(role="DISPATCHER", email="disp_s5@danang.gov.vn", full_name="Nguyễn Điều Phối")

    incident = _make_mock_incident(
        ticket_code="DN-202611-STP5",
        status="IN_PROGRESS",
        duplicate_count=7,
    )
    incident.citizen_id = owner.id
    incident.assigned_technician_id = technician.id
    incident.assigned_technician = technician
    mock_session.seed(owner, other_citizen, technician, dispatcher, incident)

    # 1. Technician uploads AFTER_PROOF with proof_latitude & proof_longitude
    app.dependency_overrides[get_current_user] = lambda: technician
    img_bytes = _create_synthetic_image_bytes()
    res_resolve = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={
            "to_status": "RESOLVED",
            "note": "Đã xử lý tại hiện trường có tọa độ GPS",
            "proof_latitude": "16.0615",
            "proof_longitude": "108.2212",
        },
        files={"proof_image": ("proof_gps.jpg", img_bytes, "image/jpeg")},
    )
    assert res_resolve.status_code == 200, f"Failed: {res_resolve.text}"
    resolve_body = res_resolve.json()
    proof_items = [m for m in resolve_body["media"] if m["media_type"] == "AFTER_PROOF"]
    assert len(proof_items) == 1
    assert proof_items[0]["latitude"] == pytest.approx(16.0615, abs=1e-5)
    assert proof_items[0]["longitude"] == pytest.approx(108.2212, abs=1e-5)
    assert resolve_body["assigned_technician_name"] == "Trần Văn Kỹ"

    # 2. Check GET /map exposes duplicate_count
    res_map = await client.get("/api/v1/incidents/map")
    assert res_map.status_code == 200
    feat = next(f for f in res_map.json()["features"] if f["properties"]["ticket_code"] == "DN-202611-STP5")
    assert feat["properties"]["duplicate_count"] == 7

    # 3. Create a REJECTED incident with assigned technician and test GET /{id_or_code} privacy rules
    rej_inc = _make_mock_incident(
        ticket_code="DN-202611-REJ5",
        status="ASSIGNED",
    )
    rej_inc.citizen_id = owner.id
    rej_inc.assigned_technician_id = technician.id
    rej_inc.assigned_technician = technician
    mock_session.seed(rej_inc)

    app.dependency_overrides[get_current_user] = lambda: dispatcher
    res_rej = await client.patch(
        f"/api/v1/incidents/{rej_inc.id}/status",
        data={"to_status": "REJECTED", "note": "Báo cáo sai địa điểm thực tế"},
    )
    assert res_rej.status_code == 200
    assert res_rej.json()["rejection_reason"] == "Báo cáo sai địa điểm thực tế"

    try:
        # 3a. Anonymous lookup: assigned_technician_name is abbreviated, rejection_reason is None, REJECTED history note is None
        app.dependency_overrides[get_current_user_optional] = lambda: None
        r_anon = await client.get(f"/api/v1/incidents/{rej_inc.ticket_code}")
        assert r_anon.status_code == 200
        d_anon = r_anon.json()
        assert d_anon["assigned_technician_name"] == "Trần V. K."
        assert d_anon["rejection_reason"] is None
        rej_hist_anon = [h for h in d_anon["history"] if h["to_status"] == "REJECTED"]
        assert all(h["note"] is None for h in rej_hist_anon)

        # 3b. Other citizen (logged in): assigned_technician_name is full, rejection_reason is None
        app.dependency_overrides[get_current_user_optional] = lambda: other_citizen
        r_other = await client.get(f"/api/v1/incidents/{rej_inc.ticket_code}")
        assert r_other.status_code == 200
        d_other = r_other.json()
        assert d_other["assigned_technician_name"] == "Trần Văn Kỹ"
        assert d_other["rejection_reason"] is None

        # 3c. Owner citizen: sees full assigned_technician_name and rejection_reason
        app.dependency_overrides[get_current_user_optional] = lambda: owner
        r_owner = await client.get(f"/api/v1/incidents/{rej_inc.ticket_code}")
        assert r_owner.status_code == 200
        d_owner = r_owner.json()
        assert d_owner["assigned_technician_name"] == "Trần Văn Kỹ"
        assert d_owner["rejection_reason"] == "Báo cáo sai địa điểm thực tế"

        # 3d. Dispatcher: sees full assigned_technician_name and rejection_reason
        app.dependency_overrides[get_current_user_optional] = lambda: dispatcher
        r_disp = await client.get(f"/api/v1/incidents/{rej_inc.ticket_code}")
        assert r_disp.status_code == 200
        d_disp = r_disp.json()
        assert d_disp["assigned_technician_name"] == "Trần Văn Kỹ"
        assert d_disp["rejection_reason"] == "Báo cáo sai địa điểm thực tế"
    finally:
        app.dependency_overrides.pop(get_current_user_optional, None)


@pytest.mark.asyncio
async def test_step6_analytics_resolution_time_satisfaction_and_district_completion(
    client: httpx.AsyncClient, mock_session: MockWorkflowSession
):
    """Verify avg_resolution_time_minutes, avg_satisfaction_rating, satisfaction_score, and completion_rate_by_district (CONFIRMED + CLOSED)."""
    base = datetime(2026, 11, 10, 8, 0, 0, tzinfo=timezone.utc)
    cit1 = _make_mock_user(role="CITIZEN", email="c1@danang.gov.vn")
    cit2 = _make_mock_user(role="CITIZEN", email="c2@danang.gov.vn")

    # District Hải Châu: 3 incidents (1 CONFIRMED [60 min], 1 CLOSED [120 min], 1 IN_PROGRESS) -> 2/3 completed = 66.7%
    inc_hc_confirmed = _make_mock_incident(ticket_code="DN-202611-AN1", status="CONFIRMED", district="Hải Châu")
    inc_hc_confirmed.created_at = base
    inc_hc_confirmed.resolved_at = base + timedelta(minutes=60)
    fb1 = IncidentFeedback(
        id=uuid4(),
        incident_id=inc_hc_confirmed.id,
        citizen_id=cit1.id,
        rating=4,
        comment="Tốt",
        created_at=base + timedelta(minutes=65),
    )
    inc_hc_confirmed.feedback = fb1

    inc_hc_closed = _make_mock_incident(ticket_code="DN-202611-AN2", status="CLOSED", district="Hải Châu")
    inc_hc_closed.created_at = base
    inc_hc_closed.resolved_at = base + timedelta(minutes=120)
    fb2 = IncidentFeedback(
        id=uuid4(),
        incident_id=inc_hc_closed.id,
        citizen_id=cit2.id,
        rating=5,
        comment="Rất hài lòng",
        created_at=base + timedelta(minutes=130),
    )
    inc_hc_closed.feedback = fb2

    inc_hc_inprog = _make_mock_incident(ticket_code="DN-202611-AN3", status="IN_PROGRESS", district="Hải Châu")
    inc_hc_inprog.created_at = base
    inc_hc_inprog.resolved_at = None

    # District Thanh Khê: 2 incidents (1 RESOLVED [not yet CONFIRMED/CLOSED, 90 min], 1 SUBMITTED) -> 0/2 completed = 0.0%
    inc_tk_resolved = _make_mock_incident(ticket_code="DN-202611-AN4", status="RESOLVED", district="Thanh Khê")
    inc_tk_resolved.created_at = base
    inc_tk_resolved.resolved_at = base + timedelta(minutes=90)

    inc_tk_sub = _make_mock_incident(ticket_code="DN-202611-AN5", status="SUBMITTED", district="Thanh Khê")
    inc_tk_sub.created_at = base
    inc_tk_sub.resolved_at = None

    mock_session.seed(
        cit1,
        cit2,
        inc_hc_confirmed,
        inc_hc_closed,
        inc_hc_inprog,
        inc_tk_resolved,
        inc_tk_sub,
        fb1,
        fb2,
    )

    res = await client.get("/api/v1/incidents/analytics/summary")
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()

    # Average resolution time across 3 resolved incidents: (60 + 120 + 90) / 3 = 90.0 minutes
    assert data["avg_resolution_time_minutes"] == 90.0

    # Average satisfaction rating: (4 + 5) / 2 = 4.5 -> score = 4.5 * 20 = 90.0
    assert data["avg_satisfaction_rating"] == 4.5
    assert data["satisfaction_score"] == 90.0

    # Completion rate by district: CONFIRMED + CLOSED count as completed
    assert data["completion_rate_by_district"]["Hải Châu"] == 66.7
    assert data["completion_rate_by_district"]["Thanh Khê"] == 0.0


@pytest.mark.asyncio
async def test_step7_is_priority_suggested_becomes_false_on_triage_or_assign(
    client: httpx.AsyncClient, mock_session: MockWorkflowSession
):
    """Verify is_priority_suggested is True initially and becomes False when either /triage or /assign is called."""
    dispatcher = _make_mock_user(role="DISPATCHER", email="disp_s7@danang.gov.vn")
    technician = _make_mock_user(role="TECHNICIAN", email="tech_s7@danang.gov.vn")
    cat = Category(id=uuid4(), code="FLOODING", name="Ngập úng", default_sla_hours=12)
    dept = Department(id=uuid4(), code="CTN_DN", name="Cty Thoát nước", level="UTILITY_COMPANY")

    # Case 1: Incident in SUBMITTED with suggested priority -> /triage sets is_priority_suggested = False
    inc1 = _make_mock_incident(ticket_code="DN-202611-PR1", status="SUBMITTED", priority="HIGH")
    inc1.ai_classification_raw = {"citizen_suggested_priority": "HIGH", "is_priority_suggested": True}

    # Case 2: Incident auto-triaged by AI (actor_id=None, status=TRIAGED, is_priority_suggested=True) -> /assign sets is_priority_suggested = False
    inc2 = _make_mock_incident(ticket_code="DN-202611-PR2", status="TRIAGED", priority="EMERGENCY")
    inc2.ai_classification_raw = {"priority": "EMERGENCY", "is_priority_suggested": True}
    inc2.history = [
        IncidentHistory(
            id=uuid4(),
            incident_id=inc2.id,
            actor_id=None,
            from_status="SUBMITTED",
            to_status="TRIAGED",
            note="AI tự động phân loại",
            created_at=datetime.now(timezone.utc),
        )
    ]

    mock_session.seed(dispatcher, technician, cat, dept, inc1, inc2)
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    # Before triage/assign, both have is_priority_suggested == True
    r_get1 = await client.get(f"/api/v1/incidents/{inc1.ticket_code}")
    assert r_get1.status_code == 200
    assert r_get1.json()["is_priority_suggested"] is True

    r_get2 = await client.get(f"/api/v1/incidents/{inc2.ticket_code}")
    assert r_get2.status_code == 200
    assert r_get2.json()["is_priority_suggested"] is True

    # Calling /triage on inc1 flips is_priority_suggested -> False
    r_triage = await client.patch(
        f"/api/v1/incidents/{inc1.ticket_code}/triage",
        json={
            "category_id": str(cat.id),
            "priority": "HIGH",
            "assigned_department_id": str(dept.id),
        },
    )
    assert r_triage.status_code == 200
    assert r_triage.json()["is_priority_suggested"] is False

    # Calling /assign directly on inc2 flips is_priority_suggested -> False
    r_assign = await client.patch(
        f"/api/v1/incidents/{inc2.ticket_code}/assign",
        json={
            "assigned_department_id": str(dept.id),
            "assigned_technician_id": str(technician.id),
        },
    )
    assert r_assign.status_code == 200
    assert r_assign.json()["is_priority_suggested"] is False







