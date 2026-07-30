import { describe, expect, it } from 'vitest';
import { fixtureSource } from '@/lib/content/fixtures/adapter';
import { parseFacets } from '@/lib/facets';
import {
  collectionCardSchema,
  journalPostSchema,
  productCardSchema,
  productSchema,
  siteSettingsSchema,
} from '@/lib/content/schema';

const source = fixtureSource();

describe('fixture ContentSource', () => {
  it('lists four collections with derived model counts', async () => {
    const collections = await source.listCollections();
    expect(collections).toHaveLength(4);
    expect(collections.reduce((n, c) => n + c.modelCount, 0)).toBe(24);
    for (const c of collections) expect(c.avgDropMm, c.slug).toBeGreaterThan(0);
  });

  it('parses collection cards through their schema', async () => {
    for (const c of await source.listCollections()) {
      expect(collectionCardSchema.safeParse(c).success, c.slug).toBe(true);
    }
  });

  it('returns collections in sortOrder', async () => {
    const slugs = (await source.listCollections()).map((c) => c.slug);
    expect(slugs).toEqual(['boots', 'derbies', 'low-profile', 'archive']);
  });

  it('returns null for an unknown slug rather than throwing', async () => {
    expect(await source.getCollection('nope')).toBeNull();
    expect(await source.getProduct('nope')).toBeNull();
    expect(await source.getJournalPost('nope')).toBeNull();
  });

  it('scopes listProducts to a collection', async () => {
    const result = await source.listProducts({ ...parseFacets({}), collection: 'derbies' });
    expect(result.total).toBe(6);
    expect(result.items).toHaveLength(6);
    for (const item of result.items) expect(productCardSchema.safeParse(item).success, item.slug).toBe(true);
  });

  it('returns every product when no collection is given', async () => {
    const result = await source.listProducts(parseFacets({}));
    expect(result.total).toBe(24);
  });

  it('returns an empty result for an unknown collection', async () => {
    const result = await source.listProducts({ ...parseFacets({}), collection: 'nope' });
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('reports available facets from the unfiltered collection, not the filtered result', async () => {
    const all = await source.listProducts({ ...parseFacets({}), collection: 'boots' });
    const filtered = await source.listProducts({ ...parseFacets({ price: '600-' }), collection: 'boots' });
    expect(filtered.total).toBeLessThan(all.total);
    // The filter UI must keep offering every option, or a user can never widen again.
    expect(filtered.facets.colours).toEqual(all.facets.colours);
    expect(filtered.facets.sizes).toEqual(all.facets.sizes);
    expect(filtered.facets.materials).toEqual(all.facets.materials);
  });

  it('offers facet values that are sorted and free of duplicates', async () => {
    const { facets } = await source.listProducts({ ...parseFacets({}), collection: 'boots' });
    expect(facets.sizes).toEqual([...new Set(facets.sizes)].sort((a, b) => a - b));
    expect(facets.colours).toEqual([...new Set(facets.colours)].sort());
    expect(facets.materials).toEqual([...new Set(facets.materials)].sort());
  });

  it('applies sort through listProducts, not just filtering', async () => {
    const { items } = await source.listProducts({ ...parseFacets({ sort: 'price-asc' }), collection: 'boots' });
    const prices = items.map((i) => i.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('parses the featured product and gives it annotations', async () => {
    const hero = await source.getFeaturedProduct();
    expect(hero).not.toBeNull();
    expect(productSchema.safeParse(hero).success).toBe(true);
    expect(hero?.annotations.length).toBeGreaterThanOrEqual(4);
    expect(hero?.slug).toBe('grain-derby-04');
  });

  it('recommends products on the same last, excluding the product itself', async () => {
    const product = await source.getProduct('grain-derby-04');
    expect(product).not.toBeNull();
    if (!product) return;
    const related = await source.listRelated(product, 4);
    expect(related.items).toHaveLength(4);
    expect(related.basis).toBe('last');
    expect(related.items.map((r) => r.slug)).not.toContain('grain-derby-04');
    for (const r of related.items) expect(r.lastShape, r.slug).toBe(product.lastShape);
  });

  it('honours the recommendation limit', async () => {
    const product = await source.getProduct('grain-derby-04');
    if (!product) throw new Error('fixture missing');
    expect((await source.listRelated(product, 2)).items).toHaveLength(2);
    expect((await source.listRelated(product, 0)).items).toEqual([]);
  });

  // Two products are the only ones cut on their last. Without a fallback their
  // PDP recommendation strip would render empty.
  it('still fills the strip for a product with no same-last siblings', async () => {
    for (const slug of ['engineer-08', 'archive-boot-04']) {
      const product = await source.getProduct(slug);
      if (!product) throw new Error(`fixture missing: ${slug}`);
      const related = await source.listRelated(product, 4);
      expect(related.items.length, slug).toBe(4);
      expect(related.basis, slug).toBe('collection');
      expect(related.items.map((r) => r.slug), slug).not.toContain(slug);
    }
  });

  it('reports the collection basis whenever the list is topped up', async () => {
    for (const slug of await source.getProductSlugs()) {
      const product = await source.getProduct(slug);
      if (!product) continue;
      const related = await source.listRelated(product, 4);
      // Every product gets a full strip, and the basis never overclaims.
      expect(related.items.length, slug).toBeGreaterThan(0);
      if (related.basis === 'last') {
        for (const r of related.items) expect(r.lastShape, `${slug} -> ${r.slug}`).toBe(product.lastShape);
      }
    }
  });

  it('returns stock for every size of a product', async () => {
    const stock = await source.getStock('grain-derby-04');
    expect(stock).toHaveLength(12);
    expect(stock.some((v) => v.stock === 0)).toBe(true);
    expect(stock.some((v) => v.stock > 0)).toBe(true);
  });

  it('returns no stock for an unknown product, which the route turns into a 404', async () => {
    expect(await source.getStock('nope')).toEqual([]);
  });

  it('searches case-insensitively on title', async () => {
    const hits = await source.searchProducts('derby');
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) expect(hit.title.toLowerCase()).toContain('derby');
    expect((await source.searchProducts('DERBY')).length).toBe(hits.length);
  });

  it('returns an empty array for a blank search term rather than everything', async () => {
    expect(await source.searchProducts('   ')).toEqual([]);
    expect(await source.searchProducts('')).toEqual([]);
  });

  it('lists journal posts newest first and parses them', async () => {
    const posts = await source.listJournalPosts();
    expect(posts).toHaveLength(3);
    for (const p of posts) expect(journalPostSchema.safeParse(p).success, p.slug).toBe(true);
    const times = posts.map((p) => Date.parse(p.publishedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('parses site settings', async () => {
    expect(siteSettingsSchema.safeParse(await source.getSiteSettings()).success).toBe(true);
  });

  it('exposes every slug for generateStaticParams', async () => {
    expect(await source.getProductSlugs()).toHaveLength(24);
    expect(await source.getCollectionSlugs()).toHaveLength(4);
    expect(await source.getJournalSlugs()).toHaveLength(3);
  });

  // The adapter hands out schema-parsed copies, so a caller cannot corrupt the
  // fixture module for every later test in the same process.
  it('does not leak a mutable reference to the fixture data', async () => {
    const first = await source.getProduct('grain-derby-04');
    if (!first) throw new Error('fixture missing');
    first.title = 'MUTATED';
    const second = await source.getProduct('grain-derby-04');
    expect(second?.title).toBe('Grain Derby 04');
  });
});
