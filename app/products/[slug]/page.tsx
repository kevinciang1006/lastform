import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageShell } from '@/components/chrome/PageShell';
import { GalleryThumbs } from '@/components/islands/GalleryThumbs';
import { SizeSelector } from '@/components/islands/SizeSelector';
import { AnnotatedFigure } from '@/components/product/AnnotatedFigure';
import { PriceTag } from '@/components/product/PriceTag';
import { Recommendations, RecommendationsSkeleton } from '@/components/product/Recommendations';
import { SpecStrip } from '@/components/product/SpecStrip';
import { SpecTable } from '@/components/product/SpecTable';
import { StockLegend } from '@/components/product/StockLegend';
import { PortableTextBody } from '@/components/editorial/PortableTextBody';
import { contentSource } from '@/lib/content';
import { stockState, type Product } from '@/lib/content/schema';

// The spec sheet never changes and price rarely does, so the page is cached;
// stock is read separately and never cached. See ROUTES.product in
// lib/rendering. Must stay a literal — kept honest by
// tests/revalidate-drift.test.ts.
export const revalidate = 300;

type Params = Promise<{ readonly slug: string }>;

export async function generateStaticParams() {
  return (await contentSource().getProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await contentSource().getProduct(slug);
  if (!product) return { title: 'Not found' };
  return {
    title: product.title,
    description: `${product.material} on the ${product.lastShape} last. ${product.dropMm} mm drop, ${product.weightGrams} g.`,
    openGraph: { title: product.title, images: [{ url: product.images[0]?.url ?? '' }] },
  };
}

/** Availability for schema.org, derived from the same threshold the size grid
 *  uses rather than restated. */
function availability(product: Product): string {
  const inStock = product.variants.some((v) => stockState(v.stock) !== 'out');
  return inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
}

function StructuredData({ product }: { readonly product: Product }) {
  const graph = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      sku: product.sku,
      image: product.images.map((i) => i.url),
      description: `${product.material} on the ${product.lastShape} last.`,
      brand: { '@type': 'Brand', name: 'Lastform' },
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency,
        availability: availability(product),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Catalogue', item: '/' },
        {
          '@type': 'ListItem',
          position: 2,
          name: product.collectionTitle,
          item: `/collections/${product.collectionSlug}`,
        },
        { '@type': 'ListItem', position: 3, name: product.title },
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      // Serialised from typed data we constructed, not from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await contentSource().getProduct(slug);
  if (!product) notFound();

  const [primaryImage] = product.images;

  return (
    <PageShell routeKey="product" activeHref={`/collections/${product.collectionSlug}`}>
      <StructuredData product={product} />

      <nav aria-label="Breadcrumb" className="border-b border-fog px-10 py-3 font-mono text-meta tracking-mono text-slate">
        <Link href="/" className="hover:text-cobalt">
          CATALOGUE
        </Link>
        {' / '}
        <Link href={`/collections/${product.collectionSlug}`} className="hover:text-cobalt">
          {product.collectionTitle.toUpperCase()}
        </Link>
        {' / '}
        <span className="text-ink">{product.title.toUpperCase()}</span>
      </nav>

      <div className="grid grid-cols-1 border-b border-ink lg:grid-cols-[1fr_470px]">
        <div className="border-b border-ink lg:border-r lg:border-b-0">
          {primaryImage ? (
            <GalleryThumbs
              images={product.images}
              primary={
                <AnnotatedFigure
                  image={primaryImage}
                  annotations={product.annotations}
                  caption="FIG. 1 — DIMENSIONS AT SIZE 43, ±1 MM"
                  priority
                  sizes="(min-width: 1024px) 58vw, 100vw"
                />
              }
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-6 px-[34px] pt-9 pb-11">
          <div className="flex flex-col gap-[10px]">
            <p className="font-mono text-meta tracking-eyebrow text-slate">
              SKU {product.sku} — LOT {product.lot}
            </p>
            <h1 className="font-display text-[46px] leading-[0.94] font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_112]">
              {product.title}
            </h1>
          </div>

          <SpecStrip
            last={product.lastShape}
            dropMm={product.dropMm}
            upperMm={product.upperMm}
            weightGrams={product.weightGrams}
          />

          <PriceTag amount={product.price} currency={product.currency} size="lg" note="INCL. RESOLE 1" />

          {primaryImage ? (
            <SizeSelector
              productId={product.id}
              slug={product.slug}
              title={product.title}
              price={product.price}
              currency={product.currency}
              image={primaryImage}
              variants={product.variants}
            />
          ) : null}
          <StockLegend />

          <div className="flex flex-col gap-3">
            <p className="flex justify-between font-mono text-spec tracking-[0.13em] text-slate">
              <span>SHIPS IN 2 BUSINESS DAYS</span>
              <span>60 DAY RETURN</span>
            </p>
          </div>

          {/* Both halves of this readout are literally true, which is the point
              of splitting the reads in the first place. */}
          <dl className="flex flex-col gap-[9px] border-t border-fog pt-4 font-mono text-meta tracking-meta">
            <div className="flex justify-between">
              <dt className="text-slate">STOCK READ</dt>
              <dd className="text-ink">LIVE — NO-STORE</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate">SPEC SHEET</dt>
              <dd className="text-ink">STATIC — ISR {revalidate}S</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b border-ink lg:grid-cols-[1.3fr_1fr_1fr]">
        <div className="flex flex-col gap-[14px] border-b border-fog px-10 py-11 lg:border-r lg:border-b-0">
          <h2 className="font-mono text-meta tracking-eyebrow text-slate">DESCRIPTION</h2>
          <PortableTextBody value={product.description} />
        </div>
        <div className="border-b border-fog px-8 py-11 lg:border-r lg:border-b-0">
          <SpecTable heading="MATERIALS" rows={product.materials} />
        </div>
        <div className="px-8 py-11">
          <SpecTable heading="CONSTRUCTION" rows={product.construction} tone="cobalt" />
        </div>
      </div>

      <Suspense fallback={<div className="px-10 pt-11 pb-13"><RecommendationsSkeleton /></div>}>
        <Recommendations product={product} />
      </Suspense>
    </PageShell>
  );
}
