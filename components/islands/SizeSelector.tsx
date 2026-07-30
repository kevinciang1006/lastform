'use client';

import { useEffect, useState } from 'react';
import { stockState, variantSchema, type Variant } from '@/lib/content/schema';

interface SizeSelectorProps {
  readonly slug: string;
  /** From the ISR snapshot, so the grid is complete in the server HTML. */
  readonly variants: readonly Variant[];
  readonly onSelect?: (size: number | null) => void;
}

const CELL_BASE =
  'flex min-h-[52px] flex-col items-center justify-center gap-[3px] bg-chalk px-1 pt-[11px] pb-[9px] font-mono transition-shadow';

function SizeCell({
  variant,
  selected,
  onChoose,
}: {
  readonly variant: Variant;
  readonly selected: boolean;
  readonly onChoose: () => void;
}) {
  const state = stockState(variant.stock);
  const out = state === 'out';

  // Never colour alone: every state also carries a word, and out-of-stock is
  // struck through as well as labelled.
  const note = out ? 'OUT' : state === 'low' ? 'LOW' : 'IN';

  return (
    <button
      type="button"
      aria-pressed={selected}
      // aria-disabled rather than disabled: the cell stays focusable, so a
      // keyboard user can reach it and hear why it cannot be chosen.
      aria-disabled={out}
      onClick={out ? undefined : onChoose}
      className={[
        CELL_BASE,
        out ? 'cursor-not-allowed bg-fog/50 text-slate line-through' : 'cursor-pointer text-ink',
        state === 'low' && !out ? 'shadow-[inset_0_-2px_0_var(--color-ochre)]' : '',
        selected ? 'bg-ink text-chalk shadow-[inset_0_0_0_2px_var(--color-cobalt)]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="text-[14px] tracking-[0.02em]">{variant.size}</span>
      <span className="text-[8px] tracking-meta">{note}</span>
    </button>
  );
}

/**
 * The size grid, and the one place the site reads live data.
 *
 * The PDP is ISR: its HTML, including this grid, may have been generated up to
 * five minutes ago. That is fine for a spec sheet and wrong for stock, so after
 * hydration this asks the uncached /api/stock route what is actually available
 * and replaces the grid only if the answer differs. First paint is complete
 * from the server snapshot, so nothing shifts and nothing blocks.
 */
export function SizeSelector({ slug, variants, onSelect }: SizeSelectorProps) {
  const [live, setLive] = useState<readonly Variant[]>(variants);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/stock?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        const parsed = variantSchema
          .array()
          .safeParse((payload as { variants?: unknown }).variants);
        if (parsed.success) setLive(parsed.data);
      } catch {
        // A failed refresh leaves the ISR snapshot in place, which is strictly
        // better than an error state on a page that already rendered correctly.
      }
    })();
    return () => {
      controller.abort();
    };
  }, [slug]);

  const choose = (size: number): void => {
    const next = selected === size ? null : size;
    setSelected(next);
    onSelect?.(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between font-mono text-meta tracking-mono">
        <span className="text-ink">SIZE — EU</span>
        <span className="text-slate">
          SELECTED <span className="text-cobalt">{selected === null ? '—' : `EU ${selected}`}</span>
        </span>
      </div>
      <div role="group" aria-label="Size" className="grid grid-cols-4 gap-px border border-fog bg-fog">
        {live.map((variant) => (
          <SizeCell
            key={variant.size}
            variant={variant}
            selected={selected === variant.size}
            onChoose={() => choose(variant.size)}
          />
        ))}
      </div>
    </div>
  );
}
