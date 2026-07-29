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
