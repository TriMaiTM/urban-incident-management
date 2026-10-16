"""Pydantic schemas for Open311 GeoReport v2 API."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class Open311ServiceOut(BaseModel):
    """Open311 Service Definition (GET /services.json)."""

    service_code: str = Field(..., description="Mã danh mục dịch vụ công")
    service_name: str = Field(..., description="Tên dịch vụ công")
    description: str = Field(..., description="Mô tả chi tiết")
    metadata: bool = Field(False, description="Cần thêm metadata tuỳ biến")
    type: str = Field("realtime", description="Loại dịch vụ: realtime / batch / blackbox")
    keywords: str | None = Field(None, description="Từ khoá tìm kiếm")
    group: str = Field("Hạ tầng đô thị", description="Nhóm dịch vụ")

    model_config = ConfigDict(from_attributes=True)


class Open311CreateRequestIn(BaseModel):
    """Open311 Inbound Incident Report Request (POST /requests.json)."""

    service_code: str = Field(..., description="Mã loại sự cố / dịch vụ")
    lat: float = Field(..., description="Vĩ độ (Latitude, WGS84)")
    long: float = Field(..., description="Kinh độ (Longitude, WGS84)")
    address_string: str | None = Field(None, description="Địa chỉ mô tả")
    email: str | None = Field(None, description="Email người phản ánh")
    phone: str | None = Field(None, description="Số điện thoại người phản ánh")
    first_name: str | None = Field(None, description="Tên")
    last_name: str | None = Field(None, description="Họ và tên đệm")
    description: str = Field(..., description="Nội dung chi tiết phản ánh")
    media_url: str | None = Field(None, description="Đường dẫn ảnh hiện trường")


class Open311CreateRequestResponseItem(BaseModel):
    """Open311 Service Request Creation Response Item."""

    service_request_id: str = Field(..., description="Mã tiếp nhận sự cố (ticket_code)")
    service_notice: str | None = Field(None, description="Thông báo bổ sung cho công dân")
    account_id: str | None = Field(None, description="Mã tài khoản nếu có")

    model_config = ConfigDict(from_attributes=True)


class Open311RequestItemOut(BaseModel):
    """Open311 Service Request Detailed Item (GET /requests/{service_request_id}.json)."""

    service_request_id: str = Field(..., description="Mã tiếp nhận sự cố")
    status: str = Field(..., description="Trạng thái chuẩn Open311: open hoặc closed")
    status_notes: str | None = Field(None, description="Chi tiết trạng thái")
    service_name: str = Field(..., description="Tên dịch vụ / loại sự cố")
    service_code: str = Field(..., description="Mã dịch vụ")
    description: str = Field(..., description="Mô tả sự cố")
    agency_responsible: str | None = Field(None, description="Đơn vị chịu trách nhiệm xử lý")
    service_notice: str | None = Field(None, description="Ghi chú quy trình")
    requested_datetime: datetime = Field(..., description="Thời gian tiếp nhận")
    updated_datetime: datetime | None = Field(None, description="Thời gian cập nhật gần nhất")
    expected_datetime: datetime | None = Field(None, description="Hạn xử lý SLA")
    address: str = Field(..., description="Địa chỉ sự cố")
    address_id: str | None = Field(None, description="Mã địa chỉ")
    zipcode: str | None = Field(None, description="Mã bưu chính")
    lat: float = Field(..., description="Vĩ độ WGS84")
    long: float = Field(..., description="Kinh độ WGS84")
    media_url: str | None = Field(None, description="Ảnh hiện trường đã làm mờ hoặc ảnh minh chứng sau xử lý")

    model_config = ConfigDict(from_attributes=True)
