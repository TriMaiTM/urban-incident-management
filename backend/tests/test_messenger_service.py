"""Unit tests for Facebook Messenger session manager and communication services."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
import httpx
import pytest

from app.core.config import settings
from app.services.messenger import (
    MessengerSession,
    MessengerSessionManager,
    download_image_bytes,
    messenger_session_manager,
    send_facebook_message,
)


# ---------------------------------------------------------------------------
# 1. Tests for MessengerSession
# ---------------------------------------------------------------------------


def test_messenger_session_init_defaults() -> None:
    """Test default values on MessengerSession initialization."""
    session = MessengerSession(psid="user_123")
    assert session.psid == "user_123"
    assert session.image_url is None
    assert session.lat is None
    assert session.long is None
    assert session.text is None
    assert session.updated_at.tzinfo is not None
    assert not session.is_complete()


def test_messenger_session_is_complete() -> None:
    """Test is_complete returns True only when both image and coordinates are present."""
    session = MessengerSession(psid="user_123")
    assert not session.is_complete()

    # Image only
    session.image_url = "https://example.com/photo.jpg"
    assert not session.is_complete()

    # Empty string image
    session.image_url = ""
    session.lat = 16.0611
    session.long = 108.2208
    assert not session.is_complete()

    # Only lat without long
    session.image_url = "https://example.com/photo.jpg"
    session.lat = 16.0611
    session.long = None
    assert not session.is_complete()

    # Only long without lat
    session.lat = None
    session.long = 108.2208
    assert not session.is_complete()

    # Complete
    session.lat = 16.0611
    assert session.is_complete()


def test_messenger_session_is_expired() -> None:
    """Test session TTL expiration logic with timezone-aware and naive datetimes."""
    now = datetime.now(timezone.utc)
    session = MessengerSession(psid="user_123", updated_at=now)

    assert not session.is_expired(ttl_seconds=900)

    # 10 minutes ago -> not expired at 900s
    session.updated_at = now - timedelta(seconds=600)
    assert not session.is_expired(ttl_seconds=900)

    # 16 minutes ago -> expired at 900s
    session.updated_at = now - timedelta(seconds=960)
    assert session.is_expired(ttl_seconds=900)

    # Custom short TTL
    session.updated_at = now - timedelta(seconds=35)
    assert session.is_expired(ttl_seconds=30)
    assert not session.is_expired(ttl_seconds=60)

    # Naive UTC datetime handling
    naive_past = (datetime.now(timezone.utc) - timedelta(seconds=1200)).replace(tzinfo=None)
    session.updated_at = naive_past
    assert session.is_expired(ttl_seconds=900)


# ---------------------------------------------------------------------------
# 2. Tests for MessengerSessionManager
# ---------------------------------------------------------------------------


def test_manager_get_or_create_session() -> None:
    """Test get_or_create_session returns new and cached instances."""
    mgr = MessengerSessionManager()
    session1 = mgr.get_or_create_session("psid_1")
    assert session1.psid == "psid_1"

    session2 = mgr.get_or_create_session("psid_1")
    assert session1 is session2


def test_manager_get_or_create_replaces_expired() -> None:
    """Test get_or_create_session recreates an expired session."""
    mgr = MessengerSessionManager()
    session = mgr.get_or_create_session("psid_1")
    session.image_url = "https://example.com/old.jpg"
    session.updated_at = datetime.now(timezone.utc) - timedelta(seconds=1000)

    new_session = mgr.get_or_create_session("psid_1")
    assert new_session is not session
    assert new_session.image_url is None
    assert not new_session.is_expired()


def test_manager_get_session() -> None:
    """Test get_session retrieves existing session or None if absent/expired."""
    mgr = MessengerSessionManager()
    assert mgr.get_session("nonexistent") is None

    session = mgr.get_or_create_session("active_user")
    assert mgr.get_session("active_user") is session

    session.updated_at = datetime.now(timezone.utc) - timedelta(seconds=1000)
    assert mgr.get_session("active_user") is None
    assert "active_user" not in mgr._sessions


def test_manager_update_methods() -> None:
    """Test update_image, update_location, and update_text."""
    mgr = MessengerSessionManager()
    past_time = datetime.now(timezone.utc) - timedelta(seconds=100)

    # Update image
    session = mgr.get_or_create_session("user_test")
    session.updated_at = past_time
    mgr.update_image("user_test", "https://cdn.example.com/danang.jpg")
    assert session.image_url == "https://cdn.example.com/danang.jpg"
    assert session.updated_at > past_time

    # Update location
    mark_time = session.updated_at
    mgr.update_location("user_test", lat=16.0611, long=108.2208)
    assert session.lat == 16.0611
    assert session.long == 108.2208
    assert session.updated_at >= mark_time

    # Update text
    mgr.update_text("user_test", "Cây đổ chắn đường Bạch Đằng")
    assert session.text == "Cây đổ chắn đường Bạch Đằng"
    assert session.is_complete()


def test_manager_clear_session() -> None:
    """Test clearing session removes it safely."""
    mgr = MessengerSessionManager()
    mgr.get_or_create_session("user_to_delete")
    assert "user_to_delete" in mgr._sessions

    mgr.clear_session("user_to_delete")
    assert "user_to_delete" not in mgr._sessions

    # Safe to call on nonexistent key
    mgr.clear_session("user_to_delete")


def test_manager_cleanup_expired_sessions() -> None:
    """Test batch cleanup of expired sessions."""
    mgr = MessengerSessionManager()
    now = datetime.now(timezone.utc)

    # Active session
    s_active = mgr.get_or_create_session("active_1")
    s_active.updated_at = now - timedelta(seconds=200)

    # Expired session 1
    s_exp1 = mgr.get_or_create_session("expired_1")
    s_exp1.updated_at = now - timedelta(seconds=1000)

    # Expired session 2
    s_exp2 = mgr.get_or_create_session("expired_2")
    s_exp2.updated_at = now - timedelta(seconds=1500)

    removed = mgr.cleanup_expired_sessions(ttl_seconds=900)
    assert removed == 2
    assert "active_1" in mgr._sessions
    assert "expired_1" not in mgr._sessions
    assert "expired_2" not in mgr._sessions


def test_singleton_instance_available() -> None:
    """Test that the singleton manager is pre-initialized and ready."""
    assert isinstance(messenger_session_manager, MessengerSessionManager)


# ---------------------------------------------------------------------------
# 3. Tests for send_facebook_message
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_send_facebook_message_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test successful message sending via Facebook Send API."""
    monkeypatch.setattr(settings, "FACEBOOK_PAGE_ACCESS_TOKEN", "valid_page_token")

    mock_response = httpx.Response(
        status_code=200,
        json={"recipient_id": "psid_999", "message_id": "mid.12345"},
        request=httpx.Request("POST", "https://graph.facebook.com/v21.0/me/messages"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        result = await send_facebook_message(
            psid="psid_999",
            text="Hệ thống đã ghi nhận phản ánh.",
        )

        assert result is True
        mock_post.assert_awaited_once()
        args, kwargs = mock_post.call_args
        assert args[0] == "https://graph.facebook.com/v21.0/me/messages"
        assert kwargs["params"] == {"access_token": "valid_page_token"}
        assert kwargs["json"] == {
            "recipient": {"id": "psid_999"},
            "message": {"text": "Hệ thống đã ghi nhận phản ánh."},
            "messaging_type": "RESPONSE",
        }


@pytest.mark.asyncio
async def test_send_facebook_message_with_custom_token() -> None:
    """Test send_facebook_message uses explicitly supplied page_token."""
    mock_response = httpx.Response(
        status_code=200,
        json={"success": True},
        request=httpx.Request("POST", "https://graph.facebook.com/v21.0/me/messages"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        result = await send_facebook_message(
            psid="psid_custom",
            text="Xin chào",
            page_token="explicit_token_xyz",
        )

        assert result is True
        _, kwargs = mock_post.call_args
        assert kwargs["params"] == {"access_token": "explicit_token_xyz"}


@pytest.mark.asyncio
async def test_send_facebook_message_no_token_returns_false(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test send_facebook_message aborts gracefully if no token is configured."""
    monkeypatch.setattr(settings, "FACEBOOK_PAGE_ACCESS_TOKEN", "")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        result = await send_facebook_message(psid="psid_none", text="Hello")

        assert result is False
        mock_post.assert_not_called()


@pytest.mark.asyncio
async def test_send_facebook_message_api_error_returns_false(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test send_facebook_message handles non-200 responses without crashing."""
    monkeypatch.setattr(settings, "FACEBOOK_PAGE_ACCESS_TOKEN", "valid_page_token")

    mock_response = httpx.Response(
        status_code=400,
        json={"error": {"message": "Invalid recipient PSID", "type": "OAuthException", "code": 100}},
        request=httpx.Request("POST", "https://graph.facebook.com/v21.0/me/messages"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        result = await send_facebook_message(psid="invalid_psid", text="Fail test")

        assert result is False


@pytest.mark.asyncio
async def test_send_facebook_message_network_exception_returns_false(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test send_facebook_message catches network exceptions and returns False."""
    monkeypatch.setattr(settings, "FACEBOOK_PAGE_ACCESS_TOKEN", "valid_page_token")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ConnectTimeout("Connection timed out")

        result = await send_facebook_message(psid="psid_timeout", text="Timeout test")

        assert result is False


# ---------------------------------------------------------------------------
# 4. Tests for download_image_bytes
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_download_image_bytes_success() -> None:
    """Test downloading valid image bytes from URL."""
    fake_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIFfakeimagepayload"
    mock_response = httpx.Response(
        status_code=200,
        content=fake_bytes,
        request=httpx.Request("GET", "https://cdn.example.com/incident.jpg"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        data = await download_image_bytes("https://cdn.example.com/incident.jpg")
        assert data == fake_bytes
        mock_get.assert_awaited_once_with("https://cdn.example.com/incident.jpg")


@pytest.mark.asyncio
async def test_download_image_bytes_http_error() -> None:
    """Test downloading image raises HTTPStatusError on 404."""
    mock_response = httpx.Response(
        status_code=404,
        content=b"Not Found",
        request=httpx.Request("GET", "https://cdn.example.com/missing.jpg"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        with pytest.raises(httpx.HTTPStatusError):
            await download_image_bytes("https://cdn.example.com/missing.jpg")


@pytest.mark.asyncio
async def test_download_image_bytes_empty_content_raises_value_error() -> None:
    """Test downloading empty content raises ValueError."""
    mock_response = httpx.Response(
        status_code=200,
        content=b"",
        request=httpx.Request("GET", "https://cdn.example.com/empty.jpg"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        with pytest.raises(ValueError, match="is empty"):
            await download_image_bytes("https://cdn.example.com/empty.jpg")


@pytest.mark.asyncio
async def test_download_image_bytes_network_exception() -> None:
    """Test downloading image raises network exceptions."""
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.ConnectTimeout("Request timed out")

        with pytest.raises(httpx.ConnectTimeout):
            await download_image_bytes("https://cdn.example.com/timeout.jpg")
