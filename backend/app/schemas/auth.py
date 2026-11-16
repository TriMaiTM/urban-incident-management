from datetime import datetime
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, model_validator


class UserRegisterIn(BaseModel):
    email: Optional[EmailStr] = Field(None, description="Email người dùng")
    phone: Optional[str] = Field(None, min_length=9, max_length=15, description="Số điện thoại người dùng")
    full_name: str = Field(..., min_length=2, max_length=255, description="Họ và tên")
    password: str = Field(..., min_length=6, max_length=100, description="Mật khẩu (tối thiểu 6 ký tự)")

    @model_validator(mode="after")
    def check_email_or_phone(self):
        if not self.email and not self.phone:
            raise ValueError("Bắt buộc phải cung cấp ít nhất Email hoặc Số điện thoại để đăng ký tài khoản.")
        return self


class UserLoginIn(BaseModel):
    username: str = Field(..., description="Email hoặc Số điện thoại đã đăng ký")
    password: str = Field(..., min_length=1, description="Mật khẩu tài khoản")


class GoogleLoginIn(BaseModel):
    id_token: str = Field(..., description="Google ID Token nhận từ Google Identity Services")


class UserProfileUpdateIn(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255, description="Họ và tên mới")
    phone: Optional[str] = Field(None, min_length=9, max_length=15, description="Số điện thoại mới")
    avatar_url: Optional[str] = Field(None, max_length=500, description="Đường dẫn ảnh đại diện mới")


class PasswordChangeIn(BaseModel):
    current_password: str = Field(..., min_length=1, description="Mật khẩu hiện tại")
    new_password: str = Field(..., min_length=6, max_length=100, description="Mật khẩu mới (tối thiểu 6 ký tự)")


class AdminUserCreateIn(BaseModel):
    email: Optional[EmailStr] = Field(None, description="Email người dùng")
    phone: Optional[str] = Field(None, min_length=9, max_length=15, description="Số điện thoại người dùng")
    full_name: str = Field(..., min_length=2, max_length=255, description="Họ và tên")
    password: str = Field(..., min_length=6, max_length=100, description="Mật khẩu khởi tạo")
    role: Literal["CITIZEN", "DISPATCHER", "TECHNICIAN", "ADMIN"] = Field(
        "CITIZEN", description="Vai trò hệ thống"
    )
    department_id: Optional[UUID] = Field(None, description="ID đơn vị phụ trách (với cán bộ)")

    @model_validator(mode="after")
    def check_email_or_phone(self):
        if not self.email and not self.phone:
            raise ValueError("Bắt buộc phải cung cấp ít nhất Email hoặc Số điện thoại.")
        return self


class AdminUserUpdateIn(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, min_length=9, max_length=15)
    role: Optional[Literal["CITIZEN", "DISPATCHER", "TECHNICIAN", "ADMIN"]] = None
    department_id: Optional[UUID] = None
    is_locked: Optional[bool] = None


class UserOut(BaseModel):
    id: UUID
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: str
    auth_provider: str
    role: str
    department_id: Optional[UUID] = None
    avatar_url: Optional[str] = None
    is_locked: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def normalize_locked_flag(cls, data: object) -> object:
        if isinstance(data, dict):
            d = dict(data)
            if d.get("is_locked") is None:
                d["is_locked"] = False
            return d
        if hasattr(data, "is_locked") and getattr(data, "is_locked") is None:
            setattr(data, "is_locked", False)
        return data


class UserListOut(BaseModel):
    total: int
    items: list[UserOut]
    page: int = 1
    page_size: int = 20

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user: UserOut
