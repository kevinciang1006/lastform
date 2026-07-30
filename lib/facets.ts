import { stockState, type ProductCard } from '@/lib/content/schema';

export const SORT_KEYS = ['featured', 'price-asc', 'price-desc', 'weight-asc'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface PriceBand {
  readonly min: number;
  /** null means open-ended — the "500+" band has no ceiling. */
  readonly max: number | null;
}

export interface ProductQuery {
  /** A route segment on the PLP, not a query parameter; never serialised. */
  readonly collection?: string;
  readonly sizes: readonly number[];
  readonly colours: readonly string[];
  readonly materials: readonly string[];
  readonly priceBand: PriceBand | null;
  readonly sort: SortKey;
}

type RawParams = Record<string, string | string[] | undefined>;

/** Accepts both `?size=42,43` and a repeated `?size=42&size=43`. */
function toList(raw: string | string[] | undefined): string[] {
  if (raw === undefined) return [];
  const parts = Array.isArray(raw) ? raw : [raw];
  return parts
    .flatMap((part) => part.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parsePriceBand(raw: string | undefined): PriceBand | null {
  if (!raw) return null;
  const match = /^(\d+)-(\d+)?$/.exec(raw);
  if (!match) return null;
  const [, rawMin, rawMax] = match;
  if (rawMin === undefined) return null;
  const min = Number(rawMin);
  const max = rawMax === undefined ? null : Number(rawMax);
  // An inverted band is a malformed URL, not an empty result set.
  if (max !== null && max < min) return null;
  return { min, max };
}

export function parseSizes(raw: string | string[] | undefined): number[] {
  const sizes = toList(raw)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(sizes)].sort((a, b) => a - b);
}

export function parseSort(raw: string | undefined): SortKey {
  return SORT_KEYS.find((key) => key === raw) ?? 'featured';
}

function single(raw: string | string[] | undefined): string | undefined {
  return typeof raw === 'string' ? raw : undefined;
}

export function parseFacets(searchParams: RawParams): ProductQuery {
  const collection = single(searchParams['collection']);
  return {
    ...(collection === undefined ? {} : { collection }),
    sizes: parseSizes(searchParams['size']),
    // Sorted so two URLs expressing the same filter compare equal.
    colours: toList(searchParams['colour']).sort(),
    materials: toList(searchParams['material']).sort(),
    priceBand: parsePriceBand(single(searchParams['price'])),
    sort: parseSort(single(searchParams['sort'])),
  };
}

export function facetsToQueryString(query: ProductQuery): string {
  const params = new URLSearchParams();
  if (query.sizes.length > 0) params.set('size', query.sizes.join(','));
  if (query.colours.length > 0) params.set('colour', query.colours.join(','));
  if (query.materials.length > 0) params.set('material', query.materials.join(','));
  if (query.priceBand) params.set('price', `${query.priceBand.min}-${query.priceBand.max ?? ''}`);
  if (query.sort !== 'featured') params.set('sort', query.sort);
  // URLSearchParams percent-encodes the trailing hyphen of an open band as-is,
  // but decodes cleanly, so `price=600-` round-trips.
  return params.toString();
}

/** A size only counts as available when that size is actually purchasable. */
function hasSize(item: ProductCard, sizes: readonly number[]): boolean {
  if (sizes.length === 0) return true;
  return item.variants.some((v) => sizes.includes(v.size) && stockState(v.stock) !== 'out');
}

function inBand(price: number, band: PriceBand | null): boolean {
  if (!band) return true;
  return price >= band.min && (band.max === null || price <= band.max);
}

/**
 * Case-insensitive because these values live in the URL and are meant to be
 * shared and hand-edited. `?colour=black` silently matching nothing would be a
 * worse answer than matching the six black pairs.
 */
function matchesAny(value: string, allowed: readonly string[]): boolean {
  if (allowed.length === 0) return true;
  const needle = value.toLowerCase();
  return allowed.some((candidate) => candidate.toLowerCase() === needle);
}

/** Every sort ends here. Two products share a price in the catalogue, so without
 *  a final tie-break their relative order would be whatever the source array
 *  happened to hold — different between two renders of the same query. */
function byTitle(a: ProductCard, b: ProductCard): number {
  return a.title.localeCompare(b.title);
}

export function applyFacets(items: readonly ProductCard[], query: ProductQuery): ProductCard[] {
  const filtered = items.filter(
    (item) =>
      hasSize(item, query.sizes) &&
      inBand(item.price, query.priceBand) &&
      matchesAny(item.colour, query.colours) &&
      matchesAny(item.material, query.materials),
  );

  const sorted = [...filtered];
  switch (query.sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price || byTitle(a, b));
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price || byTitle(a, b));
    case 'weight-asc':
      return sorted.sort((a, b) => a.weightGrams - b.weightGrams || byTitle(a, b));
    case 'featured':
      return sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || byTitle(a, b));
  }
}
