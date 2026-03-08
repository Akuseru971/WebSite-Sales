# WebSite-Sales Demo Website Generator

Production-ready Next.js demo website rendering system for internal lead-generation workflows.

This implementation focuses on the premium demo website generation and preview engine:
- Structured JSON content schema
- Reusable section components
- Category-specific templates (Taxi, Restaurant, Hotel, Real Estate)
- Dynamic preview routes (`/preview/[slug]`)
- Seeded realistic sample demos
- Image fallback strategy

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Lucide icons
- Zod-ready typing conventions (schema-compatible structure)

## Quick Start

```bash
npm install
npm run dev
```

Then open:
- `http://localhost:3000/preview` for demo library
- `http://localhost:3000/preview/cityline-taxi-paris` for a specific preview

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## Implemented File Structure

```txt
app/
	layout.tsx
	globals.css
	page.tsx
	preview/
		page.tsx
		[slug]/
			page.tsx
			not-found.tsx

components/
	demo-site/
		sections/
			about-section.tsx
			contact-section.tsx
			cta-section.tsx
			faq-section.tsx
			featured-properties-section.tsx
			gallery-section.tsx
			hero-section.tsx
			menu-highlights-section.tsx
			room-highlights-section.tsx
			service-coverage-section.tsx
			services-section.tsx
			stats-section.tsx
			testimonials-section.tsx
		shared/
			container.tsx
			image-card.tsx
			section-heading.tsx
		templates/
			hotel-template.tsx
			index.tsx
			real-estate-template.tsx
			restaurant-template.tsx
			section-renderer.tsx
			taxi-template.tsx
			template-shell.tsx

lib/
	utils.ts
	demo-sites/
		defaults.ts
		image-fallbacks.ts
		renderers.ts
		repository.ts
		types.ts
```

## Content Model (Front-end Contract)

Core type is `DemoSiteContent` in `lib/demo-sites/types.ts`.

It supports:
- `siteTitle`, `siteSubtitle`, `category`, `style`, `city`
- `hero`
- `sections[]` with discriminated `type`

Section types implemented:
- `about`
- `services`
- `menu_highlights`
- `room_highlights`
- `featured_properties`
- `gallery`
- `stats`
- `coverage`
- `testimonials`
- `faq`
- `cta`
- `contact`

This makes the renderer compatible with AI-generated structured output and Supabase JSON storage.

## Template System

Template mapper (`components/demo-site/templates/index.tsx`):
- `taxi -> TaxiTemplate`
- `restaurant -> RestaurantTemplate`
- `hotel -> HotelTemplate`
- `real_estate -> RealEstateTemplate`

Each template:
- Uses shared section components
- Preserves category-specific mood and composition
- Stays fully JSON-driven

## Dynamic Preview Routing

`app/preview/[slug]/page.tsx`:
- Loads site data by slug via repository adapter
- Generates metadata dynamically
- Uses `generateStaticParams` for seeded demos
- Renders through `DemoTemplateRenderer`

## Data Source Adapter (Supabase-ready)

`lib/demo-sites/repository.ts` currently uses seeded in-memory records.

Replace with Supabase queries later without changing rendering components:
- `getDemoSiteBySlug(slug)`
- `listSeededDemoSites()`

Suggested DB target table: `demo_sites` with a `generated_content_json` column matching `DemoSiteContent`.

## Image Strategy

`lib/demo-sites/image-fallbacks.ts` provides:
- Category-specific fallback image pools
- Stable fallback resolver `getFallbackImage(category, index)`

If a business image is unavailable, previews stay visually strong and never break layout.

## Environment Variables

See `.env.example`:
- Supabase placeholders for future integration
- Optional OpenAI and CDN placeholders

## Notes

- This implementation intentionally avoids dashboard chrome on preview pages.
- Previews are standalone and client-facing in appearance.
- Built for extension with AI generation and Supabase persistence layers.