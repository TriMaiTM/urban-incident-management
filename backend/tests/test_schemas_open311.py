"""Unit tests for Open311 GeoReport v2 Pydantic schemas."""

from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from app.schemas import (
    Open311ServiceOut,
    Open311CreateRequestIn,
    Open311CreateRequestResponseItem,
    Open311RequestItemOut,
)


class DummyObject:
    """Helper class to verify from_attributes=True behavior."""

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


def test_open311_service_out_defaults():
    """Verify Open311ServiceOut default values and required attributes."""
    service = Open311ServiceOut(
        service_code="ROAD_DAMAGE",
        service_name="Hư hỏng mặt đường",
        description="Phản ánh ổ gà, nứt mặt đường",
    )
    assert service.service_code == "ROAD_DAMAGE"
    assert service.service_name == "Hư hỏng mặt đường"
    assert service.description == "Phản ánh ổ gà, nứt mặt đường"
    assert service.metadata is False
    assert service.type == "realtime"
    assert service.keywords is None
    assert service.group == "Hạ tầng đô thị"


def test_open311_service_out_custom_and_serialization():
    """Verify Open311ServiceOut custom values and model_dump / model_dump_json."""
    service = Open311ServiceOut(
        service_code="LIGHTING",
        service_name="Chiếu sáng công cộng",
        description="Đèn chiếu sáng hư hỏng",
        metadata=True,
        type="batch",
        keywords="đèn, chiếu sáng, bóng hỏng",
        group="Điện chiếu sáng",
    )
    dumped = service.model_dump()
    assert dumped["service_code"] == "LIGHTING"
    assert dumped["metadata"] is True
    assert dumped["type"] == "batch"
    assert dumped["keywords"] == "đèn, chiếu sáng, bóng hỏng"
    assert dumped["group"] == "Điện chiếu sáng"

    # Test from_attributes
    dummy = DummyObject(
        service_code="TREE_FALL",
        service_name="Cây xanh ngã đổ",
        description="Cây gãy cành nguy hiểm",
        metadata=False,
        type="realtime",
        keywords=None,
        group="Cây xanh",
    )
    from_obj = Open311ServiceOut.model_validate(dummy)
    assert from_obj.service_code == "TREE_FALL"
    assert from_obj.group == "Cây xanh"


def test_open311_service_out_validation_error():
    """Verify validation error when required fields are missing."""
    with pytest.raises(ValidationError) as exc_info:
        Open311ServiceOut(service_code="DRAINAGE")  # missing service_name and description
    errors = exc_info.value.errors()
    field_names = [err["loc"][0] for err in errors]
    assert "service_name" in field_names
    assert "description" in field_names


def test_open311_create_request_in_valid():
    """Verify Open311CreateRequestIn validation with minimal and complete payloads."""
    # Minimal payload
    req_minimal = Open311CreateRequestIn(
        service_code="ROAD_DAMAGE",
        lat=16.0544,
        long=108.2022,
        description="Ổ gà lớn gây nguy hiểm cho người đi xe máy",
    )
    assert req_minimal.service_code == "ROAD_DAMAGE"
    assert req_minimal.lat == 16.0544
    assert req_minimal.long == 108.2022
    assert req_minimal.description == "Ổ gà lớn gây nguy hiểm cho người đi xe máy"
    assert req_minimal.address_string is None
    assert req_minimal.email is None
    assert req_minimal.phone is None
    assert req_minimal.first_name is None
    assert req_minimal.last_name is None
    assert req_minimal.media_url is None

    # Complete payload
    req_full = Open311CreateRequestIn(
        service_code="ROAD_DAMAGE",
        lat=16.0544,
        long=108.2022,
        address_string="123 Bạch Đằng, Hải Châu, Đà Nẵng",
        email="citizen@example.com",
        phone="0905123456",
        first_name="Văn A",
        last_name="Nguyễn",
        description="Ổ gà lớn cần vá gấp",
        media_url="https://storage.danang.gov.vn/uploads/incident1.jpg",
    )
    assert req_full.email == "citizen@example.com"
    assert req_full.phone == "0905123456"
    assert req_full.first_name == "Văn A"
    assert req_full.last_name == "Nguyễn"
    assert req_full.media_url == "https://storage.danang.gov.vn/uploads/incident1.jpg"


