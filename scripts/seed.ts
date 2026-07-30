import { readFile } from 'node:fs/promises';
import { createClient, type SanityClient } from 'next-sanity';
import { DEFAULT_SITE_SETTINGS } from '@/lib/content/defaults';
import { COLLECTIONS, JOURNAL_POSTS, PRODUCTS } from '@/lib/content/fixtures/data';
import type { Collection, ImageRef, JournalPost, Product, SiteSettings } from '@/lib/content/schema';

/**
 * Writes the fixture dataset into Sanity so both content adapters serve
 * identical content. The document shapes here are dictated by the GROQ
 * projections in lib/content/sanity/queries.ts — every alias in a projection
 * is a field this script must write, and a disagreement surfaces as a Zod
 * failure at request time rather than an error here.
 *
 * Note the write API applies none of the Studio schema's validation rules:
 * Rule.required() governs the Publish button, not client.createOrReplace, so
 * completeness is this script's responsibility alone.
 */

/** Maps a fixture image filename to the uploaded Sanity asset `_id`. */
export type AssetIds = Readonly<Record<string, string>>;

// The document shapes below are typed rather than left as loose records so the
// round-trip test can walk them without casts, and so a projection alias that
// has no corresponding field here fails to compile rather than at request time.

export interface SlugValue {
  readonly _type: 'slug';
  readonly current: string;
}

export interface ReferenceValue {
  readonly _type: 'reference';
  readonly _ref: string;
}

export interface ImageValue {
  readonly _type: 'image';
  readonly alt: string;
  readonly asset: ReferenceValue;
}

export interface KeyedSpecRow {
  readonly _type: 'specRow';
  readonly _key: string;
  readonly label: string;
  readonly value: string;
}

export interface CollectionDocument {
  // Index signature so these satisfy Sanity's Record-based transaction
  // generic. Named properties above keep their precise types.
  readonly [key: string]: unknown;
  readonly _id: string;
  readonly _type: 'collection';
  readonly title: string;
  readonly slug: SlugValue;
  readonly blurb: string;
  readonly heroImage: ImageValue;
  readonly sortOrder: number;
}

export interface ProductDocument {
  // Index signature so these satisfy Sanity's Record-based transaction
  // generic. Named properties above keep their precise types.
  readonly [key: string]: unknown;
  readonly _id: string;
  readonly _type: 'product';
  readonly sku: string;
  readonly lot: string;
  readonly title: string;
  readonly slug: SlugValue;
  readonly price: number;
  readonly currency: string;
  readonly colour: string;
  readonly material: string;
  readonly upperMm: number;
  readonly lastShape: string;
  readonly dropMm: number;
  readonly weightGrams: number;
  readonly collection: ReferenceValue;
  readonly images: readonly (ImageValue & { readonly _key: string })[];
  readonly description: Product['description'];
  readonly variants: readonly { readonly _type: 'variant'; readonly _key: string; readonly size: number; readonly stock: number }[];
  readonly annotations: readonly {
    readonly _type: 'annotation';
    readonly _key: string;
    readonly label: string;
    readonly value: string;
    readonly x: number;
    readonly y: number;
  }[];
  readonly materials: readonly KeyedSpecRow[];
  readonly construction: readonly KeyedSpecRow[];
  readonly featured: boolean;
}

export interface JournalDocument {
  // Index signature so these satisfy Sanity's Record-based transaction
  // generic. Named properties above keep their precise types.
  readonly [key: string]: unknown;
  readonly _id: string;
  readonly _type: 'journalPost';
  readonly title: string;
  readonly slug: SlugValue;
  readonly excerpt: string;
  readonly coverImage: ImageValue;
  readonly publishedAt: string;
  readonly body: JournalPost['body'];
}

