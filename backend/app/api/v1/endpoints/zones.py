import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_AsGeoJSON, ST_Contains, ST_MakePoint, ST_SetSRID

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.incident import Incident
from app.models.user import User
from app.models.zone import SystemZone
from app.schemas.zone import LocationValidateIn, LocationValidateOut, ZoneOut, ZoneUpdateIn

router = APIRouter(prefix="/zones", tags=["Geographical Zones & Geofencing"])


@router.get("", response_model=List[ZoneOut], summary="Lấy toàn bộ danh sách phân vùng GIS (kèm trạng thái bật/tắt)")
@router.get("/", response_model=List[ZoneOut], include_in_schema=False)
async def list_all_zones(db: AsyncSession = Depends(get_db)) -> List[ZoneOut]:
    """Trả về toàn bộ các phân vùng (cả đang hoạt động và đang tạm dừng) kèm số phiếu đang mở."""
    open_count_res = await db.execute(
        select(func.count(Incident.id)).where(
            Incident.status.not_in(["RESOLVED", "CONFIRMED", "CLOSED", "REJECTED"])
        )
    )
    open_count = int(open_count_res.scalar() or 0)

    stmt = select(
        SystemZone.id,
        SystemZone.name,
        SystemZone.is_active,
        SystemZone.bounding_box,
        SystemZone.description,
        ST_AsGeoJSON(SystemZone.boundary).label("geojson_str"),
    ).order_by(SystemZone.id)
    rows = (await db.execute(stmt)).all()

    zones: list[ZoneOut] = []
    for row in rows:
        geojson_geom = None
        if row.geojson_str:
            try:
                geojson_geom = json.loads(row.geojson_str)
            except Exception:
                geojson_geom = None

        zones.append(
            ZoneOut(
                id=row.id,
                name=row.name,
                is_active=row.is_active,
                open_incident_count=open_count if row.is_active else 0,
                bounding_box=row.bounding_box,
                description=row.description,
                geojson_geometry=geojson_geom,
            )
        )
    return zones


@router.patch(
    "/{zone_id}",
    response_model=ZoneOut,
    summary="Bật/Tắt tiếp nhận sự cố hoặc cập nhật phân vùng GIS (Chỉ ADMIN)",
)
async def update_zone(
    zone_id: str,
    body: ZoneUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
) -> ZoneOut:
    """Quản trị viên bật/tắt trạng thái is_active hoặc cập nhật thông tin phân vùng GIS."""
    zone = await db.get(SystemZone, zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy phân vùng GIS với mã '{zone_id}'.",
        )

    if body.name is not None and body.name.strip():
        zone.name = body.name.strip()
    if body.description is not None:
        zone.description = body.description
    if body.is_active is not None:
        zone.is_active = body.is_active

    db.add(zone)
    await db.commit()
    await db.refresh(zone)

    return ZoneOut(
        id=zone.id,
        name=zone.name,
        is_active=zone.is_active,
        open_incident_count=0,
        bounding_box=zone.bounding_box,
        description=zone.description,
        geojson_geometry=None,
    )


@router.get("/active", response_model=List[ZoneOut], summary="Lấy danh sách các phân vùng đang kích hoạt")
async def get_active_zones(db: AsyncSession = Depends(get_db)):
    """
    Trả về danh sách các vùng tiếp nhận sự cố đang hoạt động (kèm GeoJSON ranh giới và bounding box).
    """
    stmt = (
        select(
            SystemZone.id,
            SystemZone.name,
            SystemZone.is_active,
            SystemZone.bounding_box,
            SystemZone.description,
            ST_AsGeoJSON(SystemZone.boundary).label("geojson_str")
        )
        .where(SystemZone.is_active.is_(True))
    )
    result = await db.execute(stmt)
    rows = result.all()

    active_zones = []
    for row in rows:
        geojson_geom = None
        if row.geojson_str:
            try:
                geojson_geom = json.loads(row.geojson_str)
            except Exception:
                geojson_geom = None

        active_zones.append(
            ZoneOut(
                id=row.id,
                name=row.name,
                is_active=row.is_active,
                bounding_box=row.bounding_box,
                description=row.description,
                geojson_geometry=geojson_geom
            )
        )

    return active_zones


@router.post(
    "/validate-location",
    response_model=LocationValidateOut,
    summary="Thẩm định tọa độ vị trí theo hàng rào địa lý"
)
async def validate_location(
    body: LocationValidateIn,
    db: AsyncSession = Depends(get_db)
):
    """
    Kiểm tra tọa độ (lat, lon) gửi lên có nằm trong ranh giới của phân vùng đang kích hoạt (Đà Nẵng) hay không.
    Sử dụng hàm PostGIS ST_Contains trên không gian WGS84 (SRID 4326).
    """
    # Lưu ý: PostGIS ST_MakePoint nhận (longitude, latitude)
    point_geom = ST_SetSRID(ST_MakePoint(body.longitude, body.latitude), 4326)

    stmt = (
        select(SystemZone.id, SystemZone.name)
        .where(SystemZone.is_active.is_(True))
        .where(ST_Contains(SystemZone.boundary, point_geom))
        .limit(1)
    )

    result = await db.execute(stmt)
    matched_zone = result.first()

    if matched_zone:
        return LocationValidateOut(
            is_inside=True,
            zone_id=matched_zone.id,
            zone_name=matched_zone.name,
            message=f"Tọa độ hợp lệ, thuộc phạm vi {matched_zone.name}."
        )

    return LocationValidateOut(
        is_inside=False,
        zone_id=None,
        zone_name=None,
        message="Vị trí bạn chọn nằm ngoài phạm vi Vùng Đô thị Trung tâm Đà Nẵng (thử nghiệm đợt 1). Vui lòng chọn điểm phản ánh thuộc khu vực Đà Nẵng."
    )
