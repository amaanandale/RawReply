# RawReply — Authentication & Team Management Architecture

**Version:** 2.0 (Custom JWT & Organization Engine)  
**Status:** Production Ready  

---

## 1. Architecture Overview

RawReply utilizes an internal, self-hosted authentication and multi-tenant organization authorization system built directly on Next.js App Router and PostgreSQL architecture. Clerk has been completely removed.

### Core Architectural Principles
- **Server-Side Security**: All sensitive authorization checks are performed on the server. Client-side state is never trusted for privilege verification.
- **Stateless Verification with Stateful Revocation**: Short-lived JWT access tokens enable high-performance stateless verification in middleware and server components, while database-backed refresh tokens allow immediate session revocation and reuse detection.
- **Multi-Tenant Isolation**: Every user belongs to one or more organizations. Data, Instagram accounts, automations, and leads are strictly partitioned by `organizationId`.
- **Zero LocalStorage Storage**: All authentication tokens are transported and stored exclusively via secure `HttpOnly` cookies.

---

## 2. Database Schema (PostgreSQL)

The database schema is defined in [`lib/db/migrations/001_initial_auth_schema.sql`](file:///c:/Users/moham/Desktop/rawautom/lib/db/migrations/001_initial_auth_schema.sql) and contains five core tables:

### 1. `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Unique user ID (`usr_...`) |
| `name` | VARCHAR(255) | NOT NULL | User's full name |
| `email` | VARCHAR(255) | UNIQUE NOT NULL | Normalized lowercase email address |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hash (10 salt rounds) |
| `email_verified_at`| TIMESTAMPTZ | NULL | Timestamp of verified email |
| `status` | VARCHAR(32) | DEFAULT 'active' | Account status (`active`, `suspended`) |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Record update timestamp |

### 2. `organizations`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Unique organization ID (`org_...`) |
| `name` | VARCHAR(255) | NOT NULL | Workspace display name |
| `slug` | VARCHAR(255) | UNIQUE NOT NULL | URL-safe unique slug |
| `created_at` | TIMESTAMPTZ | NOT NULL | Workspace creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Workspace update timestamp |

### 3. `organization_members`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Unique membership ID (`mem_...`) |
| `organization_id` | VARCHAR(64) | FK -> organizations(id) ON DELETE CASCADE | Associated organization |
| `user_id` | VARCHAR(64) | FK -> users(id) ON DELETE CASCADE | Associated user |
| `role` | VARCHAR(32) | DEFAULT 'member' | User's role (`owner`, `admin`, `member`) |
| `joined_at` | TIMESTAMPTZ | NOT NULL | Enrollment timestamp |

*Unique constraint on `(organization_id, user_id)` prevents duplicate memberships.*

### 4. `invitations`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Unique invitation ID (`inv_...`) |
| `organization_id` | VARCHAR(64) | FK -> organizations(id) ON DELETE CASCADE | Target workspace |
| `email` | VARCHAR(255) | NOT NULL | Invited colleague's email |
| `role` | VARCHAR(32) | DEFAULT 'member' | Assigned role upon acceptance |
| `token_hash` | VARCHAR(128)| UNIQUE NOT NULL | SHA-256 hash of random invite token |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Expiration timestamp (7 days) |
| `accepted_at` | TIMESTAMPTZ | NULL | Timestamp when invitation was accepted |
| `invited_by` | VARCHAR(64) | FK -> users(id) | User who sent the invitation |

### 5. `sessions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Unique session ID (`ses_...`) |
| `user_id` | VARCHAR(64) | FK -> users(id) ON DELETE CASCADE | Authenticated user |
| `active_organization_id`| VARCHAR(64)| FK -> organizations(id) ON DELETE SET NULL | Active workspace |
| `refresh_token_hash`| VARCHAR(128)| UNIQUE NOT NULL | SHA-256 hash of refresh token |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Session expiry (30 days) |
| `revoked_at` | TIMESTAMPTZ | NULL | Revocation timestamp if logged out |
| `user_agent` | TEXT | NULL | Client user agent string |
| `ip_address` | VARCHAR(64) | NULL | Client IP address |
| `last_used_at`| TIMESTAMPTZ | NOT NULL | Timestamp of last token rotation |

---

## 3. JWT & Session Lifecycle

### Access Token (15 Minutes)
- **Library**: `jose` (HS256 algorithm).
- **Claims**:
  - `sub`: User ID (`usr_...`).
  - `sid`: Session ID (`ses_...`).
  - `org`: Active Organization ID (`org_...`).
  - `rol`: Active Workspace Role (`owner`, `admin`, `member`).
  - `iss`: `rawreply`.
  - `aud`: `rawreply-api`.
  - `exp`: 15 minutes from issuance.

### Refresh Token (30 Days) & Rotation
- Cryptographically secure 40-byte random hex string.
- Stored **only as a SHA-256 hash at rest** in the `sessions` table.
- **Rotation**: On every call to `/api/auth/refresh`, the presented refresh token is invalidated, and a brand-new refresh token + access token pair is issued.
- **Reuse Detection**: If a previously used or revoked refresh token is presented, the system detects a potential token theft / replay attack and **immediately revokes all active sessions for that user**.

---

## 4. Cookie Security Policy

Both tokens are sent via HTTP response headers:

| Cookie Name | Max-Age | Security Flags |
|---|---|---|
| `rawreply_access_token` | 900s (15 min) | `HttpOnly`, `Secure` (in prod), `SameSite=Lax`, `Path=/` |
| `rawreply_refresh_token`| 2,592,000s (30 days)| `HttpOnly`, `Secure` (in prod), `SameSite=Lax`, `Path=/` |

**Security Guarantees:**
- JavaScript running in the browser cannot read authentication tokens (`document.cookie` is empty), mitigating XSS token exfiltration.
- `SameSite=Lax` defends against Cross-Site Request Forgery (CSRF).

---

## 5. Role-Based Access Control (RBAC)

Three roles are supported with centralized enforcement in [`lib/auth/permissions.js`](file:///c:/Users/moham/Desktop/rawautom/lib/auth/permissions.js):

| Capability / Action | Owner | Admin | Member |
|---|:---:|:---:|:---:|
| View Dashboard & Leads | ✅ | ✅ | ✅ |
| View Assigned Automations | ✅ | ✅ | ✅ |
| Manage Automations & Questionnaires | ✅ | ✅ | ❌ |
| Connect Instagram Accounts | ✅ | ✅ | ❌ |
| Disconnect Instagram Accounts | ✅ | ✅ | ❌ |
| Export Qualified Leads | ✅ | ✅ | ❌ |
| Invite New Team Members | ✅ | ✅ | ❌ |
| Change Member Roles | ✅ | ❌ | ❌ |
| Remove Team Members | ✅ (except self) | ✅ (members only) | ❌ |
| Manage Organization Settings | ✅ | ❌ | ❌ |

**Privilege Escalation Defenses:**
- No user can remove the organization Owner.
- Admins cannot promote themselves or others to Owner.
- Members cannot perform any administrative actions.

---

## 6. Endpoints Reference

### Authentication Endpoints
- `POST /api/auth/register`: Create user account, provisions initial workspace with `owner` role, sets cookies.
- `POST /api/auth/login`: Authenticate with email/password, issue session and tokens.
- `POST /api/auth/logout`: Revoke active session and clear cookies.
- `POST /api/auth/logout-all`: Revoke all sessions for current user across all devices.
- `POST /api/auth/refresh`: Rotate refresh token and issue fresh access token.
- `GET /api/auth/me`: Get current authenticated user, active organization, role, and workspace list.
- `POST /api/auth/forgot-password`: Request password reset email (rate limited, enumeration-proof).
- `POST /api/auth/reset-password`: Apply new password using verified one-time token.

### Organization Endpoints
- `GET /api/organizations`: List all organizations user belongs to.
- `POST /api/organizations`: Create a new workspace (creator becomes Owner).
- `POST /api/organizations/switch`: Switch active workspace in session and issue updated JWT.
- `GET /api/organizations/members`: List members of active workspace.
- `POST /api/organizations/members`: Invite colleague by email.
- `POST /api/organizations/members/role`: Update member role (Owner only).
- `POST /api/organizations/members/remove`: Remove member from workspace.
- `GET /api/organizations/invitations`: List pending workspace invitations.
- `POST /api/organizations/invitations/cancel`: Cancel pending invitation.
- `POST /api/organizations/invitations/accept`: Accept invitation token.

---

## 7. Instagram Integration Compatibility

The internal organization engine integrates with the Meta Graph API v21.0 integration:
1. `/api/auth/meta/authorize`: Validates that the active user possesses `PERMISSIONS.CONNECT_INSTAGRAM`, embeds the internal `organizationId` and `userId` into an HMAC-SHA256 signed OAuth state token.
2. `/api/auth/meta/callback`: Validates state signature, retrieves long-lived page access tokens, encrypts tokens using **AES-256-GCM**, and saves the connected account in `accountStore` strictly keyed by `organizationId`.
3. `/api/accounts`: Strips tokens (`sanitizeAccount`) and scopes account listings strictly to the user's active organization.
4. `/api/webhooks/meta`: Webhook ingestion and HMAC verification operate independently of browser session cookies.

---

## 8. Environment Variables

Documented in [`.env.example`](file:///c:/Users/moham/Desktop/rawautom/.env.example):

```bash
# PostgreSQL Connection
DATABASE_URL=postgresql://user:password@localhost:5432/rawreply

# JWT Configuration
JWT_ACCESS_SECRET=your_32_byte_secret_here
JWT_ISSUER=rawreply
JWT_AUDIENCE=rawreply-api

# AES-256-GCM Token Encryption Key
ENCRYPTION_SECRET=your_32_byte_hex_secret_here

# Meta Graph API
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_WEBHOOK_VERIFY_TOKEN=your_verify_token

# Email Dispatch
EMAIL_PROVIDER=resend # or 'smtp', 'sendgrid'
EMAIL_FROM=RawReply Security <noreply@rawreply.io>
```

