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
    IncidentTriageIn,
    IncidentAssignIn,
    IncidentStatusUpdateIn,
    IncidentFeedbackCreateIn,
    IncidentFeedbackOut,
    IncidentMapProperties,
    IncidentMapGeometry,
    IncidentMapFeature,
    IncidentMapFeatureCollectionOut,
    IncidentAnalyticsSummaryOut,
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


def test_incident_triage_in():
    cat_id = uuid4()
    dept_id = uuid4()
    triage = IncidentTriageIn(
        category_id=cat_id,
        priority="HIGH",
        assigned_department_id=dept_id,
        note="Phân loại khẩn cấp do mưa bão",
    )
    assert triage.category_id == cat_id
    assert triage.priority == "HIGH"
    assert triage.assigned_department_id == dept_id
    assert triage.note == "Phân loại khẩn cấp do mưa bão"

    # Missing required category_id or priority raises ValidationError
    with pytest.raises(ValidationError):
        IncidentTriageIn(priority="HIGH", assigned_department_id=dept_id)  # type: ignore


def test_incident_assign_in():
    dept_id = uuid4()
    tech_id = uuid4()

    # Full assignment
    assign = IncidentAssignIn(
        assigned_department_id=dept_id,
        assigned_technician_id=tech_id,
        note="Giao kỹ thuật viên xử lý gấp",
    )
    assert assign.assigned_department_id == dept_id
    assert assign.assigned_technician_id == tech_id
    assert assign.note == "Giao kỹ thuật viên xử lý gấp"

    # Optional defaults
    empty_assign = IncidentAssignIn()
    assert empty_assign.assigned_department_id is None
    assert empty_assign.assigned_technician_id is None
    assert empty_assign.note is None


def test_incident_status_update_in():
    update = IncidentStatusUpdateIn(
        status="IN_PROGRESS",
        note="Kỹ thuật viên đã tiếp cận hiện trường",
    )
    assert update.status == "IN_PROGRESS"
    assert update.note == "Kỹ thuật viên đã tiếp cận hiện trường"

    # Missing status
    with pytest.raises(ValidationError):
        IncidentStatusUpdateIn()  # type: ignore


def test_incident_feedback_create_in():
    # Valid feedback
    fb = IncidentFeedbackCreateIn(rating=5, comment="Xử lý rất nhanh và sạch sẽ")
    assert fb.rating == 5
    assert fb.comment == "Xử lý rất nhanh và sạch sẽ"

    # Rating boundary values
    fb_min = IncidentFeedbackCreateIn(rating=1)
    assert fb_min.rating == 1
    assert fb_min.comment is None

    # Invalid rating < 1
    with pytest.raises(ValidationError):
        IncidentFeedbackCreateIn(rating=0)

    # Invalid rating > 5
    with pytest.raises(ValidationError):
        IncidentFeedbackCreateIn(rating=6)

    # Comment too long (> 1000)
    with pytest.raises(ValidationError):
        IncidentFeedbackCreateIn(rating=4, comment="A" * 1001)


def test_incident_feedback_out():
    fb_id = uuid4()
    inc_id = uuid4()
    cit_id = uuid4()
    now = datetime.now(timezone.utc)

    fb_out = IncidentFeedbackOut(
        id=fb_id,
        incident_id=inc_id,
        citizen_id=cit_id,
        rating=4,
        comment="Hài lòng với kết quả",
        created_at=now,
    )
    assert fb_out.id == fb_id
    assert fb_out.rating == 4
    assert fb_out.comment == "Hài lòng với kết quả"

    # Validation from dict
    data = {
        "id": fb_id,
        "incident_id": inc_id,
        "citizen_id": cit_id,
        "rating": 5,
        "comment": "Rất tốt",
        "created_at": now,
    }
    fb_validated = IncidentFeedbackOut.model_validate(data)
    assert fb_validated.rating == 5


def test_incident_detail_out_with_feedback():
    inc_id = uuid4()
    fb_id = uuid4()
    cit_id = uuid4()
    now = datetime.now(timezone.utc)

    detail_data = {
        "id": inc_id,
        "ticket_code": "DN-202610-0099",
        "title": "Nắp cống hỏng",
        "description": "Nắp cống bị bể",
        "status": "CONFIRMED",
        "priority": "HIGH",
        "channel": "WEB",
        "address_text": "Lê Duẩn, Đà Nẵng",
        "latitude": 16.072,
        "longitude": 108.218,
        "feedback": {
            "id": fb_id,
            "incident_id": inc_id,
            "citizen_id": cit_id,
            "rating": 5,
            "comment": "Đã thay nắp mới chắc chắn",
            "created_at": now,
        },
        "created_at": now,
    }
    detail = IncidentDetailOut.model_validate(detail_data)
    assert detail.feedback is not None
    assert detail.feedback.rating == 5
    assert detail.feedback.comment == "Đã thay nắp mới chắc chắn"


