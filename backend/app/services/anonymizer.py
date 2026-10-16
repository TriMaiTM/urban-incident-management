import os
from pathlib import Path
from typing import TypedDict
import cv2
import numpy as np


class AnonymizationResult(TypedDict):
    faces_detected: int
    plates_detected: int
    total_anonymized: int
    output_path: str
    is_blurred: bool


# Initialize Haar Cascade models from cv2 data directory
_FACE_CASCADE_PATH = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
_PLATE_CASCADE_PATH = os.path.join(cv2.data.haarcascades, "haarcascade_russian_plate_number.xml")

_face_cascade: cv2.CascadeClassifier | None = None
_plate_cascade: cv2.CascadeClassifier | None = None


def _get_classifiers() -> tuple[cv2.CascadeClassifier, cv2.CascadeClassifier]:
    """Lazy-load and cache OpenCV CascadeClassifiers."""
    global _face_cascade, _plate_cascade

    if _face_cascade is None:
        if not os.path.exists(_FACE_CASCADE_PATH):
            raise FileNotFoundError(f"Haar cascade XML not found: {_FACE_CASCADE_PATH}")
        _face_cascade = cv2.CascadeClassifier(_FACE_CASCADE_PATH)
        if _face_cascade.empty():
            raise RuntimeError(f"Failed to load face cascade from: {_FACE_CASCADE_PATH}")

    if _plate_cascade is None:
        if not os.path.exists(_PLATE_CASCADE_PATH):
            raise FileNotFoundError(f"Haar cascade XML not found: {_PLATE_CASCADE_PATH}")
        _plate_cascade = cv2.CascadeClassifier(_PLATE_CASCADE_PATH)
        if _plate_cascade.empty():
            raise RuntimeError(f"Failed to load plate cascade from: {_PLATE_CASCADE_PATH}")

    return _face_cascade, _plate_cascade


def anonymize_image(
    input_path: Path | str,
    output_path: Path | str,
    ksize: tuple[int, int] = (35, 35),
) -> AnonymizationResult:
    """Detect faces and license plates in an image and apply Gaussian blur to anonymize them.

    Complies with Decree 13/2023/ND-CP regarding personal data protection.
    Uses numpy.fromfile and cv2.imdecode / cv2.imencode to properly handle Windows Unicode paths.

    Args:
        input_path: Path to the source image.
        output_path: Path where the anonymized image will be saved.
        ksize: Kernel size for Gaussian blur (default: (35, 35)).

    Returns:
        dict with keys:
            - faces_detected: int
            - plates_detected: int
            - total_anonymized: int
            - output_path: str
            - is_blurred: bool
    """
    input_path_obj = Path(input_path).resolve()
    if not input_path_obj.is_file():
        raise FileNotFoundError(f"Input image file not found: {input_path}")

    # Read binary bytes via numpy to support Unicode paths on Windows
    file_bytes = np.fromfile(str(input_path_obj), dtype=np.uint8)
    if file_bytes.size == 0:
        raise ValueError(f"Input image file is empty: {input_path}")

    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Unable to decode image from file: {input_path}")

    face_classifier, plate_classifier = _get_classifiers()

    # Convert to grayscale for Haar detection
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Detect faces
    raw_faces = face_classifier.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30),
    )
    face_boxes: list[tuple[int, int, int, int]] = (
        [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in raw_faces]
        if len(raw_faces) > 0
        else []
    )

    # Detect vehicle license plates
    raw_plates = plate_classifier.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30),
    )
    plate_boxes: list[tuple[int, int, int, int]] = (
        [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in raw_plates]
        if len(raw_plates) > 0
        else []
    )

    all_boxes = face_boxes + plate_boxes
    img_h, img_w = image.shape[:2]

    for x, y, w, h in all_boxes:
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(img_w, x + w)
        y2 = min(img_h, y + h)

        roi_w = x2 - x1
        roi_h = y2 - y1

        if roi_w > 0 and roi_h > 0:
            # Gaussian blur kernel size must be odd and <= ROI dimension to prevent OpenCV assertions
            raw_kw, raw_kh = ksize
            target_kw = raw_kw if raw_kw % 2 == 1 else max(1, raw_kw - 1)
            target_kh = raw_kh if raw_kh % 2 == 1 else max(1, raw_kh - 1)

            kw = target_kw if roi_w >= target_kw else (roi_w if roi_w % 2 == 1 else roi_w - 1)
            kh = target_kh if roi_h >= target_kh else (roi_h if roi_h % 2 == 1 else roi_h - 1)
            kw = max(1, kw)
            kh = max(1, kh)

            roi = image[y1:y2, x1:x2]
            blurred_roi = cv2.GaussianBlur(roi, (kw, kh), 0)
            image[y1:y2, x1:x2] = blurred_roi

    # Ensure parent output directory exists
    output_path_obj = Path(output_path).resolve()
    output_path_obj.parent.mkdir(parents=True, exist_ok=True)

    # Determine file extension for encoding
    ext = output_path_obj.suffix.lower()
    if not ext:
        ext = ".jpg"

    encode_success, encoded_buf = cv2.imencode(ext, image)
    if not encode_success:
        raise ValueError(f"Failed to encode anonymized image to format: {ext}")

    encoded_buf.tofile(str(output_path_obj))

    total_count = len(face_boxes) + len(plate_boxes)
    return {
        "faces_detected": len(face_boxes),
        "plates_detected": len(plate_boxes),
        "total_anonymized": total_count,
        "output_path": str(output_path_obj),
        "is_blurred": total_count > 0,
    }
