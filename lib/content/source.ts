import type { ProductQuery } from '@/lib/facets';
import {
  productCardSchema,
  type Collection,
  type CollectionCard,
  type JournalPost,
  type Product,
  type ProductCard,
  type SiteSettings,
  type Variant,
} from './schema';

/** The filter options a PLP offers. Always derived from the whole collection,
 *  never from the filtered result — otherwise selecting a facet removes the
 *  controls needed to unselect it. */
export interface AvailableFacets {
  readonly sizes: readonly number[];
  readonly colours: readonly string[];
  readonly materials: readonly string[];
}

export interface ProductListResult {
  readonly items: readonly ProductCard[];
  /** Count after filtering — what the "N results" readout shows. */
  readonly total: number;
  readonly facets: AvailableFacets;
}

/**
 * Recommendations plus the reason they were chosen. Two products in the
 * catalogue are the only ones on their last, so a strip that could only ever
 * mean "same last" would render empty for them. The basis lets the PDP state
 * the claim it can actually support instead of asserting a shared last that
 * some of these products do not have.
 */
export interface RelatedProducts {
  readonly items: readonly ProductCard[];
  readonly basis: 'last' | 'collection';
}

/**
 * The single boundary every route reads content through. Two adapters implement
 * it — local fixtures and Sanity via GROQ — and both parse their output through
 * the same Zod schemas, which is what stops the two sources from drifting.
 *
 * Every lookup returns null or an empty collection for missing content rather
 * than throwing, so an empty or misconfigured CMS renders empty states instead
 * of a 500.
 */
export interface ContentSource {
  listCollections(): Promise<CollectionCard[]>;
  getCollection(slug: string): Promise<Collection | null>;
  getCollectionSlugs(): Promise<string[]>;

  listProducts(query: ProductQuery): Promise<ProductListResult>;
  getProduct(slug: string): Promise<Product | null>;
  getProductSlugs(): Promise<string[]>;
  getFeaturedProduct(): Promise<Product | null>;
  listRelated(product: Product, limit: number): Promise<RelatedProducts>;

  /** Read separately from the product so it can be fetched uncached. */
  getStock(slug: string): Promise<Variant[]>;

  listJournalPosts(): Promise<JournalPost[]>;
  getJournalPost(slug: string): Promise<JournalPost | null>;
  getJournalSlugs(): Promise<string[]>;

  getSiteSettings(): Promise<SiteSettings>;
  searchProducts(term: string): Promise<ProductCard[]>;
}

/** Projects a full product down to its grid card. Parsing rather than spreading
 *  strips the fields a card must not carry and returns a copy, so a caller
 *  cannot reach back into the source data. */
export function toProductCard(product: Product): ProductCard {
  const [image] = product.images;
  if (!image) throw new Error(`Product ${product.slug} has no images`);
  return productCardSchema.parse({ ...product, image });
}

export function facetsFrom(cards: readonly ProductCard[]): AvailableFacets {
  const sizes = new Set<number>();
  for (const card of cards) {
    for (const variant of card.variants) sizes.add(variant.size);
  }
  return {
    sizes: [...sizes].sort((a, b) => a - b),
    colours: [...new Set(cards.map((c) => c.colour))].sort(),
    materials: [...new Set(cards.map((c) => c.material))].sort(),
  };
}
