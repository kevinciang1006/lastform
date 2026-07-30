import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import type { CollectionCard } from '@/lib/content/schema';
import { formatMm } from '@/lib/format';

/** Lastform.dc.html:122-151 — four equal cards divided by 1px ink rules, each
 *  carrying a derived mono readout rather than marketing copy. */
export function CollectionCards({ collections }: { readonly collections: readonly CollectionCard[] }) {
  if (collections.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 border-b border-ink sm:grid-cols-2 lg:grid-cols-4">
      {collections.map((collection, index) => (
        <li
          key={collection.slug}
          className={index === collections.length - 1 ? '' : 'border-b border-ink sm:border-b-0 lg:border-r'}
        >
          <Link href={`/collections/${collection.slug}`} className="block h-full text-ink hover:bg-fog/40">
            <div className="relative aspect-[1200/900] border-b border-fog bg-fog/30">
              <ProductImage
                image={collection.heroImage}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="absolute inset-0 size-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-2 px-5 pt-[18px] pb-[22px]">
              <h3 className="font-display text-[24px] font-extrabold tracking-[-0.02em] uppercase [font-variation-settings:'wdth'_112]">
                {collection.title}
              </h3>
              <p className="flex justify-between font-mono text-meta tracking-mono text-slate">
                <span>
                  {collection.modelCount} MODELS — {formatMm(collection.avgDropMm)} DROP AVG
                </span>
                <span aria-hidden="true" className="text-cobalt">
                  →
                </span>
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
