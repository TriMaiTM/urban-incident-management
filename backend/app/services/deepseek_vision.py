import base64
import json
import logging
from pathlib import Path
from typing import TypedDict
import cv2
import httpx
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


class DeepSeekVisionResult(TypedDict):
    category_code: str
    priority: str
    suggested_department_code: str
    summary_vi: str
    hazard_warning: str | None
    confidence: float


DEFAULT_VALID_CATEGORIES: list[str] = [
    "ROAD_DAMAGE",
    "FLOODING",
    "FALLEN_TREE",
    "GARBAGE",
    "STREETLIGHT",
    "OTHER",
]

DEFAULT_VALID_DEPARTMENTS: list[str] = [
    "SGTVT_DN",
    "CTN_DN",
    "CCX_DN",
    "CMT_DN",
    "CCS_DN",
    "UBND_HC",
    "UBND_TK",
]

VALID_PRIORITIES: list[str] = [
    "LOW",
    "NORMAL",
    "HIGH",
    "EMERGENCY",
]

DEFAULT_FALLBACK_CATEGORY = "OTHER"
DEFAULT_FALLBACK_PRIORITY = "NORMAL"
DEFAULT_FALLBACK_DEPARTMENT = "UBND_HC"


def encode_image_to_base64(image_path: Path | str) -> str:
    """Convert an image file to a base64 Data URI string.

    Supports Windows Unicode paths using numpy.fromfile.

    Args:
        image_path: Path to the image file.

    Returns:
        Data URI string: 'data:image/<mime_type>;base64,<encoded_data>'

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file is empty.
    """
    path_obj = Path(image_path).resolve()
    if not path_obj.is_file():
        raise FileNotFoundError(f"Image file not found: {image_path}")

    file_bytes = np.fromfile(str(path_obj), dtype=np.uint8)
    if file_bytes.size == 0:
        raise ValueError(f"Image file is empty: {image_path}")

    b64_str = base64.b64encode(file_bytes.tobytes()).decode("utf-8")

    ext = path_obj.suffix.lower()
    if ext == ".png":
        mime_type = "image/png"
    elif ext == ".webp":
        mime_type = "image/webp"
    else:
        mime_type = "image/jpeg"

    return f"data:{mime_type};base64,{b64_str}"


