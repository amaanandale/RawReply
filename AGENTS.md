# RawReply — Engineering Instructions

> This is the permanent engineering instruction document for the RawReply project.
> Read this file and `design.md` before every implementation task.

---

## Architecture Overview

- **Framework**: Next.js 16.4.5 (App Router).
- **Runtime & Deployment**: Node.js on Vercel Serverless Functions (`https://rawreply.vercel.app`).
- **Language**: JavaScript only (`.js`, `.jsx`, `.mjs`) — strictly **no TypeScript**.
- **Database Architecture**:
  - Primary: Neon Serverless PostgreSQL (`DATABASE_URL`) with connection pooling (`pg.Pool`), SSL enabled, and migration runner (`lib/db/migrations/`).
  - Fallback: Local persistent file-based JSON store (`data/auth_db.json` / `/tmp/data/auth_db.json`) for headless environments where `DATABASE_URL` is unavailable.
- **Cryptography & Security**:
  - Token Encryption at rest: AES-256-GCM authenticated encryption (`ENCRYPTION_SECRET`) with initialization vector (`iv`) and auth tag (`tag`) stored alongside ciphertext for all Meta/Instagram access tokens, page tokens, and Microsoft tokens (`lib/crypto/encryption.js`).
  - Passwords: Salted bcrypt hashing with 10 rounds (`lib/auth/password.js`).
  - Webhook Signatures: HMAC-SHA256 signature verification (`X-Hub-Signature-256`) using `META_APP_SECRET`.
  - State Cookies: HMAC-SHA256 signed tamper-proof HttpOnly cookies (`rawreply_meta_oauth_state`) with 10-minute TTL.
- **Modularity**:
  - Keep components modular and reusable under `components/ui/` and `components/shared/`.
  - Server-side business logic and stores in `lib/`.
  - Prefer React Server Components for pages and data loading; use Client Components (`"use client"`) only where interactive state, popups, or hooks are needed.
  - Zero tolerance for leaked secrets: never import server modules in client components.

---

## Authentication, Multi-Tenancy & RBAC

### Custom JWT Session Management
- **Access Tokens**: Short-lived (15 minutes) signed JWT (`JWT_ACCESS_SECRET`, HS256) stored in HttpOnly, SameSite=Lax cookies (`rawreply_access_token`).
- **Refresh Tokens**: Cryptographically random 32-byte hex strings stored as SHA-256 hashes at rest in the `sessions` table (30-day lifetime). Handled via HttpOnly cookie (`rawreply_refresh_token`).
- **Token Rotation & Reuse Attack Detection**:
  - Refreshing tokens issues a new access token and automatically rotates the refresh token.
  - If an expired or already-rotated refresh token is reused, all sessions for that user family are immediately revoked.
- **Route Protection**:
  - Next.js Edge Middleware (`middleware.js`) protects `/dashboard(.*)` and `/admin(.*)`.
  - Server-side session verification via `getCurrentSession(req)` enforces valid user identity and active organization context on every API request.

### Multi-Tenancy & Workspace Isolation
- Every business customer belongs to an **Organization** (`organizations`).
- Every query operating on accounts, automations, media, leads, or executions **MUST strictly filter by `organization_id`**. Never rely on client-supplied organization IDs without verifying session membership.
- Users belong to organizations via `organization_members` with roles:
  - **`owner`**: Full workspace access, billing, workspace settings, integrations, and member management.
  - **`admin`**: Manage automations, connected accounts, and integrations; access qualified leads; invite members.
  - **`member`**: View automations and qualified leads.
- **Super Admin Role**:
  - Identified by `platform_role === 'super_admin'` or matching `SUPER_ADMIN_EMAIL`.
  - Has access to `/admin` routes (system health, customers overview, audit logs, error logs).
  - Normal customer users have `platform_role === 'customer'`.

---

## Meta & Instagram Integration Architecture

### Dual-Channel OAuth Flows with Popup Return
RawReply supports two dedicated OAuth connection channels: Direct Instagram Login (`instagram.com`) and Facebook Page Login (`facebook.com`), both using popup dialogs with `window.opener.postMessage` completion:

1. **Instagram Direct Login (`instagram.com/oauth/authorize`)**:
   - Initiated via `/api/auth/instagram/authorize?popup=1` using `buildInstagramDirectLoginUrl()`.
   - Permissions requested: `instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_manage_messages`.
   - Callback handled at `/api/auth/instagram/callback`:
     1. Exchanges `code` via `POST https://api.instagram.com/oauth/access_token`.
     2. Exchanges short-lived token for 60-day long-lived token via `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token`.
     3. Fetches profile and initial media from `https://graph.instagram.com/me`.
     4. Saves to Neon `instagram_accounts` with `login_provider = 'instagram'`.
2. **Facebook Page Login (`facebook.com/dialog/oauth`)**:
   - Initiated via `/api/auth/meta/authorize?platform=facebook&popup=1` using `buildFacebookLoginUrl()`.
   - Config ID (`META_CONFIG_ID`) and `display=popup`.
   - Callback handled at `/api/auth/meta/callback` with `login_provider = 'facebook'`.
