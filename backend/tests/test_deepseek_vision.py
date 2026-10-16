import base64
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch
import cv2
import httpx
import numpy as np
import pytest

from app.core.config import settings
from app.services.deepseek_vision import (
    DeepSeekVisionResult,
    classify_incident_image,
    encode_image_to_base64,
)


def _create_synthetic_image(path: Path, ext: str = ".jpg", width: int = 100, height: int = 100) -> Path:
    """Helper to create a synthetic image file."""
    img = np.full((height, width, 3), 150, dtype=np.uint8)
    cv2.circle(img, (50, 50), 30, (0, 0, 255), -1)
    encode_success, buf = cv2.imencode(ext, img)
    assert encode_success, f"Failed to encode image with ext {ext}"
    buf.tofile(str(path))
    return path


def test_encode_image_to_base64_jpeg(tmp_path: Path):
    """Test base64 encoding for a standard JPEG image."""
    img_path = _create_synthetic_image(tmp_path / "test.jpg", ext=".jpg")
    uri = encode_image_to_base64(img_path)

    assert uri.startswith("data:image/jpeg;base64,")
    encoded_part = uri.split(",", 1)[1]
    decoded_bytes = base64.b64decode(encoded_part)
    assert len(decoded_bytes) > 0


def test_encode_image_to_base64_png(tmp_path: Path):
    """Test base64 encoding for a PNG image."""
    img_path = _create_synthetic_image(tmp_path / "test.png", ext=".png")
    uri = encode_image_to_base64(img_path)

    assert uri.startswith("data:image/png;base64,")
    encoded_part = uri.split(",", 1)[1]
    decoded_bytes = base64.b64decode(encoded_part)
    assert len(decoded_bytes) > 0


def test_encode_image_to_base64_unicode_path(tmp_path: Path):
    """Test base64 encoding with Vietnamese Unicode characters in directory and filename."""
    unicode_dir = tmp_path / "Đà Nẵng Hải Châu"
    unicode_dir.mkdir(parents=True, exist_ok=True)
    img_path = _create_synthetic_image(unicode_dir / "ảnh_sự_cố_ổ_gà.jpg", ext=".jpg")

    uri = encode_image_to_base64(img_path)
    assert uri.startswith("data:image/jpeg;base64,")


def test_encode_image_to_base64_file_not_found(tmp_path: Path):
    """Test error handling when file does not exist."""
    missing_path = tmp_path / "non_existent.jpg"
    with pytest.raises(FileNotFoundError):
        encode_image_to_base64(missing_path)


def test_encode_image_to_base64_empty_file(tmp_path: Path):
    """Test error handling when file exists but is empty."""
    empty_file = tmp_path / "empty.jpg"
    empty_file.write_bytes(b"")
    with pytest.raises(ValueError, match="empty"):
        encode_image_to_base64(empty_file)


@pytest.mark.asyncio
async def test_classify_heuristic_road_damage(tmp_path: Path):
    """Test heuristic classification for road damage keywords."""
    img_path = _create_synthetic_image(tmp_path / "road.jpg")

    with patch.object(settings, "DEEPSEEK_API_KEY", ""):
        result = await classify_incident_image(
            image_path=img_path,
            description="Có ổ gà rất lớn trên mặt đường gây nguy hiểm cho người đi xe máy",
        )

    assert result["category_code"] == "ROAD_DAMAGE"
    assert result["suggested_department_code"] == "SGTVT_DN"
    assert result["priority"] == "HIGH"
    assert result["confidence"] == 0.85
    assert result["hazard_warning"] is not None


@pytest.mark.asyncio
async def test_classify_heuristic_fallen_tree(tmp_path: Path):
    """Test heuristic classification for fallen tree keywords."""
    img_path = _create_synthetic_image(tmp_path / "tree.jpg")

    with patch.object(settings, "DEEPSEEK_API_KEY", ""):
        result = await classify_incident_image(
            image_path=img_path,
            description="Cây đổ chắn ngang đường sau cơn giông lớn",
        )

    assert result["category_code"] == "FALLEN_TREE"
    assert result["suggested_department_code"] == "CCX_DN"
    assert result["priority"] == "HIGH"
    assert result["confidence"] == 0.85


