"""Category endpoints for Danang Urban Incident Management Platform."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.category import Category
from app.models.department import Department
from app.models.user import User
from app.schemas.incident import CategoryOut, CategoryUpdateIn

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


@router.patch(
    "/{category_id}",
    response_model=CategoryOut,
    summary="Cập nhật cấu hình danh mục sự cố, SLA mặc định hoặc bật/tắt (Chỉ ADMIN)",
)
async def update_category(
    category_id: UUID,
    body: CategoryUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
) -> CategoryOut:
    """Quản trị viên cập nhật tên, thời hạn SLA mặc định, đơn vị mặc định hoặc trạng thái bật/tắt của danh mục."""
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy danh mục sự cố với ID '{category_id}'.",
        )

    if body.default_department_id is not None:
        dept = await db.get(Department, body.default_department_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy đơn vị với ID '{body.default_department_id}'.",
            )
        category.default_department_id = body.default_department_id

    if body.name is not None and body.name.strip():
        category.name = body.name.strip()
    if body.default_sla_hours is not None:
        category.default_sla_hours = body.default_sla_hours
    if body.is_active is not None:
        category.is_active = body.is_active

    db.add(category)
    await db.commit()
    await db.refresh(category)
    return CategoryOut.model_validate(category)

