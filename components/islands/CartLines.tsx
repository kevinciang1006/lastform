'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cartSubtotal, useCart } from '@/lib/cart/store';
import { useClientPrefs } from '@/components/islands/ClientPrefs';
import { formatMoney } from '@/lib/format';

/**
 * The full-page cart, and the confirmation summary. Both read the same
 * localStorage-backed store the drawer does, so this is not a second source of
 * truth — it is the same one rendered at a different size.
 *
 * Part of the CartDrawer island's boundary rather than an eighth island: it is
 * client-only for exactly the same reason and shares its store.
 */
function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function CartLines() {
  const { lines, setQty, remove } = useCart();
  const { currency } = useClientPrefs();
  const hydrated = useHydrated();

  if (!hydrated) return <p className="font-mono text-meta tracking-meta text-slate">READING CART…</p>;

  if (lines.length === 0) {
    return (
      <div data-testid="empty-state" className="border border-fog px-8 py-12">
        <h2 className="font-display text-h3 font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_110]">
          Nothing in the cart
        </h2>
        <p className="mt-3 max-w-[46ch] text-pretty leading-[1.65] text-slate">
          Every model publishes its last, drop, upper thickness and weight before you commit to anything.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-fog border-y border-ink">
        {lines.map((line) => (
          <li key={`${line.productId}-${line.size}`} className="flex flex-col gap-2 py-5">
            <div className="flex items-baseline justify-between gap-4">
              <Link href={`/products/${line.slug}`} className="font-display text-[17px] font-extrabold uppercase">
                {line.title}
              </Link>
              <span className="font-mono text-[13px] tracking-value">
                {formatMoney(line.price * line.qty, line.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono text-meta tracking-meta text-slate">
              <span>EU {line.size}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Decrease quantity of ${line.title} size ${line.size}`}
                  onClick={() => setQty(line.productId, line.size, line.qty - 1)}
                  className="border border-fog px-2 hover:border-cobalt hover:text-cobalt"
                >
                  −
                </button>
                <span className="text-ink">{line.qty}</span>
                <button
                  type="button"
                  aria-label={`Increase quantity of ${line.title} size ${line.size}`}
                  onClick={() => setQty(line.productId, line.size, line.qty + 1)}
                  className="border border-fog px-2 hover:border-cobalt hover:text-cobalt"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => remove(line.productId, line.size)}
                  className="border-b border-slate hover:border-cobalt hover:text-cobalt"
                >
                  REMOVE
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between py-5 font-mono text-meta tracking-meta">
        <span className="text-slate">SUBTOTAL</span>
        <span className="text-[18px] tracking-value text-ink">{formatMoney(cartSubtotal(lines), currency)}</span>
      </div>
      <Link
        href="/checkout/confirmation"
        className="border border-cobalt bg-cobalt px-4 py-[15px] text-center font-mono text-[11px] tracking-eyebrow text-chalk hover:border-ink hover:bg-ink"
      >
        CHECKOUT
      </Link>
    </div>
  );
}

/** Shows what was in the cart, then empties it — the order is "placed". */
export function CheckoutSummary() {
  const { lines, clear } = useCart();
  const { currency } = useClientPrefs();
  const hydrated = useHydrated();
  const [snapshot] = useState(() => lines);

  useEffect(() => {
    if (lines.length > 0) clear();
    // Runs once: the snapshot above is what gets rendered from here on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hydrated) return null;
  if (snapshot.length === 0) {
    return <p className="font-mono text-meta tracking-meta text-slate">NO ITEMS.</p>;
  }

  return (
    <dl className="flex flex-col border-y border-ink">
      {snapshot.map((line) => (
        <div key={`${line.productId}-${line.size}`} className="flex justify-between border-b border-fog py-3 font-mono text-meta tracking-meta">
          <dt className="text-slate">
            {line.title.toUpperCase()} — EU {line.size} × {line.qty}
          </dt>
          <dd className="text-ink">{formatMoney(line.price * line.qty, line.currency)}</dd>
        </div>
      ))}
      <div className="flex justify-between py-4 font-mono text-meta tracking-meta">
        <dt className="text-slate">SUBTOTAL</dt>
        <dd className="text-[16px] tracking-value text-ink">{formatMoney(cartSubtotal(snapshot), currency)}</dd>
      </div>
    </dl>
  );
}
