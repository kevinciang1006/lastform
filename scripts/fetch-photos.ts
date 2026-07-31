import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { COLLECTIONS, JOURNAL_POSTS, PRODUCTS } from '@/lib/content/fixtures/data';

/**
 * Replaces the generated hatch placeholders with real photographs.
 *
 * Every identifier below was verified to return HTTP 200 before being committed
 * — one candidate in the original set was a plausible-looking fabrication that
 * 404s, which is exactly why the list is pinned rather than discovered at run
 * time. Pinning also makes the script reproducible: the same command gives the
 * same images, so a rebuild never silently reshuffles the catalogue.
 *
 * Licence: the Unsplash License. Free to use, including commercially, with no
 * permission needed and no attribution required. Credits are written anyway.
 * https://unsplash.com/license
 */

/**
 * Source dimensions, not display dimensions. The hero renders at roughly 58vw,
 * so 1600px covers a 2x crop on a normal laptop without shipping a 780 kB LCP
 * image — which would have undercut the performance budget this whole project
 * exists to demonstrate. Ratio is unchanged at 10:13, so the reserved aspect
 * boxes still match exactly.
 */
const PRODUCT_W = 1600;
const PRODUCT_H = 2080;

const OUT = new URL('../public/fixtures/', import.meta.url);
const CREDITS = new URL('../public/fixtures/CREDITS.md', import.meta.url);

/**
 * Grouped by rough subject so a boot collection does not fill with trainers.
 * The grouping is approximate: these were selected from search results by
 * description, not inspected individually.
 */
const POOLS: Readonly<Record<string, readonly string[]>> = {
  boots: [
    'photo-1608256246200-53e635b5b65f',
    'photo-1605732440685-d0654d81aa30',
    'photo-1511283402428-355853756676',
    'photo-1706587161985-abec97ad6af8',
    'photo-1557673862-a2a470406a30',
    'photo-1558412915-9db18f878b23',
  ],
  derbies: [
    'photo-1614253429340-98120bd6d753',
    'photo-1603191659812-ee978eeeef76',
    'photo-1614252235316-8c857d38b5f4',
    'photo-1625357165350-bdbcb6d7d524',
    'photo-1668069226492-508742b03147',
    'photo-1550998358-08b4f83dc345',
  ],
  'low-profile': [
    'photo-1542291026-7eec264c27ff',
    'photo-1606107557195-0e29a4b5b4aa',
    'photo-1608231387042-66d1773070a5',
    'photo-1525966222134-fcfa99b8ae77',
    'photo-1560769629-975ec94e6a86',
    'photo-1491553895911-0055eca6402d',
  ],
  archive: [
    'photo-1563433337461-5b65f0834f3a',
    'photo-1599012307605-23a0ebe4d321',
    'photo-1534233650908-b471f2350922',
    'photo-1605733513549-de9b150bd70d',
    'photo-1449505278894-297fdb3edbc1',
    'photo-1444920275954-9dddec6b714e',
  ],
  workshop: [
    'photo-1571859856639-d54ab2c18ba0',
    'photo-1616696038562-574c18066055',
    'photo-1552422554-0d5af0c79fc6',
  ],
};

/** Second view per product, so the gallery is not the same crop twice. */
const SECOND_VIEW: Readonly<Record<string, readonly string[]>> = {
  boots: ['photo-1595950653106-6c9ebd614d3a', 'photo-1549298916-b41d501d3772'],
  derbies: ['photo-1543508282-6319a3e2621f', 'photo-1600185365926-3a2ce3cdb9eb'],
  'low-profile': ['photo-1657034321685-1fba1b2751f3', 'photo-1625037676697-295bff156f5a'],
  archive: ['photo-1533867617858-e7b97e060509', 'photo-1761115256802-d77ea8a3e0ec'],
};

interface Credit {
  readonly file: string;
  readonly id: string;
}

/**
 * Unsplash's CDN crops and encodes on request, so the bytes arriving are already
 * the exact dimensions the layout reserves. Every image container in this project
 * has a fixed aspect ratio; anything else would letterbox or shift the page.
 */
