# Claude Code build prompt — Lastform

> Paste this whole file as the first message in a fresh Claude Code session, in an empty directory.
> Before pasting, have ready: a Sanity project ID + dataset + write token (free tier, ~10 minutes to create at sanity.io).
> Paste the token sheet from Claude Design underneath this prompt if you have it; if not, use the palette and type values inline below.

---

## STOP — plan first

Do not write any code yet.

Read this entire brief, then produce a written PLAN covering:
1. The full file tree you intend to create
2. Which routes are Server Components and which components become client islands, with a one-line reason each
3. The exact rendering strategy per route and how you will implement it in Next.js 15 App Router
4. The Sanity schema definitions and how the GROQ and GraphQL paths differ
5. Your ordered build sequence
6. Anything in this brief you think is wrong, ambiguous, or a bad idea — say so before building, not after

Wait for my approval of the PLAN. Do not begin implementation until I reply.

---

## Project

**Lastform** — a footwear storefront in Next.js 15, built as a reference implementation of rendering-strategy decisions, headless CMS integration, and Core Web Vitals discipline. Deployed to Vercel at `lastform.kevinciang.com`.

This is a portfolio artefact for senior frontend interviews. Every architectural choice must be defensible out loud. Where there is a trade-off, the code documents which side it took and why.

## Stack — use exactly this

- Next.js 15, App Router, React 19
- TypeScript, `strict: true`, `noUncheckedIndexedAccess: true`. **No `any`. No `@ts-ignore`.**
- Tailwind CSS v4, tokens declared in an `@theme` block
- Sanity for CMS: schemas in-repo, Studio embedded at `/studio`, `next-sanity` client
- GROQ for all data access **except** `/search`, which uses the Sanity GraphQL API
- Zustand for cart state only, persisted to `localStorage`
- `next/image` with the Sanity image CDN loader and LQIP blur data
- `next/font/google` — Archivo, Inter Tight, IBM Plex Mono
- Playwright for E2E, `@axe-core/playwright` for a11y, Vitest for units
- GitHub Actions for CI
- pnpm

## Rendering strategy — implement precisely

| Route | Strategy | Implementation |
|---|---|---|
| `/` | ISR | `export const revalidate = 3600` |
| `/collections/[slug]` | SSG + ISR fallback | `generateStaticParams()` returning the 4 collection slugs; `export const dynamicParams = true`; `revalidate = 3600` |
| `/products/[slug]` | ISR + on-demand | `revalidate = 300`, plus `POST /api/revalidate` that verifies a Sanity webhook signature and calls `revalidatePath` and `revalidateTag` |
| `/search` | SSR | `export const dynamic = 'force-dynamic'`; reads `searchParams`; queries the Sanity GraphQL endpoint |
| `/journal/[slug]` | SSG | `generateStaticParams()`, no revalidate |
| `/engineering` | SSG | fully static |
| `/cart` | Client | cart is a drawer plus a `/cart` fallback route; no server data |
| `/studio` | Client | `export const dynamic = 'force-static'` on the wrapper, Studio itself client-only, `noindex` |
| `middleware.ts` | Edge | see below |

**Middleware (edge runtime).** Reads `request.geo?.country`, maps to a currency (`ID→IDR`, `SG→SGD`, `DK→DKK`, `US→USD`, default `USD`), sets an `x-currency` request header that Server Components read via `headers()`. Also sets a stable `lf-bucket` cookie (`a` or `b`) if absent. Keep it under 15 lines of logic — add a comment stating that middleware runs before the cache on every request, which is exactly why it must stay this cheap. Matcher must exclude `/_next`, `/studio`, and static assets.

**Render badge.** A `<RenderBadge />` server component in the footer that prints the strategy, the generation timestamp (`new Date().toISOString()` evaluated at render), and the revalidate window. Each route passes its own props. This is a deliberate feature, not debug output — it makes the rendering strategy observable in the UI. Style it per the design tokens.

## Design tokens

Declare these in `app/globals.css` inside `@theme`. Use them everywhere; no hardcoded hex in components.

