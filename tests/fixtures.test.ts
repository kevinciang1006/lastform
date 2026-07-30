import { describe, expect, it } from 'vitest';
import { COLLECTIONS, JOURNAL_POSTS, PRODUCTS, SITE_SETTINGS } from '@/lib/content/fixtures/data';
import {
  collectionSchema,
  journalPostSchema,
  productSchema,
  siteSettingsSchema,
  stockState,
} from '@/lib/content/schema';

describe('fixture dataset', () => {
  it('has 24 products across 4 collections and 3 journal posts', () => {
    expect(PRODUCTS).toHaveLength(24);
    expect(COLLECTIONS).toHaveLength(4);
    expect(JOURNAL_POSTS).toHaveLength(3);
  });

  it('parses every document through its schema', () => {
    for (const product of PRODUCTS) expect(productSchema.safeParse(product).success, product.slug).toBe(true);
    for (const collection of COLLECTIONS) expect(collectionSchema.safeParse(collection).success, collection.slug).toBe(true);
    for (const post of JOURNAL_POSTS) expect(journalPostSchema.safeParse(post).success, post.slug).toBe(true);
    expect(siteSettingsSchema.safeParse(SITE_SETTINGS).success).toBe(true);
  });

  it('uses unique slugs and SKUs', () => {
    expect(new Set(PRODUCTS.map((p) => p.slug)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map((p) => p.sku)).size).toBe(PRODUCTS.length);
  });

  it('references only real collections', () => {
    const slugs = new Set(COLLECTIONS.map((c) => c.slug));
    for (const product of PRODUCTS) expect(slugs.has(product.collectionSlug), product.slug).toBe(true);
  });

  it('exposes all three stock states somewhere, so every size-grid state is visible', () => {
    const states = new Set(PRODUCTS.flatMap((p) => p.variants.map((v) => stockState(v.stock))));
    expect(states).toEqual(new Set(['in', 'low', 'out']));
  });

  it('gives at least one product every stock state at once for PDP testing', () => {
    const mixed = PRODUCTS.find((p) => {
      const states = new Set(p.variants.map((v) => stockState(v.stock)));
      return states.size === 3;
    });
    expect(mixed, 'no product exercises all three stock states').toBeDefined();
  });

  it('marks exactly one product featured, for the homepage hero', () => {
    expect(PRODUCTS.filter((p) => p.featured)).toHaveLength(1);
  });

  it('gives the featured product annotations for the dimension callout', () => {
    const hero = PRODUCTS.find((p) => p.featured);
    expect(hero?.annotations.length).toBeGreaterThanOrEqual(4);
  });
});

/** These guard the dataset against future damage rather than original authoring
 *  mistakes: every screen in the project renders from these records, and a later
 *  edit that unbalances a collection or pastes a duplicate description would
 *  otherwise only surface as a thin-looking page nobody notices. */
describe('fixture content quality', () => {
  type Blockish = { children?: { text?: string }[]; _type?: string };
  const textOf = (blocks: readonly unknown[]) =>
    blocks.map((b) => (b as Blockish).children?.map((c) => c.text ?? '').join(' ') ?? '').join(' ');

  it('gives every product a description distinct from all the others', () => {
    const texts = PRODUCTS.map((p) => textOf(p.description));
    expect(new Set(texts).size).toBe(PRODUCTS.length);
  });

  // A bare { _type: 'block' } satisfies the schema's predicate and renders nothing,
  // so the schema alone cannot catch this.
  it('never uses an empty portable-text stub for a description', () => {
    for (const product of PRODUCTS) {
      for (const block of product.description) {
        const children = (block as Blockish).children;
        expect(children?.[0]?.text, product.slug).toBeTruthy();
      }
    }
  });

  it('spreads the products evenly across the four collections', () => {
    for (const collection of COLLECTIONS) {
      const count = PRODUCTS.filter((p) => p.collectionSlug === collection.slug).length;
      expect(count, collection.slug).toBe(6);
    }
  });

  // Per collection, not just globally: the PLP filter demo has to work on whichever
  // collection someone opens, which means each needs an out-of-stock size to filter out.
  it('exposes all three stock states within every collection', () => {
    for (const collection of COLLECTIONS) {
      const states = new Set(
        PRODUCTS.filter((p) => p.collectionSlug === collection.slug).flatMap((p) =>
          p.variants.map((v) => stockState(v.stock)),
        ),
      );
      expect(states, collection.slug).toEqual(new Set(['in', 'low', 'out']));
    }
  });

  it('gives every journal post exactly one pull quote for the custom serializer', () => {
    for (const post of JOURNAL_POSTS) {
      const quotes = post.body.filter((b) => (b as Blockish)._type === 'pullQuote');
      expect(quotes, post.slug).toHaveLength(1);
    }
  });

  it('orders journal posts newest first, which the homepage relies on', () => {
    const times = JOURNAL_POSTS.map((p) => Date.parse(p.publishedAt));
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i - 1]).toBeGreaterThan(times[i] ?? 0);
    }
  });

  it('varies the facet values enough for filtering to be meaningful', () => {
    expect(new Set(PRODUCTS.map((p) => p.colour)).size).toBeGreaterThanOrEqual(10);
    expect(new Set(PRODUCTS.map((p) => p.material)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(PRODUCTS.map((p) => p.lastShape)).size).toBeGreaterThanOrEqual(6);
  });

  it('spans all three price bands the filter UI offers', () => {
    const prices = PRODUCTS.map((p) => p.price);
    expect(prices.some((p) => p <= 300 || p <= 360)).toBe(true);
    expect(prices.some((p) => p > 300 && p <= 500)).toBe(true);
    expect(prices.some((p) => p > 500)).toBe(true);
  });
});
