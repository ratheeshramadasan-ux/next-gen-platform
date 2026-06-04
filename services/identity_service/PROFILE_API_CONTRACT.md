# User Profile & Identity API Contract

All profile endpoints require `Authorization: Bearer <access_token>`.

## Profile Core

- `GET /profile`
  - Returns:
    - `profile`
    - `email` (`current`, `pending`, `status`)
    - `photo`
    - `sessions`, `roles`, `audit` placeholders
- `PUT /profile/personal-info`
  - Editable fields only:
    - `full_name`, `display_name`, `phone_number`, `job_title`, `department`, `timezone`, `language`
  - Email is not editable here.

## Profile Photo

- `POST /profile/photo/upload`
  - Body:
    - `image_url`, `content_type`, `size_bytes`
  - Allowed: `image/jpeg`, `image/png`, `image/webp`
  - Max: 5MB (configurable in code)
- `DELETE /profile/photo`

## Email Management Workflow

- `GET /profile/email`
  - Returns current + pending state.
- `POST /profile/email/request-change`
  - Body: `new_email`
  - Enforces:
    - allowed domain list (`ALLOWED_EMAIL_DOMAINS`)
    - uniqueness
    - daily rate limit (`EMAIL_CHANGE_DAILY_LIMIT`)
- `POST /profile/email/send-verification`
  - Body: `new_email`
  - Sends 6-digit OTP to pending email.
- `POST /profile/email/verify`
  - Body: `new_email`, `otp`
  - On success:
    - updates `security.users.email`
    - clears pending state
    - invalidates active session

## Security

- `POST /profile/security/change-password`
  - Body: `current_password`, `new_password`
- `PUT /profile/security/mfa`
  - Body: `enabled`, `method` (`TOTP | EMAIL_OTP | SMS`)
- `GET /profile/security/sessions`
- `POST /profile/security/sessions/revoke`
  - Body: `session_id`
- `POST /profile/security/sessions/revoke-all`

## Roles & Access (Read-Only)

- `GET /profile/roles-access`
  - Returns role list + effective permissions.

## Activity Log

- `GET /profile/activity-log?limit=50&offset=0`
  - Redis-backed event timeline (newest first).

## API Tokens

- `GET /profile/api-tokens`
- `POST /profile/api-tokens`
  - Body: `name`, `expiry_days`
  - Returns token once at creation.
- `DELETE /profile/api-tokens/{token_id}`

## Environment Controls

- `ALLOWED_EMAIL_DOMAINS` (comma-separated, default `company.com`)
- `EMAIL_CHANGE_DAILY_LIMIT` (default `3`)
- `EMAIL_OTP_TTL_SECONDS` (default `600`)
