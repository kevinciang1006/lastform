import { describe, expect, it } from 'vitest';
import {
  addLine,
  cartCount,
  cartCurrency,
  cartSubtotal,
  removeLine,
  setLineQty,
  type CartLine,
} from '@/lib/cart/store';
import { isDocumentFresh } from '@/components/islands/ClientPrefs';

const line = (over: Partial<CartLine> = {}): CartLine => ({
  productId: 'p1',
  slug: 'grain-derby-04',
  title: 'Grain Derby 04',
  size: 43,
  price: 465,
  currency: 'USD',
  qty: 1,
  image: { url: '/x.webp', lqip: null, width: 10, height: 10, alt: 'x' },
  ...over,
});

describe('cart maths', () => {
  it('counts every unit, not every line', () => {
    expect(cartCount([line({ qty: 2 }), line({ productId: 'p2', qty: 3 })])).toBe(5);
  });

  it('subtotals price times quantity', () => {
    expect(cartSubtotal([line({ qty: 2 }), line({ productId: 'p2', price: 100, qty: 3 })])).toBe(1230);
  });

  it('is zero for an empty cart', () => {
    expect(cartCount([])).toBe(0);
    expect(cartSubtotal([])).toBe(0);
  });
});

describe('cartCurrency', () => {
  it('reports the currency the lines are actually priced in', () => {
    expect(cartCurrency([line(), line({ productId: 'p2' })])).toBe('USD');
  });

  it('reports whatever the lines carry, not a hardcoded default', () => {
    expect(cartCurrency([line({ currency: 'SGD' })])).toBe('SGD');
  });

  it('has no currency for an empty cart', () => {
    expect(cartCurrency([])).toBeNull();
  });

  // Nothing converts, so a cart holding two currencies has no single total that
  // is true. Naming either one would misprice the other.
  it('refuses to pick one when the lines disagree', () => {
    expect(cartCurrency([line({ currency: 'USD' }), line({ productId: 'p2', currency: 'SGD' })])).toBeNull();
  });
});

describe('addLine', () => {
  it('merges quantity for the same product and size', () => {
    const result = addLine([line({ qty: 1 })], line({ qty: 2 }));
    expect(result).toHaveLength(1);
    expect(result[0]?.qty).toBe(3);
  });

  it('keeps different sizes of the same product as separate lines', () => {
    expect(addLine([line({ size: 43 })], line({ size: 44 }))).toHaveLength(2);
  });

  it('does not mutate the input', () => {
    const original = [line({ qty: 1 })];
    addLine(original, line({ qty: 2 }));
    expect(original[0]?.qty).toBe(1);
  });
});

describe('setLineQty', () => {
  it('updates the matching line', () => {
    expect(setLineQty([line()], 'p1', 43, 4)[0]?.qty).toBe(4);
  });

  it('removes the line when quantity reaches zero', () => {
    expect(setLineQty([line()], 'p1', 43, 0)).toHaveLength(0);
  });

  it('never produces a negative quantity', () => {
    expect(setLineQty([line()], 'p1', 43, -5)).toHaveLength(0);
  });

  it('ignores a line that is not in the cart', () => {
    expect(setLineQty([line()], 'nope', 43, 4)).toHaveLength(1);
  });

  it('touches only the matching size', () => {
    const lines = [line({ size: 43 }), line({ size: 44 })];
    const result = setLineQty(lines, 'p1', 43, 9);
    expect(result.find((l) => l.size === 43)?.qty).toBe(9);
    expect(result.find((l) => l.size === 44)?.qty).toBe(1);
  });
});

describe('removeLine', () => {
  it('removes only the matching product and size', () => {
    const result = removeLine([line({ size: 43 }), line({ size: 44 })], 'p1', 43);
    expect(result).toHaveLength(1);
    expect(result[0]?.size).toBe(44);
  });
});

describe('isDocumentFresh', () => {
  const T0 = Date.parse('2026-07-28T09:00:00.000Z');

  it('is fresh inside its window and stale outside it', () => {
    expect(isDocumentFresh('2026-07-28T08:59:00.000Z', '300', 'ISR', T0)).toBe(true);
    expect(isDocumentFresh('2026-07-28T08:50:00.000Z', '300', 'ISR', T0)).toBe(false);
  });

  it('always treats per-request routes as fresh', () => {
    expect(isDocumentFresh('2026-07-28T09:00:00.000Z', '', 'SSR', T0)).toBe(true);
    expect(isDocumentFresh('2026-07-28T09:00:00.000Z', '', 'EDGE', T0)).toBe(true);
  });

  it('never treats a windowless build-time page as fresh', () => {
    expect(isDocumentFresh('2026-07-28T08:59:59.000Z', '', 'SSG', T0)).toBe(false);
  });

  it('refuses to guess on a bad or future timestamp', () => {
    expect(isDocumentFresh('not-a-date', '300', 'ISR', T0)).toBe(false);
    expect(isDocumentFresh('2026-07-28T09:10:00.000Z', '300', 'ISR', T0)).toBe(false);
  });
});
