import json
from pathlib import Path

import pytest
from shapely.geometry import Point, shape
from shapely.geometry.base import BaseGeometry


@pytest.fixture(scope="module")
def danang_geojson_raw() -> dict[str, object]:
    """Fixture tải dữ liệu GeoJSON ranh giới Đà Nẵng một lần cho toàn bộ module test."""
    geojson_path = Path(__file__).resolve().parent.parent / "data" / "danang_core_boundary.geojson"
    assert geojson_path.exists(), f"Không tìm thấy file GeoJSON tại {geojson_path}"
    with open(geojson_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def danang_boundary_shape(danang_geojson_raw: dict[str, object]) -> BaseGeometry:
    """Fixture chuyển đổi GeoJSON geometry sang đối tượng hình học Shapely."""
    features = danang_geojson_raw.get("features")
    assert isinstance(features, list) and len(features) > 0, "GeoJSON features phải là danh sách không rỗng"
    geom_data = features[0].get("geometry")
    return shape(geom_data)


def test_danang_geojson_metadata_and_crs(danang_geojson_raw: dict[str, object]):
    """Kiểm tra metadata của GeoJSON: zone_id, FeatureCollection, và chuẩn CRS WGS84."""
    assert danang_geojson_raw.get("type") == "FeatureCollection"
    features = danang_geojson_raw.get("features")
    assert isinstance(features, list) and len(features) > 0, "GeoJSON phải chứa ít nhất 1 Feature"

    first_feature = features[0]
    properties = first_feature.get("properties", {})
    assert isinstance(properties, dict)
    assert properties.get("zone_id") == "DANANG_CORE", "zone_id phải là 'DANANG_CORE'"
    assert "Đà Nẵng" in str(properties.get("name", ""))

    # Xác thực CRS khai báo chuẩn WGS84 (CRS84 hoặc EPSG:4326)
    crs = danang_geojson_raw.get("crs")
    assert isinstance(crs, dict)
    assert crs.get("type") == "name"
    crs_props = crs.get("properties", {})
    assert isinstance(crs_props, dict)
    crs_name = str(crs_props.get("name", ""))
    assert "CRS84" in crs_name or "4326" in crs_name, (
        f"CRS phải là chuẩn WGS84 (CRS84 hoặc EPSG:4326), nhận được: {crs_name}"
    )


def test_danang_boundary_bounding_box_and_validity(danang_boundary_shape: BaseGeometry):
    """Kiểm tra tính hợp lệ hình học và bounding box của vùng lõi Đà Nẵng."""
    assert danang_boundary_shape.is_valid, "Đa giác ranh giới Đà Nẵng phải hợp lệ trong không gian GIS"
    assert danang_boundary_shape.geom_type in ["Polygon", "MultiPolygon"]
    assert not danang_boundary_shape.is_empty, "Đa giác không được rỗng"

    bounds = danang_boundary_shape.bounds  # (min_lon, min_lat, max_lon, max_lat)
    min_lon, min_lat, max_lon, max_lat = bounds

    # Giới hạn bounding box Đà Nẵng theo chuẩn hệ thống: [107.8, 15.9] đến [108.4, 16.3]
    assert min_lon >= 107.8, f"min_lon ({min_lon}) phải >= 107.8"
    assert max_lon <= 108.4, f"max_lon ({max_lon}) phải <= 108.4"
    assert min_lat >= 15.9, f"min_lat ({min_lat}) phải >= 15.9"
    assert max_lat <= 16.3, f"max_lat ({max_lat}) phải <= 16.3"


@pytest.mark.parametrize(
    "point, description",
    [
        (Point(108.2208, 16.0611), "Cầu Rồng (Hải Châu - Sơn Trà)"),
        (Point(108.2250, 16.0722), "Cầu Sông Hàn (Hải Châu)"),
        (Point(108.2600, 16.0020), "Khu vực Ngũ Hành Sơn"),
        (Point(108.1500, 16.0700), "Khu vực Hòa Khánh (Liên Chiểu)"),
    ],
)
def test_points_inside_danang_core(danang_boundary_shape: BaseGeometry, point: Point, description: str):
    """Kiểm tra các điểm thực tế tại Đà Nẵng phải nằm trong ranh giới tiếp nhận sự cố."""
    assert danang_boundary_shape.contains(point), f"{description} ({point.x}, {point.y}) phải nằm trong vùng Đà Nẵng"


@pytest.mark.parametrize(
    "point, description",
    [
        (Point(108.2500, 15.8800), "Sát ranh giới phía Nam (Quảng Nam / Điện Bàn - Hội An)"),
        (Point(108.1000, 16.2800), "Sát ranh giới phía Bắc (Huế / Bắc Hải Vân)"),
        (Point(16.0611, 108.2208), "Điểm lỗi đảo ngược tọa độ (lat, lon thay vì lon, lat)"),
        (Point(105.8542, 21.0285), "Hà Nội (Hồ Gươm)"),
        (Point(106.7000, 10.7769), "TP. Hồ Chí Minh"),
        (Point(111.0000, 16.0000), "Biển Đông xa bờ"),
    ],
)
def test_points_outside_danang_core(danang_boundary_shape: BaseGeometry, point: Point, description: str):
    """Kiểm tra các điểm ngoài Đà Nẵng hoặc đảo ngược tọa độ phải bị từ chối."""
    assert not danang_boundary_shape.contains(point), (
        f"{description} ({point.x}, {point.y}) không được nằm trong vùng Đà Nẵng"
    )
