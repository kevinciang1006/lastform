# Lastform

A footwear storefront built as a reference implementation of rendering-strategy
decisions, headless CMS integration, and Core Web Vitals discipline.

**It is a portfolio artefact, not a shop.** There is no payment processing and no
real inventory. The checkout screen says so on the page rather than in a policy.

The premise: most portfolio storefronts describe their architecture in a README.
This one makes it observable. Every page carries a mono render badge in the
footer stating how that page was rendered, when its HTML was generated, and its
revalidation window. Reload a product page after five minutes and the timestamp
moves. Reload the engineering page and it stays at build time. `/engineering`
documents the whole table — generated from the same constant the badges read, so
the documentation cannot drift from the implementation.

---

## Rendering strategy

| Route | Strategy | Revalidate | Why |
|---|---|---|---|
| `/` | ISR | 3600s | Editorial content changes hourly at most. |
| `/collections/[slug]` | SSG + ISR fallback | 3600s | Four finite, high-traffic collections. Unknown slugs still render. |
| `/products/[slug]` | ISR + on-demand | 300s | The spec sheet never changes and price rarely does. Stock is read separately. |
| `/api/stock` | Edge, uncached | never | A cached stock response is a correctness bug, not a performance win. |
| `/search` | SSR | never | Output is a pure function of user input. |
| `/journal/[slug]` | SSG | on publish | Static once published; the webhook invalidates it. |
| `/engineering` | SSG | at build | Generated from the route manifest. |
| `/cart`, `/checkout/confirmation` | Static shell, client state | — | Per-visitor, no server involvement. |
| `middleware.ts` | Edge | — | Runs before the cache, so it stays to one header read and two cookie writes. |

The authoritative version is `lib/rendering.ts`. Pages derive their `revalidate`
exports from it, the render badges print from it, and `/engineering` maps over
it. A test asserts the literal `revalidate` exports match the manifest, because
Next.js requires them to be statically analysable literals and literals drift.

## Four decisions worth defending

**Currency lives in a cookie, not a request header.** The obvious design has
middleware set a header that Server Components read via `headers()`. That call
opts a page into dynamic rendering, which would have turned every static and ISR
route here into SSR — destroying the thing the site exists to demonstrate. The
middleware sets a cookie and a client island reads it.

**Stock is the only uncached read.** A product page is mostly a spec sheet, and a
spec sheet does not change. Stock does. Caching them together forces a choice
between a stale size grid and an uncacheable page, so they are split: the page is
ISR, and the size grid refreshes against an edge route that is never cached. The
grid is complete in the server HTML first, so nothing shifts and nothing blocks.

**Filters live in the URL.** Facet state is in the query string rather than
component state, so a filtered view is shareable, reloadable and readable on the
server. The cost is that reading `searchParams` renders that request dynamically.

**GROQ everywhere, GraphQL once.** Search is the one route that speaks GraphQL.
GROQ projections shape the response so the adapter receives exactly the keys its
schema wants; GraphQL returns the document's own field names and the mapping
happens in TypeScript. Both paths exist here on purpose.

## Architecture

Content comes through one `ContentSource` interface with two adapters behind it:
local fixtures and Sanity via GROQ. Both parse through the same Zod schemas at
the boundary, and `tests/adapter-parity.test.ts` asserts they agree — which is
what stops the two sources drifting. The seed script writes the fixture dataset
into Sanity, so the two hold identical content and every test passes in either
mode.

```
app/                    routes
components/chrome/      site frame — PageShell, header, footer, render badge
components/product/     spec strip, annotated figure, tiles, spec tables
components/islands/     the seven client components, and nothing else
lib/rendering.ts        the route manifest
lib/content/            schemas, both adapters, facets, search
sanity/schemas/         CMS document definitions
scripts/seed.ts         writes the fixture dataset into Sanity
```

**Seven client islands, deliberately:** `CartDrawer`, `CartButton`,
`FilterPanel`, `GalleryThumbs`, `SizeSelector`, `VitalsReporter`, `ClientPrefs`.
Everything else is a Server Component. The annotated dimension callout — the
site's signature element — ships zero JavaScript: inline SVG animated by CSS
keyframes, on the route with the tightest budget.

## Running it

```bash
pnpm install
pnpm placeholders   # generates the 55 fixture images
pnpm dev
```

It runs entirely on local fixtures with no configuration. Sanity is optional.

### With Sanity

Create a free project at [sanity.io](https://www.sanity.io), then:

```bash
cp .env.example .env.local     # fill in project id, dataset, tokens
pnpm seed                      # writes the fixture dataset into Sanity
pnpm sanity graphql deploy     # required, or /search returns nothing
```

The adapter selects itself on `NEXT_PUBLIC_SANITY_PROJECT_ID` being present, so
a misconfigured deploy degrades to fixtures rather than throwing at request time.

`pnpm sanity graphql deploy` is not optional if you want search: the GraphQL
endpoint does not exist until the schema is deployed.

**The Studio runs standalone**, via `pnpm sanity dev`. It is not embedded —
Sanity 6 imports React's `useEffectEvent` in a way that does not resolve against
the React copy Next 15 aliases into its client bundle. `/studio` in this app is a
page that says so.

### On-demand revalidation

In the Sanity dashboard, add a webhook:

- **URL** `https://<your-domain>/api/revalidate`
- **Trigger on** create, update, delete
- **Filter** `_type in ["product", "journalPost", "collection", "siteSettings"]`
- **Projection** `{_type, "slug": slug.current, "collectionSlug": collection->slug.current}`
- **Secret** the same value as `SANITY_REVALIDATE_SECRET`

The signature is verified over the raw request body, so the route reads bytes
before parsing.

## Verifying

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm test:e2e
```

`lint` fails on warnings, not just errors. `test:e2e` builds its own production
server and never reuses one on the port — ISR and static prerendering do not
behave like `next dev`, and a stale server from another project silently serves
a different app, which looks exactly like broken assertions.

The end-to-end suite includes an axe sweep across seven routes and the open cart
drawer, at WCAG 2.1 AA. Two things it verified that unit tests could not: the
size grid is complete in the server HTML with JavaScript disabled, and search
works without JavaScript because its form is a plain GET.

## Deploying

1. Import the repository on Vercel.
2. Set every variable from `.env.example` for Production and Preview.
3. Add the domain, and point its DNS `CNAME` at `cname.vercel-dns.com`.

Vercel is required rather than preferred: ISR, on-demand revalidation and edge
middleware are the subject of the demonstration, and a static host cannot do them.
