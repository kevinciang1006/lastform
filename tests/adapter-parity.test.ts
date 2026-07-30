import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRODUCTS, COLLECTIONS } from '@/lib/content/fixtures/data';
import type { Collection, ImageRef, Product, ProductCard } from '@/lib/content/schema';
import { fixtureSource } from '@/lib/content/fixtures/adapter';
import { sanitySource } from '@/lib/content/sanity/adapter';
import { ALL_PRODUCTS_QUERY, COLLECTIONS_QUERY, SITE_SETTINGS_QUERY, productListQuery } from '@/lib/content/sanity/queries';
import type { RawCollection, RawProduct, RawProductCard } from '@/lib/content/sanity/queries';
import type { RawImage } from '@/lib/content/sanity/image';

// Mocking the Sanity *client* rather than the adapter means sanitySource()
// runs its real code — real productFromRaw/cardFromRaw transforms, real
// productSchema/productCardSchema parses, real toProductCard/facetsFrom
// calls — against data shaped like a real GROQ response. That's what makes
// this test able to catch a divergence between the two adapters instead of
// just re-asserting what each one already claims to do. vi.mock is hoisted
// above every import in this file, so sanitySource (imported normally above)
// still picks up the mocked client transitively through adapter.ts/image.ts.
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock('@/lib/content/sanity/client', () => ({
  sanityClient: () => ({ fetch: fetchMock }),
}));

/**
 * "low-profile" is the one collection where both its last shapes (LF-11,
 * LF-13) are used nowhere else in the 24-product catalogue. That closure is
 * what makes mirroring just this collection valid: sanitySource(), seeing
 * only these 6 raw rows, computes the exact same same-last and same-
 * collection candidate pools fixtureSource() computes from the real,
 * unfiltered 24-product PRODUCTS array. A subset missing that property (e.g.
 * one of monk-18's LF-08 siblings live in "derbies") would make the two
 * adapters disagree for reasons that have nothing to do with adapter bugs.
 */
const LOW_PROFILE_SLUGS: readonly string[] = [
  'low-trainer-09',
  'court-10',
  'runner-13',
  'deck-15',
  'slip-on-16',
  'trail-low-17',
];

// A relative fixture path (e.g. "/fixtures/x.webp") isn't a real Sanity CDN
// URL and @sanity/image-url's builder throws trying to parse one — it
// expects the asset id/dimensions/format encoded in the URL's last path
// segment, the way a real "https://cdn.sanity.io/images/.../<id>-<w>x<h>.<ext>"
// URL does. This fabricates one in that shape so imageRefFrom's real code
// path runs end to end instead of being bypassed.
function fakeSanityImageUrl(assetId: string, width: number, height: number): string {
  return `https://cdn.sanity.io/images/test-project/production/${assetId}-${width}x${height}.webp`;
}

function toRawImage(image: ImageRef, assetId: string): RawImage {
  return {
    alt: image.alt,
    asset: {
      url: fakeSanityImageUrl(assetId, image.width, image.height),
      metadata: { lqip: image.lqip, dimensions: { width: image.width, height: image.height } },
    },
  };
}

interface OptionalFieldOverrides {
  readonly annotations?: Product['annotations'];
  readonly materials?: Product['materials'];
  readonly construction?: Product['construction'];
  readonly description?: Product['description'];
}

function toRawProduct(product: Product, overrides: OptionalFieldOverrides = {}): RawProduct {
  return {
    ...product,
    images: product.images.map((image, i) => toRawImage(image, `${product.slug.replace(/-/g, '')}${i}`)),
    annotations: overrides.annotations ?? product.annotations,
    materials: overrides.materials ?? product.materials,
    construction: overrides.construction ?? product.construction,
    description: overrides.description ?? product.description,
  };
}

