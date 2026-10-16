"""Automated tests for Facebook Messenger Webhook verification and endpoints."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock

import httpx
import pytest

from app.core.config import settings
from app.core.database import get_db
from app.main import app
from app.models.incident import Incident, IncidentHistory, IncidentMedia
from app.services.messenger import messenger_session_manager


class MockResult:
    """Mock query result supporting scalar_one_or_none and all operations."""

    def __init__(self, data: object = None) -> None:
        self._data = data

    def scalar_one_or_none(self) -> object:
        return self._data

    def scalars(self) -> "MockResult":
        return self

    def all(self) -> list[object]:
        if self._data is None:
            return []
        if isinstance(self._data, list):
            return self._data
        return [self._data]


class MockAsyncSession:
    """Mock async database session avoiding live Docker DB dependencies."""

    def __init__(self) -> None:
        self.added: list[object] = []
        self.committed = False
        self.zone_id: str | None = "DANANG_CORE"

    def add(self, obj: object) -> None:
        self.added.append(obj)

    def add_all(self, objs: list[object]) -> None:
        self.added.extend(objs)

    async def commit(self) -> None:
        self.committed = True

    async def rollback(self) -> None:
        pass

    async def execute(self, stmt: object, *args: object, **kwargs: object) -> MockResult:
        stmt_str = str(stmt).lower()
        if "system_zones" in stmt_str:
            return MockResult(self.zone_id)
        if "incidents" in stmt_str and "ticket_code" in stmt_str:
            return MockResult(None)
        return MockResult(None)


@pytest.fixture
def mock_db_session() -> MockAsyncSession:
    return MockAsyncSession()


@pytest.fixture(autouse=True)
def clean_messenger_state(
    mock_db_session: MockAsyncSession,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    messenger_session_manager._sessions.clear()
    app.dependency_overrides[get_db] = lambda: mock_db_session

    private_dir = tmp_path / "uploads" / "private"
    public_dir = tmp_path / "uploads" / "public"
    private_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(
        "app.api.v1.endpoints.webhooks._get_upload_dirs",
        lambda: (private_dir, public_dir),
    )

    yield

    app.dependency_overrides.clear()
    messenger_session_manager._sessions.clear()


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


@pytest.mark.asyncio
async def test_webhook_post_not_a_page_object(client: httpx.AsyncClient) -> None:
    """Verify webhook rejects non-page objects with 200 NOT_A_PAGE."""
    response = await client.post(
        "/api/v1/webhooks/facebook",
        json={"object": "user", "entry": []},
    )
    assert response.status_code == 200
    assert response.text == "NOT_A_PAGE"


@pytest.mark.asyncio
async def test_webhook_post_text_only_sends_guidance(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify sending only text prompts user with guidance message."""
    mock_send = AsyncMock(return_value=True)
    monkeypatch.setattr("app.api.v1.endpoints.webhooks.send_facebook_message", mock_send)

    payload = {
        "object": "page",
        "entry": [
            {
                "id": "page_id_101",
                "messaging": [
                    {
                        "sender": {"id": "psid_user_guidance"},
                        "recipient": {"id": "page_id_101"},
                        "message": {
                            "mid": "mid_txt_1",
                            "text": "Xin chào hệ thống",
                        },
                    }
                ],
            }
        ],
    }

    response = await client.post("/api/v1/webhooks/facebook", json=payload)
    assert response.status_code == 200
    assert response.text == "EVENT_RECEIVED"

    mock_send.assert_awaited_once_with(
        "psid_user_guidance",
        "Chào bạn! Vui lòng gửi 01 bức ảnh hiện trường và chia sẻ vị trí của bạn để hệ thống tiếp nhận phản ánh sự cố đô thị.",
    )
    session = messenger_session_manager.get_session("psid_user_guidance")
    assert session is not None
    assert session.text == "Xin chào hệ thống"


