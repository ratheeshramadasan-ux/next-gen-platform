# API Contracts: Identity & Access Management

This document defines the interface specifications for the IAM services.

## 🔹 1. Authentication & Token APIs

### SAML 2.0 Initiation
`GET /auth/saml/login?tenant_id={id}`
- **Redirects to**: IdP SSO URL.

### SAML Assertion Consumer Service (ACS)
`POST /auth/saml/acs`
- **Body**: `SAMLResponse` (Encoded XML)
- **Response**: `302 Found` (Redirect to Platform)

### OIDC Direct Login
`GET /auth/oidc/login?provider={azure|okta|aws}`
- **Response**: `302 Found` (IdP Authorization endpoint)

### Token Issuance
`POST /auth/token`
- **Request**: `{ "grant_type": "authorization_code", "code": "...", "client_id": "..." }`
- **Response**:
  ```json
  {
    "access_token": "eyJhbGci...",
    "refresh_token": "def456...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
  ```

---

## 🔹 2. SCIM v2 Provisioning (RFC 7643/7644)

### Create/Update User
`POST /scim/v2/Users`
- **Payload**:
  ```json
  {
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
    "userName": "ratheesh@zohomailcloud.ca",
    "externalId": "ext-789",
    "name": { "givenName": "Ratheesh", "familyName": "Ramadasan" },
    "emails": [{ "value": "ratheesh@zohomailcloud.ca", "primary": true }],
    "groups": [{ "display": "Finance_Admins", "value": "grp-001" }]
  }
  ```

---

## 🔹 3. Internal Group Mapping APIs

### Define Identity Mapping
`POST /identity/group-mappings`
- **Request**:
  ```json
  {
    "provider_id": "idp-001",
    "external_group_name": "Azure_DevOps_Admins",
    "internal_role_id": "platform_admin",
    "internal_group_id": "devops_infrastructure",
    "priority": 1,
    "mapping_type": "dynamic"
  }
  ```

---

## 🔹 4. RBAC Authorization

### Authorize Request
`POST /rbac/authorize`
- **Request**: `{ "user_id": "...", "permission": "PROJECT_DELETE", "resource_id": "prj-123" }`
- **Response**: `{ "authorized": true, "reason": "Role membership 'Owner'" }`
