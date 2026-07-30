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

/** Pinned separately from the GROQ apiVersion: Sanity versions its GraphQL
 *  endpoint on its own schedule, and this is the version the deployed schema
 *  is generated against by `pnpm sanity graphql deploy`. */
const GRAPHQL_API_VERSION = 'v2023-08-01';

export function graphqlEndpoint(): string {
  const projectId = process.env['NEXT_PUBLIC_SANITY_PROJECT_ID'];
  const dataset = process.env['NEXT_PUBLIC_SANITY_DATASET'] ?? 'production';
  if (!projectId) {
    throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is required to build the GraphQL endpoint');
  }
  return `https://${projectId}.api.sanity.io/${GRAPHQL_API_VERSION}/graphql/${dataset}/default`;
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

  let payload: GraphQlResponse;
  try {
    const response = await fetch(graphqlEndpoint(), {
      method: 'POST',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: PRODUCT_SEARCH_QUERY,
        variables: { term: `*${needle}*` },
      }),
    });
    if (!response.ok) return [];
    payload = (await response.json()) as GraphQlResponse;
  } catch {
    // A CMS outage degrades to an empty result set rather than a 500 on a
    // route whose only job is answering a query.
    return [];
  }

  if (payload.errors && payload.errors.length > 0) return [];

  return (payload.data?.allProduct ?? [])
    .map(toCard)
    .filter((card): card is ProductCard => card !== null);
}
