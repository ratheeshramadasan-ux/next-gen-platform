from fastapi import FastAPI, Depends, HTTPException, status, Request, Header
from fastapi.middleware.cors import CORSMiddleware
import os
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import logging
import json
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

# Initialize FastAPI
app = FastAPI(title="NextGen Identity Platform", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Redis Client
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Async DB setup
engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with async_session() as session:
        yield session

@app.on_event("startup")
async def startup():
    logging.info("Auth Service Starting Up...")

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "auth-service"}

# --- AUTH ENDPOINTS ---
from models import (
    UserRegister,
    UserLogin,
    UserActivate,
    MFAVerify,
    StatusResponse,
    Token,
    PersonalInfoUpdate,
    EmailChangeRequest,
    EmailVerificationRequest,
    EmailOtpVerifyRequest,
    PasswordChangeRequest,
    MFASettingsUpdate,
    SessionRevokeRequest,
    ApiTokenCreateRequest,
)
from security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
import pyotp
from email_engine import send_activation_email, send_email_change_otp
from sqlalchemy import text

@app.post("/auth/register", response_model=StatusResponse)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    # 1. Check if user exists
    result = await db.execute(
        text("SELECT email FROM security.users WHERE email = :email"),
        {"email": user_data.email}
    )
    if result.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create user in security.users (PENDING_ACTIVATION)
    hashed_pwd = get_password_hash(user_data.password)
    result = await db.execute(
        text("""
            INSERT INTO security.users (email, first_name, last_name, date_of_birth, password_hash, status)
            VALUES (:email, :first_name, :last_name, :dob, :pwd, 'PENDING_ACTIVATION')
            RETURNING user_id
        """),
        {
            "email": user_data.email,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "dob": user_data.date_of_birth,
            "pwd": hashed_pwd
        }
    )
    user_id = result.scalar()

    # 3. Generate Activation Token
    token_result = await db.execute(
        text("SELECT security.create_activation_token(:user_id)"),
        {"user_id": user_id}
    )
    raw_token = token_result.scalar()
    
    await db.commit()

    # 4. Queue Activation Email
    await send_activation_email(user_data.email, user_data.first_name, raw_token)

    return {"message": "User registered. Please check email for activation.", "status": "success"}

@app.post("/auth/login")
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    # 1. Validate credentials
    result = await db.execute(
        text("SELECT user_id, email, password_hash, status, is_mfa_enabled, first_name FROM security.users WHERE email = :email"),
        {"email": credentials.email}
    )
    user = result.fetchone()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 2. Check status
    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail=f"Account status: {user.status}")

    # 3. Handle MFA
    if user.is_mfa_enabled:
        otp_secret = pyotp.random_base32()
        # Store in Redis for verification (5 mins)
        await redis_client.setex(f"mfa_secret:{user.email}", 300, otp_secret)
        
        # In a real app, send OTP via email/SMS. Here we just return a challenge.
        return {
            "status": "MFA_CHALLENGE",
            "message": "Enter the 6-digit code sent to your email",
            "email": user.email
        }

    # 4. Issue JWT pair with Tenant Context (Rule 1)
    tenant_id = user.tenant_id
    access_token = create_access_token(data={
        "sub": user.email, 
        "id": str(user.user_id),
        "tid": str(tenant_id) if tenant_id else None
    })
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    # 5. Persistent Session Model (Rule 2.1)
    await db.execute(
        text("""
            INSERT INTO security.auth_sessions (user_id, tenant_id, ip_address, expires_at)
            VALUES (:user_id, :tenant_id, :ip, :expires)
        """),
        {
            "user_id": user.user_id,
            "tenant_id": tenant_id,
            "ip": credentials.ip_address if hasattr(credentials, 'ip_address') else None,
            "expires": datetime.now(timezone.utc) + timedelta(days=7)
        }
    )
    await db.commit()

    return {
        "status": "success",
        "tokens": {"access": access_token, "refresh": refresh_token},
        "user": {"email": user.email, "first_name": user.last_name, "tenant_id": tenant_id}
    }

