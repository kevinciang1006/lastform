import { applyFacets, type ProductQuery } from '@/lib/facets';
import {
  collectionCardSchema,
  collectionSchema,
  journalPostSchema,
  productSchema,
  siteSettingsSchema,
  variantSchema,
  type CollectionCard,
  type JournalPost,
  type Product,
  type ProductCard,
  type SiteSettings,
  type Variant,
} from '@/lib/content/schema';
import {
  facetsFrom,
  toProductCard,
  type ContentSource,
  type ProductListResult,
  type RelatedProducts,
} from '@/lib/content/source';
import { COLLECTIONS, JOURNAL_POSTS, PRODUCTS, SITE_SETTINGS } from './data';

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function collectionCard(slug: string): CollectionCard | null {
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) return null;
  const members = PRODUCTS.filter((p) => p.collectionSlug === slug);
  const totalDrop = members.reduce((sum, p) => sum + p.dropMm, 0);
  return collectionCardSchema.parse({
    ...collection,
    // Derived, not stored: the design's "6 MODELS — 9 MM DROP AVG" line.
    modelCount: members.length,
    avgDropMm: members.length === 0 ? 0 : oneDecimal(totalDrop / members.length),
  });
}

function cardsIn(collection: string | undefined): ProductCard[] {
  const scope = collection === undefined ? PRODUCTS : PRODUCTS.filter((p) => p.collectionSlug === collection);
  return scope.map(toProductCard);
}

/**
 * Reads the fixture dataset, which is the same content the Sanity seed writes.
 * Every method parses through the shared schemas before returning — including
 * here, where the data is local and already typed, so that a fixture which
 * would break the real parser fails in this suite rather than in production.
 */
export function fixtureSource(): ContentSource {
  return {
    async listCollections(): Promise<CollectionCard[]> {
      return [...COLLECTIONS]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => collectionCard(c.slug))
        .filter((c): c is CollectionCard => c !== null);
    },

    async getCollection(slug) {
      const collection = COLLECTIONS.find((c) => c.slug === slug);
      return collection ? collectionSchema.parse(collection) : null;
    },

    async getCollectionSlugs() {
      return [...COLLECTIONS].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.slug);
    },

    async listProducts(query: ProductQuery): Promise<ProductListResult> {
      const cards = cardsIn(query.collection);
      const items = applyFacets(cards, query);
      return {
        items,
        total: items.length,
        // From the unfiltered collection, so narrowing never removes an option.
        facets: facetsFrom(cards),
      };
    },

    async getProduct(slug) {
      const product = PRODUCTS.find((p) => p.slug === slug);
      return product ? productSchema.parse(product) : null;
    },

    async getProductSlugs() {
      return PRODUCTS.map((p) => p.slug);
    },

    async getFeaturedProduct() {
      const featured = PRODUCTS.find((p) => p.featured);
      return featured ? productSchema.parse(featured) : null;
    },

    async listRelated(product: Product, limit: number): Promise<RelatedProducts> {
      const cap = Math.max(0, limit);
      // Sorted by title before filtering, so both adapters pick the same
      // products in the same order — the Sanity adapter fetches products via
      // a query explicitly ordered the same way, since GROQ makes no
      // ordering guarantee otherwise, and both then `.slice(0, cap)`.
      const byTitle = [...PRODUCTS].sort((a, b) => a.title.localeCompare(b.title));
      // Same last first, because that is the measurement a buyer is comparing.
      const sameLast = byTitle.filter((p) => p.lastShape === product.lastShape && p.slug !== product.slug);
      if (sameLast.length >= cap) {
        return { items: sameLast.slice(0, cap).map(toProductCard), basis: 'last' };
      }

      // Some products are the only ones on their last. Topping up from the
      // collection keeps the strip populated, and downgrading the basis stops
      // the PDP claiming a shared last these additions do not have.
      const taken = new Set(sameLast.map((p) => p.slug));
      const topUp = byTitle.filter(
        (p) => p.collectionSlug === product.collectionSlug && p.slug !== product.slug && !taken.has(p.slug),
      );
      const items = [...sameLast, ...topUp].slice(0, cap).map(toProductCard);
      return { items, basis: sameLast.length === 0 || items.length > sameLast.length ? 'collection' : 'last' };
    },

    async getStock(slug): Promise<Variant[]> {
      const product = PRODUCTS.find((p) => p.slug === slug);
      if (!product) return [];
      return product.variants.map((v) => variantSchema.parse(v));
    },

    async listJournalPosts(): Promise<JournalPost[]> {
      return [...JOURNAL_POSTS]
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .map((p) => journalPostSchema.parse(p));
    },

    async getJournalPost(slug) {
      const post = JOURNAL_POSTS.find((p) => p.slug === slug);
      return post ? journalPostSchema.parse(post) : null;
    },

    async getJournalSlugs() {
      return JOURNAL_POSTS.map((p) => p.slug);
    },

    async getSiteSettings(): Promise<SiteSettings> {
      return siteSettingsSchema.parse(SITE_SETTINGS);
    },

    async searchProducts(term): Promise<ProductCard[]> {
      const needle = term.trim().toLowerCase();
      // An empty query returns nothing rather than the whole catalogue: the
      // search page has a distinct "no query yet" state for that.
      if (needle === '') return [];
      const matches = PRODUCTS.filter((p) => p.title.toLowerCase().includes(needle)).map(toProductCard);
      // Sorted the same way the Sanity adapter's search query returns
      // results, reusing applyFacets' own "featured" comparator rather than
      // duplicating its tie-break logic here. No facet is actually applied —
      // every argument but sort is empty/null, so this only sorts.
      return applyFacets(matches, { sizes: [], colours: [], materials: [], priceBand: null, sort: 'featured' });
    },
  };
}
