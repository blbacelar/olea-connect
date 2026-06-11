# Olea Connects

Olea Connects is a branded document and community platform for nonprofit
organizations. This repository contains the full MVP demo, including the
marketing site, membership signup flow, brand onboarding, dashboard, template
library, PDF generation, grants, webinars, team management, and subscription
screens.

The product is operated by Olive Social Impact Inc. and is designed primarily
for Canadian nonprofits, societies, charities, and community organizations.

## MVP Status

This project is currently a frontend-focused product demo.

- Authentication, checkout, email verification, and automation calls use mock
  adapters.
- Organization, member, template, and session data come from local mock data.
- Registration progress and uploaded onboarding logos are persisted in browser
  `localStorage`.
- PDF generation runs in the browser with `@react-pdf/renderer`.
- No environment variables or external accounts are required to run the demo.

Production integrations such as Stripe, Resend, Circle, Attio, Klaviyo, and a
database are represented in the user experience but are not connected yet.

## Tech Stack

- Next.js 14 with the App Router
- React 18
- TypeScript
- Tailwind CSS
- shadcn-style UI components built with Radix primitives
- Lucide icons
- `@react-pdf/renderer`

## Getting Started

### Requirements

- Node.js 20 or newer
- npm

### Installation

```bash
npm install
```

### Development

Port `3000` is reserved for another local application, so run Olea Connects on
port `3001`:

```bash
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001).

### Production Build

```bash
npm run build
npm run start -- -p 3001
```

## Available Scripts

```bash
npm run dev        # Start the Next.js development server
npm run build      # Create an optimized production build
npm run start      # Run the production server
npm run lint       # Run Next.js ESLint checks
npm run typecheck  # Run TypeScript without emitting files
```

Before considering a change complete, run:

```bash
npm run typecheck
npm run lint
npm run build
```

## Main Routes

### Public and Authentication

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing page and pricing |
| `/signup` | Membership and billing-cycle selection |
| `/signup/account` | Organization and account details |
| `/signup/payment` | Demo checkout |
| `/verify-email` | Email verification flow |
| `/login` | Member login |
| `/reset-password` | Password reset flow |

### Onboarding

| Route | Purpose |
| --- | --- |
| `/onboarding/brand-setup` | Organization name, logo, and brand colours |
| `/onboarding/template-selection` | Seedling template selection |

### Member Platform

| Route | Purpose |
| --- | --- |
| `/dashboard` | Member overview |
| `/templates` | Template library |
| `/templates/[slug]` | Template detail or coming-soon state |
| `/templates/board-self-evaluation` | Interactive survey and PDF workflow |
| `/grants` | Olea Gives opportunities |
| `/webinars` | Live and recorded learning |
| `/community` | Circle community entry point |
| `/team` | Seats and invitations |
| `/subscription` | Plan and billing management |
| `/settings/brand` | Brand profile management |
| `/whats-new` | Product updates |
| `/help` | Help centre placeholder |

## Project Structure

```text
app/                    Next.js routes and route-specific components
components/
  auth/                 Public authentication UI
  landing/              Modular marketing-page sections
  ui/                   Shared shadcn-style primitives
hooks/                  Registration, session, and survey state
lib/
  auth.ts               Mock authentication and automation adapters
  db.ts                 Mock data-access layer
  mock-data.ts          Demo organization and product data
  pdf-generator.tsx     Branded PDF document generation
  plans.ts              Shared membership plan definitions
  types.ts              Domain types
public/                 Static brand assets
```

## Architecture Notes

- `components/AppShell.tsx` applies the authenticated sidebar and header only to
  member routes.
- `hooks/use-registration.tsx` owns signup and onboarding state.
- `lib/plans.ts` is the single source of truth for membership pricing and plan
  features.
- Shared landing sections live in `components/landing` to keep
  `app/page.tsx` focused on composition.
- Logo upload behavior is shared between onboarding and Brand Settings through
  `components/LogoUpload.tsx` and `hooks/use-logo-upload.ts`.
- Data access is isolated behind `lib/db.ts` so mock functions can later be
  replaced by server-side database calls.

## Membership Plans

All prices are in CAD. Annual billing charges for 10 months and provides 12.

| Plan | Monthly | Annual | Included seats |
| --- | ---: | ---: | ---: |
| Seedling | $44 | $440 | 1 |
| Roots | $99 | $990 | 2 |
| Canopy | $225 | $2,250 | 3 |
| Harvest | $1,150 | $11,500 | VIP service, limited to 8 clients |

Every membership tier includes access to the Olea Connects community. Resource
depth, learning access, and hands-on support vary by plan.

## Moving to Production

The mock boundaries are intentionally separated so they can be replaced without
rewriting the UI:

1. Replace `lib/auth.ts` with real authentication, Stripe checkout, and email
   verification services.
2. Replace `lib/db.ts` and `lib/mock-data.ts` with a persistent database and
   authenticated server-side queries.
3. Store uploaded logos in object storage instead of `localStorage`.
4. Connect new subscriptions to Attio, Klaviyo, Circle, and other automations.
5. Add authorization and tier checks on the server.
6. Add automated unit, integration, accessibility, and end-to-end tests.

## Brand and Accessibility

The interface uses Olea green and orange brand accents and is designed around
WCAG 2.1 AA accessibility goals. New work should preserve keyboard navigation,
visible focus states, semantic markup, sufficient contrast, and responsive
layouts.

## License

Private project. All rights reserved by Olive Social Impact Inc.
