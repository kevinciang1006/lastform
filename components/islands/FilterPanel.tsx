'use client';

import { usePathname, useRouter } from 'next/navigation';
import { facetsToQueryString, SORT_KEYS, type ProductQuery, type SortKey } from '@/lib/facets';
import type { AvailableFacets } from '@/lib/content/source';

interface FilterPanelProps {
  readonly facets: AvailableFacets;
  readonly query: ProductQuery;
  readonly resultCount: number;
}

/** Values verified against the seeded catalogue to split it 6 / 9 / 9. Not
 *  0-300: the cheapest product is 330, so that band could never return a
 *  result. Not 400-500 either: bands are inclusive at both ends and one product
 *  is priced at exactly 500, which would put it in two bands at once. */
const PRICE_BANDS: readonly { readonly value: string; readonly label: string }[] = [
  { value: '0-400', label: 'UNDER 400' },
  { value: '400-499', label: '400 — 499' },
  { value: '500-', label: '500 AND OVER' },
];

const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  featured: 'FEATURED',
  'price-asc': 'PRICE, LOW FIRST',
  'price-desc': 'PRICE, HIGH FIRST',
  'weight-asc': 'WEIGHT, LIGHT FIRST',
};

function toggle(values: readonly string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

/**
 * Filter state lives in the URL, not in this component. Every control computes
 * the next ProductQuery and hands it to the router; the server re-renders from
 * the resulting search params. That is what makes a filtered view shareable,
 * reloadable and readable on the server rather than a state blob only this
 * component understands.
 */
export function FilterPanel({ facets, query, resultCount }: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();

  const apply = (next: ProductQuery): void => {
    const qs = facetsToQueryString(next);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const isFiltered =
    query.sizes.length > 0 ||
    query.colours.length > 0 ||
    query.materials.length > 0 ||
    query.priceBand !== null ||
    query.sort !== 'featured';

  return (
    <div className="flex flex-col gap-6 border-b border-ink px-10 py-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-spec tracking-mono text-slate">SIZE — EU</legend>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {facets.sizes.map((size) => (
              <label key={size} className="flex items-center gap-1.5 font-mono text-meta tracking-meta">
                <input
                  type="checkbox"
                  checked={query.sizes.includes(size)}
                  onChange={() =>
                    apply({
                      ...query,
                      sizes: query.sizes.includes(size)
                        ? query.sizes.filter((s) => s !== size)
                        : [...query.sizes, size].sort((a, b) => a - b),
                    })
                  }
                  className="size-3 accent-cobalt"
                />
                {size}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-spec tracking-mono text-slate">COLOUR</legend>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {facets.colours.map((colour) => (
              <label key={colour} className="flex items-center gap-1.5 font-mono text-meta tracking-meta">
                <input
                  type="checkbox"
                  checked={query.colours.includes(colour)}
                  onChange={() => apply({ ...query, colours: toggle(query.colours, colour) })}
                  className="size-3 accent-cobalt"
                />
                {colour.toUpperCase()}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-spec tracking-mono text-slate">PRICE — USD</legend>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {PRICE_BANDS.map((band) => {
              const active = band.value === (query.priceBand ? `${query.priceBand.min}-${query.priceBand.max ?? ''}` : '');
              return (
                <label key={band.value} className="flex items-center gap-1.5 font-mono text-meta tracking-meta">
                  <input
                    type="radio"
                    name="price"
                    checked={active}
                    onChange={() => {
                      const [min, max] = band.value.split('-');
                      apply({
                        ...query,
                        priceBand: { min: Number(min), max: max === '' || max === undefined ? null : Number(max) },
                      });
                    }}
                    className="size-3 accent-cobalt"
                  />
                  {band.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="flex items-center gap-5">
        <label className="flex items-center gap-2 font-mono text-meta tracking-meta">
          <span className="text-slate">SORT</span>
          <select
            value={query.sort}
            onChange={(event) => apply({ ...query, sort: event.target.value as SortKey })}
            className="border border-fog bg-chalk px-2 py-1 font-mono text-meta tracking-meta"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        {isFiltered ? (
          <button
            type="button"
            onClick={() => apply({ ...query, sizes: [], colours: [], materials: [], priceBand: null, sort: 'featured' })}
            className="border-b border-cobalt pb-0.5 font-mono text-meta tracking-meta text-cobalt"
          >
            CLEAR FILTERS
          </button>
        ) : null}

        <p role="status" aria-live="polite" className="font-mono text-meta tracking-meta text-slate">
          <span data-testid="result-count">{resultCount}</span> RESULTS
        </p>
      </div>
    </div>
  );
}
