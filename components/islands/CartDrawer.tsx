'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { cartCurrency, cartSubtotal, useCart } from '@/lib/cart/store';
import { CurrencyNote } from '@/components/islands/CurrencyNote';
import { formatMoney } from '@/lib/format';

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const { lines, isOpen, announcement, setOpen, setQty, remove } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Remember what opened the drawer so focus can go back there on close —
    // otherwise a keyboard user is dumped at the top of the document.
    returnFocusRef.current = document.activeElement;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, setOpen]);

  useEffect(() => {
    if (isOpen) return;
    const target = returnFocusRef.current;
    if (target instanceof HTMLElement) target.focus();
  }, [isOpen]);

  const subtotal = cartSubtotal(lines);
  const priced = cartCurrency(lines);

  return (
    <>
      {/* Always mounted so the live region exists before the first add, or the
          announcement is inserted and read inconsistently across browsers. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-heading"
            className="absolute inset-y-0 right-0 flex w-full max-w-[27rem] flex-col border-l border-ink bg-chalk"
          >
            <div className="flex items-center justify-between border-b border-ink px-6 py-5">
              <h2 id="cart-heading" className="font-mono text-meta tracking-eyebrow text-ink">
                CART
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-meta tracking-meta text-slate hover:text-cobalt"
              >
                CLOSE
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6">
              {lines.length === 0 ? (
                <p className="py-10 text-pretty leading-[1.65] text-slate">
                  Nothing in the cart yet.
                </p>
              ) : (
                <ul className="divide-y divide-fog">
                  {lines.map((line) => (
                    <li key={`${line.productId}-${line.size}`} className="flex flex-col gap-2 py-5">
                      <div className="flex items-baseline justify-between gap-4">
                        <Link href={`/products/${line.slug}`} className="font-display text-[15px] font-extrabold uppercase">
                          {line.title}
                        </Link>
                        <span className="font-mono text-[11px] tracking-value">
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
              )}
            </div>

            <div className="flex flex-col gap-4 border-t border-ink px-6 py-5">
              <div className="flex items-baseline justify-between font-mono text-meta tracking-meta">
                <span className="text-slate">SUBTOTAL</span>
                <span className="text-[16px] tracking-value text-ink">
                  {priced === null ? 'MIXED CURRENCIES' : formatMoney(subtotal, priced)}
                </span>
              </div>
              <CurrencyNote priced={priced} />
              {/* Said plainly rather than buried in a policy page. */}
              <p className="font-mono text-spec leading-[1.9] tracking-[0.13em] text-slate">
                DEMONSTRATION ONLY — NO PAYMENT IS PROCESSED AND NO ORDER IS PLACED.
              </p>
              <Link
                href="/checkout/confirmation"
                onClick={() => setOpen(false)}
                className={`border px-4 py-[15px] text-center font-mono text-[11px] tracking-eyebrow ${
                  lines.length === 0
                    ? 'pointer-events-none border-fog bg-fog text-slate'
                    : 'border-cobalt bg-cobalt text-chalk hover:border-ink hover:bg-ink'
                }`}
                aria-disabled={lines.length === 0}
              >
                CHECKOUT
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
