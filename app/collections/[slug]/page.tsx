import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageShell } from '@/components/chrome/PageShell';
import { FilterPanel } from '@/components/islands/FilterPanel';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductImage } from '@/components/product/ProductImage';
import { contentSource } from '@/lib/content';
import { parseFacets } from '@/lib/facets';

// Four finite, high-traffic collections; see ROUTES.collection in lib/rendering.
// Must stay a literal for Next.js to analyse it. Kept honest by
// tests/revalidate-drift.test.ts.
export const revalidate = 3600;

// A slug outside the four still renders, via ISR, rather than 404ing at the
// edge of the build — new collections should not need a deploy.
export const dynamicParams = true;

type Params = Promise<{ readonly slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateStaticParams() {
  return (await contentSource().getCollectionSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const collection = await contentSource().getCollection(slug);
  if (!collection) return { title: 'Not found' };
  return { title: collection.title, description: collection.blurb };
}

export default async function CollectionPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const source = contentSource();
  const collection = await source.getCollection(slug);
  if (!collection) notFound();

  // Reading searchParams renders this request dynamically. That is intended:
  // the unfiltered URL is prerendered at build, and a filtered one is computed
  // on demand — which is the whole reason filter state lives in the URL.
  const query = { ...parseFacets(await searchParams), collection: slug };
  const { items, total, facets } = await source.listProducts(query);

  return (
    <PageShell routeKey="collection" activeHref={`/collections/${slug}`}>
      <section className="grid grid-cols-1 border-b border-ink lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col justify-center gap-4 px-10 py-14">
          <p className="font-mono text-meta tracking-eyebrow text-slate">COLLECTION</p>
          <h1 className="font-display text-h1 leading-[0.94] font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_112]">
            {collection.title}
          </h1>
          <p className="max-w-[46ch] text-pretty leading-[1.65] text-slate">{collection.blurb}</p>
        </div>
        <div className="relative aspect-[1200/900] border-t border-ink bg-fog/30 lg:border-t-0 lg:border-l">
          <ProductImage
            image={collection.heroImage}
            priority
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      </section>

      <FilterPanel facets={facets} query={query} resultCount={total} />

      <div className="px-10 py-10">
        {items.length === 0 ? (
          <div data-testid="empty-state" className="border border-fog px-8 py-12">
            <h2 className="font-display text-h3 font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_110]">
              Nothing matches those filters
            </h2>
            <p className="mt-3 max-w-[46ch] text-pretty leading-[1.65] text-slate">
              Widen the filters, or start again from the whole of {collection.title}.
            </p>
            <Link
              href={`/collections/${slug}`}
              className="mt-6 inline-block border-b border-cobalt pb-1 font-mono text-[11px] tracking-wide text-cobalt"
            >
              CLEAR FILTERS →
            </Link>
          </div>
        ) : (
          <ProductGrid products={items} priorityCount={4} />
        )}
      </div>
    </PageShell>
  );
}
