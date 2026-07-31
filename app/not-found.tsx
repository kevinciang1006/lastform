import Link from 'next/link';
import { PageShell } from '@/components/chrome/PageShell';

export default function NotFound() {
  return (
    <PageShell routeKey="engineering">
      <section className="mx-auto max-w-[60ch] px-10 py-24">
        <p className="font-mono text-meta tracking-eyebrow text-slate">404</p>
        <h1 className="mt-4 font-display text-h1 leading-[0.94] font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_112]">
          No such page
        </h1>
        <p className="mt-5 text-pretty leading-[1.65] text-slate">
          The catalogue is four collections deep and every model publishes its own measurements. Start from one of
          those rather than guessing at a URL.
        </p>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-meta tracking-meta">
          {['boots', 'derbies', 'low-profile', 'archive'].map((slug) => (
            <li key={slug}>
              <Link href={`/collections/${slug}`} className="border-b border-cobalt pb-1 text-cobalt">
                {slug.replace('-', ' ').toUpperCase()}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
