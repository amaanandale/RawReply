# RawReply — Qualified Leads & Microsoft Excel Integration Guide

This guide details the architecture, qualification rules, and Microsoft Graph API integration for **Phase 8 & 9** of the RawReply SaaS platform.

---

## 1. Core Business Rule: Qualified Lead Definition

> [!IMPORTANT]
> **A commenter is NOT a lead.**
> **A person who receives an automated Instagram DM is NOT a lead.**
> **ONLY an individual who submits a verified international mobile number through an interactive DM flow becomes a qualified lead.**

RawReply strictly filters out ordinary commenters and incomplete DM conversations. Commenters only enter the customer's sales pipeline once their mobile number has been submitted and validated.

---

## 2. Lead Validation & E.164 Normalization

All submitted phone numbers pass through server-side E.164 validation in [`lib/validations/phone.js`](file:///c:/Users/moham/Desktop/rawautom/lib/validations/phone.js).

### Normalization Rules:
1. **Length**: Must be between 7 and 15 digits (ITU-T E.164 standard).
2. **Characters**: Letters and disallowed symbols are rejected.
3. **Punctuation**: Spaces, hyphens, dots, and parentheses are stripped.
4. **Prefixes**: Leading `00` is normalized to `+`.
5. **Country Code**: If a number is submitted with an international prefix (e.g. `+1`, `+44`, `+91`), the dial code is extracted and preserved. If submitted without a `+`, the organization's default country code is prepended.
6. **Output**: Always normalized to the canonical format `+[country_code][national_number]` (e.g. `+15551234567`).

---

## 3. Lead Deduplication Strategy

To maintain clean spreadsheet exports and handle repeated webhook events idempotently:

- **Composite Key**: `(organizationId, instagramAccountId, normalizedPhoneNumber)`
- **Idempotent Handling**:
  - If a customer comments on multiple posts or submits their phone number multiple times, RawReply updates the existing lead record rather than creating duplicate entries.
  - Existing sales statuses (`contacted`, `converted`) and notes are preserved.
  - Duplicate exports are prevented by tracking the `exportedToExcel` and `exportedAt` flags.

---

## 4. Microsoft Excel Integration (Microsoft Graph API)

RawReply integrates directly with **Microsoft Graph API v1.0** to sync verified qualified leads to Microsoft Excel workbooks hosted on OneDrive or SharePoint.

### Minimum Permissions Required:
| Scope | Description | Justification |
| :--- | :--- | :--- |
| `offline_access` | Refresh token issuance | Enables long-term automated lead syncing without forcing daily user sign-in. |
| `User.Read` | User profile | Retrieves the connected Microsoft user's email and display name for UI display. |
| `Files.ReadWrite` | OneDrive file read/write | Discovers `.xlsx` workbooks and appends lead rows into target worksheets. |

### Microsoft Entra ID / Azure Portal Configuration:
1. Sign in to the **[Microsoft Entra admin center](https://entra.microsoft.com/)** or **[Azure Portal](https://portal.azure.com/)**.
2. Navigate to **App registrations** → **New registration**:
   - **Name**: `RawReply Lead Automation`
   - **Supported account types**: `Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)`
   - **Redirect URI (Web)**:
     ```
     http://localhost:3000/api/auth/microsoft/callback
     ```
     *(In production, replace with your live domain, e.g. `https://app.rawreply.io/api/auth/microsoft/callback`)*
3. Click **Register**.
4. In the app overview, copy the **Application (client) ID**.
5. Navigate to **Certificates & secrets** → **Client secrets** → **New client secret**:
   - Copy the secret **Value** immediately.
6. Under **API permissions**, verify that `Files.ReadWrite` and `User.Read` are granted.

---

## 5. Environment Configuration

Add the following environment variables to your `.env.local` file:

```env
# ─── Microsoft Excel / Microsoft Graph API ────────────────────
MICROSOFT_CLIENT_ID=your_microsoft_application_client_id_here
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_value_here
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback
```

---

## 6. Token Encryption & Security Lifecycle

- **Encryption at Rest**: User access tokens and refresh tokens are encrypted at rest using **AES-256-GCM** via [`lib/crypto/encryption.js`](file:///c:/Users/moham/Desktop/rawautom/lib/crypto/encryption.js).
- **Auto-Refresh Lifecycle**: Prior to executing an Excel sync, RawReply checks the access token expiration timestamp. If the token expires within 5 minutes, it automatically requests a fresh token using the encrypted refresh token before executing the Graph API call.
- **Security Boundaries**: Raw tokens are never logged, never returned to the frontend browser, and strictly isolated by `organizationId`.

---

## 7. Export Data Format

Both the direct `.xlsx` download and the Microsoft Excel Online Graph API sync export the following columns:

| Column | Description | Example |
| :--- | :--- | :--- |
| **Name** | Customer name | `Alex Buyer` |
| **Instagram Username** | Instagram handle | `@alex_buyer` |
| **Mobile Number** | Normalized E.164 phone number | `+15551234567` |
| **Country Code** | Country dial code | `+1` |
| **Instagram Account** | Connected business account | `@rawreply` |
| **Automation** | Trigger automation name | `Summer Promo DM` |
| **Source Post** | Post or reel identifier | `post_17841400` |
| **Lead Status** | Current sales status | `qualified` |
| **Submitted At** | Verification timestamp (ISO) | `2026-11-07T12:00:00.000Z` |