@pytest.mark.asyncio
async def test_classify_heuristic_garbage(tmp_path: Path):
    """Test heuristic classification for garbage keywords."""
    img_path = _create_synthetic_image(tmp_path / "garbage.jpg")

    with patch.object(settings, "DEEPSEEK_API_KEY", ""):
        result = await classify_incident_image(
            image_path=img_path,
            description="Bãi rác thải tự phát gây ô nhiễm bốc mùi hôi thối",
        )

    assert result["category_code"] == "GARBAGE"
    assert result["suggested_department_code"] == "CMT_DN"
    assert result["priority"] == "NORMAL"
    assert result["confidence"] == 0.85


@pytest.mark.asyncio
async def test_classify_heuristic_flooding(tmp_path: Path):
    """Test heuristic classification for flooding keywords."""
    img_path = _create_synthetic_image(tmp_path / "flood.jpg")

    with patch.object(settings, "DEEPSEEK_API_KEY", ""):
        result = await classify_incident_image(
            image_path=img_path,
            description="Nước ngập sâu cả nửa mét do nghẹt cống thoát nước",
        )

    assert result["category_code"] == "FLOODING"
    assert result["suggested_department_code"] == "CTN_DN"
    assert result["priority"] == "HIGH"
    assert result["confidence"] == 0.85


@pytest.mark.asyncio
async def test_classify_heuristic_streetlight(tmp_path: Path):
    """Test heuristic classification for streetlight keywords."""
    img_path = _create_synthetic_image(tmp_path / "light.jpg")

    with patch.object(settings, "DEEPSEEK_API_KEY", ""):
        result = await classify_incident_image(
            image_path=img_path,
            description="Đèn đường chiếu sáng bị cháy bóng mất điện cả đoạn",
        )

    assert result["category_code"] == "STREETLIGHT"
    assert result["suggested_department_code"] == "CCS_DN"
    assert result["priority"] == "NORMAL"
    assert result["confidence"] == 0.85


@pytest.mark.asyncio
async def test_classify_heuristic_other_fallback(tmp_path: Path):
    """Test heuristic classification fallback when no keywords match."""
    img_path = _create_synthetic_image(tmp_path / "unknown.jpg")

    with patch.object(settings, "DEEPSEEK_API_KEY", ""):
        result = await classify_incident_image(
            image_path=img_path,
            description="Cần kiểm tra lại biển quảng cáo treo sai quy định",
        )

    assert result["category_code"] == "OTHER"
    assert result["suggested_department_code"] == "UBND_HC"
    assert result["priority"] == "NORMAL"
    assert result["confidence"] == 0.85


@pytest.mark.asyncio
async def test_classify_api_success_mock(tmp_path: Path):
    """Test classify_incident_image when DeepSeek Vision API returns a valid response."""
    img_path = _create_synthetic_image(tmp_path / "api_test.jpg")

    mock_llm_json = json.dumps({
        "category_code": "ROAD_DAMAGE",
        "priority": "HIGH",
        "suggested_department_code": "SGTVT_DN",
        "summary_vi": "Hố sụt nguy hiểm trên đường Ngô Quyền",
        "hazard_warning": "Có thể gây lật xe máy khi trời tối",
        "confidence": 0.96,
    })

    mock_response = httpx.Response(
        status_code=200,
        json={
            "choices": [
                {
                    "message": {
                        "content": mock_llm_json,
                    }
                }
            ]
        },
        request=httpx.Request("POST", "https://api.deepseek.com/chat/completions"),
    )

    with patch.object(settings, "DEEPSEEK_API_KEY", "sk-test-key-12345"):
        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await classify_incident_image(
                image_path=img_path,
                description="Hố sâu giữa đường",
            )

    assert mock_post.called
    assert result["category_code"] == "ROAD_DAMAGE"
    assert result["priority"] == "HIGH"
    assert result["suggested_department_code"] == "SGTVT_DN"
    assert result["summary_vi"] == "Hố sụt nguy hiểm trên đường Ngô Quyền"
    assert result["hazard_warning"] == "Có thể gây lật xe máy khi trời tối"
    assert result["confidence"] == 0.96


