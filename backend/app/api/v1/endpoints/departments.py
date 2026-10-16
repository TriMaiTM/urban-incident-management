"""Department endpoints for Danang Urban Incident Management Platform."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.department import Department
from app.schemas.incident import DepartmentOut

router = APIRouter(prefix="/departments", tags=["Departments & Agencies"])


@router.get(
    "",
    response_model=list[DepartmentOut],
    summary="Lấy danh sách các đơn vị tiếp nhận xử lý",
)
@router.get(
    "/",
    response_model=list[DepartmentOut],
    include_in_schema=False,
)
async def get_departments(
    db: AsyncSession = Depends(get_db),
) -> list[DepartmentOut]:
    """
    Truy vấn toàn bộ đơn vị tiếp nhận xử lý tại Đà Nẵng từ CSDL.
    Sắp xếp theo cấp bậc đơn vị (level) và tên đơn vị (name).
    """
    stmt = select(Department).order_by(Department.level, Department.name)
    result = await db.execute(stmt)
    departments = result.scalars().all()
    return list(departments)
