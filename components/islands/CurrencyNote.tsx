'use client';

import { useClientPrefs } from '@/components/islands/ClientPrefs';

/**
 * States the currency the visitor's region uses alongside the one the catalogue
 * is priced in, when they differ.
 *
 * The edge middleware resolves a currency from the request's country and parks
 * it in a cookie. That is a fact about where the visitor is; it is not a price.
 * No exchange rate exists anywhere in this codebase, so the only honest label
 * for an amount is the currency that amount is already denominated in. This
 * line keeps the detected region visible without repricing anything.
 *
 * Not an eighth island: it renders only inside the cart components, which are
 * client-only already, and adds no boundary of its own.
 */
export function CurrencyNote({ priced }: { readonly priced: string | null }) {
  const { currency } = useClientPrefs();
  if (priced === null || currency === priced) return null;

  return (
    <p
      data-testid="currency-note"
      className="font-mono text-spec leading-[1.9] tracking-[0.13em] text-slate"
    >
      PRICED IN {priced} — YOUR REGION USES {currency}. NO CONVERSION IS APPLIED.
    </p>
  );
}