```
--color-ink:    #14181B   /* primary text, dark surfaces */
--color-chalk:  #E9E9E4   /* page ground */
--color-slate:  #5A6167   /* secondary text, annotation */
--color-cobalt: #1B3BD9   /* signal: measurements, focus, active, links */
--color-ochre:  #C4842B   /* availability warnings only */
--color-fog:    #D6D7D1   /* dividers, disabled, placeholders */
```

- Display: **Archivo**, weights 600/700, wide tracking-tight at large sizes — product names, section heads
- Body: **Inter Tight**, 400/500 — descriptions, editorial
- Utility: **IBM Plex Mono**, 400/500, uppercase, `tracking-wider` — all numbers, dimensions, SKUs, sizes, prices, the render badge

Border radius: 2px maximum. Border width: 1px hairlines in `--color-fog`.

**Signature element — the spec strip.** Every product card and PDP shows a horizontal mono readout: `LAST` / `DROP` / `UPPER` / `WEIGHT`, labels in slate, values in cobalt, separated by 1px vertical rules. On the PDP, extend this into a dimension callout: SVG hairline leader lines from anchor points on the product image out to mono labels, drawn like a technical drawing's annotation. Anchor points are stored per-product in the CMS as normalized coordinates. Animate the leader lines drawing in once on mount, ~400ms, and skip the animation entirely under `prefers-reduced-motion`.

## Content model

Create these Sanity schemas in `sanity/schemas/`:

```ts
product      title, slug, price (number), currency (string, default 'USD'),
             images[] (image with hotspot), description (portable text),
             material, lastShape, dropMm (number), weightGrams (number),
             collection (reference to collection),
             variants[] ({ size: number, stock: number }),
             annotations[] ({ label, value, x, y }),  // normalized 0–1
             featured (boolean)
collection   title, slug, heroImage, blurb, sortOrder (number)
journalPost  title, slug, coverImage, publishedAt, body (portable text)
siteSettings singleton: announcementBar, footerLinks[], featuredCollections[]
```

Write `scripts/seed.ts` that populates **24 products across 4 collections** (`Boots`, `Derbies`, `Low Profile`, `Archive`), **3 journal posts**, and the settings singleton. Real-sounding product names and genuinely varied specs — no `Product 1`, `Product 2`. Include products with sizes out of stock and sizes at low stock so all three states are visible. Upload placeholder images to Sanity as part of the seed by generating simple deterministic SVGs and converting them — do not reference external image URLs.

## Pages and components

### `/` (ISR 3600)
Announcement bar (CMS) → header with cart count → hero: one featured product with the annotated dimension callout, product name in display, spec strip below, single cobalt CTA → four collection cards → one editorial block from the latest journal post → footer with render badge.

### `/collections/[slug]`
Collection hero (title, blurb, hero image). Product grid. **Faceted filters in the URL**, not client state: `?size=42&colour=ink&price=200-400&sort=price-asc`. Filters are read server-side from `searchParams` and applied in the GROQ query. The filter UI is a client island that pushes to the router with `useRouter().replace(..., { scroll: false })`. Empty state gives a route back, not just "no results".

### `/products/[slug]` (ISR 300 + on-demand)
Two columns on desktop, stacked on mobile. Left: gallery with the annotated primary image and thumbnails. Right: name (display), spec strip, price (mono), size grid, add-to-cart, delivery note. Size grid: real buttons, `aria-pressed`, three states — available, low stock (ochre + the text "Low stock"), out of stock (`aria-disabled`, struck through, text "Out of stock"). Never colour alone. Below: portable-text description. Then a `<Suspense>`-wrapped recommendations strip with a skeleton fallback, so it never blocks LCP. `generateMetadata` plus JSON-LD `Product` and `BreadcrumbList`.

### `/search` (SSR)
Reads `?q=`. Queries the **Sanity GraphQL API** via `fetch` with `cache: 'no-store'`. Add a comment explaining that this route is deliberately uncached because output is a pure function of user input, and that the app uses GROQ elsewhere — this route exists to demonstrate the GraphQL path.

### `/journal/[slug]` (SSG)
Portable text rendering with `@portabletext/react`, custom serializers for images and pull quotes.

