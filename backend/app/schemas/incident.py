"""Pydantic schemas for Incident Ingestion, AI Triage, Detail, Nearby, and Management."""

from datetime import datetime, timezone
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


class IncidentFeedbackOut(BaseModel):
    """Schema for citizen feedback output."""

    id: UUID
    incident_id: UUID
    citizen_id: UUID
    rating: int
    comment: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentFeedbackCreateIn(BaseModel):
    """Schema for citizen post-resolution feedback submission."""

    rating: int = Field(..., ge=1, le=5, description="Điểm đánh giá từ 1 đến 5 sao")
    comment: str | None = Field(None, max_length=1000, description="Ý kiến nhận xét của công dân")


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
        if hasattr(data, "feedback") and getattr(data, "feedback") is not None:
            res["feedback"] = getattr(data, "feedback")

        return res


class IncidentDetailOut(IncidentOut):
    """Detailed incident schema including relationships, audit history, feedback, and AI insights."""

    citizen_id: UUID | None = None
    citizen_contact: str | None = None
    assigned_technician_id: UUID | None = None
    is_duplicate_of_id: UUID | None = None
    category: CategoryOut | None = None
    assigned_department: DepartmentOut | None = None
    media: list[IncidentMediaOut] = Field(default_factory=list)
    history: list[IncidentHistoryOut] = Field(default_factory=list)
    feedback: IncidentFeedbackOut | None = None
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


class IncidentTriageIn(BaseModel):
    """Schema for dispatcher triage and classification."""

    category_id: UUID
    priority: str = Field(..., description="Mức độ ưu tiên: LOW, NORMAL, HIGH, EMERGENCY")
    assigned_department_id: UUID
    note: str | None = None


class IncidentAssignIn(BaseModel):
    """Schema for technician or department assignment."""

    assigned_department_id: UUID | None = None
    assigned_technician_id: UUID | None = None
    note: str | None = None


class IncidentStatusUpdateIn(BaseModel):
    """Schema for status transition updates."""

    status: str = Field(..., description="Trạng thái mục tiêu: IN_PROGRESS, RESOLVED, REJECTED, CLOSED")
    note: str | None = None


class IncidentMapProperties(BaseModel):
    """Properties for incident GeoJSON feature."""

    id: UUID
    ticket_code: str
    title: str
    status: str
    priority: str
    category_code: str | None = None
    category_name: str | None = None
    district: str | None = None
    address_text: str
    sla_due_at: datetime | None = None
    is_overdue: bool = False
    anonymized_image_url: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_from_orm_or_dict(cls, data: object) -> object:
        if isinstance(data, dict):
            res = dict(data)
            if ("category_code" not in res or res["category_code"] is None) and res.get("category"):
                cat = res["category"]
                res["category_code"] = cat.get("code") if isinstance(cat, dict) else getattr(cat, "code", None)
            if ("category_name" not in res or res["category_name"] is None) and res.get("category"):
                cat = res["category"]
                res["category_name"] = cat.get("name") if isinstance(cat, dict) else getattr(cat, "name", None)
            if ("anonymized_image_url" not in res or res["anonymized_image_url"] is None) and res.get("media"):
                media_list = res["media"]
                if isinstance(media_list, list):
                    for m in media_list:
                        m_type = m.get("media_type") if isinstance(m, dict) else getattr(m, "media_type", None)
                        if m_type == "BEFORE_ANONYMIZED":
                            res["anonymized_image_url"] = m.get("file_url") if isinstance(m, dict) else getattr(m, "file_url", None)
                            break
            if "is_overdue" not in res or res["is_overdue"] is None:
                sla = res.get("sla_due_at")
                if isinstance(sla, str):
                    try:
                        sla = datetime.fromisoformat(sla.replace("Z", "+00:00"))
                    except Exception:
                        sla = None
                st = res.get("status")
                if sla and isinstance(sla, datetime) and st not in ("RESOLVED", "CONFIRMED", "CLOSED", "REJECTED"):
                    now = datetime.now(timezone.utc)
                    sla_tz = sla if sla.tzinfo else sla.replace(tzinfo=timezone.utc)
                    res["is_overdue"] = now > sla_tz
                else:
                    res["is_overdue"] = False
            return res

        # ORM model or custom object
        res_obj: dict[str, object] = {}
        for attr in [
            "id",
            "ticket_code",
            "title",
            "status",
            "priority",
            "district",
            "address_text",
            "sla_due_at",
            "created_at",
        ]:
            if hasattr(data, attr):
                res_obj[attr] = getattr(data, attr)

        if hasattr(data, "is_overdue") and getattr(data, "is_overdue") is not None:
            res_obj["is_overdue"] = getattr(data, "is_overdue")
        else:
            sla = getattr(data, "sla_due_at", None)
            if isinstance(sla, str):
                try:
                    sla = datetime.fromisoformat(sla.replace("Z", "+00:00"))
                except Exception:
                    sla = None
            st = getattr(data, "status", None)
            if sla and isinstance(sla, datetime) and st not in ("RESOLVED", "CONFIRMED", "CLOSED", "REJECTED"):
                now = datetime.now(timezone.utc)
                sla_tz = sla if sla.tzinfo else sla.replace(tzinfo=timezone.utc)
                res_obj["is_overdue"] = now > sla_tz
            else:
                res_obj["is_overdue"] = False

        if hasattr(data, "category_code") and getattr(data, "category_code") is not None:
            res_obj["category_code"] = getattr(data, "category_code")
        elif hasattr(data, "category") and getattr(data, "category") is not None:
            res_obj["category_code"] = getattr(data.category, "code", None)

        if hasattr(data, "category_name") and getattr(data, "category_name") is not None:
            res_obj["category_name"] = getattr(data, "category_name")
        elif hasattr(data, "category") and getattr(data, "category") is not None:
            res_obj["category_name"] = getattr(data.category, "name", None)

        if hasattr(data, "anonymized_image_url") and getattr(data, "anonymized_image_url") is not None:
            res_obj["anonymized_image_url"] = getattr(data, "anonymized_image_url")
        elif hasattr(data, "media") and getattr(data, "media") is not None:
            media_list = getattr(data, "media")
            if isinstance(media_list, list):
                for m in media_list:
                    if getattr(m, "media_type", None) == "BEFORE_ANONYMIZED":
                        res_obj["anonymized_image_url"] = getattr(m, "file_url", None)
                        break
        return res_obj


class IncidentMapGeometry(BaseModel):
    """GeoJSON Point geometry schema (RFC 7946). Coordinates format: [longitude, latitude]."""

    type: str = "Point"
    coordinates: list[float] = Field(..., min_length=2, max_length=2, description="[longitude, latitude]")


class IncidentMapFeature(BaseModel):
    """GeoJSON Feature schema for incident map representation."""

    type: str = "Feature"
    geometry: IncidentMapGeometry
    properties: IncidentMapProperties


class IncidentMapFeatureCollectionOut(BaseModel):
    """GeoJSON FeatureCollection response schema."""

    type: str = "FeatureCollection"
    features: list[IncidentMapFeature]


class IncidentAnalyticsSummaryOut(BaseModel):
    """Schema for incident operational analytics and SLA metrics."""

    total_incidents: int
    by_status: dict[str, int]
    by_priority: dict[str, int]
    by_district: dict[str, int]
    sla_compliance: dict[str, object]

    model_config = ConfigDict(from_attributes=True)

