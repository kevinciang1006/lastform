# Claude Design prompt — Lastform

Paste into Claude Design. Output wanted: a homepage, a PDP, and the `/engineering` page, plus a token sheet I can hand to Claude Code.

---

Design the visual identity and three key screens for **Lastform**, a footwear storefront.

**Subject.** Lastform sells constructed leather footwear — boots, derbies, low-profile trainers. The brand's whole premise is the *last*: the carved wooden mould a shoe is built around. Every product is defined by measurable things — last shape, heel drop in millimetres, upper material, weight in grams. The house voice is a workshop technician's, not a marketer's. It states dimensions and lets the reader draw conclusions.

**Audience.** People who read spec sheets before they read reviews.

**The page's job.** Make a specification feel like the reason to buy.

## Direction

A **technical catalogue**, not a lifestyle lookbook. Think measured drawings, dimension callouts, and stock cards — the visual language of a workshop's parts index. Product photography sits inside a strict grid and is annotated, never bled edge-to-edge over a headline.

Avoid entirely: cream backgrounds with a high-contrast serif and a terracotta accent; near-black with one acid-green highlight; broadsheet columns with hairline rules and zero radius. Those are the defaults. This brief has a specific world to draw from — use it.

## Palette

Cool, industrial, low-chroma with one saturated signal colour.

- `--ink` `#14181B` — primary text, dark surfaces
- `--chalk` `#E9E9E4` — page ground, a cool grey-green paper, not cream
- `--slate` `#5A6167` — secondary text, rules, annotation
- `--cobalt` `#1B3BD9` — the signal. Measurements, focus rings, active states, links. Used sparingly and never as a large fill.
- `--ochre` `#C4842B` — availability only. Low stock. Nothing else.
- `--fog` `#D6D7D1` — dividers, disabled, image placeholder

## Type

- **Display — Archivo.** Set wide and heavy at large sizes, tight tracking. Product names, section heads.
- **Body — Inter Tight.** Modest sizes, generous leading. Descriptions, editorial.
- **Utility — IBM Plex Mono.** All numbers, dimensions, SKUs, sizes, prices, the render badge. Uppercase, letter-spaced, small. This is the voice of the workshop.

The mono/display contrast is the personality. A product name in wide heavy Archivo sitting directly above a mono spec strip should read like a drawing title block.

## Signature element: the spec strip

Every product carries a horizontal specification strip — a mono readout of `LAST` / `DROP` / `UPPER` / `WEIGHT`, separated by thin vertical rules, with the values in cobalt and the labels in slate. On the PDP, extend it into a **dimension callout**: hairline leader lines drawn from points on the product photograph out to the mono labels, the way a technical drawing annotates a part. That annotated photograph is the one thing this site will be remembered for. Build it well and keep everything else quiet.

## Second signature: the render badge

The footer carries a small mono badge stating how the page was rendered and when:

```
RENDERED  ISR · 2026-07-28 09:14:02 UTC · REVALIDATE 300s
```

Treat it as part of the design, not debug output — it belongs to the workshop-instrumentation voice. Give it a resting state and a subtle emphasis when the timestamp is fresh.

## Screens to produce

1. **Homepage** — announcement bar, header with cart count, a hero that leads with an annotated product rather than a slogan, four collection cards, one editorial block, footer with render badge.
2. **PDP** — annotated gallery left, buy column right (name, spec strip, price in mono, size grid with three stock states, add-to-cart), description below, streamed recommendations strip.
3. **`/engineering`** — the rendering strategy table (route / strategy / revalidate / reasoning) and a Core Web Vitals readout. This is a documentation page that has to look intentional rather than like a leftover admin view.

## Constraints

- Mobile-first; give me the mobile PDP too
- Focus states are visible and cobalt, never removed
- No colour-only signalling — out-of-stock says so in text
- Respect `prefers-reduced-motion`
- Motion: restrained. One page-load sequence on the hero annotation drawing itself in, hover states on the size grid, nothing else.

Deliver a token sheet at the end: hex values, font stacks, type scale, spacing scale, radius, border widths — in a form I can paste straight into a Tailwind v4 `@theme` block.
