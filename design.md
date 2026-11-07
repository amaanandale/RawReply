# RAWREPLY — DESIGN SYSTEM
Version: 1.0
Status: Permanent design specification

## 1. PRODUCT DESIGN PHILOSOPHY

RawReply is a premium SaaS platform for Instagram automation and qualified lead collection.

The entire product must follow a MOBILE-FIRST design philosophy.

Priority:
1. Mobile phones.
2. Tablets.
3. Laptops.
4. Large desktop displays.

Mobile is the primary product experience, not a secondary responsive version.

Every page and component must be designed and validated on mobile before desktop enhancements.

Maintain one consistent visual identity throughout the product.

## 2. BRAND IDENTITY

Product name: RawReply

Brand personality:
- Professional.
- Modern.
- Minimal.
- Trustworthy.
- Efficient.
- Premium.

Avoid:
- Generic AI dashboard aesthetics.
- Excessive gradients.
- Bright multicolor designs.
- Unnecessary glassmorphism.
- Excessive shadows.
- Cartoon illustrations.
- Unnecessary animations.
- Cluttered layouts.

## 3. COLOR SYSTEM

Use a refined neutral SaaS palette.

Primary:
- Brand accent: #635BFF
- Primary foreground: #FFFFFF

Background:
- Main background: #FFFFFF
- Application background: #F8F9FC
- Secondary surface: #F1F3F7

Text:
- Primary text: #171923
- Secondary text: #667085
- Muted text: #98A2B3

Borders:
- Default border: #E5E7EB
- Subtle border: #EEF0F3

Status:
- Success: #16A34A
- Warning: #D97706
- Error: #DC2626
- Information: #2563EB

Use colors consistently. Do not introduce additional accent colors without updating this document.

## 4. TYPOGRAPHY

Use Inter as the primary typeface.

Typography rules:
- Clear visual hierarchy.
- Strong but restrained headings.
- Readable body text.
- Consistent font weights.
- Appropriate line heights.
- Responsive text sizing.

Mobile body text should generally remain 14–16px or larger where readability requires it.

Avoid oversized headings that consume the entire mobile viewport.

## 5. SPACING AND LAYOUT

Use a consistent spacing scale based on 4px increments.

- Small spacing: 4px, 8px.
- Medium spacing: 12px, 16px.
- Large spacing: 20px, 24px.
- Section spacing: 32px, 40px, 48px.

Cards:
- Consistent internal padding.
- Subtle borders.
- Restrained corner radius.
- Minimal shadows.
- Clear content hierarchy.

Avoid inconsistent spacing between pages.

## 6. RESPONSIVE BREAKPOINTS

Use mobile-first Tailwind CSS conventions.

Primary mobile benchmark:
390px.

Test:
- 320px.
- 360px.
- 375px.
- 390px.
- 414px.
- 430px.

Tablet:
- 768px.
- 1024px.

Desktop:
- 1280px.
- 1366px.
- 1440px.
- 1600px.
- 1920px.

Start with mobile styles and progressively enhance larger screens.

Never use fixed widths that cause horizontal overflow.

## 7. MOBILE NAVIGATION

Mobile application navigation is a core design requirement.

Use:
- Compact top application header.
- RawReply brand mark.
- Accessible menu.
- Bottom navigation for frequently used sections.

Preferred bottom navigation:
1. Overview.
2. Automations.
3. Leads.
4. Accounts.
5. More.

Keep the bottom navigation compact, accessible and touch-friendly.

Use a drawer or dedicated navigation screen for secondary destinations.

Respect device safe areas.

Desktop may use a persistent collapsible sidebar.

## 8. DASHBOARD DESIGN

Dashboard cards must be optimized for mobile.

Mobile:
- Vertical content flow.
- Two-column metric cards only when readable.
- Important information first.
- Compact statistics.
- Clear section headings.
- Accessible actions.

Desktop:
- Expand into multi-column layouts.
- Use available screen space intelligently.
- Show larger tables and additional information.

Avoid overcrowding.

## 9. TABLES AND LEAD CARDS

Qualified leads are a central feature of RawReply.

Mobile:
- Use responsive lead cards instead of forcing wide desktop tables.
- Display phone number prominently.
- Display Instagram username.
- Display customer requirements.
- Display lead creation date.
- Display Excel export status.

Secondary information can be expandable.

Desktop:
- Use structured data tables.
- Provide search and filters.
- Maintain readable column spacing.

Never display unqualified commenters as leads.

## 10. BUTTONS AND INTERACTIONS

- Minimum 44px touch target.
- Clear primary and secondary button hierarchy.
- Consistent button heights.
- Visible focus states.
- Appropriate disabled states.
- Clear loading indicators.
- No hover-only actions.

Forms:
- Mobile-friendly input sizing.
- Clear labels.
- Inline validation.
- Appropriate keyboard types.
- Comfortable field spacing.

## 11. COMPONENT DESIGN

Use shadcn/ui as the primary component foundation.

Standardize:
- Buttons.
- Inputs.
- Selects.
- Dialogs.
- Drawers.
- Cards.
- Tables.
- Dropdowns.
- Tabs.
- Tooltips.
- Toast notifications.
- Empty states.
- Loading skeletons.

Customize components to match this design system.

Do not repeatedly create different versions of the same component.

## 12. AUTHENTICATION DESIGN

Login and signup must be mobile-first.

Use:
- Simple forms.
- Clear typography.
- Consistent branding.
- Full-width mobile actions.
- Readable validation messages.
- Minimal distractions.

Authentication should visually belong to the RawReply product.

## 13. ANIMATION

Use subtle purposeful animations only.

Examples:
- Navigation transitions.
- Drawer opening.
- Button feedback.
- Small loading transitions.
- Subtle hover effects on desktop.

Avoid unnecessary animation libraries and distracting motion.

Respect reduced-motion preferences.

## 14. ACCESSIBILITY

- Semantic HTML.
- Accessible form labels.
- Keyboard navigation.
- Visible focus indicators.
- Appropriate contrast.
- Screen-reader-friendly controls.
- Touch-friendly interactive elements.

## 15. RESPONSIVE QUALITY CONTROL

Every new page must be tested on mobile first.

Mandatory checks:
- No horizontal overflow.
- No overlapping elements.
- No clipped buttons.
- No unreadable text.
- No broken navigation.
- No inaccessible dialogs.
- No desktop-only interactions.

Test mobile before approving desktop.

## 16. DESIGN GOVERNANCE

This document is the single source of truth for RawReply visual design.

All future development phases must:
1. Read this document.
2. Follow its design tokens.
3. Reuse existing components.
4. Maintain visual consistency.
5. Test mobile responsiveness.
6. Avoid introducing competing design systems.

Do not change brand colors, typography, spacing, navigation patterns or visual identity without explicit approval.

If a new design requirement conflicts with this document, ask for clarification before changing the permanent design system.
