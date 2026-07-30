import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import type { ProductCard } from '@/lib/content/schema';
import { formatGrams, formatMm, formatMoney } from '@/lib/format';

interface ProductTileProps {
  readonly product: ProductCard;
  readonly priority?: boolean;
}

/** Named ProductTile rather than ProductCard because ProductCard is already the
 *  Zod-derived type, and a grid file importing both would not compile. */
export function ProductTile({ product, priority = false }: ProductTileProps) {
  const meta = [product.lastShape, formatMm(product.dropMm), formatGrams(product.weightGrams)].join(' · ');

  return (
    <Link
      href={`/products/${product.slug}`}
      className="block border border-ink transition-colors hover:bg-fog/40"
    >
      {/* Fixed ratio so the grid never reflows as images decode. */}
      <div className="relative aspect-[2000/2600] border-b border-fog bg-fog/30">
        <ProductImage
          image={product.image}
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-[7px] px-[14px] pt-[14px] pb-4">
        <h3 className="font-display text-[16px] font-extrabold tracking-[-0.01em] uppercase [font-variation-settings:'wdth'_110]">
          {product.title}
        </h3>
        <p className="font-mono text-meta tracking-[0.12em] text-slate">{meta}</p>
        <p className="font-mono text-[11px] tracking-value">{formatMoney(product.price, product.currency)}</p>
      </div>
    </Link>
  );
}
