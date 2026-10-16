"""Endpoints for Facebook Messenger Webhooks."""

from datetime import datetime, timezone
import logging
from pathlib import Path
import secrets
import string
from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from geoalchemy2.functions import ST_Contains, ST_MakePoint, ST_SetSRID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.incidents import _get_upload_dirs, process_incident_ai_triage
from app.core.config import settings
from app.core.database import get_db
from app.models.incident import Incident, IncidentHistory, IncidentMedia
from app.models.zone import SystemZone
from app.schemas.webhook import FacebookWebhookPayload
from app.services.anonymizer import anonymize_image
from app.services.messenger import (
    download_image_bytes,
    messenger_session_manager,
    send_facebook_message,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.get("/facebook", response_class=Response)
async def verify_facebook_webhook(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
) -> Response:
    """Xác minh Webhook từ Meta Developer Platform."""
    if (
        hub_mode != "subscribe"
        or not hub_verify_token
        or not settings.FACEBOOK_VERIFY_TOKEN
        or not secrets.compare_digest(hub_verify_token, settings.FACEBOOK_VERIFY_TOKEN)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Xác minh Webhook thất bại. Token không hợp lệ.",
        )

    return Response(
        content=str(hub_challenge or ""),
        media_type="text/plain",
        status_code=status.HTTP_200_OK,
    )


@router.post(
    "/facebook",
    status_code=status.HTTP_200_OK,
    summary="Tiếp nhận sự kiện từ Facebook Messenger Webhook",
)
async def handle_facebook_webhook(
    payload: FacebookWebhookPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Xử lý sự kiện tin nhắn, ảnh, và tọa độ từ Facebook Messenger."""
    if payload.object != "page":
        return Response(content="NOT_A_PAGE", media_type="text/plain", status_code=200)

    # Tự động dọn dẹp các session bỏ dở quá hạn (TTL 15 phút)
    messenger_session_manager.cleanup_expired_sessions()

    for entry in payload.entry:
        for item in entry.messaging:
            psid = item.sender.id
            if not item.message:
                continue

            session = messenger_session_manager.get_or_create_session(psid)

            # 1. Xử lý tin nhắn văn bản
            if item.message.text:
                session = messenger_session_manager.update_text(psid, item.message.text.strip())
                if not item.message.attachments:
                    if not session.is_complete():
                        await send_facebook_message(
                            psid,
                            "Chào bạn! Vui lòng gửi 01 bức ảnh hiện trường và chia sẻ vị trí của bạn để hệ thống tiếp nhận phản ánh sự cố đô thị.",
                        )

            # 2. Xử lý tệp đính kèm (attachments)
            if item.message.attachments:
                image_prompt_sent = False
                for att in item.message.attachments:
                    if att.type == "image" and att.payload and att.payload.url:
                        session = messenger_session_manager.update_image(psid, att.payload.url)
                        if (session.lat is None or session.long is None) and not image_prompt_sent:
                            image_prompt_sent = True
                            await send_facebook_message(
                                psid,
                                "Hệ thống đã nhận được hình ảnh hiện trường. Vui lòng chia sẻ vị trí của bạn để hoàn tất phản ánh.",
                            )
                    elif att.type == "location" and att.payload and att.payload.coordinates:
                        lat = att.payload.coordinates.lat
                        long = att.payload.coordinates.long

                        # Thẩm định hàng rào địa lý PostGIS Đà Nẵng: (long trước, lat sau - Bài học 7)
                        point_geom = ST_SetSRID(ST_MakePoint(long, lat), 4326)
                        zone_stmt = (
                            select(SystemZone.id)
                            .where(
                                SystemZone.is_active.is_(True),
                                ST_Contains(SystemZone.boundary, point_geom),
                            )
                            .limit(1)
                        )
                        zone_res = await db.execute(zone_stmt)
                        if zone_res.scalar_one_or_none() is None:
                            messenger_session_manager.clear_session(psid)
                            session = None
                            await send_facebook_message(
                                psid,
                                "Hiện tại hệ thống chỉ tiếp nhận sự cố trong Vùng Đô thị Trung tâm Đà Nẵng (Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Cẩm Lệ, Liên Chiểu, Hòa Vang). Vị trí bạn chia sẻ nằm ngoài phạm vi hỗ trợ.",
                            )
                            continue

                        session = messenger_session_manager.update_location(psid, lat, long)
                        if not session.image_url:
                            await send_facebook_message(
                                psid,
                                "Hệ thống đã xác nhận vị trí của bạn tại Đà Nẵng. Vui lòng gửi thêm 01 bức ảnh chụp hiện trường sự cố.",
                            )

            # 3. Kiểm tra hoàn thành session (đủ ảnh và tọa độ GPS)
            if session and session.is_complete():
                try:
                    assert session.image_url is not None
                    assert session.lat is not None
                    assert session.long is not None

                    image_bytes = await download_image_bytes(session.image_url)
                    private_dir, public_dir = _get_upload_dirs()

                    incident_id = uuid4()
                    orig_filename = f"{incident_id.hex}_orig_messenger.jpg"
                    anon_filename = f"{incident_id.hex}_anon_messenger.jpg"

                    orig_path = private_dir / orig_filename
                    anon_path = public_dir / anon_filename

                    with open(orig_path, "wb") as f:
                        f.write(image_bytes)

                    anonymize_image(orig_path, anon_path)

                    now = datetime.now(timezone.utc)
                    month_str = now.strftime("%Y%m")

                    # Sinh mã phiếu DN-YYYYMM-XXXX với collision guard (Bài học 13)
                    service_request_id = f"DN-{month_str}-{''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))}"
                    for _ in range(5):
                        exists_stmt = (
                            select(Incident.id)
                            .where(Incident.ticket_code == service_request_id)
                            .limit(1)
                        )
                        if (await db.execute(exists_stmt)).scalar_one_or_none() is None:
                            break
                        service_request_id = f"DN-{month_str}-{''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))}"

                    incident = Incident(
                        id=incident_id,
                        ticket_code=service_request_id,
                        title="Phản ánh qua Facebook Messenger",
                        description=session.text or "Phản ánh hiện trường sự cố đô thị qua kênh Facebook Messenger",
                        priority="NORMAL",
                        status="SUBMITTED",
                        channel="MESSENGER",
                        citizen_contact=f"FB_PSID:{psid}",
                        address_text=f"Đà Nẵng (GPS: {session.lat:.5f}, {session.long:.5f})",
                        location=ST_SetSRID(ST_MakePoint(session.long, session.lat), 4326),
                        duplicate_count=0,
                        created_at=now,
                    )

                    orig_media = IncidentMedia(
                        incident_id=incident_id,
                        media_type="BEFORE_ORIGINAL",
                        file_url=str(private_dir / orig_filename),
                    )
                    anon_media = IncidentMedia(
                        incident_id=incident_id,
                        media_type="BEFORE_ANONYMIZED",
                        file_url=f"/uploads/public/{anon_filename}",
                    )
                    history = IncidentHistory(
                        incident_id=incident_id,
                        from_status=None,
                        to_status="SUBMITTED",
                        note="Tiếp nhận phản ánh từ Facebook Messenger Webhook",
                    )

                    db.add_all([incident, orig_media, anon_media, history])
                    await db.commit()

                    background_tasks.add_task(
                        process_incident_ai_triage,
                        incident_id=incident_id,
                        image_path=str(public_dir / anon_filename),
                        description=incident.description,
                    )

                    await send_facebook_message(
                        psid,
                        f"Cảm ơn bạn! Phản ánh sự cố đã được tiếp nhận thành công vào hệ thống đô thị Đà Nẵng. Mã tra cứu: {service_request_id}.",
                    )
                    messenger_session_manager.clear_session(psid)
                except Exception as exc:
                    logger.exception(
                        "Lỗi khi xử lý phản ánh sự cố hoàn tất từ PSID %s: %s",
                        psid,
                        exc,
                    )
                    await db.rollback()
                    await send_facebook_message(
                        psid,
                        "Rất tiếc, đã có lỗi xảy ra trong quá trình xử lý ảnh hiện trường. Vui lòng gửi lại bức ảnh để hệ thống thử lại.",
                    )

    return Response(content="EVENT_RECEIVED", media_type="text/plain", status_code=200)

