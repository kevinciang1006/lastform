import type { Annotation, Product, SpecRow, Variant } from '@/lib/content/schema';
import { paragraph } from './portable-text';

const SIZES = [39, 39.5, 40, 40.5, 41, 41.5, 42, 42.5, 43, 44, 45, 46] as const;
const DEFAULT_STOCK = 6;
const LOT = '26.07';

type CollectionSlug = 'boots' | 'derbies' | 'low-profile' | 'archive';

const COLLECTION_TITLES: Readonly<Record<CollectionSlug, string>> = {
  boots: 'Boots',
  derbies: 'Derbies',
  'low-profile': 'Low Profile',
  archive: 'Archive',
};

/** Single letter, matching the SKU form the design export prints on the PDP. */
const COLLECTION_CODES: Readonly<Record<CollectionSlug, string>> = {
  boots: 'B',
  derbies: 'D',
  'low-profile': 'L',
  archive: 'A',
};

/** How a shoe is put together drives its whole spec table, so it is not one
 *  template with the numbers swapped — a cup-soled trainer and a welted boot
 *  disagree about midsole, thread, and how many times they can be resoled. */
type Build = 'welted' | 'blake' | 'cupsole' | 'moccasin';

interface BuildSpec {
  readonly lining: string;
  readonly midsole: string;
  readonly outsole: string;
  readonly thread: string;
  readonly method: string;
  readonly stitch: string;
  readonly seams: string;
  readonly resoles: string;
}

const BUILDS: Readonly<Record<Build, BuildSpec>> = {
  welted: {
    lining: 'VEG CALF 0.8',
    midsole: 'OAK BARK 4.5',
    outsole: 'RUBBER 6.0',
    thread: 'LINEN 18/4',
    method: 'GOODYEAR',
    stitch: '7 SPI',
    seams: '4',
    resoles: '4 EST.',
  },
  blake: {
    lining: 'VEG CALF 0.8',
    midsole: 'LEATHER 3.5',
    outsole: 'LEATHER 5.0',
    thread: 'LINEN 20/3',
    method: 'BLAKE',
    stitch: '9 SPI',
    seams: '3',
    resoles: '3 EST.',
  },
  cupsole: {
    lining: 'MESH 0.6',
    midsole: 'EVA 8.0',
    outsole: 'GUM RUBBER 4.0',
    thread: 'NYLON 20/3',
    method: 'CUP SOLE',
    stitch: '12 SPI TOP',
    seams: '5',
    resoles: '1 EST.',
  },
  moccasin: {
    lining: 'UNLINED',
    midsole: 'NONE',
    outsole: 'CREPE 8.0',
    thread: 'LINEN 16/4',
    method: 'HAND-SEWN MOC',
    stitch: '6 SPI',
    seams: '2',
    resoles: '2 EST.',
  },
};

interface Spec {
  readonly n: string;
  readonly title: string;
  readonly slug: string;
  readonly collection: CollectionSlug;
  readonly last: string;
  readonly dropMm: number;
  readonly upperMm: number;
  readonly weightGrams: number;
  readonly price: number;
  readonly colour: string;
  readonly colourCode: string;
  readonly material: string;
  readonly build: Build;
  readonly description: readonly string[];
  /** Stock overrides by size, replacing the index-derived pattern. */
  readonly stock?: Readonly<Record<string, number>>;
  readonly annotations?: Annotation[];
  readonly featured?: true;
}

// Helpers below return mutable arrays because Zod's inferred types are mutable;
// a readonly return would not assign to Product's fields.

/** The design's five callouts for the hero, verbatim from Lastform.dc.html:244-277. */
const HERO_ANNOTATIONS: Annotation[] = [
  { label: 'FACING — 4 EYELET', value: 'OPEN 22 MM', x: 0.26, y: 0.2 },
  { label: 'VAMP — HORSEHIDE', value: '1.6 MM', x: 0.24, y: 0.42 },
  { label: 'HEEL COUNTER', value: '2.4 MM STIFF', x: 0.73, y: 0.26 },
  { label: 'HEEL STACK', value: '24 MM', x: 0.76, y: 0.57 },
  { label: 'STICK LENGTH', value: '292 MM', x: 0.48, y: 0.84 },
];

