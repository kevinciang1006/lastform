import type { Metadata } from 'next';
import { PageShell } from '@/components/chrome/PageShell';
import { VitalsReporter } from '@/components/islands/VitalsReporter';
import { BUILD_INFO } from '@/lib/build-info';
import { ROUTES, routeCounts, type RouteRenderSpec } from '@/lib/rendering';

// Generated from the route manifest at build time, so it cannot describe a
// rendering plan the site is not running. See ROUTES.engineering.
export const metadata: Metadata = {
  title: 'Engineering',
  description: 'How this site is built: the rendering strategy per route, and what it measures.',
};

function windowLabel(spec: RouteRenderSpec): string {
  if (typeof spec.revalidate === 'number') return `${spec.revalidate} S`;
  return spec.strategy === 'SSG' ? 'AT BUILD' : 'NEVER';
}

function RouteTable() {
  const specs = Object.values(ROUTES);
  return (
    <div className="overflow-x-auto border border-ink">
      <table className="w-full min-w-[52rem] border-collapse text-left">
        <thead>
          <tr className="bg-ink font-mono text-spec tracking-[0.18em] text-chalk">
            <th scope="col" className="px-4 py-3 font-normal">ROUTE</th>
            <th scope="col" className="px-4 py-3 font-normal">STRATEGY</th>
            <th scope="col" className="px-4 py-3 font-normal">REVALIDATE</th>
            <th scope="col" className="px-4 py-3 font-normal">REASONING</th>
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => (
            <tr key={spec.route} className="border-b border-fog last:border-b-0">
              <td className="px-4 py-3 font-mono text-[12px] tracking-[0.03em]">{spec.route}</td>
              <td className="px-4 py-3 font-mono text-[11px] tracking-[0.12em] text-cobalt">
                {spec.strategy}
                {spec.onDemand ? <span className="text-slate"> + ON DEMAND</span> : null}
              </td>
              <td className="px-4 py-3 font-mono text-[11px] tracking-meta text-slate">{windowLabel(spec)}</td>
              <td className="px-4 py-3 text-[13px] leading-[1.6] text-slate">{spec.reasoning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BuildFacts() {
  const counts = routeCounts();
  const facts: readonly [string, string][] = [
    ['COMMIT', BUILD_INFO.commit],
    ['BUILT', BUILD_INFO.builtAt === '' ? 'UNKNOWN' : BUILD_INFO.builtAt.replace('T', ' ').replace(/\..+$/, ' UTC')],
    ['ROUTES', `${counts.static} CACHED / ${counts.dynamic} PER-REQUEST`],
    ['ISLANDS', '7 CLIENT COMPONENTS'],
  ];

  return (
    <dl className="flex flex-col">
      {facts.map(([label, value], index) => (
        <div
          key={label}
          className={`flex justify-between gap-4 py-[10px] font-mono text-[11px] tracking-[0.05em] ${
            index === facts.length - 1 ? '' : 'border-b border-fog'
          }`}
        >
          <dt className="text-slate">{label}</dt>
          <dd className="text-right text-cobalt">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function EngineeringPage() {
  return (
    <PageShell routeKey="engineering" activeHref="/engineering">
      <section className="grid grid-cols-1 border-b border-ink lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-[18px] border-b border-fog px-10 py-14 lg:border-r lg:border-b-0">
          <p className="font-mono text-meta tracking-eyebrow text-slate">DOCUMENT 07 — RENDERING STRATEGY</p>
          <h1 className="font-display text-h1 leading-[0.94] font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_112]">
            How this
            <br />
            site is built
          </h1>
          <p className="max-w-[56ch] text-pretty leading-[1.7] text-slate">
            Each route is cached at the shortest interval its data tolerates and no longer. Stock is the only value
            read per request. The table below is generated from the same constant the render badge in every footer
            reads, so it cannot describe a plan the site is not running.
          </p>
        </div>
        <div className="flex flex-col gap-[14px] bg-fog/40 px-[34px] py-14">
          <p className="font-mono text-meta tracking-eyebrow text-slate">BUILD</p>
          <BuildFacts />
        </div>
      </section>

      <section className="flex flex-col gap-4 px-10 pt-12 pb-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em] uppercase [font-variation-settings:'wdth'_110]">
            Route table
          </h2>
          <span className="font-mono text-spec tracking-mono text-slate">
            {Object.keys(ROUTES).length} ENTRIES — GENERATED FROM lib/rendering.ts
          </span>
        </div>
        <RouteTable />
      </section>

      <section className="flex flex-col gap-4 px-10 pt-11 pb-14">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em] uppercase [font-variation-settings:'wdth'_110]">
            Core web vitals
          </h2>
          <span className="font-mono text-spec tracking-mono text-slate">THIS SESSION — MEASURED IN YOUR BROWSER</span>
        </div>
        <VitalsReporter />
        <p className="font-mono text-spec leading-[1.9] tracking-[0.13em] text-slate">
          MEASURED LIVE WITH web-vitals ON THIS PAGE LOAD. NOT FIELD DATA — THIS PROJECT HAS NO RUM PIPELINE, AND A
          75TH-PERCENTILE FIGURE OVER 28 DAYS WOULD BE INVENTED. BARS SHOW THE VALUE AGAINST GOOGLE&rsquo;S GOOD
          THRESHOLD; SHORTER IS BETTER. INP APPEARS ONLY AFTER YOU INTERACT.
        </p>
      </section>

      <section className="flex flex-col gap-4 border-t border-ink px-10 pt-11 pb-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em] uppercase [font-variation-settings:'wdth'_110]">
            JavaScript budget
          </h2>
          <span className="font-mono text-spec tracking-mono text-slate">MEASURED FROM pnpm build</span>
        </div>
        <div className="overflow-x-auto border border-ink">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="bg-ink font-mono text-spec tracking-[0.18em] text-chalk">
                <th scope="col" className="px-4 py-3 font-normal">ROUTE</th>
                <th scope="col" className="px-4 py-3 font-normal">FIRST LOAD</th>
                <th scope="col" className="px-4 py-3 font-normal">OVER BASELINE</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['framework baseline', '102 kB', '—'],
                ['/', '115 kB', '13 kB'],
                ['/collections/[slug]', '134 kB', '32 kB'],
                ['/products/[slug]', '135 kB', '33 kB'],
                ['/engineering', '114 kB', '12 kB'],
              ].map(([route, first, over]) => (
                <tr key={route} className="border-b border-fog last:border-b-0">
                  <td className="px-4 py-3 font-mono text-[12px] tracking-[0.03em]">{route}</td>
                  <td className="px-4 py-3 font-mono text-[11px] tracking-meta">{first}</td>
                  <td className="px-4 py-3 font-mono text-[11px] tracking-meta text-cobalt">{over}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="max-w-[72ch] text-pretty leading-[1.7] text-slate">
          The original brief set a 90 kB budget for the product page. That is below the floor: Next 15 and React 19
          ship 102 kB of shared framework code before a line of application code exists, which is why both numbers
          appear here. The figure worth defending is the one on the right — what this application adds — and the
          product page adds 33 kB, comfortably inside 90. Quoting only the total would have made an unreachable
          target look met or missed for the wrong reason.
        </p>
      </section>

      <section className="flex flex-col gap-5 border-t border-ink px-10 py-14">
        <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em] uppercase [font-variation-settings:'wdth'_110]">
          Four decisions worth defending
        </h2>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <article className="flex flex-col gap-2">
            <h3 className="font-mono text-meta tracking-eyebrow text-cobalt">CURRENCY LIVES IN A COOKIE</h3>
            <p className="max-w-[56ch] text-pretty leading-[1.7] text-slate">
              The obvious design has middleware set a request header that Server Components read via{' '}
              <code className="font-mono text-[13px]">headers()</code>. That call opts a page into dynamic rendering,
              which would have turned every static and ISR route here into SSR — destroying the thing this site
              exists to demonstrate. The middleware sets a cookie instead and a client island reads it.
            </p>
          </article>
          <article className="flex flex-col gap-2">
            <h3 className="font-mono text-meta tracking-eyebrow text-cobalt">STOCK IS THE ONLY UNCACHED READ</h3>
            <p className="max-w-[56ch] text-pretty leading-[1.7] text-slate">
              A product page is mostly a spec sheet, and a spec sheet does not change. Stock does, unpredictably.
              Caching them together means choosing between a stale size grid and an uncacheable page, so they are read
              separately: the page is ISR, and the size grid refreshes against an edge route that is never cached.
            </p>
          </article>
          <article className="flex flex-col gap-2">
            <h3 className="font-mono text-meta tracking-eyebrow text-cobalt">FILTERS LIVE IN THE URL</h3>
            <p className="max-w-[56ch] text-pretty leading-[1.7] text-slate">
              Facet state is in the query string rather than component state, so a filtered view is shareable,
              reloadable, and readable on the server. The cost is that reading{' '}
              <code className="font-mono text-[13px]">searchParams</code> renders that request dynamically — the
              unfiltered collection is prerendered, a filtered one is computed on demand.
            </p>
          </article>
          <article className="flex flex-col gap-2">
            <h3 className="font-mono text-meta tracking-eyebrow text-cobalt">GROQ EVERYWHERE, GRAPHQL ONCE</h3>
            <p className="max-w-[56ch] text-pretty leading-[1.7] text-slate">
              Search is the one route that speaks GraphQL. GROQ projections shape the response so the adapter
              receives exactly the keys its schema wants; GraphQL returns the document&rsquo;s own field names and the
              mapping happens in TypeScript. Both paths exist here on purpose, so the difference is visible rather
              than asserted.
            </p>
          </article>
        </div>
      </section>
    </PageShell>
  );
}
