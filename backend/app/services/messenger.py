"""Service for managing temporary Facebook Messenger sessions and Graph API messaging."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import logging
import math
import re
import urllib.parse
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class MessengerSession:
    """In-memory representation of an ongoing incident report session from Facebook Messenger."""

    psid: str
    image_url: str | None = None
    lat: float | None = None
    long: float | None = None
    text: str | None = None
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def is_expired(self, ttl_seconds: int = 900) -> bool:
        """Check if the session has expired past the given TTL in seconds (default: 15 minutes)."""
        now = datetime.now(timezone.utc)
        updated = self.updated_at
        if updated.tzinfo is None:
            updated = updated.replace(tzinfo=timezone.utc)
        return (now - updated).total_seconds() > ttl_seconds

    def is_complete(self) -> bool:
        """Check whether the session has both an incident image URL and GPS coordinates."""
        return bool(self.image_url) and self.lat is not None and self.long is not None


class MessengerSessionManager:
    """Manager for tracking multi-step citizen incident reports from Facebook Messenger."""

    def __init__(self) -> None:
        self._sessions: dict[str, MessengerSession] = {}

    def get_session(self, psid: str) -> MessengerSession | None:
        """Get an existing active session for a PSID, or None if not found or expired."""
        session = self._sessions.get(psid)
        if session is not None and session.is_expired():
            self._sessions.pop(psid, None)
            return None
        return session

    def get_or_create_session(self, psid: str) -> MessengerSession:
        """Get an existing active session or create a new one if missing or expired."""
        session = self._sessions.get(psid)
        if session is not None and not session.is_expired():
            return session
        new_session = MessengerSession(psid=psid)
        self._sessions[psid] = new_session
        return new_session

    def update_image(self, psid: str, image_url: str) -> MessengerSession:
        """Update or set the incident image URL for the PSID session."""
        session = self.get_or_create_session(psid)
        session.image_url = image_url
        session.updated_at = datetime.now(timezone.utc)
        return session

    def update_location(self, psid: str, lat: float, long: float) -> MessengerSession:
        """Update or set the incident GPS coordinates for the PSID session."""
        session = self.get_or_create_session(psid)
        session.lat = lat
        session.long = long
        session.updated_at = datetime.now(timezone.utc)
        return session

    def update_text(self, psid: str, text: str) -> MessengerSession:
        """Update or set optional incident description text for the PSID session."""
        session = self.get_or_create_session(psid)
        session.text = text
        session.updated_at = datetime.now(timezone.utc)
        return session

    def clear_session(self, psid: str) -> None:
        """Clear and remove a PSID session after successful ticket creation or cancellation."""
        self._sessions.pop(psid, None)

    def cleanup_expired_sessions(self, ttl_seconds: int = 900) -> int:
        """Remove all expired sessions from memory and return the count of purged sessions."""
        expired_psids = [
            psid for psid, session in self._sessions.items()
            if session.is_expired(ttl_seconds)
        ]
        for psid in expired_psids:
            self._sessions.pop(psid, None)
        return len(expired_psids)


messenger_session_manager = MessengerSessionManager()


async def send_facebook_message(
    psid: str,
    text: str,
    page_token: str | None = None,
    client: httpx.AsyncClient | None = None,
) -> bool:
    """Send a response message to a Facebook Messenger user via Meta Send API.

    Returns True if the message was successfully dispatched (status 200), False otherwise.
    Never raises an unhandled exception to prevent crashing the webhook pipeline.
    """
    token = page_token or settings.FACEBOOK_PAGE_ACCESS_TOKEN
    if not token:
        logger.warning(
            "FACEBOOK_PAGE_ACCESS_TOKEN is not configured; skipping message delivery to PSID %s",
            psid,
        )
        return False

    url = "https://graph.facebook.com/v21.0/me/messages"
    payload = {
        "recipient": {"id": psid},
        "message": {"text": text},
        "messaging_type": "RESPONSE",
    }
    params = {"access_token": token}

    try:
        if client is not None:
            response = await client.post(url, json=payload, params=params)
        else:
            async with httpx.AsyncClient(timeout=15.0) as internal_client:
                response = await internal_client.post(url, json=payload, params=params)

        if response.status_code == 200:
            logger.info("Successfully dispatched Facebook message to PSID %s", psid)
            return True

        logger.error(
            "Facebook Send API returned non-200 status %s for PSID %s: %s",
            response.status_code,
            psid,
            response.text,
        )
        return False
    except Exception as exc:
        logger.exception("Failed to send Facebook message to PSID %s: %s", psid, exc)
        return False


async def download_image_bytes(
    image_url: str,
    timeout: float = 15.0,
    client: httpx.AsyncClient | None = None,
) -> bytes:
    """Download image binary bytes from a public or signed URL.

    Raises:
        httpx.HTTPError: If the HTTP request fails or returns an error status code.
        ValueError: If the downloaded response content is empty.
    """
    if client is not None:
        response = await client.get(image_url, timeout=timeout)
    else:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as internal_client:
            response = await internal_client.get(image_url)

    response.raise_for_status()
    if not response.content:
        raise ValueError(f"Downloaded image content from {image_url} is empty.")
    return response.content


def _normalize_and_validate_coordinates(a: float, b: float) -> tuple[float, float] | None:
    """Validate coordinate numbers and normalize to (lat, long) order.

    Rules:
    - If a in [8.0, 24.0] and b in [102.0, 112.0]: lat = a, long = b (Vietnam geobounds).
    - If b in [8.0, 24.0] and a in [102.0, 112.0]: lat = b, long = a (automatically swapped).
    - If outside Vietnam but valid global WGS84 (-90 <= a <= 90 and -180 <= b <= 180):
      lat = a, long = b.
    - Otherwise returns None.
    """
    if not (math.isfinite(a) and math.isfinite(b)):
        return None

    # Vietnam Geobounds check (lat ~8.0-24.0, long ~102.0-112.0)
    if 8.0 <= a <= 24.0 and 102.0 <= b <= 112.0:
        return (a, b)
    if 8.0 <= b <= 24.0 and 102.0 <= a <= 112.0:
        return (b, a)

    # Global WGS84 bounds check
    if -90.0 <= a <= 90.0 and -180.0 <= b <= 180.0:
        return (a, b)

    return None


def extract_coordinates_from_text(text: str) -> tuple[float, float] | None:
    """Extract and validate GPS coordinates (lat, long) from free-form text, Apple Maps, or Google Maps URLs.

    Supports:
    - Apple Maps URLs (query parameters ll=, sll=, q=)
    - Google Maps URLs (query parameters q=, ll=, daddr=, etc., and path pattern @lat,long)
    - Labeled coordinates in English (lat/lon) and Vietnamese (vĩ độ/kinh độ)
    - Raw decimal number pairs separated by comma, semicolon, or whitespace

    Automatically swaps (long, lat) to (lat, long) if coordinates fall within Vietnam geobounds.
    Returns (lat, long) tuple of floats, or None if no valid coordinates are found.
    """
    if not text or not str(text).strip():
        return None

    unquoted = urllib.parse.unquote(text)

    # Pattern 1: Apple Maps URL (maps.apple.com with query params ll=, sll=, q=)
    if "maps.apple.com" in unquoted:
        for param in ("ll", "sll", "q"):
            match = re.search(
                rf"[?&]{param}=(-?\d+(?:\.\d+)?)[,;+ ]+(-?\d+(?:\.\d+)?)",
                unquoted,
            )
            if match:
                coords = _normalize_and_validate_coordinates(
                    float(match.group(1)), float(match.group(2))
                )
                if coords is not None:
                    return coords

    # Pattern 2: Google Maps URL (query params q=, ll=, daddr=, etc., or @lat,long path)
    if any(domain in unquoted for domain in ("google.com/maps", "maps.google.com", "goo.gl")):
        for param in ("q", "ll", "daddr", "query", "destination", "saddr"):
            match = re.search(
                rf"[?&]{param}=(?:loc:)?(-?\d+(?:\.\d+)?)[,;+ ]+(-?\d+(?:\.\d+)?)",
                unquoted,
            )
            if match:
                coords = _normalize_and_validate_coordinates(
                    float(match.group(1)), float(match.group(2))
                )
                if coords is not None:
                    return coords

    # Standalone @lat,long (e.g., copied directly from a Google Maps URL)
    standalone_at = re.search(r"@(-?\d+(?:\.\d+)?)[,;+ ]+(-?\d+(?:\.\d+)?)", unquoted)
    if standalone_at:
        coords = _normalize_and_validate_coordinates(
            float(standalone_at.group(1)), float(standalone_at.group(2))
        )
        if coords is not None:
            return coords

    # Pattern 3: Labeled coordinates (English & Vietnamese prefixes)
    lat_match = re.search(
        r"(?i)\b(?:vĩ\s*độ|vi\s*do|vi\s*độ|vĩ\s*do|lat(?:itude)?)\s*[:=]?\s*(?:là|is)?\s*(-?\d+(?:\.\d+)?)",
        unquoted,
    )
    long_match = re.search(
        r"(?i)\b(?:kinh\s*độ|kinh\s*do|long(?:itude)?|lon|lng)\s*[:=]?\s*(?:là|is)?\s*(-?\d+(?:\.\d+)?)",
        unquoted,
    )
    if lat_match and long_match:
        coords = _normalize_and_validate_coordinates(
            float(lat_match.group(1)), float(long_match.group(1))
        )
        if coords is not None:
            return coords

    # Pattern 4: Raw decimal coordinate pairs (e.g., "16.0611, 108.2208" or "16.0611; 108.2208")
    raw_matches = re.finditer(
        r"(?<![\w.-])(-?\d+\.\d+)\s*[,; \t/|]+\s*(-?\d+\.\d+)(?![\w.-])",
        unquoted,
    )
    for rm in raw_matches:
        coords = _normalize_and_validate_coordinates(
            float(rm.group(1)), float(rm.group(2))
        )
        if coords is not None:
            return coords

    return None