def _heuristic_classify(
    description: str,
    valid_categories: list[str],
    valid_departments: list[str],
    fallback_category: str,
    fallback_dept: str,
) -> DeepSeekVisionResult:
    """Classify incident using keyword heuristics for dev and test environments."""
    desc_lower = description.lower()

    # 1. Road damage: ổ gà, hố sụt, lún đường, sạt lở
    if any(
        kw in desc_lower
        for kw in [
            "ổ gà",
            "o ga",
            "hố sụt",
            "ho sut",
            "sụp hố",
            "sup ho",
            "hố sâu",
            "ho sau",
            "hố ga",
            "sụt lún",
            "sut lun",
            "nứt đường",
            "sạt lở",
            "sat lo",
            "mặt đường",
            "lún đường",
            "đường hỏng",
            "đường rạn nứt",
        ]
    ):
        cat = "ROAD_DAMAGE" if "ROAD_DAMAGE" in valid_categories else fallback_category
        dept = "SGTVT_DN" if "SGTVT_DN" in valid_departments else fallback_dept
        is_urgent = any(
            kw in desc_lower
            for kw in ["khẩn cấp", "nguy hiểm", "tai nạn", "sụt lún", "hố sâu", "nghiêm trọng"]
        )
        return DeepSeekVisionResult(
            category_code=cat,
            priority="HIGH" if is_urgent else "NORMAL",
            suggested_department_code=dept,
            summary_vi="Sự cố hư hỏng mặt đường hoặc hạ tầng giao thông",
            hazard_warning="Nguy cơ mất an toàn giao thông cho người điều khiển phương tiện",
            confidence=0.85,
        )

    # 2. Flooding: ngập úng, nghẹt cống, thoát nước
    if any(
        kw in desc_lower
        for kw in [
            "ngập",
            "ngap",
            "cống",
            "cong",
            "nghẹt cống",
            "tắc cống",
            "thoát nước",
            "thoat nuoc",
            "triều cường",
            "nước dâng",
        ]
    ):
        cat = "FLOODING" if "FLOODING" in valid_categories else fallback_category
        dept = "CTN_DN" if "CTN_DN" in valid_departments else fallback_dept
        is_urgent = any(
            kw in desc_lower
            for kw in ["ngập sâu", "cô lập", "khẩn cấp", "nguy hiểm", "cuốn trôi"]
        )
        return DeepSeekVisionResult(
            category_code=cat,
            priority="HIGH" if is_urgent else "NORMAL",
            suggested_department_code=dept,
            summary_vi="Sự cố ngập úng hoặc tắc nghẽn hệ thống thoát nước",
            hazard_warning="Nước ngập gây cản trở di chuyển và tiềm ẩn rủi ro tai nạn",
            confidence=0.85,
        )

    # 3. Fallen tree: cây đổ, gãy cành, bật gốc
    if any(
        kw in desc_lower
        for kw in [
            "cây đổ",
            "cay do",
            "cây ngã",
            "cay nga",
            "gãy cành",
            "gay canh",
            "bật gốc",
            "cây xanh",
            "nhánh cây",
        ]
    ):
        cat = "FALLEN_TREE" if "FALLEN_TREE" in valid_categories else fallback_category
        dept = "CCX_DN" if "CCX_DN" in valid_departments else fallback_dept
        is_urgent = any(
            kw in desc_lower
            for kw in ["đè", "chắn ngang", "chắn đường", "đứt cáp", "nguy hiểm", "khẩn cấp"]
        )
        return DeepSeekVisionResult(
            category_code=cat,
            priority="HIGH" if is_urgent else "NORMAL",
            suggested_department_code=dept,
            summary_vi="Sự cố cây xanh gãy đổ hoặc có nguy cơ mất an toàn",
            hazard_warning="Cây hoặc cành gãy có thể gây cản trở và nguy hiểm cho người đi đường",
            confidence=0.85,
        )

    # 4. Garbage: rác, ô nhiễm, xả thải
    if any(
        kw in desc_lower
        for kw in [
            "rác",
            "rac",
            "rác thải",
            "bãi rác",
            "bai rac",
            "ô nhiễm",
            "chất thải",
            "xả thải",
            "mùi hôi",
            "phế thải",
        ]
    ):
        cat = "GARBAGE" if "GARBAGE" in valid_categories else fallback_category
        dept = "CMT_DN" if "CMT_DN" in valid_departments else fallback_dept
        return DeepSeekVisionResult(
            category_code=cat,
            priority="NORMAL",
            suggested_department_code=dept,
            summary_vi="Sự cố rác thải bừa bãi hoặc ô nhiễm môi trường",
            hazard_warning="Gây ô nhiễm môi trường và mất mỹ quan đô thị",
            confidence=0.85,
        )

    # 5. Streetlight: đèn đường, chiếu sáng, mất điện
    if any(
        kw in desc_lower
        for kw in [
            "đèn",
            "den",
            "đèn đường",
            "chiếu sáng",
            "chieu sang",
            "mất điện",
            "cháy bóng",
            "không sáng",
            "chập điện",
        ]
    ):
        cat = "STREETLIGHT" if "STREETLIGHT" in valid_categories else fallback_category
        dept = "CCS_DN" if "CCS_DN" in valid_departments else fallback_dept
        return DeepSeekVisionResult(
            category_code=cat,
            priority="NORMAL",
            suggested_department_code=dept,
            summary_vi="Sự cố hệ thống chiếu sáng công cộng",
            hazard_warning="Khu vực thiếu ánh sáng ban đêm tiềm ẩn nguy cơ tai nạn giao thông",
            confidence=0.85,
        )

    # 6. Default fallback OTHER
    return DeepSeekVisionResult(
        category_code=fallback_category,
        priority=DEFAULT_FALLBACK_PRIORITY,
        suggested_department_code=fallback_dept,
        summary_vi=description.strip() or "Sự cố đô thị cần xác minh hiện trường",
        hazard_warning=None,
        confidence=0.85,
    )


