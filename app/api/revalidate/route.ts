import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * On-demand revalidation from a Sanity webhook.
 *
 * This is what makes ISR windows a floor rather than a ceiling: a product page
 * is cached for five minutes, but publishing a price change invalidates it
 * immediately instead of leaving an editor watching a clock. It is also why
 * journal posts can be fully static with no window at all.
 */
interface WebhookBody {
  readonly _type?: string;
  readonly slug?: string;
  readonly collectionSlug?: string;
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

  const revalidated: string[] = [];
  const path = (p: string): void => {
    revalidatePath(p);
    revalidated.push(p);
  };

  switch (body._type) {
    case 'product':
      if (body.slug) {
        path(`/products/${body.slug}`);
        revalidateTag(`product:${body.slug}`);
      }
      if (body.collectionSlug) path(`/collections/${body.collectionSlug}`);
      // The homepage carries the featured product.
      path('/');
      break;
    case 'journalPost':
      if (body.slug) path(`/journal/${body.slug}`);
      path('/');
      break;
    case 'collection':
      if (body.slug) path(`/collections/${body.slug}`);
      path('/');
      break;
    case 'siteSettings':
      // Announcements and footer links are in every page's chrome.
      path('/');
      break;
    default:
      return Response.json({ error: `unhandled type: ${body._type ?? 'none'}` }, { status: 400 });
  }

  return Response.json({ revalidated, at: new Date().toISOString() });
}