3. **State Generation & Tamper Protection (`lib/meta/oauth-state.js`)**:
   - Generates 32 random bytes (`crypto.randomBytes(32)`), associates `organizationId`, `userId`, `platform`, and `popup=true`.
   - Stores in-memory/durable cache and signs a 10-minute HttpOnly cookie (`rawreply_meta_oauth_state`) with HMAC-SHA256.
4. **Popup Completion via `window.opener.postMessage`**:
   - Both callbacks return a minimal HTML page that sends `window.opener.postMessage({ type: 'META_OAUTH_COMPLETE', success, username, platform, error })` and calls `window.close()`.
   - Parent windows listen for `META_OAUTH_COMPLETE` and immediately re-fetch accounts and media in-place without page reloads.
5. **Graph API Routing (`lib/meta/client.js` & `lib/meta/automation-runner.js`)**:
   - Accounts connected via Direct Instagram Login (`login_provider === 'instagram'`) route comment replies, private DMs, and media queries through `https://graph.instagram.com/v21.0/...`.
   - Accounts connected via Facebook Page Login (`login_provider === 'facebook'`) route through `https://graph.facebook.com/v21.0/...`.
6. **Automatic Webhook Subscription**:
   - Subscribes Facebook Page feed/messages webhooks: `POST /{page-id}/subscribed_apps?subscribed_fields=feed,messages`.
   - Subscribes direct Instagram Business webhooks: `POST /{instagram_id}/subscribed_apps?subscribed_fields=comments,messages`.
   - Can be re-verified anytime via the **Verify Webhooks** button (`/api/accounts/subscribe-webhooks`).
7. **Media Synchronization**:
   - Immediately fetches up to 24 recent posts and Reels via `GET /{ig-user-id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count`.
   - Persists in Neon `instagram_media` with `account_id` foreign key.
8. **Account Slots**:
   - Enforces a maximum limit of **4 connected accounts** per customer organization workspace.

---

## Real-Time Webhook Pipeline & Automation Engine

```
[User Comments on IG Post / Reel]
               │
               ▼
   [Meta Webhook Delivery]
   POST /api/webhooks/instagram (or /api/webhooks/meta)
               │
               ├─► HMAC-SHA256 signature verification (X-Hub-Signature-256)
               ├─► Durable deduplication in `webhook_events` (dedup_key = comment_id)
               │   └─► If already processed, return 200 OK immediately
               ▼
   [Payload Parser & Normalizer]
   Extracts comment_id, post_id, text, commenter_id, username
   Ignores self-comments (commenter_id === account_id)
               │
               ▼
   [Active Automation Matcher]
   Queries Neon `automations` by organization_id & instagram_account_id
   Matches post_id (supports exact ID and `med_` prefixed ID)
   Checks trigger type:
     - 'any': triggers on all valid comments
     - 'keyword': checks case-insensitive comma-separated keywords
               │
               ▼
   [Automation Execution]
   1. Records comment in `comments` table
   2. If public reply enabled:
      POST https://graph.facebook.com/v21.0/{comment_id}/replies
      body: { message: publicReplyText }
   3. If private DM enabled:
      POST https://graph.facebook.com/v21.0/{instagramAccountId}/messages
      body: { recipient: { comment_id: comment_id }, message: { text: dmText } }
   4. Records execution status in `automation_executions`
   5. Logs any Graph API errors to `system_errors` with category 'META_API'
```

### Automation Execution Logging & Diagnostics
- **`automation_executions`**: Logs every trigger execution with `status` (`completed`, `failed`), `public_reply_sent`, `dm_sent`, `trigger_text`, and execution duration.
- **`system_errors`**: Captures Graph API error codes (e.g. error 10 / subcode 2534027 messaging window, permission errors) with full stack and metadata.
- **Test Simulator (`/api/automations/test-simulate`)**: Diagnostic API allowing users to test trigger keyword matching, comment reply formatting, and DM payload construction directly in the UI without waiting for live Meta events.

---

## RawReply Business Rules

1. **Lead Qualification Rule**:
   - **Only customers who submit a valid phone number qualify as leads.**
   - Do not permanently save unqualified commenters as leads.
   - Unqualified commenters only have ephemeral comment logs in `comments` and execution traces in `automation_executions`.
2. **Idempotence**:
   - Same phone number + same post MUST NEVER create duplicate leads in `captured_leads`.
   - Prevent duplicate lead exports to Excel (`exported_to_excel` flag).
3. **Meta Messaging Policy Compliance**:
   - DMs initiated from comments use the Meta Private Replies API (`recipient: { comment_id }`), which operates within a 7-day window from comment creation.
   - Ongoing conversation follow-ups respect Meta's standard 24-hour messaging window.
