import { describe, expect, it } from 'vitest';
import {
  applyFacets,
  facetsToQueryString,
  parseFacets,
  parsePriceBand,
  parseSizes,
  parseSort,
} from '@/lib/facets';
import type { ProductCard } from '@/lib/content/schema';

const card = (over: Partial<ProductCard>): ProductCard => ({
  id: 'x',
  sku: 'X',
  title: 'X',
  slug: 'x',
  price: 400,
  currency: 'USD',
  colour: 'Black',
  material: 'Calf',
  lastShape: 'LF-07',
  dropMm: 6,
  weightGrams: 600,
  featured: false,
  image: { url: '/x.webp', lqip: null, width: 10, height: 10, alt: 'x' },
  variants: [{ size: 42, stock: 4 }],
  ...over,
});

describe('parsePriceBand', () => {
  it('parses a closed band', () => {
    expect(parsePriceBand('200-400')).toEqual({ min: 200, max: 400 });
  });

  it('parses an open-ended band', () => {
    expect(parsePriceBand('600-')).toEqual({ min: 600, max: null });
  });

  it('returns null for absent or malformed input rather than throwing', () => {
    expect(parsePriceBand(undefined)).toBeNull();
    expect(parsePriceBand('cheap')).toBeNull();
    expect(parsePriceBand('400-200')).toBeNull();
    expect(parsePriceBand('-')).toBeNull();
    expect(parsePriceBand('')).toBeNull();
    expect(parsePriceBand('200-400-600')).toBeNull();
  });
});

describe('parseSizes', () => {
  it('accepts a comma list and a repeated param', () => {
    expect(parseSizes('42,43')).toEqual([42, 43]);
    expect(parseSizes(['42', '43'])).toEqual([42, 43]);
  });

  it('accepts half sizes', () => {
    expect(parseSizes('41.5')).toEqual([41.5]);
  });

  it('drops junk and de-duplicates, sorted', () => {
    expect(parseSizes('43,x,42,43')).toEqual([42, 43]);
    expect(parseSizes(undefined)).toEqual([]);
  });

  it('rejects non-positive and non-finite values', () => {
    expect(parseSizes('0,-42,NaN,Infinity')).toEqual([]);
  });
});

describe('parseSort', () => {
  it('defaults to featured for absent or unknown values', () => {
    expect(parseSort(undefined)).toBe('featured');
    expect(parseSort('cheapest')).toBe('featured');
  });

  it('accepts known keys', () => {
    expect(parseSort('price-asc')).toBe('price-asc');
    expect(parseSort('weight-asc')).toBe('weight-asc');
  });
});

describe('parseFacets round-trips through the URL', () => {
  it('survives a parse then serialise cycle', () => {
    const query = parseFacets({ size: '42,43', colour: 'Black', price: '200-400', sort: 'price-asc' });
    const qs = facetsToQueryString(query);
    expect(parseFacets(Object.fromEntries(new URLSearchParams(qs)))).toEqual(query);
  });

  it('omits empty facets so clean URLs stay clean', () => {
    expect(facetsToQueryString(parseFacets({}))).toBe('');
  });

  it('omits the default sort but keeps a non-default one', () => {
    expect(facetsToQueryString(parseFacets({ sort: 'featured' }))).toBe('');
    expect(facetsToQueryString(parseFacets({ sort: 'price-desc' }))).toBe('sort=price-desc');
  });

  it('serialises an open-ended band in a form it can re-parse', () => {
    const query = parseFacets({ price: '600-' });
    expect(facetsToQueryString(query)).toBe('price=600-');
    expect(parseFacets(Object.fromEntries(new URLSearchParams('price=600-')))).toEqual(query);
  });

  it('does not serialise the collection, which is a route segment not a query', () => {
    const query = { ...parseFacets({}), collection: 'boots' };
    expect(facetsToQueryString(query)).toBe('');
  });
});