function defaultAnnotations(spec: Spec): Annotation[] {
  return [
    { label: 'LAST', value: spec.last, x: 0.3, y: 0.24 },
    { label: `UPPER — ${spec.material.toUpperCase()}`, value: `${spec.upperMm} MM`, x: 0.26, y: 0.44 },
    { label: 'HEEL DROP', value: `${spec.dropMm} MM`, x: 0.74, y: 0.62 },
    { label: 'WEIGHT', value: `${spec.weightGrams} G`, x: 0.72, y: 0.8 },
  ];
}

/** Stock is deterministic so the fixture adapter and the Sanity seed agree, and
 *  so every size-grid state is reachable without hand-maintaining 288 numbers. */
function variantsFor(index: number, overrides?: Readonly<Record<string, number>>): Variant[] {
  return SIZES.map((size) => {
    const override = overrides?.[String(size)];
    if (override !== undefined) return { size, stock: override };
    if (overrides) return { size, stock: DEFAULT_STOCK };
    const remainder = index % 3;
    if (size === 42 && remainder !== 1) return { size, stock: 0 };
    if (size === 44 && remainder !== 0) return { size, stock: 2 };
    return { size, stock: DEFAULT_STOCK };
  });
}

function materialsFor(spec: Spec): SpecRow[] {
  const build = BUILDS[spec.build];
  return [
    { label: 'UPPER', value: `${spec.material.toUpperCase()} ${spec.upperMm}` },
    { label: 'LINING', value: build.lining },
    { label: 'MIDSOLE', value: build.midsole },
    { label: 'OUTSOLE', value: build.outsole },
    { label: 'THREAD', value: build.thread },
  ];
}

function constructionFor(spec: Spec): SpecRow[] {
  const build = BUILDS[spec.build];
  return [
    { label: 'METHOD', value: build.method },
    { label: 'STITCH', value: build.stitch },
    { label: 'SEAMS', value: build.seams },
    { label: 'RESOLES', value: build.resoles },
    { label: 'MADE IN', value: 'PORTLAND, OR' },
  ];
}

function toProduct(spec: Spec, index: number): Product {
  return {
    id: `product-${spec.slug}`,
    sku: `LF-${COLLECTION_CODES[spec.collection]}${spec.n}-${spec.colourCode}`,
    lot: LOT,
    title: spec.title,
    slug: spec.slug,
    price: spec.price,
    currency: 'USD',
    colour: spec.colour,
    material: spec.material,
    upperMm: spec.upperMm,
    lastShape: spec.last,
    dropMm: spec.dropMm,
    weightGrams: spec.weightGrams,
    collectionSlug: spec.collection,
    collectionTitle: COLLECTION_TITLES[spec.collection],
    images: [
      {
        url: `/fixtures/${spec.slug}-01.webp`,
        lqip: null,
        width: 1600,
        height: 2080,
        alt: `${spec.title}, lateral elevation`,
      },
      {
        url: `/fixtures/${spec.slug}-02.webp`,
        lqip: null,
        width: 1600,
        height: 2080,
        alt: `${spec.title}, sole`,
      },
    ],
    description: spec.description.map((text, i) => paragraph(`${spec.slug}-p${i}`, text)),
    variants: variantsFor(index, spec.stock),
    annotations: spec.annotations ?? defaultAnnotations(spec),
    materials: materialsFor(spec),
    construction: constructionFor(spec),
    featured: spec.featured ?? false,
  };
}

