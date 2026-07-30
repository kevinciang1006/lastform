import { describe, expect, it } from 'vitest';
import { parseFacets } from '@/lib/facets';
import { productListQuery } from '@/lib/content/sanity/queries';
import {
  collectionSchema,
  journalPostSchema,
  productCardSchema,
  productSchema,
  siteSettingsSchema,
} from '@/lib/content/schema';
import {
  COLLECTION_PROJECTION,
  JOURNAL_PROJECTION,
  PRODUCT_CARD_PROJECTION,
  PRODUCT_PROJECTION,
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

  it('maps sort keys to GROQ ordering', () => {
    expect(productListQuery(parseFacets({ sort: 'price-asc' })).query).toContain('order(price asc)');
    expect(productListQuery(parseFacets({ sort: 'weight-asc' })).query).toContain('order(weightGrams asc)');
    expect(productListQuery(parseFacets({})).query).toContain('order(featured desc');
  });
});

// The adapter that consumes these projections cannot be integration-tested
// without a live Sanity project. This is the next best thing: derive the
// field list straight from the Zod schema the response must parse through,
// and confirm every field the parser requires is actually being asked for.
// A forgotten field here is a parse error the moment real credentials land.
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
