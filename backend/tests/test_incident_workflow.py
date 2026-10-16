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
    """EMERGENCY priority cuts default SLA hours in half."""
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

    incident = _make_mock_incident(status="SUBMITTED")
    mock_session.seed(incident)

    payload = {
        "category_id": str(category.id),
        "priority": "EMERGENCY",
        "assigned_department_id": str(department.id),
    }

    before_patch = datetime.now(timezone.utc)
    response = await client.patch(f"/api/v1/incidents/{incident.id}/triage", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "TRIAGED"
    assert data["priority"] == "EMERGENCY"

    # Emergency reduces 8 hours to 4 hours
    sla_due = datetime.fromisoformat(data["sla_due_at"].replace("Z", "+00:00"))
    diff_hours = (sla_due - before_patch).total_seconds() / 3600
    assert 3.8 <= diff_hours <= 4.2


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
    """Dispatcher successfully closes resolved incident -> status CLOSED."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident = _make_mock_incident(status="RESOLVED")
    mock_session.seed(dispatcher, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "CLOSED", "note": "Đã hoàn tất quy trình nghiệm thu"},
    )

    assert response.status_code == 200, f"Error: {response.text}"
    assert response.json()["status"] == "CLOSED"


@pytest.mark.asyncio
async def test_status_transition_to_closed_technician_forbidden(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Field technician attempts to close incident -> 403 Forbidden."""
    technician = _make_mock_user(role="TECHNICIAN")
    app.dependency_overrides[get_current_user] = lambda: technician

    incident = _make_mock_incident(status="RESOLVED")
    mock_session.seed(technician, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "CLOSED"},
    )

    assert response.status_code == 403
    assert "Chỉ Điều phối viên (DISPATCHER) hoặc Quản trị viên (ADMIN)" in response.json()["detail"]


@pytest.mark.asyncio
async def test_status_transition_to_closed_invalid_source_status_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Closing an incident that is still IN_PROGRESS (not RESOLVED/CONFIRMED) -> 400 Bad Request."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident = _make_mock_incident(status="IN_PROGRESS")
    mock_session.seed(dispatcher, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "CLOSED"},
    )

    assert response.status_code == 400
    assert "Chỉ có thể đóng sự cố khi ở trạng thái 'RESOLVED' hoặc 'CONFIRMED'" in response.json()["detail"]


@pytest.mark.asyncio
async def test_status_transition_reopen_from_resolved_resets_resolved_at(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Reopening incident from RESOLVED back to IN_PROGRESS resets resolved_at to None."""
    dispatcher = _make_mock_user(role="DISPATCHER")
    app.dependency_overrides[get_current_user] = lambda: dispatcher

    incident = _make_mock_incident(status="RESOLVED")
    incident.resolved_at = datetime.now(timezone.utc)
    mock_session.seed(dispatcher, incident)

    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/status",
        data={"to_status": "IN_PROGRESS", "note": "Yêu cầu xử lý lại do người dân phản ánh chưa đạt"},
    )

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()
    assert data["status"] == "IN_PROGRESS"
    assert data["resolved_at"] is None
    assert incident.resolved_at is None


@pytest.mark.asyncio
async def test_status_transition_invalid_target_status_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Target status not in {'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED'} -> 422 Unprocessable Entity."""
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
        data={"to_status": "IN_PROGRESS"},
    )
    assert response.status_code == 400
    assert "Không thể cập nhật trạng thái sự cố đã kết thúc" in response.json()["detail"]

    incident_rejected = _make_mock_incident(status="REJECTED")
    mock_session.seed(incident_rejected)

    response_rej = await client.patch(
        f"/api/v1/incidents/{incident_rejected.id}/status",
        data={"to_status": "IN_PROGRESS"},
    )
    assert response_rej.status_code == 400
    assert "Không thể cập nhật trạng thái sự cố đã kết thúc" in response_rej.json()["detail"]


# ============================================================================
# Test Cases for Step 4: Citizen Feedback & Dispute Reopen
# ============================================================================

