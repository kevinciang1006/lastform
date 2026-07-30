'use client';

import { useEffect, useState } from 'react';
import { cartCount, useCart } from '@/lib/cart/store';

/** Two digits, matching the design's CART [02]. */
const pad = (n: number): string => String(n).padStart(2, '0');

export function CartButton() {
  const lines = useCart((state) => state.lines);
  const setOpen = useCart((state) => state.setOpen);
  // The server cannot know the cart, so it renders [00]. Rendering the real
  // count before hydration finishes would be a mismatch, and a header that
  // changes width on every page load is a CLS bug on every route.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const count = hydrated ? cartCount(lines) : 0;

  return (
    <button
      type="button"
      data-testid="cart-button"
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
      className="flex gap-1.5 font-mono text-meta tracking-mono text-ink hover:text-cobalt"
    >
      CART
      <span className="text-cobalt" data-testid="cart-count">
        [{pad(count)}]
      </span>
      <span className="sr-only">{count === 1 ? '1 item' : `${count} items`}</span>
    </button>
  );
}
