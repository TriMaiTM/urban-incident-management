"""Endpoints for Facebook Messenger Webhooks."""

import secrets

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.core.config import settings

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
