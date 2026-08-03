import { fixtureSource } from '@/lib/content/fixtures/adapter';
import { productCardSchema, type ProductCard } from '@/lib/content/schema';

/**
 * The one place this project speaks GraphQL. Everything else reads through GROQ
 * (see lib/content/sanity/queries.ts) — this route exists to exercise the other
 * query model deliberately, and the difference is worth stating out loud:
 *
 * GROQ projections shape the response, so the adapter gets exactly the keys its
 * Zod schema wants. GraphQL returns the document's own field names, so the
 * mapping to `ProductCard` happens here in TypeScript instead.
 *
 * Nothing here is cached. The result is a pure function of user input, so a
 * cache entry would either never be hit or would serve one visitor another
 * visitor's results.
 */

/**
 * Raised when the GraphQL endpoint cannot answer. Distinct from "no products
 * matched" on purpose: the search page renders the two differently, and
 * conflating them is what let a broken endpoint look like an empty catalogue.
 */
export class SearchUnavailableError extends Error {
  override readonly name = 'SearchUnavailableError';
}

/**
 * The full GraphQL endpoint, read from its own variable rather than assembled
 * from the GROQ `apiVersion`.
 *
 * The version segment in this URL is not the GROQ API version. Sanity stamps it
 * when `sanity graphql deploy` runs and it moves on Sanity's schedule, not the
 * application's — deriving one from the other couples two independent values
 * that merely look alike, and guessing the segment yields a 404. Copy it
 * verbatim from `sanity graphql list`.
 *
 * Server-only: /search is SSR, so this never reaches the client and carries no
 * NEXT_PUBLIC_ prefix.
 */
export function graphqlEndpoint(): string {
  const url = process.env['SANITY_GRAPHQL_URL'];
  if (!url) {
    throw new Error(
      'SANITY_GRAPHQL_URL is required for /search. Copy the URL from `sanity graphql list` — ' +
        'its version segment is set by Sanity at deploy time and cannot be derived from NEXT_PUBLIC_SANITY_API_VERSION.',
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`SANITY_GRAPHQL_URL is not a valid URL: ${url}`);
  }
  if (!/\/graphql\//.test(parsed.pathname)) {
    throw new Error(
      `SANITY_GRAPHQL_URL does not look like a Sanity GraphQL endpoint (expected a /graphql/ path segment): ${url}`,
    );
  }
  return url;
}

/**
 * `matches` is Sanity's pattern operator, so the term is wrapped in wildcards
 * before it is sent — a visitor typing "derb" expects to find the derbies.
 *
 * Known, unverified divergence: this maps to GROQ's `match`, which is
 * token-oriented, while the fixture fallback below uses a plain substring
 * `includes`. They agree on whole words and word prefixes and may disagree on a
 * fragment starting mid-token ("erby"). Confirming that needs a live dataset,
 * so it is recorded here rather than guessed at.
 */
export const PRODUCT_SEARCH_QUERY = `
query ProductSearch($term: String!) {
  allProduct(where: { title: { matches: $term } }) {
    _id
    sku
    title
    slug { current }
    price
    currency
    colour
    material
    lastShape
    dropMm
    weightGrams
    featured
    variants { size stock }
    images {
      alt
      asset {
        url
        metadata {
          lqip
          dimensions { width height }
        }
      }
    }
  }
}`;

interface GraphQlImage {
  readonly alt?: string | null;
  readonly asset?: {
    readonly url?: string | null;
    readonly metadata?: {
      readonly lqip?: string | null;
      readonly dimensions?: { readonly width?: number | null; readonly height?: number | null } | null;
    } | null;
  } | null;
}

interface GraphQlProduct {
  readonly _id?: string | null;
  readonly slug?: { readonly current?: string | null } | null;
  readonly images?: readonly GraphQlImage[] | null;
  readonly [key: string]: unknown;
}

interface GraphQlResponse {
  readonly data?: { readonly allProduct?: readonly GraphQlProduct[] | null } | null;
  readonly errors?: readonly { readonly message?: string }[] | null;
}

/** GraphQL hands back the document's own field names, so the projection into a
 *  ProductCard happens here rather than in the query. Returns null for anything
 *  that cannot be made valid, so one bad record cannot empty the whole page. */
function toCard(raw: GraphQlProduct): ProductCard | null {
  const [image] = raw.images ?? [];
  if (!image) return null;
  const dimensions = image.asset?.metadata?.dimensions;
  const candidate = {
    ...raw,
    id: raw._id,
    slug: raw.slug?.current,
    image: {
      url: image.asset?.url ?? '',
      lqip: image.asset?.metadata?.lqip ?? null,
      width: dimensions?.width ?? 0,
      height: dimensions?.height ?? 0,
      alt: image.alt ?? '',
    },
  };
  const parsed = productCardSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export async function searchProducts(term: string): Promise<ProductCard[]> {
  const needle = term.trim();
  // No query yet is a distinct state from no results; the page renders it
  // differently, and there is nothing to ask the network.
  if (needle === '') return [];

  if (!process.env['NEXT_PUBLIC_SANITY_PROJECT_ID']) {
    return fixtureSource().searchProducts(needle);
  }

  const endpoint = graphqlEndpoint();

  // Every failure below throws rather than returning []. An empty array is a
  // real answer — "nothing matched" — and returning it for a 404, an outage or
  // a schema mismatch makes a broken endpoint indistinguishable from a search
  // that genuinely found nothing. That is precisely how a query against an
  // undeployed API version survived a deploy and a manual check unnoticed.
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: PRODUCT_SEARCH_QUERY,
        variables: { term: `*${needle}*` },
      }),
    });
  } catch (cause) {
    console.error(`[search] request to ${endpoint} failed`, cause);
    throw new SearchUnavailableError(`Search request to ${endpoint} failed`, { cause });
  }

  if (!response.ok) {
    console.error(`[search] ${endpoint} responded ${response.status} ${response.statusText}`);
    throw new SearchUnavailableError(`Search endpoint returned ${response.status} for ${endpoint}`);
  }

  const payload = (await response.json()) as GraphQlResponse;

  // A GraphQL error arrives inside a 200: a field the deployed schema does not
  // expose is reported here, not in the status code. Skipping this check is
  // what turned `Cannot query field "alt" on type "Image"` into zero results.
  if (payload.errors && payload.errors.length > 0) {
    const detail = payload.errors.map((e) => e.message ?? 'unknown error').join('; ');
    console.error(`[search] ${endpoint} returned GraphQL errors: ${detail}`);
    throw new SearchUnavailableError(`Search query rejected by the schema: ${detail}`);
  }

  return (payload.data?.allProduct ?? [])
    .map(toCard)
    .filter((card): card is ProductCard => card !== null);
}