function toRawCard(product: Product): RawProductCard {
  const [image] = product.images;
  if (!image) throw new Error(`fixture product ${product.slug} has no images`);
  return {
    id: product.id,
    sku: product.sku,
    title: product.title,
    slug: product.slug,
    price: product.price,
    currency: product.currency,
    colour: product.colour,
    material: product.material,
    lastShape: product.lastShape,
    dropMm: product.dropMm,
    weightGrams: product.weightGrams,
    featured: product.featured,
    variants: product.variants,
    image: toRawImage(image, `${product.slug.replace(/-/g, '')}0`),
  };
}

function toRawCollection(collection: Collection): RawCollection {
  return { ...collection, heroImage: toRawImage(collection.heroImage, `${collection.slug.replace(/-/g, '')}hero`) };
}

function findProduct(slug: string): Product {
  const product = PRODUCTS.find((p) => p.slug === slug);
  if (!product) throw new Error(`fixture missing product ${slug}`);
  return product;
}

// Every field except `image`: the two adapters build image URLs through
// entirely different mechanisms (a static fixture path vs. an
// @sanity/image-url builder) and are never meant to produce the same
// string, only each their own valid one. Everything else — price, stock,
// which product this is — must match exactly.
function withoutImage(card: ProductCard) {
  return {
    id: card.id,
    sku: card.sku,
    title: card.title,
    slug: card.slug,
    price: card.price,
    currency: card.currency,
    colour: card.colour,
    material: card.material,
    lastShape: card.lastShape,
    dropMm: card.dropMm,
    weightGrams: card.weightGrams,
    featured: card.featured,
    variants: card.variants,
  };
}

const lowProfileProducts = [...PRODUCTS]
  .filter((p) => LOW_PROFILE_SLUGS.includes(p.slug))
  .sort((a, b) => a.title.localeCompare(b.title)); // matches ALL_PRODUCTS_QUERY's order(title asc)

const lowProfileCollection = COLLECTIONS.find((c) => c.slug === 'low-profile');
if (!lowProfileCollection) throw new Error('fixture missing low-profile collection');

// trail-low-17 stands in for a normal, only-partly-filled-in CMS entry: no
// annotation callouts, no spec rows, no description yet. None of those
// fields reach ProductCard, so this shouldn't change what either adapter
// returns for it — proving the empty-array path (lib/content/sanity/queries.ts's
// coalesce(field[], [])) doesn't break the pipeline it feeds into. This
// mocks the *result* of that coalesce (a real [], not null) since fetch() is
// mocked directly and never runs the actual GROQ; the query text itself is
// checked separately in tests/groq.test.ts.
const rawProducts: RawProduct[] = lowProfileProducts.map((p) =>
  toRawProduct(p, p.slug === 'trail-low-17' ? { annotations: [], materials: [], construction: [], description: [] } : {}),
);
const rawCards: RawProductCard[] = lowProfileProducts.map(toRawCard);
const rawCollections: RawCollection[] = [toRawCollection(lowProfileCollection)];

const searchQuery = productListQuery({
  sizes: [],
  colours: [],
  materials: [],
  priceBand: null,
  sort: 'featured',
});

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation((query: string) => {
    if (query === ALL_PRODUCTS_QUERY) return Promise.resolve(rawProducts);
    if (query === COLLECTIONS_QUERY) return Promise.resolve(rawCollections);
    if (query === searchQuery.query) return Promise.resolve(rawCards);
    throw new Error(`adapter-parity mock: unexpected query\n${query}`);
  });
});

