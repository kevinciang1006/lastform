import type { Metadata } from 'next';
import { AnnouncementBar } from '@/components/chrome/AnnouncementBar';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { SkipLink } from '@/components/chrome/SkipLink';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Lastform', template: '%s — Lastform' },
  description: 'Constructed leather footwear, specified in full.',
};

// Hardcoded until Task 16 replaces this with siteSettings from the CMS.
const ANNOUNCEMENTS = [
  'FREE RESOLE AT 18 MONTHS',
  'SHIPS FROM PORTLAND, OR — 2 DAY',
  'LOT 26.07 OPEN',
] as const;

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="bg-chalk text-ink">
        <SkipLink />
        <AnnouncementBar messages={ANNOUNCEMENTS} />
        <SiteHeader />
        {/* tabIndex={-1}: a plain id isn't a valid focus target for a fragment
            jump, so without this the skip link scrolls here but leaves focus
            on <body> — the very next Tab would restart at the header instead
            of continuing past it. Verified by hand; see the Task 6 report. */}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
