import { describe, expect, it } from 'vitest';
import {
  annotationSchema,
  imageRefSchema,
  journalPostSchema,
  productCardSchema,
  productSchema,
  stockState,
  variantSchema,
} from '@/lib/content/schema';

describe('stockState', () => {
  it('classifies the three states the size grid must show', () => {
    expect(stockState(0)).toBe('out');
    expect(stockState(1)).toBe('low');
    expect(stockState(2)).toBe('low');
    expect(stockState(3)).toBe('in');
    expect(stockState(40)).toBe('in');
  });
});

describe('annotationSchema', () => {
  it('accepts normalised coordinates', () => {
    expect(annotationSchema.safeParse({ label: 'HEEL DROP', value: '6 MM', x: 0.32, y: 0.8 }).success).toBe(true);
  });

  it('rejects coordinates outside 0-1, which would draw leader lines off the image', () => {
    expect(annotationSchema.safeParse({ label: 'X', value: 'Y', x: 1.4, y: 0.5 }).success).toBe(false);
    expect(annotationSchema.safeParse({ label: 'X', value: 'Y', x: -0.1, y: 0.5 }).success).toBe(false);
  });
});

describe('variantSchema', () => {
  it('rejects negative stock', () => {
    expect(variantSchema.safeParse({ size: 43, stock: -1 }).success).toBe(false);
  });
});

const image = { url: '/x.webp', lqip: null, width: 10, height: 10, alt: 'x' };

/** A minimal product that parses, so a test can remove exactly one thing. */
const validProduct = {
  id: 'p1',
  sku: 'LF-D04-OXB',
  lot: '26.07',
  title: 'Grain Derby 04',
  slug: 'grain-derby-04',
  price: 465,
  currency: 'USD',
  colour: 'Oxblood',
  material: 'Horsehide',
  upperMm: 1.6,
  lastShape: 'LF-07',
  dropMm: 6,
  weightGrams: 612,
  collectionSlug: 'derbies',
  collectionTitle: 'Derbies',
  images: [image],
  description: [{ _type: 'block' }],
  variants: [{ size: 43, stock: 6 }],
  annotations: [],
  materials: [],
  construction: [],
  featured: true,
};

describe('productSchema', () => {
  it('accepts the minimal valid product', () => {
    expect(productSchema.safeParse(validProduct).success).toBe(true);
  });

  // Isolated on purpose: asserting failure on a near-empty object proves nothing,
  // because nineteen other required fields fail first and the images rule could
  // be deleted without turning the test red.
  it('rejects a product with no images, which would break the PDP gallery', () => {
    expect(productSchema.safeParse({ ...validProduct, images: [] }).success).toBe(false);
  });

  it('rejects a currency that is not an ISO-4217 code', () => {
    expect(productSchema.safeParse({ ...validProduct, currency: 'usd' }).success).toBe(false);
    expect(productSchema.safeParse({ ...validProduct, currency: 'DOLLAR' }).success).toBe(false);
  });
});

describe('imageRefSchema', () => {
  // Both adapters depend on this: fixtures supply null, Sanity supplies a data URI.
  it('accepts lqip as either null or a string', () => {
    expect(imageRefSchema.safeParse(image).success).toBe(true);
    expect(imageRefSchema.safeParse({ ...image, lqip: 'data:image/png;base64,AA' }).success).toBe(true);
  });

  it('rejects a missing lqip key, which would hide an adapter bug', () => {
    const { lqip, ...withoutLqip } = image;
    void lqip;
    expect(imageRefSchema.safeParse(withoutLqip).success).toBe(false);
  });
});

describe('portable text', () => {
  // The predicate keys on _type; a typo like 'type' would silently accept anything.
  it('accepts a block and rejects a non-object', () => {
    expect(productSchema.safeParse({ ...validProduct, description: [{ _type: 'block' }] }).success).toBe(true);
    expect(productSchema.safeParse({ ...validProduct, description: ['not a block'] }).success).toBe(false);
    expect(productSchema.safeParse({ ...validProduct, description: [{ noType: true }] }).success).toBe(false);
  });
});

describe('productCardSchema', () => {
  // Projected from productSchema, so this proves the projection stays welded.
  it('accepts a card built from a valid product', () => {
    const { images, ...rest } = validProduct;
    expect(productCardSchema.safeParse({ ...rest, image: images[0] }).success).toBe(true);
  });

  it('inherits productSchema currency rule', () => {
    const { images, ...rest } = validProduct;
    expect(productCardSchema.safeParse({ ...rest, image: images[0], currency: 'usd' }).success).toBe(false);
  });
});

describe('journalPostSchema', () => {
  const post = {
    id: 'j1',
    title: 'A last is not a shoe',
    slug: 'a-last-is-not-a-shoe',
    excerpt: 'Eleven shapes.',
    coverImage: image,
    publishedAt: '2026-07-20T00:00:00.000Z',
    body: [{ _type: 'block' }],
  };

  it('accepts an ISO timestamp', () => {
    expect(journalPostSchema.safeParse(post).success).toBe(true);
  });

  it('rejects a date that is merely a non-empty string', () => {
    expect(journalPostSchema.safeParse({ ...post, publishedAt: 'next week' }).success).toBe(false);
  });
});