### `/engineering` (SSG)
The point of the whole build. Two sections:
1. **Rendering strategy** — a table of route / strategy / revalidate / reasoning, populated from a single typed constant that the render badges also read from, so the docs cannot drift from the implementation.
2. **Core Web Vitals** — a readout of LCP / CLS / INP / TTFB captured client-side via the `web-vitals` package, plus the recorded Lighthouse scores hardcoded from your final run.

Written in plain prose, first person, factual. No marketing tone.

### `/studio`
`next-sanity/studio` embedded, `noindex` metadata, excluded from the middleware matcher.

### Cart
Zustand store, persisted. Slide-over drawer: focus trap, `Escape` to close, focus returns to the trigger, `aria-live="polite"` on add. Quantity stepper, remove, subtotal formatted in the currency from the edge header. Checkout button → `/checkout/confirmation` which is a static mock. Make it explicit in the UI copy that this is a demo with no payment processing.

## Performance requirements — verify, don't assume

- Hero image `priority`; every other image lazy with explicit `sizes`
- Every image in a fixed aspect-ratio container. Target CLS ≤ 0.02.
- Blur placeholders from Sanity's LQIP metadata
- Server Components by default. Client islands limited to: cart drawer, cart button, filter UI, gallery thumbnails, size selector, the annotation animation, web-vitals reporter. Nothing else gets `'use client'`.
- No client-side data fetching on first paint
- PDP client JS budget: **90KB gzipped**. Run `pnpm build` and report the actual route-level First Load JS in your final summary. If a route is over, fix it before telling me you're done.

## Accessibility — gates the build

- Skip-to-content link
- Complete keyboard path: browse → filter → PDP → select size → add to cart → open cart → checkout
- Visible cobalt focus rings, never removed
- `prefers-reduced-motion` respected
- `@axe-core/playwright` runs against `/`, a collection, a PDP, `/search`, `/engineering`. **Zero violations required.**

## Testing

**Playwright E2E** — five specs minimum:
1. Homepage renders, render badge shows `ISR`
2. Collection filter by size updates the URL and the result count
3. PDP: select an available size, add to cart, drawer opens, count increments, `aria-live` announces
4. Out-of-stock size cannot be added
5. Search returns results for a seeded product name

**Vitest units** — currency formatting, price-band filter parsing, cart total maths including quantity edits, GROQ query builder.

## CI

`.github/workflows/ci.yml`: on push and PR — install (pnpm cache) → `typecheck` → `lint` → `vitest run` → `build` → `playwright test`. Playwright browsers cached.

## Code quality rules

- Named exports throughout; default exports only where Next.js requires them
- Every Sanity response validated through a Zod schema at the boundary. Types are derived from Zod, not hand-written.
- Data fetching lives in `lib/queries/` — one file per entity, each exporting a typed function. No inline GROQ in components.
- Components under 150 lines. Split before that.
- Comments explain *why*, never *what*. Every rendering-strategy export gets a one-line comment stating the reasoning.
- No dead code, no commented-out code, no TODOs left in the final tree

## Environment

`.env.local` (and a committed `.env.example` documenting each variable):

```
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-10-01
SANITY_API_READ_TOKEN=
SANITY_API_WRITE_TOKEN=
SANITY_REVALIDATE_SECRET=
NEXT_PUBLIC_SITE_URL=https://lastform.kevinciang.com
```

## README

Must contain: what this is and why it was built, the rendering strategy table, architecture notes, local setup including Sanity project creation and seeding, how to configure the Sanity webhook for on-demand revalidation, the Lighthouse results, and a plainly worded note that this is a portfolio reference implementation with no payment processing.

## Definition of done

- `pnpm build` succeeds with zero TypeScript errors and zero ESLint warnings
- All Playwright specs pass, axe reports zero violations
- Route-level First Load JS reported, PDP under 90KB
- Seed script runs clean against an empty dataset
- Every route renders correctly with an empty CMS (no crashes, sensible empty states)
- README complete

## Final output

When the build is finished, give me:
1. The route-level bundle report from `pnpm build`
2. The rendering strategy table as implemented, flagging any deviation from this brief
3. Exact Vercel deployment steps including which env vars to set and how to point the custom domain
4. The Sanity webhook configuration for on-demand revalidation
