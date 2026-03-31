# ListingBoost AI (Internal SaaS)

Production-ready internal tool for a single operator to run prospect discovery, image extraction, strict-fidelity enhancement, mockup generation, outreach drafting, sending, and CRM tracking.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres + Storage
- OpenAI (text + image enhancement)
- Resend (email delivery)
- Playwright + Cheerio (public page extraction)
- React Hook Form + Zod-ready schema layer

## Internal Auth

Single admin login only.

- Route: `/login`
- Credentials from env:
  - `APP_ADMIN_EMAIL`
  - `APP_ADMIN_PASSWORD`

No public signup, no billing, no Stripe.

## Main Pages

- `/dashboard`
- `/prospects`
- `/prospects/[id]`
- `/properties`
- `/properties/[id]`
- `/mockups`
- `/mockups/share/[token]`
- `/emails`
- `/campaigns`
- `/settings`

## ListingBoost Modules

Core library in `lib/listingboost/`:

- `auth.ts`: single-admin session cookie handling
- `env.ts`: strict environment validation
- `types.ts`: schemas and shared types
- `repository.ts`: typed data access against Supabase
- `discovery.ts`: public signal extraction (emails, socials, contact pages)
- `image-extraction.ts`: Playwright + Cheerio extraction and storage
- `image-enhancement.ts`: strict-fidelity enhancement pipeline
- `mockup.ts`: Google Business-style HTML + PNG generation
- `email.ts`: AI email generation + Resend sender integration

API routes in `app/api/listingboost/**` cover prospects, properties, extraction, enhancement, mockups, emails, settings, campaigns, and dashboard KPIs.

## Database & Storage

Supabase migrations:

- `supabase/migrations/20260331_listingboost_core.sql`
- `supabase/migrations/20260331_listingboost_storage.sql`
- `supabase/migrations/20260331_listingboost_seed.sql`

Tables:

- `prospects`
- `properties`
- `extracted_images`
- `improved_images`
- `mockups`
- `email_templates`
- `outbound_emails`
- `campaigns`
- `activity_logs`
- `settings`

Storage buckets:

- `listingboost-originals`
- `listingboost-improved`
- `listingboost-mockups`
- `listingboost-attachments`

## Strict Image Fidelity Rule

Enhancement prompts are designed to preserve:

- same room
- same layout
- same furniture
- same architecture
- same angle
- same perspective

Allowed changes:

- brightness, lighting balance, white balance
- sharpness, contrast, texture clarity
- perceived cleanliness and premium real-estate photo feel

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Fill required env values in `.env.local`.

4. Run Supabase migrations (via your preferred Supabase workflow).

5. Start dev server:

```bash
npm run dev
```

6. Open `http://localhost:3000/login` and authenticate with admin credentials.

## Notes for MVP Reliability

- Uses public URLs and public contact data only.
- If extraction is blocked by robots policy, workflow should fallback to manual upload.
- Tool prioritizes reliable manual fallback paths over brittle scraping sources.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```