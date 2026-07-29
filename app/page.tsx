import { SiteFooter } from '@/components/chrome/SiteFooter';

// Editorial content changes hourly at most; see ROUTES.home in lib/rendering
// for the reasoning. Must stay a literal — Next.js statically analyses this
// export, so it can't be renderSpec('home').revalidate. Kept honest by
// tests/revalidate-drift.test.ts.
export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">Lastform</h1>
      <SiteFooter routeKey="home" />
    </>
  );
}
