import Link from 'next/link';
import type { Metadata } from 'next';
import { PageShell } from '@/components/chrome/PageShell';
import { ProductGrid } from '@/components/product/ProductGrid';
import { searchProducts, SearchUnavailableError } from '@/lib/content/search';
import type { ProductCard } from '@/lib/content/schema';

// Output is a pure function of user input, so caching it would either never be
// hit or would serve one visitor another visitor's results. See ROUTES.search.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false },
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: Search }) {
  const raw = (await searchParams)['q'];
  const query = typeof raw === 'string' ? raw : '';
  const asked = query.trim() !== '';

  // Caught here rather than left to the error boundary: a search backend that
  // is down should still render the page, the form and the rest of the site's
  // navigation. What it must not do is render the "no model by that name"
  // copy, which is a claim about the catalogue rather than about the outage.
  let results: readonly ProductCard[] = [];
  let unavailable = false;
  try {
    results = await searchProducts(query);
  } catch (error) {
    if (!(error instanceof SearchUnavailableError)) throw error;
    unavailable = true;
  }

  return (
    <PageShell routeKey="search">
      <section className="border-b border-ink px-10 py-12">
        <h1 className="font-display text-h1 leading-[0.94] font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_112]">
          Search
        </h1>
        {/* A GET form, so search works with no JavaScript and every result is a
            shareable URL. This is also the one route that speaks GraphQL — the
            rest of the app reads through GROQ. */}
        <form action="/search" method="get" className="mt-6 flex max-w-[46rem] gap-3">
          <label htmlFor="q" className="sr-only">
            Search the catalogue
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="MODEL NAME"
            className="w-full border border-ink bg-chalk px-4 py-3 font-mono text-meta tracking-meta placeholder:text-slate"
          />
          <button
            type="submit"
            className="border border-cobalt bg-cobalt px-6 py-3 font-mono text-meta tracking-eyebrow text-chalk hover:border-ink hover:bg-ink"
          >
            SEARCH
          </button>
        </form>
        {asked && !unavailable ? (
          <p role="status" className="mt-4 font-mono text-meta tracking-meta text-slate">
            <span data-testid="result-count">{results.length}</span> RESULTS FOR “{query.trim().toUpperCase()}”
          </p>
        ) : null}
      </section>

      <div className="px-10 py-10">
        {!asked ? (
          <p data-testid="idle-state" className="max-w-[52ch] text-pretty leading-[1.65] text-slate">
            Search matches on model name. Every model’s last, drop, upper thickness and weight are published on its
            own page.
          </p>
        ) : unavailable ? (
          <div data-testid="error-state" role="alert" className="border border-cobalt px-8 py-12">
            <h2 className="font-display text-h3 font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_110]">
              Search is unavailable
            </h2>
            <p className="mt-3 max-w-[46ch] text-pretty leading-[1.65] text-slate">
              The catalogue is fine — the search index did not answer. This is a fault on our side, not an empty
              result: every model is still reachable by browsing.
            </p>
            <Link
              href="/collections/boots"
              className="mt-6 inline-block border-b border-cobalt pb-1 font-mono text-[11px] tracking-wide text-cobalt"
            >
              BROWSE THE CATALOGUE →
            </Link>
          </div>
        ) : results.length === 0 ? (
          <div data-testid="empty-state" className="border border-fog px-8 py-12">
            <h2 className="font-display text-h3 font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_110]">
              No model by that name
            </h2>
            <p className="mt-3 max-w-[46ch] text-pretty leading-[1.65] text-slate">
              Search covers model names rather than materials or lasts.
            </p>
            <Link
              href="/collections/boots"
              className="mt-6 inline-block border-b border-cobalt pb-1 font-mono text-[11px] tracking-wide text-cobalt"
            >
              BROWSE THE CATALOGUE →
            </Link>
          </div>
        ) : (
          <ProductGrid products={results} priorityCount={4} />
        )}
      </div>
    </PageShell>
  );
}
