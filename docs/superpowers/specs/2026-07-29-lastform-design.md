# Lastform — Design Spec

Date: 2026-07-29
Author: Kevin Ciang (with Claude)
Status: approved, pending implementation plan

Source documents: `docs/brief/01-PRD.md`, `docs/brief/02-claude-design-prompt.md`,
`docs/brief/03-claude-code-prompt.md`, `docs/design/claude-design-export/Lastform.dc.html`.

---

## 1. What this is

A footwear storefront in Next.js 15 built as a portfolio reference implementation. Its
purpose is to demonstrate rendering-strategy decisions, headless CMS integration, and Core
Web Vitals discipline, at a depth that survives being questioned in a senior frontend
interview.

The differentiator is that the rendering strategy is visible in the product itself: every
page carries a mono render badge in the footer stating the strategy, the generation
timestamp, and the revalidation window. `/engineering` documents the whole table.

No payment processing. No real inventory. The UI says so plainly.

## 2. Decisions taken

| Decision | Choice | Reason |
|---|---|---|
| CMS availability | Build behind a typed interface with a local fixture adapter; Sanity slots in at phase 2 | No Sanity project exists yet, and nothing should block on it |
| Collections | Boots / Derbies / Low Profile / Archive (PRD naming) | All four are real PLPs, so faceted filtering demos on any of them |
| Currency | Middleware sets a cookie; a client island relabels | Reading `headers()` in a page forces dynamic rendering, which would destroy the SSG/ISR story the site exists to tell |
| JS budget | Measure route-incremental JS, not First Load | 90KB total is below the Next 15 + React 19 App Router floor |
| A/B bucket | Drives one real variant (hero CTA copy) via the cookie island | The brief set the cookie but never read it; dead code is disallowed by the brief's own rules |
| Stock freshness | Static spec sheet, live stock | Cached stock on a PDP is a correctness bug; this makes the design's own `STOCK READ: LIVE` / `SPEC SHEET: STATIC` callout literally true |
| Repo layout | App at root, briefs and design export under `docs/` | The repo is part of the portfolio artefact |
| Execution | Phased, verified at each checkpoint | Catches a wrong turn at phase 2 rather than phase 5 |

## 3. Deviations from the build brief

The brief asked for these to be raised before building rather than after.

1. **`request.geo` does not exist in Next.js 15.** It was removed. Middleware reads the
   `x-vercel-ip-country` header instead, defaulting to `US` when absent (local dev, non-Vercel
   hosts). Behaviour is unchanged; the API is not.

2. **The currency mechanism contradicted the rendering strategy.** The brief had middleware
   set an `x-currency` request header for Server Components to read via `headers()`. Any page
   calling `headers()` is opted into dynamic rendering, so `/`, `/collections/[slug]` and
   `/products/[slug]` could not have been SSG or ISR. Resolved as above: cookie plus a client
   island. Documented on `/engineering` as a deliberate trade-off.

3. **The 90KB gzipped PDP budget is below the framework floor.** Next 15 + React 19 App Router
   baseline First Load JS is roughly 90–105KB before any application code. `/engineering`
   reports two numbers: the framework baseline, and the PDP's own incremental cost. The
   incremental figure is held under 90KB.

4. **SVG seed images cannot produce LQIP.** The brief asked for deterministic SVG placeholders
   *and* Sanity LQIP blur data. Sanity's image pipeline generates neither metadata nor
   transforms for SVG assets, so the blur requirement would have silently failed. `scripts/seed.ts`
   rasterizes each generated SVG to WebP with `sharp` before upload. Output stays deterministic.

5. **The Sanity GraphQL endpoint requires an explicit deploy.** `pnpm sanity graphql deploy`
   must be run once, or `/search` 404s. This is a README step, not a code change.

6. **The content model could not fill its own design.** The PDP draws `SKU`, `LOT`, a numeric
   `UPPER 1.6 MM` in the spec strip, and MATERIALS and CONSTRUCTION tables. The schema in the
   brief has none of these. `product` gains `sku`, `lot`, `upperMm`, `materials[]` and
   `construction[]`.

