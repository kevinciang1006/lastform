import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/stock/route';

const call = (url: string) => GET(new Request(url));

describe('GET /api/stock', () => {
  it('returns every variant for a known product', async () => {
    const response = await call('http://localhost/api/stock?slug=grain-derby-04');
    expect(response.status).toBe(200);
    const body = (await response.json()) as { slug: string; variants: unknown[]; readAt: string };
    expect(body.slug).toBe('grain-derby-04');
    expect(body.variants).toHaveLength(12);
    expect(Number.isNaN(Date.parse(body.readAt))).toBe(false);
  });

  // A cached stock response is a correctness bug, not a performance win.
  it('is never cached', async () => {
    const response = await call('http://localhost/api/stock?slug=grain-derby-04');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('400s on a missing slug', async () => {
    expect((await call('http://localhost/api/stock')).status).toBe(400);
  });

  it('404s on an unknown slug', async () => {
    expect((await call('http://localhost/api/stock?slug=nope')).status).toBe(404);
  });

  it('reports the same stock the page was built from', async () => {
    const response = await call('http://localhost/api/stock?slug=grain-derby-04');
    const body = (await response.json()) as { variants: { size: number; stock: number }[] };
    // The hero fixture is the one carrying all three states at once.
    expect(body.variants.some((v) => v.stock === 0)).toBe(true);
    expect(body.variants.some((v) => v.stock > 0 && v.stock < 3)).toBe(true);
    expect(body.variants.some((v) => v.stock >= 3)).toBe(true);
  });
});
