import { ProductGrid } from '@/components/product/ProductGrid';
import { contentSource } from '@/lib/content';
import type { Product } from '@/lib/content/schema';

/** Skeleton matching the grid's real dimensions, so streaming this section in
 *  cannot shift the page below it. */
export function RecommendationsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="border border-fog">
          <div className="aspect-[2000/2600] bg-fog/30" />
          <div className="h-[104px]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Wrapped in Suspense on the PDP so it never blocks LCP.
 *
 * The heading is driven by what the data can actually support. Measured across
 * the catalogue, only five of twenty-four products have four siblings on their
 * own last — nine lasts spread over twenty-four models — so a hardcoded "built
 * on the same last" would be false on most pages.
 */
export async function Recommendations({ product }: { readonly product: Product }) {
  const { items, basis } = await contentSource().listRelated(product, 4);
  if (items.length === 0) return null;

  const heading = basis === 'last' ? 'Built on the same last' : `More from ${product.collectionTitle}`;

  return (
    <section className="flex flex-col gap-[22px] px-10 pt-11 pb-13">
      <div className="flex items-center gap-[14px]">
        <h2 className="font-display text-h3 font-extrabold tracking-[-0.02em] uppercase [font-variation-settings:'wdth'_110]">
          {heading}
        </h2>
        <span className="border border-cobalt px-2 py-1 font-mono text-spec tracking-mono text-cobalt">
          STREAMED — {items.length} {items.length === 1 ? 'MODEL' : 'MODELS'}
        </span>
      </div>
      <ProductGrid products={items} />
    </section>
  );
}
