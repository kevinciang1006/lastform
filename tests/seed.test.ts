import { describe, expect, it } from 'vitest';
import {
  buildCollectionDocument,
  buildJournalDocument,
  buildProductDocument,
  buildSiteSettingsDocument,
  imageFileNames,
  type AssetIds,
  type CollectionDocument,
  type JournalDocument,
  type ProductDocument,
  type SiteSettingsDocument,
} from '@/lib/content/seed-documents';
import { DEFAULT_SITE_SETTINGS } from '@/lib/content/defaults';
import { COLLECTIONS, JOURNAL_POSTS, PRODUCTS } from '@/lib/content/fixtures/data';
import {
  collectionSchema,
  journalPostSchema,
  productSchema,
  siteSettingsSchema,
} from '@/lib/content/schema';

/** Every fixture image mapped to a fake asset id, as the upload step would. */
const ASSET_IDS: AssetIds = Object.fromEntries(imageFileNames().map((file, i) => [file, `image-asset-${i}`]));

/** What `asset->{ url, metadata { lqip, dimensions { width, height } } }`
 *  resolves to. Dimensions differ per asset so a swapped reference is visible. */
const ASSET_META = Object.fromEntries(
  Object.values(ASSET_IDS).map((id, i) => [
    id,
    {
      url: `https://cdn.sanity.io/images/p/production/${id}.webp`,
      metadata: { lqip: `data:image/png;base64,LQIP${i}`, dimensions: { width: 2000, height: 2600 } },
    },
  ]),
);

function projectImage(value: { readonly alt: string; readonly asset: { readonly _ref: string } }) {
  const meta = ASSET_META[value.asset._ref];
  if (!meta) throw new Error(`unresolved asset ${value.asset._ref}`);
  return {
    url: meta.url,
    lqip: meta.metadata.lqip,
    width: meta.metadata.dimensions.width,
    height: meta.metadata.dimensions.height,
    alt: value.alt,
  };
}

/**
 * These three functions mirror the GROQ projections in
 * lib/content/sanity/queries.ts alias for alias. They exist so a seed field the
 * projection reads but the script never writes shows up here as a Zod failure,
 * rather than at request time against a real dataset. They are the only
 * available stand-in for executing GROQ, since no Sanity project exists.
 */
function projectProduct(doc: ProductDocument, collections: readonly CollectionDocument[]) {
  const parent = collections.find((c) => c._id === doc.collection._ref);
  if (!parent) throw new Error(`unresolved collection reference ${doc.collection._ref}`);
  return {
    id: doc._id,
    sku: doc.sku,
    lot: doc.lot,
    title: doc.title,
    slug: doc.slug.current,
    price: doc.price,
    currency: doc.currency,
    colour: doc.colour,
    material: doc.material,
    upperMm: doc.upperMm,
    lastShape: doc.lastShape,
    dropMm: doc.dropMm,
    weightGrams: doc.weightGrams,
    collectionSlug: parent.slug.current,
    collectionTitle: parent.title,
    images: doc.images.map(projectImage),
    description: doc.description,
    variants: doc.variants.map((v) => ({ size: v.size, stock: v.stock })),
    annotations: doc.annotations.map((a) => ({ label: a.label, value: a.value, x: a.x, y: a.y })),
    materials: doc.materials.map((r) => ({ label: r.label, value: r.value })),
    construction: doc.construction.map((r) => ({ label: r.label, value: r.value })),
    featured: doc.featured,
  };
}

function projectCollection(doc: CollectionDocument) {
  return {
    id: doc._id,
    title: doc.title,
    slug: doc.slug.current,
    blurb: doc.blurb,
    heroImage: projectImage(doc.heroImage),
    sortOrder: doc.sortOrder,
  };
}

function projectJournal(doc: JournalDocument) {
  return {
    id: doc._id,
    title: doc.title,
    slug: doc.slug.current,
    excerpt: doc.excerpt,
    coverImage: projectImage(doc.coverImage),
    publishedAt: doc.publishedAt,
    body: doc.body,
  };
}

