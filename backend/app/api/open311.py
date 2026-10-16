"""Open311 GeoReport v2 API Router and Endpoints.

Specification: Open311 GeoReport v2 (RFC / Spec 6.4)
Base prefix: /open311/v2
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.category import Category
from app.schemas.open311 import Open311ServiceOut

router = APIRouter(tags=["Open311 GeoReport v2"])


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
