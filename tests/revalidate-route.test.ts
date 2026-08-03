// @vitest-environment node
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The route calls revalidateTag, which throws outside a request scope. Stubbed
// rather than avoided so the assertions can be about which tags were purged —
// that is the whole contract between the adapter and this route.
const revalidateTag = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({ revalidateTag }));

const SECRET = 'test-webhook-secret';

// Imported after the mock is registered; a static import would bind the real
// next/cache first.
const { POST } = await import('@/app/api/revalidate/route');

interface RevalidateResponse {
  readonly revalidated?: string[];
  readonly error?: string;
  readonly type?: string;
}

async function post(body: unknown, options: { signature?: string | null; secret?: string } = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = new Headers({ 'content-type': 'application/json' });

  if (options.signature === undefined) {
    headers.set(SIGNATURE_HEADER_NAME, await encodeSignatureHeader(raw, Date.now(), options.secret ?? SECRET));
  } else if (options.signature !== null) {
    headers.set(SIGNATURE_HEADER_NAME, options.signature);
  }

  const response = await POST(new Request('https://lastform.test/api/revalidate', { method: 'POST', headers, body: raw }));
  return { status: response.status, json: (await response.json()) as RevalidateResponse };
}

beforeEach(() => {
  revalidateTag.mockClear();
  vi.stubEnv('SANITY_REVALIDATE_SECRET', SECRET);
});

describe('signature verification', () => {
  it('accepts a correctly signed payload', async () => {
    const { status, json } = await post({ _type: 'product', slug: 'grain-derby-04' });
    expect(status).toBe(200);
    expect(json.revalidated).toEqual(['product', 'product:grain-derby-04']);
  });

  it('rejects an unsigned request', async () => {
    const { status, json } = await post({ _type: 'product', slug: 'x' }, { signature: null });
    expect(status).toBe(401);
    expect(json.error).toBe('missing signature');
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('rejects a signature computed with the wrong secret', async () => {
    const { status, json } = await post({ _type: 'product', slug: 'x' }, { secret: 'not-the-secret' });
    expect(status).toBe(401);
    expect(json.error).toBe('invalid signature');
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('rejects a garbage signature header', async () => {
    const { status } = await post({ _type: 'product', slug: 'x' }, { signature: 't=1,v1=nonsense' });
    expect(status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  // The signature covers the exact bytes, so this is the case that would slip
  // through if the route ever parsed the body before verifying it.
  it('rejects a body modified after signing', async () => {
    const raw = JSON.stringify({ _type: 'product', slug: 'grain-derby-04' });
    const signature = await encodeSignatureHeader(raw, Date.now(), SECRET);
    const { status } = await post(JSON.stringify({ _type: 'product', slug: 'something-else' }), { signature });
    expect(status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('refuses to run at all when no secret is configured', async () => {
    vi.stubEnv('SANITY_REVALIDATE_SECRET', '');
    const { status, json } = await post({ _type: 'product', slug: 'x' });
    expect(status).toBe(500);
    expect(json.error).toBe('revalidation is not configured');
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe('tag selection', () => {
  it('purges the collective and per-document tag for a product', async () => {
    await post({ _type: 'product', slug: 'grain-derby-04' });
    expect(revalidateTag.mock.calls.flat()).toEqual(['product', 'product:grain-derby-04']);
  });

  it('purges products too when a collection changes, since cards name it', async () => {
    const { json } = await post({ _type: 'collection', slug: 'derbies' });
    expect(json.revalidated).toEqual(['collection', 'collection:derbies', 'product']);
  });

  it('purges everything for site settings, which renders into every page', async () => {
    const { json } = await post({ _type: 'siteSettings' });
    expect(json.revalidated).toEqual(['settings', 'product', 'collection', 'journal']);
  });

  // A delete carries a _type but no document to project a slug from.
  it('falls back to the collective tag when a delete sends no slug', async () => {
    const { status, json } = await post({ _type: 'journalPost' });
    expect(status).toBe(200);
    expect(json.revalidated).toEqual(['journal']);
  });

  // A misconfigured projection forwards the slug object rather than slug.current.
  it('accepts a raw slug object as well as a string', async () => {
    const { json } = await post({ _type: 'journalPost', slug: { _type: 'slug', current: 'a-last-is-not-a-shoe' } });
    expect(json.revalidated).toEqual(['journal', 'journal:a-last-is-not-a-shoe']);
  });

  it('rejects a type it does not know how to invalidate', async () => {
    const { status, json } = await post({ _type: 'author', slug: 'x' });
    expect(status).toBe(400);
    expect(json.error).toContain('author');
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('rejects an unparseable body that was nonetheless correctly signed', async () => {
    const { status, json } = await post('{not json');
    expect(status).toBe(400);
    expect(json.error).toBe('unparseable body');
  });
});
