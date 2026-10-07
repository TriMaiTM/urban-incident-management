import json
import os
import pytest
from shapely.geometry import Point, shape


@pytest.fixture
def danang_boundary_shape():
    geojson_path = os.path.join(
        os.path.dirname(__file__), "..", "data", "danang_core_boundary.geojson"
    )
    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    geom_data = data["features"][0]["geometry"]
    return shape(geom_data)


def test_danang_geojson_structure(danang_boundary_shape):
    """Kiểm tra cấu trúc và tính hợp lệ của đa giác ranh giới Đà Nẵng"""
    assert danang_boundary_shape.is_valid, "Đa giác ranh giới Đà Nẵng phải hợp lệ trong không gian GIS"
    assert danang_boundary_shape.geom_type in ["Polygon", "MultiPolygon"]


def test_points_inside_danang_core(danang_boundary_shape):
    """Kiểm tra các điểm thực tế tại Đà Nẵng phải nằm trong ranh giới"""
    # 1. Cầu Rồng (Hải Châu - Sơn Trà)
    cau_rong = Point(108.2208, 16.0611)  # (lon, lat)
    assert danang_boundary_shape.contains(cau_rong), "Cầu Rồng phải nằm trong vùng Đà Nẵng"

    # 2. Cầu Sông Hàn (Hải Châu)
    cau_song_han = Point(108.2250, 16.0722)
    assert danang_boundary_shape.contains(cau_song_han), "Cầu Sông Hàn phải nằm trong vùng Đà Nẵng"

    # 3. Khu vực Ngũ Hành Sơn
    ngu_hanh_son = Point(108.2600, 16.0020)
    assert danang_boundary_shape.contains(ngu_hanh_son), "Ngũ Hành Sơn phải nằm trong vùng Đà Nẵng"

    # 4. Khu vực Hòa Khánh (Liên Chiểu)
    hoa_khanh = Point(108.1500, 16.0700)
    assert danang_boundary_shape.contains(hoa_khanh), "Hòa Khánh phải nằm trong vùng Đà Nẵng"


def test_points_outside_danang_core(danang_boundary_shape):
    """Kiểm tra các điểm ngoài Đà Nẵng phải bị từ chối"""
    # 1. Hà Nội (Hồ Gươm)
    ha_noi = Point(105.8542, 21.0285)
    assert not danang_boundary_shape.contains(ha_noi), "Hà Nội không được nằm trong vùng Đà Nẵng"

    # 2. TP. Hồ Chí Minh
    hcm = Point(106.7000, 10.7769)
    assert not danang_boundary_shape.contains(hcm), "TP.HCM không được nằm trong vùng Đà Nẵng"

    # 3. Tọa độ biển xa bờ
    bien_dong = Point(111.0000, 16.0000)
    assert not danang_boundary_shape.contains(bien_dong), "Tọa độ biển xa không được nằm trong vùng Đà Nẵng"