function url(id: string, width: number, height: number): string {
  const params = new URLSearchParams({
    w: String(width),
    h: String(height),
    fit: 'crop',
    // Focus the crop on the subject rather than the geometric centre.
    crop: 'entropy',
    q: '68',
    fm: 'webp',
  });
  return `https://images.unsplash.com/${id}?${params.toString()}`;
}

async function save(id: string, width: number, height: number, name: string): Promise<boolean> {
  try {
    const response = await fetch(url(id, width, height));
    if (!response.ok) {
      console.warn(`  ${name}: HTTP ${response.status}`);
      return false;
    }
    // Re-encoded locally rather than trusting the CDN's quality parameter:
    // at the sizes this project ships, Unsplash's q=68 still produced a 519 kB
    // hero, which is not an LCP image. sharp gets the same frame to ~177 kB.
    const compressed = await sharp(Buffer.from(await response.arrayBuffer()))
      .webp({ quality: 58, effort: 6, smartSubsample: true })
      .toBuffer();
    await writeFile(new URL(name, OUT), compressed);
    return true;
  } catch (error) {
    console.warn(`  ${name}: ${String(error)}`);
    return false;
  }
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const credits: Credit[] = [];
  let written = 0;

  const perCollection: Record<string, number> = {};

  for (const product of PRODUCTS) {
    const pool = POOLS[product.collectionSlug] ?? POOLS['boots'] ?? [];
    const seconds = SECOND_VIEW[product.collectionSlug] ?? [];
    const index = perCollection[product.collectionSlug] ?? 0;
    perCollection[product.collectionSlug] = index + 1;

    const primary = pool[index % pool.length];
    const secondary = seconds[index % Math.max(seconds.length, 1)] ?? primary;
    if (!primary || !secondary) continue;

    if (await save(primary, PRODUCT_W, PRODUCT_H, `${product.slug}-01.webp`)) {
      credits.push({ file: `${product.slug}-01.webp`, id: primary });
      written += 1;
    }
    if (await save(secondary, PRODUCT_W, PRODUCT_H, `${product.slug}-02.webp`)) {
      credits.push({ file: `${product.slug}-02.webp`, id: secondary });
      written += 1;
    }
    console.log(`  ${product.slug}`);
  }

  for (const [i, collection] of COLLECTIONS.entries()) {
    const pool = POOLS[collection.slug] ?? [];
    const id = pool[(i + 2) % Math.max(pool.length, 1)];
    if (!id) continue;
    if (await save(id, 1200, 900, `collection-${collection.slug}.webp`)) {
      credits.push({ file: `collection-${collection.slug}.webp`, id });
      written += 1;
    }
  }

  const workshop = POOLS['workshop'] ?? [];
  for (const [i, post] of JOURNAL_POSTS.entries()) {
    const id = workshop[i % Math.max(workshop.length, 1)];
    if (!id) continue;
    if (await save(id, 1600, 900, `journal-${post.slug}.webp`)) {
      credits.push({ file: `journal-${post.slug}.webp`, id });
      written += 1;
    }
  }

  const unique = [...new Set(credits.map((c) => c.id))];
  const lines = [
    '# Image credits',
    '',
    'Photographs from [Unsplash](https://unsplash.com), used under the',
    '[Unsplash License](https://unsplash.com/license): free to use, including',
    'commercially, with no permission needed and no attribution required.',
    'Credited here regardless.',
    '',
    'These are stand-ins. They are not photographs of the products described —',
    'this is a portfolio reference implementation with no real inventory.',
    '',
    `${unique.length} distinct photographs across ${credits.length} generated files.`,
    'Regenerate with `pnpm photos`.',
    '',
    '| File | Photo |',
    '| --- | --- |',
    ...credits.map((c) => `| \`${c.file}\` | https://unsplash.com/photos/${c.id.replace(/^photo-/, '')} |`),
    '',
  ];
  await writeFile(CREDITS, lines.join('\n'));
  console.log(`\n${written} files written, ${unique.length} distinct photographs`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
