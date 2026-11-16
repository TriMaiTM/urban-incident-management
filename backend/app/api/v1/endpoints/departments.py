"""Department endpoints for Danang Urban Incident Management Platform."""

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.department import Department
from app.models.user import User
from app.schemas.incident import DepartmentCreateIn, DepartmentOut, DepartmentUpdateIn

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


@router.post(
    "",
    response_model=DepartmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Thêm mới đơn vị xử lý sự cố đô thị (Chỉ ADMIN)",
)
@router.post(
    "/",
    response_model=DepartmentOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_department(
    body: DepartmentCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
) -> DepartmentOut:
    """Quản trị viên thêm mới đơn vị hoặc đội quản lý đô thị."""
    clean_code = body.code.strip().upper()
    existing = await db.execute(select(Department).where(Department.code == clean_code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã đơn vị '{clean_code}' đã tồn tại trong hệ thống.",
        )

    dept = Department(
        id=uuid4(),
        code=clean_code,
        name=body.name.strip(),
        level=body.level.strip().upper(),
        contact_email=body.contact_email.strip() if body.contact_email else None,
        contact_phone=body.contact_phone.strip() if body.contact_phone else None,
    )
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return DepartmentOut.model_validate(dept)


@router.patch(
    "/{department_id}",
    response_model=DepartmentOut,
    summary="Cập nhật thông tin đơn vị xử lý (Chỉ ADMIN)",
)
async def update_department(
    department_id: UUID,
    body: DepartmentUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
) -> DepartmentOut:
    """Quản trị viên cập nhật tên, cấp đơn vị hoặc thông tin liên hệ của đơn vị xử lý."""
    dept = await db.get(Department, department_id)
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn vị với ID '{department_id}'.",
        )

    if body.name is not None and body.name.strip():
        dept.name = body.name.strip()
    if body.level is not None and body.level.strip():
        dept.level = body.level.strip().upper()
    if body.contact_email is not None:
        dept.contact_email = body.contact_email.strip() or None
    if body.contact_phone is not None:
        dept.contact_phone = body.contact_phone.strip() or None

    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return DepartmentOut.model_validate(dept)

