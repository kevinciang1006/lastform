import { describe, expect, it } from 'vitest';
import { formatGrams, formatMm, formatMoney } from '@/lib/format';

describe('formatMoney', () => {
  it('renders the design house style: code, space, two decimals', () => {
    expect(formatMoney(465, 'USD')).toBe('USD 465.00');
    expect(formatMoney(540.5, 'SGD')).toBe('SGD 540.50');
  });

  it('omits decimals for zero-decimal currencies', () => {
    expect(formatMoney(7250000, 'IDR')).toBe('IDR 7,250,000');
  });

  it('formats zero without a sign', () => {
    expect(formatMoney(0, 'USD')).toBe('USD 0.00');
  });

  it('groups thousands so a four-figure price is readable', () => {
    expect(formatMoney(1250, 'USD')).toBe('USD 1,250.00');
  });

  it('passes through a currency the storefront does not localise', () => {
    expect(formatMoney(465, 'GBP')).toBe('GBP 465.00');
  });
});

describe('unit formatters', () => {
  it('renders millimetres and grams in the mono house style', () => {
    expect(formatMm(6)).toBe('6 MM');
    expect(formatMm(1.6)).toBe('1.6 MM');
    expect(formatGrams(612)).toBe('612 G');
  });

  it('does not pad a whole number with a trailing zero', () => {
    expect(formatMm(2)).toBe('2 MM');
  });
});
