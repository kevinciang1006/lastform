import { contentSource } from '@/lib/content';

export const runtime = 'edge';

// Stock is the one value that must never be served stale; see ROUTES.stock in
// lib/rendering. A cached response here would be a correctness bug, not a
// performance win.
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) {
    return Response.json({ error: 'slug is required' }, { status: 400 });
  }

  const variants = await contentSource().getStock(slug);
  if (variants.length === 0) {
    return Response.json({ error: 'unknown product' }, { status: 404 });
  }

  return Response.json(
    { slug, variants, readAt: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
