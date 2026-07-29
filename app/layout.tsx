import type { Metadata } from 'next';
import { SkipLink } from '@/components/chrome/SkipLink';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Lastform', template: '%s — Lastform' },
  description: 'Constructed leather footwear, specified in full.',
};

// Header, announcement bar, <main> and footer live in PageShell, not here:
// this layout renders once for every route and has no way to know a page's
// routeKey or active nav section, and nesting <footer> inside <main> would
// have cost it the contentinfo landmark. See components/chrome/PageShell.tsx.
export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="bg-chalk text-ink">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
