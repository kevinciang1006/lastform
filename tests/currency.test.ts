import { describe, expect, it } from 'vitest';
import { currencyForCountry } from '@/lib/format';

describe('currencyForCountry', () => {
  it('maps the four supported countries', () => {
    expect(currencyForCountry('ID')).toBe('IDR');
    expect(currencyForCountry('SG')).toBe('SGD');
    expect(currencyForCountry('DK')).toBe('DKK');
    expect(currencyForCountry('US')).toBe('USD');
  });

  it('is case-insensitive because header casing is not guaranteed', () => {
    expect(currencyForCountry('id')).toBe('IDR');
  });

  it('falls back to USD for unknown, missing or empty input', () => {
    expect(currencyForCountry('JP')).toBe('USD');
    expect(currencyForCountry(null)).toBe('USD');
    expect(currencyForCountry(undefined)).toBe('USD');
    expect(currencyForCountry('')).toBe('USD');
  });
});
