import type { Collection, JournalPost, SiteSettings } from '@/lib/content/schema';
import { paragraph, pullQuote } from './portable-text';

export { PRODUCTS } from './data.products';

function heroImage(slug: string, title: string) {
  return {
    url: `/fixtures/collection-${slug}.webp`,
    lqip: null,
    width: 1200,
    height: 900,
    alt: `${title}, lateral elevation`,
  };
}

export const COLLECTIONS: readonly Collection[] = [
  {
    id: 'collection-boots',
    title: 'Boots',
    slug: 'boots',
    blurb: 'Six models between 7 and 14 mm of drop, all welted, none under 550 g a side.',
    heroImage: heroImage('boots', 'Boots'),
    sortOrder: 1,
  },
  {
    id: 'collection-derbies',
    title: 'Derbies',
    slug: 'derbies',
    blurb: 'Open lacing on three lasts. The 4 mm wholecut and the 7 mm Norwegian are the two ends of it.',
    heroImage: heroImage('derbies', 'Derbies'),
    sortOrder: 2,
  },
  {
    id: 'collection-low-profile',
    title: 'Low Profile',
    slug: 'low-profile',
    blurb: 'Cup soles, 3 to 6 mm of drop, 344 to 452 g. Resoleable once, and we say so on every page.',
    heroImage: heroImage('low-profile', 'Low Profile'),
    sortOrder: 3,
  },
  {
    id: 'collection-archive',
    title: 'Archive',
    slug: 'archive',
    blurb: 'Patterns we still cut on lasts we no longer make. Read the sizing note before ordering.',
    heroImage: heroImage('archive', 'Archive'),
    sortOrder: 4,
  },
];

function coverImage(slug: string, title: string) {
  return {
    url: `/fixtures/journal-${slug}.webp`,
    lqip: null,
    width: 1600,
    height: 900,
    alt: title,
  };
}

export const JOURNAL_POSTS: readonly JournalPost[] = [
  {
    id: 'journal-a-last-is-not-a-shoe',
    title: 'A last is not a shoe',
    slug: 'a-last-is-not-a-shoe',
    excerpt:
      'Eleven shapes, each turned from a beech blank and measured at nine points. Those nine numbers decide whether a shoe fits you or merely holds your foot.',
    coverImage: coverImage('a-last-is-not-a-shoe', 'A last is not a shoe'),
    publishedAt: '2026-07-20T09:00:00.000Z',
    body: [
      paragraph(
        'last-p0',
        'A last is a solid form, usually beech, that a shoe is built around. It is not a mould of a foot. It is an argument about what a foot does when it is standing, and a different argument about what it does when it is walking, and the shoe is the compromise between the two.',
      ),
      paragraph(
        'last-p1',
        'We cut eleven. The LF-07 is the round one most of the catalogue sits on. The LF-13 is 6 mm tighter through the heel seat and carries the low-profile pairs. The LF-12 is nearly straight, which is why the Engineer 08 feels wrong for a week and then does not.',
      ),
      pullQuote('last-q0', 'A last is not a shoe. It is the argument for one.', 'Workshop 12'),
      paragraph(
        'last-p2',
        'The nine points we measure are ball girth, waist, instep, heel seat, heel width, toe spring, stick length, forepart height and tread width. Six of those you can feel going wrong. Three of them you can only measure.',
      ),
      paragraph(
        'last-p3',
        'We publish all nine for every last. Compare them against a pair you already own before you compare a photograph against a photograph.',
      ),
    ],
  },
  {
    id: 'journal-nine-points-of-measurement',
    title: 'Nine points of measurement',
    slug: 'nine-points-of-measurement',
    excerpt:
      'Ball girth is the one that fails a fitting. The other eight are the ones that make a shoe you keep wearing after it fits.',
    coverImage: coverImage('nine-points-of-measurement', 'Nine points of measurement'),
    publishedAt: '2026-07-12T09:00:00.000Z',
    body: [
      paragraph(
        'nine-p0',
        'Nominal size is a length. It tells you almost nothing, which is why two pairs marked 43 can differ by 8 mm of stick length and 12 mm of ball girth without either being mislabelled.',
      ),
      paragraph(
        'nine-p1',
        'Ball girth is the circumference around the widest part of the joint. It is the measurement that decides whether a shoe hurts. Every other number decides whether you notice the shoe at hour six.',
      ),
      pullQuote(
        'nine-q0',
        'Two pairs marked 43 can differ by 8 mm and both be correct.',
        'Last index, LF-02 vs LF-07',
      ),
      paragraph(
        'nine-p2',
        'Toe spring is how far the forepart lifts off the ground at rest. Ours runs 8 to 12 mm depending on the last. Too little and the sole fights every step; too much and the shoe rocks when you stand still.',
      ),
      paragraph(
        'nine-p3',
        'Stick length is measured along the last, not the foot, and it is the number to use when moving between our lasts. The retired LF-02 runs 6 mm long against the LF-07 at the same marked size. That is a half size, and it is why the Archive pairs carry a warning.',
      ),
    ],
  },
  {
    id: 'journal-what-a-resole-actually-costs',
    title: 'What a resole actually costs',
    slug: 'what-a-resole-actually-costs',
    excerpt:
      'A welted boot takes four. A cup-soled trainer takes one, optimistically. The construction decides it, not the price.',
    coverImage: coverImage('what-a-resole-actually-costs', 'What a resole actually costs'),
    publishedAt: '2026-07-02T09:00:00.000Z',
    body: [
      paragraph(
        'resole-p0',
        'A Goodyear welt sews the upper to a strip of leather, and the outsole to that strip. The upper is never stitched to the outsole directly, which means the bottom can be cut away and replaced without touching the upper. Four times, on our midsoles, before the welt holes run out.',
      ),
      paragraph(
        'resole-p1',
        'Blake stitching runs a single seam through insole, upper and outsole together. It is lighter and more flexible and it gives up a resole: three, because each new seam needs fresh material to bite into.',
      ),
      pullQuote(
        'resole-q0',
        'A cup sole resoles once. We put that on the product page, not in the returns policy.',
        'Resole programme',
      ),
      paragraph(
        'resole-p2',
        'A cup sole is a single moulded unit, glued and top-stitched around the perimeter. Removing it destroys the stitch holes in the upper. We quote one resole and we mean it as a ceiling, not a promise.',
      ),
      paragraph(
        'resole-p3',
        'The first resole on any welted pair is included at eighteen months. That is not generosity — it is the point at which we want the shoe back so we can see how the last performed.',
      ),
    ],
  },
];

export const SITE_SETTINGS: SiteSettings = {
  // Verbatim from the design export's announcement bar, Lastform.dc.html:32-36.
  announcements: [
    'FREE RESOLE AT 18 MONTHS',
    'SHIPS FROM PORTLAND, OR — 2 DAY',
    'LOT 26.07 OPEN',
  ],
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
