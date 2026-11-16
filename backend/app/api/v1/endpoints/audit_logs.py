"""System-wide Audit Logs endpoint for Da Nang IOC (Screen 28)."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.incident import Incident, IncidentHistory
from app.models.user import User
from app.schemas.incident import AuditLogItemOut, AuditLogListOut

router = APIRouter(prefix="/audit-logs", tags=["System Audit Logs"])


@router.get(
    "",
    response_model=AuditLogListOut,
    summary="Tra cứu nhật ký kiểm toán biến động trạng thái toàn hệ thống (ADMIN, DISPATCHER)",
)
@router.get(
    "/",
    response_model=AuditLogListOut,
    include_in_schema=False,
)
async def list_audit_logs(
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(20, ge=1, le=100, description="Số bản ghi mỗi trang"),
    ticket_code: str | None = Query(None, description="Lọc theo mã phiếu DN-YYYYMM-XXXX"),
    actor_id: UUID | None = Query(None, description="Lọc theo ID người thực hiện"),
    to_status: str | None = Query(None, description="Lọc theo trạng thái đích"),
    from_date: datetime | None = Query(None, description="Từ thời điểm"),
    to_date: datetime | None = Query(None, description="Đến thời điểm"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "DISPATCHER"])),
) -> AuditLogListOut:
    """Truy vấn phân trang toàn bộ lịch sử biến động trạng thái sự cố kèm thông tin người thực hiện."""
    clean_code = ticket_code.strip().upper() if ticket_code and ticket_code.strip() else None
    clean_status = to_status.strip().upper() if to_status and to_status.strip() else None

    norm_from = (
        from_date.replace(tzinfo=timezone.utc)
        if from_date is not None and from_date.tzinfo is None
        else from_date
    )
    norm_to = (
        to_date.replace(tzinfo=timezone.utc)
        if to_date is not None and to_date.tzinfo is None
        else to_date
    )

    def _apply_filters(stmt):
        stmt = stmt.join(Incident, IncidentHistory.incident_id == Incident.id)
        if clean_code:
            stmt = stmt.where(Incident.ticket_code.ilike(f"%{clean_code}%"))
        if actor_id is not None:
            stmt = stmt.where(IncidentHistory.actor_id == actor_id)
        if clean_status:
            stmt = stmt.where(IncidentHistory.to_status == clean_status)
        if norm_from is not None:
            stmt = stmt.where(IncidentHistory.created_at >= norm_from)
        if norm_to is not None:
            stmt = stmt.where(IncidentHistory.created_at <= norm_to)
        return stmt

    total_stmt = _apply_filters(select(func.count(IncidentHistory.id)))
    total = (await db.execute(total_stmt)).scalar() or 0

    items_stmt = (
        _apply_filters(
            select(IncidentHistory).options(
                selectinload(IncidentHistory.incident),
                selectinload(IncidentHistory.actor),
            )
        )
        .order_by(IncidentHistory.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    histories = (await db.execute(items_stmt)).scalars().all()

    items: list[AuditLogItemOut] = []
    for h in histories:
        inc = getattr(h, "incident", None)
        actor = getattr(h, "actor", None)
        items.append(
            AuditLogItemOut(
                id=h.id,
                incident_id=h.incident_id,
                ticket_code=getattr(inc, "ticket_code", "") if inc else "",
                actor_id=h.actor_id,
                actor_name=getattr(actor, "full_name", None) if actor else "Hệ thống AI / Tự động",
                actor_role=getattr(actor, "role", None) if actor else "SYSTEM",
                from_status=h.from_status,
                to_status=h.to_status,
                note=h.note,
                created_at=h.created_at,
            )
        )

    return AuditLogListOut(total=total, items=items, page=page, page_size=page_size)
