import { AnnouncementBar } from '@/components/chrome/AnnouncementBar';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { contentSource } from '@/lib/content';
import type { RouteKey } from '@/lib/rendering';

interface PageShellProps {
  readonly routeKey: RouteKey;
  /** Href of the nav item to mark current, when the page belongs to a section. */
  readonly activeHref?: string;
  readonly children: React.ReactNode;
}

/**
 * Every page's frame.
 *
 * `main` and `footer` are siblings on purpose: nesting footer inside main would
 * demote its role from contentinfo to generic per HTML-AAM, and no axe rule
 * catches that. It also means the root layout cannot own the chrome, since it
 * renders once for every route and has no way to know a page's routeKey or
 * active nav section — each page renders exactly one PageShell instead.
 *
 * The settings read lives here rather than in every page: it is one request
 * that both the announcement bar and the footer need, and keeping it in one
 * place is what stops a dozen routes each having to remember it.
 */
export async function PageShell({ routeKey, activeHref, children }: PageShellProps) {
  const settings = await contentSource().getSiteSettings();

  return (
    <>
      <AnnouncementBar messages={settings.announcements} />
      <SiteHeader activeHref={activeHref} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter routeKey={routeKey} columns={settings.footerColumns} />
    </>
  );
}
