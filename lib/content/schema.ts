import type { PortableTextBlock } from '@portabletext/types';
import { z } from 'zod';

export const LOW_STOCK_THRESHOLD = 3;

export type StockState = 'in' | 'low' | 'out';

export function stockState(stock: number): StockState {
  if (stock <= 0) return 'out';
  return stock < LOW_STOCK_THRESHOLD ? 'low' : 'in';
}

const portableTextSchema = z.array(
  z.custom<PortableTextBlock>((value) => typeof value === 'object' && value !== null && '_type' in value),
);

export const imageRefSchema = z.object({
  url: z.string().min(1),
  /** Sanity LQIP data URI; null in fixture mode, where a solid fog fill is used instead. */
  lqip: z.string().nullable(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(1),
});
export type ImageRef = z.infer<typeof imageRefSchema>;

export const variantSchema = z.object({
  size: z.number().positive(),
  stock: z.number().int().min(0),
});
export type Variant = z.infer<typeof variantSchema>;

export const annotationSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type Annotation = z.infer<typeof annotationSchema>;

export const specRowSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});
export type SpecRow = z.infer<typeof specRowSchema>;

export const productSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  lot: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  price: z.number().positive(),
  /** ISO-4217 shape, deliberately not the four-value display-currency union:
   *  a product may be priced in a currency the storefront does not localise,
   *  and that should render as-is rather than fail at the content boundary. */
  currency: z.string().regex(/^[A-Z]{3}$/),
  colour: z.string().min(1),
  material: z.string().min(1),
  upperMm: z.number().positive(),
  lastShape: z.string().min(1),
  dropMm: z.number().min(0),
  weightGrams: z.number().int().positive(),
  collectionSlug: z.string().min(1),
  collectionTitle: z.string().min(1),
  images: z.array(imageRefSchema).min(1),
  description: portableTextSchema,
  variants: z.array(variantSchema).min(1),
  annotations: z.array(annotationSchema),
  materials: z.array(specRowSchema),
  construction: z.array(specRowSchema),
  featured: z.boolean(),
});
export type Product = z.infer<typeof productSchema>;

// Projected from productSchema rather than redeclared: a card is a subset of a
// product, and two hand-maintained copies drift the moment a validator changes
// on one side. Both adapters must satisfy both shapes, so they must stay welded.
export const productCardSchema = productSchema
  .pick({
    id: true, sku: true, title: true, slug: true, price: true, currency: true,
    colour: true, material: true, lastShape: true, dropMm: true,
    weightGrams: true, featured: true, variants: true,
  })
  .extend({ image: imageRefSchema });
export type ProductCard = z.infer<typeof productCardSchema>;

export const collectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  blurb: z.string().min(1),
  heroImage: imageRefSchema,
  sortOrder: z.number().int(),
});
export type Collection = z.infer<typeof collectionSchema>;

export const collectionCardSchema = collectionSchema.extend({
  /** Derived in the adapter, not stored — the design's "6 MODELS — 9 MM DROP AVG" line. */
  modelCount: z.number().int().min(0),
  avgDropMm: z.number().min(0),
});
export type CollectionCard = z.infer<typeof collectionCardSchema>;

export const journalPostSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().min(1),
  coverImage: imageRefSchema,
  /** ISO 8601, not any non-empty string: "next week" would pass .min(1) and
   *  then fail silently at sort time, far from the boundary that admitted it. */
  publishedAt: z.string().datetime(),
  body: portableTextSchema,
});
export type JournalPost = z.infer<typeof journalPostSchema>;

export const siteSettingsSchema = z.object({
  announcements: z.array(z.string().min(1)).min(1),
  footerColumns: z.array(
    z.object({
      title: z.string().min(1),
      links: z.array(z.object({ label: z.string().min(1), href: z.string().min(1) })),
    }),
  ),
  featuredCollectionSlugs: z.array(z.string().min(1)),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
