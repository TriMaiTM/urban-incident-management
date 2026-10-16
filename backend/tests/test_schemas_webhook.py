"""Unit tests for Meta Facebook Messenger Webhook Pydantic schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.webhook import (
    FacebookCoordinates,
    FacebookLocationPayload,
    FacebookAttachmentPayload,
    FacebookAttachment,
    FacebookMessage,
    FacebookParticipant,
    FacebookMessagingItem,
    FacebookEntry,
    FacebookWebhookPayload,
    FacebookVerifyQuery,
)


def test_facebook_coordinates_valid():
    """Verify valid coordinates parsing and alias compatibility."""
    coord = FacebookCoordinates(lat=16.0544, long=108.2022)
    assert coord.lat == 16.0544
    assert coord.long == 108.2022
    assert FacebookLocationPayload is FacebookCoordinates

    # Extra fields ignored
    coord_extra = FacebookCoordinates.model_validate(
        {"lat": 16.0, "long": 108.0, "altitude": 10.5, "extra": "data"}
    )
    assert coord_extra.lat == 16.0
    assert coord_extra.long == 108.0


def test_facebook_coordinates_missing_fields():
    """Verify ValidationError when lat or long is missing."""
    with pytest.raises(ValidationError):
        FacebookCoordinates.model_validate({"lat": 16.0544})

    with pytest.raises(ValidationError):
        FacebookCoordinates.model_validate({"long": 108.2022})


def test_facebook_attachment_payload():
    """Verify image url payload and location coordinates payload."""
    # Image payload
    img_payload = FacebookAttachmentPayload(url="https://example.com/photo.jpg")
    assert img_payload.url == "https://example.com/photo.jpg"
    assert img_payload.coordinates is None

    # Location payload
    loc_payload = FacebookAttachmentPayload(
        coordinates=FacebookCoordinates(lat=16.0611, long=108.2208)
    )
    assert loc_payload.url is None
    assert loc_payload.coordinates is not None
    assert loc_payload.coordinates.lat == 16.0611
    assert loc_payload.coordinates.long == 108.2208

    # Empty payload defaults to None
    empty_payload = FacebookAttachmentPayload()
    assert empty_payload.url is None
    assert empty_payload.coordinates is None


def test_facebook_attachment():
    """Verify attachment types and extra fields ignore behavior."""
    att = FacebookAttachment.model_validate(
        {
            "type": "image",
            "payload": {"url": "https://example.com/incident.jpg"},
            "title": "Incident photo",
        }
    )
    assert att.type == "image"
    assert att.payload is not None
    assert att.payload.url == "https://example.com/incident.jpg"

    # Missing type raises ValidationError
    with pytest.raises(ValidationError):
        FacebookAttachment.model_validate({"payload": {"url": "https://example.com"}})


def test_facebook_message_text_only():
    """Verify text message parsing."""
    msg = FacebookMessage.model_validate(
        {
            "mid": "mid.1234567890:abcdef",
            "text": "Có ổ gà lớn trước số 120 đường Nguyễn Văn Linh",
        }
    )
    assert msg.mid == "mid.1234567890:abcdef"
    assert msg.text == "Có ổ gà lớn trước số 120 đường Nguyễn Văn Linh"
    assert msg.attachments is None


def test_facebook_message_missing_mid():
    """Verify mid is required for FacebookMessage."""
    with pytest.raises(ValidationError):
        FacebookMessage.model_validate({"text": "Hello"})


def test_facebook_participant():
    """Verify participant PSID parsing and required validation."""
    p = FacebookParticipant(id="psid_9876543210")
    assert p.id == "psid_9876543210"

    with pytest.raises(ValidationError):
        FacebookParticipant.model_validate({})


def test_facebook_webhook_payload_text_event():
    """Verify full webhook payload for standard citizen text report."""
    raw_payload = {
        "object": "page",
        "entry": [
            {
                "id": "PAGE_11223344",
                "time": 1729074000000,
                "messaging": [
                    {
                        "sender": {"id": "PSID_USER_01"},
                        "recipient": {"id": "PAGE_11223344"},
                        "timestamp": 1729074000100,
                        "message": {
                            "mid": "mid.12345",
                            "text": "Đèn đường tại ngã tư Lê Duẩn bị hỏng",
                        },
                    }
                ],
            }
        ],
    }

    payload = FacebookWebhookPayload.model_validate(raw_payload)
    assert payload.object == "page"
    assert len(payload.entry) == 1

    entry = payload.entry[0]
    assert entry.id == "PAGE_11223344"
    assert entry.time == 1729074000000
    assert len(entry.messaging) == 1

    item = entry.messaging[0]
    assert item.sender.id == "PSID_USER_01"
    assert item.recipient.id == "PAGE_11223344"
    assert item.timestamp == 1729074000100
    assert item.message is not None
    assert item.message.mid == "mid.12345"
    assert item.message.text == "Đèn đường tại ngã tư Lê Duẩn bị hỏng"
    assert item.message.attachments is None


def test_facebook_webhook_payload_image_attachment():
    """Verify webhook payload parsing with an image attachment."""
    raw_payload = {
        "object": "page",
        "entry": [
            {
                "id": "PAGE_11223344",
                "time": 1729074000000,
                "messaging": [
                    {
                        "sender": {"id": "PSID_USER_01"},
                        "recipient": {"id": "PAGE_11223344"},
                        "timestamp": 1729074000200,
                        "message": {
                            "mid": "mid.67890",
                            "attachments": [
                                {
                                    "type": "image",
                                    "payload": {
                                        "url": "https://cdn.fbsbx.com/v/t59.27/incident_scene.jpg"
                                    },
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    payload = FacebookWebhookPayload.model_validate(raw_payload)
    item = payload.entry[0].messaging[0]
    assert item.message is not None
    assert item.message.attachments is not None
    assert len(item.message.attachments) == 1

    attachment = item.message.attachments[0]
    assert attachment.type == "image"
    assert attachment.payload is not None
    assert (
        attachment.payload.url
        == "https://cdn.fbsbx.com/v/t59.27/incident_scene.jpg"
    )
    assert attachment.payload.coordinates is None


def test_facebook_webhook_payload_location_attachment():
    """Verify webhook payload parsing with a GPS location attachment."""
    raw_payload = {
        "object": "page",
        "entry": [
            {
                "id": "PAGE_11223344",
                "time": 1729074000000,
                "messaging": [
                    {
                        "sender": {"id": "PSID_USER_01"},
                        "recipient": {"id": "PAGE_11223344"},
                        "timestamp": 1729074000300,
                        "message": {
                            "mid": "mid.99999",
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

    payload = FacebookWebhookPayload.model_validate(raw_payload)
    item = payload.entry[0].messaging[0]
    assert item.message is not None
    assert item.message.attachments is not None

    attachment = item.message.attachments[0]
    assert attachment.type == "location"
    assert attachment.payload is not None
    assert attachment.payload.coordinates is not None
    assert attachment.payload.coordinates.lat == 16.0611
    assert attachment.payload.coordinates.long == 108.2208


def test_facebook_webhook_payload_multiple_entries_and_items():
    """Verify parsing multiple entries and multiple messaging items."""
    raw_payload = {
        "object": "page",
        "entry": [
            {
                "id": "PAGE_1",
                "messaging": [
                    {
                        "sender": {"id": "USER_1"},
                        "recipient": {"id": "PAGE_1"},
                        "message": {"mid": "mid.1", "text": "Msg 1"},
                    },
                    {
                        "sender": {"id": "USER_2"},
                        "recipient": {"id": "PAGE_1"},
                        "message": {"mid": "mid.2", "text": "Msg 2"},
                    },
                ],
            },
            {
                "id": "PAGE_2",
                "messaging": [
                    {
                        "sender": {"id": "USER_3"},
                        "recipient": {"id": "PAGE_2"},
                        "message": {"mid": "mid.3", "text": "Msg 3"},
                    }
                ],
            },
        ],
    }

    payload = FacebookWebhookPayload.model_validate(raw_payload)
    assert len(payload.entry) == 2
    assert len(payload.entry[0].messaging) == 2
    assert len(payload.entry[1].messaging) == 1
    assert payload.entry[0].messaging[0].message.text == "Msg 1"
    assert payload.entry[0].messaging[1].message.text == "Msg 2"
    assert payload.entry[1].messaging[0].message.text == "Msg 3"


def test_facebook_webhook_payload_missing_required_fields():
    """Verify validation errors when mandatory fields are missing."""
    # Missing object
    with pytest.raises(ValidationError):
        FacebookWebhookPayload.model_validate({"entry": []})

    # Missing entry id
    with pytest.raises(ValidationError):
        FacebookEntry.model_validate({"messaging": []})

    # Missing sender in messaging item
    with pytest.raises(ValidationError):
        FacebookMessagingItem.model_validate(
            {"recipient": {"id": "PAGE_1"}, "message": {"mid": "mid.1"}}
        )

    # Missing recipient in messaging item
    with pytest.raises(ValidationError):
        FacebookMessagingItem.model_validate(
            {"sender": {"id": "USER_1"}, "message": {"mid": "mid.1"}}
        )


def test_facebook_verify_query_validation():
    """Verify Facebook Webhook verification GET query parameters parsing."""
    # Dotted query parameters from Meta GET request
    query_data = {
        "hub.mode": "subscribe",
        "hub.verify_token": "DANANG_TEST_TOKEN_2026",
        "hub.challenge": "1158201444",
    }
    query = FacebookVerifyQuery.model_validate(query_data)
    assert query.hub_mode == "subscribe"
    assert query.hub_verify_token == "DANANG_TEST_TOKEN_2026"
    assert query.hub_challenge == "1158201444"

    # Also supports pythonic field names
    query2 = FacebookVerifyQuery(
        hub_mode="subscribe",
        hub_verify_token="TOKEN_ABC",
        hub_challenge="CHALLENGE_XYZ",
    )
    assert query2.hub_mode == "subscribe"
    assert query2.hub_verify_token == "TOKEN_ABC"
    assert query2.hub_challenge == "CHALLENGE_XYZ"


def test_facebook_verify_query_missing_fields():
    """Verify missing verification query parameters raises ValidationError."""
    with pytest.raises(ValidationError):
        FacebookVerifyQuery.model_validate(
            {"hub.mode": "subscribe", "hub.challenge": "1158201444"}
        )

    with pytest.raises(ValidationError):
        FacebookVerifyQuery.model_validate(
            {"hub.verify_token": "TOKEN", "hub.challenge": "1158201444"}
        )

    with pytest.raises(ValidationError):
        FacebookVerifyQuery.model_validate(
            {"hub.mode": "subscribe", "hub.verify_token": "TOKEN"}
        )
