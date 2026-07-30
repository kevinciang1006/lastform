import Link from 'next/link';
import type { Metadata } from 'next';
import { CollectionCards } from '@/components/chrome/CollectionCards';
import { PageShell } from '@/components/chrome/PageShell';
import { EditorialBlock } from '@/components/editorial/EditorialBlock';
import { AnnotatedFigure } from '@/components/product/AnnotatedFigure';
import { SpecStrip } from '@/components/product/SpecStrip';
import { contentSource } from '@/lib/content';
import type { Product } from '@/lib/content/schema';
import { formatMoney } from '@/lib/format';

// Editorial content changes hourly at most; see ROUTES.home in lib/rendering
// for the reasoning. Must stay a literal — Next.js statically analyses this
// export, so it can't be renderSpec('home').revalidate. Kept honest by
// tests/revalidate-drift.test.ts.
export const revalidate = 3600;

export const metadata: Metadata = {
  description:
    'Constructed leather footwear, specified in full. Last, drop, upper thickness and weight published for every model.',
};

function Hero({ product }: { readonly product: Product }) {
  const [image] = product.images;
  if (!image) return null;

  return (
    <section className="grid grid-cols-1 border-b border-ink lg:grid-cols-[1.4fr_1fr]">
      <div className="border-b border-ink lg:border-r lg:border-b-0">
        <AnnotatedFigure
          image={image}
          annotations={product.annotations}
          caption={`FIG. 1 — MEASURED ON LAST ${product.lastShape}, SIZE 43`}
          priority
          sizes="(min-width: 1024px) 58vw, 100vw"
        />
      </div>
      <div className="flex flex-col justify-center gap-[22px] px-10 py-11">
        <p className="font-mono text-meta tracking-eyebrow text-slate">
          {product.sku} — LOT {product.lot}
        </p>
        <h1 className="text-balance font-display text-hero leading-[0.92] font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_112]">
          {product.title}
        </h1>
        <SpecStrip
          last={product.lastShape}
          dropMm={product.dropMm}
          upperMm={product.upperMm}
          weightGrams={product.weightGrams}
        />
        <p className="max-w-[38ch] text-pretty leading-[1.65]">
          {product.material} over the {product.lastShape} last. Every measurement on this page is published rather
          than implied.
        </p>
        <div className="mt-1 flex items-center gap-[18px]">
          {/* data-lf-cta marks the A/B variant target; the ClientPrefs island
              rewrites the label from the bucket cookie after hydration, which
              is what keeps this page statically rendered. */}
          <Link
            href={`/products/${product.slug}`}
            data-lf-cta
            className="border border-cobalt bg-cobalt px-[22px] py-[14px] font-mono text-[11px] tracking-eyebrow text-chalk hover:border-ink hover:bg-ink"
          >
            VIEW SPECIFICATION
          </Link>
          <p className="font-mono text-[16px] tracking-value">{formatMoney(product.price, product.currency)}</p>
        </div>
      </div>
    </section>
  );
}

/** Shown when the CMS has no featured product, so the page still offers a route
 *  onward instead of rendering an empty column. */
function HeroFallback() {
  return (
    <section className="border-b border-ink px-10 py-20">
      <h1 className="font-display text-h1 font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_112]">
        Lastform
      </h1>
      <p className="mt-4 max-w-[46ch] text-pretty leading-[1.65] text-slate">
        No model is currently featured. The catalogue is still here.
      </p>
      <Link
        href="/collections/boots"
        className="mt-6 inline-block border-b border-cobalt pb-1 font-mono text-[11px] tracking-wide text-cobalt"
      >
        BROWSE BOOTS →
      </Link>
    </section>
  );
}

export default async function HomePage() {
  const source = contentSource();
  const [featured, collections, posts] = await Promise.all([
    source.getFeaturedProduct(),
    source.listCollections(),
    source.listJournalPosts(),
  ]);
  const [latest] = posts;

  return (
    <PageShell routeKey="home">
      {featured ? <Hero product={featured} /> : <HeroFallback />}
      <CollectionCards collections={collections} />
      {latest ? <EditorialBlock post={latest} /> : null}
    </PageShell>
  );
}
