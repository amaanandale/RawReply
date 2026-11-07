# RawReply — Engineering Instructions

> This is the permanent engineering instruction document for the RawReply project.
> Read this file and design.md before every implementation task.

---

## Architecture

- Read `design.md` before every UI implementation.
- Follow Next.js App Router architecture.
- JavaScript only — no TypeScript.
- Keep the architecture modular.
- Keep components reusable.
- Separate UI, validation, configuration, and business logic.
- Do not introduce unnecessary abstraction layers.
- Prefer React Server Components. Use Client Components only when necessary.
- Use Next.js conventions for routing, layouts, and data fetching.
- Keep secrets server-side. Never import server modules in client code.

## Authentication & Team Management

- Use custom JWT authentication with short-lived access tokens (15m) and secure HttpOnly cookies.
- Use cryptographically random refresh tokens stored as SHA-256 hashes at rest with rotation and reuse attack detection.
- Passwords must be hashed using bcrypt (10 rounds).
- Protect all dashboard routes (`/dashboard(.*)`) using Next.js middleware and server-side session verification.
- Use internal multi-tenant Organization Workspaces for team management and collaboration.
- Roles:
  - **Owner**: Full workspace access, workspace settings, team management, and integrations.
  - **Admin**: Manage automations, accounts, and integrations; access qualified leads; invite members.
  - **Member**: Access assigned automations and view qualified leads.
- Never bypass authentication to make UI appear functional. Enforce authorization server-side on every sensitive action.

## Code Quality

- Never duplicate components or business logic.
- Inspect existing files before creating new files.
- Reuse existing utilities from `lib/`.
- Avoid unnecessary packages — check if an existing dependency covers the need.
- Remove unused imports and dead code.
- Keep files focused and maintainable.
- Use meaningful naming conventions.
- Do not generate unnecessary placeholder files.
- Use Zod for all external input validation.
- Follow ESLint rules — no warnings in production code.

## Security

- Never expose secrets in frontend code.
- Validate all external input with Zod schemas.
- Verify Meta webhook signatures using HMAC-SHA256.
- Protect authenticated routes with middleware.
- Implement appropriate error handling — never expose stack traces to users.
- Never log sensitive customer information (tokens, phone numbers, passwords).
- Use environment variables for all secrets and API keys.
- Sanitize user-facing error messages.

## RawReply Business Rules

- **Only customers who submit a valid phone number qualify as leads.**
- Do not permanently save unqualified commenters.
- Do not create unnecessary conversation storage.
- Qualified lead creation must be idempotent — same phone number + same post should not create duplicate leads.
- Prevent duplicate lead exports to Excel.
- Respect Meta API permissions, messaging windows (24-hour rule), and rate limits.
- A comment triggers a DM workflow. The DM workflow collects requirements and a phone number.
- Only after phone number submission does a commenter become a qualified lead.
- Qualified leads are exported to the configured Excel destination.

## Development Workflow

- Read `design.md` and `AGENTS.md` before implementation.
- Work in phases — complete and test each phase before proceeding.
- Test each phase before proceeding to the next.
- Never rebuild working features unnecessarily.
- Update documentation when architecture changes.
- Run lint and production builds after significant changes.
- Fix errors instead of hiding them.
- Keep commits focused — one logical change per commit.
- Use meaningful commit messages describing what changed and why.

## Project Structure

```
app/                          → Next.js App Router pages and layouts
  (auth)/                     → Authentication route group
    login/[[...sign-in]]/     → Custom Sign In page
    signup/[[...sign-up]]/    → Custom Sign Up page
    forgot-password/          → Password recovery request page
    reset-password/           → Password reset confirmation page
  (dashboard)/                → Dashboard route group
    dashboard/
      page.js                 → Overview metrics & checklist
      automations/page.js     → Automation workflow management
      accounts/page.js        → Instagram accounts management
      leads/page.js           → Qualified leads management
      integrations/page.js    → Instagram, Excel, Sheets integrations
      team/page.js            → Workspace team management & invitations
      settings/page.js        → Settings & webhook configuration
components/
  ui/                         → Reusable UI components (button, card, badge, table, etc.)
  layout/                     → Layout components (sidebar, header)
  shared/                     → Shared components (empty-state, metric-card, status-badge, icons)
lib/
  utils.js                    → Utility functions (cn)
  constants.js                → Application constants, roles, integrations
  validations/                → Zod validation schemas
config/
  navigation.js               → Navigation items (dashboard & public)
  pricing.js                  → Provisional pricing plan definitions
public/                       → Static assets
```

## Environment Variables

All environment variables are documented in `.env.example`.
Never commit `.env.local` or any file containing real credentials.