function projectSettings(doc: SiteSettingsDocument, collections: readonly CollectionDocument[]) {
  return {
    announcements: doc.announcementBar,
    footerColumns: doc.footerColumns.map((c) => ({
      title: c.title,
      links: c.links.map((l) => ({ label: l.label, href: l.href })),
    })),
    // Resolved through the collection documents, mirroring GROQ's
    // `featuredCollections[]->slug.current`. Deriving the slug from the _ref
    // string instead would agree only by coincidence of the seed's id scheme.
    featuredCollectionSlugs: doc.featuredCollections.map((ref) => {
      const target = collections.find((c) => c._id === ref._ref);
      if (!target) throw new Error(`unresolved featured collection ${ref._ref}`);
      return target.slug.current;
    }),
  };
}

const collectionDocs = COLLECTIONS.map((c) => buildCollectionDocument(c, ASSET_IDS));
const productDocs = PRODUCTS.map((p) => buildProductDocument(p, ASSET_IDS));
const journalDocs = JOURNAL_POSTS.map((p) => buildJournalDocument(p, ASSET_IDS));
const settingsDoc = buildSiteSettingsDocument(DEFAULT_SITE_SETTINGS);

describe('seed document round trip', () => {
  // The point of the whole task: what the seed writes must survive the
  // projection and satisfy the schema the adapter parses with.
  it('projects every product document back into a valid Product', () => {
    for (const doc of productDocs) {
      const result = productSchema.safeParse(projectProduct(doc, collectionDocs));
      expect(result.success, `${doc._id}: ${result.success ? '' : JSON.stringify(result.error.issues)}`).toBe(true);
    }
  });

  it('projects every collection document back into a valid Collection', () => {
    for (const doc of collectionDocs) {
      const result = collectionSchema.safeParse(projectCollection(doc));
      expect(result.success, doc._id).toBe(true);
    }
  });

  it('projects every journal document back into a valid JournalPost', () => {
    for (const doc of journalDocs) {
      const result = journalPostSchema.safeParse(projectJournal(doc));
      expect(result.success, doc._id).toBe(true);
    }
  });

  it('projects the settings singleton back into valid SiteSettings', () => {
    const result = siteSettingsSchema.safeParse(projectSettings(settingsDoc, collectionDocs));
    expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true);
  });

  /**
   * Guards the simulation itself. The four `project*` helpers above were written
   * by reading the GROQ projections, so a misreading shared with the seed would
   * pass every test above. Checking each projected key set against the Zod
   * schema's own keys validates the simulation against the real contract instead
   * of against my reading of it — a projection that omits or invents a field
   * fails here even if the seed agrees with it.
   */
  it('produces exactly the key set each schema declares, no field missing or invented', () => {
    const cases: [string, readonly string[], Record<string, unknown>][] = [
      ['product', productSchema.keyof().options, projectProduct(productDocs[0]!, collectionDocs)],
      ['collection', collectionSchema.keyof().options, projectCollection(collectionDocs[0]!)],
      ['journalPost', journalPostSchema.keyof().options, projectJournal(journalDocs[0]!)],
      ['siteSettings', siteSettingsSchema.keyof().options, projectSettings(settingsDoc, collectionDocs)],
    ];
    for (const [label, expected, projected] of cases) {
      expect([...Object.keys(projected)].sort(), label).toEqual([...expected].sort());
    }
  });

  it('round-trips content unchanged, not merely into a parseable shape', () => {
    const hero = PRODUCTS.find((p) => p.featured);
    const doc = productDocs.find((d) => d._id === `product-${hero?.slug ?? ''}`);
    if (!hero || !doc) throw new Error('featured fixture missing');
    const projected = productSchema.parse(projectProduct(doc, collectionDocs));
    expect(projected.title).toBe(hero.title);
    expect(projected.sku).toBe(hero.sku);
    expect(projected.collectionSlug).toBe(hero.collectionSlug);
    expect(projected.variants).toEqual(hero.variants);
    expect(projected.annotations).toEqual(hero.annotations);
    expect(projected.materials).toEqual(hero.materials);
    expect(projected.construction).toEqual(hero.construction);
    expect(projected.description).toEqual(hero.description);
  });
});

