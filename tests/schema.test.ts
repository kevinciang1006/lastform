import { describe, expect, it } from 'vitest';
import { annotationSchema, productSchema, stockState, variantSchema } from '@/lib/content/schema';

describe('stockState', () => {
  it('classifies the three states the size grid must show', () => {
    expect(stockState(0)).toBe('out');
    expect(stockState(1)).toBe('low');
    expect(stockState(2)).toBe('low');
    expect(stockState(3)).toBe('in');
    expect(stockState(40)).toBe('in');
  });
});

describe('annotationSchema', () => {
  it('accepts normalised coordinates', () => {
    expect(annotationSchema.safeParse({ label: 'HEEL DROP', value: '6 MM', x: 0.32, y: 0.8 }).success).toBe(true);
  });

  it('rejects coordinates outside 0-1, which would draw leader lines off the image', () => {
    expect(annotationSchema.safeParse({ label: 'X', value: 'Y', x: 1.4, y: 0.5 }).success).toBe(false);
    expect(annotationSchema.safeParse({ label: 'X', value: 'Y', x: -0.1, y: 0.5 }).success).toBe(false);
  });
});

describe('variantSchema', () => {
  it('rejects negative stock', () => {
    expect(variantSchema.safeParse({ size: 43, stock: -1 }).success).toBe(false);
  });
});

describe('productSchema', () => {
  it('rejects a product with no images, which would break the PDP gallery', () => {
    const result = productSchema.safeParse({ id: 'x', images: [] });
    expect(result.success).toBe(false);
  });
});