@pytest.mark.asyncio
async def test_webhook_post_image_first_then_location(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify multi-step flow: citizen sends image first, then sends GPS location at Dragon Bridge."""
    mock_send = AsyncMock(return_value=True)
    mock_download = AsyncMock(return_value=b"fake-image-bytes-danang")
    mock_triage = AsyncMock()

    def _mock_anonymize(in_path: Path | str, out_path: Path | str, **kwargs: object) -> dict[str, object]:
        Path(out_path).write_bytes(b"blurred-image-bytes")
        return {
            "faces_detected": 1,
            "plates_detected": 0,
            "total_anonymized": 1,
            "output_path": str(out_path),
            "is_blurred": True,
        }

    monkeypatch.setattr("app.api.v1.endpoints.webhooks.send_facebook_message", mock_send)
    monkeypatch.setattr("app.api.v1.endpoints.webhooks.download_image_bytes", mock_download)
    monkeypatch.setattr("app.api.v1.endpoints.webhooks.anonymize_image", _mock_anonymize)
    monkeypatch.setattr("app.api.v1.endpoints.webhooks.process_incident_ai_triage", mock_triage)

    # Step 1: Citizen sends incident photo
    image_payload = {
        "object": "page",
        "entry": [
            {
                "id": "page_id_101",
                "messaging": [
                    {
                        "sender": {"id": "psid_dragon_bridge"},
                        "recipient": {"id": "page_id_101"},
                        "message": {
                            "mid": "mid_img_1",
                            "text": "Mặt cầu Rồng bị bong tróc nhựa đường",
                            "attachments": [
                                {
                                    "type": "image",
                                    "payload": {
                                        "url": "https://cdn.fbsbx.com/v/dragon_bridge.jpg"
                                    },
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    res_step1 = await client.post("/api/v1/webhooks/facebook", json=image_payload)
    assert res_step1.status_code == 200
    assert res_step1.text == "EVENT_RECEIVED"

    # Verify guidance asking for location
    mock_send.assert_awaited_with(
        "psid_dragon_bridge",
        "Hệ thống đã nhận được hình ảnh hiện trường. Vui lòng chia sẻ vị trí của bạn để hoàn tất phản ánh.",
    )
    session_step1 = messenger_session_manager.get_session("psid_dragon_bridge")
    assert session_step1 is not None
    assert session_step1.image_url == "https://cdn.fbsbx.com/v/dragon_bridge.jpg"
    assert session_step1.text == "Mặt cầu Rồng bị bong tróc nhựa đường"
    assert session_step1.lat is None
    assert len(mock_db_session.added) == 0

    # Step 2: Citizen shares Dragon Bridge GPS (lat=16.0611, long=108.2208)
    location_payload = {
        "object": "page",
        "entry": [
            {
                "id": "page_id_101",
                "messaging": [
                    {
                        "sender": {"id": "psid_dragon_bridge"},
                        "recipient": {"id": "page_id_101"},
                        "message": {
                            "mid": "mid_loc_1",
                            "attachments": [
                                {
                                    "type": "location",
                                    "payload": {
                                        "coordinates": {
                                            "lat": 16.0611,
                                            "long": 108.2208,
                                        }
                                    },
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    res_step2 = await client.post("/api/v1/webhooks/facebook", json=location_payload)
    assert res_step2.status_code == 200
    assert res_step2.text == "EVENT_RECEIVED"

    # Verify download and anonymization were executed
    mock_download.assert_awaited_once_with("https://cdn.fbsbx.com/v/dragon_bridge.jpg")

    # Verify Incident creation in database
    incident = next((o for o in mock_db_session.added if isinstance(o, Incident)), None)
    assert incident is not None
    assert incident.channel == "MESSENGER"
    assert incident.ticket_code.startswith("DN-")
    assert len(incident.ticket_code) == 14  # DN-YYYYMM-XXXX: 3 + 6 + 1 + 4 = 14
    assert incident.citizen_contact == "FB_PSID:psid_dragon_bridge"
    assert incident.description == "Mặt cầu Rồng bị bong tróc nhựa đường"
    assert incident.priority == "NORMAL"
    assert incident.status == "SUBMITTED"
    assert incident.address_text == "Đà Nẵng (GPS: 16.06110, 108.22080)"
    assert mock_db_session.committed is True

    # Verify Media records
    media_items = [o for o in mock_db_session.added if isinstance(o, IncidentMedia)]
    assert len(media_items) == 2
    orig_media = next(m for m in media_items if m.media_type == "BEFORE_ORIGINAL")
    anon_media = next(m for m in media_items if m.media_type == "BEFORE_ANONYMIZED")
    assert orig_media.file_url.endswith("_orig_messenger.jpg")
    assert anon_media.file_url.startswith("/uploads/public/")
    assert anon_media.file_url.endswith("_anon_messenger.jpg")

    # Verify History record
    history = next((o for o in mock_db_session.added if isinstance(o, IncidentHistory)), None)
    assert history is not None
    assert history.from_status is None
    assert history.to_status == "SUBMITTED"

    # Verify background task was queued
    mock_triage.assert_called_once()
    assert mock_triage.call_args.kwargs["incident_id"] == incident.id
    assert mock_triage.call_args.kwargs["description"] == incident.description

    # Verify success confirmation message sent to citizen
    last_call = mock_send.await_args_list[-1]
    assert last_call.args[0] == "psid_dragon_bridge"
    assert f"Mã tra cứu: {incident.ticket_code}." in last_call.args[1]

    # Verify session is cleaned up
    assert messenger_session_manager.get_session("psid_dragon_bridge") is None


@pytest.mark.asyncio
async def test_webhook_post_location_first_then_image(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify flow when citizen shares GPS location first, then sends photo."""
    mock_send = AsyncMock(return_value=True)
    mock_download = AsyncMock(return_value=b"fake-image-bytes-location-first")
    mock_triage = AsyncMock()

    def _mock_anonymize(in_path: Path | str, out_path: Path | str, **kwargs: object) -> dict[str, object]:
        Path(out_path).write_bytes(b"blurred-image-bytes")
        return {
            "faces_detected": 0,
            "plates_detected": 0,
            "total_anonymized": 0,
            "output_path": str(out_path),
            "is_blurred": False,
        }

    monkeypatch.setattr("app.api.v1.endpoints.webhooks.send_facebook_message", mock_send)
    monkeypatch.setattr("app.api.v1.endpoints.webhooks.download_image_bytes", mock_download)
    monkeypatch.setattr("app.api.v1.endpoints.webhooks.anonymize_image", _mock_anonymize)
    monkeypatch.setattr("app.api.v1.endpoints.webhooks.process_incident_ai_triage", mock_triage)

    # Step 1: Send location first
    loc_payload = {
        "object": "page",
        "entry": [
            {
                "id": "page_id_101",
                "messaging": [
                    {
                        "sender": {"id": "psid_loc_first"},
                        "recipient": {"id": "page_id_101"},
                        "message": {
                            "mid": "mid_loc_first",
                            "attachments": [
                                {
                                    "type": "location",
                                    "payload": {
                                        "coordinates": {
                                            "lat": 16.0611,
                                            "long": 108.2208,
                                        }
                                    },
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    res1 = await client.post("/api/v1/webhooks/facebook", json=loc_payload)
    assert res1.status_code == 200
    mock_send.assert_awaited_with(
        "psid_loc_first",
        "Hệ thống đã xác nhận vị trí của bạn tại Đà Nẵng. Vui lòng gửi thêm 01 bức ảnh chụp hiện trường sự cố.",
    )
    session = messenger_session_manager.get_session("psid_loc_first")
    assert session is not None
    assert session.lat == 16.0611
    assert session.long == 108.2208
    assert session.image_url is None
    assert len(mock_db_session.added) == 0

    # Step 2: Send image afterwards
    img_payload = {
        "object": "page",
        "entry": [
            {
                "id": "page_id_101",
                "messaging": [
                    {
                        "sender": {"id": "psid_loc_first"},
                        "recipient": {"id": "page_id_101"},
                        "message": {
                            "mid": "mid_img_second",
                            "text": "Cây đổ chắn đường Bạch Đằng",
                            "attachments": [
                                {
                                    "type": "image",
                                    "payload": {
                                        "url": "https://cdn.fbsbx.com/v/fallen_tree.jpg"
                                    },
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    res2 = await client.post("/api/v1/webhooks/facebook", json=img_payload)
    assert res2.status_code == 200
    incident = next((o for o in mock_db_session.added if isinstance(o, Incident)), None)
    assert incident is not None
    assert incident.channel == "MESSENGER"
    assert incident.ticket_code.startswith("DN-")
    assert incident.description == "Cây đổ chắn đường Bạch Đằng"
    assert mock_db_session.committed is True
    assert messenger_session_manager.get_session("psid_loc_first") is None


@pytest.mark.asyncio
async def test_webhook_post_location_out_of_bounds_geofence(
    client: httpx.AsyncClient,
    mock_db_session: MockAsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify rejection when citizen shares GPS location outside Da Nang (e.g. Hanoi)."""
    mock_send = AsyncMock(return_value=True)
    monkeypatch.setattr("app.api.v1.endpoints.webhooks.send_facebook_message", mock_send)

    # Set mock DB zone lookup to None (out of bounds)
    mock_db_session.zone_id = None

    payload = {
        "object": "page",
        "entry": [
            {
                "id": "page_id_101",
                "messaging": [
                    {
                        "sender": {"id": "psid_hanoi_user"},
                        "recipient": {"id": "page_id_101"},
                        "message": {
                            "mid": "mid_hanoi",
                            "attachments": [
                                {
                                    "type": "location",
                                    "payload": {
                                        "coordinates": {
                                            "lat": 21.0285,
                                            "long": 105.8542,
                                        }
                                    },
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    response = await client.post("/api/v1/webhooks/facebook", json=payload)
    assert response.status_code == 200
    assert response.text == "EVENT_RECEIVED"

    mock_send.assert_awaited_once_with(
        "psid_hanoi_user",
        "Hiện tại hệ thống chỉ tiếp nhận sự cố trong Vùng Đô thị Trung tâm Đà Nẵng (Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Cẩm Lệ, Liên Chiểu, Hòa Vang). Vị trí bạn chia sẻ nằm ngoài phạm vi hỗ trợ.",
    )
    assert messenger_session_manager.get_session("psid_hanoi_user") is None
    assert len(mock_db_session.added) == 0


@pytest.mark.asyncio
async def test_webhook_post_non_message_item_ignored(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify delivery receipts or items without message object are safely ignored."""
    mock_send = AsyncMock(return_value=True)
    monkeypatch.setattr("app.api.v1.endpoints.webhooks.send_facebook_message", mock_send)

    payload = {
        "object": "page",
        "entry": [
            {
                "id": "page_id_101",
                "messaging": [
                    {
                        "sender": {"id": "psid_receipt"},
                        "recipient": {"id": "page_id_101"},
                        "message": None,
                    }
                ],
            }
        ],
    }

    response = await client.post("/api/v1/webhooks/facebook", json=payload)
    assert response.status_code == 200
    assert response.text == "EVENT_RECEIVED"
    mock_send.assert_not_called()


def test_webhook_session_expiration_cleanup() -> None:
    """Verify cleanup of expired Messenger sessions older than 15 minutes."""
    psid_expired = "psid_expired_1"
    psid_active = "psid_active_2"

    session_exp = messenger_session_manager.get_or_create_session(psid_expired)
    session_exp.updated_at = datetime.now(timezone.utc) - timedelta(minutes=16)

    session_act = messenger_session_manager.get_or_create_session(psid_active)
    session_act.updated_at = datetime.now(timezone.utc) - timedelta(minutes=5)

    purged = messenger_session_manager.cleanup_expired_sessions(ttl_seconds=900)
    assert purged == 1
    assert messenger_session_manager.get_session(psid_expired) is None
    assert messenger_session_manager.get_session(psid_active) is not None

