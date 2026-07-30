import { z } from 'zod';
import type { ProductQuery } from '@/lib/facets';
import {
  collectionCardSchema,
  collectionSchema,
  journalPostSchema,
  productCardSchema,
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
import { sanityClient } from './client';
import { imageRefFrom } from './image';
import {
  ALL_PRODUCTS_QUERY,
  COLLECTION_BY_SLUG_QUERY,
  COLLECTION_SLUGS_QUERY,
  COLLECTIONS_QUERY,
  FEATURED_PRODUCT_QUERY,
  JOURNAL_BY_SLUG_QUERY,
  JOURNAL_LIST_QUERY,
  JOURNAL_SLUGS_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  PRODUCT_SLUGS_QUERY,
  PRODUCT_STOCK_QUERY,
  productListQuery,
  SITE_SETTINGS_QUERY,
  type RawCollection,
  type RawJournalPost,
  type RawProduct,
  type RawProductCard,
  type RawSiteSettings,
} from './queries';

// A slug list is still an external response and still gets validated, per
// the project rule that nothing skips the Zod boundary — a document saved
// without a slug should fail loudly here rather than reach
// generateStaticParams() as `undefined`.
const slugListSchema = z.array(z.string().min(1));

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function productFromRaw(raw: RawProduct): unknown {
  return { ...raw, images: raw.images.map(imageRefFrom) };
}

function cardFromRaw(raw: RawProductCard): unknown {
  // Mirrors toProductCard's own guard in source.ts, so both adapters fail
  // the same way on the same bad data.
  if (!raw.image) throw new Error(`Product ${raw.slug} has no images`);
  return { ...raw, image: imageRefFrom(raw.image) };
}

function collectionFromRaw(raw: RawCollection): unknown {
  return { ...raw, heroImage: imageRefFrom(raw.heroImage) };
}

function journalPostFromRaw(raw: RawJournalPost): unknown {
  return { ...raw, coverImage: imageRefFrom(raw.coverImage) };
}

/**
 * Fetches every product in full. Used by the methods whose logic — the
 * related-products fallback, the per-collection aggregates — is easiest to
 * get right, and easiest to keep identical to the fixture adapter, by
 * running the fixture adapter's own JS over Sanity-sourced data rather than
 * re-deriving equivalent behaviour in GROQ.
 */
async function fetchAllProducts(): Promise<Product[]> {
  const rows = await sanityClient().fetch<RawProduct[]>(ALL_PRODUCTS_QUERY, {}, { next: { tags: ['product'] } });
  return rows.map((row) => productSchema.parse(productFromRaw(row)));
}

/**
 * Sanity via GROQ. Every method here must be behaviourally identical to
 * fixtureSource() — the seed script (Task 12) writes the same fixture
 * dataset into Sanity, and every test that exercises a ContentSource must
 * pass unmodified against either adapter. Where the fixture adapter's logic
 * is more than a straight field mapping (listRelated's fallback,
 * listCollections' derived averages), this adapter fetches the same shape of
 * data and runs the identical JS over it, rather than re-implementing the
 * logic a second time in GROQ where a mistake could hide until a live
 * project exists to catch it.
 */
export function sanitySource(): ContentSource {
  return {
    async listCollections(): Promise<CollectionCard[]> {
      const [rawCollections, products] = await Promise.all([
        sanityClient().fetch<RawCollection[]>(COLLECTIONS_QUERY),
        fetchAllProducts(),
      ]);
      return rawCollections.map((raw) => {
        const collection = collectionSchema.parse(collectionFromRaw(raw));
        const members = products.filter((p) => p.collectionSlug === collection.slug);
        const totalDrop = members.reduce((sum, p) => sum + p.dropMm, 0);
        return collectionCardSchema.parse({
          ...collection,
          // Derived, not stored — same as the fixture adapter's collectionCard().
          modelCount: members.length,
          avgDropMm: members.length === 0 ? 0 : oneDecimal(totalDrop / members.length),
        });
      });
    },

    async getCollection(slug) {
      const raw = await sanityClient().fetch<RawCollection | null>(COLLECTION_BY_SLUG_QUERY, { slug });
      return raw ? collectionSchema.parse(collectionFromRaw(raw)) : null;
    },

    async getCollectionSlugs() {
      const rows = await sanityClient().fetch<{ slug: string }[]>(COLLECTION_SLUGS_QUERY);
      return slugListSchema.parse(rows.map((r) => r.slug));
    },

    async listProducts(query: ProductQuery): Promise<ProductListResult> {
      const items = productListQuery(query);
      // Facets are always derived from the collection scope, never the
      // filtered result, so narrowing a facet never removes the control that
      // would undo it. Re-running the same builder with the facet filters
      // cleared (but the collection scope kept) reproduces that scope.
      const scope = productListQuery({ ...query, sizes: [], colours: [], materials: [], priceBand: null });

      const [rawItems, rawScope] = await Promise.all([
        sanityClient().fetch<RawProductCard[]>(items.query, items.params, { next: { tags: ['product'] } }),
        sanityClient().fetch<RawProductCard[]>(scope.query, scope.params, { next: { tags: ['product'] } }),
      ]);

      const parsedItems = rawItems.map((row) => productCardSchema.parse(cardFromRaw(row)));
      const scopeCards = rawScope.map((row) => productCardSchema.parse(cardFromRaw(row)));

      return { items: parsedItems, total: parsedItems.length, facets: facetsFrom(scopeCards) };
    },

    async getProduct(slug) {
      const raw = await sanityClient().fetch<RawProduct | null>(
        PRODUCT_BY_SLUG_QUERY,
        { slug },
        { next: { tags: ['product', `product:${slug}`] } },
      );
      return raw ? productSchema.parse(productFromRaw(raw)) : null;
    },

    async getProductSlugs() {
      const rows = await sanityClient().fetch<{ slug: string }[]>(PRODUCT_SLUGS_QUERY);
      return slugListSchema.parse(rows.map((r) => r.slug));
    },

    async getFeaturedProduct() {
      const raw = await sanityClient().fetch<RawProduct | null>(FEATURED_PRODUCT_QUERY, {}, { next: { tags: ['product'] } });
      return raw ? productSchema.parse(productFromRaw(raw)) : null;
    },

    async listRelated(product: Product, limit: number): Promise<RelatedProducts> {
      const cap = Math.max(0, limit);
      const all = await fetchAllProducts();

      // Same last first, because that is the measurement a buyer is comparing.
      const sameLast = all.filter((p) => p.lastShape === product.lastShape && p.slug !== product.slug);
      if (sameLast.length >= cap) {
        return { items: sameLast.slice(0, cap).map(toProductCard), basis: 'last' };
      }

      // Some products are the only ones cut on their last. Topping up from the
      // collection keeps the strip populated, and downgrading the basis stops
      // the PDP claiming a shared last these additions do not have.
      const taken = new Set(sameLast.map((p) => p.slug));
      const topUp = all.filter(
        (p) => p.collectionSlug === product.collectionSlug && p.slug !== product.slug && !taken.has(p.slug),
      );
      const items = [...sameLast, ...topUp].slice(0, cap).map(toProductCard);
      return { items, basis: sameLast.length === 0 || items.length > sameLast.length ? 'collection' : 'last' };
    },

    async getStock(slug): Promise<Variant[]> {
      const raw = await sanityClient().fetch<{ size: number; stock: number }[] | null>(
        PRODUCT_STOCK_QUERY,
        { slug },
        { cache: 'no-store' },
      );
      if (!raw) return [];
      return raw.map((v) => variantSchema.parse(v));
    },

    async listJournalPosts(): Promise<JournalPost[]> {
      const rows = await sanityClient().fetch<RawJournalPost[]>(JOURNAL_LIST_QUERY);
      return rows.map((row) => journalPostSchema.parse(journalPostFromRaw(row)));
    },

    async getJournalPost(slug) {
      const raw = await sanityClient().fetch<RawJournalPost | null>(JOURNAL_BY_SLUG_QUERY, { slug });
      return raw ? journalPostSchema.parse(journalPostFromRaw(raw)) : null;
    },

    async getJournalSlugs() {
      const rows = await sanityClient().fetch<{ slug: string }[]>(JOURNAL_SLUGS_QUERY);
      return slugListSchema.parse(rows.map((r) => r.slug));
    },

    async getSiteSettings(): Promise<SiteSettings> {
      const raw = await sanityClient().fetch<RawSiteSettings | null>(SITE_SETTINGS_QUERY);
      // No empty fallback: announcements requires at least one entry and the
      // interface returns a non-nullable SiteSettings, so there is no valid
      // "empty" shape to hand back. A missing singleton is a real
      // misconfiguration and should fail the parse loudly, the same as any
      // other content that doesn't match its schema.
      return siteSettingsSchema.parse(raw);
    },

    async searchProducts(term): Promise<ProductCard[]> {
      const needle = term.trim().toLowerCase();
      // An empty query returns nothing rather than the whole catalogue: the
      // search page has a distinct "no query yet" state for that.
      if (needle === '') return [];
      // Filtered in JS against the full unfiltered card list rather than via
      // GROQ's match operator, so this matches fixtureSource()'s
      // `includes()` semantics exactly rather than approximating them with
      // GROQ's token-based matching.
      const { query, params } = productListQuery({
        sizes: [],
        colours: [],
        materials: [],
        priceBand: null,
        sort: 'featured',
      });
      const rows = await sanityClient().fetch<RawProductCard[]>(query, params);
      const cards = rows.map((row) => productCardSchema.parse(cardFromRaw(row)));
      return cards.filter((c) => c.title.toLowerCase().includes(needle));
    },
  };
}