@pytest.mark.asyncio
async def test_citizen_feedback_satisfied_confirmed_success(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Citizen rates 5 stars on RESOLVED incident -> status CONFIRMED, creates feedback record and audit history."""
    citizen = _make_mock_user(role="CITIZEN", email="citizen@danang.gov.vn", full_name="Lê Văn Dân")
    app.dependency_overrides[get_current_user] = lambda: citizen

    incident = _make_mock_incident(status="RESOLVED")
    mock_session.seed(citizen, incident)

    payload = {
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

    assert incident.status == "CONFIRMED"
    assert mock_session.committed is True

    feedbacks = [o for o in mock_session.added if isinstance(o, IncidentFeedback)]
    assert len(feedbacks) >= 1
    assert feedbacks[-1].rating == 5

    histories = [o for o in mock_session.added if isinstance(o, IncidentHistory)]
    conf_hist = [h for h in histories if h.to_status == "CONFIRMED"]
    assert len(conf_hist) >= 1
    assert conf_hist[-1].from_status == "RESOLVED"
    assert conf_hist[-1].actor_id == citizen.id
    assert "Công dân hài lòng (5 sao)" in (conf_hist[-1].note or "")


@pytest.mark.asyncio
async def test_citizen_feedback_disputed_reopens_to_in_progress(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Citizen rates <= 2 stars (dispute) -> reopens to IN_PROGRESS, resets resolved_at to None."""
    citizen = _make_mock_user(role="CITIZEN", email="citizen@danang.gov.vn")
    app.dependency_overrides[get_current_user] = lambda: citizen

    incident = _make_mock_incident(status="RESOLVED")
    incident.resolved_at = datetime.now(timezone.utc)
    mock_session.seed(citizen, incident)

    payload = {
        "rating": 2,
        "comment": "Chưa hoàn trả mặt đường phẳng, vẫn còn gồ ghề nguy hiểm.",
    }

    response = await client.post(f"/api/v1/incidents/{incident.id}/feedback", json=payload)

    assert response.status_code == 201, f"Error: {response.text}"
    data = response.json()

    assert data["rating"] == 2
    assert incident.status == "IN_PROGRESS"
    assert incident.resolved_at is None
    assert mock_session.committed is True

    histories = [o for o in mock_session.added if isinstance(o, IncidentHistory)]
    reopen_hist = [h for h in histories if h.to_status == "IN_PROGRESS"]
    assert len(reopen_hist) >= 1
    assert reopen_hist[-1].from_status == "RESOLVED"
    assert reopen_hist[-1].actor_id == citizen.id
    assert "Công dân không hài lòng (2 sao)" in (reopen_hist[-1].note or "")


@pytest.mark.asyncio
async def test_citizen_feedback_on_unresolved_incident_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Submitting feedback on incident not in RESOLVED status -> 400 Bad Request."""
    citizen = _make_mock_user(role="CITIZEN")
    app.dependency_overrides[get_current_user] = lambda: citizen

    incident = _make_mock_incident(status="IN_PROGRESS")
    mock_session.seed(citizen, incident)

    payload = {"rating": 4, "comment": "Tốt"}
    response = await client.post(f"/api/v1/incidents/{incident.id}/feedback", json=payload)

    assert response.status_code == 400
    assert "Chỉ có thể đánh giá đối với sự cố đã được khắc phục" in response.json()["detail"]


@pytest.mark.asyncio
async def test_citizen_feedback_duplicate_submission_fails(client: httpx.AsyncClient, mock_session: MockWorkflowSession):
    """Submitting feedback when incident already has feedback -> 400 Bad Request."""
    citizen = _make_mock_user(role="CITIZEN")
    app.dependency_overrides[get_current_user] = lambda: citizen

    existing_feedback = IncidentFeedback(
        id=uuid4(),
        incident_id=uuid4(),
        citizen_id=citizen.id,
        rating=4,
        comment="Đã đánh giá trước đó",
        created_at=datetime.now(timezone.utc),
    )
    incident = _make_mock_incident(status="RESOLVED", feedback=existing_feedback)
    existing_feedback.incident_id = incident.id
    mock_session.seed(citizen, incident, existing_feedback)

    payload = {"rating": 5, "comment": "Thử đánh giá lần 2"}
    response = await client.post(f"/api/v1/incidents/{incident.id}/feedback", json=payload)

    assert response.status_code == 400
    assert "Sự cố này đã được gửi đánh giá phản hồi trước đó." in response.json()["detail"]


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
