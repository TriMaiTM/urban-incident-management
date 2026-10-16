"""Incident ingestion, spatial deduplication, and management endpoints for Da Nang."""

from datetime import datetime, timedelta, timezone
import logging
import os
from pathlib import Path
import secrets
import string
from uuid import UUID, uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from geoalchemy2 import Geography
from geoalchemy2.functions import (
    ST_Contains,
    ST_Distance,
    ST_DWithin,
    ST_MakePoint,
    ST_SetSRID,
)
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user_optional
from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_db
from app.models.category import Category
from app.models.department import Department
from app.models.incident import Incident, IncidentHistory, IncidentMedia
from app.models.user import User
from app.models.zone import SystemZone
from app.schemas.incident import (
    IncidentDetailOut,
    IncidentListOut,
    IncidentNearbyItem,
    IncidentNearbyOut,
    IncidentOut,
    IncidentVoteDuplicateOut,
    _extract_lat_lon,
)
from app.services.anonymizer import anonymize_image
from app.services.deepseek_vision import classify_incident_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidents", tags=["Incidents & Field Reports"])


def generate_ticket_code() -> str:
    """Generate unique public ticket code formatted as DN-YYYYMM-XXXX."""
    now = datetime.now(timezone.utc)
    month_str = now.strftime("%Y%m")
    rand_chars = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    return f"DN-{month_str}-{rand_chars}"


def mask_citizen_contact(contact: str | None) -> str | None:
    """Mask citizen phone number / contact info according to Decree 13 privacy rules."""
    if not contact:
        return None
    s = contact.strip()
    if len(s) <= 4:
        return "***"
    if len(s) <= 7:
        return f"{s[:2]}***{s[-1:]}"
    prefix_len = 4 if len(s) >= 10 else 3
    suffix_len = 3
    return f"{s[:prefix_len]}***{s[-suffix_len:]}"


def _get_upload_dirs() -> tuple[Path, Path]:
    """Resolve and create private and public upload directories."""
    base_dir = Path(settings.UPLOAD_DIR)
    if not base_dir.is_absolute() and Path("backend").is_dir():
        base_dir = Path("backend") / base_dir

    private_dir = base_dir / "private"
    public_dir = base_dir / "public"
    private_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)
    return private_dir, public_dir


async def process_incident_ai_triage(
    incident_id: UUID,
    image_path: str,
    description: str,
    db_session: AsyncSession | None = None,
) -> None:
    """Background task to run DeepSeek Vision classification and auto-triage incident."""
    async def _execute_triage(session: AsyncSession) -> None:
        # 1. Fetch valid categories and departments
        cat_stmt = select(Category)
        cat_res = await session.execute(cat_stmt)
        categories = list(cat_res.scalars().all())
        category_map = {c.code: c for c in categories}
        allowed_cat_codes = list(category_map.keys())

        dept_stmt = select(Department)
        dept_res = await session.execute(dept_stmt)
        departments = list(dept_res.scalars().all())
        department_map = {d.code: d for d in departments}
        allowed_dept_codes = list(department_map.keys())

        # 2. Call DeepSeek Vision classification
        ai_res = await classify_incident_image(
            image_path=image_path,
            description=description,
            allowed_category_codes=allowed_cat_codes if allowed_cat_codes else None,
            allowed_department_codes=allowed_dept_codes if allowed_dept_codes else None,
        )

        # 3. Load incident
        inc_stmt = select(Incident).where(Incident.id == incident_id)
        inc_res = await session.execute(inc_stmt)
        incident = inc_res.scalar_one_or_none()
        if not incident:
            logger.warning("Incident %s not found for AI background triage", incident_id)
            return

        # 4. Map category, department, and SLA
        matched_cat = category_map.get(ai_res["category_code"])
        matched_dept = department_map.get(ai_res["suggested_department_code"])

        incident.category_id = matched_cat.id if matched_cat else None
        incident.priority = ai_res["priority"]
        incident.assigned_department_id = matched_dept.id if matched_dept else None
        incident.ai_classification_raw = dict(ai_res)
        incident.ai_confidence = ai_res["confidence"]

        if matched_cat and matched_cat.default_sla_hours:
            incident.sla_due_at = datetime.now(timezone.utc) + timedelta(hours=matched_cat.default_sla_hours)

        old_status = incident.status
        incident.status = "TRIAGED"

        # 5. Record transition in IncidentHistory
        history = IncidentHistory(
            incident_id=incident.id,
            actor_id=None,
            from_status=old_status,
            to_status="TRIAGED",
            note=f"Hệ thống tự động phân loại bằng AI (Danh mục: {ai_res['category_code']}, Ưu tiên: {ai_res['priority']})",
        )
        session.add(history)
        await session.commit()
        logger.info("Successfully triaged incident %s via AI background task", incident_id)

    if db_session is not None:
        await _execute_triage(db_session)
    else:
        async with AsyncSessionLocal() as session:
            try:
                await _execute_triage(session)
            except Exception as exc:
                logger.exception("AI triage background task failed for incident %s: %s", incident_id, exc)
                await session.rollback()


