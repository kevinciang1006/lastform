import type { Metadata } from 'next';
import { PageShell } from '@/components/chrome/PageShell';

// A static signpost, not an embedded application. See the manifest entry for
// ROUTES.studio and the note below for why.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Studio',
  robots: { index: false, follow: false },
};

export default function StudioPage() {
  return (
    <PageShell routeKey="studio">
      <section className="mx-auto max-w-[64ch] px-10 py-20">
        <p className="font-mono text-meta tracking-eyebrow text-slate">CONTENT</p>
        <h1 className="mt-4 font-display text-h1 leading-[0.94] font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_112]">
          The Studio runs alongside
        </h1>
        <p className="mt-6 text-pretty leading-[1.7]">
          The editing interface is not embedded in this application. Sanity&rsquo;s Studio currently imports React&rsquo;s{' '}
          <code className="font-mono text-[13px]">useEffectEvent</code> in a way that does not resolve against the
          React copy Next.js aliases into its client bundle, and the available fixes — pinning Sanity back, patching
          module resolution, or tracking a React canary — all trade a working application for an editing screen.
        </p>
        <p className="mt-4 text-pretty leading-[1.7]">
          The schemas still live in this repository under{' '}
          <code className="font-mono text-[13px]">sanity/schemas</code>, and the CMS integration this project exists
          to demonstrate is unaffected: the GROQ adapter, the seed script and the on-demand revalidation webhook all
          run against the same dataset.
        </p>
        <div className="mt-8 border border-fog px-6 py-5">
          <p className="font-mono text-meta tracking-eyebrow text-slate">RUN IT LOCALLY</p>
          <pre className="mt-3 overflow-x-auto font-mono text-[13px] text-ink">pnpm sanity dev</pre>
          <p className="mt-3 font-mono text-spec leading-[1.9] tracking-[0.13em] text-slate">
            SERVES THE SAME SCHEMAS ON ITS OWN PORT, AGAINST THE SAME PROJECT AND DATASET.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
