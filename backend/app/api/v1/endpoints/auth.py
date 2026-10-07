from uuid import uuid4
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.schemas.auth import GoogleLoginIn, TokenOut, UserLoginIn, UserOut, UserRegisterIn

router = APIRouter(prefix="/auth", tags=["Authentication & Profile"])


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản công dân mới"
)
async def register(
    body: UserRegisterIn,
    db: AsyncSession = Depends(get_db)
):
    """
    Đăng ký tài khoản mới bằng Email hoặc Số điện thoại + Mật khẩu.
    Mặc định vai trò của người dùng tạo mới là CITIZEN.
    """
    # 1. Kiểm tra trùng email
    if body.email:
        existing_email = await db.execute(select(User).where(User.email == body.email))
        if existing_email.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{body.email}' đã được đăng ký trong hệ thống. Vui lòng đăng nhập hoặc chọn Quên mật khẩu."
            )

    # 2. Kiểm tra trùng số điện thoại
    if body.phone:
        existing_phone = await db.execute(select(User).where(User.phone == body.phone))
        if existing_phone.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số điện thoại '{body.phone}' đã được đăng ký trong hệ thống."
            )

    # 3. Tạo người dùng mới
    new_user = User(
        id=uuid4(),
        email=body.email,
        phone=body.phone,
        full_name=body.full_name.strip(),
        password_hash=get_password_hash(body.password),
        auth_provider="LOCAL",
        role="CITIZEN"
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # 4. Cấp phát JWT token
    token = create_access_token(subject=new_user.id, role=new_user.role)
    expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return TokenOut(
        access_token=token,
        token_type="bearer",
        expires_in_seconds=expires_in_seconds,
        user=UserOut.model_validate(new_user)
    )


@router.post(
    "/login",
    response_model=TokenOut,
    summary="Đăng nhập bằng Email/SĐT và Mật khẩu"
)
async def login(
    body: UserLoginIn,
    db: AsyncSession = Depends(get_db)
):
    """
    Đăng nhập bằng Email hoặc Số điện thoại kết hợp với Mật khẩu.
    Trả về JWT Bearer token và thông tin vai trò của người dùng.
    """
    username = body.username.strip()
    stmt = select(User).where(
        or_(User.email == username, User.phone == username)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thông tin đăng nhập không chính xác (sai email/số điện thoại hoặc mật khẩu)."
        )

    token = create_access_token(subject=user.id, role=user.role)
    expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return TokenOut(
        access_token=token,
        token_type="bearer",
        expires_in_seconds=expires_in_seconds,
        user=UserOut.model_validate(user)
    )


@router.post(
    "/google",
    response_model=TokenOut,
    summary="Đăng nhập một chạm bằng Google OAuth 2.0"
)
async def login_with_google(
    body: GoogleLoginIn,
    db: AsyncSession = Depends(get_db)
):
    """
    Xác thực Google ID Token nhận từ frontend Google Sign-In SDK.
    Tự động tạo tài khoản mới nếu email chưa từng đăng ký.
    """
    token_str = body.id_token.strip()

    # Hỗ trợ chế độ dev/mock khi DEBUG = True phục vụ testing local
    if settings.DEBUG and token_str.startswith("mock_google_token:"):
        mock_email = token_str.split(":", 1)[1].strip()
        google_email = mock_email
        google_name = mock_email.split("@")[0].replace(".", " ").capitalize()
        google_picture = "https://lh3.googleusercontent.com/a/default-user"
    else:
        # Xác minh token trực tiếp với Google tokeninfo endpoint
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={token_str}"
                )
                if res.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Google ID Token không hợp lệ hoặc đã hết hạn."
                    )
                payload = res.json()
                google_email = payload.get("email")
                google_name = payload.get("name") or google_email
                google_picture = payload.get("picture")
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Không thể kết nối đến máy chủ Google để xác thực: {str(e)}"
            )

    if not google_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Token không chứa thông tin địa chỉ email."
        )

    # Kiểm tra xem user đã tồn tại theo email chưa
    stmt = select(User).where(User.email == google_email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            id=uuid4(),
            email=google_email,
            full_name=google_name,
            auth_provider="GOOGLE",
            role="CITIZEN",
            avatar_url=google_picture
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Cập nhật avatar mới nếu có
        if google_picture and not user.avatar_url:
            user.avatar_url = google_picture
            await db.commit()
            await db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role)
    expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return TokenOut(
        access_token=token,
        token_type="bearer",
        expires_in_seconds=expires_in_seconds,
        user=UserOut.model_validate(user)
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Lấy thông tin tài khoản hiện tại"
)
async def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Trả về thông tin hồ sơ và vai trò của người dùng đang đăng nhập dựa trên JWT Bearer token.
    """
    return UserOut.model_validate(current_user)
