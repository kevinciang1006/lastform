import Link from 'next/link';
import { SiteNav } from '@/components/chrome/SiteNav';

// Lastform.dc.html:39-52 — three-column grid, wordmark left, nav centred,
// utility links right. `activeHref` has no caller yet; see SiteNav for why.
export function SiteHeader({ activeHref }: { readonly activeHref?: string }) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-ink px-10 py-5">
      <Link
        href="/"
        className="w-fit font-display text-[22px] font-extrabold tracking-[-0.01em] text-ink [font-variation-settings:'wdth'_116]"
      >
        LASTFORM
      </Link>
      <SiteNav currentHref={activeHref} />
      <div className="flex justify-end gap-[22px] font-mono text-meta tracking-mono">
        <Link href="/search" className="text-slate hover:text-cobalt">
          SEARCH
        </Link>
        <Link href="/cart" className="flex items-center gap-[6px] text-ink hover:text-cobalt">
          <span>CART</span>
          {/* Static placeholder: the cart count becomes a client island in Task 23. */}
          <span className="text-cobalt">[00]</span>
        </Link>
      </div>
    </header>
  );
}