@router.post(
    "",
    response_model=IncidentDetailOut,
    status_code=status.HTTP_201_CREATED,
    summary="Tiếp nhận phản ánh sự cố hiện trường từ người dân",
)
@router.post(
    "/",
    response_model=IncidentDetailOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_incident(
    background_tasks: BackgroundTasks,
    title: str = Form(..., min_length=3, max_length=255, description="Tiêu đề phản ánh sự cố"),
    description: str = Form(..., min_length=5, description="Mô tả chi tiết nội dung sự cố"),
    latitude: float = Form(..., ge=-90.0, le=90.0, description="Vĩ độ WGS84"),
    longitude: float = Form(..., ge=-180.0, le=180.0, description="Kinh độ WGS84"),
    address_text: str = Form(..., min_length=3, max_length=500, description="Địa chỉ hiện trường"),
    district: str | None = Form(None, max_length=100, description="Quận/Huyện"),
    ward: str | None = Form(None, max_length=100, description="Phường/Xã"),
    citizen_contact: str | None = Form(None, max_length=255, description="Số điện thoại hoặc phương thức liên hệ"),
    image: UploadFile = File(..., description="Ảnh chụp hiện trường sự cố"),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> IncidentDetailOut:
    """
    Tiếp nhận phản ánh sự cố từ người dân:
    - Thẩm định hàng rào địa lý Đà Nẵng (PostGIS ST_Contains).
    - Lưu ảnh gốc bảo mật và tự động làm mờ khuôn mặt/biển số xe theo Nghị định 13/2023/NĐ-CP.
    - Sinh mã phiếu tra cứu công khai (DN-YYYYMM-XXXX).
    - Lưu sự cố và kích hoạt tác vụ AI DeepSeek Vision ngầm trong BackgroundTasks.
    """
    # 1. Hàng rào địa lý PostGIS: Point(longitude, latitude)
    point_geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    zone_stmt = (
        select(SystemZone.id)
        .where(SystemZone.is_active.is_(True), ST_Contains(SystemZone.boundary, point_geom))
        .limit(1)
    )
    zone_result = await db.execute(zone_stmt)
    if zone_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Vị trí bạn chọn nằm ngoài phạm vi Vùng Đô thị Trung tâm Đà Nẵng (thử nghiệm đợt 1).",
        )

    # 2. Xử lý lưu trữ & Làm mờ ảnh bảo vệ quyền riêng tư
    image_content = await image.read()
    if not image_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp hình ảnh rỗng. Vui lòng tải lên ảnh chụp hiện trường hợp lệ.",
        )

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(image_content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dung lượng tệp vượt quá giới hạn cho phép ({settings.MAX_UPLOAD_SIZE_MB}MB).",
        )

    raw_ext = Path(image.filename or "").suffix.lower()
    file_ext = raw_ext if raw_ext in [".jpg", ".jpeg", ".png", ".webp"] else ".jpg"

    unique_id = uuid4().hex
    orig_filename = f"{unique_id}_orig{file_ext}"
    anon_filename = f"{unique_id}_anon.jpg"

    private_dir, public_dir = _get_upload_dirs()
    orig_path = private_dir / orig_filename
    anon_path = public_dir / anon_filename

    with open(orig_path, "wb") as f:
        f.write(image_content)

    try:
        anonymize_image(orig_path, anon_path)
    except Exception as exc:
        orig_path.unlink(missing_ok=True)
        anon_path.unlink(missing_ok=True)
        logger.exception("Anonymization failed for image %s: %s", orig_path, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xử lý hình ảnh tải lên: {exc}",
        )

    # 3. Sinh ticket_code độc nhất: DN-YYYYMM-XXXX
    ticket_code = generate_ticket_code()
    for _ in range(5):
        exists_stmt = select(Incident.id).where(Incident.ticket_code == ticket_code).limit(1)
        if (await db.execute(exists_stmt)).scalar_one_or_none() is None:
            break
        ticket_code = generate_ticket_code()

    # 4. Tạo bản ghi Incident
    incident = Incident(
        ticket_code=ticket_code,
        title=title,
        description=description,
        priority="NORMAL",
        status="SUBMITTED",
        channel="WEB",
        citizen_id=current_user.id if current_user else None,
        citizen_contact=citizen_contact,
        location=point_geom,
        address_text=address_text,
        district=district,
        ward=ward,
    )
    db.add(incident)
    await db.flush()

    # 5. Tạo bản ghi IncidentMedia
    media_orig = IncidentMedia(
        incident_id=incident.id,
        media_type="BEFORE_ORIGINAL",
        file_url=f"/uploads/private/{orig_filename}",
    )
    media_anon = IncidentMedia(
        incident_id=incident.id,
        media_type="BEFORE_ANONYMIZED",
        file_url=f"/uploads/public/{anon_filename}",
    )
    db.add(media_orig)
    db.add(media_anon)

    # 6. Tạo bản ghi IncidentHistory
    history = IncidentHistory(
        incident_id=incident.id,
        actor_id=current_user.id if current_user else None,
        from_status=None,
        to_status="SUBMITTED",
        note="Sự cố được tiếp nhận từ phản ánh của người dân",
    )
    db.add(history)

    await db.commit()

    # 7. Tải đầy đủ quan hệ để serialize IncidentDetailOut
    reload_stmt = (
        select(Incident)
        .where(Incident.id == incident.id)
        .options(
            selectinload(Incident.category),
            selectinload(Incident.assigned_department),
            selectinload(Incident.media),
            selectinload(Incident.history),
        )
    )
    loaded_incident = (await db.execute(reload_stmt)).scalar_one()
    setattr(loaded_incident, "latitude", latitude)
    setattr(loaded_incident, "longitude", longitude)

    # 8. Đưa tác vụ AI DeepSeek Vision vào BackgroundTasks
    background_tasks.add_task(
        process_incident_ai_triage,
        loaded_incident.id,
        str(orig_path),
        description,
    )

    return IncidentDetailOut.model_validate(loaded_incident)