@pytest.mark.asyncio
async def test_classify_api_markdown_codeblock_json(tmp_path: Path):
    """Test handling of responses wrapped in markdown ```json ... ``` codeblocks."""
    img_path = _create_synthetic_image(tmp_path / "md_test.jpg")

    wrapped_content = """```json
{
  "category_code": "FLOODING",
  "priority": "EMERGENCY",
  "suggested_department_code": "CTN_DN",
  "summary_vi": "Ngập diện rộng tại khu vực Hòa Khánh",
  "hazard_warning": "Nước ngập tràn vào nhà dân",
  "confidence": 0.92
}
```"""

    mock_response = httpx.Response(
        status_code=200,
        json={
            "choices": [
                {
                    "message": {
                        "content": wrapped_content,
                    }
                }
            ]
        },
        request=httpx.Request("POST", "https://api.deepseek.com/chat/completions"),
    )

    with patch.object(settings, "DEEPSEEK_API_KEY", "sk-test-key-12345"):
        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await classify_incident_image(
                image_path=img_path,
                description="Ngập lớn",
            )

    assert result["category_code"] == "FLOODING"
    assert result["priority"] == "EMERGENCY"
    assert result["suggested_department_code"] == "CTN_DN"
    assert result["confidence"] == 0.92


@pytest.mark.asyncio
async def test_classify_api_timeout_safe_fallback(tmp_path: Path):
    """Test safe fallback when DeepSeek API raises a TimeoutException."""
    img_path = _create_synthetic_image(tmp_path / "timeout_test.jpg")

    with patch.object(settings, "DEEPSEEK_API_KEY", "sk-test-key-12345"):
        with patch.object(
            httpx.AsyncClient,
            "post",
            side_effect=httpx.TimeoutException("API connection timed out"),
        ):
            result = await classify_incident_image(
                image_path=img_path,
                description="Mô tả sự cố",
            )

    assert result["category_code"] == "OTHER"
    assert result["priority"] == "NORMAL"
    assert result["suggested_department_code"] == "UBND_HC"
    assert result["confidence"] == 0.5


@pytest.mark.asyncio
async def test_classify_api_invalid_json_safe_fallback(tmp_path: Path):
    """Test safe fallback when DeepSeek API returns non-JSON text."""
    img_path = _create_synthetic_image(tmp_path / "bad_json_test.jpg")

    mock_response = httpx.Response(
        status_code=200,
        json={
            "choices": [
                {
                    "message": {
                        "content": "Internal server error occurred while processing vision model.",
                    }
                }
            ]
        },
        request=httpx.Request("POST", "https://api.deepseek.com/chat/completions"),
    )

    with patch.object(settings, "DEEPSEEK_API_KEY", "sk-test-key-12345"):
        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await classify_incident_image(
                image_path=img_path,
                description="Mô tả sự cố",
            )

    assert result["category_code"] == "OTHER"
    assert result["priority"] == "NORMAL"
    assert result["suggested_department_code"] == "UBND_HC"
    assert result["confidence"] == 0.5


@pytest.mark.asyncio
async def test_classify_api_http_error_safe_fallback(tmp_path: Path):
    """Test safe fallback when DeepSeek API returns HTTP 500 error."""
    img_path = _create_synthetic_image(tmp_path / "http_err_test.jpg")

    mock_response = httpx.Response(
        status_code=500,
        text="Internal Server Error",
        request=httpx.Request("POST", "https://api.deepseek.com/chat/completions"),
    )

    with patch.object(settings, "DEEPSEEK_API_KEY", "sk-test-key-12345"):
        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await classify_incident_image(
                image_path=img_path,
                description="Mô tả sự cố",
            )

    assert result["category_code"] == "OTHER"
    assert result["priority"] == "NORMAL"
    assert result["suggested_department_code"] == "UBND_HC"
    assert result["confidence"] == 0.5


@pytest.mark.asyncio
async def test_classify_custom_allowed_codes(tmp_path: Path):
    """Test that custom allowed category and department codes are honored."""
    img_path = _create_synthetic_image(tmp_path / "custom_test.jpg")

    with patch.object(settings, "DEEPSEEK_API_KEY", ""):
        result = await classify_incident_image(
            image_path=img_path,
            description="Có ổ gà trên đường",
            allowed_category_codes=["CUSTOM_ROAD"],
            allowed_department_codes=["CUSTOM_DEPT"],
        )

    # Since ROAD_DAMAGE is not in allowed_category_codes, fallback to allowed_category_codes[0]
    assert result["category_code"] == "CUSTOM_ROAD"
    assert result["suggested_department_code"] == "CUSTOM_DEPT"