describe('applyFacets', () => {
  const items = [
    card({ slug: 'a', price: 300, weightGrams: 500, colour: 'Black', variants: [{ size: 42, stock: 4 }] }),
    card({ slug: 'b', price: 500, weightGrams: 800, colour: 'Oxblood', variants: [{ size: 43, stock: 0 }] }),
    card({
      slug: 'c',
      price: 700,
      weightGrams: 400,
      colour: 'Black',
      variants: [{ size: 43, stock: 5 }],
      featured: true,
    }),
  ];

  it('filters by price band inclusively', () => {
    expect(applyFacets(items, parseFacets({ price: '300-500' })).map((i) => i.slug)).toEqual(['a', 'b']);
  });

  it('treats an open-ended band as having no upper bound', () => {
    expect(applyFacets(items, parseFacets({ price: '500-' })).map((i) => i.slug)).toEqual(['c', 'b']);
  });

  it('matches a size only when that size is actually in stock', () => {
    expect(applyFacets(items, parseFacets({ size: '43' })).map((i) => i.slug)).toEqual(['c']);
  });

  it('filters by colour', () => {
    expect(applyFacets(items, parseFacets({ colour: 'Black' })).map((i) => i.slug)).toEqual(['c', 'a']);
  });

  it('filters by material', () => {
    expect(applyFacets(items, parseFacets({ material: 'Calf' })).map((i) => i.slug)).toHaveLength(3);
    expect(applyFacets(items, parseFacets({ material: 'Suede' }))).toEqual([]);
  });

  it('sorts by price and by weight', () => {
    expect(applyFacets(items, parseFacets({ sort: 'price-desc' })).map((i) => i.slug)).toEqual(['c', 'b', 'a']);
    expect(applyFacets(items, parseFacets({ sort: 'price-asc' })).map((i) => i.slug)).toEqual(['a', 'b', 'c']);
    expect(applyFacets(items, parseFacets({ sort: 'weight-asc' })).map((i) => i.slug)).toEqual(['c', 'a', 'b']);
  });

  it('puts featured products first under the default sort', () => {
    expect(applyFacets(items, parseFacets({})).at(0)?.slug).toBe('c');
  });

  it('breaks a featured tie by title so ordering is stable, not incidental', () => {
    const tied = [card({ slug: 'z', title: 'Zulu' }), card({ slug: 'm', title: 'Mike' })];
    expect(applyFacets(tied, parseFacets({})).map((i) => i.slug)).toEqual(['m', 'z']);
  });

  it('combines facets', () => {
    expect(applyFacets(items, parseFacets({ colour: 'Black', price: '600-' })).map((i) => i.slug)).toEqual(['c']);
  });

  it('does not mutate the input array', () => {
    const original = [...items];
    applyFacets(items, parseFacets({ sort: 'price-desc' }));
    expect(items).toEqual(original);
  });

  it('returns everything when no facet is set', () => {
    expect(applyFacets(items, parseFacets({}))).toHaveLength(3);
  });

  // These URLs are meant to be shared and hand-edited, so a lowercased value
  // must not silently return nothing.
  it('matches colour and material case-insensitively', () => {
    expect(applyFacets(items, parseFacets({ colour: 'black' })).map((i) => i.slug)).toEqual(['c', 'a']);
    expect(applyFacets(items, parseFacets({ colour: 'BLACK' })).map((i) => i.slug)).toEqual(['c', 'a']);
    expect(applyFacets(items, parseFacets({ material: 'calf' }))).toHaveLength(3);
  });

  // The catalogue contains two pairs of products that share a price, so a sort
  // without a final tie-break would order them differently between renders.
  it('orders equal-priced products deterministically', () => {
    const tied = [
      card({ slug: 'zulu', title: 'Zulu', price: 540 }),
      card({ slug: 'mike', title: 'Mike', price: 540 }),
      card({ slug: 'alfa', title: 'Alfa', price: 540 }),
    ];
    const ascending = applyFacets(tied, parseFacets({ sort: 'price-asc' })).map((i) => i.slug);
    expect(ascending).toEqual(['alfa', 'mike', 'zulu']);
    // Same input in a different order must produce the same output.
    expect(applyFacets([...tied].reverse(), parseFacets({ sort: 'price-asc' })).map((i) => i.slug)).toEqual(ascending);
  });

  it('orders equal-weight products deterministically', () => {
    const tied = [card({ slug: 'z', title: 'Zulu', weightGrams: 600 }), card({ slug: 'm', title: 'Mike', weightGrams: 600 })];
    expect(applyFacets(tied, parseFacets({ sort: 'weight-asc' })).map((i) => i.slug)).toEqual(['m', 'z']);
  });
});