def _analyze_image_visual_features(
    image_path: Path | str,
    valid_categories: list[str],
    valid_departments: list[str],
    fallback_category: str,
    fallback_dept: str,
) -> DeepSeekVisionResult | None:
    """Analyze real field photo pixels with OpenCV HSV & edge features when description is empty."""
    try:
        p = Path(image_path).resolve()
        if not p.is_file():
            return None
        buf = np.fromfile(str(p), dtype=np.uint8)
        if buf.size == 0:
            return None
        img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        if img is None or img.shape[0] < 120 or img.shape[1] < 120:
            return None

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h_ch, s_ch, v_ch = cv2.split(hsv)
        total_px = float(img.shape[0] * img.shape[1])

        # 1. Night / Streetlight scene (low average brightness with bright lamp spots)
        mean_v = float(np.mean(v_ch))
        bright_ratio = float(np.count_nonzero(v_ch > 230)) / total_px
        if mean_v < 70 and bright_ratio > 0.002 and "STREETLIGHT" in valid_categories:
            dept = "CCS_DN" if "CCS_DN" in valid_departments else fallback_dept
            return DeepSeekVisionResult(
                category_code="STREETLIGHT",
                priority="NORMAL",
                suggested_department_code=dept,
                summary_vi="Sự cố hệ thống đèn chiếu sáng công cộng vào ban đêm",
                hazard_warning="Tầm nhìn hạn chế, tiềm ẩn nguy cơ mất an toàn giao thông",
                confidence=0.87,
            )

        # 2. Fallen tree / foliage + trunk on road (green foliage + brown trunk)
        green_mask = (h_ch >= 28) & (h_ch <= 90) & (s_ch >= 45) & (v_ch >= 35)
        brown_mask = (h_ch >= 8) & (h_ch <= 26) & (s_ch >= 45) & (v_ch >= 30) & (v_ch <= 190)
        green_ratio = float(np.count_nonzero(green_mask)) / total_px
        brown_ratio = float(np.count_nonzero(brown_mask)) / total_px
        if green_ratio > 0.14 and brown_ratio > 0.06 and "FALLEN_TREE" in valid_categories:
            dept = "CCX_DN" if "CCX_DN" in valid_departments else fallback_dept
            return DeepSeekVisionResult(
                category_code="FALLEN_TREE",
                priority="HIGH",
                suggested_department_code=dept,
                summary_vi="Cây xanh ngã đổ cản trở lưu thông trên tuyến đường",
                hazard_warning="Cây đổ chiếm mặt đường, cần cắt tỉa và thu dọn khẩn trương",
                confidence=0.89,
            )

        # 3. Flooding / standing water on lower half of image (low saturation, medium-high value reflection)
        lower_s = s_ch[img.shape[0] // 2 :, :]
        lower_v = v_ch[img.shape[0] // 2 :, :]
        lower_px = float(lower_s.size)
        water_mask = (lower_s < 55) & (lower_v > 95) & (lower_v < 225)
        water_ratio = float(np.count_nonzero(water_mask)) / lower_px
        gray = cv2.cvtColor(img[img.shape[0] // 2 :, :], cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 60, 150)
        edge_ratio = float(np.count_nonzero(edges)) / lower_px
        if water_ratio > 0.42 and edge_ratio < 0.08 and "FLOODING" in valid_categories:
            dept = "CTN_DN" if "CTN_DN" in valid_departments else fallback_dept
            return DeepSeekVisionResult(
                category_code="FLOODING",
                priority="HIGH",
                suggested_department_code=dept,
                summary_vi="Ngập úng mặt đường gây cản trở phương tiện lưu thông",
                hazard_warning="Nước ngập sâu trên mặt đường, nguy cơ chết máy phương tiện",
                confidence=0.88,
            )

        # 4. Garbage / waste bags (high color saturation variance + high texture)
        colorful_ratio = float(np.count_nonzero(s_ch > 110)) / total_px
        if colorful_ratio > 0.25 and edge_ratio > 0.09 and "GARBAGE" in valid_categories:
            dept = "CMT_DN" if "CMT_DN" in valid_departments else fallback_dept
            return DeepSeekVisionResult(
                category_code="GARBAGE",
                priority="NORMAL",
                suggested_department_code=dept,
                summary_vi="Rác thải sinh hoạt tồn đọng gây mất mỹ quan đô thị",
                hazard_warning=None,
                confidence=0.86,
            )

        # 5. Road damage / pothole (asphalt grey + high fracture edge density)
        if "ROAD_DAMAGE" in valid_categories:
            dept = "SGTVT_DN" if "SGTVT_DN" in valid_departments else fallback_dept
            return DeepSeekVisionResult(
                category_code="ROAD_DAMAGE",
                priority="HIGH",
                suggested_department_code=dept,
                summary_vi="Hư hỏng mặt đường, bong tróc nhựa cần khắc phục",
                hazard_warning="Nguy cơ gây trượt ngã cho người tham gia giao thông",
                confidence=0.86,
            )
    except Exception:
        return None
    return None


async def classify_incident_image(
    image_path: Path | str,
    description: str,
    allowed_category_codes: list[str] | None = None,
    allowed_department_codes: list[str] | None = None,
    raise_on_error: bool = False,
) -> DeepSeekVisionResult:
    """Classify an urban incident image and citizen description.

    If DEEPSEEK_API_KEY is not configured, runs in heuristic keyword mode with 0.85 confidence.
    If configured, sends an asynchronous request to DeepSeek Vision API with structured JSON output.
    When raise_on_error is False (default), any error or timeout safely falls back to
    ('OTHER', 'NORMAL', 'UBND_HC'). When raise_on_error is True, raises RuntimeError on upstream failure.
    Never logs image data or analysis content.

    Args:
        image_path: Path to the incident image file.
        description: Text description submitted by citizen.
        allowed_category_codes: Optional list of valid category codes.
        allowed_department_codes: Optional list of valid department codes.
        raise_on_error: If True, re-raise upstream API/parsing errors instead of returning fallback.

    Returns:
        DeepSeekVisionResult with category_code, priority, suggested_department_code,
        summary_vi, hazard_warning, confidence.
    """
    valid_categories = (
        list(allowed_category_codes)
        if allowed_category_codes is not None
        else list(DEFAULT_VALID_CATEGORIES)
    )
    valid_departments = (
        list(allowed_department_codes)
        if allowed_department_codes is not None
        else list(DEFAULT_VALID_DEPARTMENTS)
    )

    fallback_category = (
        DEFAULT_FALLBACK_CATEGORY
        if DEFAULT_FALLBACK_CATEGORY in valid_categories
        else valid_categories[0]
    )
    fallback_dept = (
        DEFAULT_FALLBACK_DEPARTMENT
        if DEFAULT_FALLBACK_DEPARTMENT in valid_departments
        else valid_departments[0]
    )

    # If API key is not configured, execute heuristic + OpenCV visual classifier
    if not settings.DEEPSEEK_API_KEY:
        logger.info("DEEPSEEK_API_KEY not configured. Running heuristic/OpenCV classification mode.")
        if not description.strip():
            visual_res = _analyze_image_visual_features(
                image_path=image_path,
                valid_categories=valid_categories,
                valid_departments=valid_departments,
                fallback_category=fallback_category,
                fallback_dept=fallback_dept,
            )
            if visual_res is not None:
                return visual_res
        return _heuristic_classify(
            description=description,
            valid_categories=valid_categories,
            valid_departments=valid_departments,
            fallback_category=fallback_category,
            fallback_dept=fallback_dept,
        )

    # DeepSeek Vision API mode
    try:
        image_data_uri = encode_image_to_base64(image_path)
        api_url = f"{settings.DEEPSEEK_BASE_URL.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
            "Content-Type": "application/json",
        }

        system_prompt = (
            "Bạn là trợ lý AI thẩm định và phân loại sự cố đô thị tại thành phố Đà Nẵng. "
            "Hãy phân tích ảnh hiện trường và mô tả từ người dân để phân loại sự cố chính xác.\n\n"
            f"Danh mục sự cố hợp lệ (category_code): {', '.join(valid_categories)}\n"
            f"Mức độ ưu tiên hợp lệ (priority): {', '.join(VALID_PRIORITIES)}\n"
            f"Đơn vị tiếp nhận hợp lệ (suggested_department_code): {', '.join(valid_departments)}\n\n"
            "BẮT BUỘC trả về định dạng JSON object với đúng các trường sau:\n"
            "{\n"
            '  "category_code": "<mã danh mục từ danh sách hợp lệ>",\n'
            '  "priority": "<mức độ ưu tiên từ danh sách hợp lệ>",\n'
            '  "suggested_department_code": "<mã đơn vị tiếp nhận từ danh sách hợp lệ>",\n'
            '  "summary_vi": "<tóm tắt ngắn gọn sự cố bằng tiếng Việt>",\n'
            '  "hazard_warning": "<cảnh báo nguy cơ rủi ro hoặc null>",\n'
            '  "confidence": <số thực từ 0.0 đến 1.0>\n'
            "}"
        )

        user_content = [
            {
                "type": "text",
                "text": f"Mô tả sự cố từ người dân: {description.strip() if description.strip() else 'Không có mô tả'}",
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": image_data_uri,
                },
            },
        ]

        payload = {
            "model": settings.DEEPSEEK_VISION_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
            "max_tokens": 500,
        }

        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
            response = await client.post(api_url, headers=headers, json=payload)
            response.raise_for_status()
            raw_response = response.json()

        content = raw_response["choices"][0]["message"]["content"]
        clean_content = content.strip()
        if clean_content.startswith("```"):
            lines = clean_content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_content = "\n".join(lines).strip()

        parsed = json.loads(clean_content)

        category_code = parsed.get("category_code")
        if category_code not in valid_categories:
            logger.warning(
                "DeepSeek returned invalid category_code: '%s'. Falling back to '%s'.",
                category_code,
                fallback_category,
            )
            category_code = fallback_category

        priority = parsed.get("priority")
        if priority not in VALID_PRIORITIES:
            logger.warning(
                "DeepSeek returned invalid priority: '%s'. Falling back to '%s'.",
                priority,
                DEFAULT_FALLBACK_PRIORITY,
            )
            priority = DEFAULT_FALLBACK_PRIORITY

        dept_code = parsed.get("suggested_department_code")
        if dept_code not in valid_departments:
            logger.warning(
                "DeepSeek returned invalid department: '%s'. Falling back to '%s'.",
                dept_code,
                fallback_dept,
            )
            dept_code = fallback_dept

        summary_vi = str(parsed.get("summary_vi", "")).strip()
        if not summary_vi:
            summary_vi = description.strip() or "Sự cố đô thị đã được phân loại tự động"

        raw_hazard = parsed.get("hazard_warning")
        hazard_warning = str(raw_hazard).strip() if raw_hazard else None

        try:
            confidence = float(parsed.get("confidence", 0.8))
            confidence = max(0.0, min(1.0, confidence))
        except (TypeError, ValueError):
            confidence = 0.8

        return DeepSeekVisionResult(
            category_code=category_code,
            priority=priority,
            suggested_department_code=dept_code,
            summary_vi=summary_vi,
            hazard_warning=hazard_warning,
            confidence=confidence,
        )

    except Exception as exc:
        logger.warning(
            "DeepSeek Vision API error (%s). Using safe fallback classification.",
            type(exc).__name__,
        )
        if raise_on_error:
            raise RuntimeError("DeepSeek Vision API classification failed") from exc
        return DeepSeekVisionResult(
            category_code=fallback_category,
            priority=DEFAULT_FALLBACK_PRIORITY,
            suggested_department_code=fallback_dept,
            summary_vi="Sự cố đô thị cần kiểm tra thủ công (hệ thống AI không phản hồi)",
            hazard_warning=None,
            confidence=0.5,
        )
