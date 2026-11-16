"""Admin user management & RBAC account lock endpoints for Da Nang IOC."""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.department import Department
from app.models.user import User
from app.schemas.auth import AdminUserCreateIn, AdminUserUpdateIn, UserListOut, UserOut

router = APIRouter(prefix="/users", tags=["Admin User Management & RBAC"])


@router.get(
    "",
    response_model=UserListOut,
    summary="Tra cứu danh sách người dùng và phân quyền RBAC (Chỉ ADMIN)",
)
@router.get(
    "/",
    response_model=UserListOut,
    include_in_schema=False,
)
async def list_users(
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(20, ge=1, le=100, description="Số bản ghi mỗi trang"),
    role: str | None = Query(None, description="Lọc theo vai trò: CITIZEN, DISPATCHER, TECHNICIAN, ADMIN"),
    department_id: UUID | None = Query(None, description="Lọc theo đơn vị công tác"),
    is_locked: bool | None = Query(None, description="Lọc theo trạng thái khóa tài khoản"),
    q: str | None = Query(None, description="Tìm kiếm theo họ tên, email hoặc số điện thoại"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
) -> UserListOut:
    """Liệt kê người dùng toàn hệ thống phục vụ màn hình Quản trị Người dùng & RBAC."""
    clean_q = q.strip() if q and q.strip() else None
    clean_role = role.strip().upper() if role and role.strip() else None

    def _apply_filters(stmt):
        if clean_role:
            stmt = stmt.where(User.role == clean_role)
        if department_id is not None:
            stmt = stmt.where(User.department_id == department_id)
        if is_locked is not None:
            stmt = stmt.where(User.is_locked.is_(is_locked))
        if clean_q:
            pattern = f"%{clean_q}%"
            stmt = stmt.where(
                or_(
                    User.full_name.ilike(pattern),
                    User.email.ilike(pattern),
                    User.phone.ilike(pattern),
                )
            )
        return stmt

    total_stmt = _apply_filters(select(func.count(User.id)))
    total = (await db.execute(total_stmt)).scalar() or 0

    items_stmt = (
        _apply_filters(select(User))
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    users = (await db.execute(items_stmt)).scalars().all()
    items = [UserOut.model_validate(u) for u in users]

    return UserListOut(total=total, items=items, page=page, page_size=page_size)


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo tài khoản cán bộ hoặc người dùng mới (Chỉ ADMIN)",
)
@router.post(
    "/",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_user_by_admin(
    body: AdminUserCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
) -> UserOut:
    """Quản trị viên tạo mới tài khoản người dùng / cán bộ điều phối / kỹ thuật viên."""
    if body.email:
        existing_email = await db.execute(select(User).where(User.email == body.email))
        if existing_email.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{body.email}' đã tồn tại trong hệ thống.",
            )

    if body.phone:
        existing_phone = await db.execute(select(User).where(User.phone == body.phone))
        if existing_phone.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số điện thoại '{body.phone}' đã tồn tại trong hệ thống.",
            )

    if body.department_id is not None:
        dept = await db.get(Department, body.department_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy đơn vị với ID '{body.department_id}'.",
            )

    new_user = User(
        id=uuid4(),
        email=body.email,
        phone=body.phone,
        full_name=body.full_name.strip(),
        password_hash=get_password_hash(body.password),
        auth_provider="LOCAL",
        role=body.role,
        department_id=body.department_id,
        is_locked=False,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return UserOut.model_validate(new_user)


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    summary="Cập nhật vai trò, đơn vị hoặc khóa/mở khóa tài khoản (Chỉ ADMIN)",
)
async def update_user_by_admin(
    user_id: UUID,
    body: AdminUserUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
) -> UserOut:
    """Quản trị viên cập nhật thông tin, đổi vai trò RBAC hoặc khóa/mở khóa tài khoản người dùng."""
    target_user = await db.get(User, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người dùng với ID '{user_id}'.",
        )

    if body.is_locked is True and target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quản trị viên không thể tự khóa tài khoản của chính mình.",
        )

    if body.phone is not None and body.phone.strip() != (target_user.phone or ""):
        clean_phone = body.phone.strip()
        dup_phone = await db.execute(
            select(User).where(User.phone == clean_phone, User.id != target_user.id)
        )
        if dup_phone.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số điện thoại '{clean_phone}' đã thuộc về tài khoản khác.",
            )
        target_user.phone = clean_phone

    if body.department_id is not None:
        dept = await db.get(Department, body.department_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy đơn vị với ID '{body.department_id}'.",
            )
        target_user.department_id = body.department_id

    if body.full_name is not None and body.full_name.strip():
        target_user.full_name = body.full_name.strip()

    if body.role is not None:
        target_user.role = body.role

    if body.is_locked is not None:
        target_user.is_locked = body.is_locked

    db.add(target_user)
    await db.commit()
    await db.refresh(target_user)
    return UserOut.model_validate(target_user)
