"""Category endpoints for Danang Urban Incident Management Platform."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.category import Category
from app.schemas.incident import CategoryOut

router = APIRouter(prefix="/categories", tags=["Incident Categories"])


@router.get(
    "",
    response_model=list[CategoryOut],
    summary="Lấy danh sách toàn bộ danh mục sự cố đô thị",
)
@router.get(
    "/",
    response_model=list[CategoryOut],
    include_in_schema=False,
)
async def get_categories(
    db: AsyncSession = Depends(get_db),
) -> list[CategoryOut]:
    """
    Truy vấn toàn bộ danh mục sự cố đô thị từ CSDL (sắp xếp theo mã code).
    Trả về danh sách CategoryOut bao gồm SLA mặc định và cơ quan xử lý mặc định.
    """
    stmt = select(Category).order_by(Category.code)
    result = await db.execute(stmt)
    categories = result.scalars().all()
    return list(categories)