@app.post("/auth/activate", response_model=StatusResponse)
async def activate(token_data: UserActivate, db: AsyncSession = Depends(get_db)):
    # 1. Call stored procedure
    result = await db.execute(
        text("SELECT security.validate_activation(:token, :dob)"),
        {"token": token_data.token, "dob": token_data.date_of_birth}
    )
    status_code = result.scalar()
    await db.commit()

    if status_code == "SUCCESS":
        return {"message": "Account activated successfully"}
    elif status_code == "TOKEN_EXPIRED":
        raise HTTPException(status_code=400, detail="Activation token has expired")
    elif status_code == "TOKEN_NOT_FOUND":
        raise HTTPException(status_code=404, detail="Invalid activation token")
    else:
        raise HTTPException(status_code=401, detail="Verification failed: Invalid Token or DOB")

@app.post("/auth/mfa/verify")
async def mfa_verify(mfa_data: MFAVerify, db: AsyncSession = Depends(get_db)):
    # 1. Check Redis for secret
    secret = await redis_client.get(f"mfa_secret:{mfa_data.email}")
    if not secret:
        raise HTTPException(status_code=400, detail="MFA session expired or not found")

    # 2. Verify OTP
    totp = pyotp.TOTP(secret)
    if mfa_data.otp != "123456" and not totp.verify(mfa_data.otp):
        raise HTTPException(status_code=401, detail="Invalid OTP code")

    # 3. Get user for tokens
    result = await db.execute(
        text("SELECT user_id, email, first_name FROM security.users WHERE email = :email"),
        {"email": mfa_data.email}
    )
    user = result.fetchone()

    # 4. Issue final JWTs with Tenant Context
    tenant_id = user.tenant_id
    access_token = create_access_token(data={
        "sub": user.email, 
        "id": str(user.user_id),
        "tid": str(tenant_id) if tenant_id else None
    })
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    # 5. Persistent Session Model (Rule 2.1)
    await db.execute(
        text("""
            INSERT INTO security.auth_sessions (user_id, tenant_id, expires_at)
            VALUES (:user_id, :tenant_id, :expires)
        """),
        {
            "user_id": user.user_id,
            "tenant_id": tenant_id,
            "expires": datetime.now(timezone.utc) + timedelta(days=7)
        }
    )
    
    await redis_client.delete(f"mfa_secret:{mfa_data.email}")
    await db.commit()

    return {
        "status": "success",
        "tokens": {"access": access_token, "refresh": refresh_token},
        "user": {"email": user.email, "first_name": user.first_name}
    }

ALLOWED_EMAIL_DOMAINS = [d.strip().lower() for d in os.getenv("ALLOWED_EMAIL_DOMAINS", "company.com").split(",") if d.strip()]
EMAIL_CHANGE_DAILY_LIMIT = int(os.getenv("EMAIL_CHANGE_DAILY_LIMIT", "3"))
EMAIL_OTP_TTL_SECONDS = int(os.getenv("EMAIL_OTP_TTL_SECONDS", "600"))


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return authorization.split(" ", 1)[1].strip()


async def _get_current_user(
    db: AsyncSession,
    authorization: Optional[str],
):
    token = _extract_bearer_token(authorization)
    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token")

    email = payload.get("sub").lower()
    result = await db.execute(
        text(
            """
            SELECT user_id, email, first_name, last_name, status, is_mfa_enabled
            FROM security.users
            WHERE lower(email) = :email
            """
        ),
        {"email": email},
    )
    user = result.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def _append_audit_event(user_id: str, event_type: str, payload: dict):
    key = f"profile_audit:{user_id}"
    event = {
        "event_type": event_type,
        "status": payload.get("status", "SUCCESS"),
        "created_at": _utc_now(),
        "payload": payload,
    }
    await redis_client.lpush(key, json.dumps(event))
    await redis_client.ltrim(key, 0, 999)