def test_incident_map_geometry_and_feature():
    # Valid geometry coordinates: [longitude, latitude]
    geom = IncidentMapGeometry(coordinates=[108.2208, 16.0678])
    assert geom.type == "Point"
    assert geom.coordinates == [108.2208, 16.0678]

    # Length != 2 must fail
    with pytest.raises(ValidationError):
        IncidentMapGeometry(coordinates=[108.2208])

    with pytest.raises(ValidationError):
        IncidentMapGeometry(coordinates=[108.2208, 16.0678, 10.0])

    inc_id = uuid4()
    now = datetime.now(timezone.utc)
    props = IncidentMapProperties(
        id=inc_id,
        ticket_code="DN-202610-0088",
        title="Ngập úng cục bộ",
        status="IN_PROGRESS",
        priority="EMERGENCY",
        category_code="FLOODING",
        category_name="Ngập úng đô thị",
        district="Hải Châu",
        address_text="Trần Phú, Hải Châu, Đà Nẵng",
        sla_due_at=now,
        is_overdue=True,
        anonymized_image_url="/uploads/public/flood.jpg",
        created_at=now,
    )
    assert props.ticket_code == "DN-202610-0088"
    assert props.is_overdue is True

    feature = IncidentMapFeature(geometry=geom, properties=props)
    assert feature.type == "Feature"
    assert feature.geometry.coordinates == [108.2208, 16.0678]
    assert feature.properties.title == "Ngập úng cục bộ"

    collection = IncidentMapFeatureCollectionOut(features=[feature])
    assert collection.type == "FeatureCollection"
    assert len(collection.features) == 1


def test_incident_map_properties_from_orm_object():
    class DummyCat:
        code = "ROAD_DAMAGE"
        name = "Hư hỏng mặt đường"

    class DummyMedia:
        media_type = "BEFORE_ANONYMIZED"
        file_url = "/uploads/public/road_anon.jpg"

    class DummyIncident:
        id = uuid4()
        ticket_code = "DN-202610-0077"
        title = "Ổ gà lớn"
        status = "TRIAGED"
        priority = "NORMAL"
        district = "Cẩm Lệ"
        address_text = "Cách Mạng Tháng Tám, Cẩm Lệ, Đà Nẵng"
        sla_due_at = datetime(2020, 1, 1, tzinfo=timezone.utc)  # past date
        created_at = datetime.now(timezone.utc)
        category = DummyCat()
        media = [DummyMedia()]

    obj = DummyIncident()
    props = IncidentMapProperties.model_validate(obj)
    assert props.ticket_code == "DN-202610-0077"
    assert props.category_code == "ROAD_DAMAGE"
    assert props.category_name == "Hư hỏng mặt đường"
    assert props.anonymized_image_url == "/uploads/public/road_anon.jpg"
    assert props.is_overdue is True  # Auto-computed overdue because sla_due_at is past and status is TRIAGED


def test_incident_analytics_summary_out():
    summary = IncidentAnalyticsSummaryOut(
        total_incidents=150,
        by_status={
            "SUBMITTED": 20,
            "TRIAGED": 30,
            "IN_PROGRESS": 40,
            "RESOLVED": 50,
            "CLOSED": 10,
        },
        by_priority={
            "LOW": 20,
            "NORMAL": 80,
            "HIGH": 40,
            "EMERGENCY": 10,
        },
        by_district={
            "Hải Châu": 50,
            "Thanh Khê": 40,
            "Sơn Trà": 30,
            "Ngũ Hành Sơn": 20,
            "Cẩm Lệ": 10,
        },
        sla_compliance={
            "within_sla": 120,
            "breached_sla": 30,
            "compliance_rate": 80.0,
        },
    )
    assert summary.total_incidents == 150
    assert summary.by_status["IN_PROGRESS"] == 40
    assert summary.sla_compliance["compliance_rate"] == 80.0

