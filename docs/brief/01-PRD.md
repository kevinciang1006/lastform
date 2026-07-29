# PRD — Lastform

**A Next.js 15 footwear storefront built to demonstrate rendering-strategy decisions, headless CMS integration, and Core Web Vitals discipline.**

Author: Kevin Ciang
Target deploy: `lastform.kevinciang.com` (Vercel)
Build budget: 1–2 days

---

## 1. Why this exists

Built to close three specific gaps against senior frontend roles in e-commerce:

1. **Next.js at production depth** — not "I used Next.js," but "I chose SSG here, ISR there, SSR here, and here's why."
2. **High-traffic e-commerce patterns** — PDP/PLP, faceted search, cart, inventory, structured data.
3. **Headless CMS + API-driven architecture** — real hosted CMS, both GROQ and GraphQL query paths.

The demo is honest about its origin: it is a purpose-built reference implementation, not a commercial store. It carries no payment processing and no real inventory.

## 2. The differentiator

Most portfolio storefronts look the same. This one **makes its rendering strategy visible in the UI**.

Every page renders a small monospace **render badge** in the footer showing:
- the strategy used (`SSG` / `ISR` / `SSR` / `EDGE`)
- the timestamp the HTML was generated
- the revalidation window, where applicable

Reloading a PDP after the revalidate window shows the timestamp move. Reloading a static collection page shows it frozen at build time. The trade-off is not described — it is demonstrated, live, in one screenshot.

A dedicated `/engineering` page then documents each route's strategy, the reasoning, and the measured Core Web Vitals.

## 3. Scope

### In scope

| Route | Strategy | Reasoning |
|---|---|---|
| `/` | SSG + ISR (`revalidate: 3600`) | Editorial content changes hourly at most. Cheapest possible render, still fresh. |
| `/collections/[slug]` | SSG for the 4 known collections via `generateStaticParams`, ISR fallback for the rest | Finite, high-traffic, rarely changing. Build-time cost is bounded. |
| `/products/[slug]` | ISR (`revalidate: 300`) + **on-demand revalidation** via Sanity webhook | Price and stock change unpredictably. On-demand invalidation gives editors instant publish without a rebuild. |
| `/search` | SSR (`dynamic = 'force-dynamic'`) | Output is a function of query params. Caching is pointless and harmful. |
| `/cart` | Client (Zustand + `localStorage`) | Per-user state, no server involvement, no SEO value. |
| `/engineering` | SSG | The write-up. Static forever. |
| `/studio` | Client-only, `noindex` | Embedded Sanity Studio. |
| `middleware.ts` | Edge | Geo → currency hint, and a stable A/B bucket cookie. Runs before cache, sets a header the pages read. |

### Features

- **PLP** — collection grid, faceted filtering (size, colour, price band, material), sort. Filters live in the URL (`?size=42&colour=ink`) so state is shareable and server-readable.
- **PDP** — image gallery, size selector with real stock states (in stock / low / out), the spec strip, add-to-cart, streamed "you may also like" section behind `<Suspense>`.
- **Search** — text query against Sanity's **GraphQL API** (the rest of the app uses GROQ, on purpose — demonstrates both).
- **Cart** — slide-over drawer, quantity edit, remove, subtotal, currency from the edge middleware. Mock checkout: a confirmation screen, no payment.
- **Editorial** — one CMS-driven story block on the homepage and one long-form `/journal/[slug]` entry, proving the CMS handles more than a product table.

### Out of scope

Payments, real auth, real inventory sync, i18n beyond currency display, wishlist, reviews, admin dashboard beyond the Studio.

## 4. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, React 19 | Server Components by default; client islands only where interaction demands it |
| Language | TypeScript, `strict: true` | No `any`. No non-null assertions except in typed CMS guards. |
| Styling | Tailwind CSS v4 | Design tokens as CSS custom properties, consumed by Tailwind |
| CMS | **Sanity** (free tier) | Hosted, real. Schemas in-repo, Studio embedded at `/studio` |
| Data access | GROQ (primary), Sanity GraphQL API (search route only) | Deliberate: shows both query models |
| Client state | Zustand | Cart only. Everything else is server state. |
| Images | `next/image` + Sanity image CDN | LQIP blur placeholders from Sanity metadata |
| Fonts | `next/font/google`, self-hosted subset | Zero layout shift |
| Testing | **Playwright** (E2E + `@axe-core/playwright`), Vitest (units) | JD names Playwright; use it |
| CI | GitHub Actions | typecheck → lint → vitest → build → playwright |
| Deploy | Vercel | ISR and edge middleware require it; GitHub Pages cannot do this |
| Analytics | `web-vitals` → console + a `/engineering` readout | Real field-shaped numbers, no third party |

## 5. Performance targets

Non-negotiable, verified with Lighthouse (mobile, throttled) and recorded on `/engineering`:

- LCP ≤ 2.0s
- CLS ≤ 0.02
- INP ≤ 150ms
- Lighthouse Performance ≥ 95, Accessibility 100, SEO 100
- PDP client JS ≤ 90KB gzipped

How that gets hit:
- Server Components everywhere except cart, filters, gallery, size selector
- Hero image `priority`, everything else lazy with explicit `sizes`
- Fixed aspect-ratio containers on every image
- `next/font` with `display: swap` and preload
- `<Suspense>` streaming for recommendations so they never block LCP
- No client-side data fetching on first paint

## 6. Accessibility

WCAG 2.1 AA, enforced in CI:
- Skip-to-content link
- Full keyboard path: browse → filter → PDP → select size → add to cart → open cart → checkout
- Visible focus rings, never removed
- Cart drawer: focus trap, `Escape` closes, focus returns to trigger
- `aria-live="polite"` announcement on add-to-cart
- Size buttons are real buttons with `aria-pressed`; out-of-stock uses `aria-disabled` plus visible text, not colour alone
- `prefers-reduced-motion` respected
- `@axe-core/playwright` runs against every route; zero violations gates the build

## 7. SEO

- Metadata API per route, with `generateMetadata` on dynamic routes
- JSON-LD `Product` schema on PDP (name, image, brand, offers, availability)
- JSON-LD `BreadcrumbList` on PLP and PDP
- `sitemap.ts` generated from CMS content
- `robots.ts`, canonical URLs, OG images via `opengraph-image.tsx`

## 8. Content model (Sanity)

```
product      — title, slug, price, currency, images[], description (portable text),
               material, lastShape, dropMm, weightGrams, collection (ref),
               variants[{ size, stock }], featured (bool)
collection   — title, slug, heroImage, blurb, sortOrder
journalPost  — title, slug, coverImage, publishedAt, body (portable text)
siteSettings — announcementBar, footerLinks[], featuredCollections[]
```

Seed script populates 24 products across 4 collections, 3 journal posts, 1 settings doc.

## 9. Deliverables

- Live site at `lastform.kevinciang.com`
- Public repo with README covering: architecture, the rendering decision table, how to run, how to seed, Lighthouse results
- `/engineering` page — the rendering strategy write-up and CWV table
- Passing GitHub Actions run

## 10. Interview talking points this unlocks

- Why ISR + on-demand revalidation beats a full rebuild on a 5,000-SKU catalogue
- Why the search route is deliberately uncached, and what that costs
- Why filters live in the URL rather than in client state
- The cost of edge middleware: it runs before the cache, so it must stay cheap
- GROQ vs GraphQL — where each one fit and why the app uses both
- What actually moved LCP: the image strategy, or the font strategy
