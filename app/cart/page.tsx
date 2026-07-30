import Link from 'next/link';
import type { Metadata } from 'next';
import { PageShell } from '@/components/chrome/PageShell';
import { CartLines } from '@/components/islands/CartLines';

// Per-user state in localStorage. No server involvement and no SEO value, so
// there is nothing to render on the server or to cache. See ROUTES.cart.
export const metadata: Metadata = {
  title: 'Cart',
  robots: { index: false },
};

export default function CartPage() {
  return (
    <PageShell routeKey="cart">
      <section className="px-10 py-14">
        <h1 className="font-display text-h1 leading-[0.94] font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_112]">
          Cart
        </h1>
        <p className="mt-4 max-w-[52ch] font-mono text-spec leading-[1.9] tracking-[0.13em] text-slate">
          DEMONSTRATION ONLY — NO PAYMENT IS PROCESSED AND NO ORDER IS PLACED.
        </p>
        <div className="mt-8 max-w-[46rem]">
          <CartLines />
        </div>
        <Link
          href="/collections/boots"
          className="mt-8 inline-block border-b border-cobalt pb-1 font-mono text-[11px] tracking-wide text-cobalt"
        >
          CONTINUE BROWSING →
        </Link>
      </section>
    </PageShell>
  );
}
