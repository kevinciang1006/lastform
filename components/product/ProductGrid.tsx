import { ProductTile } from '@/components/product/ProductTile';
import type { ProductCard } from '@/lib/content/schema';

interface ProductGridProps {
  readonly products: readonly ProductCard[];
  /** How many tiles get `priority`. Above-the-fold only — marking every tile
   *  priority tells the browser nothing and costs the LCP image its head start. */
  readonly priorityCount?: number;
}

export function ProductGrid({ products, priorityCount = 0 }: ProductGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.slug}>
          <ProductTile product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
