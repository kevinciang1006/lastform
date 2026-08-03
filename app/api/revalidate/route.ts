import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import { revalidateTag } from 'next/cache';
import { isRevalidatableType, tagsFor } from '@/lib/content/tags';

/**
 * On-demand revalidation from a Sanity webhook.
 *
 * This is what makes ISR windows a floor rather than a ceiling: a product page
 * is cached for five minutes, but publishing a price change invalidates it
 * immediately instead of leaving an editor watching a clock. It is also why
 * journal posts can be fully static with no window at all.
 *
 * Tags, not paths. A path purge requires this route to know the site's URL
 * structure — which pages render which documents — so every new route that
 * reads a product is a second edit here, and forgetting it produces a page
 * that silently never updates. Tags invert that: the adapter declares what a
 * read depended on at the point of reading, and this route purges the
 * dependency without needing to know who consumed it.
 */

// Explicit rather than inherited: @sanity/webhook verifies over Node's crypto,
// and the edge runtime would resolve a different implementation.
export const runtime = 'nodejs';

interface WebhookBody {
  readonly _type?: unknown;
  readonly slug?: unknown;
}

function slugOf(body: WebhookBody): string | null {
  // The documented projection sends `"slug": slug.current`, a plain string.
  // A projection that forwards the raw slug object instead is a common
  // misconfiguration, and reading `.current` from it costs nothing here while
  // turning a silent half-purge into a working one.
  if (typeof body.slug === 'string') return body.slug;
  if (body.slug && typeof body.slug === 'object' && 'current' in body.slug) {
    const { current } = body.slug as { current?: unknown };
    if (typeof current === 'string') return current;
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env['SANITY_REVALIDATE_SECRET'];
  if (!secret) {
    return Response.json({ error: 'revalidation is not configured' }, { status: 500 });
  }

  const signature = request.headers.get(SIGNATURE_HEADER_NAME);
  if (!signature) {
    return Response.json({ error: 'missing signature' }, { status: 401 });
  }

  // Read the raw body: the signature is computed over the exact bytes sent, so
  // parsing first and re-serialising would not verify.
  const raw = await request.text();
  if (!(await isValidSignature(raw, signature, secret))) {
    return Response.json({ error: 'invalid signature' }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return Response.json({ error: 'unparseable body' }, { status: 400 });
  }

  if (!isRevalidatableType(body._type)) {
    return Response.json({ error: `unhandled type: ${String(body._type ?? 'none')}` }, { status: 400 });
  }

  // Deletes arrive with a _type but usually no slug, since there is no longer a
  // document to project one from. tagsFor() degrades to the collective tag,
  // which is what removes the deleted document from every list it appeared in.
  const tags = tagsFor(body._type, slugOf(body));
  for (const tag of tags) revalidateTag(tag);

  // Echoed back so the delivery log in Sanity shows what a publish actually
  // invalidated, rather than only that the request succeeded.
  return Response.json({ revalidated: tags, type: body._type, at: new Date().toISOString() });
}