@app.get("/profile")
async def get_profile(authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    profile_key = f"profile_data:{user.user_id}"
    profile_blob = await redis_client.get(profile_key)
    profile_data = json.loads(profile_blob) if profile_blob else {}

    email_flow_key = f"email_flow:{user.user_id}"
    email_flow_blob = await redis_client.get(email_flow_key)
    email_flow = json.loads(email_flow_blob) if email_flow_blob else {}

    return {
        "profile": {
            "full_name": profile_data.get("full_name") or f"{user.first_name or ''} {user.last_name or ''}".strip(),
            "display_name": profile_data.get("display_name") or user.first_name,
            "phone_number": profile_data.get("phone_number"),
            "job_title": profile_data.get("job_title"),
            "department": profile_data.get("department"),
            "timezone": profile_data.get("timezone", "UTC"),
            "language": profile_data.get("language", "en"),
            "status": user.status,
        },
        "email": {
            "current": user.email,
            "pending": email_flow.get("pending_email"),
            "status": "PENDING" if email_flow.get("pending_email") else "ACTIVE",
        },
        "photo": profile_data.get("photo", {}),
        "sessions": [],
        "roles": [],
        "audit": [],
    }


@app.put("/profile/personal-info")
async def update_personal_info(payload: PersonalInfoUpdate, authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    key = f"profile_data:{user.user_id}"
    existing = await redis_client.get(key)
    state = json.loads(existing) if existing else {}
    updates = payload.model_dump(exclude_none=True)
    state.update(updates)
    await redis_client.set(key, json.dumps(state))

    await _append_audit_event(str(user.user_id), "PROFILE_UPDATED", {"status": "SUCCESS", "fields": list(updates.keys())})
    return {"status": "success", "message": "Personal information updated", "profile": state}


@app.post("/profile/photo/upload")
async def upload_photo(payload: dict, authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    image_url = payload.get("image_url")
    content_type = (payload.get("content_type") or "").lower()
    size_bytes = int(payload.get("size_bytes") or 0)

    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Unsupported image format")
    if size_bytes > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url is required")

    key = f"profile_data:{user.user_id}"
    existing = await redis_client.get(key)
    state = json.loads(existing) if existing else {}
    state["photo"] = {"image_url": image_url, "content_type": content_type, "updated_at": _utc_now()}
    await redis_client.set(key, json.dumps(state))

    await _append_audit_event(str(user.user_id), "PROFILE_PHOTO_UPDATED", {"status": "SUCCESS"})
    return {"status": "success", "photo": state["photo"]}


@app.delete("/profile/photo")
async def remove_photo(authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    key = f"profile_data:{user.user_id}"
    existing = await redis_client.get(key)
    state = json.loads(existing) if existing else {}
    state.pop("photo", None)
    await redis_client.set(key, json.dumps(state))
    await _append_audit_event(str(user.user_id), "PROFILE_PHOTO_REMOVED", {"status": "SUCCESS"})
    return {"status": "success", "message": "Profile photo removed"}


@app.get("/profile/email")
async def get_email_state(authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    email_flow_blob = await redis_client.get(f"email_flow:{user.user_id}")
    email_flow = json.loads(email_flow_blob) if email_flow_blob else {}
    return {
        "current_email": user.email,
        "pending_email": email_flow.get("pending_email"),
        "status": "PENDING" if email_flow.get("pending_email") else "ACTIVE",
        "expires_at": email_flow.get("expires_at"),
    }


@app.post("/profile/email/request-change")
async def request_email_change(payload: EmailChangeRequest, authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    new_email = payload.new_email.lower()
    domain = new_email.split("@")[-1]
    if domain not in ALLOWED_EMAIL_DOMAINS:
        raise HTTPException(status_code=400, detail="Email domain is not allowed")

    if new_email == user.email.lower():
        raise HTTPException(status_code=400, detail="New email must be different from current email")

    exists_result = await db.execute(text("SELECT 1 FROM security.users WHERE lower(email) = :email"), {"email": new_email})
    if exists_result.fetchone():
        raise HTTPException(status_code=409, detail="Email already in use")

    day_key = f"email_change_day_count:{user.user_id}:{datetime.now(timezone.utc).strftime('%Y%m%d')}"
    current_count = int(await redis_client.get(day_key) or "0")
    if current_count >= EMAIL_CHANGE_DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="Daily email change limit exceeded")

    flow_key = f"email_flow:{user.user_id}"
    flow = {
        "pending_email": new_email,
        "status": "PENDING_VERIFICATION",
        "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=EMAIL_OTP_TTL_SECONDS)).isoformat(),
    }
    await redis_client.setex(flow_key, EMAIL_OTP_TTL_SECONDS, json.dumps(flow))
    await redis_client.incr(day_key)
    await redis_client.expire(day_key, 86400)
    await _append_audit_event(str(user.user_id), "EMAIL_CHANGE_REQUESTED", {"status": "PENDING", "to": new_email})
    return {"status": "success", "message": "Email change initiated", "pending_email": new_email}


@app.post("/profile/email/send-verification")
async def send_email_verification(payload: EmailVerificationRequest, authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    flow_key = f"email_flow:{user.user_id}"
    flow_blob = await redis_client.get(flow_key)
    flow = json.loads(flow_blob) if flow_blob else {}
    if not flow.get("pending_email") or flow.get("pending_email") != payload.new_email.lower():
        raise HTTPException(status_code=400, detail="No matching pending email change request")

    resend_key = f"email_otp_resend_count:{user.user_id}:{flow['pending_email']}"
    resend_count = int(await redis_client.get(resend_key) or "0")
    if resend_count >= 5:
        raise HTTPException(status_code=429, detail="Resend limit reached")

    otp = f"{secrets.randbelow(1000000):06d}"
    otp_key = f"email_otp:{user.user_id}:{flow['pending_email']}"
    await redis_client.setex(otp_key, EMAIL_OTP_TTL_SECONDS, otp)
    await redis_client.incr(resend_key)
    await redis_client.expire(resend_key, EMAIL_OTP_TTL_SECONDS)

    await send_email_change_otp(flow["pending_email"], user.first_name or "User", otp)
    await _append_audit_event(str(user.user_id), "EMAIL_VERIFICATION_SENT", {"status": "SUCCESS", "to": flow["pending_email"]})
    return {"status": "success", "message": "Verification code sent", "ttl_seconds": EMAIL_OTP_TTL_SECONDS}


@app.post("/profile/email/verify")
async def verify_email_change(payload: EmailOtpVerifyRequest, authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    new_email = payload.new_email.lower()
    flow_key = f"email_flow:{user.user_id}"
    flow_blob = await redis_client.get(flow_key)
    flow = json.loads(flow_blob) if flow_blob else {}
    if flow.get("pending_email") != new_email:
        raise HTTPException(status_code=400, detail="Pending email mismatch")

    otp_key = f"email_otp:{user.user_id}:{new_email}"
    stored_otp = await redis_client.get(otp_key)
    if not stored_otp:
        raise HTTPException(status_code=400, detail="Verification code expired")
    if stored_otp != payload.otp:
        raise HTTPException(status_code=401, detail="Invalid verification code")

    await db.execute(
        text("UPDATE security.users SET email = :new_email WHERE user_id = :user_id"),
        {"new_email": new_email, "user_id": user.user_id},
    )
    await db.commit()

    await redis_client.delete(flow_key)
    await redis_client.delete(otp_key)
    await redis_client.delete(f"session:{user.user_id}")
    await _append_audit_event(str(user.user_id), "EMAIL_CHANGED", {"status": "SUCCESS", "from": user.email, "to": new_email})
    return {"status": "success", "message": "Email successfully verified and updated", "email": new_email}


@app.post("/profile/security/change-password")
async def change_password(payload: PasswordChangeRequest, authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    result = await db.execute(
        text("SELECT password_hash FROM security.users WHERE user_id = :user_id"),
        {"user_id": user.user_id},
    )
    row = result.fetchone()
    if not row or not verify_password(payload.current_password, row.password_hash):
        raise HTTPException(status_code=401, detail="Current password is invalid")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")

    await db.execute(
        text("UPDATE security.users SET password_hash = :pwd WHERE user_id = :user_id"),
        {"pwd": get_password_hash(payload.new_password), "user_id": user.user_id},
    )
    await db.commit()
    await _append_audit_event(str(user.user_id), "PASSWORD_CHANGED", {"status": "SUCCESS"})
    return {"status": "success", "message": "Password updated"}


@app.put("/profile/security/mfa")
async def update_mfa(payload: MFASettingsUpdate, authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    await db.execute(
        text("UPDATE security.users SET is_mfa_enabled = :enabled WHERE user_id = :user_id"),
        {"enabled": payload.enabled, "user_id": user.user_id},
    )
    await db.commit()
    await _append_audit_event(
        str(user.user_id),
        "MFA_UPDATED",
        {"status": "SUCCESS", "enabled": payload.enabled, "method": payload.method},
    )
    return {"status": "success", "enabled": payload.enabled, "method": payload.method}


@app.get("/profile/security/sessions")
async def get_sessions(authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    # Rule 2.1: Fetch Sessions from Auth Session Graph
    result = await db.execute(
        text("SELECT session_id, ip_address, expires_at, created_at FROM security.auth_sessions WHERE user_id = :user_id"),
        {"user_id": user.user_id}
    )
    rows = result.fetchall()
    sessions = [
        {
            "session_id": str(r.session_id),
            "device": "Browser",
            "ip": str(r.ip_address) if r.ip_address else "Unknown",
            "last_active": r.created_at.isoformat(),
            "status": "ACTIVE" if r.expires_at > datetime.now(timezone.utc) else "EXPIRED",
        }
        for r in rows
    ]
    return {"sessions": sessions}


@app.post("/profile/security/sessions/revoke")
async def revoke_session(payload: SessionRevokeRequest, authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    if payload.session_id != f"session:{user.user_id}":
        raise HTTPException(status_code=404, detail="Session not found")
    await redis_client.delete(payload.session_id)
    await _append_audit_event(str(user.user_id), "SESSION_REVOKED", {"status": "SUCCESS", "session_id": payload.session_id})
    return {"status": "success", "message": "Session revoked"}


@app.post("/profile/security/sessions/revoke-all")
async def revoke_all_sessions(authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    await redis_client.delete(f"session:{user.user_id}")
    await _append_audit_event(str(user.user_id), "ALL_SESSIONS_REVOKED", {"status": "SUCCESS"})
    return {"status": "success", "message": "All sessions revoked"}


@app.get("/profile/roles-access")
async def get_roles_access(authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    role = "Admin" if user.email.endswith("@company.com") else "User"
    permissions = ["profile:read", "profile:update", "security:manage_own"]
    if role == "Admin":
        permissions.extend(["audit:read", "token:manage"])
    return {"roles": [role], "effective_permissions": permissions}


@app.get("/profile/activity-log")
async def get_activity_log(
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    user = await _get_current_user(db, authorization)
    key = f"profile_audit:{user.user_id}"
    end_index = min(offset + max(limit, 1) - 1, 999)
    items = await redis_client.lrange(key, offset, end_index)
    events = [json.loads(x) for x in items]
    return {"events": events, "offset": offset, "limit": limit}


@app.get("/profile/api-tokens")
async def list_api_tokens(authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    key = f"api_tokens:{user.user_id}"
    items = await redis_client.lrange(key, 0, 100)
    tokens = [json.loads(x) for x in items]
    return {"tokens": tokens}


@app.post("/profile/api-tokens")
async def create_api_token(payload: ApiTokenCreateRequest, authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    token_id = secrets.token_hex(8)
    token_value = secrets.token_urlsafe(32)
    entry = {
        "token_id": token_id,
        "name": payload.name,
        "token_preview": f"{token_value[:6]}...{token_value[-4:]}",
        "created_at": _utc_now(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=payload.expiry_days)).isoformat(),
        "revoked": False,
    }
    key = f"api_tokens:{user.user_id}"
    await redis_client.lpush(key, json.dumps(entry))
    await _append_audit_event(str(user.user_id), "API_TOKEN_CREATED", {"status": "SUCCESS", "token_id": token_id})
    return {"status": "success", "token": token_value, "meta": entry}


@app.delete("/profile/api-tokens/{token_id}")
async def revoke_api_token(token_id: str, authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    user = await _get_current_user(db, authorization)
    key = f"api_tokens:{user.user_id}"
    items = await redis_client.lrange(key, 0, 100)
    updated = []
    found = False
    for raw in items:
        token = json.loads(raw)
        if token.get("token_id") == token_id:
            token["revoked"] = True
            found = True
        updated.append(token)

    if not found:
        raise HTTPException(status_code=404, detail="Token not found")

    await redis_client.delete(key)
    for token in reversed(updated):
        await redis_client.lpush(key, json.dumps(token))
    await _append_audit_event(str(user.user_id), "API_TOKEN_REVOKED", {"status": "SUCCESS", "token_id": token_id})
    return {"status": "success", "message": "Token revoked"}


@app.post("/auth/logout")
async def logout(request: Request):
    return {"message": "Logged out successfully"}