@router.get(
    "/nearby",
    response_model=IncidentNearbyOut,
    summary="Tìm kiếm các sự cố lân cận để phát hiện và gộp trùng lặp",
)
async def get_nearby_incidents(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Vĩ độ WGS84 điểm phản ánh"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Kinh độ WGS84 điểm phản ánh"),
    radius: float = Query(50.0, ge=0.0, le=10000.0, description="Bán kính quét theo mét (mặc định 50m)"),
    limit: int = Query(10, ge=1, le=50, description="Số lượng sự cố tối đa"),
    db: AsyncSession = Depends(get_db),
) -> IncidentNearbyOut:
    """
    Quét tìm các sự cố chưa đóng trong bán kính radius (mặc định 50m) bằng PostGIS ST_DWithin trên Geography.
    Loại trừ các trạng thái: RESOLVED, CONFIRMED, CLOSED, REJECTED.
    Sắp xếp theo khoảng cách tăng dần.
    """
    point_geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    point_geog = cast(point_geom, Geography)
    loc_geog = cast(Incident.location, Geography)
    dist_expr = ST_Distance(loc_geog, point_geog).label("distance_meters")

    excluded_statuses = ["RESOLVED", "CONFIRMED", "CLOSED", "REJECTED"]
    stmt = (
        select(Incident, dist_expr)
        .options(selectinload(Incident.media))
        .where(
            Incident.status.not_in(excluded_statuses),
            ST_DWithin(loc_geog, point_geog, radius),
        )
        .order_by(dist_expr.asc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    items: list[IncidentNearbyItem] = []
    for row in rows:
        inc: Incident = row[0]
        dist = float(row[1])

        coords = _extract_lat_lon(inc.location)
        inc_lat = coords[0] if coords else getattr(inc, "latitude", latitude)
        inc_lon = coords[1] if coords else getattr(inc, "longitude", longitude)

        # Only use public media types (BEFORE_ANONYMIZED or AFTER_PROOF), never leak BEFORE_ORIGINAL
        image_url: str | None = None
        if inc.media:
            for m in inc.media:
                if m.media_type in ["BEFORE_ANONYMIZED", "AFTER_PROOF"]:
                    image_url = m.file_url
                    break

        items.append(
            IncidentNearbyItem(
                id=inc.id,
                ticket_code=inc.ticket_code,
                title=inc.title,
                status=inc.status,
                priority=inc.priority,
                distance_meters=round(dist, 2),
                latitude=inc_lat,
                longitude=inc_lon,
                created_at=inc.created_at,
                image_url=image_url,
            )
        )

    return IncidentNearbyOut(count=len(items), items=items)


@router.post(
    "/{id}/vote-duplicate",
    response_model=IncidentVoteDuplicateOut,
    summary="Xác nhận sự cố trùng lặp và tăng bộ đếm trùng lặp",
)
async def vote_duplicate(
    id: UUID,
    db: AsyncSession = Depends(get_db),
) -> IncidentVoteDuplicateOut:
    """
    Người dân xác nhận sự cố gặp phải trùng với sự cố đã có tại hiện trường,
    hệ thống tăng duplicate_count thêm 1 đơn vị.
    """
    incident = await db.get(Incident, id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy sự cố với ID '{id}'.",
        )

    incident.duplicate_count += 1
    await db.commit()
    await db.refresh(incident)

    return IncidentVoteDuplicateOut(
        incident_id=incident.id,
        ticket_code=incident.ticket_code,
        duplicate_count=incident.duplicate_count,
        message="Ghi nhận phản ánh trùng lặp thành công. Cảm ơn đóng góp của bạn.",
    )


@router.get(
    "",
    response_model=IncidentListOut,
    summary="Tra cứu danh sách sự cố phân trang và lọc",
)
@router.get(
    "/",
    response_model=IncidentListOut,
    include_in_schema=False,
)
async def list_incidents(
    page: int = Query(1, ge=1, description="Số trang (bắt đầu từ 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Số lượng mục trên mỗi trang"),
    incident_status: str | None = Query(None, alias="status", description="Lọc theo trạng thái sự cố"),
    district: str | None = Query(None, description="Lọc theo quận/huyện"),
    category_code: str | None = Query(None, description="Lọc theo mã danh mục sự cố"),
    category_id: UUID | None = Query(None, description="Lọc theo ID danh mục sự cố"),
    db: AsyncSession = Depends(get_db),
) -> IncidentListOut:
    """
    Tra cứu danh sách sự cố có phân trang, hỗ trợ lọc theo trạng thái, quận/huyện và danh mục.
    """
    count_stmt = select(func.count(Incident.id))
    if category_code:
        count_stmt = count_stmt.join(Category, Incident.category_id == Category.id).where(Category.code == category_code)
    if category_id:
        count_stmt = count_stmt.where(Incident.category_id == category_id)
    if incident_status:
        count_stmt = count_stmt.where(Incident.status == incident_status)
    if district:
        count_stmt = count_stmt.where(Incident.district == district)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    items_stmt = (
        select(Incident)
        .options(
            selectinload(Incident.category),
            selectinload(Incident.assigned_department),
            selectinload(Incident.media),
        )
    )
    if category_code:
        items_stmt = items_stmt.join(Category, Incident.category_id == Category.id).where(Category.code == category_code)
    if category_id:
        items_stmt = items_stmt.where(Incident.category_id == category_id)
    if incident_status:
        items_stmt = items_stmt.where(Incident.status == incident_status)
    if district:
        items_stmt = items_stmt.where(Incident.district == district)

    items_stmt = (
        items_stmt.order_by(Incident.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    items_res = await db.execute(items_stmt)
    incidents = items_res.scalars().all()
    items = [IncidentOut.model_validate(inc) for inc in incidents]

    return IncidentListOut(
        total=total,
        items=items,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{ticket_code}",
    response_model=IncidentDetailOut,
    summary="Tra cứu chi tiết sự cố theo mã phiếu",
)
async def get_incident_by_ticket_code(
    ticket_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> IncidentDetailOut:
    """
    Tra cứu chi tiết sự cố theo mã phiếu tra cứu công khai (ví dụ DN-202610-A1B2).
    Che giấu thông tin liên hệ người dân (PII masking) và ảnh gốc BEFORE_ORIGINAL nếu người gọi không phải ADMIN hoặc DISPATCHER.
    """
    clean_code = ticket_code.strip()
    stmt = (
        select(Incident)
        .where(Incident.ticket_code == clean_code)
        .options(
            selectinload(Incident.category),
            selectinload(Incident.assigned_department),
            selectinload(Incident.media),
            selectinload(Incident.history),
        )
    )
    result = await db.execute(stmt)
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy sự cố với mã phiếu '{clean_code}'.",
        )

    detail_out = IncidentDetailOut.model_validate(incident)

    is_privileged = current_user is not None and current_user.role in ["ADMIN", "DISPATCHER"]
    if not is_privileged:
        if detail_out.citizen_contact:
            detail_out.citizen_contact = mask_citizen_contact(detail_out.citizen_contact)
        detail_out.media = [m for m in detail_out.media if m.media_type != "BEFORE_ORIGINAL"]

    return detail_out
