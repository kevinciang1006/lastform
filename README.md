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
pnpm dev
```

The 55 fixture photographs are committed, so nothing needs generating. To
refresh them:

```bash
pnpm photos         # real photographs from Unsplash (committed by default)
pnpm placeholders   # the original generated hatch placeholders, if preferred
```

It runs entirely on local fixtures with no configuration. Sanity is optional.

### With Sanity

Create a free project at [sanity.io](https://www.sanity.io), then:

```bash
cp .env.example .env.local     # fill in project id, dataset, tokens
pnpm seed                      # writes the fixture dataset into Sanity
pnpm sanity graphql deploy     # required, or /search returns nothing
```

`pnpm seed` uploads the 55 fixture photographs as Sanity assets and writes 32
documents — 24 products, 4 collections, 3 journal posts and the settings
singleton. It is safe to re-run: document `_id`s are derived from slugs and
written with `createOrReplace`, and images are matched on content hash before
upload, so a second run reports `0 uploaded, 55 reused` and creates nothing.
(Those 55 filenames resolve to 39 distinct assets; eight of the secondary
photographs are byte-identical and Sanity dedups them.)

The adapter selects itself on `NEXT_PUBLIC_SANITY_PROJECT_ID` being present, so
a misconfigured deploy degrades to fixtures rather than throwing at request time.
That degradation is deliberately loud: the server logs a warning at startup and
`/engineering` reports `SOURCE — FIXTURES — FALLBACK` in its build block. A
fallback nobody can see is worse than none, because fixtures render a complete
catalogue and the site looks healthy while the CMS is disconnected.

`pnpm sanity graphql deploy` is not optional if you want search: the GraphQL
endpoint does not exist until the schema is deployed, and `/search` returns an
empty result set until it does.

**The Studio runs standalone**, via `pnpm sanity dev`. It is not embedded:
Sanity's structure tool imports `useEffectEvent` as a named export from React,
and webpack cannot resolve that name against the React copy Next aliases into
the client bundle — React 19.2.8 does export it at runtime, so the import is
unresolvable rather than absent. Tested on sanity 5.31.1, next-sanity 12.4.5,
Next 15.5.22 and React 19.2.8. `/studio` in this app is a page that says so.

Versions are pinned rather than current: next-sanity 12.4.5 declares a peer
dependency on Next 16, which this application is deliberately not on.

### On-demand revalidation

In the Sanity dashboard, add a webhook:

- **URL** `https://<your-domain>/api/revalidate`
- **Trigger on** create, update, delete
- **Filter** `_type in ["product", "journalPost", "collection", "siteSettings"]`
- **Projection** `{_type, "slug": slug.current}`
- **Secret** the same value as `SANITY_REVALIDATE_SECRET`

The signature is verified over the raw request body, so the route reads bytes
before parsing. Unsigned requests, wrong-secret signatures and bodies modified
after signing are all rejected with 401; an unknown `_type` is rejected with 400.

The route purges **cache tags**, not paths. Every cached read declares what it
depended on — a product list tags `product`, a single product page also tags
`product:<slug>` — so this route never needs to know which pages render which
documents. It answers with the tags it purged, so the delivery log in Sanity
shows what a publish actually invalidated:

```json
{ "revalidated": ["product", "product:grain-derby-04"], "type": "product" }
```

Deletes carry a `_type` but usually no slug, so they fall back to the collective
tag, which is what removes the document from every list it appeared in.

## Continuous integration

`.github/workflows/ci.yml` runs typecheck, lint, unit tests, build, and the
end-to-end and axe suites on every push. Add these as **repository secrets**
(Settings → Secrets and variables → Actions) so CI exercises the live dataset
rather than the fixture fallback:

| Secret | Notes |
| --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Not sensitive — it ships in the client bundle — but kept as a secret so forks build in fixture mode |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | `2024-10-01` |
| `SANITY_API_READ_TOKEN` | Viewer permission |

No write token in CI: nothing in the pipeline seeds, and a token that can write
to the production dataset has no business in a workflow triggered by a pull
request. Without these, every step still passes — the site builds from fixtures
and `e2e/sanity-source.spec.ts` skips rather than fails.

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

## Images

The product photographs come from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license) — free to use commercially,
no permission or attribution required. `public/fixtures/CREDITS.md` lists every
file and its source photograph anyway.

They are stand-ins, and two things follow from that. They are not photographs of
the products described, which the credits file states plainly. And the dimension
callouts on the annotated figure were authored against the design's illustration,
so their anchor points do not line up meaningfully with a stock photograph —
real product photography shot to a fixed camera position is what would make
those leader lines point at the thing they name.

`pnpm photos` pins its photo identifiers rather than discovering them, so a
rebuild never reshuffles the catalogue. Every identifier was verified to return
HTTP 200 before being committed: one candidate in the original set was a
plausible-looking fabrication that 404s.

## Deploying

1. Import the repository on Vercel.
2. Set every variable from `.env.example` for Production and Preview.
3. Add the domain, and point its DNS `CNAME` at `cname.vercel-dns.com`.

Vercel is required rather than preferred: ISR, on-demand revalidation and edge
middleware are the subject of the demonstration, and a static host cannot do them.
