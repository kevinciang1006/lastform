export type Currency = 'USD' | 'IDR' | 'SGD' | 'DKK';

export const CURRENCY_BY_COUNTRY: Readonly<Record<string, Currency>> = {
  ID: 'IDR',
  SG: 'SGD',
  DK: 'DKK',
  US: 'USD',
};

export function currencyForCountry(country: string | null | undefined): Currency {
  if (!country) return 'USD';
  return CURRENCY_BY_COUNTRY[country.toUpperCase()] ?? 'USD';
}

/** Currencies with no minor unit, where "465.00" would be wrong rather than pedantic. */
const ZERO_DECIMAL: ReadonlySet<string> = new Set(['IDR', 'JPY', 'KRW', 'VND']);

/**
 * Takes a plain string rather than Currency: a product carries whatever
 * three-letter code the CMS holds, which may be one the storefront does not
 * localise. Displaying that as-is beats failing.
 */
export function formatMoney(amount: number, currency: string): string {
  const fractionDigits = ZERO_DECIMAL.has(currency) ? 0 : 2;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
  return `${currency} ${formatted}`;
}

export function formatMm(mm: number): string {
  return `${mm} MM`;
}

export function formatGrams(grams: number): string {
  return `${grams} G`;
}
