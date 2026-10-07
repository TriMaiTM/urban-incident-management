import pytest
import httpx
from app.api.deps import require_roles


@pytest.mark.asyncio
async def test_auth_login_success(client: httpx.AsyncClient):
    """Kiểm tra đăng nhập thành công với tài khoản demo đã seed"""
    res = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin@danang.gov.vn", "password": "Password123@"}
    )
    assert res.status_code == 200, f"Login failed: {res.text}"
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@danang.gov.vn"
    assert data["user"]["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_auth_login_wrong_password(client: httpx.AsyncClient):
    """Kiểm tra đăng nhập sai mật khẩu trả về 401"""
    res = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin@danang.gov.vn", "password": "WrongPassword!"}
    )
    assert res.status_code == 401
    assert "không chính xác" in res.json()["detail"]


@pytest.mark.asyncio
async def test_auth_register_and_profile(client: httpx.AsyncClient):
    """Kiểm tra luồng đăng ký tài khoản mới và lấy thông tin cá nhân qua /me"""
    import random
    rand_id = random.randint(1000, 9999)
    test_email = f"user_{rand_id}@test.com"

    # 1. Đăng ký
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "phone": f"090900{rand_id}",
            "full_name": f"Test User {rand_id}",
            "password": "Password123@"
        }
    )
    assert reg_res.status_code == 201, f"Register failed: {reg_res.text}"
    reg_data = reg_res.json()
    token = reg_data["access_token"]
    assert reg_data["user"]["role"] == "CITIZEN"

    # 2. Gọi /me với token
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == test_email
    assert me_data["full_name"] == f"Test User {rand_id}"

    # 3. Gọi /me không có token
    unauth_res = await client.get("/api/v1/auth/me")
    assert unauth_res.status_code == 401


@pytest.mark.asyncio
async def test_google_oauth_mock_login(client: httpx.AsyncClient):
    """Kiểm tra đăng nhập một chạm qua Google (chế độ mock testing)"""
    mock_email = "citizen.danang.google@gmail.com"
    res = await client.post(
        "/api/v1/auth/google",
        json={"id_token": f"mock_google_token:{mock_email}"}
    )
    assert res.status_code == 200, f"Google login failed: {res.text}"
    data = res.json()
    assert data["user"]["email"] == mock_email
    assert data["user"]["auth_provider"] == "GOOGLE"
    assert data["user"]["role"] == "CITIZEN"


@pytest.mark.asyncio
async def test_rbac_require_roles_guard():
    """Kiểm tra dependency require_roles chặn truy cập khi sai quyền"""
    from fastapi import HTTPException
    from app.models.user import User

    checker = require_roles(["DISPATCHER", "ADMIN"])

    # 1. CITIZEN bị từ chối với mã 403
    citizen_user = User(role="CITIZEN", full_name="Danang Citizen")
    with pytest.raises(HTTPException) as exc_info:
        await checker(current_user=citizen_user)
    assert exc_info.value.status_code == 403
    assert "Quyền truy cập bị từ chối" in exc_info.value.detail

    # 2. ADMIN được phép truy cập
    admin_user = User(role="ADMIN", full_name="Danang IOC Admin")
    allowed_admin = await checker(current_user=admin_user)
    assert allowed_admin.role == "ADMIN"

    # 3. DISPATCHER được phép truy cập
    dispatcher_user = User(role="DISPATCHER", full_name="Danang Dispatcher")
    allowed_dispatcher = await checker(current_user=dispatcher_user)
    assert allowed_dispatcher.role == "DISPATCHER"
