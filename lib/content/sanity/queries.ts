import type { PortableTextBlock } from '@portabletext/types';
import { groq } from 'next-sanity';
import type { ProductQuery, SortKey } from '@/lib/facets';
import type { Annotation, SpecRow, Variant } from '@/lib/content/schema';
import type { RawImage } from './image';

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

/** The pre-parse shape PRODUCT_PROJECTION produces, one field per key
 *  productSchema requires. Kept next to the projection so the two are edited
 *  together; `tests/groq.test.ts` also checks the projection text directly
 *  against productSchema's own key list, which is the real guard against
 *  the two drifting apart. */
export interface RawProduct {
  readonly id: string;
  readonly sku: string;
  readonly lot: string;
  readonly title: string;
  readonly slug: string;
  readonly price: number;
  readonly currency: string;
  readonly colour: string;
  readonly material: string;
  readonly upperMm: number;
  readonly lastShape: string;
  readonly dropMm: number;
  readonly weightGrams: number;
  readonly collectionSlug: string;
  readonly collectionTitle: string;
  readonly images: readonly RawImage[];
  readonly description: readonly PortableTextBlock[];
  readonly variants: readonly Variant[];
  readonly annotations: readonly Annotation[];
  readonly materials: readonly SpecRow[];
  readonly construction: readonly SpecRow[];
  readonly featured: boolean;
}

export const PRODUCT_PROJECTION = groq`{
  "id": _id,
  sku,
  lot,
  title,
  "slug": slug.current,
  price,
  currency,
  colour,
  material,
  upperMm,
  lastShape,
  dropMm,
  weightGrams,
  "collectionSlug": collection->slug.current,
  "collectionTitle": collection->title,
  "images": images[]{
    alt,
    "asset": asset->{ url, metadata { lqip, dimensions { width, height } } }
  },
  description,
  variants[]{ size, stock },
  annotations[]{ label, value, x, y },
  materials[]{ label, value },
  construction[]{ label, value },
  featured
}`;

export const PRODUCT_BY_SLUG_QUERY = groq`*[_type == "product" && slug.current == $slug][0] ${PRODUCT_PROJECTION}`;
export const FEATURED_PRODUCT_QUERY = groq`*[_type == "product" && featured == true][0] ${PRODUCT_PROJECTION}`;
export const ALL_PRODUCTS_QUERY = groq`*[_type == "product"] ${PRODUCT_PROJECTION}`;
export const PRODUCT_SLUGS_QUERY = groq`*[_type == "product"]{ "slug": slug.current }`;
export const PRODUCT_STOCK_QUERY = groq`*[_type == "product" && slug.current == $slug][0].variants[]{ size, stock }`;

// ---------------------------------------------------------------------------
// Product card (PLP / search — a lighter fetch than the full product)
// ---------------------------------------------------------------------------

export interface RawProductCard {
  readonly id: string;
  readonly sku: string;
  readonly title: string;
  readonly slug: string;
  readonly price: number;
  readonly currency: string;
  readonly colour: string;
  readonly material: string;
  readonly lastShape: string;
  readonly dropMm: number;
  readonly weightGrams: number;
  readonly featured: boolean;
  readonly variants: readonly Variant[];
  readonly image: RawImage | null;
}

export const PRODUCT_CARD_PROJECTION = groq`{
  "id": _id,
  sku,
  title,
  "slug": slug.current,
  price,
  currency,
  colour,
  material,
  lastShape,
  dropMm,
  weightGrams,
  featured,
  variants[]{ size, stock },
  "image": images[0]{
    alt,
    "asset": asset->{ url, metadata { lqip, dimensions { width, height } } }
  }
}`;

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export interface RawCollection {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly blurb: string;
  readonly heroImage: RawImage;
  readonly sortOrder: number;
}

export const COLLECTION_PROJECTION = groq`{
  "id": _id,
  title,
  "slug": slug.current,
  blurb,
  "heroImage": heroImage{
    alt,
    "asset": asset->{ url, metadata { lqip, dimensions { width, height } } }
  },
  sortOrder
}`;

export const COLLECTION_BY_SLUG_QUERY = groq`*[_type == "collection" && slug.current == $slug][0] ${COLLECTION_PROJECTION}`;
export const COLLECTIONS_QUERY = groq`*[_type == "collection"] | order(sortOrder asc) ${COLLECTION_PROJECTION}`;
export const COLLECTION_SLUGS_QUERY = groq`*[_type == "collection"] | order(sortOrder asc){ "slug": slug.current }`;

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export interface RawJournalPost {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly excerpt: string;
  readonly coverImage: RawImage;
  readonly publishedAt: string;
  readonly body: readonly PortableTextBlock[];
}

