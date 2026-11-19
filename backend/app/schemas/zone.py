from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class LocationValidateIn(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Vĩ độ WGS84")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Kinh độ WGS84")


class LocationValidateOut(BaseModel):
    is_inside: bool = Field(..., description="Tọa độ có nằm trong phân vùng tiếp nhận hay không")
    zone_id: Optional[str] = Field(None, description="Mã vùng địa lý nếu hợp lệ")
    zone_name: Optional[str] = Field(None, description="Tên vùng địa lý nếu hợp lệ")
    message: str = Field(..., description="Thông báo trạng thái hiển thị cho người dùng")


class ZoneOut(BaseModel):
    id: str
    name: str
    is_active: bool
    open_incident_count: int = 0
    bounding_box: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    geojson_geometry: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


class ZoneUpdateIn(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    geojson_geometry: Optional[Dict[str, Any]] = Field(
        None,
        description="Cập nhật hình học đa giác ranh giới mới (GeoJSON Polygon hoặc MultiPolygon, WGS84 SRID 4326)",
    )
    sync_adjacent: bool = Field(
        False,
        description="Tự động đồng bộ ranh giới các quận/huyện giáp ranh (cắt chồng lấn & lấp khoảng hở)",
    )

