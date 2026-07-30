import Link from 'next/link';
import type { Metadata } from 'next';
import { PageShell } from '@/components/chrome/PageShell';
import { CheckoutSummary } from '@/components/islands/CartLines';

export const metadata: Metadata = {
  title: 'Order confirmation',
  robots: { index: false },
};

export default function ConfirmationPage() {
  return (
    <PageShell routeKey="cart">
      <section className="mx-auto max-w-[60ch] px-10 py-20">
        <p className="font-mono text-meta tracking-eyebrow text-slate">CHECKOUT</p>
        <h1 className="mt-4 font-display text-h1 leading-[0.94] font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_112]">
          Nothing was charged
        </h1>
        <p className="mt-5 text-pretty leading-[1.65]">
          This is a portfolio reference implementation. It carries no payment processing and no real inventory, so no
          order exists and no money moved. The summary below is what a real confirmation would have shown.
        </p>
        <div className="mt-10">
          <CheckoutSummary />
        </div>
        <Link
          href="/"
          className="mt-10 inline-block border-b border-cobalt pb-1 font-mono text-[11px] tracking-wide text-cobalt"
        >
          BACK TO THE CATALOGUE →
        </Link>
      </section>
    </PageShell>
  );
}