describe('adapter parity: fixtures vs. Sanity, over the same low-profile subset', () => {
  it('listRelated agrees on basis and product set for an exact same-last match', async () => {
    // court-10 (LF-11) has exactly 2 other LF-11 siblings within low-profile
    // (low-trainer-09, deck-15) — with cap 2 that's a "last" basis with no
    // top-up, the simplest case to compare exactly.
    const focal = findProduct('court-10');
    const [fixtureResult, sanityResult] = await Promise.all([
      fixtureSource().listRelated(focal, 2),
      sanitySource().listRelated(focal, 2),
    ]);
    expect(sanityResult.basis).toBe(fixtureResult.basis);
    expect(sanityResult.basis).toBe('last');
    expect(sanityResult.items.map(withoutImage)).toEqual(fixtureResult.items.map(withoutImage));
    expect(sanityResult.items.map((i) => i.slug)).toEqual(['deck-15', 'low-trainer-09']);
  });

  it('listRelated agrees on basis and product set once a top-up is needed, including the empty-fields product', async () => {
    // low-trainer-09 (LF-11) has only 2 same-last siblings; cap 6 forces a
    // top-up from the rest of low-profile, which includes trail-low-17 —
    // the product mocked with empty annotations/materials/construction/description.
    const focal = findProduct('low-trainer-09');
    const [fixtureResult, sanityResult] = await Promise.all([
      fixtureSource().listRelated(focal, 6),
      sanitySource().listRelated(focal, 6),
    ]);
    expect(sanityResult.basis).toBe(fixtureResult.basis);
    expect(sanityResult.basis).toBe('collection');
    expect(sanityResult.items.map(withoutImage)).toEqual(fixtureResult.items.map(withoutImage));
    expect(sanityResult.items.map((i) => i.slug)).toContain('trail-low-17');
    // Confirms the empty-optional-fields product didn't just survive but
    // produced the exact same card as fixtureSource's fully-authored copy —
    // annotations/materials/construction/description never reach ProductCard.
    const sanityTrailLow = sanityResult.items.find((i) => i.slug === 'trail-low-17');
    const fixtureTrailLow = fixtureResult.items.find((i) => i.slug === 'trail-low-17');
    expect(sanityTrailLow && withoutImage(sanityTrailLow)).toEqual(fixtureTrailLow && withoutImage(fixtureTrailLow));
  });

  it('listCollections agrees on the derived modelCount and avgDropMm', async () => {
    const [fixtureResult, sanityResult] = await Promise.all([
      fixtureSource().listCollections(),
      sanitySource().listCollections(),
    ]);
    const fixtureLowProfile = fixtureResult.find((c) => c.slug === 'low-profile');
    const sanityLowProfile = sanityResult.find((c) => c.slug === 'low-profile');
    if (!fixtureLowProfile || !sanityLowProfile) throw new Error('low-profile missing from one adapter');
    expect(sanityLowProfile.modelCount).toBe(fixtureLowProfile.modelCount);
    expect(sanityLowProfile.modelCount).toBe(6);
    expect(sanityLowProfile.avgDropMm).toBe(fixtureLowProfile.avgDropMm);
  });

  it('searchProducts agrees on result order for a term matching two titles', async () => {
    // "low" matches "Low Trainer 09" and "Trail Low 17" — neither is
    // featured, so this exercises the plain title tie-break both adapters
    // now share (see lib/content/fixtures/adapter.ts and productListQuery's
    // orderClause).
    const [fixtureResult, sanityResult] = await Promise.all([
      fixtureSource().searchProducts('low'),
      sanitySource().searchProducts('low'),
    ]);
    expect(fixtureResult.map((r) => r.slug)).toEqual(['low-trainer-09', 'trail-low-17']);
    expect(sanityResult.map(withoutImage)).toEqual(fixtureResult.map(withoutImage));
  });
});

describe('adapter parity: getSiteSettings falls back to the same defaults fixtures use', () => {
  it('returns the same content as fixtureSource when the singleton is entirely missing', async () => {
    // Overrides the outer beforeEach's low-profile mocks — this test only
    // touches getSiteSettings, so SITE_SETTINGS_QUERY is the only query that
    // needs a handler here.
    fetchMock.mockReset();
    fetchMock.mockImplementation((query: string) => {
      if (query === SITE_SETTINGS_QUERY) return Promise.resolve(null);
      throw new Error(`adapter-parity mock: unexpected query\n${query}`);
    });
    const [fixtureResult, sanityResult] = await Promise.all([
      fixtureSource().getSiteSettings(),
      sanitySource().getSiteSettings(),
    ]);
    // Both are backed by the same DEFAULT_SITE_SETTINGS constant: fixtures
    // always return it, and the Sanity adapter falls back to it when the
    // singleton document doesn't exist yet.
    expect(sanityResult).toEqual(fixtureResult);
  });
});
