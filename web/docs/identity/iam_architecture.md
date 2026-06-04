# Identity & Access Management (IAM) Microservices Architecture

This document specifies the core services, interactions, and sequence flows for the Next Gen platform's IAM layer, optimized for high-performance RPA, iPaaS, and AI orchestration.

## 🧱 1. Microservices Architecture

### 🔹 Core Identity Services
| Service | Responsibility | Key Endpoints |
| :--- | :--- | :--- |
| **Identity Gateway** | Central entry point for all auth flows; session persistence. | `/auth/saml/*`, `/auth/oidc/*` |
| **Token Service** | Signature validation, JWT issuance, and Refresh handling. | `/auth/token`, `/auth/refresh` |
| **Group Mapping Engine** | Resolves external IdP groups into internal Roles/Groups. | `/internal/mapping/resolve` |
| **SCIM Service** | Standards-based automated provisioning/deprovisioning. | `/scim/v2/Users`, `/scim/v2/Groups` |
| **LDAP Connector** | Real-time connectivity to Active Directory / AWS DS. | Native LDAP (TCP/TLS) |
| **RBAC Service** | Permission enforcement and Role hierarchy management. | `/rbac/authorize`, `/rbac/roles` |
| **Identity Config** | encrypted storage of IdP metadata and certificates. | `/identity/config` |
| **Audit Chronicle** | Immutable ledger of all identity events and login attempts. | `/audit/identity` |

---

## 🔄 2. Transactional Sequence Flows

### 🔹 SAML 2.0 + Group Mapping Flow
1. **Initiation**: User hits platform; redirected to IdP (e.g., Entra ID) via SAML AuthRequest.
2. **Assertion**: User authenticates at IdP; SAML Assertion returned to `/auth/saml/acs`.
3. **Validation**: **Token Service** validates IdP signature and assertion timeframe.
4. **Resolution**: 
   - **Mapping Engine** extracts `memberOf` attributes.
   - Matches external strings against `group_mappings` table.
   - **RBAC Service** aggregates final sets of internal `Role_IDs` and `Group_IDs`.
5. **Issuance**: Platform JWT issued with resolved scope; user session initialized.

### 🔹 SCIM v2 Provisioning Flow
1. **Push**: Azure/Okta triggers `POST /scim/v2/Users`.
2. **Creation**: **SCIM Service** creates user record with `external_id`.
3. **Linking**: 
   - External groups are stored as reference attributes.
   - **Mapping Engine** triggers an asynchronous role update.
4. **Acknowledgement**: Success returned to IdP; user is ready for SSO JIT login.

---

## 🔐 3. Security Design Principles
- **Certificate Pinning**: Platform anchors IdP trust via specific public keys stored in Vault.
- **JIT Provisioning**: Automatic user creation on first SAML/OIDC success if SCIM is unavailable.
- **Least Privilege Mapping**: Fallback to "Standard User" if no external group matches are found.
- **Zero-Trust Token Validation**: Every service re-validates the Token Service signature on ingress.

---

## 🧭 4. Deployment Model
- **Stateless Runtime**: All services horizontally scalable via Kubernetes.
- **Session Cache**: Redis-backed token/session blacklisting.
- **Secret Management**: Certificates and Client Secrets stored in **HashiCorp Vault**.
