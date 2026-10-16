"""Pydantic schemas for Meta Facebook Messenger Webhook API."""

from pydantic import BaseModel, ConfigDict, Field


class FacebookCoordinates(BaseModel):
    """GPS Coordinates within a Facebook Messenger location attachment."""

    lat: float = Field(..., description="Vĩ độ WGS84")
    long: float = Field(..., description="Kinh độ WGS84")

    model_config = ConfigDict(extra="ignore")


# Alias for backward compatibility and semantic clarity
FacebookLocationPayload = FacebookCoordinates


class FacebookAttachmentPayload(BaseModel):
    """Payload of a Facebook Messenger attachment (image url or location coordinates)."""

    url: str | None = Field(None, description="URL ảnh nếu type=image")
    coordinates: FacebookCoordinates | None = Field(None, description="Tọa độ GPS nếu type=location")

    model_config = ConfigDict(extra="ignore")


class FacebookAttachment(BaseModel):
    """Attachment object in a Facebook Messenger message."""

    type: str = Field(..., description="Loại đính kèm: image, location, ...")
    payload: FacebookAttachmentPayload | None = Field(None, description="Payload đính kèm")

    model_config = ConfigDict(extra="ignore")


class FacebookMessage(BaseModel):
    """Inbound message content from Facebook Messenger."""

    mid: str = Field(..., description="Mã định danh tin nhắn")
    text: str | None = Field(None, description="Nội dung văn bản")
    attachments: list[FacebookAttachment] | None = Field(None, description="Danh sách tập tin/vị trí đính kèm")

    model_config = ConfigDict(extra="ignore")


class FacebookParticipant(BaseModel):
    """Participant (sender or recipient) identified by Page-Scoped ID (PSID)."""

    id: str = Field(..., description="PSID của người gửi/nhận")

    model_config = ConfigDict(extra="ignore")


class FacebookMessagingItem(BaseModel):
    """Single messaging event item in an entry."""

    sender: FacebookParticipant
    recipient: FacebookParticipant
    timestamp: int | None = None
    message: FacebookMessage | None = None

    model_config = ConfigDict(extra="ignore")


class FacebookEntry(BaseModel):
    """Single entry object in the webhook payload."""

    id: str = Field(..., description="ID của trang Facebook")
    time: int | None = None
    messaging: list[FacebookMessagingItem] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class FacebookWebhookPayload(BaseModel):
    """Root payload sent by Meta Graph API Webhooks for Facebook Messenger."""

    object: str = Field(..., description="Đối tượng webhook, thường là 'page'")
    entry: list[FacebookEntry] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class FacebookVerifyQuery(BaseModel):
    """Query parameters sent by Meta Developer Platform during Webhook verification."""

    hub_mode: str = Field(..., alias="hub.mode", description="Chế độ xác minh từ Meta (thường là 'subscribe')")
    hub_verify_token: str = Field(..., alias="hub.verify_token", description="Token xác minh")
    hub_challenge: str = Field(..., alias="hub.challenge", description="Mã challenge Meta gửi để echo lại")

    model_config = ConfigDict(extra="ignore", populate_by_name=True)
