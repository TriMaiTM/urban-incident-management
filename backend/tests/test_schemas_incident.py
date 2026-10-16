"""Unit tests for Incident Pydantic Schemas."""

from datetime import datetime, timezone
from uuid import uuid4
import pytest
from pydantic import ValidationError

from app.schemas.incident import (
    CategoryOut,
    DepartmentOut,
    IncidentMediaOut,
    IncidentHistoryOut,
    IncidentCreateForm,
    IncidentCreateIn,
    IncidentOut,
    IncidentDetailOut,
    IncidentNearbyItem,
    IncidentNearbyOut,
    IncidentVoteDuplicateOut,
    IncidentListOut,
    _extract_lat_lon,
)


def test_category_out():
    cat_id = uuid4()
    cat = CategoryOut(
        id=cat_id,
        code="ROAD_DAMAGE",
        name="Hư hỏng mặt đường",
        default_sla_hours=48,
    )
    assert cat.id == cat_id
    assert cat.code == "ROAD_DAMAGE"
    assert cat.default_sla_hours == 48
    assert cat.default_department_id is None


def test_department_out():
    dept_id = uuid4()
    dept = DepartmentOut(
        id=dept_id,
        code="SGTVT_DN",
        name="Sở Giao thông Vận tải Đà Nẵng",
        level="CITY_DEPT",
        contact_email="sgtvt@danang.gov.vn",
        contact_phone="02363822222",
    )
    assert dept.id == dept_id
    assert dept.code == "SGTVT_DN"
    assert dept.level == "CITY_DEPT"


def test_incident_media_out():
    media_id = uuid4()
    incident_id = uuid4()
    now = datetime.now(timezone.utc)
    media = IncidentMediaOut(
        id=media_id,
        incident_id=incident_id,
        media_type="BEFORE_ANONYMIZED",
        file_url="/uploads/public/incidents/img_anon.jpg",
        created_at=now,
    )
    assert media.id == media_id
    assert media.media_type == "BEFORE_ANONYMIZED"


def test_incident_history_out():
    hist_id = uuid4()
    incident_id = uuid4()
    actor_id = uuid4()
    now = datetime.now(timezone.utc)
    hist = IncidentHistoryOut(
        id=hist_id,
        incident_id=incident_id,
        actor_id=actor_id,
        from_status="SUBMITTED",
        to_status="TRIAGED",
        note="Auto-classified by DeepSeek Vision",
        created_at=now,
    )
    assert hist.from_status == "SUBMITTED"
    assert hist.to_status == "TRIAGED"


def test_incident_create_form_valid():
    form = IncidentCreateForm(
        title="Ổ gà lớn trên đường Duy Tân",
        description="Có ổ gà sâu khoảng 15cm nguy hiểm cho người đi xe máy.",
        latitude=16.0544,
        longitude=108.2022,
        address_text="120 Duy Tân, Hải Châu, Đà Nẵng",
        district="Hải Châu",
        ward="Hòa Thuận Đông",
        citizen_contact="0905123456",
    )
    assert form.latitude == 16.0544
    assert form.longitude == 108.2022
    assert IncidentCreateIn is IncidentCreateForm


def test_incident_create_form_invalid_coords():
    with pytest.raises(ValidationError):
        IncidentCreateForm(
            title="Ổ gà lớn",
            description="Mô tả sự cố",
            latitude=95.0,  # Invalid latitude (>90)
            longitude=108.2022,
            address_text="120 Duy Tân",
        )


def test_incident_create_form_too_short():
    with pytest.raises(ValidationError):
        IncidentCreateForm(
            title="A",  # Min length 3
            description="B",  # Min length 5
            latitude=16.0,
            longitude=108.0,
            address_text="C",
        )


