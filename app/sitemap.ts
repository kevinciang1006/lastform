import type { MetadataRoute } from 'next';
import { contentSource } from '@/lib/content';

const base = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const source = contentSource();
  const [products, collections, journal] = await Promise.all([
    source.getProductSlugs(),
    source.getCollectionSlugs(),
    source.getJournalSlugs(),
  ]);

  // /search and /cart are excluded on purpose: one is a per-request function of
  // user input, the other is per-visitor state. Neither is a page to index.
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/engineering`, changeFrequency: 'monthly', priority: 0.5 },
    ...collections.map((slug) => ({ url: `${base}/collections/${slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...products.map((slug) => ({ url: `${base}/products/${slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...journal.map((slug) => ({ url: `${base}/journal/${slug}`, changeFrequency: 'yearly' as const, priority: 0.4 })),
  ];
}
