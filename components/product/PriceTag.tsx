import { formatMoney } from '@/lib/format';

interface PriceTagProps {
  readonly amount: number;
  readonly currency: string;
  readonly size?: 'sm' | 'lg';
  /** Mono aside the design sets beside the PDP price, e.g. "INCL. RESOLE 1". */
  readonly note?: string;
}

export function PriceTag({ amount, currency, size = 'sm', note }: PriceTagProps) {
  return (
    <div className="flex items-baseline gap-[14px]">
      <span className={size === 'lg' ? 'font-mono text-[26px] tracking-[0.02em]' : 'font-mono text-[11px] tracking-value'}>
        {formatMoney(amount, currency)}
      </span>
      {note === undefined ? null : (
        <span className="font-mono text-meta tracking-meta text-slate">{note}</span>
      )}
    </div>
  );
}
