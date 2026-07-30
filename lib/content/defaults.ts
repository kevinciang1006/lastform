import type { SiteSettings } from './schema';

/**
 * The site chrome's "known good" content. Shared by the fixture dataset and
 * the Sanity adapter's fallback for an unseeded settings singleton, so the
 * two failure modes — no CMS configured at all, and a CMS that exists but
 * hasn't been seeded yet — render the same real announcement bar and footer
 * rather than each improvising its own placeholder.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  // Verbatim from the design export's announcement bar, Lastform.dc.html:32-36.
  announcements: ['FREE RESOLE AT 18 MONTHS', 'SHIPS FROM PORTLAND, OR — 2 DAY', 'LOT 26.07 OPEN'],
  // Every href resolves to a route this project actually builds — a footer of
  // dead links is the fastest way to make a reference implementation look unfinished.
  footerColumns: [
    {
      title: 'CATALOGUE',
      links: [
        { label: 'ALL MODELS', href: '/collections/boots' },
        { label: 'DERBIES', href: '/collections/derbies' },
        { label: 'ARCHIVE', href: '/collections/archive' },
      ],
    },
    {
      title: 'WORKSHOP',
      links: [
        { label: 'RESOLE PROGRAM', href: '/journal/what-a-resole-actually-costs' },
        { label: 'LAST INDEX', href: '/journal/nine-points-of-measurement' },
        { label: 'ENGINEERING', href: '/engineering' },
      ],
    },
    {
      title: 'ACCOUNT',
      links: [
        { label: 'CART', href: '/cart' },
        { label: 'SEARCH', href: '/search' },
      ],
    },
  ],
  featuredCollectionSlugs: ['boots', 'derbies', 'low-profile', 'archive'],
};
