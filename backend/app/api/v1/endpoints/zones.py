import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_AsGeoJSON, ST_Contains, ST_MakePoint, ST_SetSRID

from app.core.database import get_db
from app.models.zone import SystemZone
from app.schemas.zone import LocationValidateIn, LocationValidateOut, ZoneOut

router = APIRouter(prefix="/zones", tags=["Geographical Zones & Geofencing"])


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