export interface SiteSettingsDocument {
  // Index signature so these satisfy Sanity's Record-based transaction
  // generic. Named properties above keep their precise types.
  readonly [key: string]: unknown;
  readonly _id: 'siteSettings';
  readonly _type: 'siteSettings';
  readonly announcementBar: readonly string[];
  readonly footerColumns: readonly {
    readonly _type: 'footerColumn';
    readonly _key: string;
    readonly title: string;
    readonly links: readonly { readonly _type: 'footerLink'; readonly _key: string; readonly label: string; readonly href: string }[];
  }[];
  readonly featuredCollections: readonly (ReferenceValue & { readonly _key: string })[];
}

/** Anything this script writes. A union rather than an index-signature record,
 *  so a missing field is a compile error instead of a silent `undefined`. */
type SeedDocument = CollectionDocument | ProductDocument | JournalDocument | SiteSettingsDocument;

const IMAGE_DIR = new URL('../public/fixtures/', import.meta.url);

function fileNameOf(url: string): string {
  const name = url.split('/').pop();
  if (!name) throw new Error(`Cannot derive a filename from image url: ${url}`);
  return name;
}

/** Stable, content-derived array keys. Sanity needs a `_key` on every object in
 *  an array, and deriving it from content rather than randomly keeps re-runs
 *  byte-identical so `createOrReplace` is genuinely idempotent. */
function arrayKey(seed: string | number, index: number): string {
  const slug = String(seed)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'item'}-${index}`;
}

function imageValue(image: ImageRef, assetIds: AssetIds): ImageValue {
  const file = fileNameOf(image.url);
  const assetId = assetIds[file];
  if (!assetId) throw new Error(`No uploaded asset for ${file}`);
  return {
    _type: 'image',
    alt: image.alt,
    asset: { _type: 'reference', _ref: assetId },
  };
}

export function buildCollectionDocument(collection: Collection, assetIds: AssetIds): CollectionDocument {
  return {
    _id: `collection-${collection.slug}`,
    _type: 'collection',
    title: collection.title,
    slug: { _type: 'slug', current: collection.slug },
    blurb: collection.blurb,
    heroImage: imageValue(collection.heroImage, assetIds),
    sortOrder: collection.sortOrder,
  };
}

export function buildProductDocument(product: Product, assetIds: AssetIds): ProductDocument {
  return {
    _id: `product-${product.slug}`,
    _type: 'product',
    sku: product.sku,
    lot: product.lot,
    title: product.title,
    slug: { _type: 'slug', current: product.slug },
    price: product.price,
    currency: product.currency,
    colour: product.colour,
    material: product.material,
    upperMm: product.upperMm,
    lastShape: product.lastShape,
    dropMm: product.dropMm,
    weightGrams: product.weightGrams,
    // The projection reads collectionSlug and collectionTitle by dereferencing
    // this one field, so the reference is what makes both of them resolve.
    collection: { _type: 'reference', _ref: `collection-${product.collectionSlug}` },
    images: product.images.map((image, i) => ({
      ...imageValue(image, assetIds),
      _key: arrayKey(fileNameOf(image.url), i),
    })),
    description: product.description,
    variants: product.variants.map((variant, i) => ({
      _type: 'variant',
      _key: arrayKey(variant.size, i),
      size: variant.size,
      stock: variant.stock,
    })),
    annotations: product.annotations.map((annotation, i) => ({
      _type: 'annotation',
      _key: arrayKey(annotation.label, i),
      label: annotation.label,
      value: annotation.value,
      x: annotation.x,
      y: annotation.y,
    })),
    materials: product.materials.map((row, i) => ({
      _type: 'specRow',
      _key: arrayKey(row.label, i),
      label: row.label,
      value: row.value,
    })),
    construction: product.construction.map((row, i) => ({
      _type: 'specRow',
      _key: arrayKey(row.label, i),
      label: row.label,
      value: row.value,
    })),
    featured: product.featured,
  };
}

export function buildJournalDocument(post: JournalPost, assetIds: AssetIds): JournalDocument {
  return {
    _id: `journal-${post.slug}`,
    _type: 'journalPost',
    title: post.title,
    slug: { _type: 'slug', current: post.slug },
    excerpt: post.excerpt,
    coverImage: imageValue(post.coverImage, assetIds),
    publishedAt: post.publishedAt,
    body: post.body,
  };
}

export function buildSiteSettingsDocument(settings: SiteSettings): SiteSettingsDocument {
  return {
    _id: 'siteSettings',
    _type: 'siteSettings',
    // Projected as "announcements"; the Studio field is announcementBar.
    announcementBar: [...settings.announcements],
    footerColumns: settings.footerColumns.map((column, i) => ({
      _type: 'footerColumn',
      _key: arrayKey(column.title, i),
      title: column.title,
      links: column.links.map((link, j) => ({
        _type: 'footerLink',
        _key: arrayKey(link.label, j),
        label: link.label,
        href: link.href,
      })),
    })),
    featuredCollections: settings.featuredCollectionSlugs.map((slug, i) => ({
      _type: 'reference',
      _key: arrayKey(slug, i),
      _ref: `collection-${slug}`,
    })),
  };
}

/** Every fixture image referenced by any document, de-duplicated. */
export function imageFileNames(): string[] {
  const urls = [
    ...PRODUCTS.flatMap((p) => p.images.map((i) => i.url)),
    ...COLLECTIONS.map((c) => c.heroImage.url),
    ...JOURNAL_POSTS.map((p) => p.coverImage.url),
  ];
  return [...new Set(urls.map(fileNameOf))];
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error('Set it in .env.local — see .env.example for what each variable is.');
    process.exit(1);
  }
  return value;
}

async function uploadImages(client: SanityClient): Promise<AssetIds> {
  const ids: Record<string, string> = {};
  for (const file of imageFileNames()) {
    let buffer: Buffer;
    try {
      buffer = await readFile(new URL(file, IMAGE_DIR));
    } catch {
      console.error(`Missing ${file} in public/fixtures. Run \`pnpm placeholders\` first.`);
      process.exit(1);
    }
    // Already rasterized WebP, never SVG: Sanity produces neither LQIP metadata
    // nor image transforms for SVG assets, and the projection reads both.
    const asset = await client.assets.upload('image', buffer, { filename: file });
    ids[file] = asset._id;
  }
  console.log(`assets     ${Object.keys(ids).length} uploaded`);
  return ids;
}