7. **The `/engineering` figures in the design export are fabricated.** "41,208 sessions",
   "field data — 28 days", "7 edge regions", "commit a41f9c2", "34 static / 3 dynamic". This is
   the one page whose entire job is credibility, on an artefact whose pitch is measurement
   discipline. The visual treatment is kept exactly; every number becomes true:
   - Web Vitals are measured live from the visiting session and labelled `THIS SESSION`.
   - Lighthouse figures are from a real run, labelled with date and configuration.
   - Build metadata is real: the commit SHA and build timestamp come from `git rev-parse` via
     `next.config.ts` env injection, and the static/dynamic route counts are derived from the
     route manifest rather than transcribed by hand.

8. **Route naming and revalidate windows differ between the design mock and the brief.** The
   mock shows `/p/[slug]`, `/collections/[handle]`, `revalidate 300` on `/` and `60` on the PDP.
   The brief specifies `/products/[slug]`, `/collections/[slug]`, `3600` and `300`. The brief
   wins. The mock's nav labels `TRAINERS` and `LASTS` are retitled to `LOW PROFILE` and
   `ARCHIVE` to match the chosen collections.

9. **The annotation callout does not need to be a client island.** The brief listed it as one.
   Implemented as inline SVG with `stroke-dasharray`/`stroke-dashoffset` animated by CSS
   keyframes and disabled inside `@media (prefers-reduced-motion: reduce)`, it stays a Server
   Component and costs zero JS — on the exact route with the tightest budget.

10. **Journal posts are SSG with no revalidate,** per the brief, which means publishing one
    requires a rebuild. The revalidation webhook therefore also revalidates journal paths, so
    editors are not blocked on a deploy.

## 4. Architecture

### 4.1 Content layer

Two adapters behind one typed interface.

```
lib/content/
  schema.ts      Zod schemas; all types derived, never hand-written
  source.ts      the interface; selects the Sanity adapter when
                 NEXT_PUBLIC_SANITY_PROJECT_ID is set, otherwise fixtures
  fixtures/      local adapter + the fixture dataset
  sanity/        GROQ adapter, one file per entity
  search.ts      GraphQL path, with a fixture-mode equivalent
```

The fixture dataset is the single source of truth for content. The local adapter reads it,
and `scripts/seed.ts` writes that same data into Sanity. Seeded CMS content and local content
are therefore identical, so every Playwright spec passes unmodified in either mode. This is
what makes building ahead of the CMS safe rather than throwaway work.

Both adapters parse through the same Zod schemas — including the fixture adapter, so a fixture
that would break the real parser fails locally first. No inline GROQ in components; every query
is a typed function in `lib/content/sanity/`.

### 4.2 The route manifest

`lib/rendering.ts` exports one typed `ROUTES` constant: route, strategy, revalidate window,
reasoning. Each page's `revalidate` export derives from it, `<RenderBadge>` reads it, and the
`/engineering` table maps over it. The documentation cannot drift from the implementation,
which is the claim the design's own copy makes.

### 4.3 Rendering strategy as implemented

| Route | Strategy | Revalidate | Notes |
|---|---|---|---|
| `/` | ISR | 3600 | Editorial content changes hourly at most |
| `/collections/[slug]` | SSG + ISR fallback | 3600 | `generateStaticParams` for the 4 known slugs, `dynamicParams = true` |
| `/products/[slug]` | ISR + on-demand | 300 | Sanity webhook verifies signature, calls `revalidatePath` and `revalidateTag` |
| `/api/stock` | Edge route handler | never | `no-store`. Source of truth for the size grid after hydration |
| `/search` | SSR | never | `force-dynamic`, reads `searchParams`, queries Sanity GraphQL |
| `/journal/[slug]` | SSG | — | `generateStaticParams`, webhook-revalidated |
| `/engineering` | SSG | — | Fully static |
| `/cart`, `/checkout/confirmation` | SSG shell, client-hydrated | — | No server data; cart state is client-only |
| `/studio` | Client-only | — | `noindex`, excluded from the middleware matcher |
| `middleware.ts` | Edge | — | Country → currency cookie, stable `lf-bucket` cookie |

### 4.4 Stock freshness

The PDP renders stock from the ISR snapshot, so first paint is complete with no client fetch
and no layout shift. After hydration, the size-selector island revalidates against the uncached
`/api/stock` route handler and updates only the cells whose state changed.

