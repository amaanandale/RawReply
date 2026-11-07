# RawReply — Super Admin Architecture & Governance

## 1. Overview & Separation of Concerns

RawReply enforces a strict boundary between two independent application experiences:

1. **Customer Dashboard (`/dashboard(.*)`)**:
   - Built for registered customers, creators, and business teams.
   - Manages connected Instagram business accounts, comment-to-DM automated sequences, team collaboration, and qualified lead spreadsheets.
   - Enforces organization-level Multi-Tenant Workspace isolation with roles (`OWNER`, `ADMIN`, `MEMBER`).

2. **Super Admin Dashboard (`/admin(.*)`)**:
   - Built exclusively for platform owners and system administrators.
   - Complete system governance: customer directory, workspace inspection, live Instagram integration telemetry, system-wide qualified lead validation, and immutable audit logs.
   - Controlled via platform-level authorization (`is_super_admin: true`, `platform_role: 'super_admin'`).

Ordinary customers can **never** access `/admin` or invoke `/api/admin/*` endpoints.

---

## 2. Authentication, Authorization & Privilege Escalation Prevention

### Registration Isolation
- The public registration endpoint (`/api/auth/signup`) explicitly hardcodes `isSuperAdmin: false` and `platformRole: null`.
- External request bodies are schema-validated with Zod; any administrative flags sent by an applicant are ignored and stripped.

### Access Token Claims & Middleware Enforcement
- Short-lived JWT access tokens (15-minute expiration, HS256) include the `adm: boolean` claim.
- Next.js Edge Middleware (`middleware.js`) inspects `/admin(.*)`:
  - Unauthenticated requests are redirected to `/login?redirect=/admin`.
  - Authenticated customers without `adm: true` are immediately blocked and redirected to `/dashboard`.
- Server-side Route Handlers verify authorization via `requireSuperAdmin(req)` in `lib/admin/auth.js`, returning `403 Forbidden` if unverified.

---

## 3. Super Admin Provisioning Script

Super Admin accounts are provisioned exclusively via secure CLI commands or environment variables, completely detached from public web forms.

### CLI Syntax
```bash
node scripts/provision-super-admin.mjs <email> [name] [password]
```

### Examples
- **Promote an existing customer to Super Admin:**
  ```bash
  node scripts/provision-super-admin.mjs owner@rawreply.com
  ```
- **Provision a new Super Admin account:**
  ```bash
  node scripts/provision-super-admin.mjs admin@rawreply.com "Platform Owner" "SecurePassword123!"
  ```

Every provisioning operation is permanently recorded in the system audit log.

---

## 4. Customer & Workspace Suspension Lifecycle

Super Admins have the authority to suspend customers or organizations that violate terms of service or Meta messaging policies:

1. **Customer Suspension:**
   - Setting a customer status to `suspended` immediately marks their record in the database.
   - All active device sessions for that user are immediately revoked (`revokeAllUserSessions`).
   - Subsequent login attempts or token refresh attempts fail with: `"Your account has been suspended. Please contact support."`
2. **Reactivation:**
   - Restores account status to `active` and records the administrative action in the audit trail.

---

## 5. System Audit Trail (`system_audit_logs`)

All sensitive platform operations are written to the `system_audit_logs` table:

| Column | Type | Description |
|---|---|---|
| `id` | `VARCHAR(64)` | Unique log identifier (`log_...`) |
| `action` | `VARCHAR(64)` | Event key (`super_admin_created`, `customer_suspended`, etc.) |
| `performed_by` | `VARCHAR(64)` | User ID of the actor initiating the action |
| `target_type` | `VARCHAR(64)` | Entity type (`user`, `organization`, `system`) |
| `target_id` | `VARCHAR(64)` | Entity identifier |
| `details` | `JSON / TEXT` | Contextual payload (reasons, emails, metadata) |
| `ip_address` | `VARCHAR(45)` | Client IP address |
| `user_agent` | `TEXT` | Browser/Client user agent string |
| `created_at` | `TIMESTAMPTZ` | Timestamp of occurrence |

---

## 6. Strict Zero Fake Data & Compliance Rules

- **Subscriptions:** No simulated MRR or dummy subscriber counts are displayed. Billing is marked as unconfigured until a payment gateway is connected.
- **Qualified Leads:** Only customers who affirmatively submit a valid mobile number during a DM sequence qualify as leads. Unqualified commenters are never persisted or counted as leads.
- **Token Security:** Meta OAuth tokens are encrypted at rest with AES-256-GCM and stripped from all Super Admin UI views and API payloads.

