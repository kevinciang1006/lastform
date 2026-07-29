import { AnnouncementBar } from '@/components/chrome/AnnouncementBar';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import type { RouteKey } from '@/lib/rendering';

// Hardcoded until Task 16 replaces this with siteSettings from the CMS.
const ANNOUNCEMENTS = [
  'FREE RESOLE AT 18 MONTHS',
  'SHIPS FROM PORTLAND, OR — 2 DAY',
  'LOT 26.07 OPEN',
] as const;

interface PageShellProps {
  readonly routeKey: RouteKey;
  /** Href of the nav item to mark current, when the page belongs to a section. */
  readonly activeHref?: string;
  readonly children: React.ReactNode;
}

// main and footer are siblings on purpose: nesting footer inside main would
// demote its role from contentinfo to generic per HTML-AAM. That also means
// the root layout can't own header/footer, since it renders once for every
// route and has no way to know a page's routeKey or active nav section —
// each page renders exactly one PageShell instead, so the frame stays
// consistent while still being addressable per page.
export function PageShell({ routeKey, activeHref, children }: PageShellProps) {
  return (
    <>
      <AnnouncementBar messages={ANNOUNCEMENTS} />
      <SiteHeader activeHref={activeHref} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter routeKey={routeKey} />
    </>
  );
}
