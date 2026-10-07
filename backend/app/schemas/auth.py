from datetime import datetime
from typing import Optional
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


class UserOut(BaseModel):
    id: UUID
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: str
    auth_provider: str
    role: str
    department_id: Optional[UUID] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user: UserOut
