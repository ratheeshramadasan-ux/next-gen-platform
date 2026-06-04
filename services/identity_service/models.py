from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import date

class UserRegister(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    date_of_birth: date
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class MFAVerify(BaseModel):
    email: EmailStr
    otp: str

class UserActivate(BaseModel):
    token: str
    date_of_birth: date

class StatusResponse(BaseModel):
    message: str
    status: str = "success"


class PersonalInfoUpdate(BaseModel):
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    phone_number: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None


class EmailChangeRequest(BaseModel):
    new_email: EmailStr


class EmailVerificationRequest(BaseModel):
    new_email: EmailStr


class EmailOtpVerifyRequest(BaseModel):
    new_email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class MFASettingsUpdate(BaseModel):
    enabled: bool
    method: Literal["TOTP", "EMAIL_OTP", "SMS"] = "TOTP"


class SessionRevokeRequest(BaseModel):
    session_id: str


class ApiTokenCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=64)
    expiry_days: int = Field(default=30, ge=1, le=365)
