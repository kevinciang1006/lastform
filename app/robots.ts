import type { MetadataRoute } from 'next';

const base = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The Studio is an editing application, /api is machine-facing, and the
      // cart and search results are per-visitor rather than pages to index.
      disallow: ['/studio', '/api/', '/cart', '/checkout/', '/search'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
