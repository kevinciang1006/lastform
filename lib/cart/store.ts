import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ImageRef } from '@/lib/content/schema';

export interface CartLine {
  readonly productId: string;
  readonly slug: string;
  readonly title: string;
  readonly size: number;
  readonly price: number;
  readonly currency: string;
  readonly image: ImageRef;
  readonly qty: number;
}

// The maths lives in pure functions rather than inside the store, so it is
// testable without React and the store stays a thin persistence wrapper.

export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.qty, 0);
}

export function cartSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.price * line.qty, 0);
}

const sameLine = (line: CartLine, productId: string, size: number): boolean =>
  line.productId === productId && line.size === size;

export function addLine(lines: readonly CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find((l) => sameLine(l, line.productId, line.size));
  if (!existing) return [...lines, line];
  // Same product in a different size is a different line: they ship as two
  // pairs and are removed independently.
  return lines.map((l) => (sameLine(l, line.productId, line.size) ? { ...l, qty: l.qty + line.qty } : l));
}

export function setLineQty(
  lines: readonly CartLine[],
  productId: string,
  size: number,
  qty: number,
): CartLine[] {
  if (qty <= 0) return removeLine(lines, productId, size);
  return lines.map((l) => (sameLine(l, productId, size) ? { ...l, qty } : l));
}

export function removeLine(lines: readonly CartLine[], productId: string, size: number): CartLine[] {
  return lines.filter((l) => !sameLine(l, productId, size));
}

interface CartState {
  readonly lines: readonly CartLine[];
  /** Drawer visibility lives here because it is the one piece of state two
   *  separate islands both need — the header button opens it, the drawer
   *  closes it — and a store they already share beats a new context. */
  readonly isOpen: boolean;
  readonly announcement: string;
  readonly setOpen: (open: boolean) => void;
  readonly add: (line: CartLine) => void;
  readonly setQty: (productId: string, size: number, qty: number) => void;
  readonly remove: (productId: string, size: number) => void;
  readonly clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      announcement: '',
      setOpen: (isOpen) => set({ isOpen }),
      add: (line) =>
        set((state) => ({
          lines: addLine(state.lines, line),
          isOpen: true,
          announcement: `${line.title}, size ${line.size}, added to cart`,
        })),
      setQty: (productId, size, qty) => set((state) => ({ lines: setLineQty(state.lines, productId, size, qty) })),
      remove: (productId, size) => set((state) => ({ lines: removeLine(state.lines, productId, size) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: 'lf-cart',
      // Only the lines persist. Rehydrating an open drawer or a stale
      // announcement on page load would be a bug, not a feature.
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);
