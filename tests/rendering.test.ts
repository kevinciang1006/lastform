import { describe, expect, it } from 'vitest';
import { ROUTES, badgeLine, renderSpec, routeCounts } from '@/lib/rendering';

describe('route manifest', () => {
  it('gives every route a non-empty reasoning', () => {
    for (const [key, spec] of Object.entries(ROUTES)) {
      expect(spec.reasoning.length, `${key} has no reasoning`).toBeGreaterThan(20);
    }
  });

  it('gives ISR routes a positive revalidate window', () => {
    for (const [key, spec] of Object.entries(ROUTES)) {
      if (spec.strategy === 'ISR') {
        expect(typeof spec.revalidate, `${key}`).toBe('number');
        expect(spec.revalidate, `${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('never gives a revalidate window to a route that cannot use one', () => {
    for (const key of ['search', 'stock', 'cart'] as const) {
      expect(renderSpec(key).revalidate, key).toBe(false);
    }
  });

  it('matches the approved strategy per route', () => {
    expect(renderSpec('home').strategy).toBe('ISR');
    expect(renderSpec('home').revalidate).toBe(3600);
    expect(renderSpec('product').strategy).toBe('ISR');
    expect(renderSpec('product').revalidate).toBe(300);
    expect(renderSpec('product').onDemand).toBe(true);
    expect(renderSpec('collection').strategy).toBe('SSG');
    expect(renderSpec('search').strategy).toBe('SSR');
    expect(renderSpec('stock').strategy).toBe('EDGE');
    expect(renderSpec('engineering').strategy).toBe('SSG');
  });
});

describe('badgeLine', () => {
  const at = new Date('2026-07-28T09:14:02.000Z');

  it('prints strategy, timestamp and window for an ISR route', () => {
    expect(badgeLine(renderSpec('product'), at)).toBe(
      'RENDERED ISR · 2026-07-28 09:14:02 UTC · REVALIDATE 300S',
    );
  });

  it('prints AT BUILD for a static route', () => {
    expect(badgeLine(renderSpec('engineering'), at)).toBe(
      'RENDERED SSG · 2026-07-28 09:14:02 UTC · AT BUILD',
    );
  });

  it('prints NO-STORE for an uncached route', () => {
    expect(badgeLine(renderSpec('search'), at)).toBe(
      'RENDERED SSR · 2026-07-28 09:14:02 UTC · NO-STORE',
    );
  });
});

describe('routeCounts', () => {
  it('counts static and dynamic routes from the manifest, not by hand', () => {
    const counts = routeCounts();
    expect(counts.static + counts.dynamic).toBe(Object.keys(ROUTES).length);
    expect(counts.static).toBeGreaterThan(0);
    expect(counts.dynamic).toBeGreaterThan(0);
  });
});
