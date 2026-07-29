import { PageShell } from '@/components/chrome/PageShell';

// Editorial content changes hourly at most; see ROUTES.home in lib/rendering
// for the reasoning. Must stay a literal — Next.js statically analyses this
// export, so it can't be renderSpec('home').revalidate. Kept honest by
// tests/revalidate-drift.test.ts.
export const revalidate = 3600;

export default function HomePage() {
  return (
    <PageShell routeKey="home">
      <h1 className="sr-only">Lastform</h1>
    </PageShell>
  );
}