def test_open311_create_request_in_validation_error():
    """Verify Open311CreateRequestIn validation errors on invalid types and missing fields."""
    with pytest.raises(ValidationError):
        # Missing description and coordinates
        Open311CreateRequestIn(service_code="ROAD_DAMAGE")

    with pytest.raises(ValidationError):
        # Invalid coordinate type
        Open311CreateRequestIn(
            service_code="ROAD_DAMAGE",
            lat="not-a-float",
            long=108.2022,
            description="Test invalid coordinate",
        )


def test_open311_create_request_response_item():
    """Verify Open311CreateRequestResponseItem serialization and attributes."""
    resp = Open311CreateRequestResponseItem(
        service_request_id="DN-202610-0001",
        service_notice="Yêu cầu phản ánh đã được tiếp nhận thành công vào hệ thống IOC Đà Nẵng.",
        account_id="ACC-999",
    )
    assert resp.service_request_id == "DN-202610-0001"
    assert "tiếp nhận thành công" in resp.service_notice
    assert resp.account_id == "ACC-999"

    # From object
    dummy = DummyObject(
        service_request_id="DN-202610-0002",
        service_notice=None,
        account_id=None,
    )
    from_obj = Open311CreateRequestResponseItem.model_validate(dummy)
    assert from_obj.service_request_id == "DN-202610-0002"
    assert from_obj.service_notice is None
    assert from_obj.account_id is None

    # Missing required service_request_id
    with pytest.raises(ValidationError):
        Open311CreateRequestResponseItem()


def test_open311_request_item_out():
    """Verify Open311RequestItemOut serialization, defaults, and attributes."""
    now = datetime.now(timezone.utc)
    item = Open311RequestItemOut(
        service_request_id="DN-202610-0042",
        status="open",
        status_notes="Đã giao cho Đội CSGT & Trật tự quận Hải Châu tiếp cận hiện trường",
        service_name="Hư hỏng mặt đường",
        service_code="ROAD_DAMAGE",
        description="Ổ gà lớn trước cổng trường",
        agency_responsible="UBND Quận Hải Châu",
        service_notice="Đang điều động nhân lực xử lý trong 24 giờ",
        requested_datetime=now,
        updated_datetime=now,
        expected_datetime=now,
        address="45 Lê Duẩn, Hải Châu, Đà Nẵng",
        address_id="ADDR-101",
        zipcode="550000",
        lat=16.0680,
        long=108.2200,
        media_url="https://danang.gov.vn/uploads/public/anonymized_photo.jpg",
    )
    assert item.service_request_id == "DN-202610-0042"
    assert item.status == "open"
    assert item.lat == 16.0680
    assert item.long == 108.2200
    assert item.agency_responsible == "UBND Quận Hải Châu"
    assert item.media_url == "https://danang.gov.vn/uploads/public/anonymized_photo.jpg"

    # Serialization check
    dumped = item.model_dump(mode="json")
    assert dumped["service_request_id"] == "DN-202610-0042"
    assert dumped["status"] == "open"
    assert isinstance(dumped["requested_datetime"], str)

    # Missing required field check
    with pytest.raises(ValidationError) as exc_info:
        Open311RequestItemOut(
            service_request_id="DN-202610-0042",
            status="open",
            # missing service_name, service_code, description, requested_datetime, address, lat, long
        )
    errors = exc_info.value.errors()
    missing_locs = {err["loc"][0] for err in errors}
    assert "service_name" in missing_locs
    assert "service_code" in missing_locs
    assert "description" in missing_locs
    assert "requested_datetime" in missing_locs
    assert "address" in missing_locs
    assert "lat" in missing_locs
    assert "long" in missing_locs


def test_open311_request_item_out_from_attributes():
    """Verify Open311RequestItemOut works with ORM-style object mapping."""
    now = datetime(2026, 10, 16, 12, 0, 0, tzinfo=timezone.utc)
    dummy = DummyObject(
        service_request_id="DN-202610-0088",
        status="closed",
        status_notes="Đã hoàn thành sửa chữa",
        service_name="Cây xanh gãy đổ",
        service_code="TREE_FALL",
        description="Cành cây gãy chắn lối đi",
        agency_responsible="Công ty Cây xanh Đà Nẵng",
        service_notice=None,
        requested_datetime=now,
        updated_datetime=now,
        expected_datetime=None,
        address="10 Quang Trung, Đà Nẵng",
        address_id=None,
        zipcode=None,
        lat=16.0722,
        long=108.2198,
        media_url=None,
    )
    validated = Open311RequestItemOut.model_validate(dummy)
    assert validated.service_request_id == "DN-202610-0088"
    assert validated.status == "closed"
    assert validated.expected_datetime is None
    assert validated.address_id is None
