from pathlib import Path
from unittest.mock import MagicMock, patch
import cv2
import numpy as np
import pytest

from app.services.anonymizer import anonymize_image, _get_classifiers


def _create_synthetic_image(path: Path, width: int = 200, height: int = 200) -> Path:
    """Helper creating a test image with high-contrast shapes."""
    img = np.full((height, width, 3), 200, dtype=np.uint8)
    # Add some high-contrast shapes and patterns
    cv2.rectangle(img, (20, 20), (80, 80), (30, 30, 30), -1)
    cv2.circle(img, (140, 140), 40, (10, 200, 10), -1)
    cv2.putText(img, "TEST", (30, 160), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)

    encode_success, buf = cv2.imencode(".jpg", img)
    assert encode_success, "Failed to encode synthetic test image"
    buf.tofile(str(path))
    return path


def test_classifiers_initialization():
    """Verify Haar cascade classifiers load successfully."""
    face_clf, plate_clf = _get_classifiers()
    assert face_clf is not None
    assert not face_clf.empty()
    assert plate_clf is not None
    assert not plate_clf.empty()


def test_anonymize_valid_image_without_detections(tmp_path: Path):
    """Test anonymizing an image that contains no faces or license plates."""
    input_file = _create_synthetic_image(tmp_path / "clean_street.jpg")
    output_file = tmp_path / "clean_street_out.jpg"

    result = anonymize_image(input_file, output_file)

    assert result["faces_detected"] == 0
    assert result["plates_detected"] == 0
    assert result["total_anonymized"] == 0
    assert result["is_blurred"] is False
    assert output_file.exists()
    assert output_file.stat().st_size > 0

    # Verify output can be read as a valid image
    out_bytes = np.fromfile(str(output_file), dtype=np.uint8)
    decoded = cv2.imdecode(out_bytes, cv2.IMREAD_COLOR)
    assert decoded is not None
    assert decoded.shape == (200, 200, 3)


def test_anonymize_with_mocked_detections(tmp_path: Path):
    """Test Gaussian blur is applied to detected face and license plate bounding boxes."""
    input_file = _create_synthetic_image(tmp_path / "incident_scene.jpg", width=300, height=300)
    output_file = tmp_path / "nested_dir" / "incident_anonymized.jpg"

    face_box = (30, 30, 60, 60)
    plate_box = (150, 150, 80, 40)

    # Mock classifiers via _get_classifiers return value
    mock_face_clf = MagicMock()
    mock_face_clf.detectMultiScale.return_value = [face_box]
    mock_plate_clf = MagicMock()
    mock_plate_clf.detectMultiScale.return_value = [plate_box]

    with patch(
        "app.services.anonymizer._get_classifiers",
        return_value=(mock_face_clf, mock_plate_clf),
    ):
        result = anonymize_image(input_file, output_file)

        assert mock_face_clf.detectMultiScale.called
        assert mock_plate_clf.detectMultiScale.called
        assert result["faces_detected"] == 1
        assert result["plates_detected"] == 1
        assert result["total_anonymized"] == 2
        assert result["is_blurred"] is True
        assert output_file.exists()

    # Verify that the output image is modified in the blurred regions
    orig_bytes = np.fromfile(str(input_file), dtype=np.uint8)
    orig_img = cv2.imdecode(orig_bytes, cv2.IMREAD_COLOR)

    out_bytes = np.fromfile(str(output_file), dtype=np.uint8)
    out_img = cv2.imdecode(out_bytes, cv2.IMREAD_COLOR)

    # Face ROI should be different because of blur
    x, y, w, h = face_box
    orig_roi = orig_img[y : y + h, x : x + w]
    out_roi = out_img[y : y + h, x : x + w]
    assert not np.array_equal(orig_roi, out_roi), "Face ROI should be blurred and modified"


def test_anonymize_windows_unicode_path(tmp_path: Path):
    """Test reading and writing images with Vietnamese Unicode paths on Windows."""
    unicode_dir = tmp_path / "Đà Nẵng Hải Châu"
    unicode_dir.mkdir(parents=True, exist_ok=True)

    input_file = _create_synthetic_image(unicode_dir / "ảnh_hiện_trường_sự_cố.jpg")
    output_file = unicode_dir / "kết_quả_làm_mờ.jpg"

    result = anonymize_image(input_file, output_file)

    assert result["output_path"] == str(output_file.resolve())
    assert output_file.exists()
    assert output_file.stat().st_size > 0

    out_bytes = np.fromfile(str(output_file), dtype=np.uint8)
    decoded = cv2.imdecode(out_bytes, cv2.IMREAD_COLOR)
    assert decoded is not None


def test_anonymize_non_existent_file(tmp_path: Path):
    """Test FileNotFoundError is raised when input file does not exist."""
    missing_file = tmp_path / "does_not_exist.jpg"
    out_file = tmp_path / "out.jpg"

    with pytest.raises(FileNotFoundError, match="Input image file not found"):
        anonymize_image(missing_file, out_file)


def test_anonymize_empty_file(tmp_path: Path):
    """Test ValueError is raised when input file is empty (0 bytes)."""
    empty_file = tmp_path / "empty.jpg"
    empty_file.touch()
    out_file = tmp_path / "out.jpg"

    with pytest.raises(ValueError, match="Input image file is empty"):
        anonymize_image(empty_file, out_file)


def test_anonymize_invalid_corrupted_image(tmp_path: Path):
    """Test ValueError is raised when file contains non-image data."""
    corrupted_file = tmp_path / "corrupted.jpg"
    corrupted_file.write_text("NOT_AN_IMAGE_CONTENT", encoding="utf-8")
    out_file = tmp_path / "out.jpg"

    with pytest.raises(ValueError, match="Unable to decode image from file"):
        anonymize_image(corrupted_file, out_file)


def test_anonymize_with_even_ksize_normalization(tmp_path: Path):
    """Test passing even ksize tuple is normalized without raising OpenCV assertion."""
    input_file = _create_synthetic_image(tmp_path / "scene.jpg")
    output_file = tmp_path / "out_even.jpg"

    # Even kernel sizes like (30, 30) should be normalized safely
    result = anonymize_image(input_file, output_file, ksize=(30, 30))
    assert result["output_path"] == str(output_file.resolve())
    assert output_file.exists()