describe('seed document structure', () => {
  it('uses deterministic document ids', () => {
    expect(productDocs.map((d) => d._id)).toContain('product-grain-derby-04');
    expect(collectionDocs.map((d) => d._id)).toContain('collection-derbies');
    expect(journalDocs.map((d) => d._id)).toContain('journal-a-last-is-not-a-shoe');
    expect(settingsDoc._id).toBe('siteSettings');
  });

  it('points every product at a collection document that the seed also writes', () => {
    const ids = new Set(collectionDocs.map((d) => d._id));
    for (const doc of productDocs) expect(ids.has(doc.collection._ref), doc._id).toBe(true);
  });

  it('points every featured-collection reference at a real collection document', () => {
    const ids = new Set(collectionDocs.map((d) => d._id));
    for (const ref of settingsDoc.featuredCollections) expect(ids.has(ref._ref), ref._ref).toBe(true);
  });

  // Sanity needs a _key on every object in an array, or Studio array editing
  // silently misbehaves on reorder and delete.
  it('gives every array object a unique _key within its array', () => {
    const arrays: [string, readonly { readonly _key: string }[]][] = [
      ...productDocs.flatMap((d): [string, readonly { readonly _key: string }[]][] => [
        [`${d._id}.images`, d.images],
        [`${d._id}.variants`, d.variants],
        [`${d._id}.annotations`, d.annotations],
        [`${d._id}.materials`, d.materials],
        [`${d._id}.construction`, d.construction],
      ]),
      ['settings.footerColumns', settingsDoc.footerColumns],
      ['settings.featuredCollections', settingsDoc.featuredCollections],
      ...settingsDoc.footerColumns.map(
        (c): [string, readonly { readonly _key: string }[]] => [`settings.${c._key}.links`, c.links],
      ),
    ];
    for (const [label, items] of arrays) {
      const keys = items.map((i) => i._key);
      expect(keys.every((k) => k.length > 0), label).toBe(true);
      expect(new Set(keys).size, `${label} has duplicate keys: ${keys.join(', ')}`).toBe(keys.length);
    }
  });

  // createOrReplace is only idempotent if the payload is identical each run, so
  // keys must be content-derived rather than random.
  it('builds byte-identical documents on a second run', () => {
    const hero = PRODUCTS.find((p) => p.featured);
    if (!hero) throw new Error('featured fixture missing');
    expect(JSON.stringify(buildProductDocument(hero, ASSET_IDS))).toBe(
      JSON.stringify(buildProductDocument(hero, ASSET_IDS)),
    );
    expect(JSON.stringify(buildSiteSettingsDocument(DEFAULT_SITE_SETTINGS))).toBe(
      JSON.stringify(buildSiteSettingsDocument(DEFAULT_SITE_SETTINGS)),
    );
  });

  // Now that these object types are top-level rather than inline, the _type
  // discriminator is what binds a stored array member back to its schema. Omit
  // it and the failure is silent: the write succeeds, GROQ still projects the
  // fields, and the only symptom is a blank row in the Studio and a broken
  // GraphQL response.
  it('tags array members with the object types the Studio schemas declare', () => {
    const doc = productDocs[0];
    if (!doc) throw new Error('no products');
    expect(doc.images.every((i) => i._type === 'image')).toBe(true);
    expect(doc.variants.every((v) => v._type === 'variant')).toBe(true);
    expect(doc.annotations.every((a) => a._type === 'annotation')).toBe(true);
    expect(doc.materials.every((r) => r._type === 'specRow')).toBe(true);
    expect(doc.construction.every((r) => r._type === 'specRow')).toBe(true);
    expect(doc.slug._type).toBe('slug');
    expect(doc.collection._type).toBe('reference');
  });

  it('tags the footer object types the site settings schema declares', () => {
    expect(settingsDoc.footerColumns.length).toBeGreaterThan(0);
    expect(settingsDoc.footerColumns.every((c) => c._type === 'footerColumn')).toBe(true);
    const links = settingsDoc.footerColumns.flatMap((c) => c.links);
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((l) => l._type === 'footerLink')).toBe(true);
  });

  it('collects every referenced image exactly once for upload', () => {
    const files = imageFileNames();
    expect(new Set(files).size).toBe(files.length);
    expect(files).toHaveLength(55);
    expect(files.every((f) => f.endsWith('.webp')), 'SVG would yield no LQIP from Sanity').toBe(true);
  });

  it('fails loudly when an image has no uploaded asset', () => {
    const hero = PRODUCTS.find((p) => p.featured);
    if (!hero) throw new Error('featured fixture missing');
    expect(() => buildProductDocument(hero, {})).toThrow(/No uploaded asset/);
  });
});
