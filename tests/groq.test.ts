import { describe, expect, it } from 'vitest';
import { parseFacets } from '@/lib/facets';
import { productListQuery } from '@/lib/content/sanity/queries';
import { imageRefFrom } from '@/lib/content/sanity/image';
import {
  collectionSchema,
  journalPostSchema,
  productCardSchema,
  productSchema,
  siteSettingsSchema,
} from '@/lib/content/schema';
import {
  ALL_PRODUCTS_QUERY,
  COLLECTION_PROJECTION,
  FEATURED_PRODUCT_QUERY,
  JOURNAL_PROJECTION,
  JOURNAL_SLUGS_QUERY,
  PRODUCT_CARD_PROJECTION,
  PRODUCT_PROJECTION,
  PRODUCT_SLUGS_QUERY,
  SITE_SETTINGS_PROJECTION,
} from '@/lib/content/sanity/queries';

describe('productListQuery', () => {
  it('always constrains to the product type', () => {
    const { query } = productListQuery(parseFacets({}));
    expect(query).toContain('_type == "product"');
  });

  it('parameterises the collection rather than interpolating it', () => {
    const { query, params } = productListQuery({ ...parseFacets({}), collection: 'boots' });
    expect(query).toContain('$collection');
    expect(query).not.toContain('"boots"');
    expect(params['collection']).toBe('boots');
  });

  it('adds a price band clause only when a band is set', () => {
    expect(productListQuery(parseFacets({})).query).not.toContain('$minPrice');
    const banded = productListQuery(parseFacets({ price: '200-400' }));
    expect(banded.query).toContain('$minPrice');
    expect(banded.params['minPrice']).toBe(200);
    expect(banded.params['maxPrice']).toBe(400);
  });

  it('omits the max clause for an open-ended band', () => {
    const open = productListQuery(parseFacets({ price: '600-' }));
    expect(open.query).toContain('$minPrice');
    expect(open.query).not.toContain('$maxPrice');
  });

  it('requires a matching size to actually be in stock', () => {
    const { query, params } = productListQuery(parseFacets({ size: '43' }));
    expect(query).toContain('variants[');
    expect(query).toContain('stock > 0');
    expect(params['sizes']).toEqual([43]);
  });

  // Every ordering carries a title tie-break. Four products in the catalogue
  // share a price with another, and `applyFacets` tie-breaks on title, so GROQ
  // must too or the two adapters return the same set in a different order.
  it('maps sort keys to GROQ ordering, always with a deterministic tie-break', () => {
    expect(productListQuery(parseFacets({ sort: 'price-asc' })).query).toContain('order(price asc, title asc)');
    expect(productListQuery(parseFacets({ sort: 'price-desc' })).query).toContain('order(price desc, title asc)');
    expect(productListQuery(parseFacets({ sort: 'weight-asc' })).query).toContain('order(weightGrams asc, title asc)');
    expect(productListQuery(parseFacets({})).query).toContain('order(featured desc, title asc)');
  });
});

describe('optional array fields degrade to empty rather than null', () => {
  // GROQ returns null, not [], for an array field a document never set — and
  // an empty annotations/materials/construction/description list is a normal
  // editorial state (not every boot needs callouts), not malformed data.
  // Left uncoalesced: variants (a product with zero sizes is a genuine
  // content defect Zod should still reject) and the single-image fields
  // (heroImage/coverImage/image), which have no valid "empty" substitute and
  // are handled instead by imageRefFrom accepting a nullish source.
  it('wraps every optional product array in coalesce(..., [])', () => {
    for (const field of ['description', 'annotations', 'materials', 'construction']) {
      expect(PRODUCT_PROJECTION, field).toMatch(new RegExp(`coalesce\\(${field}\\b`));
    }
  });

  it('wraps the journal body in coalesce(..., [])', () => {
    expect(JOURNAL_PROJECTION).toMatch(/coalesce\(body\b/);
  });

  it('wraps the optional site settings arrays in coalesce(..., [])', () => {
    for (const field of ['footerColumns', 'featuredCollections']) {
      expect(SITE_SETTINGS_PROJECTION, field).toMatch(new RegExp(`coalesce\\(${field}\\b`));
    }
  });
});

// GROQ makes no ordering guarantee without an explicit order() clause.
// ALL_PRODUCTS_QUERY and FEATURED_PRODUCT_QUERY feed listRelated/
// listCollections/getFeaturedProduct, which slice or take[0] the result —
// unordered input there would make which products come back unspecified.
// The slug-only queries are ordered too so a future caller that assumes
// stable output (unlike today's order-independent generateStaticParams use)
// isn't quietly wrong.
describe('order-dependent list queries are explicitly ordered', () => {
  it('orders products, product slugs, journal slugs and the featured pick by title', () => {
    for (const query of [ALL_PRODUCTS_QUERY, PRODUCT_SLUGS_QUERY, JOURNAL_SLUGS_QUERY, FEATURED_PRODUCT_QUERY]) {
      expect(query).toContain('order(title asc)');
    }
  });
});

// The adapter that consumes these projections cannot be integration-tested
// without a live Sanity project. This is the next best thing: derive the
// field list straight from the Zod schema the response must parse through,
// and confirm every field the parser requires is actually being asked for.
// A forgotten field here is a parse error the moment real credentials land.
//
// Limitation: this only checks that the alias name is present, not what it
// projects from — `"title": sku` would pass. It catches a forgotten field,
// not a mis-wired one.
describe('GROQ projections cover every schema field', () => {
  function assertCoverage(keys: readonly string[], projection: string, label: string) {
    for (const key of keys) {
      const present = new RegExp(`\\b${key}\\b`).test(projection);
      expect(present, `${label} projection is missing "${key}"`).toBe(true);
    }
  }

  it('product projection covers every productSchema field', () => {
    assertCoverage(productSchema.keyof().options, PRODUCT_PROJECTION, 'product');
  });

  it('product card projection covers every productCardSchema field', () => {
    assertCoverage(productCardSchema.keyof().options, PRODUCT_CARD_PROJECTION, 'product card');
  });

  it('collection projection covers every collectionSchema field', () => {
    assertCoverage(collectionSchema.keyof().options, COLLECTION_PROJECTION, 'collection');
  });

  it('journal projection covers every journalPostSchema field', () => {
    assertCoverage(journalPostSchema.keyof().options, JOURNAL_PROJECTION, 'journal');
  });

  it('site settings projection covers every siteSettingsSchema field', () => {
    assertCoverage(siteSettingsSchema.keyof().options, SITE_SETTINGS_PROJECTION, 'site settings');
  });
});

// Both branches below return before touching the Sanity client, so these run
// safely with no project configured and no network — unlike a real image
// with a resolvable asset, which needs a configured client to build a URL
// from and is exercised instead by tests/adapter-parity.test.ts.
describe('imageRefFrom handles the two ways a Sanity image can be absent', () => {
  it('returns null for a wholly unset image field (heroImage/coverImage never set)', () => {
    expect(imageRefFrom(null)).toBeNull();
  });

  it('throws a Zod validation error for a present image with no uploaded asset', () => {
    expect(() => imageRefFrom({ alt: 'Unfinished upload', asset: null })).toThrow();
  });
});
