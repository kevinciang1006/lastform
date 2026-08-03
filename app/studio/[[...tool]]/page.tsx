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
          The editing interface is not embedded in this application. Mounting it with{' '}
          <code className="font-mono text-[13px]">NextStudio</code> on a static wrapper fails the production build:
          Sanity&rsquo;s structure tool imports <code className="font-mono text-[13px]">useEffectEvent</code> as a
          named export from React, and webpack cannot resolve that name against the React copy Next aliases into the
          client bundle. React 19.2.8 does export it at runtime — the import is unresolvable, not absent — so the
          available fixes are patching module resolution or tracking a React canary, and both trade a working
          application for an editing screen.
        </p>
        <p className="mt-4 text-pretty leading-[1.7]">
          Tested on sanity 5.31.1, next-sanity 12.4.5, Next 15.5.22 and React 19.2.8. The versions are pinned rather
          than current: next-sanity 12.4.5 declares a peer dependency on Next 16, which this application is
          deliberately not on, so its Studio integration is running outside the range it was published against.
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
