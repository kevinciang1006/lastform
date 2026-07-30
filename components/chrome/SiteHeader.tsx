import Link from 'next/link';
import { CartButton } from '@/components/islands/CartButton';
import { SiteNav } from '@/components/chrome/SiteNav';

// Lastform.dc.html:39-52 — three-column grid, wordmark left, nav centred,
// utility links right. `activeHref` comes from whichever PageShell renders it.
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
        <CartButton />
      </div>
    </header>
  );
}