def test_incident_out_from_dict():
    inc_id = uuid4()
    now = datetime.now(timezone.utc)
    data = {
        "id": inc_id,
        "ticket_code": "DN-202610-0001",
        "title": "Ngập nước đường Hùng Vương",
        "description": "Nước ngập quá mắt cá chân",
        "status": "SUBMITTED",
        "priority": "NORMAL",
        "channel": "WEB",
        "address_text": "45 Hùng Vương, Hải Châu 1, Đà Nẵng",
        "latitude": 16.0678,
        "longitude": 108.2208,
        "category_code": "FLOODING",
        "assigned_department_code": "CTN_DN",
        "duplicate_count": 0,
        "created_at": now,
    }
    out = IncidentOut.model_validate(data)
    assert out.id == inc_id
    assert out.ticket_code == "DN-202610-0001"
    assert out.category_code == "FLOODING"
    assert out.assigned_department_code == "CTN_DN"
    assert out.latitude == 16.0678
    assert out.longitude == 108.2208


def test_incident_out_from_orm_like_object():
    class DummyCategory:
        code = "ROAD_DAMAGE"

    class DummyDepartment:
        code = "SGTVT_DN"

    class DummyMedia:
        media_type = "BEFORE_ANONYMIZED"
        file_url = "/uploads/public/test.jpg"

    class DummyIncident:
        id = uuid4()
        ticket_code = "DN-202610-0002"
        title = "Hố sụt đường Nguyễn Văn Linh"
        description = "Mặt đường bị sụt lún nghiêm trọng"
        status = "TRIAGED"
        priority = "HIGH"
        channel = "WEB"
        address_text = " Nguyễn Văn Linh, Đà Nẵng"
        district = "Hải Châu"
        ward = "Nam Dương"
        duplicate_count = 1
        created_at = datetime.now(timezone.utc)
        updated_at = datetime.now(timezone.utc)
        sla_due_at = None
        resolved_at = None
        latitude = 16.0601
        longitude = 108.2162
        category = DummyCategory()
        assigned_department = DummyDepartment()
        media = [DummyMedia()]

    dummy = DummyIncident()
    out = IncidentOut.model_validate(dummy)
    assert out.ticket_code == "DN-202610-0002"
    assert out.category_code == "ROAD_DAMAGE"
    assert out.assigned_department_code == "SGTVT_DN"
    assert out.anonymized_image_url == "/uploads/public/test.jpg"
    assert out.latitude == 16.0601
    assert out.longitude == 108.2162


def test_incident_out_from_orm_with_only_location():
    """Verify ORM model having only location geometry (Point lon, lat) is correctly extracted."""
    from shapely.geometry import Point

    class DummyOrmIncident:
        id = uuid4()
        ticket_code = "DN-202610-0003"
        title = "Cây đổ chắn đường Lê Duẩn"
        description = "Cây phượng bật gốc chắn ngang đường"
        status = "SUBMITTED"
        priority = "NORMAL"
        channel = "WEB"
        address_text = "Lê Duẩn, Hải Châu, Đà Nẵng"
        district = "Hải Châu"
        ward = "Hải Châu 1"
        duplicate_count = 0
        created_at = datetime.now(timezone.utc)
        updated_at = None
        sla_due_at = None
        resolved_at = None
        # In PostGIS, Point takes (longitude, latitude)
        location = Point(108.2150, 16.0710)
        # Note: No latitude or longitude attributes on this ORM model

    orm_obj = DummyOrmIncident()
    out = IncidentOut.model_validate(orm_obj)
    assert out.ticket_code == "DN-202610-0003"
    assert out.latitude == 16.0710
    assert out.longitude == 108.2150
    assert out.anonymized_image_url is None


