# RawReply — Instagram & Meta Graph API Integration Guide

This document is the complete step-by-step technical guide for configuring your **Meta Developer Application**, **Instagram Professional Account**, **OAuth 2.0 Authentication**, and **Webhooks** for RawReply.

---

## 1. Prerequisites

Before connecting Instagram to RawReply, you must satisfy Meta's technical prerequisites:

1. **Instagram Professional Account**:
   - Must be an **Instagram Business** or **Instagram Creator** account.
   - *Personal accounts do not have access to the Meta Graph API webhook architecture.*
2. **Linked Facebook Page**:
   - The Instagram Professional account must be connected to a Facebook Page where you hold **Admin** or **Task** management rights.
   - Configure this in **Instagram Mobile App → Settings → Account → Linked Accounts → Facebook Page**.
3. **Meta Developer Account**:
   - Register at [developers.facebook.com](https://developers.facebook.com).

---

## 2. Meta Application Setup

### Step 1: Create a Meta App
1. Go to [Meta for Developers](https://developers.facebook.com/apps).
2. Click **Create App**.
3. Select **Other** as the use case, then click **Next**.
4. Choose **Business** as the app type.
5. Provide your App Name (e.g. `RawReply Automation`) and contact email.
6. Connect your Meta Business Account.

### Step 2: Add Products
In the Meta App Dashboard, add the following products:
- **Instagram Graph API**
- **Facebook Login for Business**
- **Webhooks**

---

## 3. Required Meta Permissions

When a user initiates the Instagram connection via RawReply OAuth, the following permissions are requested:

| Permission | Purpose |
|---|---|
| `instagram_basic` | Read basic Instagram profile information (username, ID, profile picture) |
| `instagram_manage_comments` | Receive real-time comment webhooks and reply to comments on posts & reels |
| `instagram_manage_messages` | Send automated qualification DMs and receive customer replies |
| `pages_show_list` | Discover the Facebook Pages managed by the authenticated user |
| `pages_read_engagement` | Read post engagement and comment metadata |
| `pages_manage_metadata` | Subscribe RawReply webhooks to the connected Facebook Page |

---

## 4. OAuth 2.0 Configuration

In your Meta App Dashboard under **Facebook Login for Business → Settings**:

1. Under **Client OAuth Settings**:
   - **Client OAuth Login**: Enabled (Yes)
   - **Web OAuth Login**: Enabled (Yes)
   - **Enforce HTTPS**: Enabled (Yes)
2. Under **Valid OAuth Redirect URIs**:
   - For local development: `http://localhost:3000/api/auth/meta/callback`
   - For production: `https://your-domain.com/api/auth/meta/callback`
3. Save changes.

---

## 5. Webhook Configuration

In your Meta App Dashboard under **Webhooks**:

1. Select **Instagram** from the dropdown.
2. Click **Subscribe to this object**.
3. Configure the webhook parameters:
   - **Callback URL**: `https://your-domain.com/api/webhooks/meta`
   - **Verify Token**: Enter the exact string configured in your `META_WEBHOOK_VERIFY_TOKEN` environment variable.
4. Click **Verify and Save**. Meta will send a `GET` handshake request to your endpoint. RawReply validates the token and returns the `hub.challenge` as plain text.
5. Under **Instagram Subscriptions**, subscribe to:
   - `comments` (Comment webhooks on posts & reels)
   - `messages` (Incoming DM responses)
   - `messaging_postbacks` (Button / quick reply clicks)

---

## 6. Environment Variables

Configure the following variables in your `.env.local` file:

```env
# ─── Meta / Instagram Integration ────────────────────────────
META_APP_ID=your_meta_app_id_here
META_APP_SECRET=your_meta_app_secret_here
META_WEBHOOK_VERIFY_TOKEN=your_secure_random_verification_token_here

# ─── Security & Encryption ───────────────────────────────────
ENCRYPTION_SECRET=your_32_byte_aes_256_encryption_key_here

# ─── Application URL ─────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> [!IMPORTANT]
> - Never commit `.env.local` to version control.
> - `META_APP_SECRET` is used both for server-to-server OAuth code exchange and for **HMAC-SHA256 signature verification** on all incoming webhooks.
> - `ENCRYPTION_SECRET` is used to encrypt Meta access tokens with **AES-256-GCM** before saving to the AccountStore.

---

## 7. Security Architecture

1. **OAuth CSRF Protection**:
   - State tokens are cryptographically generated using HMAC-SHA256, encoding `organizationId`, `userId`, a random nonce, and a 15-minute expiration timestamp.
   - Tampered or expired state tokens are rejected immediately.
2. **Multi-Tenant Organization Ownership**:
   - Every connected Instagram account is strictly bound to the authenticated Clerk organization.
   - Client requests cannot spoof or pass arbitrary organization IDs.
3. **Webhook HMAC-SHA256 Signature Verification**:
   - Every `POST /api/webhooks/meta` payload is checked against the `X-Hub-Signature-256` header using `crypto.timingSafeEqual`.
   - Payloads with missing or invalid signatures return `401 Unauthorized`.
4. **Token Encryption at Rest**:
   - Long-lived User tokens and Page Access tokens are encrypted with AES-256-GCM.
   - Plain-text tokens are **never** returned in API responses or rendered in the frontend.
5. **Durable Event Acceptance**:
   - Webhook events are deduplicated via their `dedupKey` (`commentId` or message `mid`) and durably persisted before an `HTTP 200 EVENT_RECEIVED` acknowledgement is returned to Meta.

---

## 8. Meta App Review & Production Release

During development:
- The Meta App operates in **Development Mode**.
- Only users with an assigned role (Administrator, Developer, or Tester) in the Meta App Dashboard can connect their Instagram accounts.

Before launching to the public:
1. Complete **Business Verification** in Meta Business Manager.
2. Submit an **App Review** request for the required permissions:
   - `instagram_manage_comments`
   - `instagram_manage_messages`
   - `pages_manage_metadata`
3. Provide a screencast demonstrating comment-to-DM automated lead qualification with phone number collection.
4. Toggle your Meta App from **Development Mode** to **Live Mode**.