export const JOURNAL_PROJECTION = groq`{
  "id": _id,
  title,
  "slug": slug.current,
  excerpt,
  "coverImage": coverImage{
    alt,
    "asset": asset->{ url, metadata { lqip, dimensions { width, height } } }
  },
  publishedAt,
  body
}`;

export const JOURNAL_BY_SLUG_QUERY = groq`*[_type == "journalPost" && slug.current == $slug][0] ${JOURNAL_PROJECTION}`;
export const JOURNAL_LIST_QUERY = groq`*[_type == "journalPost"] | order(publishedAt desc) ${JOURNAL_PROJECTION}`;
export const JOURNAL_SLUGS_QUERY = groq`*[_type == "journalPost"]{ "slug": slug.current }`;

// ---------------------------------------------------------------------------
// Site settings (singleton)
// ---------------------------------------------------------------------------

export interface RawSiteSettings {
  readonly announcements: readonly string[];
  readonly footerColumns: readonly {
    readonly title: string;
    readonly links: readonly { readonly label: string; readonly href: string }[];
  }[];
  // A dangling reference dereferences to null rather than being silently
  // dropped, so a broken featured-collection reference fails the schema
  // parse loudly instead of quietly shrinking the list.
  readonly featuredCollectionSlugs: readonly (string | null)[];
}

export const SITE_SETTINGS_PROJECTION = groq`{
  "announcements": announcementBar,
  "footerColumns": footerColumns[]{
    title,
    "links": links[]{ label, href }
  },
  "featuredCollectionSlugs": featuredCollections[]->slug.current
}`;

export const SITE_SETTINGS_QUERY = groq`*[_type == "siteSettings"][0] ${SITE_SETTINGS_PROJECTION}`;

// ---------------------------------------------------------------------------
// Product list query builder — the one piece under direct unit test, since
// it is pure and needs no live project to verify.
// ---------------------------------------------------------------------------

/** Every clause here mirrors a check in lib/facets.ts's applyFacets, so the
 *  Sanity-side filtered result matches what the fixture adapter would compute
 *  by filtering the same data in JS. */
function filterClause(query: ProductQuery, params: Record<string, unknown>): string {
  const clauses = ['_type == "product"'];

  if (query.collection !== undefined) {
    clauses.push('collection->slug.current == $collection');
    params.collection = query.collection;
  }

  if (query.sizes.length > 0) {
    // A size only "counts" as available when it is actually in stock —
    // the same rule applyFacets' hasSize() applies to fixture data.
    clauses.push('count(variants[stock > 0 && size in $sizes]) > 0');
    params.sizes = query.sizes;
  }

  if (query.priceBand) {
    clauses.push('price >= $minPrice');
    params.minPrice = query.priceBand.min;
    if (query.priceBand.max !== null) {
      clauses.push('price <= $maxPrice');
      params.maxPrice = query.priceBand.max;
    }
  }

  if (query.colours.length > 0) {
    // Case-insensitive for the same reason applyFacets' matchesAny is: these
    // values live in the URL and are meant to be hand-edited.
    clauses.push('lower(colour) in $colours');
    params.colours = query.colours.map((colour) => colour.toLowerCase());
  }

  if (query.materials.length > 0) {
    clauses.push('lower(material) in $materials');
    params.materials = query.materials.map((material) => material.toLowerCase());
  }

  return clauses.join(' && ');
}

function orderClause(sort: SortKey): string {
  switch (sort) {
    case 'price-asc':
      return 'price asc';
    case 'price-desc':
      return 'price desc';
    case 'weight-asc':
      return 'weightGrams asc';
    case 'featured':
      // The same final tie-break byTitle() applies in applyFacets, so two
      // featured products never swap order between requests.
      return 'featured desc, title asc';
  }
}

export function productListQuery(query: ProductQuery): { query: string; params: Record<string, unknown> } {
  const params: Record<string, unknown> = {};
  const filter = filterClause(query, params);
  return {
    query: groq`*[${filter}] | order(${orderClause(query.sort)}) ${PRODUCT_CARD_PROJECTION}`,
    params,
  };
}
