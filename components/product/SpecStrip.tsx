import { formatGrams, formatMm } from '@/lib/format';

interface SpecStripProps {
  readonly last: string;
  readonly dropMm: number;
  readonly upperMm: number;
  readonly weightGrams: number;
}

/**
 * The signature element: a mono readout that sits under every product name like
 * a drawing's title block. A description list rather than a grid of divs, so the
 * label-to-value pairing survives a screen reader instead of being read as eight
 * unrelated fragments.
 */
export function SpecStrip({ last, dropMm, upperMm, weightGrams }: SpecStripProps) {
  const cells: readonly [string, string][] = [
    ['LAST', last],
    ['DROP', formatMm(dropMm)],
    ['UPPER', formatMm(upperMm)],
    ['WEIGHT', formatGrams(weightGrams)],
  ];

  return (
    <dl className="grid grid-cols-4 border-y border-ink">
      {cells.map(([label, value], index) => (
        <div
          key={label}
          className={`px-3 pt-[11px] pb-[13px] ${index === cells.length - 1 ? '' : 'border-r border-fog'}`}
        >
          <dt className="font-mono text-spec tracking-mono text-slate">{label}</dt>
          <dd className="mt-[5px] font-mono text-value tracking-value text-cobalt">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
