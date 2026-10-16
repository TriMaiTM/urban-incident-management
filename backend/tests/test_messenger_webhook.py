"""Automated tests for Facebook Messenger Webhook verification and endpoints."""

import httpx
import pytest

from app.core.config import settings


@pytest.mark.asyncio
async def test_webhook_verification_success(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify webhook responds with challenge when mode and token match."""
    monkeypatch.setattr(settings, "FACEBOOK_VERIFY_TOKEN", "danang_verify_secret_2026")

    response = await client.get(
        "/api/v1/webhooks/facebook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "danang_verify_secret_2026",
            "hub.challenge": "11582012",
        },
    )

    assert response.status_code == 200
    assert response.text == "11582012"
    assert response.headers["content-type"].startswith("text/plain")


@pytest.mark.asyncio
async def test_webhook_verification_invalid_token(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify webhook returns 403 Forbidden when verify token does not match."""
    monkeypatch.setattr(settings, "FACEBOOK_VERIFY_TOKEN", "danang_verify_secret_2026")

    response = await client.get(
        "/api/v1/webhooks/facebook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token_value",
            "hub.challenge": "11582012",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Xác minh Webhook thất bại. Token không hợp lệ."


@pytest.mark.asyncio
async def test_webhook_verification_invalid_mode(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify webhook returns 403 Forbidden when hub.mode is not 'subscribe'."""
    monkeypatch.setattr(settings, "FACEBOOK_VERIFY_TOKEN", "danang_verify_secret_2026")

    response = await client.get(
        "/api/v1/webhooks/facebook",
        params={
            "hub.mode": "unsubscribe",
            "hub.verify_token": "danang_verify_secret_2026",
            "hub.challenge": "11582012",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Xác minh Webhook thất bại. Token không hợp lệ."


@pytest.mark.asyncio
async def test_webhook_verification_missing_params(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify webhook returns 403 Forbidden when required query parameters are missing."""
    monkeypatch.setattr(settings, "FACEBOOK_VERIFY_TOKEN", "danang_verify_secret_2026")

    # Missing all parameters
    res_none = await client.get("/api/v1/webhooks/facebook")
    assert res_none.status_code == 403

    # Missing hub.mode
    res_no_mode = await client.get(
        "/api/v1/webhooks/facebook",
        params={
            "hub.verify_token": "danang_verify_secret_2026",
            "hub.challenge": "11582012",
        },
    )
    assert res_no_mode.status_code == 403

    # Missing hub.verify_token
    res_no_token = await client.get(
        "/api/v1/webhooks/facebook",
        params={
            "hub.mode": "subscribe",
            "hub.challenge": "11582012",
        },
    )
    assert res_no_token.status_code == 403


@pytest.mark.asyncio
async def test_webhook_verification_empty_server_token(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify webhook returns 403 Forbidden if server verify token is empty/unconfigured."""
    monkeypatch.setattr(settings, "FACEBOOK_VERIFY_TOKEN", "")

    response = await client.get(
        "/api/v1/webhooks/facebook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "",
            "hub.challenge": "11582012",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Xác minh Webhook thất bại. Token không hợp lệ."


@pytest.mark.asyncio
async def test_webhook_verification_challenge_empty_fallback(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify webhook responds with empty body when challenge is omitted."""
    monkeypatch.setattr(settings, "FACEBOOK_VERIFY_TOKEN", "danang_verify_secret_2026")

    response = await client.get(
        "/api/v1/webhooks/facebook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "danang_verify_secret_2026",
        },
    )

    assert response.status_code == 200
    assert response.text == ""
    assert response.headers["content-type"].startswith("text/plain")