const SPECS: readonly Spec[] = [
  {
    n: '02', title: 'Service Boot 02', slug: 'service-boot-02', collection: 'boots',
    last: 'LF-07', dropMm: 9, upperMm: 2.0, weightGrams: 784, price: 540,
    colour: 'Oxblood', colourCode: 'OXB', material: 'Horsehide', build: 'welted',
    description: [
      'Six eyelets over a 2 mm horsehide upper, closed on the LF-07 round last. The 9 mm drop sits higher than the derbies built on the same last, which is the difference between standing on a floor all day and walking on one.',
      'The heel counter is skived to 2.4 mm and stiffened. Expect the shaft to hold its shape for the first fifty hours and then take the angle of your ankle permanently.',
    ],
  },
  {
    n: '03', title: 'Logger Boot 03', slug: 'logger-boot-03', collection: 'boots',
    last: 'LF-09', dropMm: 12, upperMm: 2.2, weightGrams: 890, price: 610,
    colour: 'Black', colourCode: 'BLK', material: 'Oiled steerhide', build: 'welted',
    description: [
      'The heaviest thing we build: 890 g a side, on a 12 mm drop. The 2.2 mm steerhide is hot-stuffed with grease before cutting, so it darkens rather than scuffs.',
      'Built on the LF-09, which is 4 mm wider through the ball than the LF-07. If you have worn a boot that pinched across the joint, this is the one to measure against.',
    ],
  },
  {
    n: '06', title: 'Chukka 06', slug: 'chukka-06', collection: 'boots',
    last: 'LF-07', dropMm: 7, upperMm: 1.6, weightGrams: 556, price: 430,
    colour: 'Snuff', colourCode: 'SNF', material: 'Suede', build: 'welted',
    description: [
      'Two eyelets, unlined quarters, 1.6 mm suede. At 556 g it is the lightest welted boot in the catalogue, and the 7 mm drop puts it between the derbies and the service boot.',
      'Suede at this thickness will mark. It is reverse-side leather with the grain intact underneath, so a brush lifts the nap back rather than sealing it.',
    ],
  },
  {
    n: '11', title: 'Field Boot 11', slug: 'field-boot-11', collection: 'boots',
    last: 'LF-09', dropMm: 10, upperMm: 2.0, weightGrams: 812, price: 575,
    colour: 'Olive', colourCode: 'OLV', material: 'Roughout', build: 'welted',
    description: [
      'Roughout means the hide is used flesh-side out: the fibres you are looking at are the ones that would normally sit against the lining. It abrades in place of the grain, which is why the toe goes matte instead of cracking.',
      'A 10 mm drop on the wider LF-09 last, at 812 g. Eight eyelets, no speed hooks — the lacing holds tension through the instep rather than the ankle.',
    ],
  },
  {
    n: '08', title: 'Engineer 08', slug: 'engineer-08', collection: 'boots',
    last: 'LF-12', dropMm: 14, upperMm: 2.4, weightGrams: 940, price: 690,
    colour: 'Black', colourCode: 'BLK', material: 'Shell cordovan', build: 'welted',
    description: [
      'No laces. The fit is set by two buckles and the 14 mm drop, the steepest we cut. Shell cordovan at 2.4 mm is the densest leather here and the only one that creases in ridges rather than folds.',
      'Built on the LF-12, a straight last with almost no waist. It will feel wrong for a week. The shell does not stretch, so the break-in is your foot adjusting, not the leather.',
    ],
  },
  {
    n: '05', title: 'Moc Toe 05', slug: 'moc-toe-05', collection: 'boots',
    last: 'LF-09', dropMm: 11, upperMm: 2.0, weightGrams: 806, price: 555,
    colour: 'Rust', colourCode: 'RST', material: 'Oiled steerhide', build: 'moccasin',
    description: [
      'The toe is hand-sewn: two panels drawn together with 16/4 linen at six stitches to the inch, no lasting tacks through the seam. That seam is the only thing holding the vamp shape, which is why it is the part we quote a stitch count for.',
      'Crepe outsole, no midsole, 806 g. It resoles twice at most — the moccasin construction that makes it comfortable is the same one that limits how many times the bottom can come off.',
    ],
  },
  {
    n: '04', title: 'Grain Derby 04', slug: 'grain-derby-04', collection: 'derbies',
    last: 'LF-07', dropMm: 6, upperMm: 1.6, weightGrams: 612, price: 465,
    colour: 'Oxblood', colourCode: 'OXB', material: 'Horsehide', build: 'welted',
    featured: true,
    stock: { '40.5': 2, '42': 0, '44': 2, '46': 0 },
    annotations: HERO_ANNOTATIONS,
    description: [
      'A four-eyelet derby closed on the LF-07 round last. The upper is a single panel of 1.6 mm shell-cut horsehide; the quarters carry no lining seam across the ball, which is the joint that usually fails first.',
      'Goodyear welted at seven stitches per inch onto a 4.5 mm oak-bark midsole. Expect forty hours before the sole plates take your gait. The heel stack is 24 mm against an 18 mm forepart — a 6 mm drop.',
    ],
  },
  {
    n: '05', title: 'Plain Derby 05', slug: 'plain-derby-05', collection: 'derbies',
    last: 'LF-07', dropMm: 6, upperMm: 1.6, weightGrams: 598, price: 445,
    colour: 'Black', colourCode: 'BLK', material: 'Calf', build: 'welted',
    description: [
      'The same last and drop as the Grain Derby 04, in 1.6 mm box calf instead of horsehide. Calf takes a mirror polish that horsehide will not, and gives up about fifteen per cent of the abrasion resistance to do it.',
      'No toe cap, no brogueing, four eyelets. 598 g. There is nothing on this shoe to look at except the shape of the last, which is the point.',
    ],
  },
  {
    n: '07', title: 'Split Toe 07', slug: 'split-toe-07', collection: 'derbies',
    last: 'LF-08', dropMm: 5, upperMm: 1.4, weightGrams: 574, price: 480,
    colour: 'Walnut', colourCode: 'WAL', material: 'Calf', build: 'blake',
    description: [
      'A raised seam runs the length of the vamp, hand-closed at nine stitches to the inch. The split is structural: it lets a flat panel take the curve of the LF-08 without a dart, so the toe holds its shape as the leather relaxes.',
      'Blake stitched rather than welted, which is why it is 574 g and 5 mm at the heel. The bottom comes off three times before the insole runs out of edge to sew into.',
    ],
  },
  {
    n: '09', title: 'Apron Derby 09', slug: 'apron-derby-09', collection: 'derbies',
    last: 'LF-08', dropMm: 6, upperMm: 1.5, weightGrams: 588, price: 495,
    colour: 'Dark tan', colourCode: 'DTN', material: 'Veg calf', build: 'blake',
    description: [
      'The apron is a separate panel sewn over the vamp, which puts two layers of 1.5 mm calf across the toe and one everywhere else. That is 0.3 mm of extra material exactly where a shoe is kicked.',
      'Vegetable-tanned, so it arrives pale and ends up several shades darker depending on where you wear it. We do not photograph it after a year because your year will not look like ours.',
    ],
  },
  {
    n: '12', title: 'Wholecut 12', slug: 'wholecut-12', collection: 'derbies',
    last: 'LF-08', dropMm: 4, upperMm: 1.3, weightGrams: 542, price: 520,
    colour: 'Black', colourCode: 'BLK', material: 'Shell cordovan', build: 'blake',
    description: [
      'One piece of leather, one seam, at the heel. There is nowhere to hide a flaw, so the yield off a shell is low and the price reflects the hides we reject rather than the work in the ones we keep.',
      'The lowest drop in the catalogue at 4 mm, and the thinnest upper at 1.3 mm. 542 g. It will crease across the vamp within a week — a wholecut with no creases has not been worn.',
    ],
  },
  {
    n: '14', title: 'Norwegian 14', slug: 'norwegian-14', collection: 'derbies',
    last: 'LF-07', dropMm: 7, upperMm: 1.8, weightGrams: 664, price: 540,
    colour: 'Chestnut', colourCode: 'CHE', material: 'Grain calf', build: 'welted',
    description: [
      'The Norwegian seam turns the vamp edge upward and sews through it from the side, so the join sits proud of the surface instead of flat against it. It is the most visible stitch we do and the slowest.',
      'At 1.8 mm and 664 g this is the heaviest derby here, and the 7 mm drop is a millimetre above the others on the LF-07. Closer to a boot than the rest of this collection.',
    ],
  },
  {
    n: '09', title: 'Low Trainer 09', slug: 'low-trainer-09', collection: 'low-profile',
    last: 'LF-11', dropMm: 4, upperMm: 1.2, weightGrams: 398, price: 375,
    colour: 'Chalk', colourCode: 'CHK', material: 'Nappa', build: 'cupsole',
    description: [
      '398 g on a 4 mm drop, over an 8 mm EVA midsole in a stitched gum cup sole. The upper is 1.2 mm nappa — soft enough to need no break-in and thin enough that it will crease permanently at the flex point.',
      'Resoles once, optimistically. A cup sole is glued and top-stitched as a unit; taking it off costs the stitch holes. We say so here rather than in the returns policy.',
    ],
  },
  {
    n: '10', title: 'Court 10', slug: 'court-10', collection: 'low-profile',
    last: 'LF-11', dropMm: 3, upperMm: 1.2, weightGrams: 372, price: 355,
    colour: 'White', colourCode: 'WHT', material: 'Nappa', build: 'cupsole',
    description: [
      'The flattest thing we make: 3 mm from heel to forepart, which is close enough to level that you will feel the ground through the 8 mm midsole. 372 g.',
      'White nappa with a mesh lining. It will not stay white. The leather is unfinished on purpose so it can be cleaned rather than coated, which means it also marks.',
    ],
  },
  {
    n: '13', title: 'Runner 13', slug: 'runner-13', collection: 'low-profile',
    last: 'LF-13', dropMm: 6, upperMm: 1.0, weightGrams: 344, price: 390,
    colour: 'Grey', colourCode: 'GRY', material: 'Suede', build: 'cupsole',
    description: [
      'The lightest pair in the catalogue at 344 g, on a 1 mm suede upper — thin enough that the last shape shows through it. The LF-13 is our narrowest heel seat, 6 mm tighter than the LF-11.',
      'A 6 mm drop, which is higher than the Court and the Low Trainer despite weighing less. Drop and weight are independent, and this is the pair that demonstrates it.',
    ],
  },
  {
    n: '15', title: 'Deck 15', slug: 'deck-15', collection: 'low-profile',
    last: 'LF-11', dropMm: 4, upperMm: 1.4, weightGrams: 410, price: 340,
    colour: 'Navy', colourCode: 'NVY', material: 'Oiled calf', build: 'cupsole',
    description: [
      'A 360° lace runs through the quarters and back around the heel, so the fit closes from behind as well as above. Useful on a wet deck; the reason the eyelet count is eight on a shoe this low.',
      'Oiled calf at 1.4 mm sheds water for about an hour and then stops. This is a deck shoe, not a boot, and 410 g of it.',
    ],
  },
  {
    n: '16', title: 'Slip-On 16', slug: 'slip-on-16', collection: 'low-profile',
    last: 'LF-13', dropMm: 3, upperMm: 1.2, weightGrams: 358, price: 330,
    colour: 'Black', colourCode: 'BLK', material: 'Suede', build: 'cupsole',
    description: [
      'No fastening at all, so the fit is entirely the last and the 22 mm elastic gore at each side. On the narrow LF-13 that works; on a wider foot it will not, and there is no lace to compensate.',
      '3 mm drop, 358 g, 1.2 mm suede. The lowest and the simplest thing here. Two seams.',
    ],
  },
  {
    n: '17', title: 'Trail Low 17', slug: 'trail-low-17', collection: 'low-profile',
    last: 'LF-13', dropMm: 5, upperMm: 1.6, weightGrams: 452, price: 415,
    colour: 'Sand', colourCode: 'SND', material: 'Roughout', build: 'cupsole',
    description: [
      'The heaviest low-profile at 452 g, because 1.6 mm roughout is 0.4 mm thicker than the nappa pairs and the lugs on the outsole are 4 mm deep rather than flat.',
      'A 5 mm drop on the narrow LF-13. Flesh-side-out leather over a mesh lining: it will get dusty and stay structurally fine, which is the opposite of how the Court behaves.',
    ],
  },
  {
    n: '01', title: 'Archive Derby 01', slug: 'archive-derby-01', collection: 'archive',
    last: 'LF-02', dropMm: 8, upperMm: 1.8, weightGrams: 640, price: 425,
    colour: 'Brown', colourCode: 'BRN', material: 'Calf', build: 'welted',
    description: [
      'The first shoe we made, on the LF-02 — a last we no longer cut. It is 6 mm longer in the stick than the LF-07 at the same nominal size, so order down if you know your LF-07 fit.',
      '1.8 mm calf, 8 mm drop, 640 g. Kept in the catalogue because the pattern is still correct, not because the last is.',
    ],
  },
  {
    n: '04', title: 'Archive Boot 04', slug: 'archive-boot-04', collection: 'archive',
    last: 'LF-03', dropMm: 11, upperMm: 2.2, weightGrams: 858, price: 520,
    colour: 'Black', colourCode: 'BLK', material: 'Steerhide', build: 'welted',
    description: [
      'Built on the LF-03, the widest last in the archive — 9 mm across the ball beyond the LF-09. It was cut for a foot we stopped seeing, and we have eleven pairs of the last left.',
      '2.2 mm steerhide, 11 mm drop, 858 g. Non-hot-stuffed, so it takes polish rather than grease.',
    ],
  },
  {
    n: '18', title: 'Monk 18', slug: 'monk-18', collection: 'archive',
    last: 'LF-08', dropMm: 6, upperMm: 1.5, weightGrams: 604, price: 470,
    colour: 'Burgundy', colourCode: 'BUR', material: 'Calf', build: 'blake',
    description: [
      'A single strap and buckle across the instep instead of a lacing. The adjustment range is 14 mm, against roughly 30 mm on a four-eyelet derby, so this is a shoe that either fits or does not.',
      'Blake stitched, 604 g, 6 mm drop on the LF-08. Retired from the main catalogue because we could not keep the buckle supply consistent.',
    ],
  },
  {
    n: '19', title: 'Gibson 19', slug: 'gibson-19', collection: 'archive',
    last: 'LF-02', dropMm: 7, upperMm: 1.6, weightGrams: 622, price: 450,
    colour: 'Tan', colourCode: 'TAN', material: 'Veg calf', build: 'welted',
    description: [
      'An open-lacing pattern on the retired LF-02, which runs long — see the Archive Derby 01 for the same warning. 1.6 mm vegetable-tanned calf, undyed at the flesh side.',
      '7 mm drop, 622 g. The tan darkens faster than any other finish we sell; six months of daylight takes it two shades down.',
    ],
  },
  {
    n: '20', title: 'Camp Moc 20', slug: 'camp-moc-20', collection: 'archive',
    last: 'LF-05', dropMm: 5, upperMm: 1.8, weightGrams: 486, price: 360,
    colour: 'Fawn', colourCode: 'FWN', material: 'Moccasin calf', build: 'moccasin',
    description: [
      'Hand-sewn through the toe at six stitches to the inch, unlined, on a crepe wedge with no midsole at all. 486 g, and almost none of it under the foot.',
      'The LF-05 is a wide, low last with a 5 mm drop. Comfortable immediately and finished after two resoles — the hand-sewn seam is the shoe, and it can only be re-lasted so many times.',
    ],
  },
  {
    n: '21', title: 'Ranch 21', slug: 'ranch-21', collection: 'archive',
    last: 'LF-05', dropMm: 9, upperMm: 2.0, weightGrams: 740, price: 500,
    colour: 'Cognac', colourCode: 'COG', material: 'Roughout', build: 'welted',
    description: [
      'A pull-on with a 9 mm drop and no fastening, so the LF-05 last does the whole job of holding your heel. Two mule-ear tabs at the shaft, sewn through four layers.',
      '2.0 mm roughout, 740 g. The only welted shoe we build on the wide LF-05, which is why it is here rather than in Boots.',
    ],
  },
];

export const PRODUCTS: readonly Product[] = SPECS.map(toProduct);
