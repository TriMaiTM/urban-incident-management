"""Open311 GeoReport v2 API Router and Endpoints.

Specification: Open311 GeoReport v2 (RFC / Spec 6.4)
Base prefix: /open311/v2
"""

import secrets
import string
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2.functions import ST_Contains, ST_MakePoint, ST_SetSRID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.category import Category
from app.models.incident import Incident, IncidentHistory, IncidentMedia
from app.models.zone import SystemZone
from app.schemas.incident import _extract_lat_lon
from app.schemas.open311 import (
    Open311CreateRequestIn,
    Open311CreateRequestResponseItem,
    Open311RequestItemOut,
    Open311ServiceOut,
)

router = APIRouter(tags=["Open311 GeoReport v2"])

OPEN311_STATUS_NOTES: dict[str, str] = {
    "SUBMITTED": "Tiếp nhận mới (SUBMITTED)",
    "TRIAGED": "Đã phân loại (TRIAGED)",
    "ASSIGNED": "Đã giao việc (ASSIGNED)",
    "IN_PROGRESS": "Đang xử lý (IN_PROGRESS)",
    "RESOLVED": "Đã khắc phục (RESOLVED)",
    "CONFIRMED": "Đã xác nhận hoàn thành (CONFIRMED)",
    "CLOSED": "Đã đóng (CLOSED)",
    "REJECTED": "Từ chối tiếp nhận (REJECTED)",
}


@router.get(
    "/services.json",
    response_model=list[Open311ServiceOut],
    summary="Danh mục Dịch vụ Công tiếp nhận theo chuẩn Open311 GeoReport v2",
)
async def get_services(
    db: AsyncSession = Depends(get_db),
) -> list[Open311ServiceOut]:
    """
    Truy vấn danh mục dịch vụ công / loại sự cố đô thị tương thích chuẩn Open311 GeoReport v2.

    Returns:
        list[Open311ServiceOut]: Danh sách các loại dịch vụ công được tiếp nhận.
    """
    stmt = select(Category).order_by(Category.code)
    result = await db.execute(stmt)
    categories = result.scalars().all()

    return [
        Open311ServiceOut(
            service_code=cat.code,
            service_name=cat.name,
            description=f"Phản ánh hiện trường về {cat.name}",
            metadata=False,
            type="realtime",
            keywords=cat.code.lower(),
            group="Hạ tầng đô thị",
        )
        for cat in categories
    ]


@router.post(
    "/requests.json",
    response_model=list[Open311CreateRequestResponseItem],
    status_code=status.HTTP_201_CREATED,
    summary="Tiếp nhận phản ánh sự cố theo chuẩn Open311 GeoReport v2",
)
async def create_request(
    payload: Open311CreateRequestIn,
    db: AsyncSession = Depends(get_db),
) -> list[Open311CreateRequestResponseItem]:
    """
    Tiếp nhận tạo mới yêu cầu phản ánh hiện trường theo chuẩn Open311 GeoReport v2:
    - Thẩm định mã dịch vụ service_code hợp lệ trong hệ thống.
    - Thẩm định hàng rào địa lý Đà Nẵng (PostGIS ST_Contains với ST_MakePoint(long, lat)).
    - Sinh mã tra cứu service_request_id chuẩn DN-YYYYMM-XXXX.
    - Ghi nhận Incident, IncidentHistory, và IncidentMedia (nếu có media_url).
    """
    # 1. Xác thực service_code
    cat_stmt = select(Category).where(Category.code == payload.service_code)
    cat_res = await db.execute(cat_stmt)
    category = cat_res.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy dịch vụ công với service_code '{payload.service_code}'.",
        )

    # 2. Hàng rào địa lý PostGIS (chú ý thứ tự longitude trước, latitude sau)
    point_geom = ST_SetSRID(ST_MakePoint(payload.long, payload.lat), 4326)
    zone_stmt = (
        select(SystemZone.id)
        .where(SystemZone.is_active.is_(True), ST_Contains(SystemZone.boundary, point_geom))
        .limit(1)
    )
    zone_res = await db.execute(zone_stmt)
    if zone_res.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tọa độ bạn chọn nằm ngoài phạm vi Vùng Đô thị Trung tâm Đà Nẵng (thử nghiệm đợt 1).",
        )

    now = datetime.now(timezone.utc)

    # 3. Sinh mã service_request_id: DN-YYYYMM-XXXX với collision guard
    def _generate_code() -> str:
        month_str = now.strftime("%Y%m")
        rand_chars = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
        return f"DN-{month_str}-{rand_chars}"

    service_request_id = _generate_code()
    for _ in range(5):
        exists_stmt = select(Incident.id).where(Incident.ticket_code == service_request_id).limit(1)
        if (await db.execute(exists_stmt)).scalar_one_or_none() is None:
            break
        service_request_id = _generate_code()

    # 4. Tạo bản ghi Incident
    incident_id = uuid4()
    sla_hours = category.default_sla_hours or 24
    sla_due_at = now + timedelta(hours=sla_hours)
    contact_parts = [
        p
        for p in [
            payload.phone,
            payload.email,
            f"{payload.first_name or ''} {payload.last_name or ''}".strip(),
        ]
        if p
    ]
    citizen_contact = " - ".join(contact_parts) if contact_parts else None

    incident = Incident(
        id=incident_id,
        ticket_code=service_request_id,
        title=f"Phản ánh Open311: {category.name}",
        description=payload.description,
        category_id=category.id,
        priority="NORMAL",
        status="SUBMITTED",
        channel="WEB",
        citizen_contact=citizen_contact,
        address_text=payload.address_string or "Đà Nẵng",
        location=point_geom,
        duplicate_count=0,
        sla_due_at=sla_due_at,
        created_at=now,
    )
    db.add(incident)

    # 5. Tạo bản ghi IncidentHistory
    history = IncidentHistory(
        incident_id=incident_id,
        actor_id=None,
        from_status=None,
        to_status="SUBMITTED",
        note="Tiếp nhận phản ánh từ chuẩn mở Open311 GeoReport v2",
        created_at=now,
    )
    db.add(history)

    # 6. Nếu payload.media_url
    if payload.media_url:
        media = IncidentMedia(
            incident_id=incident_id,
            media_type="BEFORE_ANONYMIZED",
            file_url=payload.media_url,
            created_at=now,
        )
        db.add(media)

    # 7. Lưu thay đổi
    await db.commit()

    # 8. Trả về định dạng mảng theo chuẩn Open311 GeoReport v2
    return [
        Open311CreateRequestResponseItem(
            service_request_id=service_request_id,
            service_notice="Phản ánh hiện trường đã được tiếp nhận thành công vào hệ thống điều phối đô thị Đà Nẵng.",
            account_id=None,
        )
    ]


