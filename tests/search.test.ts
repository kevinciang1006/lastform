import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRODUCT_SEARCH_QUERY, graphqlEndpoint, searchProducts } from '@/lib/content/search';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function configured(): void {
  vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'abc123');
  vi.stubEnv('NEXT_PUBLIC_SANITY_DATASET', 'production');
}

/** One GraphQL hit shaped as the Sanity GraphQL API returns it. */
const hit = {
  _id: 'product-grain-derby-04',
  sku: 'LF-D04-OXB',
  title: 'Grain Derby 04',
  slug: { current: 'grain-derby-04' },
  price: 465,
  currency: 'USD',
  colour: 'Oxblood',
  material: 'Horsehide',
  lastShape: 'LF-07',
  dropMm: 6,
  weightGrams: 612,
  featured: true,
  variants: [{ size: 43, stock: 6 }],
  images: [
    {
      alt: 'Grain Derby 04, lateral elevation',
      asset: {
        url: 'https://cdn.sanity.io/images/abc123/production/x.webp',
        metadata: { lqip: 'data:image/png;base64,AA', dimensions: { width: 2000, height: 2600 } },
      },
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('graphqlEndpoint', () => {
  it('builds the documented Sanity GraphQL URL', () => {
    configured();
    expect(graphqlEndpoint()).toBe('https://abc123.api.sanity.io/v2023-08-01/graphql/production/default');
  });

  it('throws rather than building a nonsense URL when the project is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', '');
    expect(() => graphqlEndpoint()).toThrow();
  });
});

describe('PRODUCT_SEARCH_QUERY', () => {
  it('parameterises the term instead of interpolating it', () => {
    expect(PRODUCT_SEARCH_QUERY).toContain('$term');
    expect(PRODUCT_SEARCH_QUERY).toContain('allProduct');
  });

  it('selects every field a ProductCard needs', () => {
    for (const field of [
      '_id',
      'sku',
      'title',
      'slug',
      'price',
      'currency',
      'colour',
      'material',
      'lastShape',
      'dropMm',
      'weightGrams',
      'featured',
      'variants',
      'images',
      'lqip',
    ]) {
      expect(PRODUCT_SEARCH_QUERY, field).toContain(field);
    }
  });
});

describe('searchProducts', () => {
  it('returns an empty array for a blank term without calling the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await searchProducts('  ')).toEqual([]);
    expect(await searchProducts('')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to the fixture adapter when Sanity is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const hits = await searchProducts('derby');
    expect(hits.length).toBeGreaterThan(0);
    // The whole point of the fallback: no network in fixture mode.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('requests the GraphQL endpoint uncached when Sanity is configured', async () => {
    configured();
    const fetchSpy = vi.fn<typeof fetch>(async () => jsonResponse({ data: { allProduct: [] } }));
    vi.stubGlobal('fetch', fetchSpy);

    await searchProducts('derby');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const call = fetchSpy.mock.calls[0];
    expect(call).toBeDefined();
    const [url, request] = call ?? [];
    expect(String(url)).toBe(graphqlEndpoint());
    if (!request) throw new Error('fetch called without init');
    // Output is a pure function of user input; caching it would serve one
    // visitor another visitor's results.
    expect(request.cache).toBe('no-store');
    expect(request.method).toBe('POST');
    expect(JSON.parse(String(request.body))).toMatchObject({ variables: { term: '*derby*' } });
  });

  it('maps a GraphQL hit onto a ProductCard, taking the first image', async () => {
    configured();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: { allProduct: [hit] } })));

    const [card] = await searchProducts('derby');

    expect(card?.slug).toBe('grain-derby-04');
    expect(card?.id).toBe('product-grain-derby-04');
    expect(card?.image.url).toBe('https://cdn.sanity.io/images/abc123/production/x.webp');
    expect(card?.image.lqip).toBe('data:image/png;base64,AA');
    expect(card?.image.width).toBe(2000);
    expect(card?.image.alt).toBe('Grain Derby 04, lateral elevation');
  });

  it('wraps the term so a partial word matches, since users do not type wildcards', async () => {
    configured();
    const fetchSpy = vi.fn<typeof fetch>(async () => jsonResponse({ data: { allProduct: [] } }));
    vi.stubGlobal('fetch', fetchSpy);

    await searchProducts('derb');

    const request = fetchSpy.mock.calls[0]?.[1];
    if (!request) throw new Error('fetch called without init');
    const body = JSON.parse(String(request.body)) as { variables: { term: string } };
    expect(body.variables.term).toContain('derb');
    expect(body.variables.term).toMatch(/\*/);
  });

  it('returns an empty array when GraphQL reports errors rather than throwing into the page', async () => {
    configured();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ errors: [{ message: 'boom' }] })));
    expect(await searchProducts('derby')).toEqual([]);
  });

  it('returns an empty array on a non-OK response', async () => {
    configured();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 500)));
    expect(await searchProducts('derby')).toEqual([]);
  });

  it('returns an empty array when the transport throws', async () => {
    configured();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect(await searchProducts('derby')).toEqual([]);
  });

  // A single malformed record must not take the whole result set down with it.
  it('drops a hit that does not satisfy the schema and keeps the rest', async () => {
    configured();
    const broken = { ...hit, _id: 'product-broken', slug: { current: 'broken' }, price: -1 };
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: { allProduct: [broken, hit] } })));

    const cards = await searchProducts('derby');

    expect(cards).toHaveLength(1);
    expect(cards[0]?.slug).toBe('grain-derby-04');
  });

  it('drops a hit with no images rather than inventing one', async () => {
    configured();
    const imageless = { ...hit, _id: 'product-imageless', slug: { current: 'imageless' }, images: [] };
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: { allProduct: [imageless] } })));
    expect(await searchProducts('derby')).toEqual([]);
  });
});