This satisfies the brief's "no client-side data fetching on first paint" while making the
design's `STOCK READ: LIVE — NO-STORE` line honest. It is also the strongest available answer
to the underlying question: cache the thing that does not change, never cache the thing that
does.

### 4.5 Client islands

Seven, and nothing else gets `'use client'`:

| Island | Why it must be client |
|---|---|
| `CartDrawer` | Focus trap, Escape handling, animation |
| `CartButton` | Reads Zustand store for the count |
| `FilterPanel` | Pushes facet state to the router |
| `GalleryThumbs` | Selection state |
| `SizeSelector` | Selection state, plus the post-hydration stock revalidate |
| `VitalsReporter` | `web-vitals` requires the browser |
| `ClientPrefs` | Reads the currency and A/B cookies; one shared hook, one chunk |

### 4.6 Design tokens

Taken verbatim from the design export's token sheet into a Tailwind v4 `@theme` block:
six colours, three font stacks, an eight-step type scale, `--tracking-mono: 0.16em`,
`--tracking-display: -0.035em`, `--leading-body: 1.65`, radius 0 except callout dots,
1px hairlines. No hardcoded hex in components.

The design's own rules are enforced: cobalt is never a large fill except the primary button,
ochre signals low stock and nothing else, every number is mono and letter-spaced.

## 5. Accessibility

WCAG 2.1 AA, gated in CI. Skip link; complete keyboard path from browse through filter, PDP,
size selection, add to cart, drawer, checkout; visible cobalt focus rings never removed;
`aria-pressed` on size buttons; out-of-stock uses `aria-disabled` plus the text "Out of stock",
never colour alone; `aria-live="polite"` on add-to-cart; `prefers-reduced-motion` respected.
`@axe-core/playwright` runs against `/`, a collection, a PDP, `/search` and `/engineering`.
Zero violations required.

## 6. Testing

**Playwright** — homepage badge reads `ISR`; collection filter by size updates URL and result
count; PDP add-to-cart opens the drawer, increments the count and announces; out-of-stock size
cannot be added; search returns a seeded product. Plus the axe sweep.

**Vitest** — currency formatting, price-band filter parsing, cart totals including quantity
edits, GROQ query builder, Zod boundary parsing.

**CI** — GitHub Actions on push and PR: install with pnpm cache → typecheck → lint → vitest →
build → playwright, with browsers cached.

## 7. Build phases

Each phase ends with a verification step and a checkpoint.

1. **Foundation** — repo scaffolding, TS strict with `noUncheckedIndexedAccess`, Tailwind v4
   `@theme`, fonts, layout shell, header, footer, render badge, middleware.
   *Verify: clean build; badge renders; middleware sets both cookies.*

2. **Content layer** — Zod schemas, fixture dataset (24 products, 4 collections, 3 journal
   posts, settings), fixture adapter, Sanity schemas, GROQ adapter, seed script, Vitest units.
   *Verify: unit tests green. Sanity credentials slot in here when available.*

3. **Routes** — `/`, PLP with URL-driven facets, PDP with callout, spec strip and size grid,
   `/journal/[slug]`, `/search`, `/engineering`, `/studio`.
   *Verify: build output shows the intended static/ISR/dynamic split per route.*

4. **Cart** — Zustand store, drawer with focus trap, mock checkout confirmation.
   *Verify: full keyboard path walked by hand.*

5. **Tests, CI, budget** — Playwright specs, axe sweep, GitHub Actions, bundle report,
   Lighthouse run, README.
   *Verify: all green; route-level JS reported; `/engineering` figures are the measured ones.*

## 8. Definition of done

- `pnpm build` succeeds with zero TypeScript errors and zero ESLint warnings
- All Playwright specs pass; axe reports zero violations
- Route-level incremental JS reported; PDP incremental under 90KB
- Seed script runs clean against an empty dataset
- Every route renders sensibly with an empty CMS
- README covers architecture, the rendering table, setup, seeding, the GraphQL deploy step,
  webhook configuration, Lighthouse results, and the no-payment-processing note

## 9. Out of scope

Payments, real auth, inventory sync, i18n beyond currency display, wishlist, reviews, and any
admin surface beyond the embedded Studio.