@router.get(
    "/requests/{service_request_id}.json",
    response_model=list[Open311RequestItemOut],
    summary="Tra cứu chi tiết yêu cầu dịch vụ theo chuẩn Open311 GeoReport v2",
)
async def get_request_by_id(
    service_request_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[Open311RequestItemOut]:
    """
    Tra cứu tiến độ và chi tiết sự cố theo chuẩn Open311 GeoReport v2:
    - Tìm kiếm bản ghi Incident theo ticket_code == service_request_id.
    - Nạp quan hệ liên quan bằng selectinload (category, assigned_department, media).
    - Chuẩn hóa trạng thái open / closed theo quy chuẩn Open311.
    - Trích xuất tọa độ lat, long (WGS84) từ PostGIS location.
    - Trích xuất media_url: Ưu tiên AFTER_PROOF, sau đó đến BEFORE_ANONYMIZED.
      Tuyệt đối lọc bỏ và không hiển thị ảnh gốc BEFORE_ORIGINAL (bảo vệ quyền riêng tư theo Nghị định 13).
    """
    stmt = (
        select(Incident)
        .where(Incident.ticket_code == service_request_id)
        .options(
            selectinload(Incident.category),
            selectinload(Incident.assigned_department),
            selectinload(Incident.media),
        )
    )
    result = await db.execute(stmt)
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy yêu cầu dịch vụ với mã '{service_request_id}'.",
        )

    # Chuẩn hóa trạng thái theo Open311: "closed" nếu đã xử lý/đóng/từ chối, ngược lại là "open"
    closed_statuses = {"RESOLVED", "CONFIRMED", "CLOSED", "REJECTED"}
    open311_status = "closed" if incident.status in closed_statuses else "open"
    status_notes = OPEN311_STATUS_NOTES.get(
        incident.status,
        f"Trạng thái: {incident.status}",
    )

    # Trích xuất tọa độ (lat, long)
    lat: float = 0.0
    long: float = 0.0
    coords = _extract_lat_lon(incident.location) if incident.location is not None else None
    if coords:
        lat, long = coords
    elif (
        hasattr(incident, "latitude")
        and incident.latitude is not None
        and hasattr(incident, "longitude")
        and incident.longitude is not None
    ):
        lat, long = float(incident.latitude), float(incident.longitude)

    # Trích xuất media_url an toàn: Ưu tiên AFTER_PROOF, sau đó BEFORE_ANONYMIZED.
    # Tuyệt đối không bao giờ lấy BEFORE_ORIGINAL (Nghị định 13 & Lesson Learned Lỗi 3).
    media_url: str | None = None
    if incident.media:
        after_proof = next(
            (
                getattr(m, "file_url", None)
                for m in incident.media
                if getattr(m, "media_type", None) == "AFTER_PROOF"
            ),
            None,
        )
        if after_proof:
            media_url = after_proof
        else:
            before_anon = next(
                (
                    getattr(m, "file_url", None)
                    for m in incident.media
                    if getattr(m, "media_type", None) == "BEFORE_ANONYMIZED"
                ),
                None,
            )
            if before_anon:
                media_url = before_anon

    item = Open311RequestItemOut(
        service_request_id=incident.ticket_code,
        status=open311_status,
        status_notes=status_notes,
        service_name=incident.category.name if incident.category else "Sự cố đô thị",
        service_code=incident.category.code if incident.category else "OTHER",
        description=incident.description,
        agency_responsible=(
            incident.assigned_department.name if incident.assigned_department else None
        ),
        service_notice=None,
        requested_datetime=incident.created_at,
        updated_datetime=incident.updated_at,
        expected_datetime=incident.sla_due_at,
        address=incident.address_text or "Đà Nẵng",
        address_id=None,
        zipcode=None,
        lat=lat,
        long=long,
        media_url=media_url,
    )

    return [item]

