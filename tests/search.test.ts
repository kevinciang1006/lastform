import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRODUCT_SEARCH_QUERY, graphqlEndpoint, searchProducts, SearchUnavailableError } from '@/lib/content/search';

const ENDPOINT = 'https://abc123.api.sanity.io/v2025-09-19/graphql/production/default';

beforeEach(() => {
  // Silenced, not removed: every failure path below logs, and the assertions on
  // that logging read the spy rather than the terminal.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function configured(): void {
  vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'abc123');
  vi.stubEnv('NEXT_PUBLIC_SANITY_DATASET', 'production');
  vi.stubEnv('SANITY_GRAPHQL_URL', ENDPOINT);
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
  it('reads the endpoint verbatim from its own variable', () => {
    configured();
    expect(graphqlEndpoint()).toBe(ENDPOINT);
  });

  // The version segment is stamped by Sanity at deploy time and moves on its own
  // schedule. Deriving it from the GROQ apiVersion requests a version that was
  // never deployed, which is a 404 -- and used to be an empty result set.
  it('does not derive the version segment from the GROQ api version', () => {
    configured();
    vi.stubEnv('NEXT_PUBLIC_SANITY_API_VERSION', '2024-10-01');
    expect(graphqlEndpoint()).not.toContain('2024-10-01');
  });

  it('throws naming the variable when it is unset, rather than defaulting', () => {
    vi.stubEnv('SANITY_GRAPHQL_URL', '');
    expect(() => graphqlEndpoint()).toThrow(/SANITY_GRAPHQL_URL/);
  });

  it('rejects a malformed url', () => {
    vi.stubEnv('SANITY_GRAPHQL_URL', 'not-a-url');
    expect(() => graphqlEndpoint()).toThrow(/not a valid URL/);
  });

  it('rejects a url that is not a graphql endpoint', () => {
    vi.stubEnv('SANITY_GRAPHQL_URL', 'https://abc123.api.sanity.io/v2025-09-19/data/query/production');
    expect(() => graphqlEndpoint()).toThrow(/graphql/);
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

  /**
   * These three previously asserted the opposite -- that a failure returns [].
   * That is the bug: an empty array is a real answer ("nothing matched") and the
   * page renders it as "No model by that name", so a 404 from an undeployed API
   * version, an outage, or a query naming a field the deployed schema does not
   * expose all became a confident claim about the catalogue. The endpoint being
   * wrong survived a deploy and a manual check for exactly this reason.
   */
  it('throws when GraphQL reports errors inside a 200, rather than reporting no results', async () => {
    configured();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ errors: [{ message: 'Cannot query field "alt" on type "Image".' }] })),
    );
    await expect(searchProducts('derby')).rejects.toThrow(/Cannot query field "alt"/);
  });

  it('throws on a non-OK response', async () => {
    configured();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 500)));
    await expect(searchProducts('derby')).rejects.toBeInstanceOf(SearchUnavailableError);
  });

  it('throws when the transport fails', async () => {
    configured();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    await expect(searchProducts('derby')).rejects.toBeInstanceOf(SearchUnavailableError);
  });

  it('logs the status and the requested url so the failure is diagnosable', async () => {
    configured();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 503)));
    await expect(searchProducts('derby')).rejects.toBeInstanceOf(SearchUnavailableError);
    const logged = vi.mocked(console.error).mock.calls.flat().join(' ');
    expect(logged).toContain('503');
    expect(logged).toContain(ENDPOINT);
  });

  // The distinction the error states depend on: nothing matched is still [].
  it('still returns an empty array when the query genuinely matched nothing', async () => {
    configured();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: { allProduct: [] } })));
    await expect(searchProducts('nothing-matches-this')).resolves.toEqual([]);
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