async function commitAll(client: SanityClient, label: string, docs: readonly SeedDocument[]): Promise<void> {
  const transaction = client.transaction();
  // Queued in a loop rather than chained through reduce, because Sanity's
  // transaction methods mutate and return `this`. Each document is widened into
  // a single-typed local first: passing the SeedDocument union straight in
  // defeats generic inference, which then pins to one member and rejects the rest.
  for (const doc of docs) {
    const stub: Record<string, unknown> & { _id: string; _type: string } = { ...doc };
    transaction.createOrReplace(stub);
  }
  await transaction.commit();
  console.log(`${label.padEnd(10)} ${docs.length} written`);
}

async function main(): Promise<void> {
  const projectId = requireEnv('NEXT_PUBLIC_SANITY_PROJECT_ID');
  const dataset = requireEnv('NEXT_PUBLIC_SANITY_DATASET');
  const token = requireEnv('SANITY_API_WRITE_TOKEN');

  const client = createClient({
    projectId,
    dataset,
    token,
    apiVersion: process.env['NEXT_PUBLIC_SANITY_API_VERSION'] ?? '2024-10-01',
    useCdn: false,
  });

  const assetIds = await uploadImages(client);

  // Collections first: every product holds a reference to one.
  await commitAll(client, 'collections', COLLECTIONS.map((c) => buildCollectionDocument(c, assetIds)));
  await commitAll(client, 'products', PRODUCTS.map((p) => buildProductDocument(p, assetIds)));
  await commitAll(client, 'journal', JOURNAL_POSTS.map((p) => buildJournalDocument(p, assetIds)));
  await commitAll(client, 'settings', [buildSiteSettingsDocument(DEFAULT_SITE_SETTINGS)]);

  console.log('seed complete');
}

// Not top-level await: tsx transpiles to CJS, where it is a syntax error.
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