def test_incident_detail_out():
    inc_id = uuid4()
    cat_id = uuid4()
    dept_id = uuid4()
    now = datetime.now(timezone.utc)

    detail_data = {
        "id": inc_id,
        "ticket_code": "DN-202610-0003",
        "title": "Cây ngã đổ",
        "description": "Cây phượng bật gốc chắn lối đi",
        "status": "ASSIGNED",
        "priority": "HIGH",
        "channel": "WEB",
        "address_text": "Bạch Đằng, Đà Nẵng",
        "latitude": 16.0700,
        "longitude": 108.2250,
        "category": {
            "id": cat_id,
            "code": "FALLEN_TREE",
            "name": "Cây xanh gãy đổ",
            "default_sla_hours": 4,
        },
        "assigned_department": {
            "id": dept_id,
            "code": "CCX_DN",
            "name": "Công ty Công viên - Cây xanh",
            "level": "UTILITY_COMPANY",
        },
        "media": [
            {
                "id": uuid4(),
                "incident_id": inc_id,
                "media_type": "BEFORE_ANONYMIZED",
                "file_url": "/uploads/public/tree_anon.jpg",
                "created_at": now,
            }
        ],
        "history": [
            {
                "id": uuid4(),
                "incident_id": inc_id,
                "from_status": "SUBMITTED",
                "to_status": "TRIAGED",
                "created_at": now,
            }
        ],
        "ai_classification_raw": {"category_code": "FALLEN_TREE", "confidence": 0.95},
        "ai_confidence": 0.95,
        "created_at": now,
    }

    detail = IncidentDetailOut.model_validate(detail_data)
    assert detail.ticket_code == "DN-202610-0003"
    assert detail.category_code == "FALLEN_TREE"
    assert detail.assigned_department_code == "CCX_DN"
    assert detail.category is not None
    assert detail.category.name == "Cây xanh gãy đổ"
    assert detail.assigned_department is not None
    assert detail.assigned_department.name == "Công ty Công viên - Cây xanh"
    assert len(detail.media) == 1
    assert detail.anonymized_image_url == "/uploads/public/tree_anon.jpg"
    assert detail.ai_confidence == 0.95


def test_incident_nearby_and_vote():
    item_id = uuid4()
    now = datetime.now(timezone.utc)
    item = IncidentNearbyItem(
        id=item_id,
        ticket_code="DN-202610-0001",
        title="Ngập nước",
        status="SUBMITTED",
        priority="NORMAL",
        distance_meters=18.5,
        latitude=16.0680,
        longitude=108.2210,
        created_at=now,
        image_url="/uploads/public/flood.jpg",
    )
    nearby_out = IncidentNearbyOut(count=1, items=[item])
    assert nearby_out.count == 1
    assert nearby_out.items[0].distance_meters == 18.5

    vote_out = IncidentVoteDuplicateOut(
        incident_id=item_id,
        ticket_code="DN-202610-0001",
        duplicate_count=2,
        message="Cảm ơn bạn đã phản ánh. Sự cố trùng lặp đã được ghi nhận tăng độ ưu tiên.",
    )
    assert vote_out.duplicate_count == 2


def test_incident_list_out():
    now = datetime.now(timezone.utc)
    inc = IncidentOut(
        id=uuid4(),
        ticket_code="DN-202610-0010",
        title="Đèn đường hỏng",
        description="Đèn đường không sáng",
        status="SUBMITTED",
        priority="LOW",
        channel="WEB",
        address_text="Trần Cao Vân, Đà Nẵng",
        latitude=16.0712,
        longitude=108.1987,
        created_at=now,
    )
    list_out = IncidentListOut(total=1, items=[inc], page=1, page_size=20)
    assert list_out.total == 1
    assert len(list_out.items) == 1


def test_extract_lat_lon_helper():
    assert _extract_lat_lon(None) is None
    assert _extract_lat_lon({"coordinates": [108.2, 16.0]}) == (16.0, 108.2)
    assert _extract_lat_lon((108.2, 16.0)) == (16.0, 108.2)

    class DummyShapelyPoint:
        x = 108.22
        y = 16.07

    assert _extract_lat_lon(DummyShapelyPoint()) == (16.07, 108.22)
