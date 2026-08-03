/**
 * The cache-tag vocabulary, shared by the two halves that have to agree on it:
 * the GROQ adapter, which attaches tags to every cached read, and the webhook,
 * which purges them when an editor publishes.
 *
 * They live in one module because a tag is a string contract between code that
 * never calls code — the adapter writes `product:grain-derby-04` and the
 * webhook purges `product:grain-derby-04`, and nothing but agreement on a
 * string literal connects them. A typo on either side fails silently: the write
 * succeeds, the purge succeeds, and the page simply never updates.
 */

/** The `_type` values the webhook is willing to act on. */
export const REVALIDATABLE_TYPES = ['product', 'collection', 'journalPost', 'siteSettings'] as const;

export type RevalidatableType = (typeof REVALIDATABLE_TYPES)[number];

export function isRevalidatableType(value: unknown): value is RevalidatableType {
  return typeof value === 'string' && (REVALIDATABLE_TYPES as readonly string[]).includes(value);
}

/** Collective tags — every list, aggregate or slug query over that type. */
export const PRODUCTS = 'product';
export const COLLECTIONS = 'collection';
export const JOURNAL = 'journal';
export const SETTINGS = 'settings';

/** Per-document tags, so publishing one product does not invalidate the other 23. */
export const productTag = (slug: string): string => `product:${slug}`;
export const collectionTag = (slug: string): string => `collection:${slug}`;
export const journalTag = (slug: string): string => `journal:${slug}`;

/**
 * The tags a publish, update or delete of one document must purge.
 *
 * Each case names both the collective tag and the document's own, because the
 * two answer different questions: the collective covers every list the document
 * appears in (the grid, the sitemap, the related strip), the specific covers
 * the document's own page. Purging only the specific tag leaves a renamed
 * product with a stale title everywhere it is linked from.
 *
 * A missing slug is not an error — Sanity's delete payloads carry `_type` but
 * frequently no projection of the deleted document — so the collective tag
 * alone still does the necessary work.
 *
 * siteSettings deliberately returns everything: announcements and footer links
 * render into the chrome of every page, so there is no narrower honest answer.
 */
export function tagsFor(type: RevalidatableType, slug: string | null | undefined): string[] {
  switch (type) {
    case 'product':
      return slug ? [PRODUCTS, productTag(slug)] : [PRODUCTS];
    case 'collection':
      // Products carry their collection's title and slug through a dereference,
      // so renaming a collection changes every product card that names it.
      return slug ? [COLLECTIONS, collectionTag(slug), PRODUCTS] : [COLLECTIONS, PRODUCTS];
    case 'journalPost':
      return slug ? [JOURNAL, journalTag(slug)] : [JOURNAL];
    case 'siteSettings':
      return [SETTINGS, PRODUCTS, COLLECTIONS, JOURNAL];
  }
}
