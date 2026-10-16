"""Pydantic schemas for Incident Ingestion, AI Triage, Detail, Nearby, and Management."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator


def _extract_lat_lon(loc: object) -> tuple[float, float] | None:
    """Safely extract (latitude, longitude) from GeoAlchemy2 Geometry, Shapely Point, or coordinates."""
    if loc is None:
        return None
    try:
        from geoalchemy2.shape import to_shape
        from shapely.geometry import Point

        shape = to_shape(loc)
        if isinstance(shape, Point):
            # In WGS84 Point(lon, lat): x is longitude, y is latitude
            return (float(shape.y), float(shape.x))
    except Exception:
        pass

    # Direct coordinates attribute or object with x, y
    if hasattr(loc, "x") and hasattr(loc, "y"):
        return (float(getattr(loc, "y")), float(getattr(loc, "x")))

    # GeoJSON dict: {"type": "Point", "coordinates": [lon, lat]}
    if isinstance(loc, dict) and "coordinates" in loc:
        coords = loc["coordinates"]
        if isinstance(coords, (list, tuple)) and len(coords) >= 2:
            return (float(coords[1]), float(coords[0]))

    if isinstance(loc, (tuple, list)) and len(loc) >= 2:
        return (float(loc[1]), float(loc[0]))

    return None


class CategoryOut(BaseModel):
    """Schema for incident categories."""

    id: UUID
    code: str
    name: str
    default_sla_hours: int
    default_department_id: UUID | None = None

    model_config = ConfigDict(from_attributes=True)


class DepartmentOut(BaseModel):
    """Schema for managing departments and agencies in Da Nang."""

    id: UUID
    code: str
    name: str
    level: str
    contact_email: str | None = None
    contact_phone: str | None = None

    model_config = ConfigDict(from_attributes=True)


class IncidentMediaOut(BaseModel):
    """Schema for media attachments (original, anonymized, and resolution proof)."""

    id: UUID
    incident_id: UUID
    media_type: str
    file_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentHistoryOut(BaseModel):
    """Schema for audit trail and state transitions."""

    id: UUID
    incident_id: UUID
    actor_id: UUID | None = None
    from_status: str | None = None
    to_status: str
    note: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentCreateForm(BaseModel):
    """Schema for citizen submission form data."""

    title: str = Field(..., min_length=3, max_length=255, description="Tiêu đề phản ánh sự cố")
    description: str = Field(..., min_length=5, description="Mô tả chi tiết nội dung sự cố")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Vĩ độ WGS84")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Kinh độ WGS84")
    address_text: str = Field(..., min_length=3, max_length=500, description="Địa chỉ hiện trường")
    district: str | None = Field(None, max_length=100, description="Quận/Huyện tại Đà Nẵng")
    ward: str | None = Field(None, max_length=100, description="Phường/Xã tại Đà Nẵng")
    citizen_contact: str | None = Field(None, max_length=255, description="Số điện thoại hoặc phương thức liên hệ")


IncidentCreateIn = IncidentCreateForm


class IncidentOut(BaseModel):
    """Summary schema for public and list view of incidents."""

    id: UUID
    ticket_code: str
    title: str
    description: str
    status: str
    priority: str
    channel: str = "WEB"
    address_text: str
    district: str | None = None
    ward: str | None = None
    latitude: float
    longitude: float
    anonymized_image_url: str | None = None
    category_code: str | None = None
    assigned_department_code: str | None = None
    duplicate_count: int = 0
    sla_due_at: datetime | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_from_orm_or_dict(cls, data: object) -> object:
        if isinstance(data, dict):
            # Shallow copy to avoid mutating caller's dictionary
            data = dict(data)
            # Extract category_code / assigned_department_code / anonymized_image_url if not explicitly provided
            if ("category_code" not in data or data["category_code"] is None) and data.get("category"):
                cat = data["category"]
                data["category_code"] = cat.get("code") if isinstance(cat, dict) else getattr(cat, "code", None)
            if ("assigned_department_code" not in data or data["assigned_department_code"] is None) and data.get("assigned_department"):
                dept = data["assigned_department"]
                data["assigned_department_code"] = dept.get("code") if isinstance(dept, dict) else getattr(dept, "code", None)
            if ("anonymized_image_url" not in data or data["anonymized_image_url"] is None) and data.get("media"):
                media_list = data["media"]
                if isinstance(media_list, list):
                    for m in media_list:
                        m_type = m.get("media_type") if isinstance(m, dict) else getattr(m, "media_type", None)
                        if m_type == "BEFORE_ANONYMIZED":
                            data["anonymized_image_url"] = m.get("file_url") if isinstance(m, dict) else getattr(m, "file_url", None)
                            break
            # Coordinates if location is provided
            if ("latitude" not in data or "longitude" not in data) and data.get("location"):
                coords = _extract_lat_lon(data["location"])
                if coords:
                    data["latitude"], data["longitude"] = coords
            return data

        # Extract attributes from ORM model or custom object
        res: dict[str, object] = {}
        for attr in [
            "id",
            "ticket_code",
            "title",
            "description",
            "status",
            "priority",
            "channel",
            "address_text",
            "district",
            "ward",
            "duplicate_count",
            "sla_due_at",
            "resolved_at",
            "created_at",
            "updated_at",
            "citizen_id",
            "citizen_contact",
            "assigned_technician_id",
            "is_duplicate_of_id",
            "ai_classification_raw",
            "ai_confidence",
        ]:
            if hasattr(data, attr):
                res[attr] = getattr(data, attr)

        if "duplicate_count" not in res or res["duplicate_count"] is None:
            res["duplicate_count"] = 0

        # Latitude and longitude
        lat = getattr(data, "latitude", None)
        lon = getattr(data, "longitude", None)
        if lat is not None and lon is not None:
            res["latitude"] = float(lat)
            res["longitude"] = float(lon)
        elif hasattr(data, "location") and getattr(data, "location") is not None:
            coords = _extract_lat_lon(getattr(data, "location"))
            if coords:
                res["latitude"], res["longitude"] = coords

        # Category code
        if hasattr(data, "category_code") and getattr(data, "category_code") is not None:
            res["category_code"] = getattr(data, "category_code")
        elif hasattr(data, "category") and getattr(data, "category") is not None:
            res["category_code"] = getattr(data.category, "code", None)

        # Assigned department code
        if hasattr(data, "assigned_department_code") and getattr(data, "assigned_department_code") is not None:
            res["assigned_department_code"] = getattr(data, "assigned_department_code")
        elif hasattr(data, "assigned_department") and getattr(data, "assigned_department") is not None:
            res["assigned_department_code"] = getattr(data.assigned_department, "code", None)

        # Anonymized image url
        if hasattr(data, "anonymized_image_url") and getattr(data, "anonymized_image_url") is not None:
            res["anonymized_image_url"] = getattr(data, "anonymized_image_url")
        elif hasattr(data, "media") and getattr(data, "media") is not None:
            media_list = getattr(data, "media")
            if isinstance(media_list, list):
                for m in media_list:
                    if getattr(m, "media_type", None) == "BEFORE_ANONYMIZED":
                        res["anonymized_image_url"] = getattr(m, "file_url", None)
                        break

        # Detail fields (guard against None attributes)
        if hasattr(data, "category") and getattr(data, "category") is not None:
            res["category"] = getattr(data, "category")
        if hasattr(data, "assigned_department") and getattr(data, "assigned_department") is not None:
            res["assigned_department"] = getattr(data, "assigned_department")
        if hasattr(data, "media") and getattr(data, "media") is not None:
            res["media"] = getattr(data, "media")
        if hasattr(data, "history") and getattr(data, "history") is not None:
            res["history"] = getattr(data, "history")

        return res


class IncidentDetailOut(IncidentOut):
    """Detailed incident schema including relationships, audit history, and AI insights."""

    citizen_id: UUID | None = None
    citizen_contact: str | None = None
    assigned_technician_id: UUID | None = None
    is_duplicate_of_id: UUID | None = None
    category: CategoryOut | None = None
    assigned_department: DepartmentOut | None = None
    media: list[IncidentMediaOut] = Field(default_factory=list)
    history: list[IncidentHistoryOut] = Field(default_factory=list)
    ai_classification_raw: dict[str, object] | None = None
    ai_confidence: float | None = None

    model_config = ConfigDict(from_attributes=True)


class IncidentNearbyItem(BaseModel):
    """Information for nearby duplicate candidate incidents."""

    id: UUID
    ticket_code: str
    title: str
    status: str
    priority: str
    distance_meters: float
    latitude: float
    longitude: float
    created_at: datetime
    image_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class IncidentNearbyOut(BaseModel):
    """Response containing list of nearby incidents within threshold radius."""

    count: int
    items: list[IncidentNearbyItem]

    model_config = ConfigDict(from_attributes=True)


class IncidentVoteDuplicateOut(BaseModel):
    """Response schema after voting duplicate for an incident."""

    incident_id: UUID
    ticket_code: str
    duplicate_count: int
    message: str

    model_config = ConfigDict(from_attributes=True)


class IncidentListOut(BaseModel):
    """Paginated list response for incidents."""

    total: int
    items: list[IncidentOut]
    page: int = 1
    page_size: int = 20

    model_config = ConfigDict(from_attributes=True)