4. **Lead Export Destination**:
   - Qualified leads are synced to Microsoft Excel via Microsoft Graph API (`/api/integrations/microsoft`).
   - Supports manual CSV/XLSX downloads and automated background workbook syncing.

---

## Code Quality & Guardrails

- **JavaScript Only**: Do not introduce TypeScript files (`.ts`, `.tsx`). All code must be idiomatic JavaScript with JSDoc where helpful.
- **No Test Files**: Do not generate test files (`*.test.js`, `*.spec.js`, `__tests__/`) in this workspace.
- **No Direct Git Push**: Never run `git push` unless explicitly asked by the user.
- **No Hardcoded Secrets**: All tokens, app secrets, and connection strings must come from environment variables.
- **Input Validation**: Use Zod schemas (`lib/validations/`) for external API and form input validation.
- **Error Handling**: Never expose stack traces or raw database connection strings to the client. Return sanitized error messages.
- **ESLint Cleanliness**: Ensure zero ESLint errors before completing tasks (`npm run lint`).
- **Production Build Cleanliness**: Code must cleanly compile via `npm run build`.

---

## Project Structure

```
app/
  (auth)/
    login/[[...sign-in]]/page.js    → Sign in page
    signup/[[...sign-up]]/page.js   → Registration page
    forgot-password/page.js         → Password recovery request
    reset-password/page.js          → Password reset confirmation
  (dashboard)/
    dashboard/
      page.js                       → Dashboard overview (metrics, checklist, media grid)
      accounts/page.js              → Connected social accounts & slots
      automations/page.js          → Comment-to-DM trigger automation workflows
      leads/page.js                 → Qualified leads management & exports
      integrations/page.js          → Meta, Excel, Google Sheets integrations
      team/page.js                  → Team members, invitations & workspace roles
      settings/page.js              → Workspace settings & security
  admin/                            → Super admin portal (/admin)
  api/
    accounts/                       → Account listing, disconnect, subscribe-webhooks
    auth/                           → Login, register, refresh, password reset, me
      meta/authorize/route.js       → Meta Unified Login OAuth initiator (popup aware)
      meta/callback/route.js        → Meta OAuth callback (popup postMessage return)
      meta/data-deletion/route.js   → Meta user data deletion callback
      microsoft/                    → Microsoft OAuth authorize & callback
    automations/                    → CRUD automations & /test-simulate endpoint
    dashboard/overview/route.js     → Overview metrics & primary account state
    instagram/media/route.js        → Cached media lookup & on-demand sync
    integrations/                   → Integration statuses & Microsoft workbooks/worksheets
    leads/                          → Qualified leads listing & Excel/CSV export
    webhooks/
      instagram/route.js            → Real-time Instagram comment & message webhook
      meta/route.js                 → Meta Graph API feed & comments webhook
components/
  dashboard/                        → Client components for dashboard views
    accounts-client.jsx             → Dual popup login buttons, slot limits, guide
    automations-manager.jsx         → Automation cards, edit modal, test trigger modal
    dashboard-overview-client.jsx   → Overview metrics, checklist, media grid, popup OAuth
    integrations-client.jsx         → Integration connection cards
    leads-client.jsx                → Qualified leads cards, filters, and export
    team-client.jsx                 → Team members management
  layout/                           → Sidebar, header, mobile bottom navigation
  shared/                           → Status badges, metric cards, empty states, icons
  ui/                               → Reusable UI primitives (Button, Card, Badge, Input, Table)
lib/
  auth/                             → JWT tokens, cookies, passwords, permissions, sessions
  crypto/                           → AES-256-GCM encryption & decryption
  db/                               → Neon PostgreSQL client (`lib/db/client.js`) & SQL migrations
  events/                           → Durable webhook event deduplication store
  meta/                             → Meta Graph API client, Unified Login OAuth state, automation runner
  monitoring/                       → Structured error logger (`system_errors`) & login tracker
  storage/                          → Account store, lead store, integration store
  validations/                      → Zod schemas for auth, phone numbers, and automations
```

---

## Environment Variables Reference

All required environment variables are documented in `.env.example`:
- `DATABASE_URL`: Neon PostgreSQL connection string.
- `JWT_ACCESS_SECRET`: 32-byte secret for access token signing.
- `ENCRYPTION_SECRET`: 32-byte hex key for AES-256-GCM token encryption.
- `META_APP_ID`: Meta Facebook App ID (`1531237922145783`).
- `META_APP_SECRET`: Meta Facebook App Secret.
- `META_CONFIG_ID`: Meta Configuration ID (`1106955532119603`).
- `META_REDIRECT_URI`: OAuth callback URI (`https://rawreply.vercel.app/api/auth/meta/callback`).
- `META_WEBHOOK_VERIFY_TOKEN`: Webhook subscription verification token.
- `NEXT_PUBLIC_APP_URL`: Base application URL.
- `MICROSOFT_CLIENT_ID` & `MICROSOFT_CLIENT_SECRET`: Azure Entra credentials for Excel sync.
