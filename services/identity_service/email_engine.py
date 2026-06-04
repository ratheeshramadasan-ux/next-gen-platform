from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr, BaseModel
from typing import List
import os

class EmailSchema(BaseModel):
    email: List[EmailStr]

conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "mock_user"),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "mock_pass"),
    MAIL_FROM = os.getenv("MAIL_FROM", "security@nextgen.com"),
    MAIL_PORT = int(os.getenv("MAIL_PORT", 1025)),
    MAIL_SERVER = os.getenv("MAIL_SERVER", "mailhog"), # Default to a common dev tool like MailHog
    MAIL_STARTTLS = False,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = False,
    VALIDATE_CERTS = False
)

async def send_activation_email(email_to: str, first_name: str, token: str):
    html = f"""
    <h3>Activate Your Super Admin Account</h3>
    <p>Hello {first_name},</p>
    <p>Please click the link below to verify your identity and activate your account:</p>
    <a href="http://localhost:3000/activate?token={token}">Activate Account</a>
    <p>This link will expire in 24 hours. You will be asked for your Date of Birth.</p>
    """

    message = MessageSchema(
        subject="NextGen: Account Activation Required",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    # In a real environment, we'd wrap this in a try-block and log results
    await fm.send_message(message)
    return True


async def send_email_change_otp(email_to: str, first_name: str, otp: str):
    html = f"""
    <h3>Verify Your New Email Address</h3>
    <p>Hello {first_name},</p>
    <p>Your NextGen verification code is:</p>
    <h2>{otp}</h2>
    <p>This code expires in 10 minutes.</p>
    """

    message = MessageSchema(
        subject="NextGen: Email Change Verification",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)
    return True
